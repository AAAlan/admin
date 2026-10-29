// Template-entry rollout prototype. Caller supplies trusted payment eligibility in production.
import { getPlatformOptions } from './platformOptions.js'
import { parseRolloutIds } from './paymentRollout.js'

export function templateMethodEntryId(method) {
  return (
    method.rollout_entry_id ||
    JSON.stringify([
      method.channel_id || '',
      method.payment_method_id || method.id || method.pay_name || '',
    ])
  )
}

export function templateMethodRule(method) {
  if (method.rollout !== undefined)
    return JSON.parse(JSON.stringify(method.rollout))
  return {
    mode: method.enabled === false ? 'off' : 'all',
    percentage: 0,
    countries: [],
    platforms: [],
    allow: '',
    deny: '',
  }
}

export function templateRuleErrors(rule, region = 'overseas') {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule))
    return ['开放范围格式无效']
  const errors = []
  if (!['off', 'gradual', 'all'].includes(rule.mode))
    errors.push('请选择有效开放范围')
  if (
    typeof rule.percentage !== 'number' ||
    !Number.isFinite(rule.percentage) ||
    rule.percentage < 0 ||
    rule.percentage > 100 ||
    Math.abs(rule.percentage * 100 - Math.round(rule.percentage * 100)) > 1e-7
  )
    errors.push('比例须为 0–100，最多两位小数')
  if (
    !Array.isArray(rule.countries) ||
    rule.countries.some((value) => !/^[A-Z]{2}$/.test(value))
  )
    errors.push('国家须为两位大写代码')
  if (
    !Array.isArray(rule.platforms) ||
    rule.platforms.some((value) => !getPlatformOptions(region).includes(value))
  )
    errors.push('用户 platform 无效')
  if (
    typeof rule.allow !== 'string' ||
    typeof rule.deny !== 'string' ||
    parseRolloutIds(rule.allow).length > 100 ||
    parseRolloutIds(rule.deny).length > 100
  )
    errors.push('黑白名单各最多 100 个用户 ID')
  if ('devices' in rule) errors.push('不支持客户端条件，请使用用户 platform')
  return errors
}

export function templateRuleSummary(method) {
  const rule = templateMethodRule(method)
  if (templateRuleErrors(rule).length) return '规则异常'
  if (method.enabled === false || rule?.mode === 'off') return '关闭'
  if (rule?.mode === 'all') return '全量开放'
  if (rule?.mode === 'gradual')
    return Number(rule.percentage) === 0
      ? `仅指定用户 · ${parseRolloutIds(rule.allow).length} 人`
      : `灰度 ${rule.percentage}%`
  return '规则异常'
}

export function templateMethodBucket(template, method, identity) {
  // Versioned namespace prevents collision with the old scene-level feature seed.
  const seed = JSON.stringify([
    'template-method-v1',
    template.region,
    template.environment,
    template.app_id,
    template.template_id,
    templateMethodEntryId(method),
    identity,
  ])
  let hash = 2166136261
  for (const byte of new TextEncoder().encode(seed))
    hash = Math.imul(hash ^ byte, 16777619) >>> 0
  return hash % 10000
}

export function evaluateTemplateMethods(
  template,
  profile,
  { kills = {}, eligibility = {} } = {},
) {
  const methods = Array.isArray(template.payment_methods)
    ? template.payment_methods
    : []
  const counts = new Map()
  methods.forEach((method) =>
    counts.set(
      templateMethodEntryId(method),
      (counts.get(templateMethodEntryId(method)) || 0) + 1,
    ),
  )
  return methods.map((method) => {
    const entryId = templateMethodEntryId(method)
    const rule = templateMethodRule(method)
    const identity = profile.userId
      ? `user:${profile.userId}`
      : profile.sessionId
        ? `session:${profile.sessionId}`
        : ''
    const scopeValid = [
      template.template_id,
      template.app_id,
      template.environment,
      template.region,
    ].every((value) => typeof value === 'string' && value.length > 0)
    const bucket =
      scopeValid && identity
        ? templateMethodBucket(template, method, identity)
        : null
    let code = '',
      reason = ''
    if (
      !scopeValid ||
      !method.channel_id ||
      !(method.payment_method_id || method.id || method.pay_name) ||
      (method.rollout_entry_id !== undefined &&
        (typeof method.rollout_entry_id !== 'string' ||
          !method.rollout_entry_id)) ||
      counts.get(entryId) !== 1 ||
      templateRuleErrors(rule, template.region).length
    ) {
      code = 'INVALID_CONFIG'
      reason = '配置或稳定标识无效'
    } else if (template.enabled !== true || template.published !== true) {
      code = 'TEMPLATE_INACTIVE'
      reason = '模版未发布或已停用'
    } else if (kills[entryId]) {
      code = 'EMERGENCY_STOP'
      reason = '该条目紧急停用'
    } else if (method.enabled === false || rule.mode === 'off') {
      code = 'METHOD_OFF'
      reason = '模版内该方式已关闭'
    } else if (
      profile.userId &&
      parseRolloutIds(rule.deny).includes(profile.userId)
    ) {
      code = 'DENY'
      reason = '命中黑名单'
    } else if (eligibility[entryId] !== true) {
      code = 'INELIGIBLE'
      reason = '机构或本单资格未通过 / 未确认'
    } else if (
      rule.countries.length &&
      !rule.countries.includes(profile.country)
    ) {
      code = 'COUNTRY_MISS'
      reason = '不在目标国家内'
    } else if (
      rule.platforms.length &&
      !rule.platforms.includes(profile.platform)
    ) {
      code = 'PLATFORM_MISS'
      reason = '不在目标用户 platform 内'
    } else if (
      profile.userId &&
      parseRolloutIds(rule.allow).includes(profile.userId)
    ) {
      code = 'ALLOW'
      reason = '白名单放行，未绕过硬资格'
    } else if (!identity) {
      code = 'NO_IDENTITY'
      reason = '缺少稳定用户或会话标识'
    } else if (rule.mode === 'all') {
      code = 'ALL'
      reason = '条件内全量开放'
    } else if (bucket < Math.round(rule.percentage * 100)) {
      code = 'BUCKET_HIT'
      reason = '命中稳定灰度桶'
    } else {
      code = 'BUCKET_MISS'
      reason = '未命中灰度比例'
    }
    return {
      ...method,
      entryId,
      bucket,
      code,
      reason,
      hit: ['ALLOW', 'ALL', 'BUCKET_HIT'].includes(code),
    }
  })
}
