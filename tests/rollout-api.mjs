import assert from 'node:assert/strict'
import { test, before, after } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request as httpRequest } from 'node:http'
import { RolloutStore } from '../server/store.mjs'
import { createRolloutServer } from '../server/http.mjs'
import { RolloutService } from '../server/service.mjs'
import { allRule } from '../server/demo-seed.mjs'
import {
  businessBucket,
  evaluateBusinessTemplate,
  templateToBusinessDocument,
} from '../src/utils/businessPaymentRollout.js'

const scope = { environment: 'test', region: 'overseas', appId: 'test-app' }
const principals = [
  'editor',
  'reviewer',
  'emergency',
  'viewer',
  'service',
  'other',
  'self',
].map((role) => ({
  id: role === 'self' ? 'editor' : role,
  role: role === 'other' ? 'viewer' : role === 'self' ? 'reviewer' : role,
  token: `test-only-${role}`.padEnd(40, 'x'),
  scope: role === 'other' ? { ...scope, appId: 'other-app' } : scope,
}))
let directory,
  store,
  server,
  base,
  id,
  ready = true,
  clock = Date.now(),
  trusted
const initialDocument = () => ({
  app_id: scope.appId,
  region: scope.region,
  currency: 'USD',
  cashier_template_name: 'test_main',
  enabled: true,
  payment_methods: [
    {
      business_method_id: 'card',
      channel_id: 'stripe_test',
      pay_name: 'CARD',
      enabled: true,
    },
    {
      business_method_id: 'card',
      channel_id: 'adyen_test',
      pay_name: 'CARD',
      enabled: true,
    },
    {
      business_method_id: 'paypal',
      channel_id: 'paypal_test',
      pay_name: 'PayPal',
      enabled: true,
    },
  ],
  rules: { card: allRule(), paypal: allRule() },
})
async function start() {
  store = new RolloutStore(join(directory, 'test.sqlite'))
  const app = createRolloutServer({
    store,
    principals,
    capabilityReader: () => ready,
    contextReader: async () => trusted,
    now: () => clock,
    origins: ['http://127.0.0.1:3001'],
  })
  server = app.server
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}/api/rollout`
}
async function stop() {
  await new Promise((resolve) => server.close(resolve))
  store.close()
}
async function request(
  path,
  {
    role = 'editor',
    body,
    status = 200,
    method = body ? 'POST' : 'GET',
    headers = {},
  } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(role
        ? {
            Authorization: `Bearer ${principals.find((p) => p.id === role || (role === 'self' && p.role === 'reviewer' && p.id === 'editor')).token}`,
          }
        : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(result)}`,
  )
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert(response.headers.get('x-request-id'))
  return result.data ?? result
}
const read = () => request(`/templates/${id}`)
async function save(document) {
  const s = await read()
  return request(`/templates/${id}/draft`, {
    body: { document, baseDraftRevision: s.draftRevision },
  })
}
async function submit() {
  const s = await read()
  return request(`/templates/${id}/submit`, {
    body: {
      reason: '测试提交原因',
      draftRevision: s.draftRevision,
      baseRevision: s.revision,
    },
  })
}
async function approve() {
  const s = await read()
  return request(`/templates/${id}/approve`, {
    role: 'reviewer',
    body: { pendingId: s.pending.id, reason: '独立审核通过' },
  })
}
const context = () => ({
  orderId: 'order-1',
  templateId: id,
  appId: scope.appId,
  environment: scope.environment,
  region: scope.region,
  userId: 'pilot_user',
  sessionId: 'stable_session',
  platform: 'google',
  country: 'US',
  amountMinor: 4999,
  currency: 'USD',
  riskAllowed: true,
  paymentState: 'idle',
  expiresAt: clock + 600000,
  eligibility: {
    'card::stripe_test': true,
    'card::adyen_test': true,
    'paypal::paypal_test': true,
  },
})

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'rollout-api-'))
  await start()
})
after(async () => {
  await stop()
  await rm(directory, { recursive: true, force: true })
})

test('authentication, role and application scope are enforced by the HTTP service', async () => {
  await request('/templates', { role: null, status: 401 })
  const s = await request('/templates', {
    body: { document: initialDocument() },
    status: 201,
  })
  id = s.template_id
  assert.equal(s.revision, 0)
  await request(`/templates/${id}`, { role: 'other', status: 404 })
  await request(`/templates/${id}/draft`, {
    role: 'viewer',
    body: { document: initialDocument(), baseDraftRevision: 1 },
    status: 403,
  })
  await request('/templates', {
    body: { document: { ...initialDocument(), app_id: 'other-app' } },
    status: 422,
  })
  await request('/session', {
    role: null,
    body: { role: 'editor' },
    headers: { Origin: 'http://127.0.0.1:3001' },
    status: 403,
  })
  await request('/decisions', {
    body: { templateId: id, orderId: 'order-1' },
    status: 403,
  })
})

test('draft saves do not publish; stale and concurrent writes cannot overwrite newer drafts', async () => {
  const s = await read(),
    doc = structuredClone(s.draft)
  doc.rules.paypal = { ...allRule(), mode: 'gradual', percentage: 5 }
  const saved = await save(doc)
  assert.equal(saved.revision, 0)
  assert.equal(saved.published, null)
  await request(`/templates/${id}/draft`, {
    body: { document: doc, baseDraftRevision: s.draftRevision },
    status: 409,
  })
  const responses = await Promise.all(
    [1, 2].map(() =>
      fetch(base + `/templates/${id}/draft`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${principals[0].token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: doc,
          baseDraftRevision: saved.draftRevision,
        }),
      }),
    ),
  )
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409])
})

test('schema validation rejects malformed percentages, old devices and missing business IDs', async () => {
  const s = await read()
  for (const patch of [
    { percentage: '' },
    { percentage: 0.001 },
    { platforms: ['ios'] },
    { countries: ['us'] },
    { devices: ['ios'] },
  ]) {
    const doc = structuredClone(s.draft)
    Object.assign(doc.rules.paypal, patch)
    await request(`/templates/${id}/draft`, {
      body: { document: doc, baseDraftRevision: s.draftRevision },
      status: 422,
    })
  }
  const doc = structuredClone(s.draft)
  doc.payment_methods[0].business_method_id = 'unknown'
  await request(`/templates/${id}/draft`, {
    body: { document: doc, baseDraftRevision: s.draftRevision },
    status: 422,
  })
  assert.equal((await read()).draftRevision, s.draftRevision)
})

test('submitted snapshots freeze editing, reject self review and publish only once', async () => {
  const pending = await submit()
  await request(`/templates/${id}/draft`, {
    body: { document: pending.draft, baseDraftRevision: pending.draftRevision },
    status: 409,
  })
  await request(`/templates/${id}/approve`, {
    body: { pendingId: pending.pending.id, reason: '不能自审' },
    status: 403,
  })
  const self = principals.find(
    (p) => p.role === 'reviewer' && p.id === 'editor',
  )
  await request(`/templates/${id}/approve`, {
    role: null,
    headers: { Authorization: `Bearer ${self.token}` },
    body: { pendingId: pending.pending.id, reason: '即使有审批权限也不能自审' },
    status: 403,
  })
  const published = await approve()
  assert.equal(published.revision, 1)
  assert.equal(published.pending, null)
  await request(`/templates/${id}/approve`, {
    role: 'reviewer',
    body: { pendingId: pending.pending.id, reason: '重复审批' },
    status: 409,
  })
  const versions = await request(`/templates/${id}/versions`)
  assert.equal(versions.length, 1)
})

test('one business method uses one bucket across PSPs; targeting and eligibility remain hard constraints', async () => {
  const s = await read(),
    doc = structuredClone(s.draft)
  doc.rules.card = {
    ...allRule(),
    mode: 'gradual',
    percentage: 0,
    allow: 'pilot_user',
    platforms: ['google'],
    countries: ['US'],
  }
  await save(doc)
  await submit()
  await approve()
  const preview = (profile) =>
    request(`/templates/${id}/preview`, {
      body: { source: 'published', profile, eligibleSample: true },
    })
  trusted = context()
  const p = await preview(trusted)
  assert.equal(p.methods.filter((m) => m.id === 'card').length, 1)
  assert.equal(
    p.methods.find((m) => m.id === 'card').eligibleChannels.length,
    2,
  )
  assert.equal(
    (await preview({ ...trusted, platform: 'apple' })).methods.find(
      (m) => m.id === 'card',
    ).code,
    'PLATFORM_MISS',
  )
  assert.equal(
    (await preview({ ...trusted, country: 'DE' })).methods.find(
      (m) => m.id === 'card',
    ).code,
    'COUNTRY_MISS',
  )
  const denied = structuredClone(doc)
  denied.rules.card.deny = 'pilot_user'
  assert.equal(
    (
      await request(`/templates/${id}/preview`, {
        body: { document: denied, profile: trusted, eligibleSample: true },
      })
    ).methods.find((m) => m.id === 'card').code,
    'DENY',
  )
  assert(
    (
      await request(`/templates/${id}/preview`, {
        body: { source: 'published', profile: trusted, eligibleSample: false },
      })
    ).empty,
  )
  const bucket = businessBucket(scope, id, 'card', 'user:pilot_user')
  assert.equal(p.methods.find((m) => m.id === 'card').bucket, bucket)
  doc.payment_methods.reverse()
  doc.cashier_template_name = 'renamed_template'
  assert.equal(
    evaluateBusinessTemplate(doc, scope, trusted, {
      eligibility: trusted.eligibility,
    }).methods.find((m) => m.id === 'card').bucket,
    bucket,
  )
})

test('provider capability is rechecked at review; safety reductions still work during outage', async () => {
  const s = await read(),
    doc = structuredClone(s.draft)
  doc.rules.paypal.percentage = 25
  await save(doc)
  await submit()
  ready = false
  const pending = await read()
  await request(`/templates/${id}/approve`, {
    role: 'reviewer',
    body: { pendingId: pending.pending.id, reason: '准入变化后审批' },
    status: 422,
  })
  await request(`/templates/${id}/reject`, {
    role: 'reviewer',
    body: { pendingId: pending.pending.id, reason: '准入未就绪' },
  })
  doc.rules.paypal.mode = 'off'
  await save(doc)
  await submit()
  await approve()
  assert.equal((await read()).published.rules.paypal.mode, 'off')
  ready = true
})

test('emergency changes invalidate pending snapshots; rollback increments version and never clears kills', async () => {
  let s = await read(),
    doc = structuredClone(s.draft)
  doc.rules.paypal = allRule()
  await save(doc)
  await submit()
  s = await read()
  await request(`/templates/${id}/kill`, {
    role: 'emergency',
    body: {
      reason: '紧急止损',
      emergencyEpoch: s.emergencyEpoch,
      methodIds: ['card'],
    },
  })
  assert.equal((await read()).pending, null)
  await request(`/templates/${id}/approve`, {
    role: 'reviewer',
    body: { reason: '旧快照审批', pendingId: s.pending.id },
    status: 409,
  })
  s = await read()
  const rolled = await request(`/templates/${id}/rollback`, {
    role: 'reviewer',
    body: {
      reason: '恢复历史版本',
      targetRevision: 1,
      baseRevision: s.revision,
      baseDraftRevision: s.draftRevision,
    },
  })
  assert.equal(rolled.revision, s.revision + 1)
  assert.equal(rolled.kills.card, true)
  await request(`/templates/${id}/resume`, {
    role: 'editor',
    body: {
      reason: '越权恢复',
      emergencyEpoch: rolled.emergencyEpoch,
      methodIds: ['card'],
    },
    status: 403,
  })
  const restored = await request(`/templates/${id}/resume`, {
    role: 'emergency',
    body: {
      reason: '显式恢复',
      emergencyEpoch: rolled.emergencyEpoch,
      methodIds: ['card'],
    },
  })
  assert.deepEqual(restored.kills, {})
  assert(
    (await request(`/templates/${id}/audit`)).some(
      (e) => e.action === 'rollback',
    ),
  )
})

test('runtime accepts only service credentials and trusted order context; confirmation rechecks current facts', async () => {
  trusted = context()
  await request('/decisions', {
    role: 'service',
    body: {
      templateId: id,
      orderId: 'order-1',
      userId: 'forged',
      eligibility: {},
    },
    status: 422,
  })
  const decision = await request('/decisions', {
    role: 'service',
    body: { templateId: id, orderId: 'order-1' },
  })
  assert(decision.allowedMethods.some((m) => m.id === 'card'))
  const input = { methodId: 'card', channelId: 'stripe_test' }
  trusted.expiresAt += 5000
  trusted.eligibility = Object.fromEntries(
    Object.entries(trusted.eligibility).reverse(),
  )
  assert.equal(
    (
      await request(`/decisions/${decision.decisionId}/revalidate`, {
        role: 'service',
        body: input,
      })
    ).valid,
    true,
  )
  await request(`/decisions/${decision.decisionId}/revalidate`, {
    role: 'service',
    body: { methodId: 'card', channelId: 'forged' },
    status: 409,
  })
  trusted.amountMinor++
  await request(`/decisions/${decision.decisionId}/revalidate`, {
    role: 'service',
    body: input,
    status: 409,
  })
  trusted = context()
  trusted.paymentState = 'unknown'
  await request('/decisions', {
    role: 'service',
    body: { templateId: id, orderId: 'order-1' },
    status: 409,
  })
  trusted = { ...context(), environment: 'wrong' }
  await request('/decisions', {
    role: 'service',
    body: { templateId: id, orderId: 'order-1' },
    status: 503,
  })
  trusted = { ...context(), expiresAt: clock - 1 }
  await request('/decisions', {
    role: 'service',
    body: { templateId: id, orderId: 'order-1' },
    status: 503,
  })
  trusted = context()
  clock += 61000
  await request(`/decisions/${decision.decisionId}/revalidate`, {
    role: 'service',
    body: input,
    status: 409,
  })
})

test('published changes and emergency stops invalidate an existing display decision', async () => {
  trusted = context()
  const input = { methodId: 'card', channelId: 'stripe_test' }
  const decision = await request('/decisions', {
    role: 'service',
    body: { templateId: id, orderId: 'order-1' },
  })
  let s = await read()
  const doc = structuredClone(s.draft)
  doc.cashier_template_name = 'updated_template'
  await save(doc)
  await submit()
  await approve()
  await request(`/decisions/${decision.decisionId}/revalidate`, {
    role: 'service',
    body: input,
    status: 409,
  })
  const next = await request('/decisions', {
    role: 'service',
    body: { templateId: id, orderId: 'order-1' },
  })
  s = await read()
  await request(`/templates/${id}/kill`, {
    role: 'emergency',
    body: {
      reason: '验证安全覆盖',
      emergencyEpoch: s.emergencyEpoch,
      methodIds: ['card'],
    },
  })
  await request(`/decisions/${next.decisionId}/revalidate`, {
    role: 'service',
    body: input,
    status: 409,
  })
  s = await read()
  await request(`/templates/${id}/resume`, {
    role: 'emergency',
    body: {
      reason: '恢复测试状态',
      emergencyEpoch: s.emergencyEpoch,
      methodIds: ['card'],
    },
  })
})

test('unconfigured trusted adapters fail closed instead of trusting request eligibility', async () => {
  const { service } = createRolloutServer({ store, principals })
  const actor = principals.find((p) => p.role === 'service')
  await assert.rejects(
    service.decide(actor, { orderId: 'order-1', templateId: id }),
    (e) => e.status === 503 && e.code === 'CONTEXT_UNAVAILABLE',
  )
  const preview = service.preview(principals[0], id, {
    source: 'published',
    profile: context(),
    eligibleSample: true,
  })
  assert.equal(preview.allowedMethods.length, 0)
  const broken = new RolloutService(store, {
    contextReader: async () => {
      throw new Error('upstream unavailable')
    },
  })
  await assert.rejects(
    broken.decide(actor, { orderId: 'order-1', templateId: id }),
    (e) => e.status === 503,
  )
})

test('SQLite state, snapshots and audits survive a service restart', async () => {
  const before = await read(),
    audit = await request(`/templates/${id}/audit`)
  await stop()
  await start()
  assert.deepEqual(await read(), before)
  assert.deepEqual(await request(`/templates/${id}/audit`), audit)
})

test('legacy multi-channel conflicts require explicit unification; new cohorts are monotonic', () => {
  const input = {
    ...initialDocument(),
    payment_methods: initialDocument().payment_methods.map((e) => ({
      ...e,
      rollout: allRule(),
    })),
  }
  input.payment_methods[1].rollout.mode = 'off'
  assert.throws(() => templateToBusinessDocument(input), /不一致/)
  const doc = initialDocument()
  for (let i = 0; i < 1000; i++) {
    const profile = { ...context(), userId: `u_${i}` }
    doc.rules.card = { ...allRule(), mode: 'gradual', percentage: 5 }
    const old = evaluateBusinessTemplate(doc, scope, profile, {
      eligibility: profile.eligibility,
    }).methods.find((m) => m.id === 'card')
    doc.rules.card.percentage = 25
    const next = evaluateBusinessTemplate(doc, scope, profile, {
      eligibility: profile.eligibility,
    }).methods.find((m) => m.id === 'card')
    assert(!old.hit || next.hit)
    assert.equal(old.bucket, next.bucket)
  }
})

test('request boundary rejects foreign origins and unsupported JSON types in explicit local demo', async () => {
  const local = createRolloutServer({ store, demo: true })
  await new Promise((resolve) => local.server.listen(0, '127.0.0.1', resolve))
  try {
    const url = `http://127.0.0.1:${local.server.address().port}/api/rollout/session`
    const denied = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({ role: 'editor' }),
    })
    assert.equal(denied.status, 403)
    const login = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:3001',
      },
      body: JSON.stringify({ role: 'editor' }),
    })
    assert.equal(login.status, 200)
    assert(
      login.headers.get('set-cookie').includes('HttpOnly; SameSite=Strict'),
    )
    const cookie = login.headers.get('set-cookie').split(';')[0]
    const csrf = await fetch(
      `http://127.0.0.1:${local.server.address().port}/api/rollout/templates`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
          Origin: 'https://evil.example',
        },
        body: '{}',
      },
    )
    assert.equal(csrf.status, 403)
    const badJSON = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:3001',
      },
      body: 'not-json',
    })
    assert.equal(badJSON.status, 400)
    const nonJSON = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Origin: 'http://127.0.0.1:3001',
      },
      body: '{}',
    })
    assert.equal(nonJSON.status, 415)
    const wrongHost = await new Promise((resolve, reject) => {
      const req = httpRequest(
        url,
        { headers: { Host: 'evil.example' } },
        (response) => {
          response.resume()
          resolve(response.statusCode)
        },
      )
      req.on('error', reject)
      req.end()
    })
    assert.equal(wrongHost, 403)
    const tooLarge = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:3001',
      },
      body: JSON.stringify({ role: 'editor', oversized: 'x'.repeat(270000) }),
    })
    assert.equal(tooLarge.status, 413)
  } finally {
    await new Promise((resolve) => local.server.close(resolve))
  }
})
