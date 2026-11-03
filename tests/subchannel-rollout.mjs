import assert from 'node:assert/strict'
import { test, before, after } from 'node:test'
import { RolloutStore } from '../server/store.mjs'
import { createRolloutServer } from '../server/http.mjs'
import {
  subchannelFeatureBucket,
  evaluateSubchannelFeatures,
  closedFeatureRule,
} from '../src/utils/subchannelRollout.js'

const scope = { environment: 'test', region: 'overseas', appId: 'feature-app' }
const principals = [
  'editor',
  'reviewer',
  'emergency',
  'viewer',
  'service',
  'other',
].map((role) => ({
  id: role,
  role: role === 'other' ? 'viewer' : role,
  token: `subchannel-test-${role}`.padEnd(40, 'x'),
  scope: role === 'other' ? { ...scope, appId: 'other-app' } : scope,
}))
const registry = [
  {
    channel_id: 'paypal_test',
    subchannel_id: '5',
    business_method_id: 'paypal',
    name: 'PayPal',
    enabled: true,
    channel_enabled: true,
  },
  {
    channel_id: 'paypal_other',
    subchannel_id: '6',
    business_method_id: 'paypal',
    name: 'PayPal second account',
    enabled: true,
    channel_enabled: true,
  },
  {
    channel_id: 'stripe_test',
    subchannel_id: '3',
    business_method_id: 'card',
    name: 'CARD VISA',
    enabled: true,
    channel_enabled: true,
  },
  {
    channel_id: 'stripe_test',
    subchannel_id: '4',
    business_method_id: 'card',
    name: 'CARD AMEX',
    enabled: true,
    channel_enabled: true,
  },
]
const pathFor = (resource) =>
  `/channels/${resource.channel_id}/subchannels/${resource.subchannel_id}/features`
const paypal = pathFor(registry[0]),
  card = pathFor(registry[2])
let store,
  server,
  base,
  ready = true,
  trusted,
  templateId
const all = () => ({ ...closedFeatureRule(), mode: 'all' })
before(async () => {
  store = new RolloutStore(':memory:')
  const app = createRolloutServer({
    store,
    principals,
    capabilityReader: () => true,
    contextReader: async () => trusted,
    subchannelReader: (s, channel, id) =>
      s.appId === scope.appId
        ? registry.find(
            (r) => r.channel_id === channel && r.subchannel_id === id,
          )
        : null,
    featureCapabilityReader: () => ready,
  })
  server = app.server
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}/api/rollout`
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
  store.close()
})
async function api(path, { role = 'editor', body, status = 200 } = {}) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${principals.find((p) => p.id === role).token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  assert.equal(response.status, status, JSON.stringify(result))
  return result.data ?? result
}
async function save(path, rules) {
  const state = await api(path)
  return api(`${path}/draft`, {
    body: {
      baseDraftRevision: state.draftRevision,
      document: { ...state.draft, rules },
    },
  })
}
async function submit(path) {
  const state = await api(path)
  return api(`${path}/submit`, {
    body: {
      reason: '子渠道功能提审',
      draftRevision: state.draftRevision,
      baseRevision: state.revision,
    },
  })
}
async function approve(path) {
  const state = await api(path)
  return api(`${path}/approve`, {
    role: 'reviewer',
    body: { reason: '独立审核通过', pendingId: state.pending.id },
  })
}

test('subchannel defaults are closed; registry association, role and scope are authoritative', async () => {
  const state = await api(paypal)
  assert.equal(state.draftRevision, 0)
  assert.equal(state.published, null)
  assert.equal(state.draft.rules.paypal_quick.mode, 'off')
  assert.equal(
    (await api('/templates')).total,
    0,
    'Feature reads must not create or contaminate template rows',
  )
  await api('/channels/stripe_test/subchannels/5/features', { status: 404 })
  await api(paypal, { role: 'other', status: 404 })
  await api(paypal, { role: 'service', status: 403 })
  await api(`${paypal}/draft`, {
    role: 'viewer',
    body: { baseDraftRevision: 0, document: state.draft },
    status: 403,
  })
  const invalid = structuredClone(state.draft)
  invalid.rules.paypal_quick.devices = ['ios']
  await api(`${paypal}/draft`, {
    body: { baseDraftRevision: 0, document: invalid },
    status: 422,
  })
})

test('feature drafts, CAS and approval are isolated from other accounts, subchannels and templates', async () => {
  const rule = {
    ...closedFeatureRule(),
    mode: 'gradual',
    percentage: 0,
    allow: 'pilot_user',
  }
  const saved = await save(paypal, { paypal_quick: rule })
  assert.equal(saved.revision, 0)
  await api(`${paypal}/draft`, {
    body: { baseDraftRevision: 0, document: saved.draft },
    status: 409,
  })
  const pending = await submit(paypal)
  await api(`${paypal}/approve`, {
    body: { reason: '拒绝运营自审', pendingId: pending.pending.id },
    status: 403,
  })
  ready = false
  await api(`${paypal}/approve`, {
    role: 'reviewer',
    body: { reason: '机构状态变更复验', pendingId: pending.pending.id },
    status: 422,
  })
  ready = true
  assert.equal((await approve(paypal)).revision, 1)
  assert.equal((await api(pathFor(registry[1]))).revision, 0)
  assert.equal((await api('/templates')).total, 0)
  const preview = await api(`${paypal}/preview`, {
    body: {
      source: 'published',
      profile: {
        userId: 'pilot_user',
        country: 'US',
        platform: 'apple',
        riskAllowed: true,
      },
      eligibleSample: true,
      authorizationSample: true,
    },
  })
  assert.equal(preview.results[0].hit, true)
  const withoutAuth = await api(`${paypal}/preview`, {
    body: {
      source: 'published',
      profile: { userId: 'pilot_user', riskAllowed: true },
      eligibleSample: true,
      authorizationSample: false,
    },
  })
  assert.equal(withoutAuth.results[0].code, 'AUTHORIZATION_REQUIRED')
})

test('card saving and reuse remain separate, and sibling card-brand subchannels do not share configuration', async () => {
  const state = await save(card, {
    card_save: all(),
    card_reuse: closedFeatureRule(),
  })
  await submit(card)
  await approve(card)
  const result = await api(`${card}/preview`, {
    body: {
      source: 'published',
      profile: { userId: 'pilot_user', riskAllowed: true },
      eligibleSample: true,
      authorizationSample: false,
    },
  })
  assert(result.results.find((r) => r.key === 'card_save').hit)
  assert.equal(result.results.find((r) => r.key === 'card_reuse').hit, false)
  assert.equal(
    (await api(pathFor(registry[3]))).draft.rules.card_save.mode,
    'off',
  )
  assert.equal(state.draft.business_method_id, 'card')
})

test('feature user buckets are independent of templates and monotonic; parent, platform and authorization take precedence', () => {
  const goldenScope = { environment: 'demo', region: 'overseas', appId: 'saki' }
  const goldenResource = {
    channel_id: 'paypal_merchant_paypal_001',
    subchannel_id: '5',
  }
  assert.equal(
    subchannelFeatureBucket(
      goldenScope,
      goldenResource,
      'paypal_quick',
      'pilot_user',
    ),
    6263,
  )
  assert.equal(
    subchannelFeatureBucket(
      goldenScope,
      goldenResource,
      'paypal_quick',
      '测试用户_42',
    ),
    9226,
  )
  const document = {
    ...registry[0],
    rules: { paypal_quick: { ...all(), mode: 'gradual', percentage: 5 } },
  }
  const profile = {
    userId: 'pilot_user',
    country: 'US',
    platform: 'apple',
    riskAllowed: true,
  }
  const facts = {
    parentAllowed: true,
    channelEnabled: true,
    subchannelEnabled: true,
    ready: { paypal_quick: true },
    eligibility: { paypal_quick: true },
    tokenValid: true,
    consentValid: true,
  }
  const bucket = subchannelFeatureBucket(
    scope,
    document,
    'paypal_quick',
    profile.userId,
  )
  assert.equal(
    bucket,
    subchannelFeatureBucket(
      scope,
      { ...document, template_id: 'different', revision: 9 },
      'paypal_quick',
      profile.userId,
    ),
  )
  for (let i = 0; i < 1000; i++) {
    profile.userId = `user_${i}`
    document.rules.paypal_quick.percentage = 5
    const before = evaluateSubchannelFeatures(
      document,
      scope,
      profile,
      facts,
    )[0]
    document.rules.paypal_quick.percentage = 25
    const after = evaluateSubchannelFeatures(document, scope, profile, facts)[0]
    assert(!before.hit || after.hit)
    assert.equal(before.bucket, after.bucket)
  }
  profile.userId = 'pilot_user'
  document.rules.paypal_quick = {
    ...all(),
    allow: 'pilot_user',
    platforms: ['google'],
  }
  assert.equal(
    evaluateSubchannelFeatures(document, scope, profile, facts)[0].code,
    'PLATFORM_MISS',
  )
  document.rules.paypal_quick.platforms = []
  assert.equal(
    evaluateSubchannelFeatures(document, scope, profile, {
      ...facts,
      parentAllowed: false,
    })[0].code,
    'PARENT_INACTIVE',
  )
  assert.equal(
    evaluateSubchannelFeatures(document, scope, profile, {
      ...facts,
      tokenValid: false,
    })[0].code,
    'AUTHORIZATION_REQUIRED',
  )
  assert.equal(
    evaluateSubchannelFeatures(
      document,
      scope,
      { ...profile, userId: '' },
      facts,
    )[0].code,
    'LOGIN_REQUIRED',
  )
})

test('runtime combines template visibility and trusted subchannel features without turning off standard PayPal', async () => {
  const document = {
    app_id: scope.appId,
    region: scope.region,
    cashier_template_name: 'feature_parent',
    currency: 'USD',
    enabled: true,
    payment_methods: [
      {
        business_method_id: 'paypal',
        pay_name: 'PayPal',
        channel_id: 'paypal_test',
        enabled: true,
      },
    ],
    rules: { paypal: all() },
  }
  const created = await api('/templates', { body: { document }, status: 201 })
  templateId = created.template_id
  await submit(`/templates/${templateId}`)
  await approve(`/templates/${templateId}`)
  const templateBefore = await api(`/templates/${templateId}`)
  trusted = {
    orderId: 'order-feature',
    templateId,
    ...scope,
    userId: 'pilot_user',
    country: 'US',
    platform: 'apple',
    riskAllowed: true,
    amountMinor: 1000,
    currency: 'USD',
    paymentState: 'idle',
    expiresAt: Date.now() + 600000,
    eligibility: { 'paypal::paypal_test': true },
    subchannels: {
      'paypal::paypal_test': {
        id: '5',
        channelEnabled: true,
        subchannelEnabled: true,
        tokenValid: true,
        consentValid: true,
        eligibility: { paypal_quick: true },
      },
    },
  }
  const decide = () =>
    api('/decisions', {
      role: 'service',
      body: { orderId: trusted.orderId, templateId },
    })
  const first = await decide()
  assert(
    first.allowedMethods[0].eligibleChannels[0].subchannelFeatures.results[0]
      .hit,
  )
  await save(paypal, { paypal_quick: closedFeatureRule() })
  await submit(paypal)
  await approve(paypal)
  const next = await decide()
  assert.equal(
    next.allowedMethods[0].id,
    'paypal',
    'Disabling quick pay must keep standard PayPal',
  )
  assert.equal(
    next.allowedMethods[0].eligibleChannels[0].subchannelFeatures.results[0]
      .hit,
    false,
  )
  await api(`/decisions/${first.decisionId}/revalidate`, {
    role: 'service',
    body: { methodId: 'paypal', channelId: 'paypal_test' },
    status: 409,
  })
  assert.deepEqual(
    await api(`/templates/${templateId}`),
    templateBefore,
    'Feature releases never mutate template revisions or rules',
  )
  trusted.subchannels = {}
  assert.equal(
    (await decide()).allowedMethods[0].eligibleChannels[0].subchannelFeatures,
    null,
    'No trusted binding must not infer quick-pay eligibility',
  )
})

test('emergency and rollback stay inside one subchannel and cannot restore authorization', async () => {
  await save(paypal, { paypal_quick: all() })
  await submit(paypal)
  await approve(paypal)
  let state = await api(paypal)
  const sibling = await api(pathFor(registry[1]))
  await api(`${paypal}/kill`, {
    role: 'emergency',
    body: {
      reason: '子渠道功能止损',
      emergencyEpoch: state.emergencyEpoch,
      methodIds: ['paypal_quick'],
    },
  })
  state = await api(paypal)
  const rolled = await api(`${paypal}/rollback`, {
    role: 'reviewer',
    body: {
      reason: '回滚保留安全覆盖',
      targetRevision: 1,
      baseRevision: state.revision,
      baseDraftRevision: state.draftRevision,
    },
  })
  assert(rolled.kills.paypal_quick)
  assert.deepEqual(await api(pathFor(registry[1])), sibling)
  assert((await api(`${paypal}/audit`)).some((e) => e.action === 'rollback'))
  ready = false
  const result = await api(`${paypal}/preview`, {
    body: {
      source: 'published',
      eligibleSample: true,
      authorizationSample: true,
      profile: { userId: 'pilot_user', riskAllowed: true },
    },
  })
  assert.equal(result.results[0].hit, false)
  ready = true
})
