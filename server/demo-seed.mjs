import { canonicalTemplate } from '../src/utils/businessPaymentRollout.js'
import { scopeKey } from './service.mjs'

export const demoScope = {
  environment: 'demo',
  region: 'overseas',
  appId: 'saki',
}
export const demoChannels = new Set([
  'adyen_MerchantAccount_Test123',
  'stripe_acct_1234567890',
  'paypal_merchant_paypal_001',
  'antom_antom_merchant_001',
])
// Independent, explicitly simulated product registry. Not a PSP capability assertion.
export function demoSubchannelReader(scope, channelId, subchannelId) {
  if (
    scope.environment !== demoScope.environment ||
    scope.region !== demoScope.region ||
    scope.appId !== demoScope.appId
  )
    return null
  const entries = [
    ['1', 'adyen_MerchantAccount_Test123', 'card', 'CARD · VISA'],
    ['2', 'adyen_MerchantAccount_Test123', 'card', 'CARD · AMEX'],
    ['3', 'stripe_acct_1234567890', 'card', 'CARD · VISA'],
    ['4', 'stripe_acct_1234567890', 'card', 'CARD · AMEX'],
    ['5', 'paypal_merchant_paypal_001', 'paypal', 'PayPal'],
    ['6', 'antom_antom_merchant_001', 'card', 'CARD · VISA'],
  ]
  const row = entries.find(
    ([id, channel]) => id === subchannelId && channel === channelId,
  )
  return row
    ? {
        subchannel_id: row[0],
        channel_id: row[1],
        business_method_id: row[2],
        name: row[3],
        enabled: true,
        channel_enabled: true,
      }
    : null
}
export const allRule = () => ({
  mode: 'all',
  percentage: 0,
  countries: [],
  platforms: [],
  allow: '',
  deny: '',
})
export function seedDemo(store) {
  for (const suffix of ['main', 'backup']) {
    const id = `demo_usd_${suffix}`
    if (store.get(scopeKey(demoScope), id)) continue
    const doc = canonicalTemplate(
      {
        app_id: 'saki',
        region: 'overseas',
        cashier_template_name: `demo_usd_${suffix}`,
        currency: 'USD',
        enabled: true,
        payment_methods: [
          {
            business_method_id: 'card',
            pay_name: 'CARD',
            channel_id: 'adyen_MerchantAccount_Test123',
            channel_name: 'Adyen',
            enabled: true,
          },
          {
            business_method_id: 'card',
            pay_name: 'CARD',
            channel_id: 'stripe_acct_1234567890',
            channel_name: 'Stripe',
            enabled: true,
          },
          {
            business_method_id: 'paypal',
            pay_name: 'PayPal',
            channel_id: 'paypal_merchant_paypal_001',
            channel_name: 'PayPal',
            enabled: true,
          },
          {
            business_method_id: 'dana',
            pay_name: 'DANA',
            channel_id: 'antom_antom_merchant_001',
            channel_name: 'Antom',
            enabled: true,
          },
        ],
        rules: { card: allRule(), paypal: allRule(), dana: allRule() },
      },
      demoScope,
      id,
    )
    store.transaction(() => {
      store.put(scopeKey(demoScope), {
        template_id: id,
        draft: doc,
        draftRevision: 1,
        published: doc,
        revision: 1,
        pending: null,
        kills: {},
        emergencyEpoch: 0,
      })
      store.version(scopeKey(demoScope), id, 1, doc)
      store.audit(scopeKey(demoScope), id, {
        action: 'seed_demo',
        actor: 'system',
        at: new Date().toISOString(),
        revision: 1,
        note: '明确标注的演示配置，不是机构开通证明',
      })
    })
  }
}
