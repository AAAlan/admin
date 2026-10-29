import { orderFingerprint } from './paymentAvailability.js'

// Illustrative capabilities only; these are not rules of any real PSP or wallet.
export function createAvailabilityDemoTemplate(region = 'domestic') {
  const currency = region === 'domestic' ? 'CNY' : 'USD'
  const country = region === 'domestic' ? 'CN' : 'US'
  const common = {
    enabled: true, currencies: [currency], countries: [country],
    devices: ['web', 'native'], productTypes: ['one_time'],
    minAmount: '0.01', maxAmount: '50000.00'
  }
  const channel = (id, name, overrides = {}) => ({
    ...common, id, name, authorized: true, health: 'available', merchantAccount: 'demo_merchant',
    capabilityVersion: 'cap-demo-v1', updatedAt: '2026-10-28', provider: '虚构支付机构', ...overrides
  })
  return {
    id: `demo_shared_${currency.toLowerCase()}`,
    name: `${currency} 通用商品收银台`, currency, country, version: 1, environment: 'demo',
    enabled: true, published: true, authorized: true, gameId: 'demo_game', sceneId: 'demo_scene',
    methods: [
      { ...common, id: 'wallet_a', name: '钱包 A', description: '小额购买也可使用', maxAmount: '5000.00',
        channels: [channel('wallet_a_main', '钱包 A 渠道', { maxAmount: '5000.00' })] },
      { ...common, id: 'wallet_b', name: '钱包 B', description: '支持网页一次性购买', minAmount: '1.00', maxAmount: '2000.00', devices: ['web'],
        channels: [channel('wallet_b_main', '钱包 B 渠道', { minAmount: '1.00', maxAmount: '2000.00', devices: ['web'] })] },
      { ...common, id: 'card', name: '银行卡', description: '一个入口，按渠道能力判断', productTypes: ['one_time', 'subscription'], countries: [country, 'HK'],
        channels: [
          channel('card_main', '银行卡主渠道', { minAmount: '10.00', productTypes: ['one_time', 'subscription'], countries: [country, 'HK'] }),
          channel('card_backup', '银行卡备用渠道', { minAmount: '5.00', maxAmount: '10000.00', productTypes: ['one_time', 'subscription'], countries: [country, 'HK'] })
        ] },
      { ...common, id: 'installments', name: '分期付款', description: '需满足金额及实名资格', minAmount: '100.00', maxAmount: '3000.00', requiresVerified: true,
        channels: [channel('installments_main', '分期渠道', { minAmount: '100.00', maxAmount: '3000.00', requiresVerified: true })] }
    ]
  }
}

export const availabilityDemoCases = [
  { id: 'small', name: '小额礼包', price: '2.00', discount: '0.00', type: 'one_time', note: '低于银行卡最低金额' },
  { id: 'standard', name: '标准礼包', price: '30.00', discount: '0.00', type: 'one_time', note: '常规金额，三种方式可用' },
  { id: 'discount', name: '优惠礼包', price: '6.00', discount: '4.00', type: 'one_time', note: '标价达标，优惠后不达标' },
  { id: 'multi_channel', name: '渠道边界礼包', price: '6.00', discount: '0.00', type: 'one_time', note: '主渠道不支持，备用可用' },
  { id: 'large', name: '大额礼包', price: '328.00', discount: '0.00', type: 'one_time', note: '满足分期金额要求' },
  { id: 'subscription', name: '自动续费月卡', price: '30.00', discount: '0.00', type: 'subscription', note: '只保留支持订阅的方式' },
  { id: 'mixed', name: '礼包与月卡合并订单', price: '358.00', discount: '0.00', type: 'mixed', note: '同一渠道必须支持整单，不能拼接能力' },
  { id: 'tax', name: '含税边界商品', price: '4.80', discount: '0.00', tax: '0.20', type: 'one_time', note: '含税实付达到备用渠道下限，银行卡可用' },
  { id: 'over_limit', name: '超限额测试商品', price: '60000.00', discount: '0.00', type: 'one_time', note: '所有方式均不可用' },
  { id: 'free', name: '全额优惠商品', price: '6.00', discount: '6.00', type: 'one_time', note: '零元订单不发起支付' }
]

export function createDemoOrder(item = availabilityDemoCases[0], template = createAvailabilityDemoTemplate()) {
  return {
    productName: item.name, productTypes: item.type === 'mixed' ? ['one_time', 'subscription'] : [item.type], price: item.price, discount: item.discount,
    tax: item.tax || '0.00', currency: template.currency, country: template.country, device: 'web', verified: true, paymentState: 'idle',
    gameId: template.gameId, sceneId: template.sceneId, environment: template.environment,
    customerId: 'demo_customer', historyConsent: true
  }
}

export function createDecisionDemoStrategy(template) {
  return { version: 1, mode: 'fixed', baseOrder: template.methods.map(method => method.id), backupEnabled: false,
    showHistoryTag: true, recommendedMethodId: '', defaultPolicy: 'none' }
}

export function createDecisionDemoBackup(region = 'domestic') {
  const template = createAvailabilityDemoTemplate(region)
  template.id += '_fallback'
  template.name = `${template.currency} 已授权备用模板`
  template.methods = template.methods.filter(method => ['wallet_a', 'card'].includes(method.id)).map(method => ({ ...method,
    channels: method.channels.map(channel => ({ ...channel, id: `fallback_${channel.id}`, merchantAccount: 'demo_backup_merchant' })) }))
  return template
}

export function createDecisionDemoHistory(scenario, order, now = Date.now()) {
  const record = (methodId, days) => ({ methodId, paidAt: now - days * 86400000, status: 'succeeded',
    customerId: order.customerId, gameId: order.gameId, sceneId: order.sceneId, currency: order.currency,
    country: order.country, environment: order.environment })
  if (scenario === 'none') return { status: 'ok', records: [] }
  if (scenario === 'unavailable') return { status: 'unavailable', records: [] }
  const records = scenario === 'card' ? [record('card', 1), record('wallet_b', 2)] : [record('wallet_b', 1), record('card', 2)]
  if (scenario === 'expired') records.forEach(item => { item.paidAt = now - 100 * 86400000 })
  if (scenario === 'other_account') records.forEach(item => { item.customerId = 'another_demo_customer' })
  return { status: 'ok', records }
}

export function createDecisionDemoScores(template, order, scenario = 'normal', now = Date.now()) {
  // Keep the same context contract as cashierDecision without importing the orchestrator back into fixtures.
  const contextKey = JSON.stringify([template.id, template.version, orderFingerprint(order)])
  const values = scenario === 'ties' ? { wallet_a: 80, wallet_b: 80, card: 80, installments: 80 }
    : scenario === 'reverse' ? { wallet_a: 99, wallet_b: 90, card: 30, installments: 50 }
      : { wallet_a: 65, wallet_b: 82, card: 94, installments: 75 }
  if (scenario === 'partial') delete values.wallet_b
  return { status: scenario === 'timeout' ? 'timeout' : 'ok', contextKey,
    observedAt: now, expiresAt: scenario === 'expired' ? now - 1 : now + 120000,
    sampleReady: scenario !== 'insufficient', values }
}
