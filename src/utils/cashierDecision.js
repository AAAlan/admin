// Offline product demo orchestration. No real PSP, identity service, model or payment request.
import { calculateOrderAmount, evaluateAvailability, orderFingerprint, validateOrderFacts, validateSelection } from './paymentAvailability.js'

export const sortingModeNames = { fixed: '固定排序', preference: '用户偏好排序', data_driven: '数据驱动排序' }
export const defaultPolicyNames = { none: '不默认选中', first: '第一可用项', history: '最近可用的成功历史方式优先，无记录回第一可用项' }

export function validateDecisionStrategy(strategy) {
  const errors = []
  if (!Object.hasOwn(sortingModeNames, strategy.mode)) errors.push('请选择有效的排序模式。')
  if (!Object.hasOwn(defaultPolicyNames, strategy.defaultPolicy)) errors.push('请选择有效的默认选中规则。')
  if (!Array.isArray(strategy.baseOrder) || new Set(strategy.baseOrder).size !== strategy.baseOrder.length) errors.push('基础顺序不能包含重复方式。')
  return errors
}

export function decisionContextKey(template, order) {
  return JSON.stringify([template.id, template.version, orderFingerprint(order)])
}

function isCompatible(template, order) {
  return template.enabled === true && template.published === true && template.authorized === true &&
    template.currency === order.currency && template.gameId === order.gameId &&
    template.sceneId === order.sceneId && template.environment === order.environment
}

function findHistory(methods, order, history, now) {
  if (!order.customerId || order.historyConsent !== true || history?.status !== 'ok' || !Array.isArray(history.records)) return { latest: null, preferred: null }
  const eligible = new Set(methods.map(method => method.id))
  const records = history.records.filter(record => record && record.status === 'succeeded' &&
    record.customerId === order.customerId && record.gameId === order.gameId && record.sceneId === order.sceneId &&
    record.currency === order.currency && record.country === order.country && record.environment === order.environment &&
    Number.isFinite(record.paidAt) && record.paidAt <= now && now - record.paidAt <= 90 * 86400000)
    .sort((a, b) => b.paidAt - a.paidAt)
  return { latest: records[0] || null, preferred: records.find(record => eligible.has(record.methodId)) || null }
}

function scoreIssue(snapshot, template, order, now) {
  if (!snapshot || snapshot.status !== 'ok') return '评分服务异常'
  if (snapshot.contextKey !== decisionContextKey(template, order)) return '评分不匹配当前订单或模板'
  if (!Number.isFinite(snapshot.observedAt) || !Number.isFinite(snapshot.expiresAt) || snapshot.observedAt > now || snapshot.expiresAt <= now) return '评分结果过期或时间无效'
  if (snapshot.sampleReady !== true) return '整体样本不足'
  return ''
}

export function rankAvailableMethods(template, order, availableMethods, strategy, history, snapshot, now) {
  const configured = Array.isArray(strategy.baseOrder) ? strategy.baseOrder : []
  const baseOrder = [...new Set([...configured, ...template.methods.map(method => method.id)])]
  const base = [...availableMethods].sort((a, b) => baseOrder.indexOf(a.id) - baseOrder.indexOf(b.id))
  const { latest, preferred } = findHistory(base, order, history, now)
  const errors = validateDecisionStrategy(strategy)
  const requestedMode = errors.length ? 'fixed' : strategy.mode
  const dataIssue = requestedMode === 'data_driven' ? scoreIssue(snapshot, template, order, now) : ''
  let effectiveMode = requestedMode
  let fallbackReason = errors.length ? '策略异常，使用基础顺序' : ''
  if (dataIssue) {
    effectiveMode = preferred ? 'preference' : 'fixed'
    fallbackReason = `${dataIssue}，回${preferred ? '用户偏好排序' : '基础顺序'}`
  }
  if (effectiveMode === 'preference' && !preferred) {
    effectiveMode = 'fixed'
    fallbackReason = fallbackReason || '没有本单可用的有效成功历史，回基础顺序'
  }
  const pinned = effectiveMode !== 'fixed' && preferred ? base.find(method => method.id === preferred.methodId) : null
  let rest = base.filter(method => method.id !== pinned?.id)
  const trustedScore = method => typeof snapshot?.values?.[method.id] === 'number' && Number.isFinite(snapshot.values[method.id]) && snapshot.values[method.id] >= 0 && snapshot.values[method.id] <= 100
  if (effectiveMode === 'data_driven') {
    const sortable = rest.filter(trustedScore).sort((a, b) => snapshot.values[b.id] - snapshot.values[a.id] || baseOrder.indexOf(a.id) - baseOrder.indexOf(b.id))
    let index = 0
    // Missing-score methods keep their approved slots; only trustworthy positions are permuted.
    rest = rest.map(method => trustedScore(method) ? sortable[index++] : method)
  }
  const ordered = pinned ? [pinned, ...rest] : rest
  const reasons = Object.fromEntries(ordered.map(method => [method.id, method.id === pinned?.id ? '本单仍可用的成功历史方式提前，最多保留一项' :
    effectiveMode === 'data_driven' ? trustedScore(method) ? `本地示例评分 ${snapshot.values[method.id]}；同分按基础顺序` : '缺少可信评分，保留基础位置' : '沿用模板基础顺序']))
  const tags = Object.fromEntries(ordered.map(method => [method.id, [
    ...(strategy.recommendedMethodId === method.id ? ['推荐'] : []),
    ...(strategy.showHistoryTag && preferred?.methodId === method.id ? [latest?.methodId === method.id ? '上次成功使用' : '曾成功使用'] : [])
  ]]))
  const defaultMethodId = strategy.defaultPolicy === 'first' ? ordered[0]?.id || '' : strategy.defaultPolicy === 'history' ? preferred?.methodId || ordered[0]?.id || '' : ''
  return { methods: ordered, requestedMode: strategy.mode, effectiveMode, fallbackReason, preferredMethodId: preferred?.methodId || '',
    reasons, tags, defaultMethodId, frozen: false, scoreStatus: dataIssue || (requestedMode === 'data_driven' ? '使用本地示例评分，不代表真实预测' : '本模式不使用评分') }
}

export function evaluateCashierDecision({ templates, order, strategy, history, scores = {}, consultations = {}, now = Date.now() }) {
  const amount = calculateOrderAmount(order)
  const blank = { amount, status: 'no_template', errors: ['没有已授权且兼容的演示模板。'], methods: [], availableMethods: [], visibleMethods: [],
    selectedTemplate: null, attempts: [], ranking: null, ruleVersion: null, evaluatedAt: now }
  const errors = validateOrderFacts(order, amount)
  if (errors.length) return { ...blank, status: 'invalid_order', errors }
  if (!order.gameId || !order.sceneId || !order.environment) return { ...blank, status: 'invalid_order', errors: ['缺少可信游戏、场景或环境信息。'] }
  if (amount.payable === 0) return { ...blank, status: 'zero_amount', errors: ['本单无需发起支付，进入零元订单流程。'] }
  const attempts = []
  const candidates = strategy.backupEnabled ? templates : templates.slice(0, 1)
  let selected = null
  let selectedTemplate = null
  const importance = { unconfirmed: 4, action_required: 3, temporarily_unavailable: 2, no_methods: 1, invalid_config: 0 }
  for (const template of candidates) {
    if (!isCompatible(template, order)) {
      attempts.push({ id: template.id, name: template.name, status: 'incompatible', count: 0, message: '模板未启用、未发布、未授权，或业务 / 币种 / 环境不兼容' })
      continue
    }
    const result = evaluateAvailability(template, order, { consultation: consultations[template.id], now })
    attempts.push({ id: template.id, name: template.name, status: result.status, count: result.availableMethods.length, message: result.errors.join(' ') })
    if (['invalid_order', 'zero_amount'].includes(result.status)) return { ...blank, ...result, selectedTemplate: template, attempts }
    if (!selected || (importance[result.status] ?? -1) > (importance[selected.status] ?? -1)) {
      selected = result
      selectedTemplate = template
    }
    if (result.availableMethods.length) { selected = result; selectedTemplate = template; break }
  }
  if (!selected) return { ...blank, attempts }
  if (!selected.availableMethods.length) return { ...selected, selectedTemplate, attempts, ranking: null, evaluatedAt: now }
  const ranking = rankAvailableMethods(selectedTemplate, order, selected.availableMethods, strategy, history, scores[selectedTemplate.id], now)
  return { ...selected, selectedTemplate, attempts, ranking, evaluatedAt: now, availableMethods: ranking.methods,
    visibleMethods: [...ranking.methods, ...selected.visibleMethods.filter(method => !method.available)] }
}

export function decisionEligibilityKey(result, order, strategy) {
  return JSON.stringify([result.selectedTemplate?.id, result.ruleVersion, strategy.version, orderFingerprint(order),
    result.methods.map(method => [method.id, method.state, method.eligibleChannels.map(channel => channel.id)])])
}

export function createRankingLock(result, order, strategy) {
  return { key: decisionEligibilityKey(result, order, strategy), ids: result.availableMethods.map(method => method.id), ranking: result.ranking }
}

export function applyRankingLock(result, order, strategy, lock) {
  if (!lock || !result.ranking || lock.key !== decisionEligibilityKey(result, order, strategy)) return result
  const availableMethods = lock.ids.map(id => result.availableMethods.find(method => method.id === id)).filter(Boolean)
  return { ...result, availableMethods, visibleMethods: [...availableMethods, ...result.visibleMethods.filter(method => !method.available)],
    ranking: { ...lock.ranking, methods: availableMethods, frozen: true } }
}

export function validateCashierSelection(input, selection) {
  const decision = evaluateCashierDecision(input)
  if (input.order.paymentState !== 'idle') return { valid: false, decision, method: null, error: '原笔支付处理中或结果未知，请先查单，不得重复发起。' }
  if (!decision.selectedTemplate || decision.selectedTemplate.id !== selection.templateId) return { valid: false, decision, method: null, error: '所选方式所属模板已变化，请重新确认，不能静默切换收款路径。' }
  const result = validateSelection(decision.selectedTemplate, input.order, selection.methodId, { consultation: input.consultations?.[selection.templateId], now: input.now ?? Date.now() })
  return { ...result, decision, error: result.valid ? '' : '本单条件或查询结果已失效，请重新决策并确认。' }
}
