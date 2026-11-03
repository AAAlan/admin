import { templateRuleErrors } from './templatePaymentRollout.js'
import { parseRolloutIds } from './paymentRollout.js'

export const subchannelFeatureCatalog = {
  paypal_quick: {
    name: 'PayPal 免密支付',
    description: '仅简化已有有效授权钱包的后续主动支付，不免授权或风控验证。',
  },
  card_save: {
    name: '记住卡信息',
    description:
      '统一控制新卡保存和已保存卡复用。保存需用户主动同意，复用需有效授权及 token；关闭不删卡，不影响普通卡支付。',
  },
  card_reuse: {
    name: '使用已保存的卡',
    description:
      '记住卡信息下的复用动作，仅使用属于当前用户的有效授权及 token。',
  },
}
export const subchannelFeatureKeys = (businessId) =>
  businessId === 'paypal'
    ? ['paypal_quick']
    : businessId === 'card'
      ? ['card_save']
      : []
export const closedFeatureRule = () => ({
  mode: 'off',
  percentage: 0,
  countries: [],
  platforms: [],
  allow: '',
  deny: '',
})
export function canonicalFeatureRules(rules, keys, region = 'overseas') {
  if (
    !rules ||
    typeof rules !== 'object' ||
    Array.isArray(rules) ||
    Object.keys(rules).length !== keys.length ||
    Object.keys(rules).some((k) => !keys.includes(k))
  )
    throw new Error('功能规则必须与该子渠道支持的功能一致')
  return Object.fromEntries(
    keys.map((key) => {
      const rule = rules[key]
      const errors = templateRuleErrors(rule, region)
      if (
        rule &&
        Object.keys(rule).some(
          (k) =>
            ![
              'mode',
              'percentage',
              'countries',
              'platforms',
              'allow',
              'deny',
            ].includes(k),
        )
      )
        errors.push('不支持的条件')
      if (errors.length)
        throw new Error(
          `${subchannelFeatureCatalog[key].name}：${errors.join('；')}`,
        )
      return [
        key,
        {
          mode: rule.mode,
          percentage: rule.percentage,
          countries: [...new Set(rule.countries)],
          platforms: [...new Set(rule.platforms)],
          allow: parseRolloutIds(rule.allow).join('\n'),
          deny: parseRolloutIds(rule.deny).join('\n'),
        },
      ]
    }),
  )
}

// Read old snapshots without rewriting them. Only an explicit draft save/release
// replaces separate legacy rules with the single card_save control.
export function editableFeatureDocument(document, region = 'overseas') {
  const legacy =
    document.business_method_id === 'card' &&
    Object.hasOwn(document.rules || {}, 'card_reuse')
  const keys = legacy
    ? ['card_save', 'card_reuse']
    : subchannelFeatureKeys(document.business_method_id)
  const rules = canonicalFeatureRules(document.rules, keys, region)
  return {
    ...document,
    rules: Object.fromEntries(
      subchannelFeatureKeys(document.business_method_id).map((key) => [
        key,
        rules[key],
      ]),
    ),
  }
}

// One operational rule; two execution actions with different hard prerequisites.
// Legacy published snapshots keep their original rules and cohorts until release.
export function subchannelActionRules(document) {
  if (document.rules.card_save && !document.rules.card_reuse)
    return ['card_save', 'card_reuse'].map((key) => ({
      key,
      controlKey: 'card_save',
      rule: document.rules.card_save,
    }))
  return Object.entries(document.rules).map(([key, rule]) => ({
    key,
    controlKey: key,
    rule,
  }))
}
export function subchannelFeatureBucket(scope, resource, feature, userId) {
  const seed = JSON.stringify([
    'subchannel-feature-v1',
    scope.environment,
    scope.region,
    scope.appId,
    resource.channel_id,
    resource.subchannel_id,
    feature,
    `user:${userId}`,
  ])
  let hash = 2166136261
  for (const byte of new TextEncoder().encode(seed))
    hash = Math.imul(hash ^ byte, 16777619) >>> 0
  return hash % 10000
}
export function evaluateSubchannelFeatures(
  document,
  scope,
  profile,
  facts = {},
  { published = true, kills = {} } = {},
) {
  return subchannelActionRules(document).map(({ key, controlKey, rule }) => {
    const userId = typeof profile.userId === 'string' ? profile.userId : ''
    const bucket = userId.trim()
      ? subchannelFeatureBucket(scope, document, controlKey, userId)
      : null
    let code = 'BUCKET_MISS',
      reason = '未命中灰度比例'
    if (!published) {
      code = 'NOT_PUBLISHED'
      reason = '功能尚未发布，使用标准支付'
    } else if (
      kills[key] ||
      kills[controlKey] ||
      (controlKey === 'card_save' && kills.card_reuse)
    ) {
      code = 'EMERGENCY_STOP'
      reason = '功能紧急停用，使用标准支付'
    } else if (rule.mode === 'off') {
      code = 'FEATURE_OFF'
      reason = '功能关闭，使用标准支付'
    } else if (
      !facts.parentAllowed ||
      !facts.channelEnabled ||
      !facts.subchannelEnabled
    ) {
      code = 'PARENT_INACTIVE'
      reason = '模版方式未展示或渠道 / 子渠道不可用'
    } else if (parseRolloutIds(rule.deny).includes(userId)) {
      code = 'DENY'
      reason = '命中黑名单'
    } else if (bucket === null) {
      code = 'LOGIN_REQUIRED'
      reason = '需可信登录用户，不向游客提供保存或复用'
    } else if (
      facts.ready?.[key] !== true ||
      facts.eligibility?.[key] !== true ||
      profile.riskAllowed !== true
    ) {
      code = 'INELIGIBLE'
      reason = '机构产品资格或本单资格未通过'
    } else if (
      key !== 'card_save' &&
      (facts.tokenValid !== true || facts.consentValid !== true)
    ) {
      code = 'AUTHORIZATION_REQUIRED'
      reason = '缺少当前用户有效授权或 token'
    } else if (
      rule.countries.length &&
      !rule.countries.includes(profile.country)
    ) {
      code = 'COUNTRY_MISS'
      reason = '非目标国家'
    } else if (
      rule.platforms.length &&
      !rule.platforms.includes(profile.platform)
    ) {
      code = 'PLATFORM_MISS'
      reason = '非目标用户 platform'
    } else if (parseRolloutIds(rule.allow).includes(userId)) {
      code = 'ALLOW'
      reason = '白名单命中'
    } else if (rule.mode === 'all') {
      code = 'ALL'
      reason = '条件内全量'
    } else if (bucket < Math.round(rule.percentage * 100)) {
      code = 'BUCKET_HIT'
      reason = '稳定灰度命中'
    }
    return {
      key,
      name:
        key === 'card_save'
          ? '记住卡信息 · 新卡保存'
          : key === 'card_reuse'
            ? '记住卡信息 · 已保存卡复用'
            : subchannelFeatureCatalog[key].name,
      bucket,
      hit: ['ALLOW', 'ALL', 'BUCKET_HIT'].includes(code),
      code,
      reason,
    }
  })
}
