// Pure, demo-only eligibility evaluation. Production must repeat these checks
// with server-owned order facts, published capabilities and current channel state.
export function toMinorUnits(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const amount = Number(`${whole}${fraction.padEnd(2, '0')}`)
  return Number.isSafeInteger(amount) ? amount : null
}

export function formatAmount(minor, currency = 'CNY') {
  if (!Number.isSafeInteger(minor)) return '—'
  return `${currency === 'CNY' ? '¥' : '$'}${(minor / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function calculateOrderAmount(order) {
  const price = toMinorUnits(order.price)
  const discount = toMinorUnits(order.discount)
  const tax = toMinorUnits(order.tax ?? '0.00')
  const errors = []
  if (price === null) errors.push('商品定价须为非负金额，最多两位小数，且不能超过安全计算范围。')
  if (discount === null) errors.push('优惠金额须为非负金额，最多两位小数，且不能超过安全计算范围。')
  if (tax === null) errors.push('税费须为非负金额，最多两位小数，且不能超过安全计算范围。')
  if (price !== null && discount !== null && discount > price) errors.push('优惠金额不能大于商品定价。')
  const payable = price - discount + tax
  if (!errors.length && !Number.isSafeInteger(payable)) errors.push('实付金额超过安全计算范围。')
  return { price, discount, tax, payable: errors.length ? null : payable, errors }
}

export function validateTemplate(template) {
  const errors = []
  if (!['CNY', 'USD'].includes(template.currency)) errors.push('Demo 仅支持 CNY、USD 两位小数币种。')
  const methodIds = new Set()
  for (const method of template.methods) {
    if (methodIds.has(method.id)) errors.push(`支付方式标识重复：${method.id}`)
    methodIds.add(method.id)
    const paths = [{ ...method, name: `${method.name}业务限制` }, ...method.channels]
    for (const path of paths) {
      const min = toMinorUnits(path.minAmount)
      const max = toMinorUnits(path.maxAmount)
      if (min === null || max === null || min > max) {
        errors.push(`${path.name}：请输入有效金额范围，最低金额不能高于最高金额。`)
      }
    }
  }
  return errors
}

export const availabilityStates = {
  available: '可用', ineligible: '本单不适用', requires_action: '待满足条件',
  temporarily_unavailable: '暂时不可用', unknown: '未能确认'
}

export const reasonSources = {
  business: '模板业务限制', capability: '渠道硬性能力', qualification: '用户资格',
  runtime: '渠道实时状态', consultation: '机构查询（模拟）', decision: '渠道汇总判断'
}

function reason(code, message, entity, source, state = 'ineligible', rawCode = null) {
  return { code, message, state, source, rawCode, entityId: entity.id,
    sourceVersion: entity.capabilityVersion || entity.version || '—', updatedAt: entity.updatedAt || '—' }
}

function checkConditions(entity, order, payable, currency, isChannel = false) {
  const reasons = []
  const source = isChannel ? 'capability' : 'business'
  const add = (code, message, state = 'ineligible', origin = source, rawCode = null) => reasons.push(reason(code, message, entity, origin, state, rawCode))
  if (entity.enabled !== true) add('DISABLED', isChannel ? '渠道已停用' : '模板内已关闭')
  if (isChannel && entity.authorized !== true) add('UNAUTHORIZED', '渠道未获商户授权')
  if (!entity.currencies?.includes(order.currency)) add('CURRENCY_UNSUPPORTED', '不支持订单币种')
  if (!entity.countries?.includes(order.country)) add('COUNTRY_UNSUPPORTED', '不支持当前交易地区')
  if (!entity.devices?.includes(order.device)) add('DEVICE_UNSUPPORTED', '不支持当前支付环境')
  if (!order.productTypes.every(type => entity.productTypes?.includes(type))) add('PRODUCT_UNSUPPORTED', '不支持整单商品的支付属性')
  if (entity.requiresVerified && order.verified !== true) add('VERIFICATION_REQUIRED', '完成实名资格确认后可继续', 'requires_action', 'qualification')
  const min = toMinorUnits(entity.minAmount)
  const max = toMinorUnits(entity.maxAmount)
  if (payable < min) add('BELOW_MINIMUM', `实付低于最低支付金额 ${formatAmount(min, currency)}`)
  if (payable > max) add('ABOVE_MAXIMUM', `实付超过最高支付金额 ${formatAmount(max, currency)}`)
  if (isChannel && entity.health !== 'available') {
    if (entity.health === 'maintenance') add('SERVICE_DEGRADE', '渠道维护中', 'temporarily_unavailable', 'runtime', 'DEMO_SERVICE_DEGRADE')
    else if (entity.health === 'restricted') add('PROVIDER_REJECTED', '机构明确返回本单不支持，未提供具体业务原因', 'ineligible', 'consultation', 'DEMO_PROVIDER_RESTRICTION')
    else add(entity.health === 'timeout' ? 'QUERY_TIMEOUT' : 'CHANNEL_STATE_UNKNOWN', entity.health === 'timeout' ? '渠道查询超时，未能确认' : '渠道状态未确认', 'unknown', 'consultation')
  }
  return reasons
}

export function orderFingerprint(order) {
  return JSON.stringify([order.revision || 0, order.productName, order.productTypes, order.price, order.discount,
    order.tax ?? '0.00', order.currency, order.country, order.device, order.verified,
    order.gameId, order.sceneId, order.environment, order.customerId, order.historyConsent])
}

function capabilityFingerprint(template) {
  return JSON.stringify([template.environment, template.methods.flatMap(method => method.channels.map(channel =>
    [channel.id, channel.merchantAccount, channel.provider, channel.capabilityVersion]))])
}

// An explicit offline fixture, NOT a Stripe/Adyen/Antom response or a real network call.
export function createDemoConsultation(template, order, mode = 'normal', now = Date.now()) {
  return {
    id: `demo_query_${now}`, source: '本地机构查询模拟器', templateId: template.id, ruleVersion: template.version,
    capabilityFingerprint: capabilityFingerprint(template),
    orderFingerprint: mode === 'mismatch' ? 'previous-order' : orderFingerprint(order),
    observedAt: now, expiresAt: mode === 'expired' ? now - 1 : now + 120000,
    status: mode === 'timeout' ? 'timeout' : 'ok',
    channels: Object.fromEntries(template.methods.flatMap(method => method.channels.map(channel => [channel.id, {
      status: ['unknown', 'timeout'].includes(channel.health) ? 'timeout' : 'ok',
      enabled: channel.health !== 'restricted',
      rawCode: channel.health === 'maintenance' ? 'DEMO_SERVICE_DEGRADE' : channel.health === 'restricted' ? 'DEMO_PROVIDER_RESTRICTION' : 'DEMO_OK'
    }])))
  }
}

function consultationReason(template, order, consultation, channel, now) {
  const add = (code, message) => reason(code, message, channel, 'consultation', 'unknown')
  if (!consultation || consultation.status !== 'ok') return add('QUERY_FAILED', '机构查询失败，无法确认可用性')
  if (consultation.templateId !== template.id || consultation.ruleVersion !== template.version || consultation.orderFingerprint !== orderFingerprint(order) || consultation.capabilityFingerprint !== capabilityFingerprint(template)) return add('STALE_ORDER_RESULT', '查询结果与当前订单、规则、商户或能力版本不匹配，已丢弃')
  if (!Number.isFinite(consultation.observedAt) || !Number.isFinite(consultation.expiresAt) || consultation.observedAt > now || consultation.expiresAt <= now) return add('QUERY_EXPIRED', '查询结果已过期或时间无效，需重新查询')
  const option = consultation.channels?.[channel.id]
  if (option?.status !== 'ok') return add('CHANNEL_QUERY_FAILED', '该渠道查询未成功，无法确认可用性')
  if (typeof option.enabled !== 'boolean') return add('MISSING_ELIGIBILITY_RESULT', '该渠道未提供适用结论，无法确认可用性')
  if (!option.enabled) return reason('PROVIDER_REJECTED', '机构明确返回本单不支持，未提供具体业务原因', channel, 'consultation', 'ineligible', option.rawCode || null)
  return null
}

function stateOf(reasons) {
  return ['ineligible', 'unknown', 'temporarily_unavailable', 'requires_action'].find(state => reasons.some(item => item.state === state)) || 'available'
}

export function validateOrderFacts(order, amount = calculateOrderAmount(order)) {
  const errors = [...amount.errors]
  if (!['CNY', 'USD'].includes(order.currency)) errors.push('请选择有效的订单币种。')
  if (!order.country || !order.device || !Array.isArray(order.productTypes) || !order.productTypes.length || order.productTypes.some(type => !['one_time', 'subscription'].includes(type))) errors.push('缺少或无法确认商品类型、交易地区或支付环境。')
  return errors
}

export function evaluateAvailability(template, order, context = {}) {
  const amount = calculateOrderAmount(order)
  const configurationErrors = validateTemplate(template)
  const now = context.now ?? Date.now()
  // Static fixture evaluation remains useful in unit tests; the rendered demo always passes a query snapshot.
  const hasConsultation = Object.prototype.hasOwnProperty.call(context, 'consultation')
  const base = { amount, methods: [], availableMethods: [], visibleMethods: [], errors: [], status: 'ready',
    ruleVersion: template.version, query: hasConsultation ? context.consultation : null }
  if (configurationErrors.length) return { ...base, status: 'invalid_config', errors: configurationErrors }
  const errors = validateOrderFacts(order, amount)
  if (errors.length) return { ...base, status: 'invalid_order', errors }
  if (order.currency !== template.currency) return { ...base, status: 'incompatible', errors: ['订单币种与模板币种不一致，不能跨币种套用或自动换币。'] }
  if (amount.payable === 0) return { ...base, status: 'zero_amount', errors: ['本单实付为 0，无需发起支付；应进入业务侧的零元订单流程。'] }
  const methods = template.methods.map(method => {
    const businessReasons = checkConditions({ ...method, version: template.version }, order, amount.payable, template.currency)
    const channels = method.channels.map(channel => {
      const channelReasons = checkConditions(channel, order, amount.payable, template.currency, true)
      let queryReason = null
      if (hasConsultation) {
        queryReason = consultationReason(template, order, context.consultation, channel, now)
        if (queryReason && !channelReasons.some(item => item.code === queryReason.code && item.source === queryReason.source)) channelReasons.push(queryReason)
      }
      const state = stateOf(channelReasons)
      return { ...channel, reasons: channelReasons, state, available: state === 'available',
        rawCode: hasConsultation && queryReason?.state !== 'unknown' ? context.consultation?.channels?.[channel.id]?.rawCode || null : null }
    })
    const eligibleChannels = channels.filter(channel => channel.available)
    const pathState = ['available', 'requires_action', 'unknown', 'temporarily_unavailable', 'ineligible'].find(state => channels.some(channel => channel.state === state)) || 'ineligible'
    const reasons = [...businessReasons]
    if (pathState !== 'available') {
      for (const channel of channels.filter(item => item.state === pathState)) {
        reasons.push(...channel.reasons.filter(item => item.state === pathState))
      }
      reasons.push(reason('NO_ELIGIBLE_CHANNEL', '暂无可直接发起支付的渠道，详见渠道判断', { ...method, version: template.version }, 'decision', pathState))
    }
    const state = stateOf(reasons)
    return { ...method, reasons, channels, eligibleChannels, state, available: state === 'available',
      userMessage: ({ requires_action: '请先完成实名资格确认', temporarily_unavailable: '服务暂时不可用，请稍后重试', unknown: '暂时无法确认，请重试' })[state] || '',
      visible: state !== 'ineligible' }
  })
  const availableMethods = methods.filter(method => method.available)
  const status = availableMethods.length ? 'ready' : methods.some(item => item.state === 'unknown') ? 'unconfirmed'
    : methods.some(item => item.state === 'requires_action') ? 'action_required'
      : methods.some(item => item.state === 'temporarily_unavailable') ? 'temporarily_unavailable' : 'no_methods'
  return { ...base, methods, availableMethods, visibleMethods: methods.filter(method => method.visible), status }
}

export function validateSelection(template, order, methodId, context = {}) {
  const decision = evaluateAvailability(template, order, context)
  const method = decision.availableMethods.find(item => item.id === methodId)
  const paymentBlocked = order.paymentState !== undefined && order.paymentState !== 'idle'
  return { decision, method: method || null, valid: decision.status === 'ready' && !!method && !paymentBlocked,
    error: paymentBlocked ? '原笔支付处理中或结果未明，请先查单，不得切换渠道重复扣款。' : '' }
}
