import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateOrderAmount, createDemoConsultation, evaluateAvailability, toMinorUnits, validateSelection, validateTemplate } from '../src/utils/paymentAvailability.js'
import { availabilityDemoCases, createAvailabilityDemoTemplate, createDemoOrder } from '../src/utils/paymentAvailabilityDemo.js'

const fixture = (id = 'small', region = 'domestic') => {
  const template = createAvailabilityDemoTemplate(region)
  return { template, order: createDemoOrder(availabilityDemoCases.find(item => item.id === id), template) }
}
const availableIds = (template, order) => evaluateAvailability(template, order).availableMethods.map(item => item.id)

test('decimal text is converted exactly to minor units', () => {
  assert.equal(toMinorUnits('0.10'), 10)
  assert.equal(toMinorUnits('001.2'), 120)
  assert.equal(toMinorUnits(' 5 '), 500)
  assert.equal(calculateOrderAmount({ price: '0.10', discount: '0.01' }).payable, 9)
  for (const value of ['', null, undefined, true, [], {}, 'NaN', NaN, Infinity, '-1', '1.001', '1e2', '1,000', '9007199254740992']) {
    assert.equal(toMinorUnits(value), null, `Reject invalid money: ${String(value)}`)
  }
})

for (const [id, expected] of [
  ['small', ['wallet_a', 'wallet_b']],
  ['standard', ['wallet_a', 'wallet_b', 'card']],
  ['discount', ['wallet_a', 'wallet_b']],
  ['multi_channel', ['wallet_a', 'wallet_b', 'card']],
  ['large', ['wallet_a', 'wallet_b', 'card', 'installments']],
  ['subscription', ['card']],
  ['mixed', ['card']], ['tax', ['wallet_a', 'wallet_b', 'card']],
  ['over_limit', []], ['free', []]
]) {
  test(`same template produces expected methods: ${id}`, () => {
    const { template, order } = fixture(id)
    const before = JSON.stringify({ template, order })
    assert.deepEqual(availableIds(template, order), expected)
    assert.equal(JSON.stringify({ template, order }), before, 'Evaluation is non-mutating')
    assert.equal(template.id, 'demo_shared_cny', 'Product does not change the template')
  })
}

for (const [price, expected] of [['4.99', false], ['5.00', true], ['50000.00', true], ['50000.01', false]]) {
  test(`card inclusive channel amount boundary: ${price}`, () => {
    const { template, order } = fixture('standard')
    order.price = price
    assert.equal(availableIds(template, order).includes('card'), expected)
  })
}

test('eligible backup preserves a method without duplicating its display', () => {
  const { template, order } = fixture('multi_channel')
  const result = evaluateAvailability(template, order)
  const card = result.methods.find(item => item.id === 'card')
  assert.equal(card.available, true)
  assert.equal(card.channels[0].available, false)
  assert.equal(card.channels[0].reasons[0].code, 'BELOW_MINIMUM')
  assert.deepEqual(card.eligibleChannels.map(item => item.id), ['card_backup'])
  assert.equal(result.availableMethods.filter(item => item.id === 'card').length, 1)
  template.methods[2].channels[1].health = 'maintenance'
  assert(!availableIds(template, order).includes('card'))
})

test('non-contiguous channel intervals are not combined into one range', () => {
  const { template, order } = fixture('standard')
  template.methods[2].channels[0].minAmount = '5.00'
  template.methods[2].channels[0].maxAmount = '10.00'
  template.methods[2].channels[1].minAmount = '20.00'
  template.methods[2].channels[1].maxAmount = '40.00'
  order.price = '15.00'
  assert(!availableIds(template, order).includes('card'))
})

test('broad business limits cannot override hard channel minimums', () => {
  const { template, order } = fixture()
  template.methods[2].minAmount = '0.00'
  assert(!availableIds(template, order).includes('card'))
})

test('business ranges can further restrict a valid channel amount', () => {
  const { template, order } = fixture('standard')
  template.methods[2].minAmount = '31.00'
  assert(!availableIds(template, order).includes('card'))
  template.methods[2].minAmount = '30.00'
  assert(availableIds(template, order).includes('card'))
  template.methods[2].maxAmount = '30.00'
  assert(availableIds(template, order).includes('card'))
  order.price = '30.01'
  assert(!availableIds(template, order).includes('card'))
})

test('invalid rule ranges block evaluation and confirmation', () => {
  const { template, order } = fixture('standard')
  for (const [min, max] of [['31', '30'], ['invalid', '30'], ['0.001', '30'], ['0', '']]) {
    template.methods[2].minAmount = min
    template.methods[2].maxAmount = max
    assert(validateTemplate(template).length)
    assert.equal(evaluateAvailability(template, order).status, 'invalid_config')
    assert.equal(validateSelection(template, order, 'wallet_a').valid, false)
  }
})

test('invalid order money never generates selectable methods', () => {
  const { template, order } = fixture()
  for (const fields of [{ price: '' }, { price: '-1' }, { price: '2.001' }, { discount: '3' }, { discount: '-1' }, { discount: '' }]) {
    const result = evaluateAvailability(template, { ...order, ...fields })
    assert.equal(result.status, 'invalid_order')
    assert.equal(result.availableMethods.length, 0)
  }
})

test('zero amount is a separate no-payment flow, not no available methods', () => {
  const { template, order } = fixture('free')
  assert.equal(evaluateAvailability(template, order).status, 'zero_amount')
  assert.equal(validateSelection(template, order, 'wallet_a').valid, false)
})

test('all unavailable stays empty without introducing template-external methods', () => {
  const { template, order } = fixture('over_limit')
  const result = evaluateAvailability(template, order)
  assert.equal(result.status, 'no_methods')
  assert.equal(result.methods.length, 4)
  assert(result.methods.every(item => item.reasons.length))
  assert.equal(validateSelection(template, order, 'external_method').valid, false)
})

test('currency mismatch is blocked and is never automatically converted', () => {
  const { template, order } = fixture('standard')
  order.currency = 'USD'
  assert.equal(evaluateAvailability(template, order).status, 'incompatible')
  assert.equal(availableIds(template, order).length, 0)
})

test('unsupported or missing order facts fail closed', () => {
  const { template, order } = fixture()
  for (const fields of [{ currency: '' }, { currency: 'JPY' }, { productTypes: [] }, { productTypes: ['unknown'] }, { productTypes: null }, { country: '' }, { device: '' }]) {
    assert.equal(evaluateAvailability(template, { ...order, ...fields }).status, 'invalid_order')
  }
  assert.equal(availableIds(template, { ...order, country: 'unknown' }).length, 0)
  assert.equal(availableIds(template, { ...order, device: 'unknown' }).length, 0)
})

test('country and device limitations are independent of amount', () => {
  const { template, order } = fixture('standard')
  assert.deepEqual(availableIds(template, { ...order, country: 'HK' }), ['card'])
  assert.deepEqual(availableIds(template, { ...order, device: 'native' }), ['wallet_a', 'card'])
})

test('only methods requiring verification depend on that qualification', () => {
  const { template, order } = fixture('large')
  for (const verified of [false, undefined, null, 'true']) {
    assert.deepEqual(availableIds(template, { ...order, verified }), ['wallet_a', 'wallet_b', 'card'])
  }
})

test('disabled template entry cannot reappear through another enabled channel', () => {
  const { template, order } = fixture('standard')
  template.methods[2].enabled = false
  assert(!availableIds(template, order).includes('card'))
  assert.equal(validateSelection(template, order, 'card').valid, false)
})

for (const [field, value] of [['enabled', false], ['authorized', false], ['authorized', undefined], ['health', 'maintenance'], ['health', 'unknown']]) {
  test(`channel capability is fail-closed: ${field}=${value}`, () => {
    const { template, order } = fixture('multi_channel')
    template.methods[2].channels[1][field] = value
    assert(!availableIds(template, order).includes('card'))
    assert(availableIds(template, order).includes('wallet_a'))
  })
}

test('one channel must support every product type in a mixed order', () => {
  const { template, order } = fixture('standard')
  order.productTypes = ['one_time', 'subscription']
  assert.deepEqual(availableIds(template, order), ['card'])
  template.methods[2].channels[0].productTypes = ['one_time']
  template.methods[2].channels[1].productTypes = ['subscription']
  assert.deepEqual(availableIds(template, order), [], 'Do not stitch capabilities across channels')
})

test('confirmation recalculates from current conditions instead of trusting display', () => {
  const { template, order } = fixture('standard')
  assert.equal(validateSelection(template, order, 'card').valid, true)
  order.discount = '28.00'
  assert.equal(validateSelection(template, order, 'card').valid, false)
  assert.equal(validateSelection(template, order, 'wallet_a').valid, true)
  template.methods[0].channels[0].health = 'maintenance'
  assert.equal(validateSelection(template, order, 'wallet_a').valid, false)
})

test('overseas fixture is an independent USD template, with no domestic mutation', () => {
  const domestic = fixture('standard')
  const overseas = fixture('standard', 'overseas')
  assert.equal(overseas.template.currency, 'USD')
  assert.equal(overseas.order.country, 'US')
  assert.deepEqual(availableIds(overseas.template, overseas.order), ['wallet_a', 'wallet_b', 'card'])
  assert.equal(evaluateAvailability(overseas.template, domestic.order).status, 'incompatible')
  overseas.template.methods[0].enabled = false
  assert.equal(domestic.template.methods[0].enabled, true)
})

test('tax is included in final amount and cannot overflow integer calculation', () => {
  const { template, order } = fixture('tax')
  assert.equal(calculateOrderAmount(order).payable, 500)
  assert(availableIds(template, order).includes('card'))
  for (const tax of ['', '-0.01', '0.001', 'invalid']) {
    assert.equal(evaluateAvailability(template, { ...order, tax }).status, 'invalid_order')
  }
  assert.equal(evaluateAvailability(template, { ...order, price: '90071992547409.91', tax: '0.01' }).status, 'invalid_order')
})

test('qualification is actionable, while amount-ineligible methods remain hidden', () => {
  const { template, order } = fixture('large')
  const result = evaluateAvailability(template, { ...order, verified: false })
  const installments = result.methods.find(item => item.id === 'installments')
  assert.equal(installments.state, 'requires_action')
  assert.equal(installments.visible, true)
  assert.equal(installments.available, false)
  assert.equal(installments.reasons[0].source, 'qualification')
  assert(result.visibleMethods.some(item => item.id === 'installments'))
  assert.equal(validateSelection(template, { ...order, verified: false }, 'installments').valid, false)
  assert.equal(validateSelection(template, { ...order, verified: true }, 'installments').valid, true)
  const small = evaluateAvailability(template, { ...order, price: '2', verified: false })
  assert.equal(small.methods.find(item => item.id === 'installments').state, 'ineligible')
  assert(!small.visibleMethods.some(item => item.id === 'installments'))
})

test('a sole actionable option is not reported as no payment methods', () => {
  const { template, order } = fixture('large')
  template.methods.filter(item => item.id !== 'installments').forEach(item => { item.enabled = false })
  assert.equal(evaluateAvailability(template, { ...order, verified: false }).status, 'action_required')
})

for (const [mode, code] of [['timeout', 'QUERY_FAILED'], ['expired', 'QUERY_EXPIRED'], ['mismatch', 'STALE_ORDER_RESULT']]) {
  test(`query ${mode} is unknown, never a business rejection`, () => {
    const { template, order } = fixture('standard')
    const consultation = createDemoConsultation(template, order, mode, 1000)
    const result = evaluateAvailability(template, order, { consultation, now: 1000 })
    assert.equal(result.status, 'unconfirmed')
    assert.equal(result.availableMethods.length, 0)
    assert.equal(result.methods[0].state, 'unknown')
    assert.equal(result.methods[0].channels[0].rawCode, null, 'Rejected snapshots must not appear as a successful PSP response')
    assert(result.methods[0].channels[0].reasons.some(item => item.code === code && item.source === 'consultation'))
    assert.equal(validateSelection(template, order, 'wallet_a', { consultation, now: 1000 }).valid, false)
  })
}

test('known hard restrictions stay ineligible even when query fails', () => {
  const { template, order } = fixture('over_limit')
  const result = evaluateAvailability(template, order, { consultation: null })
  assert.equal(result.status, 'no_methods')
  assert(result.methods.every(item => item.state === 'ineligible' && !item.visible))
})

test('partial channel query failure preserves independently confirmed methods and backup routes', () => {
  const { template, order } = fixture('standard')
  const consultation = createDemoConsultation(template, order, 'normal', 1000)
  consultation.channels.wallet_a_main.status = 'timeout'
  consultation.channels.card_main.status = 'timeout'
  const result = evaluateAvailability(template, order, { consultation, now: 1000 })
  assert.deepEqual(result.availableMethods.map(item => item.id), ['wallet_b', 'card'])
  assert.equal(result.status, 'ready')
  assert.equal(result.methods[0].state, 'unknown')
  assert.deepEqual(result.methods[2].eligibleChannels.map(item => item.id), ['card_backup'])
})

test('a missing per-channel result is unknown rather than available', () => {
  const { template, order } = fixture('small')
  const consultation = createDemoConsultation(template, order, 'normal', 1000)
  delete consultation.channels.wallet_a_main
  const result = evaluateAvailability(template, order, { consultation, now: 1000 })
  assert.equal(result.methods[0].state, 'unknown')
  assert.deepEqual(result.availableMethods.map(item => item.id), ['wallet_b'])
})

test('successful query is not enough: explicit ineligibility and missing eligibility differ', () => {
  const { template, order } = fixture('small')
  const consultation = createDemoConsultation(template, order, 'normal', 1000)
  consultation.channels.wallet_a_main = { status: 'ok', enabled: false, rawCode: 'DEMO_PROVIDER_RESTRICTION' }
  let result = evaluateAvailability(template, order, { consultation, now: 1000 })
  assert.equal(result.methods[0].state, 'ineligible')
  assert.equal(result.methods[0].channels[0].rawCode, 'DEMO_PROVIDER_RESTRICTION')
  assert(result.methods[0].reasons.some(item => item.code === 'PROVIDER_REJECTED' && !item.message.includes('最低')))
  delete consultation.channels.wallet_a_main.enabled
  result = evaluateAvailability(template, order, { consultation, now: 1000 })
  assert.equal(result.methods[0].state, 'unknown')
})

test('maintenance, unknown and truly ineligible are separate states', () => {
  const { template, order } = fixture('standard')
  for (const method of template.methods) for (const channel of method.channels) channel.health = 'maintenance'
  const maintenance = evaluateAvailability(template, order)
  assert.equal(maintenance.status, 'temporarily_unavailable')
  assert.equal(maintenance.methods[0].state, 'temporarily_unavailable')
  assert(maintenance.methods[0].reasons.some(item => item.rawCode === 'DEMO_SERVICE_DEGRADE'))
  template.methods[0].channels[0].health = 'unknown'
  assert.equal(evaluateAvailability(template, order).status, 'unconfirmed')
  template.methods[0].enabled = false
  assert.equal(evaluateAvailability(template, order).methods[0].state, 'ineligible')
})

test('a live actionable route is preferred over another unknown route', () => {
  const { template, order } = fixture('standard')
  template.methods[2].channels[0].health = 'unknown'
  template.methods[2].channels[1].requiresVerified = true
  assert.equal(evaluateAvailability(template, { ...order, verified: false }).methods[2].state, 'requires_action')
})

test('snapshot expiry boundary and future timestamps are fail-closed', () => {
  const { template, order } = fixture('standard')
  const consultation = createDemoConsultation(template, order, 'normal', 1000)
  assert.equal(validateSelection(template, order, 'card', { consultation, now: consultation.expiresAt - 1 }).valid, true)
  assert.equal(validateSelection(template, order, 'card', { consultation, now: consultation.expiresAt }).valid, false)
  assert.equal(validateSelection(template, order, 'card', { consultation, now: 999 }).valid, false)
})

for (const change of [
  ({ order }) => { order.discount = '1.00' },
  ({ order }) => { order.tax = '1.00' },
  ({ order }) => { order.revision = 2 },
  ({ order }) => { order.productTypes = ['subscription'] },
  ({ template }) => { template.version++ },
  ({ template }) => { template.id = 'other_template' },
  ({ template }) => { template.environment = 'other_environment' },
  ({ template }) => { template.methods[2].channels[0].merchantAccount = 'other_merchant' },
  ({ template }) => { template.methods[2].channels[0].capabilityVersion = 'cap-v2' }
]) {
  test(`changed order/template cannot reuse a previous query: ${change.toString()}`, () => {
    const data = fixture('standard')
    const consultation = createDemoConsultation(data.template, data.order, 'normal', 1000)
    change(data)
    assert.equal(validateSelection(data.template, data.order, 'card', { consultation, now: 1000 }).valid, false)
  })
}

for (const paymentState of ['processing', 'unknown', 'invalid']) {
  test(`no repeat initiation while original payment state=${paymentState}`, () => {
    const { template, order } = fixture('standard')
    const result = validateSelection(template, { ...order, paymentState }, 'card')
    assert.equal(result.valid, false)
    assert(result.error.includes('先查单'))
  })
}
