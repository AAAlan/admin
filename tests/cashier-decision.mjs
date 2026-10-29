import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemoConsultation } from '../src/utils/paymentAvailability.js'
import { applyRankingLock, createRankingLock, evaluateCashierDecision, validateCashierSelection, validateDecisionStrategy } from '../src/utils/cashierDecision.js'
import { availabilityDemoCases, createAvailabilityDemoTemplate, createDecisionDemoBackup, createDecisionDemoHistory, createDecisionDemoScores, createDecisionDemoStrategy, createDemoOrder } from '../src/utils/paymentAvailabilityDemo.js'

const now = 1800000000000
const ids = result => result.availableMethods.map(method => method.id)
function fixture(caseId = 'large') {
  const template = createAvailabilityDemoTemplate()
  const backup = createDecisionDemoBackup()
  return { templates: [template, backup], order: createDemoOrder(availabilityDemoCases.find(item => item.id === caseId), template),
    strategy: createDecisionDemoStrategy(template), historyScenario: 'none', scoreScenario: 'normal', queryMode: 'normal', now }
}
function input(state) {
  return { ...state, history: createDecisionDemoHistory(state.historyScenario, state.order, now),
    scores: Object.fromEntries(state.templates.map(template => [template.id, createDecisionDemoScores(template, state.order, state.scoreScenario, now)])),
    consultations: Object.fromEntries(state.templates.map(template => [template.id, createDemoConsultation(template, state.order, state.queryMode, now)])) }
}

test('three modes use the same eligible set, and promote at most one successful-history method', () => {
  const state = fixture()
  state.historyScenario = 'wallet_b'
  assert.deepEqual(ids(evaluateCashierDecision(input(state))), ['wallet_a', 'wallet_b', 'card', 'installments'])
  state.strategy.mode = 'preference'
  assert.deepEqual(ids(evaluateCashierDecision(input(state))), ['wallet_b', 'wallet_a', 'card', 'installments'])
  state.strategy.mode = 'data_driven'
  assert.deepEqual(ids(evaluateCashierDecision(input(state))), ['wallet_b', 'card', 'installments', 'wallet_a'])
  state.historyScenario = 'none'
  assert.deepEqual(ids(evaluateCashierDecision(input(state))), ['card', 'wallet_b', 'installments', 'wallet_a'])
})

test('history cannot add an ineligible method; an older eligible success may be used', () => {
  const state = fixture('standard')
  state.historyScenario = 'wallet_b'
  state.strategy.mode = 'preference'
  state.order.device = 'native'
  const result = evaluateCashierDecision(input(state))
  assert.deepEqual(ids(result), ['card', 'wallet_a'])
  assert.equal(result.ranking.preferredMethodId, 'card')
  assert.deepEqual(result.ranking.tags.card, ['曾成功使用'])
  assert(!Object.values(result.ranking.tags).flat().includes('上次成功使用'))
  state.order.price = '2.00'
  assert.deepEqual(ids(evaluateCashierDecision(input(state))), ['wallet_a'])
})

test('malformed history results safely fall back without inventing a historical label', () => {
  const state = fixture('standard')
  state.strategy.mode = 'preference'
  for (const records of [null, {}, 'invalid', [null, {}]]) {
    const request = input(state)
    request.history = { status: 'ok', records }
    const result = evaluateCashierDecision(request)
    assert.equal(result.ranking.effectiveMode, 'fixed')
    assert(Object.values(result.ranking.tags).every(tags => tags.length === 0))
  }
})

test('an empty payable set never enters ranking, recommendation or default selection', () => {
  for (const scenario of ['over_limit', 'large']) {
    const state = fixture(scenario)
    state.strategy.mode = 'data_driven'
    state.strategy.defaultPolicy = 'first'
    state.strategy.recommendedMethodId = 'card'
    if (scenario === 'large') state.queryMode = 'timeout'
    const result = evaluateCashierDecision(input(state))
    assert.equal(result.ranking, null)
    assert.deepEqual(result.availableMethods, [])
    assert.equal(result.evaluatedAt, now)
    assert(result.visibleMethods.every(method => !method.available))
  }
})

test('expired, cross-account, unavailable and absent histories fall back to base order', () => {
  for (const scenario of ['none', 'expired', 'other_account', 'unavailable']) {
    const state = fixture('standard')
    state.strategy.mode = 'preference'
    state.historyScenario = scenario
    const result = evaluateCashierDecision(input(state))
    assert.deepEqual(ids(result), ['wallet_a', 'wallet_b', 'card'], scenario)
    assert.equal(result.ranking.effectiveMode, 'fixed')
  }
})

test('guest, no consent, failed, future and out-of-scope records do not become preference', () => {
  for (const field of ['customerId', 'historyConsent']) {
    const state = fixture('standard')
    state.strategy.mode = 'preference'
    state.historyScenario = 'card'
    state.order[field] = field === 'customerId' ? '' : false
    assert.equal(evaluateCashierDecision(input(state)).ranking.effectiveMode, 'fixed')
  }
  for (const update of [{ status: 'failed' }, { paidAt: now + 1 }, { gameId: 'other' }, { sceneId: 'other' }, { currency: 'USD' }, { country: 'HK' }, { environment: 'production' }]) {
    const state = fixture('standard')
    state.strategy.mode = 'preference'
    const request = input(state)
    request.history = { status: 'ok', records: [{ ...createDecisionDemoHistory('card', state.order, now).records[0], ...update }] }
    assert.equal(evaluateCashierDecision(request).ranking.effectiveMode, 'fixed', JSON.stringify(update))
  }
})

test('whole-score issues fall back to preference, or to base order without history', () => {
  for (const scenario of ['timeout', 'insufficient', 'expired']) {
    const state = fixture('standard')
    state.strategy.mode = 'data_driven'
    state.scoreScenario = scenario
    let result = evaluateCashierDecision(input(state))
    assert.equal(result.ranking.effectiveMode, 'fixed')
    assert(result.ranking.fallbackReason)
    state.historyScenario = 'wallet_b'
    result = evaluateCashierDecision(input(state))
    assert.equal(result.ranking.effectiveMode, 'preference')
    assert.deepEqual(ids(result), ['wallet_b', 'wallet_a', 'card'])
  }
})

test('score snapshots must match order and template, and not come from the future', () => {
  for (const update of [{ contextKey: 'another-order' }, { observedAt: now + 1 }]) {
    const state = fixture('standard')
    state.strategy.mode = 'data_driven'
    const request = input(state)
    Object.assign(request.scores[state.templates[0].id], update)
    assert.equal(evaluateCashierDecision(request).ranking.effectiveMode, 'fixed')
  }
})

test('partial or invalid scores keep their base slot; ties use base order', () => {
  const state = fixture()
  state.strategy.mode = 'data_driven'
  state.scoreScenario = 'partial'
  assert.deepEqual(ids(evaluateCashierDecision(input(state))), ['card', 'wallet_b', 'installments', 'wallet_a'])
  state.scoreScenario = 'ties'
  assert.deepEqual(ids(evaluateCashierDecision(input(state))), ['wallet_a', 'wallet_b', 'card', 'installments'])
  for (const value of [NaN, Infinity, -1, 101, '99']) {
    const request = input(state)
    request.scores[state.templates[0].id].values.wallet_a = value
    assert.equal(ids(evaluateCashierDecision(request))[0], 'wallet_a')
  }
})

test('recommendation, history tag and default selection do not change order', () => {
  const state = fixture('standard')
  state.historyScenario = 'card'
  state.strategy.recommendedMethodId = 'wallet_b'
  state.strategy.defaultPolicy = 'history'
  const result = evaluateCashierDecision(input(state))
  assert.deepEqual(ids(result), ['wallet_a', 'wallet_b', 'card'])
  assert.deepEqual(result.ranking.tags.wallet_b, ['推荐'])
  assert.deepEqual(result.ranking.tags.card, ['上次成功使用'])
  assert.equal(result.ranking.defaultMethodId, 'card')
  state.strategy.showHistoryTag = false
  assert.deepEqual(evaluateCashierDecision(input(state)).ranking.tags.card, [])
  state.order.price = '2.00'
  state.strategy.recommendedMethodId = 'card'
  const small = evaluateCashierDecision(input(state))
  assert.equal(small.ranking.tags.card, undefined)
  assert.equal(small.ranking.defaultMethodId, 'wallet_b', 'Older eligible history is used')
  state.historyScenario = 'none'
  assert.equal(evaluateCashierDecision(input(state)).ranking.defaultMethodId, 'wallet_a')
  state.strategy.defaultPolicy = 'none'
  assert.equal(evaluateCashierDecision(input(state)).ranking.defaultMethodId, '')
})

test('backup is opt-in, evaluated independently, and does not mix templates', () => {
  const state = fixture('standard')
  state.templates[0].methods.forEach(method => method.channels.forEach(channel => { channel.health = 'maintenance' }))
  assert.equal(evaluateCashierDecision(input(state)).status, 'temporarily_unavailable')
  state.strategy.backupEnabled = true
  const result = evaluateCashierDecision(input(state))
  assert.equal(result.selectedTemplate.id, state.templates[1].id)
  assert.deepEqual(ids(result), ['wallet_a', 'card'])
  assert.equal(result.attempts.length, 2)
  assert(result.availableMethods.every(method => method.eligibleChannels.every(channel => channel.id.startsWith('fallback_'))))
  state.templates[0].methods[0].channels[0].health = 'available'
  const primary = evaluateCashierDecision(input(state))
  assert.equal(primary.selectedTemplate.id, state.templates[0].id)
  assert.deepEqual(ids(primary), ['wallet_a'])
})

test('unpublished, unauthorized, disabled and incompatible backup templates are rejected', () => {
  for (const update of [{ enabled: false }, { published: false }, { authorized: false }, { gameId: 'other' }, { sceneId: 'other' }, { currency: 'USD' }, { environment: 'production' }]) {
    const state = fixture('standard')
    state.strategy.backupEnabled = true
    state.templates[0].methods.forEach(method => { method.enabled = false })
    Object.assign(state.templates[1], update)
    const result = evaluateCashierDecision(input(state))
    assert.equal(result.status, 'no_methods')
    assert.equal(result.attempts[1].status, 'incompatible')
    assert.equal(result.availableMethods.length, 0)
  }
})

test('backup never bypasses hard limits and query failures remain unknown', () => {
  const state = fixture('over_limit')
  state.strategy.backupEnabled = true
  assert.equal(evaluateCashierDecision(input(state)).status, 'no_methods')
  state.order.price = '30.00'
  state.queryMode = 'timeout'
  assert.equal(evaluateCashierDecision(input(state)).status, 'unconfirmed')
  // A primary known-empty result cannot mask an uncertain backup result.
  state.templates[0].methods.forEach(method => { method.enabled = false })
  const result = evaluateCashierDecision(input(state))
  assert.equal(result.status, 'unconfirmed')
  assert.equal(result.selectedTemplate.id, state.templates[1].id)
})

test('selection is bound to a template even when backup has the same method ID', () => {
  const state = fixture('standard')
  state.strategy.backupEnabled = true
  const selection = { methodId: 'card', templateId: state.templates[0].id }
  assert.equal(validateCashierSelection(input(state), selection).valid, true)
  state.templates[0].methods.forEach(method => method.channels.forEach(channel => { channel.health = 'maintenance' }))
  const result = validateCashierSelection(input(state), selection)
  assert.equal(result.valid, false)
  assert(result.error.includes('重新确认'))
  selection.templateId = state.templates[1].id
  assert.equal(validateCashierSelection(input(state), selection).valid, true)
})

test('ranking lock freezes only order, tags and explanations, not eligibility', () => {
  const state = fixture('standard')
  state.strategy.mode = 'data_driven'
  const first = evaluateCashierDecision(input(state))
  const lock = createRankingLock(first, state.order, state.strategy)
  state.scoreScenario = 'reverse'
  const updated = evaluateCashierDecision(input(state))
  assert.deepEqual(ids(updated), ['wallet_a', 'wallet_b', 'card'])
  const frozen = applyRankingLock(updated, state.order, state.strategy, lock)
  assert.deepEqual(ids(frozen), ['card', 'wallet_b', 'wallet_a'])
  assert.equal(frozen.ranking.frozen, true)
  assert.equal(frozen.ranking.reasons.card, first.ranking.reasons.card)
  state.templates[0].methods[2].channels.forEach(channel => { channel.enabled = false })
  const lost = evaluateCashierDecision(input(state))
  assert.deepEqual(ids(applyRankingLock(lost, state.order, state.strategy, lock)), ['wallet_a', 'wallet_b'])
  assert.equal(applyRankingLock(lost, state.order, state.strategy, lock).ranking.frozen, false)
})

test('order or strategy version changes invalidate a ranking lock', () => {
  for (const mutate of [state => { state.order.price = '31.00' }, state => { state.strategy.version++ }]) {
    const state = fixture('standard')
    state.strategy.mode = 'data_driven'
    const lock = createRankingLock(evaluateCashierDecision(input(state)), state.order, state.strategy)
    state.scoreScenario = 'reverse'
    mutate(state)
    const result = applyRankingLock(evaluateCashierDecision(input(state)), state.order, state.strategy, lock)
    assert.equal(result.ranking.frozen, false)
    assert.deepEqual(ids(result), ['wallet_a', 'wallet_b', 'card'])
  }
})

test('payment status, query validity and missing query data are rechecked at confirmation', () => {
  const state = fixture('standard')
  const selection = { methodId: 'card', templateId: state.templates[0].id }
  for (const paymentState of ['processing', 'unknown']) {
    state.order.paymentState = paymentState
    const result = validateCashierSelection(input(state), selection)
    assert.equal(result.valid, false)
    assert(result.error.includes('先查单'))
  }
  state.order.paymentState = 'idle'
  for (const mode of ['timeout', 'expired', 'mismatch']) {
    state.queryMode = mode
    assert.equal(validateCashierSelection(input(state), selection).valid, false)
  }
  state.queryMode = 'normal'
  const request = input(state)
  request.now = now + 120001
  assert.equal(validateCashierSelection(request, selection).valid, false)
  delete request.consultations
  assert.equal(validateCashierSelection(request, selection).valid, false)
})

test('zero amount, invalid facts, missing scope and incompatible primary fail before ranking', () => {
  const state = fixture('free')
  assert.equal(evaluateCashierDecision(input(state)).status, 'zero_amount')
  state.order.price = '-1'
  assert.equal(evaluateCashierDecision(input(state)).status, 'invalid_order')
  state.order.price = '30.00'
  state.order.gameId = ''
  assert.equal(evaluateCashierDecision(input(state)).status, 'invalid_order')
  state.order.gameId = 'other_game'
  assert.equal(evaluateCashierDecision(input(state)).status, 'no_template')
})

test('strategy validation rejects unknown modes, default rules and duplicate base IDs', () => {
  const state = fixture()
  assert.deepEqual(validateDecisionStrategy(state.strategy), [])
  state.strategy.mode = 'unknown'
  state.strategy.defaultPolicy = 'unknown'
  state.strategy.baseOrder = ['card', 'card']
  assert.equal(validateDecisionStrategy(state.strategy).length, 3)
  assert.equal(evaluateCashierDecision(input(state)).ranking.effectiveMode, 'fixed')
})
