// Local, deterministic product prototype. No provider calls, storage or payment data.
import { PLATFORM_OPTIONS_OVERSEAS } from './platformOptions.js'

export const rolloutPlatforms = [...PLATFORM_OPTIONS_OVERSEAS]
export const rolloutModes = {
  off: '关闭',
  gradual: '灰度开放',
  all: '全量开放',
}
export const rolloutCatalog = [
  {
    key: 'paypal_quick',
    kind: 'feature',
    name: 'PayPal 快捷支付',
    method: 'paypal',
    mark: 'P',
    color: 'paypal',
    description: '已授权用户使用已保存钱包；未授权用户仍走标准 PayPal。',
    note: '不承诺免登录、免验证，不自动发起扣款。',
  },
  {
    key: 'card_save',
    kind: 'feature',
    name: '记住卡信息',
    method: 'card',
    mark: '＋',
    color: 'card',
    description: '向命中用户展示「保存卡片」选项，默认不勾选。',
    note: '仅控制新保存；关闭不删除历史 token。',
  },
  {
    key: 'card_reuse',
    kind: 'feature',
    name: '使用已保存卡',
    method: 'card',
    mark: '↗',
    color: 'card',
    description: '独立控制历史卡片展示与复用，不依赖新保存开关。',
    note: '仍可能要求 CVC 或 3DS；不包含离线代扣。',
  },
  {
    key: 'card',
    kind: 'method',
    name: '银行卡',
    mark: '▤',
    color: 'card',
    baseline: true,
    description: 'Visa / Mastercard · 基础支付兜底',
    note: '本 Demo 保护基础入口，禁止灰度或关闭。',
  },
  {
    key: 'paypal',
    kind: 'method',
    name: 'PayPal',
    mark: 'P',
    color: 'paypal',
    description: '钱包支付 · 与快捷支付功能独立',
    note: '关闭快捷支付不会隐藏标准 PayPal。',
  },
  {
    key: 'apple_pay',
    kind: 'method',
    name: 'Apple Pay',
    mark: 'A',
    color: 'apple',
    description: '设备钱包 · 示例仅支持 iOS',
    note: '商户、设备、币种和本单资格必须同时满足。',
  },
  {
    key: 'klarna',
    kind: 'method',
    name: 'Klarna',
    mark: 'K.',
    color: 'klarna',
    description: '先买后付 · 示例仅支持德国 EUR 订单',
    note: '示例门槛 €35–€1,000，并非机构完整规则。',
  },
]

export const cloneRollout = (value) => JSON.parse(JSON.stringify(value))
// Normalized local samples, NOT Antom's private Dashboard status enum.
export const readinessLabels = {
  enabled: '已就绪',
  pending: '开通处理中',
  not_enabled: '未开通',
  unknown: '状态未知',
}
export function createRolloutCapabilities() {
  return Object.fromEntries(
    rolloutCatalog.map((item) => [
      item.key,
      item.key === 'klarna' ? 'pending' : 'enabled',
    ]),
  )
}
export function rolloutReadiness(capabilities, key) {
  const item = rolloutCatalog.find((entry) => entry.key === key)
  const state =
    item && Object.hasOwn(readinessLabels, capabilities?.[key])
      ? capabilities[key]
      : 'unknown'
  if (state !== 'enabled')
    return {
      ready: false,
      state,
      reason: `${item?.name || key}：${readinessLabels[state]}（机构样本）`,
    }
  if (item?.method) {
    const parent = rolloutReadiness(capabilities, item.method)
    if (!parent.ready)
      return {
        ready: false,
        state: parent.state,
        reason: `依赖的${parent.reason}`,
      }
  }
  return {
    ready: true,
    state,
    reason: '机构能力已就绪（样本），仍需校验本单资格与用户授权',
  }
}

// Conservative subset proof: safety reductions must remain publishable during an outage.
function isRuleNarrowing(before, after) {
  if (after.mode === 'off') return true
  if (
    after.mode === 'gradual' &&
    Number(after.percentage) === 0 &&
    !parseRolloutIds(after.allow).length
  )
    return true
  if (before.mode === 'off') return false
  const coverage = (rule) =>
    rule.mode === 'all' ? 100 : Number(rule.percentage)
  const subset = (oldValues, newValues) =>
    !oldValues.length ||
    (newValues.length > 0 &&
      newValues.every((value) => oldValues.includes(value)))
  return (
    coverage(after) <= coverage(before) &&
    subset(before.countries, after.countries) &&
    subset(before.platforms, after.platforms) &&
    parseRolloutIds(before.deny).every((id) =>
      parseRolloutIds(after.deny).includes(id),
    ) &&
    (coverage(before) === 100 ||
      parseRolloutIds(after.allow).every((id) =>
        parseRolloutIds(before.allow).includes(id),
      ))
  )
}

export function rolloutReadinessErrors(before, after, capabilities) {
  return rolloutCatalog.flatMap((item) => {
    const previous = before.rules[item.key],
      next = after.rules[item.key]
    if (
      JSON.stringify(previous) === JSON.stringify(next) ||
      isRuleNarrowing(previous, next)
    )
      return []
    const readiness = rolloutReadiness(capabilities, item.key)
    return readiness.ready
      ? []
      : [
          `${readiness.reason}，暂不能新增或扩大开放；可保存草稿、关闭或收窄范围`,
        ]
  })
}

export function createRolloutConfig() {
  const rules = Object.fromEntries(
    rolloutCatalog.map((item) => [
      item.key,
      {
        mode: 'all',
        percentage: 100,
        countries: [],
        platforms: [],
        allow: '',
        deny: '',
      },
    ]),
  )
  Object.assign(rules.paypal_quick, { mode: 'gradual', percentage: 10 })
  Object.assign(rules.card_save, { mode: 'gradual', percentage: 25 })
  Object.assign(rules.apple_pay, { mode: 'gradual', percentage: 20 })
  Object.assign(rules.klarna, { mode: 'off', percentage: 0 })
  return {
    scope: { environment: 'demo', gameId: 'silver-city', sceneId: 'web-store' },
    rules,
  }
}

export function createRolloutProfile() {
  return {
    customerId: 'user_10042',
    sessionId: 'session_demo_01',
    country: 'US',
    currency: 'USD',
    device: 'web',
    platform: 'apple',
    amount: '49.99',
    loggedIn: true,
    providerReady: true,
    riskBlocked: false,
    paypalConsent: true,
    paypalToken: true,
    cardConsent: true,
    cardToken: true,
    tokenScopeMatches: true,
    challenge: false,
    paymentState: 'idle',
  }
}

export const parseRolloutIds = (text) => [
  ...new Set(
    String(text || '')
      .split(/[\s,，;；]+/)
      .map((id) => id.trim())
      .filter(Boolean),
  ),
]

// FNV-1a over UTF-8, modulo 10,000. The version and percentage never enter the seed.
// Production must implement this same algorithm server-side; this is not a security hash.
export function rolloutBucket(scope, key, identity) {
  const seed = JSON.stringify([
    scope.environment,
    scope.gameId,
    scope.sceneId,
    key,
    identity,
  ])
  let hash = 0x811c9dc5
  for (const byte of new TextEncoder().encode(seed))
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0
  return hash % 10000
}

export function isRolloutPercentage(value) {
  return /^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/.test(String(value))
}

export function validateRolloutConfig(config) {
  const errors = []
  if (
    !config?.scope ||
    !['environment', 'gameId', 'sceneId'].every(
      (key) =>
        typeof config.scope[key] === 'string' && config.scope[key].trim(),
    )
  )
    errors.push('配置作用域不完整')
  for (const item of rolloutCatalog) {
    const rule = config?.rules?.[item.key]
    if (!rule) {
      errors.push(`${item.name}：缺少规则`)
      continue
    }
    if (!Object.hasOwn(rolloutModes, rule.mode))
      errors.push(`${item.name}：无效开放模式`)
    if (!isRolloutPercentage(rule.percentage))
      errors.push(`${item.name}：比例须为 0–100，最多两位小数`)
    for (const [field, options] of [
      ['countries', ['US', 'DE', 'GB']],
      ['platforms', rolloutPlatforms],
    ]) {
      if (
        !Array.isArray(rule[field]) ||
        rule[field].some((value) => !options.includes(value))
      )
        errors.push(`${item.name}：${field} 包含不支持的条件`)
    }
    if (Object.hasOwn(rule, 'devices'))
      errors.push(
        `${item.name}：旧客户端条件 devices 已移除，请按用户 platform 重新配置`,
      )
    if (typeof rule.allow !== 'string' || typeof rule.deny !== 'string')
      errors.push(`${item.name}：名单格式错误`)
    if (
      parseRolloutIds(rule.allow).length > 100 ||
      parseRolloutIds(rule.deny).length > 100
    )
      errors.push(`${item.name}：单个名单最多 100 个 ID`)
    if (
      item.baseline &&
      (rule.mode !== 'all' ||
        rule.countries?.length ||
        rule.platforms?.length ||
        parseRolloutIds(rule.allow).length ||
        parseRolloutIds(rule.deny).length)
    )
      errors.push('基础银行卡必须全量且不限制人群，以保护兜底')
  }
  return errors
}

export function rolloutChanges(before, after) {
  const fields = {
    mode: '开放模式',
    percentage: '灰度比例',
    countries: '国家/地区',
    platforms: '用户 platform',
    allow: '白名单',
    deny: '黑名单',
  }
  const display = (field, value) =>
    field === 'mode'
      ? rolloutModes[value] || String(value)
      : field === 'percentage'
        ? `${value}%`
        : Array.isArray(value)
          ? value.join('、') || '全部'
          : value || '无'
  return rolloutCatalog.flatMap((item) =>
    Object.entries(fields).flatMap(([field, label]) => {
      const oldValue = before.rules[item.key][field],
        newValue = after.rules[item.key][field]
      return JSON.stringify(oldValue) === JSON.stringify(newValue)
        ? []
        : [
            {
              key: `${item.key}.${field}`,
              name: `${item.name} · ${label}`,
              before: display(field, oldValue),
              after: display(field, newValue),
            },
          ]
    }),
  )
}

function profileErrors(profile) {
  const errors = []
  if (!['US', 'DE', 'GB'].includes(profile.country))
    errors.push('无效国家/地区')
  if (!['USD', 'EUR', 'GBP'].includes(profile.currency)) errors.push('无效币种')
  if (!['web', 'ios', 'android'].includes(profile.device))
    errors.push('无效支付设备环境')
  if (!rolloutPlatforms.includes(profile.platform))
    errors.push('无效用户 platform')
  if (
    !/^\d{1,6}(?:\.\d{1,2})?$/.test(String(profile.amount)) ||
    Number(profile.amount) <= 0
  )
    errors.push('金额须大于 0，且最多两位小数')
  if (profile.loggedIn && !String(profile.customerId || '').trim())
    errors.push('已登录用户必须提供用户 ID')
  if (!profile.loggedIn && !String(profile.sessionId || '').trim())
    errors.push('游客必须提供稳定会话 ID')
  return errors
}

export function evaluateRollout(
  config,
  profile,
  kills = {},
  capabilities = createRolloutCapabilities(),
) {
  const errors = [...validateRolloutConfig(config), ...profileErrors(profile)]
  if (errors.length) return { errors, methods: [], features: [], canPay: false }
  const identity = profile.loggedIn
    ? `user:${profile.customerId.trim()}`
    : `session:${profile.sessionId.trim()}`
  const amount = Math.round(Number(profile.amount) * 100)
  const methodEligibility = (key) => {
    const readiness = rolloutReadiness(capabilities, key)
    if (!readiness.ready) return readiness.reason
    if (!profile.providerReady) return '本单机构健康检查未通过（故障样本）'
    if (profile.riskBlocked) return '本单风控阻断'
    if (amount > 500000) return '超过示例渠道限额 5,000'
    if (key === 'apple_pay' && profile.device !== 'ios')
      return '设备不支持 Apple Pay（示例仅 iOS）'
    if (
      key === 'klarna' &&
      (profile.country !== 'DE' ||
        profile.currency !== 'EUR' ||
        amount < 3500 ||
        amount > 100000)
    )
      return '不满足德国 EUR 35–1,000 的示例资格'
    return ''
  }
  const evaluate = (item, prerequisite = '') => {
    const rule = config.rules[item.key],
      bucket = rolloutBucket(config.scope, item.key, identity)
    let code = 'PERCENT_MISS',
      reason = '未命中灰度，使用基础体验',
      hit = false
    const block = (nextCode, nextReason) => {
      code = nextCode
      reason = nextReason
    }
    const userId = profile.loggedIn ? profile.customerId.trim() : ''
    if (kills[item.key])
      block('EMERGENCY_STOP', '已紧急停用，优先于发布版本和白名单')
    else if (profile.loggedIn && parseRolloutIds(rule.deny).includes(userId))
      block('DENY_LIST', '命中黑名单，黑名单优先')
    else if (rule.mode === 'off')
      block('SWITCH_OFF', '运营开关已关闭，白名单不能绕过')
    else if (prerequisite) block('INELIGIBLE', prerequisite)
    else if (rule.countries.length && !rule.countries.includes(profile.country))
      block('COUNTRY_MISS', '不在目标国家/地区')
    else if (
      rule.platforms.length &&
      !rule.platforms.includes(profile.platform)
    )
      block('PLATFORM_MISS', '不在目标用户 platform')
    else if (profile.loggedIn && parseRolloutIds(rule.allow).includes(userId)) {
      hit = true
      code = 'ALLOW_LIST'
      reason = '命中白名单，仍须满足本单资格'
    } else if (rule.mode === 'all') {
      hit = true
      code = 'ALL'
      reason = '全量开放，已通过本单资格校验'
    } else if (bucket < Math.round(Number(rule.percentage) * 100)) {
      hit = true
      code = 'PERCENT_HIT'
      reason = `稳定分桶 ${bucket} < ${Math.round(Number(rule.percentage) * 100)}，命中灰度`
    } else
      reason = `稳定分桶 ${bucket} ≥ ${Math.round(Number(rule.percentage) * 100)}，未命中灰度`
    return {
      ...item,
      hit,
      code,
      reason,
      bucket,
      threshold: Math.round(Number(rule.percentage) * 100),
      mode: rule.mode,
    }
  }
  const methods = rolloutCatalog
    .filter((item) => item.kind === 'method')
    .map((item) => evaluate(item, methodEligibility(item.key)))
  const features = rolloutCatalog
    .filter((item) => item.kind === 'feature')
    .map((item) => {
      const parent = methods.find((method) => method.key === item.method)
      let prerequisite = !parent.hit
        ? `${parent.name} 入口不可用，子功能不生效`
        : !profile.loggedIn
          ? '需登录并绑定同一用户身份'
          : ''
      if (!prerequisite) {
        const readiness = rolloutReadiness(capabilities, item.key)
        if (!readiness.ready) prerequisite = readiness.reason
      }
      // Reuse requires both valid consent and a token bound to this account, merchant and environment.
      if (!prerequisite && item.key === 'card_reuse')
        prerequisite = !profile.tokenScopeMatches
          ? '卡 token 不属于当前用户、商户或环境'
          : !profile.cardConsent
            ? '历史卡保存授权已撤销'
            : !profile.cardToken
              ? '没有有效的已保存卡 token'
              : ''
      if (!prerequisite && item.key === 'paypal_quick')
        prerequisite = !profile.tokenScopeMatches
          ? 'PayPal token 不属于当前用户、商户或环境'
          : !profile.paypalConsent
            ? '未获得有效 PayPal 授权，使用标准流程'
            : !profile.paypalToken
              ? '钱包 token 已失效，使用标准流程'
              : ''
      return evaluate(item, prerequisite)
    })
  const paymentReady = profile.paymentState === 'idle'
  return {
    errors: [],
    identity,
    methods,
    features,
    canPay: methods.some((item) => item.hit) && paymentReady,
    paymentNotice: paymentReady
      ? ''
      : '原笔支付处理中或结果未知：先查单，不能切换方式重新扣款。',
    requiresChallenge: Boolean(profile.challenge),
    saveRequiresConsent: features.some(
      (item) => item.key === 'card_save' && item.hit,
    ),
  }
}

export function createRolloutWorkspace() {
  const config = createRolloutConfig()
  return {
    revision: 1,
    current: config,
    capabilities: createRolloutCapabilities(),
    pending: null,
    kills: {},
    events: [],
    versions: [
      {
        revision: 1,
        config: cloneRollout(config),
        reason: '初始化演示基线',
        actor: '系统样本',
        at: '演示初始版本',
      },
    ],
  }
}

const roles = {
  editor: '运营 · 林晓',
  reviewer: '审批 · 陈安',
  emergency: '应急 · 周宁',
}
export function transitionRollout(state, command) {
  const fail = (error) => ({ ok: false, state, error })
  const { type, role, reason = '' } = command
  if (!roles[role]) return fail('无操作权限')
  if (!reason.trim() || reason.trim().length < 5)
    return fail('请填写至少 5 个字的操作原因')
  const next = cloneRollout(state)
  const at = command.at || new Date().toISOString()
  let message = ''
  if (type === 'submit') {
    if (role !== 'editor') return fail('仅配置编辑员可以提交审核')
    if (state.pending) return fail('已有待审核版本，请先审核或撤回')
    if (command.baseRevision !== state.revision)
      return fail('基线版本已变化，请重新加载后提交')
    if (
      JSON.stringify(command.config?.scope) !==
      JSON.stringify(state.current.scope)
    )
      return fail('本演示不允许跨作用域发布')
    const errors = validateRolloutConfig(command.config)
    if (errors.length) return fail(errors.join('；'))
    const readinessErrors = rolloutReadinessErrors(
      state.current,
      command.config,
      state.capabilities,
    )
    if (readinessErrors.length) return fail(readinessErrors.join('；'))
    if (!rolloutChanges(state.current, command.config).length)
      return fail('没有待发布变更')
    next.pending = {
      config: cloneRollout(command.config),
      baseRevision: state.revision,
      submitter: roles[role],
      reason: reason.trim(),
    }
    message = '已提交审核；当前生效版本未改变'
  } else if (type === 'approve') {
    if (role !== 'reviewer')
      return fail('请切换到独立审批人，编辑员不能自行发布')
    if (!state.pending) return fail('没有待审核配置')
    if (state.pending.baseRevision !== state.revision)
      return fail('审核快照已过期，请重新提交')
    const errors = validateRolloutConfig(state.pending.config)
    if (errors.length) return fail(errors.join('；'))
    const readinessErrors = rolloutReadinessErrors(
      state.current,
      state.pending.config,
      state.capabilities,
    )
    if (readinessErrors.length) return fail(readinessErrors.join('；'))
    next.current = cloneRollout(state.pending.config)
    next.pending = null
    next.revision += 1
    next.versions.unshift({
      revision: next.revision,
      config: cloneRollout(next.current),
      reason: state.pending.reason,
      actor: roles[role],
      at,
    })
    message = `审核通过，v${next.revision} 已在本地演示生效`
  } else if (type === 'reject' || type === 'withdraw') {
    if (
      (type === 'reject' && role !== 'reviewer') ||
      (type === 'withdraw' && role !== 'editor')
    )
      return fail('当前身份无权执行此操作')
    if (!state.pending) return fail('没有待审核配置')
    next.pending = null
    message = type === 'reject' ? '已驳回，草稿可继续修改' : '已撤回审核'
  } else if (type === 'rollback') {
    if (role !== 'reviewer') return fail('仅审批员可以回滚')
    const target = state.versions.find(
      (version) => version.revision === command.targetRevision,
    )
    if (!target || target.revision === state.revision)
      return fail('请选择一个历史版本')
    const errors = validateRolloutConfig(target.config)
    if (errors.length) return fail(errors.join('；'))
    const readinessErrors = rolloutReadinessErrors(
      state.current,
      target.config,
      state.capabilities,
    )
    if (readinessErrors.length) return fail(readinessErrors.join('；'))
    next.revision += 1
    next.current = cloneRollout(target.config)
    next.pending = null
    next.versions.unshift({
      revision: next.revision,
      config: cloneRollout(target.config),
      reason: `回滚至 v${target.revision}：${reason.trim()}`,
      actor: roles[role],
      at,
    })
    message = `已生成 v${next.revision}；紧急停用仍然保留`
  } else if (type === 'kill' || type === 'resume') {
    if (role !== 'emergency') return fail('仅应急管理员可以停用或恢复')
    const keys = command.keys
    if (
      !Array.isArray(keys) ||
      !keys.length ||
      keys.some(
        (key) =>
          !rolloutCatalog.some((item) => item.key === key && !item.baseline),
      )
    )
      return fail('停用目标无效，基础兜底不可停用')
    for (const key of keys) next.kills[key] = type === 'kill'
    next.pending = null // Review must be based on the current safety state.
    message =
      type === 'kill'
        ? '已紧急停用；基础银行卡保留，待审核快照已失效'
        : '已解除应急覆盖；仍按当前机构状态、已发布规则和本单资格判断，不等于机构开通'
  } else return fail('未知操作')
  next.events.unshift({
    id: state.events.length + 1,
    type,
    actor: roles[role],
    reason: reason.trim(),
    at,
    revision: next.revision,
    targets: command.keys ? [...command.keys] : [],
    changes:
      type === 'submit' ? rolloutChanges(state.current, command.config) : [],
    previousConfig: ['approve', 'rollback'].includes(type)
      ? cloneRollout(state.current)
      : null,
    nextConfig: ['approve', 'rollback'].includes(type)
      ? cloneRollout(next.current)
      : null,
    message,
  })
  return { ok: true, state: next, message }
}
