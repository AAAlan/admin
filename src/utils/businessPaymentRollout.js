import {
  templateRuleErrors,
  templateMethodRule,
} from './templatePaymentRollout.js'
import { parseRolloutIds } from './paymentRollout.js'

// Explicit business IDs, independent of PSP, channel account and card brand IDs.
export const businessMethodAliases = {
  card: 'card',
  paypal: 'paypal',
  applepay: 'apple_pay',
  apple_pay: 'apple_pay',
  googlepay: 'google_pay',
  google_pay: 'google_pay',
  klarna: 'klarna',
  dana: 'dana',
  alipay: 'alipay',
  'wechat pay': 'wechat_pay',
  wechatpay: 'wechat_pay',
  wechat_pay: 'wechat_pay',
  mycard: 'mycard',
  doku_wallet: 'doku_wallet',
  paynow: 'paynow',
  paysafecard: 'paysafecard',
}
export const businessMethodIds = new Set(Object.values(businessMethodAliases))
export function businessMethodId(method) {
  if (method.business_method_id) return method.business_method_id
  return (
    businessMethodAliases[
      String(method.pay_name || '')
        .trim()
        .toLowerCase()
    ] || ''
  )
}

export function businessBucket(scope, templateId, methodId, identity) {
  const seed = JSON.stringify([
    'template-business-v2',
    scope.environment,
    scope.region,
    scope.appId,
    templateId,
    methodId,
    identity,
  ])
  let hash = 2166136261
  for (const byte of new TextEncoder().encode(seed))
    hash = Math.imul(hash ^ byte, 16777619) >>> 0
  return hash % 10000
}

export function ruleIsNarrowing(before, after) {
  if (after.mode === 'off') return true
  if (!before || before.mode === 'off') return false
  const coverage = (r) => (r.mode === 'all' ? 100 : r.percentage)
  const subset = (a, b) =>
    !a.length || (b.length > 0 && b.every((v) => a.includes(v)))
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

export function canonicalTemplate(input, scope, templateId) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('模版格式无效')
  if (input.app_id !== scope.appId || input.region !== scope.region)
    throw new Error('模版不属于当前应用或产线')
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(input.cashier_template_name || ''))
    throw new Error('模版名称格式无效')
  if (!/^[A-Z]{3}$/.test(input.currency || ''))
    throw new Error('币种须为三位大写代码')
  if (typeof input.enabled !== 'boolean') throw new Error('模版启用状态无效')
  if (
    !Array.isArray(input.payment_methods) ||
    input.payment_methods.length > 100
  )
    throw new Error('支付条目须为数组，最多 100 条')
  const ids = new Set(),
    groups = new Set()
  const methods = input.payment_methods.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error('支付条目无效')
    const id = businessMethodId(entry)
    if (!businessMethodIds.has(id)) throw new Error('支付方式尚未注册业务 ID')
    if (
      typeof entry.channel_id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,160}$/.test(entry.channel_id)
    )
      throw new Error('渠道 ID 无效')
    const entryId = `${id}::${entry.channel_id}`
    if (ids.has(entryId)) throw new Error('同一业务方式和渠道不可重复')
    if (typeof entry.enabled !== 'boolean')
      throw new Error('渠道条目启用状态无效')
    ids.add(entryId)
    groups.add(id)
    return {
      id: entryId,
      business_method_id: id,
      channel_id: entry.channel_id,
      channel_name: String(entry.channel_name || entry.channel_id).slice(
        0,
        160,
      ),
      pay_name: String(entry.pay_name || id).slice(0, 100),
      enabled: entry.enabled,
      selectedCardBrands: Array.isArray(entry.selectedCardBrands)
        ? entry.selectedCardBrands
            .filter((v) => typeof v === 'string')
            .slice(0, 30)
        : [],
      is_recommended: entry.is_recommended === true,
      recommend_text: String(entry.recommend_text || '').slice(0, 200),
      sort_order: index + 1,
    }
  })
  if (
    !input.rules ||
    typeof input.rules !== 'object' ||
    Array.isArray(input.rules)
  )
    throw new Error('缺少业务支付方式规则')
  if (Object.keys(input.rules).some((id) => !groups.has(id)))
    throw new Error('规则引用了模版外的支付方式')
  const rules = Object.fromEntries(
    [...groups].map((id) => {
      const r = input.rules[id]
      if (
        r &&
        Object.keys(r).some(
          (key) =>
            ![
              'mode',
              'percentage',
              'countries',
              'platforms',
              'allow',
              'deny',
            ].includes(key),
        )
      )
        throw new Error(`${id} 包含不支持的灰度条件`)
      const errors = templateRuleErrors(r, scope.region)
      if (errors.length) throw new Error(`${id}：${errors.join('；')}`)
      return [
        id,
        {
          mode: r.mode,
          percentage: r.percentage,
          countries: [...new Set(r.countries)],
          platforms: [...new Set(r.platforms)],
          allow: parseRolloutIds(r.allow).join('\n'),
          deny: parseRolloutIds(r.deny).join('\n'),
        },
      ]
    }),
  )
  return {
    template_id: templateId,
    app_id: scope.appId,
    region: scope.region,
    environment: scope.environment,
    cashier_template_name: input.cashier_template_name,
    currency: input.currency,
    enabled: input.enabled,
    is_simulator: input.is_simulator === true,
    is_web_cashier: input.is_web_cashier !== false,
    rollout_grain: 'business-method-v2',
    payment_methods: methods,
    rules,
  }
}

// Explicit adapter only: legacy conflicting per-channel rules require an operator to unify them.
export function templateToBusinessDocument(input) {
  const rules = {},
    methods = input.payment_methods.map((entry) => {
      const id = businessMethodId(entry)
      if (!id) throw new Error(`${entry.pay_name} 缺少注册的业务支付方式 ID`)
      const r = templateMethodRule(entry)
      if (
        Object.hasOwn(rules, id) &&
        JSON.stringify(rules[id]) !== JSON.stringify(r)
      )
        throw new Error(
          `${entry.pay_name} 的多个渠道规则不一致，请先统一开放范围`,
        )
      rules[id] = r
      return { ...entry, business_method_id: id }
    })
  return {
    ...input,
    enabled: input.enabled !== false,
    payment_methods: methods,
    rules,
  }
}

export function evaluateBusinessTemplate(
  document,
  scope,
  context,
  { published = true, kills = {}, eligibility = {} } = {},
) {
  const identity =
    typeof context?.userId === 'string' && context.userId.trim()
      ? `user:${context.userId}`
      : typeof context?.sessionId === 'string' && context.sessionId.trim()
        ? `session:${context.sessionId}`
        : ''
  const methods = Object.entries(document.rules).map(([id, r]) => {
    const entries = document.payment_methods.filter(
      (e) => e.business_method_id === id,
    )
    const routes = entries.filter(
      (e) => e.enabled && eligibility[e.id] === true,
    )
    const bucket = identity
      ? businessBucket(scope, document.template_id, id, identity)
      : null
    let code = 'BUCKET_MISS',
      reason = '未命中灰度比例'
    if (!published || document.enabled !== true) {
      code = 'TEMPLATE_INACTIVE'
      reason = '模版未发布或已关闭'
    } else if (kills[id]) {
      code = 'EMERGENCY_STOP'
      reason = '业务支付方式紧急停用'
    } else if (r.mode === 'off') {
      code = 'METHOD_OFF'
      reason = '业务支付方式关闭'
    } else if (
      context.userId &&
      parseRolloutIds(r.deny).includes(context.userId)
    ) {
      code = 'DENY'
      reason = '命中黑名单'
    } else if (!routes.length) {
      code = 'INELIGIBLE'
      reason = '没有已确认合资格的渠道'
    } else if (
      context.currency !== document.currency ||
      !Number.isSafeInteger(context.amountMinor) ||
      context.amountMinor <= 0 ||
      context.riskAllowed !== true
    ) {
      code = 'ORDER_INELIGIBLE'
      reason = '订单币种、金额或风控未通过'
    } else if (!identity) {
      code = 'NO_IDENTITY'
      reason = '缺少稳定身份'
    } else if (r.countries.length && !r.countries.includes(context.country)) {
      code = 'COUNTRY_MISS'
      reason = '非目标国家'
    } else if (r.platforms.length && !r.platforms.includes(context.platform)) {
      code = 'PLATFORM_MISS'
      reason = '非目标用户 platform'
    } else if (
      context.userId &&
      parseRolloutIds(r.allow).includes(context.userId)
    ) {
      code = 'ALLOW'
      reason = '白名单命中'
    } else if (r.mode === 'all') {
      code = 'ALL'
      reason = '条件内全量'
    } else if (bucket < Math.round(r.percentage * 100)) {
      code = 'BUCKET_HIT'
      reason = '稳定灰度命中'
    }
    const hit = ['ALLOW', 'ALL', 'BUCKET_HIT'].includes(code)
    return {
      id,
      name: entries[0]?.pay_name || id,
      bucket,
      code,
      reason,
      hit,
      eligibleChannels: hit
        ? routes.map((e) => ({ id: e.id, channelId: e.channel_id }))
        : [],
    }
  })
  return {
    methods,
    allowedMethods: methods.filter((m) => m.hit),
    empty: !methods.some((m) => m.hit),
  }
}
