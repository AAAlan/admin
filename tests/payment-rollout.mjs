import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cloneRollout,
  createRolloutConfig,
  createRolloutCapabilities,
  createRolloutProfile,
  createRolloutWorkspace,
  evaluateRollout,
  isRolloutPercentage,
  parseRolloutIds,
  rolloutBucket,
  rolloutCatalog,
  rolloutChanges,
  rolloutPlatforms,
  rolloutReadiness,
  rolloutReadinessErrors,
  transitionRollout,
  validateRolloutConfig,
} from '../src/utils/paymentRollout.js'

const setup = () => ({
  config: createRolloutConfig(),
  profile: createRolloutProfile(),
})
const resultFor = (result, key) =>
  [...result.methods, ...result.features].find((item) => item.key === key)
const command = (state, type, extra = {}) =>
  transitionRollout(state, {
    type,
    role: 'editor',
    reason: '测试配置变更原因',
    at: '2026-10-29T08:00:00Z',
    ...extra,
  })
const published = () => {
  const initial = createRolloutWorkspace(),
    config = cloneRollout(initial.current)
  config.rules.card_save.percentage = 50
  const submitted = command(initial, 'submit', { config, baseRevision: 1 })
  return command(submitted.state, 'approve', { role: 'reviewer' }).state
}

test('percentage validation is shared with the simplified mode editor', () => {
  for (const value of [0, '0', '0.01', 25, '99.99', 100, '100.00'])
    assert.equal(isRolloutPercentage(value), true, String(value))
  for (const value of ['', null, undefined, -1, 101, '1e1', '25.001', 'NaN'])
    assert.equal(isRolloutPercentage(value), false, String(value))
})

test('defaults validate and retain a protected baseline', () => {
  const { config, profile } = setup()
  assert.deepEqual(validateRolloutConfig(config), [])
  const result = evaluateRollout(config, profile)
  assert.equal(resultFor(result, 'card').hit, true)
  assert.equal(resultFor(result, 'paypal').hit, true)
  assert.equal(resultFor(result, 'card_reuse').hit, true)
  assert.equal(resultFor(result, 'apple_pay').code, 'INELIGIBLE')
  assert.equal(resultFor(result, 'klarna').code, 'SWITCH_OFF')
  assert(result.canPay)
})

test('user platform targeting uses the overseas enum independently of payment device', () => {
  const { config, profile } = setup()
  assert.deepEqual(rolloutPlatforms, ['apple', 'google', 'PSN', 'windows'])
  Object.assign(config.rules.card_save, {
    mode: 'all',
    platforms: ['apple', 'PSN'],
  })
  const originalBucket = resultFor(
    evaluateRollout(config, profile),
    'card_save',
  ).bucket
  for (const platform of rolloutPlatforms) {
    for (const device of ['web', 'ios', 'android']) {
      const result = resultFor(
        evaluateRollout(config, { ...profile, platform, device }),
        'card_save',
      )
      assert.equal(result.hit, ['apple', 'PSN'].includes(platform))
      assert.equal(
        result.bucket,
        originalBucket,
        'platform and device do not reseed cohort',
      )
      if (!result.hit) assert.equal(result.code, 'PLATFORM_MISS')
    }
  }
  config.rules.card_save.allow = profile.customerId
  assert.equal(
    resultFor(
      evaluateRollout(config, { ...profile, platform: 'google' }),
      'card_save',
    ).code,
    'PLATFORM_MISS',
  )
  config.rules.card_save.platforms = []
  assert.equal(
    resultFor(
      evaluateRollout(config, { ...profile, platform: 'windows' }),
      'card_save',
    ).hit,
    true,
  )
})

test('Apple Pay eligibility never treats user platform as actual device capability', () => {
  const { config, profile } = setup()
  Object.assign(config.rules.apple_pay, { mode: 'all', platforms: ['google'] })
  assert.equal(
    resultFor(
      evaluateRollout(config, {
        ...profile,
        platform: 'google',
        device: 'ios',
      }),
      'apple_pay',
    ).hit,
    true,
  )
  assert.equal(
    resultFor(
      evaluateRollout(config, {
        ...profile,
        platform: 'google',
        device: 'web',
      }),
      'apple_pay',
    ).code,
    'INELIGIBLE',
  )
  assert.equal(
    resultFor(
      evaluateRollout(config, { ...profile, platform: 'apple', device: 'ios' }),
      'apple_pay',
    ).code,
    'PLATFORM_MISS',
  )
})

test('legacy client filters are rejected rather than silently widened or mapped to user platforms', () => {
  const { config, profile } = setup()
  config.rules.card_save.devices = ['ios']
  assert(
    validateRolloutConfig(config).some((error) =>
      error.includes('devices 已移除'),
    ),
  )
  assert.equal(evaluateRollout(config, profile).canPay, false)
  delete config.rules.card_save.platforms
  assert(validateRolloutConfig(config).length)
  delete config.rules.card_save.devices
  config.rules.card_save.platforms = ['ios']
  assert(validateRolloutConfig(config).length)
})

test('ID parser supports Chinese punctuation, whitespace and deduplication', () => {
  assert.deepEqual(parseRolloutIds(' a,a，b\nc；d; e  '), [
    'a',
    'b',
    'c',
    'd',
    'e',
  ])
})

test('UTF-8 bucket is stable, scope isolated and independent of config version', () => {
  const config = createRolloutConfig()
  const bucket = rolloutBucket(config.scope, 'card_save', 'user:测试用户_42')
  assert.equal(
    bucket,
    865,
    'UTF-8 golden vector for cross-language implementations',
  )
  assert.equal(
    rolloutBucket(config.scope, 'card_save', 'user:user_10042'),
    1071,
  )
  assert.equal(
    rolloutBucket(config.scope, 'card_save', 'session:session_demo_01'),
    603,
  )
  assert(bucket >= 0 && bucket < 10000)
  assert.equal(
    bucket,
    rolloutBucket(cloneRollout(config.scope), 'card_save', 'user:测试用户_42'),
  )
  assert.equal(
    bucket,
    rolloutBucket(
      { ...config.scope, revision: 99, percentage: 100 },
      'card_save',
      'user:测试用户_42',
    ),
  )
  assert.notEqual(
    bucket,
    rolloutBucket(
      { ...config.scope, environment: 'live' },
      'card_save',
      'user:测试用户_42',
    ),
  )
  assert.notEqual(
    rolloutBucket(config.scope, 'card_save', 'user:a'),
    rolloutBucket(config.scope, 'card_save', 'session:a'),
  )
})

test('expanding 10% to 25% never removes previous cohort, across 2,000 IDs', () => {
  const { config, profile } = setup()
  const expanded = cloneRollout(config)
  expanded.rules.paypal_quick.percentage = 25
  let original = 0,
    larger = 0
  for (let index = 0; index < 2000; index++) {
    profile.customerId = `user_${index}`
    const before = resultFor(evaluateRollout(config, profile), 'paypal_quick')
    const after = resultFor(evaluateRollout(expanded, profile), 'paypal_quick')
    assert.equal(before.bucket, after.bucket)
    if (before.hit) {
      original++
      assert(after.hit)
    }
    if (after.hit) larger++
  }
  assert(original > 0 && larger > original)
})

test('percent boundaries are strict: bucket < threshold, not <=', () => {
  const { config, profile } = setup()
  const bucket = rolloutBucket(
    config.scope,
    'card_save',
    `user:${profile.customerId}`,
  )
  config.rules.card_save.percentage = (bucket / 100).toFixed(2)
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').hit,
    false,
  )
  config.rules.card_save.percentage = ((bucket + 1) / 100).toFixed(2)
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').hit,
    true,
  )
  config.rules.card_save.percentage = 0
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').hit,
    false,
  )
  config.rules.card_save.percentage = 100
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').hit,
    true,
  )
})

test('deny list wins over allow; allow only bypasses percentage', () => {
  const { config, profile } = setup()
  const rule = config.rules.card_save
  rule.percentage = 0
  rule.allow = profile.customerId
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').code,
    'ALLOW_LIST',
  )
  rule.deny = profile.customerId
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').code,
    'DENY_LIST',
  )
  rule.deny = ''
  rule.mode = 'off'
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').code,
    'SWITCH_OFF',
  )
  rule.mode = 'gradual'
  rule.countries = ['DE']
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').code,
    'COUNTRY_MISS',
  )
  rule.countries = []
  rule.platforms = ['google']
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').code,
    'PLATFORM_MISS',
  )
})

test('emergency beats lists, mode and eligibility', () => {
  const { config, profile } = setup()
  config.rules.card_save.allow = config.rules.card_save.deny =
    profile.customerId
  config.rules.card_save.mode = 'off'
  assert.equal(
    resultFor(
      evaluateRollout(config, profile, { card_save: true }),
      'card_save',
    ).code,
    'EMERGENCY_STOP',
  )
})

test('parent method closure prevents child shortcut, even for allow-listed users', () => {
  const { config, profile } = setup()
  config.rules.paypal.mode = 'off'
  config.rules.paypal_quick.allow = profile.customerId
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'paypal_quick').code,
    'INELIGIBLE',
  )
  config.rules.paypal.mode = 'all'
  config.rules.paypal_quick.mode = 'off'
  assert.equal(resultFor(evaluateRollout(config, profile), 'paypal').hit, true)
})

test('new saving and historical reuse are independent', () => {
  const { config, profile } = setup()
  config.rules.card_save.mode = 'off'
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_reuse').hit,
    true,
  )
  config.rules.card_save.mode = 'all'
  config.rules.card_reuse.mode = 'off'
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').hit,
    true,
  )
  assert.equal(resultFor(evaluateRollout(config, profile), 'card').hit, true)
})

test('guest uses a stable session for methods but never receives save/reuse features', () => {
  const { config, profile } = setup()
  profile.loggedIn = false
  const result = evaluateRollout(config, profile)
  assert.equal(resultFor(result, 'card').hit, true)
  assert.equal(result.features.filter((item) => item.hit).length, 0)
  assert.equal(result.identity, `session:${profile.sessionId}`)
  profile.sessionId = ''
  assert(evaluateRollout(config, profile).errors.length)
})

test('tokens and consents must belong to this user, merchant and environment', () => {
  const { config, profile } = setup()
  config.rules.paypal_quick.mode = 'all'
  for (const field of ['tokenScopeMatches', 'paypalConsent', 'paypalToken']) {
    const next = { ...profile, [field]: false }
    const result = evaluateRollout(config, next)
    assert.equal(resultFor(result, 'paypal_quick').hit, false)
    assert.equal(resultFor(result, 'paypal').hit, true)
  }
  for (const field of ['tokenScopeMatches', 'cardConsent', 'cardToken']) {
    assert.equal(
      resultFor(
        evaluateRollout(config, { ...profile, [field]: false }),
        'card_reuse',
      ).hit,
      false,
    )
  }
})

test('provider readiness and risk cannot be bypassed by allow lists', () => {
  const { config, profile } = setup()
  config.rules.paypal.allow = config.rules.paypal_quick.allow =
    profile.customerId
  for (const extra of [{ providerReady: false }, { riskBlocked: true }]) {
    const result = evaluateRollout(config, { ...profile, ...extra })
    assert.equal(
      result.methods.some((item) => item.hit),
      false,
    )
    assert.equal(result.canPay, false)
  }
})

test('device, country, currency and final amount intersect with method rollout', () => {
  const { config, profile } = setup()
  const capabilities = createRolloutCapabilities()
  capabilities.klarna = 'enabled'
  config.rules.apple_pay.mode = config.rules.klarna.mode = 'all'
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'apple_pay').hit,
    false,
  )
  assert.equal(
    resultFor(
      evaluateRollout(config, { ...profile, device: 'ios' }),
      'apple_pay',
    ).hit,
    true,
  )
  const german = { ...profile, country: 'DE', currency: 'EUR', amount: '35.00' }
  assert.equal(
    resultFor(evaluateRollout(config, german, {}, capabilities), 'klarna').hit,
    true,
  )
  for (const extra of [
    { amount: '34.99' },
    { currency: 'USD' },
    { country: 'US' },
    { amount: '1000.01' },
  ]) {
    assert.equal(
      resultFor(
        evaluateRollout(config, { ...german, ...extra }, {}, capabilities),
        'klarna',
      ).hit,
      false,
    )
  }
})

test('processing or unknown original payment blocks further confirmation', () => {
  const { config, profile } = setup()
  for (const paymentState of ['processing', 'unknown']) {
    const result = evaluateRollout(config, { ...profile, paymentState })
    assert.equal(result.canPay, false)
    assert.match(result.paymentNotice, /先查单/)
  }
  assert.equal(
    evaluateRollout(config, { ...profile, challenge: true }).requiresChallenge,
    true,
  )
})

test('invalid rule inputs fail closed without throwing', () => {
  for (const percentage of [
    -1,
    101,
    NaN,
    Infinity,
    '',
    '2.345',
    '1e2',
    ' 10',
  ]) {
    const { config, profile } = setup()
    config.rules.card_save.percentage = percentage
    assert(validateRolloutConfig(config).length, String(percentage))
    assert.equal(evaluateRollout(config, profile).canPay, false)
  }
  assert(validateRolloutConfig(null).length)
  const { config } = setup()
  config.rules.card_save.mode = 'typo'
  config.rules.card_save.platforms = null
  assert(validateRolloutConfig(config).length >= 2)
})

test('invalid profiles fail closed and cannot bypass amount or identity checks', () => {
  const { config, profile } = setup()
  for (const extra of [
    { amount: '0' },
    { amount: '-5' },
    { amount: '2.111' },
    { amount: '1e2' },
    { country: 'XX' },
    { currency: 'XXX' },
    { device: 'tv' },
    { platform: 'web' },
    { platform: '' },
    { customerId: ' ' },
  ]) {
    assert(evaluateRollout(config, { ...profile, ...extra }).errors.length)
  }
})

test('baseline cannot be removed, narrowed or emergency-stopped', () => {
  const { config } = setup()
  for (const extra of [
    { mode: 'off' },
    { mode: 'gradual' },
    { countries: ['US'] },
    { platforms: ['apple'] },
    { allow: 'test' },
    { deny: 'test' },
  ]) {
    const candidate = cloneRollout(config)
    Object.assign(candidate.rules.card, extra)
    assert(validateRolloutConfig(candidate).length)
  }
  assert.equal(
    command(createRolloutWorkspace(), 'kill', {
      role: 'emergency',
      keys: ['card'],
    }).ok,
    false,
  )
})

test('submitting captures an immutable snapshot and does not publish', () => {
  const state = createRolloutWorkspace(),
    config = cloneRollout(state.current)
  config.rules.card_save.percentage = 50
  const submitted = command(state, 'submit', { config, baseRevision: 1 })
  assert(submitted.ok)
  assert.equal(submitted.state.revision, 1)
  assert.equal(submitted.state.current.rules.card_save.percentage, 25)
  config.rules.card_save.percentage = 99
  assert.equal(submitted.state.pending.config.rules.card_save.percentage, 50)
  assert.equal(state.pending, null)
  assert.equal(submitted.state.events[0].changes.length, 1)
})

test('only independent reviewer publishes pending snapshot; reason is required', () => {
  const state = createRolloutWorkspace(),
    config = cloneRollout(state.current)
  config.rules.card_save.percentage = 50
  const submitted = command(state, 'submit', { config, baseRevision: 1 }).state
  assert.equal(command(submitted, 'approve').ok, false)
  assert.equal(
    command(submitted, 'approve', { role: 'reviewer', reason: '短' }).ok,
    false,
  )
  const approved = command(submitted, 'approve', { role: 'reviewer' })
  assert(approved.ok)
  assert.equal(approved.state.revision, 2)
  assert.equal(approved.state.current.rules.card_save.percentage, 50)
  assert.equal(approved.state.pending, null)
  assert.equal(approved.state.versions.length, 2)
  assert(approved.state.events[0].previousConfig)
  assert(approved.state.events[0].nextConfig)
})

test('stale versions, duplicate pending, empty changes and cross-scope submission are rejected', () => {
  const state = createRolloutWorkspace(),
    config = cloneRollout(state.current)
  assert.equal(command(state, 'submit', { config, baseRevision: 1 }).ok, false)
  config.rules.card_save.percentage = 50
  assert.equal(command(state, 'submit', { config, baseRevision: 0 }).ok, false)
  const submitted = command(state, 'submit', { config, baseRevision: 1 }).state
  assert.equal(
    command(submitted, 'submit', { config, baseRevision: 1 }).ok,
    false,
  )
  submitted.revision = 2
  assert.equal(command(submitted, 'approve', { role: 'reviewer' }).ok, false)
  config.scope.environment = 'live'
  assert.equal(command(state, 'submit', { config, baseRevision: 1 }).ok, false)
})

test('approval revalidates safety instead of trusting a pending snapshot', () => {
  const state = createRolloutWorkspace(),
    config = cloneRollout(state.current)
  config.rules.card_save.percentage = 50
  const submitted = command(state, 'submit', { config, baseRevision: 1 }).state
  submitted.pending.config.rules.card.mode = 'off'
  assert.equal(command(submitted, 'approve', { role: 'reviewer' }).ok, false)
})

test('reject and withdraw retain current config and enforce roles', () => {
  for (const [type, role] of [
    ['reject', 'reviewer'],
    ['withdraw', 'editor'],
  ]) {
    const state = createRolloutWorkspace(),
      config = cloneRollout(state.current)
    config.rules.card_save.percentage = 50
    const submitted = command(state, 'submit', {
      config,
      baseRevision: 1,
    }).state
    assert.equal(command(submitted, type, { role: 'emergency' }).ok, false)
    const result = command(submitted, type, { role })
    assert(result.ok)
    assert.equal(result.state.pending, null)
    assert.equal(result.state.current.rules.card_save.percentage, 25)
  }
})

test('emergency invalidates pending; rollback makes a new version but never clears kills', () => {
  const state = published(),
    config = cloneRollout(state.current)
  config.rules.card_save.percentage = 75
  const submitted = command(state, 'submit', {
    config,
    baseRevision: state.revision,
  }).state
  const keys = rolloutCatalog
    .filter((item) => !item.baseline)
    .map((item) => item.key)
  assert.equal(command(submitted, 'kill', { keys }).ok, false)
  const killed = command(submitted, 'kill', { role: 'emergency', keys }).state
  assert.equal(killed.pending, null)
  const rolled = command(killed, 'rollback', {
    role: 'reviewer',
    targetRevision: 1,
  })
  assert(rolled.ok)
  assert.equal(rolled.state.revision, 3)
  assert.equal(rolled.state.current.rules.card_save.percentage, 25)
  assert.equal(rolled.state.kills.card_save, true)
  assert.equal(rolled.state.versions.length, 3)
  const decision = evaluateRollout(
    rolled.state.current,
    createRolloutProfile(),
    rolled.state.kills,
  )
  assert.deepEqual(
    decision.methods.filter((item) => item.hit).map((item) => item.key),
    ['card'],
  )
  const resumed = command(rolled.state, 'resume', { role: 'emergency', keys })
  assert(resumed.ok)
  assert.equal(resumed.state.kills.card_save, false)
  assert.equal(resumed.state.revision, 3)
})

test('unsupported roles, unknown commands and invalid emergency targets never mutate state', () => {
  const state = createRolloutWorkspace(),
    before = cloneRollout(state)
  for (const [type, extra] of [
    ['kill', { role: 'unknown' }],
    ['unknown', {}],
    ['kill', { role: 'emergency', keys: ['bad'] }],
    ['kill', { role: 'emergency', keys: [] }],
    ['rollback', { role: 'reviewer', targetRevision: 99 }],
  ]) {
    assert.equal(command(state, type, extra).ok, false)
  }
  assert.deepEqual(state, before)
})

test('per-object readiness fails closed and allow lists cannot bypass it', () => {
  const { config, profile } = setup()
  const capabilities = createRolloutCapabilities()
  config.rules.klarna.mode = 'all'
  const german = { ...profile, country: 'DE', currency: 'EUR' }
  assert.equal(resultFor(evaluateRollout(config, german), 'klarna').hit, false)
  for (const state of [
    'pending',
    'not_enabled',
    'unknown',
    'invalid',
    undefined,
  ]) {
    capabilities.paypal = state
    config.rules.paypal.allow = config.rules.paypal_quick.allow =
      profile.customerId
    const result = evaluateRollout(config, profile, {}, capabilities)
    assert.equal(resultFor(result, 'paypal').hit, false)
    assert.equal(resultFor(result, 'paypal_quick').hit, false)
    assert.equal(resultFor(result, 'card').hit, true)
    assert.equal(rolloutReadiness(capabilities, 'paypal_quick').ready, false)
  }
  assert.equal(rolloutReadiness({}, 'card').state, 'unknown')
  assert.equal(rolloutReadiness(null, 'card').ready, false)
  assert.equal(
    rolloutReadiness({ unknown_key: 'enabled' }, 'unknown_key').ready,
    false,
  )
  assert.equal(evaluateRollout(config, profile, {}, {}).canPay, false)
})

test('unready child blocks only that experience, not the parent or sibling', () => {
  const { config, profile } = setup()
  const capabilities = createRolloutCapabilities()
  capabilities.card_save = 'not_enabled'
  config.rules.card_save.mode = 'all'
  config.rules.card_save.allow = profile.customerId
  const result = evaluateRollout(config, profile, {}, capabilities)
  assert.equal(resultFor(result, 'card_save').hit, false)
  assert.equal(resultFor(result, 'card_reuse').hit, true)
  assert.equal(resultFor(result, 'card').hit, true)
})

test('0% pilot permits only listed eligible users, without a new mode', () => {
  const { config, profile } = setup()
  Object.assign(config.rules.card_save, {
    mode: 'gradual',
    percentage: 0,
    allow: 'pilot_user',
  })
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').hit,
    false,
  )
  profile.customerId = 'pilot_user'
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').code,
    'ALLOW_LIST',
  )
  config.rules.card_save.deny = 'pilot_user'
  assert.equal(
    resultFor(evaluateRollout(config, profile), 'card_save').hit,
    false,
  )
})

test('planning stays valid but unready expansion cannot submit', () => {
  const state = createRolloutWorkspace(),
    config = cloneRollout(state.current)
  config.rules.klarna.mode = 'all'
  assert.deepEqual(validateRolloutConfig(config), [], 'can plan a draft')
  const blocked = command(state, 'submit', { config, baseRevision: 1 })
  assert.equal(blocked.ok, false)
  assert.match(blocked.error, /开通处理中/)
  assert.equal(state.pending, null)
  state.capabilities.klarna = 'enabled'
  assert.equal(command(state, 'submit', { config, baseRevision: 1 }).ok, true)
})

test('approval rechecks live readiness, not the submitted status', () => {
  const state = createRolloutWorkspace(),
    config = cloneRollout(state.current)
  config.rules.card_save.percentage = 50
  const submitted = command(state, 'submit', { config, baseRevision: 1 }).state
  submitted.capabilities.card_save = 'unknown'
  const denied = command(submitted, 'approve', { role: 'reviewer' })
  assert.equal(denied.ok, false)
  assert.equal(denied.state.revision, 1)
  assert(denied.state.pending)
  submitted.capabilities.card_save = 'enabled'
  assert.equal(command(submitted, 'approve', { role: 'reviewer' }).ok, true)
})

test('shutdown and provable narrowing remain publishable during unavailability', () => {
  const state = createRolloutWorkspace(),
    config = cloneRollout(state.current)
  state.capabilities.card_save = 'not_enabled'
  for (const rule of [
    { mode: 'off' },
    { percentage: 5 },
    { countries: ['US'], platforms: ['apple'], deny: 'blocked' },
    { percentage: 0, allow: '' },
  ]) {
    config.rules.card_save = { ...state.current.rules.card_save, ...rule }
    assert.deepEqual(
      rolloutReadinessErrors(state.current, config, state.capabilities),
      [],
    )
    const submitted = command(state, 'submit', { config, baseRevision: 1 })
    assert(submitted.ok)
    assert(command(submitted.state, 'approve', { role: 'reviewer' }).ok)
  }
  for (const rule of [
    { percentage: 50 },
    { percentage: 5, allow: 'new_pilot' },
    { mode: 'all' },
  ]) {
    config.rules.card_save = { ...state.current.rules.card_save, ...rule }
    assert(
      rolloutReadinessErrors(state.current, config, state.capabilities).length,
    )
  }
  const narrowed = cloneRollout(state.current)
  Object.assign(narrowed.rules.card_save, {
    countries: ['US'],
    platforms: ['apple'],
    deny: 'blocked',
  })
  assert(
    rolloutReadinessErrors(narrowed, state.current, state.capabilities).length,
    'removing restrictions expands',
  )
})

test('rollback rechecks readiness; resume never activates provider capabilities', () => {
  const state = published(),
    config = cloneRollout(state.current)
  const unready = cloneRollout(state)
  unready.capabilities.card_save = 'not_enabled'
  const stopped = command(unready, 'kill', {
    role: 'emergency',
    keys: ['card_save'],
  }).state
  const restored = command(stopped, 'resume', {
    role: 'emergency',
    keys: ['card_save'],
  }).state
  assert.equal(restored.current.rules.card_save.mode, 'gradual')
  assert.equal(
    resultFor(
      evaluateRollout(
        restored.current,
        createRolloutProfile(),
        restored.kills,
        restored.capabilities,
      ),
      'card_save',
    ).code,
    'INELIGIBLE',
  )
  config.rules.card_save.mode = 'off'
  const submitted = command(state, 'submit', { config, baseRevision: 2 }).state
  const closed = command(submitted, 'approve', { role: 'reviewer' }).state
  closed.capabilities.card_save = 'not_enabled'
  assert.equal(
    command(closed, 'rollback', { role: 'reviewer', targetRevision: 2 }).ok,
    false,
  )
  const killed = command(closed, 'kill', {
    role: 'emergency',
    keys: ['card_save'],
  }).state
  const resumed = command(killed, 'resume', {
    role: 'emergency',
    keys: ['card_save'],
  }).state
  assert.equal(resumed.capabilities.card_save, 'not_enabled')
  assert.equal(resumed.kills.card_save, false)
  assert.equal(
    resultFor(
      evaluateRollout(
        resumed.current,
        createRolloutProfile(),
        resumed.kills,
        resumed.capabilities,
      ),
      'card_save',
    ).hit,
    false,
  )
  resumed.capabilities.card_save = 'enabled'
  const rolled = command(resumed, 'rollback', {
    role: 'reviewer',
    targetRevision: 2,
  })
  assert(rolled.ok)
  assert.equal(rolled.state.revision, 4)
  assert.deepEqual(rolled.state.capabilities, resumed.capabilities)
  assert(!Object.hasOwn(rolled.state.versions[0].config, 'capabilities'))
})

test('diff includes human readable mode, percentage, conditions and lists', () => {
  const initial = createRolloutConfig(),
    changed = cloneRollout(initial)
  Object.assign(changed.rules.card_save, {
    mode: 'all',
    percentage: 100,
    countries: ['US'],
    platforms: ['apple'],
    allow: 'a',
    deny: 'b',
  })
  const changes = rolloutChanges(initial, changed)
  assert.equal(changes.length, 6)
  assert.equal(changes[0].before, '灰度开放')
  assert.equal(changes[0].after, '全量开放')
  assert.equal(
    changes.find((change) => change.key === 'card_save.platforms').name,
    '记住卡信息 · 用户 platform',
  )
})
