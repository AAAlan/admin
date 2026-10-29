import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateTemplateMethods,
  templateMethodBucket,
  templateMethodEntryId,
  templateMethodRule,
  templateRuleErrors,
} from '../src/utils/templatePaymentRollout.js'

const rule = (extra = {}) => ({
  mode: 'gradual',
  percentage: 25,
  countries: [],
  platforms: [],
  allow: '',
  deny: '',
  ...extra,
})
const entry = (extra = {}) => ({
  payment_method_id: 'pm_paypal',
  pay_name: 'PayPal',
  channel_id: 'provider_a',
  enabled: true,
  rollout: rule(),
  ...extra,
})
const template = (extra = {}) => ({
  template_id: 'template_a',
  app_id: 'saki',
  region: 'overseas',
  environment: 'demo',
  published: true,
  enabled: true,
  payment_methods: [entry()],
  ...extra,
})
const profile = {
  userId: 'pilot_user',
  sessionId: 'stable_session',
  country: 'US',
  platform: 'apple',
}
const options = (t) => ({
  eligibility: Object.fromEntries(
    t.payment_methods.map((m) => [templateMethodEntryId(m), true]),
  ),
})
const decide = (t, p = profile, o = options(t)) =>
  evaluateTemplateMethods(t, p, o)

test('template and channel entries are isolated; order/name/version do not change bucket', () => {
  const a = template(),
    b = template({ template_id: 'template_b' })
  const originalB = structuredClone(decide(b))
  const bucketA = decide(a)[0].bucket
  a.payment_methods[0].rollout.percentage = 5
  assert.deepEqual(decide(b), originalB)
  const other = entry({ channel_id: 'provider_b' })
  assert.notEqual(
    templateMethodEntryId(a.payment_methods[0]),
    templateMethodEntryId(other),
  )
  a.payment_methods.unshift(other)
  a.cashier_template_name = 'renamed'
  a.revision = 42
  assert.equal(decide(a)[1].bucket, bucketA)
  const id = templateMethodEntryId(a.payment_methods[1])
  a.payment_methods[1].rollout_entry_id = id
  a.payment_methods[1].pay_name = 'renamed method'
  assert.equal(decide(a)[1].bucket, bucketA)
  assert.notEqual(templateMethodBucket(a, other, 'user:pilot_user'), bucketA)
})

test('percentage expansion is monotonic, identity namespaces and unicode are stable', () => {
  const t = template(),
    m = t.payment_methods[0]
  for (let i = 0; i < 500; i++) {
    const p = { ...profile, userId: `user_${i}` }
    m.rollout.percentage = 5
    const old = decide(t, p)[0]
    m.rollout.percentage = 25
    assert(!old.hit || decide(t, p)[0].hit)
    assert.equal(old.bucket, decide(t, p)[0].bucket)
  }
  assert.equal(
    templateMethodBucket(t, m, 'user:测试_42'),
    templateMethodBucket(t, m, 'user:测试_42'),
  )
  assert.notEqual(
    templateMethodBucket(t, m, 'user:same'),
    templateMethodBucket(t, m, 'session:same'),
  )
})

test('legacy enabled/default and disabled methods keep behavior; dynamic methods supported', () => {
  assert.equal(templateMethodRule({ enabled: true }).mode, 'all')
  assert.equal(templateMethodRule({ enabled: false }).mode, 'off')
  const t = template({
    payment_methods: [entry({ pay_name: 'DANA', rollout: undefined })],
  })
  assert.equal(decide(t)[0].hit, true)
})

test('allow list cannot bypass inactive template, disabled/removed method, deny or eligibility', () => {
  const t = template({
    payment_methods: [
      entry({ rollout: rule({ percentage: 0, allow: 'pilot_user' }) }),
    ],
  })
  assert.equal(decide(t)[0].code, 'ALLOW')
  for (const patch of [{ published: false }, { enabled: false }])
    assert.equal(decide({ ...t, ...patch })[0].code, 'TEMPLATE_INACTIVE')
  t.payment_methods[0].enabled = false
  assert.equal(decide(t)[0].code, 'METHOD_OFF')
  t.payment_methods[0].enabled = true
  t.payment_methods[0].rollout.mode = 'off'
  assert.equal(decide(t)[0].code, 'METHOD_OFF')
  t.payment_methods[0].rollout.mode = 'gradual'
  t.payment_methods[0].rollout.deny = 'pilot_user'
  assert.equal(decide(t)[0].code, 'DENY')
  t.payment_methods[0].rollout.deny = ''
  assert.equal(decide(t, profile, {})[0].code, 'INELIGIBLE')
  assert.equal(
    decide(t, profile, {
      eligibility: { [templateMethodEntryId(t.payment_methods[0])]: false },
    })[0].hit,
    false,
  )
  assert.equal(
    decide(t, profile, {
      ...options(t),
      kills: { [templateMethodEntryId(t.payment_methods[0])]: true },
    })[0].code,
    'EMERGENCY_STOP',
  )
  assert.deepEqual(decide({ ...t, payment_methods: [] }), [])
})

test('platform/country intersection precedes allow and full rollout; device never targets user', () => {
  const t = template({
    payment_methods: [
      entry({
        rollout: rule({
          mode: 'all',
          countries: ['US'],
          platforms: ['google'],
          allow: 'pilot_user',
        }),
      }),
    ],
  })
  assert.equal(decide(t)[0].code, 'PLATFORM_MISS')
  const p = { ...profile, platform: 'google', device: 'ios' }
  assert.equal(decide(t, p)[0].hit, true)
  assert.equal(
    decide(t, { ...p, device: 'web' })[0].bucket,
    decide(t, p)[0].bucket,
  )
  assert.equal(decide(t, { ...p, country: 'DE' })[0].code, 'COUNTRY_MISS')
})

test('invalid rules, missing scope, duplicate ids fail closed; guests use stable session', () => {
  for (const bad of [
    null,
    { ...rule(), devices: ['ios'] },
    rule({ percentage: '' }),
    rule({ percentage: 100.1 }),
    rule({ percentage: 0.001 }),
    rule({ platforms: ['ios'] }),
    rule({ countries: ['us'] }),
    rule({ allow: Array.from({ length: 101 }, (_, i) => `id${i}`).join(',') }),
  ]) {
    assert(templateRuleErrors(bad).length)
    assert.equal(
      decide(template({ payment_methods: [entry({ rollout: bad })] }))[0].hit,
      false,
    )
  }
  assert.equal(decide(template({ template_id: '' }))[0].code, 'INVALID_CONFIG')
  assert.equal(
    decide(template({ payment_methods: [entry({ channel_id: '' })] }))[0].code,
    'INVALID_CONFIG',
  )
  assert.equal(
    decide(template({ payment_methods: [entry({ rollout_entry_id: {} })] }))[0]
      .code,
    'INVALID_CONFIG',
  )
  assert(
    decide(template({ payment_methods: [entry(), entry()] })).every(
      (m) => m.code === 'INVALID_CONFIG',
    ),
  )
  const t = template()
  assert.equal(
    decide(t, { ...profile, userId: '', sessionId: '' })[0].code,
    'NO_IDENTITY',
  )
  t.payment_methods[0].rollout.mode = 'all'
  assert.equal(decide(t, { ...profile, userId: '', sessionId: '' })[0].code, 'NO_IDENTITY')
  assert.equal(
    decide(t, { ...profile, userId: '' })[0].bucket,
    decide(t, { ...profile, userId: '' })[0].bucket,
  )
})
