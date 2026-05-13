// Mock数据服务

import {
  paymentSortRowKey,
  buildPublicTemplateIdMap,
  attachPublicTemplateIds,
  getCashierPublicTemplateId
} from '../utils/cashierPublicTemplateId.js'

// 游戏列表Mock数据（单游戏 Silver：Game id / 游戏名均为 Silver，应用以 app_id 区分）
export const mockGames = [
  {
    id: 1,
    sdk_app_id: 'Silver',
    game_name: 'Silver',
    apps: [
      {
        app_id: 'saki_US',
        app_name: 'Silver - US',
        game_name: 'Silver',
        platform: 'store_en',
        server_node: 'US',
        region: 'US',
        country_code: 'US',
        pay_switch: true,
        create_time: '2024-01-01 10:00:00'
      },
      {
        app_id: 'saki_CN',
        app_name: 'Silver - CN',
        game_name: 'Silver',
        platform: 'store_cn',
        server_node: 'CN',
        region: 'CN',
        country_code: 'CN',
        pay_switch: true,
        create_time: '2024-01-02 10:00:00'
      },
      {
        app_id: 'saki_JP',
        app_name: 'Silver - JP',
        game_name: 'Silver',
        platform: 'store_jp',
        server_node: 'JP',
        region: 'JP',
        country_code: 'JP',
        pay_switch: true,
        create_time: '2024-01-03 10:00:00'
      },
      {
        app_id: 'saki_KR',
        app_name: 'Silver - KR',
        game_name: 'Silver',
        platform: 'store_kr',
        server_node: 'KR',
        region: 'KR',
        country_code: 'KR',
        pay_switch: true,
        create_time: '2024-01-04 10:00:00'
      },
      {
        app_id: 'game2_US',
        app_name: 'Silver - US (game2)',
        game_name: 'Silver',
        platform: 'store_en',
        server_node: 'US',
        region: 'US',
        country_code: 'US',
        pay_switch: false,
        create_time: '2024-01-05 10:00:00'
      },
      {
        app_id: 'game2_EU',
        app_name: 'Silver - EU (game2)',
        game_name: 'Silver',
        platform: 'store_en',
        server_node: 'EU',
        region: 'EU',
        country_code: 'EU',
        pay_switch: true,
        create_time: '2024-01-06 10:00:00'
      },
      {
        app_id: 'game3_CN',
        app_name: 'Silver - CN (game3)',
        game_name: 'Silver',
        platform: 'store_cn',
        server_node: 'CN',
        region: 'CN',
        country_code: 'CN',
        pay_switch: true,
        create_time: '2024-01-07 10:00:00'
      }
    ]
  }
]

// 应用列表Mock数据（扁平化）
export const mockApps = [
  {
    app_id: 'saki_US',
    app_name: 'Silver - US',
    game_name: 'Silver',
    platform: 'store_en',
    server_node: 'US',
    region: 'US',
    country_code: 'US',
    pay_switch: true,
    create_time: '2024-01-01 10:00:00'
  },
  {
    app_id: 'saki_CN',
    app_name: 'Silver - CN',
    game_name: 'Silver',
    platform: 'store_cn',
    server_node: 'CN',
    region: 'CN',
    country_code: 'CN',
    pay_switch: true,
    create_time: '2024-01-02 10:00:00'
  },
  {
    app_id: 'saki_JP',
    app_name: 'Silver - JP',
    game_name: 'Silver',
    platform: 'store_jp',
    server_node: 'JP',
    region: 'JP',
    country_code: 'JP',
    pay_switch: true,
    create_time: '2024-01-03 10:00:00'
  },
  {
    app_id: 'saki_KR',
    app_name: 'Silver - KR',
    game_name: 'Silver',
    platform: 'store_kr',
    server_node: 'KR',
    region: 'KR',
    country_code: 'KR',
    pay_switch: true,
    create_time: '2024-01-04 10:00:00'
  },
  {
    app_id: 'game2_US',
    app_name: 'Silver - US (game2)',
    game_name: 'Silver',
    platform: 'store_en',
    server_node: 'US',
    region: 'US',
    country_code: 'US',
    pay_switch: false,
    create_time: '2024-01-05 10:00:00'
  },
  {
    app_id: 'game2_EU',
    app_name: 'Silver - EU (game2)',
    game_name: 'Silver',
    platform: 'store_en',
    server_node: 'EU',
    region: 'EU',
    country_code: 'EU',
    pay_switch: true,
    create_time: '2024-01-06 10:00:00'
  },
  {
    app_id: 'game3_CN',
    app_name: 'Silver - CN (game3)',
    game_name: 'Silver',
    platform: 'store_cn',
    server_node: 'CN',
    region: 'CN',
    country_code: 'CN',
    pay_switch: true,
    create_time: '2024-01-07 10:00:00'
  }
]

// 商品列表Mock数据
export const mockGoods = [
  // Silver · US 商品
  {
    id: 1,
    app_id: 'saki_US',
    name: '100 Coins',
    game_product_id: 'coin_100',
    price: 9.99,
    currency: 'USD',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-01 10:00:00'
  },
  {
    id: 2,
    app_id: 'saki_US',
    name: '500 Coins',
    game_product_id: 'coin_500',
    price: 49.99,
    currency: 'USD',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-01 10:00:00'
  },
  {
    id: 3,
    app_id: 'saki_US',
    name: '1000 Coins',
    game_product_id: 'coin_1000',
    price: 99.99,
    currency: 'USD',
    status: 0,
    goods_type: 1,
    create_time: '2024-01-01 10:00:00'
  },
  {
    id: 4,
    app_id: 'saki_US',
    name: '2000 Coins',
    game_product_id: 'coin_2000',
    price: 189.99,
    currency: 'USD',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-02 10:00:00'
  },
  {
    id: 5,
    app_id: 'saki_US',
    name: '5000 Coins',
    game_product_id: 'coin_5000',
    price: 449.99,
    currency: 'USD',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-02 10:00:00'
  },
  // Silver · CN 商品
  {
    id: 6,
    app_id: 'saki_CN',
    name: '100 金币',
    game_product_id: 'coin_100',
    price: 68.00,
    currency: 'CNY',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-03 10:00:00'
  },
  {
    id: 7,
    app_id: 'saki_CN',
    name: '500 金币',
    game_product_id: 'coin_500',
    price: 328.00,
    currency: 'CNY',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-03 10:00:00'
  },
  {
    id: 8,
    app_id: 'saki_CN',
    name: '1000 金币',
    game_product_id: 'coin_1000',
    price: 648.00,
    currency: 'CNY',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-03 10:00:00'
  },
  {
    id: 9,
    app_id: 'saki_CN',
    name: '2000 金币',
    game_product_id: 'coin_2000',
    price: 1280.00,
    currency: 'CNY',
    status: 0,
    goods_type: 1,
    create_time: '2024-01-04 10:00:00'
  },
  // Silver · JP 商品
  {
    id: 10,
    app_id: 'saki_JP',
    name: '100 コイン',
    game_product_id: 'coin_100',
    price: 1200,
    currency: 'JPY',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-05 10:00:00'
  },
  {
    id: 11,
    app_id: 'saki_JP',
    name: '500 コイン',
    game_product_id: 'coin_500',
    price: 5800,
    currency: 'JPY',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-05 10:00:00'
  },
  {
    id: 12,
    app_id: 'saki_JP',
    name: '1000 コイン',
    game_product_id: 'coin_1000',
    price: 11000,
    currency: 'JPY',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-05 10:00:00'
  },
  // Silver · KR 商品
  {
    id: 13,
    app_id: 'saki_KR',
    name: '100 코인',
    game_product_id: 'coin_100',
    price: 12000,
    currency: 'KRW',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-06 10:00:00'
  },
  {
    id: 14,
    app_id: 'saki_KR',
    name: '500 코인',
    game_product_id: 'coin_500',
    price: 58000,
    currency: 'KRW',
    status: 1,
    goods_type: 1,
    create_time: '2024-01-06 10:00:00'
  },
  {
    id: 15,
    app_id: 'saki_KR',
    name: '1000 코인',
    game_product_id: 'coin_1000',
    price: 110000,
    currency: 'KRW',
    status: 0,
    goods_type: 1,
    create_time: '2024-01-06 10:00:00'
  },
  // Game2 US 商品
  {
    id: 16,
    app_id: 'game2_US',
    name: 'Starter Pack',
    game_product_id: 'pack_starter',
    price: 4.99,
    currency: 'USD',
    status: 1,
    goods_type: 2,
    create_time: '2024-01-07 10:00:00'
  },
  {
    id: 17,
    app_id: 'game2_US',
    name: 'Premium Pack',
    game_product_id: 'pack_premium',
    price: 19.99,
    currency: 'USD',
    status: 1,
    goods_type: 2,
    create_time: '2024-01-07 10:00:00'
  },
  {
    id: 18,
    app_id: 'game2_US',
    name: 'Deluxe Pack',
    game_product_id: 'pack_deluxe',
    price: 49.99,
    currency: 'USD',
    status: 0,
    goods_type: 2,
    create_time: '2024-01-07 10:00:00'
  },
  // Game2 EU 商品
  {
    id: 19,
    app_id: 'game2_EU',
    name: 'Starter Pack',
    game_product_id: 'pack_starter',
    price: 4.99,
    currency: 'EUR',
    status: 1,
    goods_type: 2,
    create_time: '2024-01-08 10:00:00'
  },
  {
    id: 20,
    app_id: 'game2_EU',
    name: 'Premium Pack',
    game_product_id: 'pack_premium',
    price: 19.99,
    currency: 'EUR',
    status: 1,
    goods_type: 2,
    create_time: '2024-01-08 10:00:00'
  },
  // Game3 CN 商品
  {
    id: 21,
    app_id: 'game3_CN',
    name: '新手礼包',
    game_product_id: 'pack_newbie',
    price: 30.00,
    currency: 'CNY',
    status: 1,
    goods_type: 2,
    create_time: '2024-01-09 10:00:00'
  },
  {
    id: 22,
    app_id: 'game3_CN',
    name: '豪华礼包',
    game_product_id: 'pack_luxury',
    price: 198.00,
    currency: 'CNY',
    status: 1,
    goods_type: 2,
    create_time: '2024-01-09 10:00:00'
  },
  {
    id: 23,
    app_id: 'game3_CN',
    name: '超级礼包',
    game_product_id: 'pack_super',
    price: 648.00,
    currency: 'CNY',
    status: 0,
    goods_type: 2,
    create_time: '2024-01-09 10:00:00'
  }
]

// 支付渠道Mock数据
// 生成 channel_id：基于 channel_name 和 merchant_account，确保唯一性
function generateChannelId(channelName, merchantAccount) {
  // 将特殊字符替换为下划线，确保 channel_id 的唯一性和可读性
  const safeChannelName = channelName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const safeMerchantAccount = merchantAccount.replace(/[^a-zA-Z0-9]/g, '_')
  return `${safeChannelName}_${safeMerchantAccount}`
}

export const mockPaymentChannels = [
  {
    channel_id: generateChannelId('adyen', 'MerchantAccount_Test123'),
    sdk_app_id: 'Silver',
    pay_name: 'Adyen',
    channel_name: 'adyen',
    merchant_account: 'MerchantAccount_Test123',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: 'Adyen N.V.',
    public_key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoaL5tFz1rT4Zc4uVRBNeAevTkq0hnViCi44KUxkbqn16jA+Sx71GUsEhxS28i4EKB44ZepsiceFXVP6CVKFfxnRYfcn+HufMz99y5mc1oIbTAz87+jPCCA/lsobGxj3iiLEagtvahH1s8PiKbVDqu2+/690GAnVXzeW31Sk3xJ5IhY1AJOJijf0YxNh1IHOyJCJuRoxU9XwIUpNbThJL0pPu3vahTWvoMeuw3pDheTIen5GyjmfsTHCUFN+G/OQXV8vCAPb7wOMr8wltita/qoQLSnjoaDEUNi9JY51h2ya429Ejb6ZEmwDZ0v8E20zHs/0uEQ4VNgWRoDgx+i87YQIDAQAB',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChovm0XPWtPhlz\ni5VEE14B69OSrSGdWIKLjgpTGRuqfXqMD5LHvUZSwSHFLbyLgQoHjhl6myJx4VdU\n/oJUoV/GdFh9yf4e58zP33LmZzWghtMDPzv6M8IID+WyhsbGPeKIsRqC29qEfWzw+\nIptUOq7b7/r3QYCdVfN5bfVKTfEnkiFjUAk4mKN/RjE2HUgc7IkIm5GjFT1fAhSk\n1tOEkvSk+7e9qFNa+gx67DekOF5Mh6fkbKKe+xMcJQU34b85BdXy8IA9vvA4yvzC\nW2K1r+qhAtKeOhoMRQ2L0ljnmHbJrjbsSNvpkSbANnS/wTbTMez/S4RDhU2BZGgO\nDH6LzthAgMBAAECggEBAK...\n-----END PRIVATE KEY-----',
    status: true
  },
  {
    channel_id: generateChannelId('stripe', 'acct_1234567890'),
    sdk_app_id: 'Silver',
    pay_name: 'Stripe',
    channel_name: 'stripe',
    merchant_account: 'acct_1234567890',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: 'Stripe, Inc.',
    public_key: 'pk_test_51H1234567890abcdefghijklmnopqrstuvwxyz',
    private_key: 'sk_test_51H1234567890abcdefghijklmnopqrstuvwxyz',
    status: true
  },
  {
    channel_id: generateChannelId('paypal', 'merchant_paypal_001'),
    sdk_app_id: 'Silver',
    pay_name: 'PayPal',
    channel_name: 'paypal',
    merchant_account: 'merchant_paypal_001',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: 'PayPal Holdings, Inc.',
    public_key: 'PayPal_Public_Key_1234567890',
    private_key: 'PayPal_Private_Key_1234567890',
    status: true
  },
  {
    channel_id: generateChannelId('antom', 'antom_merchant_001'),
    sdk_app_id: 'Silver',
    pay_name: 'Antom',
    channel_name: 'antom',
    merchant_account: 'antom_merchant_001',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: 'Antom Pte. Ltd.',
    public_key: 'Antom_Public_Key_1234567890',
    private_key: 'Antom_Private_Key_1234567890',
    status: true
  },
  {
    channel_id: generateChannelId('payermax', 'payermax_merchant_001'),
    sdk_app_id: 'Silver',
    pay_name: 'PayerMax',
    channel_name: 'payermax',
    merchant_account: 'payermax_merchant_001',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: 'PayerMax Pte. Ltd.',
    public_key: 'PayerMax_Public_Key_1234567890',
    private_key: 'PayerMax_Private_Key_1234567890',
    status: true
  },
  {
    channel_id: generateChannelId('mycard', 'mycard_merchant_001'),
    sdk_app_id: 'Silver',
    pay_name: 'MyCard',
    channel_name: 'mycard',
    merchant_account: 'mycard_merchant_001',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: 'MyCard Digital Services',
    public_key: 'MyCard_Public_Key_1234567890',
    private_key: 'MyCard_Private_Key_1234567890',
    status: true
  },
  {
    channel_id: generateChannelId('alipay', '2088123456789012'),
    sdk_app_id: 'Silver',
    pay_name: 'Alipay',
    channel_name: 'alipay',
    merchant_account: '2088123456789012',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: '支付宝（中国）网络技术有限公司',
    public_key: 'Alipay_Public_Key_1234567890',
    private_key: 'Alipay_Private_Key_1234567890',
    status: true
  },
  {
    channel_id: generateChannelId('wechat', 'wx1234567890abcdef'),
    sdk_app_id: 'Silver',
    pay_name: 'WeChat Pay',
    channel_name: 'wechat',
    merchant_account: 'wx1234567890abcdef',
    contract_subject: 'Happy Elements Co., Ltd.',
    channel_subject: '财付通支付科技有限公司',
    public_key: 'WeChat_Public_Key_1234567890',
    private_key: 'WeChat_Private_Key_1234567890',
    status: true
  }
]

// 渠道参数模板Mock数据
export const mockChannelTemplates = [
  {
    channel_name: 'adyen',
    display_name: 'Adyen',
    parameters: [
      { key: 'api_key', label: 'API Key', type: 'text', required: true, description: 'Adyen API Key' },
      { key: 'merchant_account', label: 'Merchant Account', type: 'text', required: true, description: '商户账户' },
      { key: 'public_key', label: 'Public Key', type: 'textarea', required: true, description: '公钥' },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true, description: '私钥' }
    ]
  },
  {
    channel_name: 'stripe',
    display_name: 'Stripe',
    parameters: [
      { key: 'publishable_key', label: 'Publishable Key', type: 'text', required: true, description: '可发布的密钥（pk_开头）' },
      { key: 'secret_key', label: 'Secret Key', type: 'textarea', required: true, description: '密钥（sk_开头）' }
    ]
  },
  {
    channel_name: 'paypal',
    display_name: 'PayPal',
    parameters: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, description: 'PayPal Client ID' },
      { key: 'client_secret', label: 'Client Secret', type: 'textarea', required: true, description: 'PayPal Client Secret' },
      { key: 'public_key', label: 'Public Key', type: 'textarea', required: false, description: '公钥（可选）' },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: false, description: '私钥（可选）' }
    ]
  },
  {
    channel_name: 'antom',
    display_name: 'Antom',
    parameters: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true, description: 'Antom 商户ID' },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, description: 'Antom Client ID' },
      { key: 'client_secret', label: 'Client Secret', type: 'textarea', required: true, description: 'Antom Client Secret' }
    ]
  },
  {
    channel_name: 'payermax',
    display_name: 'PayerMax',
    parameters: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true, description: 'PayerMax 商户ID' },
      { key: 'api_key', label: 'API Key', type: 'textarea', required: true, description: 'PayerMax API Key' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'textarea', required: false, description: '回调签名密钥（可选）' }
    ]
  },
  {
    channel_name: 'mycard',
    display_name: 'MyCard',
    parameters: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true, description: 'MyCard 商户ID' },
      { key: 'hash_key', label: 'Hash Key', type: 'textarea', required: true, description: 'MyCard Hash Key' },
      { key: 'hash_iv', label: 'Hash IV', type: 'textarea', required: true, description: 'MyCard Hash IV' }
    ]
  },
  {
    channel_name: 'alipay',
    display_name: 'Alipay',
    parameters: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, description: '支付宝应用ID' },
      { key: 'public_key', label: 'Public Key', type: 'textarea', required: true, description: '支付宝公钥' },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true, description: '应用私钥' }
    ]
  },
  {
    channel_name: 'wechat',
    display_name: 'WeChat Pay',
    parameters: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, description: '微信支付App ID' },
      { key: 'mch_id', label: 'Merchant ID', type: 'text', required: true, description: '商户号' },
      { key: 'api_key', label: 'API Key', type: 'textarea', required: true, description: 'API密钥' },
      { key: 'app_secret', label: 'App Secret', type: 'textarea', required: false, description: 'App Secret（可选）' }
    ]
  },
  {
    channel_name: 'apple',
    display_name: 'Apple Pay',
    parameters: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true, description: 'Apple Pay商户ID' },
      { key: 'certificate', label: 'Certificate', type: 'textarea', required: true, description: '证书内容' },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true, description: '私钥' }
    ]
  },
  {
    channel_name: 'google',
    display_name: 'Google Pay',
    parameters: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true, description: 'Google Pay商户ID' },
      { key: 'public_key', label: 'Public Key', type: 'textarea', required: true, description: '公钥' },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true, description: '私钥' }
    ]
  }
]

// 币种Mock数据
export const mockCurrencies = [
  { code: 'USD', name: '美元 (US Dollar)' },
  { code: 'CNY', name: '人民币 (Chinese Yuan)' },
  { code: 'EUR', name: '欧元 (Euro)' },
  { code: 'GBP', name: '英镑 (British Pound)' },
  { code: 'JPY', name: '日元 (Japanese Yen)' },
  { code: 'KRW', name: '韩元 (Korean Won)' },
  { code: 'CAD', name: '加元 (Canadian Dollar)' },
  { code: 'AUD', name: '澳元 (Australian Dollar)' }
]

// 语言Mock数据
export const mockLanguages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' }
]

// Mock API延迟
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms))

const PAYMENT_SORT_OFFLINE_KEYS = 'payment_sort_offline_template_keys'
const PAYMENT_SORT_DEFAULT_KEY_MAP = 'payment_sort_default_template_key_map'
const PAYMENT_SORT_DELETED_KEYS = 'payment_sort_deleted_template_keys'
const PAYMENT_SORT_CONFIG_STORAGE_KEY = 'payment_sort_configs_v1'

function mockCashierTemplateRowPublished(item) {
  const s = item && item.publish_status
  if (s === 'offline' || s === 'draft') return false
  return true
}

function readPaymentSortOfflineKeys() {
  try {
    const raw = localStorage.getItem(PAYMENT_SORT_OFFLINE_KEYS)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function readPaymentSortDeletedKeys() {
  try {
    const raw = localStorage.getItem(PAYMENT_SORT_DELETED_KEYS)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writePaymentSortDeletedKeys(set) {
  localStorage.setItem(PAYMENT_SORT_DELETED_KEYS, JSON.stringify([...set]))
}

function writePaymentSortOfflineKeys(set) {
  localStorage.setItem(PAYMENT_SORT_OFFLINE_KEYS, JSON.stringify([...set]))
}

const PAYMENT_SORT_DISPLAY_NAMES_KEY = 'payment_sort_cashier_display_names_v1'

function readPaymentSortDisplayNames() {
  try {
    const raw = localStorage.getItem(PAYMENT_SORT_DISPLAY_NAMES_KEY)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

function writePaymentSortDisplayNames(mapObj) {
  try {
    localStorage.setItem(PAYMENT_SORT_DISPLAY_NAMES_KEY, JSON.stringify(mapObj || {}))
  } catch {
    // ignore localStorage errors in mock mode
  }
}

/** 列表展示用：自定义「收银台模版名称」，未配置时回退为 public_template_id */
function mergeCashierTemplateDisplayNames(list) {
  if (!Array.isArray(list)) return list
  const map = readPaymentSortDisplayNames()
  return list.map((item) => {
    const rk = paymentSortRowKey(item)
    const custom = String(map[rk] || '').trim()
    const fallback = getCashierPublicTemplateId(item)
    return {
      ...item,
      cashier_template_name: custom || fallback,
      cashier_template_name_custom: custom
    }
  })
}

function defaultTemplateScopeKey(params = {}) {
  const region = params.region || 'overseas'
  const scenario = params.scenario || 'global'
  return `${region}|${scenario}`
}

function readPaymentSortDefaultKeyMap() {
  try {
    const raw = localStorage.getItem(PAYMENT_SORT_DEFAULT_KEY_MAP)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

function writePaymentSortDefaultKeyMap(mapObj) {
  localStorage.setItem(PAYMENT_SORT_DEFAULT_KEY_MAP, JSON.stringify(mapObj || {}))
}

function getDefaultTemplateKeyForScope(params = {}) {
  const scope = defaultTemplateScopeKey(params)
  const mapObj = readPaymentSortDefaultKeyMap()
  return mapObj[scope] || ''
}

function setDefaultTemplateKeyForScope(params = {}, rowKey = '') {
  const scope = defaultTemplateScopeKey(params)
  const mapObj = readPaymentSortDefaultKeyMap()
  if (rowKey) {
    mapObj[scope] = rowKey
  } else {
    delete mapObj[scope]
  }
  writePaymentSortDefaultKeyMap(mapObj)
}

function applyPaymentSortDefaultFlag(list, params = {}) {
  const defaultKey = getDefaultTemplateKeyForScope(params)
  return list.map(item => ({
    ...item,
    is_default_template: !!defaultKey && paymentSortRowKey(item) === defaultKey
  }))
}

function applyPaymentSortOfflineOverrides(list) {
  const keys = readPaymentSortOfflineKeys()
  return list.map(item =>
    keys.has(paymentSortRowKey(item)) ? { ...item, publish_status: 'offline' } : item
  )
}

function applyPaymentSortDeletedFilter(list) {
  const deletedKeys = readPaymentSortDeletedKeys()
  return list.filter(item => !deletedKeys.has(paymentSortRowKey(item)))
}

function isDomesticRegion(params = {}) {
  return params.region === 'domestic'
}

const DOMESTIC_CHANNEL_NAMES = new Set(['alipay', 'wechat'])

/** 海外支付中心：渠道列表 Mock */
const OVERSEAS_PAYMENT_CHANNEL_NAMES = new Set(['adyen', 'stripe', 'paypal', 'antom', 'payermax', 'mycard'])

function filterDomesticChannels(list) {
  return list.filter(c => DOMESTIC_CHANNEL_NAMES.has(String(c.channel_name || '').toLowerCase()))
}

function filterDomesticPaymentMethods(list) {
  return list.filter(m => {
    const id = String(m.channel_id || '').toLowerCase()
    return id.startsWith('alipay_') || id.startsWith('wechat_')
  })
}

/** 海外支付中心：支付方式 Mock 仅保留 Adyen / Stripe / PayPal 渠道 */
export function filterOverseasPaymentMethods(list) {
  return list.filter(m => {
    const id = String(m.channel_id || '').toLowerCase()
    return [...OVERSEAS_PAYMENT_CHANNEL_NAMES].some(prefix => id.startsWith(`${prefix}_`))
  })
}

function localizeDomesticChannel(ch) {
  const name = String(ch.channel_name || '').toLowerCase()
  if (name === 'alipay') {
    return { ...ch, pay_name: '支付宝', channel_subject: ch.channel_subject || '支付宝（中国）网络技术有限公司' }
  }
  if (name === 'wechat') {
    return { ...ch, pay_name: '微信支付', channel_subject: ch.channel_subject || '财付通支付科技有限公司' }
  }
  return ch
}

function localizeDomesticMethod(m) {
  const id = String(m.channel_id || '').toLowerCase()
  if (id.startsWith('alipay_')) {
    return { ...m, pay_name: '支付宝', display_text: '支付宝' }
  }
  if (id.startsWith('wechat_')) {
    return { ...m, pay_name: '微信支付', display_text: '微信支付' }
  }
  return m
}

/** 与场景 payment_env（Mobile / PC / 游戏主机）及收银台 mock 口径（pc/android/apple/psn）对齐 */
function paymentEnvBucket(v) {
  const raw = String(v || '').trim()
  const s = raw.toLowerCase()
  if (s === 'mobile' || s === 'android' || s === 'apple') return 'mobile'
  if (s === 'pc') return 'pc'
  if (s === 'ps5' || s === 'psn' || raw === '游戏主机') return 'console'
  return s
}

/** 海外 Mock：支付方式列表（与 getPaymentMethods 一致） */
export const mockPaymentMethodsList = [
  // Adyen 子渠道
  {
    id: 1,
    sdk_app_id: 'Silver',
    pay_name: 'CARD',
    selectedCardBrand: 'VISA',
    channel_ids: ['adyen_MerchantAccount_Test123'],
    channel_id: 'adyen_MerchantAccount_Test123',
    icon_url: 'https://cdn.example.com/payment-icons/visa.png',
    status: 'enabled'
  },
  {
    id: 2,
    sdk_app_id: 'Silver',
    pay_name: 'CARD',
    selectedCardBrand: 'AMEX',
    channel_ids: ['adyen_MerchantAccount_Test123'],
    channel_id: 'adyen_MerchantAccount_Test123',
    icon_url: 'https://cdn.example.com/payment-icons/amex.png',
    status: 'enabled'
  },
  // Stripe 子渠道
  {
    id: 3,
    sdk_app_id: 'Silver',
    pay_name: 'CARD',
    selectedCardBrand: 'VISA',
    channel_ids: ['stripe_acct_1234567890'],
    channel_id: 'stripe_acct_1234567890',
    icon_url: 'https://cdn.example.com/payment-icons/visa.png',
    status: 'enabled'
  },
  {
    id: 4,
    sdk_app_id: 'Silver',
    pay_name: 'CARD',
    selectedCardBrand: 'AMEX',
    channel_ids: ['stripe_acct_1234567890'],
    channel_id: 'stripe_acct_1234567890',
    icon_url: 'https://cdn.example.com/payment-icons/amex.png',
    status: 'enabled'
  },
  // PayPal 子渠道
  {
    id: 5,
    sdk_app_id: 'Silver',
    pay_name: 'PayPal',
    selectedCardBrand: '',
    channel_ids: ['paypal_merchant_paypal_001'],
    channel_id: 'paypal_merchant_paypal_001',
    icon_url: 'https://cdn.example.com/payment-icons/paypal.png',
    status: 'enabled'
  },
  // Antom 子渠道
  {
    id: 6,
    sdk_app_id: 'Silver',
    pay_name: 'CARD',
    selectedCardBrand: 'VISA',
    channel_ids: ['antom_antom_merchant_001'],
    channel_id: 'antom_antom_merchant_001',
    icon_url: 'https://cdn.example.com/payment-icons/visa.png',
    status: 'enabled'
  },
  {
    id: 7,
    sdk_app_id: 'Silver',
    pay_name: 'DANA',
    selectedCardBrand: '',
    channel_ids: ['antom_antom_merchant_001'],
    channel_id: 'antom_antom_merchant_001',
    icon_url: 'https://cdn.example.com/payment-icons/dana.png',
    status: 'enabled'
  },
  // PayerMax 子渠道
  {
    id: 8,
    sdk_app_id: 'Silver',
    pay_name: 'CARD',
    selectedCardBrand: 'VISA',
    channel_ids: ['payermax_payermax_merchant_001'],
    channel_id: 'payermax_payermax_merchant_001',
    icon_url: 'https://cdn.example.com/payment-icons/visa.png',
    status: 'enabled'
  },
  {
    id: 9,
    sdk_app_id: 'Silver',
    pay_name: 'CARD',
    selectedCardBrand: 'AMEX',
    channel_ids: ['payermax_payermax_merchant_001'],
    channel_id: 'payermax_payermax_merchant_001',
    icon_url: 'https://cdn.example.com/payment-icons/amex.png',
    status: 'enabled'
  },
  // MyCard 子渠道
  {
    id: 10,
    sdk_app_id: 'Silver',
    pay_name: 'MyCard',
    selectedCardBrand: '',
    channel_ids: ['mycard_mycard_merchant_001'],
    channel_id: 'mycard_mycard_merchant_001',
    icon_url: 'https://cdn.example.com/payment-icons/mycard.png',
    status: 'enabled'
  },
  // Alipay 子渠道（国内）
  {
    id: 11,
    sdk_app_id: 'Silver',
    pay_name: 'Alipay',
    selectedCardBrand: '',
    channel_ids: ['alipay_2088123456789012'],
    channel_id: 'alipay_2088123456789012',
    icon_url: 'https://cdn.example.com/payment-icons/alipay.png',
    status: 'enabled'
  },
  // WeChat Pay 子渠道（国内）
  {
    id: 12,
    sdk_app_id: 'Silver',
    pay_name: 'WeChat Pay',
    selectedCardBrand: '',
    channel_ids: ['wechat_wx1234567890abcdef'],
    channel_id: 'wechat_wx1234567890abcdef',
    icon_url: 'https://cdn.example.com/payment-icons/wechat.png',
    status: 'enabled'
  }
]

/** 支付方式 -> 支付渠道映射 Mock（用于手动支付渠道路由） */
export const mockPaymentMethodChannelMappings = [
  { pay_name: 'CARD', selectedCardBrand: 'VISA', channel_ids: ['adyen_MerchantAccount_Test123'] },
  { pay_name: 'CARD', selectedCardBrand: 'AMEX', channel_ids: ['adyen_MerchantAccount_Test123'] },
  { pay_name: 'CARD', selectedCardBrand: 'VISA', channel_ids: ['stripe_acct_1234567890'] },
  { pay_name: 'CARD', selectedCardBrand: 'AMEX', channel_ids: ['stripe_acct_1234567890'] },
  { pay_name: 'PayPal', channel_ids: ['paypal_merchant_paypal_001'] },
  { pay_name: 'CARD', selectedCardBrand: 'VISA', channel_ids: ['antom_antom_merchant_001'] },
  { pay_name: 'DANA', channel_ids: ['antom_antom_merchant_001'] },
  { pay_name: 'CARD', selectedCardBrand: 'VISA', channel_ids: ['payermax_payermax_merchant_001'] },
  { pay_name: 'CARD', selectedCardBrand: 'AMEX', channel_ids: ['payermax_payermax_merchant_001'] },
  { pay_name: 'MyCard', channel_ids: ['mycard_mycard_merchant_001'] },
  { pay_name: 'Alipay', channel_ids: ['alipay_2088123456789012'] },
  { pay_name: 'WeChat Pay', channel_ids: ['wechat_wx1234567890abcdef'] }
]

const PAYMENT_METHODS_STORAGE_KEY = 'payment_methods_list_v2'

function applyPaymentMethodChannelMappings(list) {
  return (list || []).map((method) => {
    const matched = mockPaymentMethodChannelMappings.find(
      (m) => m.pay_name === method.pay_name &&
        (!m.selectedCardBrand || m.selectedCardBrand === method.selectedCardBrand)
    )
    const mappedIds = Array.isArray(matched?.channel_ids)
      ? matched.channel_ids.filter(Boolean)
      : []
    const currentIds = Array.isArray(method.channel_ids)
      ? method.channel_ids.filter(Boolean)
      : []
    const mergedIds = [...new Set([...(mappedIds.length > 0 ? mappedIds : currentIds), method.channel_id].filter(Boolean))]
    return {
      ...method,
      channel_ids: mergedIds,
      channel_id: mergedIds[0] || method.channel_id || ''
    }
  })
}

function readPaymentMethodsList() {
  try {
    const raw = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY)
    if (!raw) return applyPaymentMethodChannelMappings([...mockPaymentMethodsList])
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? applyPaymentMethodChannelMappings(parsed)
      : applyPaymentMethodChannelMappings([...mockPaymentMethodsList])
  } catch {
    return applyPaymentMethodChannelMappings([...mockPaymentMethodsList])
  }
}

function writePaymentMethodsList(list) {
  try {
    localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(list || []))
  } catch {
    // ignore localStorage errors in mock mode
  }
}

/** 国内收银台模版 Mock：同一国家/币种下区分原生与 Web（与 paymentSortRowKey 一致） */
export const mockPaymentSortListDomestic = [
  {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'android',
    is_web_cashier: true,
    method_count: 2,
    recommended_count: 2,
    publish_status: 'published',
    is_simulator: false
  },
  {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'android',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 1,
    publish_status: 'published',
    is_simulator: false
  }
]

/** 兼容旧脚本：等同于 mockPaymentSortListDomestic[0] */
export const mockPaymentSortDomesticDefaultRow = mockPaymentSortListDomestic[0]

/** 海外收银台模版排序列表种子数据 */
export const mockPaymentSortListOverseas = [
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: true,
    method_count: 3,
    recommended_count: 2,
    publish_status: 'published'
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: false,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'offline'
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'android',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'apple',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'apple',
    is_web_cashier: true,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'android',
    is_web_cashier: true,
    method_count: 1,
    recommended_count: 0,
    publish_status: 'published'
  },
  {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'pc',
    is_web_cashier: true,
    method_count: 2,
    recommended_count: 2,
    publish_status: 'published'
  },
  {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'pc',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'android',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_JP',
    country_code: 'JP',
    currency: 'JPY',
    payment_env: 'pc',
    is_web_cashier: true,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_KR',
    country_code: 'KR',
    currency: 'KRW',
    payment_env: 'pc',
    is_web_cashier: true,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'game2_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'game2_EU',
    country_code: 'GB',
    currency: 'GBP',
    payment_env: 'pc',
    is_web_cashier: true,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'game2_EU',
    country_code: 'DE',
    currency: 'EUR',
    payment_env: 'pc',
    is_web_cashier: false,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'game3_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'pc',
    is_web_cashier: true,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_US',
    country_code: 'CA',
    currency: 'CAD',
    payment_env: 'pc',
    is_web_cashier: false,
    method_count: 2,
    recommended_count: 1,
    publish_status: 'published'
  },
  {
    app_id: 'saki_US',
    country_code: 'AU',
    currency: 'AUD',
    payment_env: 'pc',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 0,
    publish_status: 'offline'
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'psn',
    is_web_cashier: false,
    method_count: 1,
    recommended_count: 0,
    publish_status: 'published'
  }
]

/** 种子列表顺序决定同 (游戏,国家,币种) 下 _2、_3… 编号 */
const overseasPublicTemplateIdMap = buildPublicTemplateIdMap(mockPaymentSortListOverseas)
const domesticPublicTemplateIdMap = buildPublicTemplateIdMap(mockPaymentSortListDomestic)

export const mockPaymentInfoConfigListRows = [
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: true,
    collect_postal_code: true,
    collect_email: true
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: false
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'android',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: false
  },
  {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'apple',
    is_web_cashier: false,
    collect_postal_code: false,
    collect_email: false
  },
  {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'pc',
    is_web_cashier: true,
    collect_postal_code: false,
    collect_email: true
  },
  {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'android',
    is_web_cashier: false,
    collect_postal_code: false,
    collect_email: true
  },
  {
    app_id: 'saki_JP',
    country_code: 'JP',
    currency: 'JPY',
    payment_env: 'pc',
    is_web_cashier: true,
    collect_postal_code: true,
    collect_email: false
  },
  {
    app_id: 'game2_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: true
  }
]

function mergeSortListCollectPostalFromPaymentInfo(list) {
  if (!Array.isArray(list)) return list
  return list.map((item) => {
    const match = mockPaymentInfoConfigListRows.find(
      (r) =>
        r.app_id === item.app_id &&
        r.country_code === item.country_code &&
        r.currency === item.currency &&
        String(r.payment_env || '') === String(item.payment_env || '') &&
        !!r.is_web_cashier === !!item.is_web_cashier
    )
    return {
      ...item,
      collect_postal_code: match ? !!match.collect_postal_code : false
    }
  })
}

function mergeSortListCollectPostalFromPersistedStore(list, params = {}) {
  if (!Array.isArray(list)) return list
  const region = isDomesticRegion(params) ? 'domestic' : 'overseas'
  try {
    const raw = localStorage.getItem(PAYMENT_SORT_CONFIG_STORAGE_KEY)
    const store = raw ? JSON.parse(raw) : {}
    if (!store || typeof store !== 'object') return list
    return list.map((item) => {
      const key = [
        region,
        item.app_id || '',
        item.country_code || '',
        item.currency || '',
        item.payment_env || '',
        item.is_web_cashier ? 'web' : 'nonweb'
      ].join('|')
      const persisted = store[key]
      if (persisted && persisted.collect_postal_code !== undefined) {
        return { ...item, collect_postal_code: !!persisted.collect_postal_code }
      }
      return item
    })
  } catch {
    return list
  }
}

function mergeSortListSimulatorFromPersistedStore(list, params = {}) {
  if (!isDomesticRegion(params)) {
    return list.map((item) => ({ ...item, is_simulator: false }))
  }
  try {
    const raw = localStorage.getItem(PAYMENT_SORT_CONFIG_STORAGE_KEY)
    const store = raw ? JSON.parse(raw) : {}
    if (!store || typeof store !== 'object') {
      return list.map((item) => ({ ...item, is_simulator: !!item.is_simulator }))
    }
    return list.map((item) => {
      const key = [
        'domestic',
        item.app_id || '',
        item.country_code || '',
        item.currency || '',
        item.payment_env || '',
        item.is_web_cashier ? 'web' : 'nonweb'
      ].join('|')
      const persisted = store[key]
      if (persisted && persisted.is_simulator !== undefined) {
        return { ...item, is_simulator: !!persisted.is_simulator }
      }
      return { ...item, is_simulator: !!item.is_simulator }
    })
  } catch {
    return list
  }
}

export const mockPaymentInfoDetailMap = {
  saki_US_USD_US_pc_web: {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: true,
    collect_postal_code: true,
    collect_email: true
  },
  saki_US_USD_US_pc_nonweb: {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: false
  },
  saki_US_USD_US_android_nonweb: {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'android',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: false
  },
  saki_US_USD_US_apple_nonweb: {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'apple',
    is_web_cashier: false,
    collect_postal_code: false,
    collect_email: false
  },
  saki_CN_CNY_CN_pc_web: {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'pc',
    is_web_cashier: true,
    collect_postal_code: false,
    collect_email: true
  },
  saki_JP_JPY_JP_pc_web: {
    app_id: 'saki_JP',
    country_code: 'JP',
    currency: 'JPY',
    payment_env: 'pc',
    is_web_cashier: true,
    collect_postal_code: true,
    collect_email: false
  },
  saki_US_USD_US_pc: {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'pc',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: false
  },
  saki_US_USD_US_android: {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'android',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: false
  },
  saki_US_USD_US_apple: {
    app_id: 'saki_US',
    country_code: 'US',
    currency: 'USD',
    payment_env: 'apple',
    is_web_cashier: false,
    collect_postal_code: false,
    collect_email: false
  },
  saki_CN_CNY_CN_pc: {
    app_id: 'saki_CN',
    country_code: 'CN',
    currency: 'CNY',
    payment_env: 'pc',
    is_web_cashier: false,
    collect_postal_code: false,
    collect_email: true
  },
  saki_JP_JPY_JP_pc: {
    app_id: 'saki_JP',
    country_code: 'JP',
    currency: 'JPY',
    payment_env: 'pc',
    is_web_cashier: false,
    collect_postal_code: true,
    collect_email: false
  }
}

/** 列表编辑传 app_id；兼容旧逻辑按 game_name 查（多条同名时取第一条） */
function resolveMockAppIndex(key) {
  const k = String(key || '')
  const byAppId = mockApps.findIndex(a => a.app_id === k)
  if (byAppId !== -1) return byAppId
  return mockApps.findIndex(a => a.game_name === k)
}

function findMockGameForFlatApp(app) {
  if (!app) return null
  return mockGames.find(g =>
    Array.isArray(g.apps) && g.apps.some(a => a.app_id === app.app_id)
  )
}

// Mock API服务
export const mockAPI = {
  // 获取应用列表
  async getApps(params = {}) {
    await delay()
    let result = [...mockApps]

    // 后端支持按 app_id 精确/模糊过滤
    if (params.app_id) {
      result = result.filter(app => app.app_id.includes(params.app_id))
    }
    // 按游戏名模糊过滤
    if (params.game_name) {
      const keyword = params.game_name.toLowerCase()
      result = result.filter(app =>
        (app.game_name || '').toLowerCase().includes(keyword)
      )
    }
    
    return {
      code: 200,
      message: 'success',
      data: {
        // 为每个应用补充 sdk_app_id（Game id）
        list: result.map(app => {
          const game = findMockGameForFlatApp(app)
          return {
            ...app,
            sdk_app_id: game ? game.sdk_app_id : 'Silver'
          }
        }),
        total: result.length
      }
    }
  },

  // 获取应用详情（优先 app_id，否则按 game_name，多条同名时取第一条）
  async getAppDetail(key) {
    await delay()
    const idx = resolveMockAppIndex(key)
    const app = idx >= 0 ? mockApps[idx] : null
    if (!app) {
      return {
        code: 404,
        message: '应用不存在',
        data: null
      }
    }
    const game = findMockGameForFlatApp(app)
    return {
      code: 200,
      message: 'success',
      data: {
        app_id: app.app_id,
        game_name: app.game_name,
        pay_switch: app.pay_switch,
        sdk_app_id: game ? game.sdk_app_id : 'Silver',
        create_time: app.create_time
      }
    }
  },

  // 创建应用
  async createApp(data) {
    await delay()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const sdkAppId = data.sdk_app_id || 'Silver'

    // 检查是否已存在同名游戏应用
    const existingApp = mockApps.find(app => app.game_name === data.game_name)
    if (existingApp) {
      return {
        code: 400,
        message: '该游戏应用已存在',
        data: null
      }
    }

    // 生成一个临时的 app_id（仅用于内部数据结构，前端不显示）
    const tempAppId = `app_${Date.now()}`

    const newApp = {
      app_id: tempAppId,
      app_name: data.game_name || '',
      game_name: data.game_name || '',
      platform: '',
      server_node: '',
      region: '',
      country_code: '',
      pay_switch: data.pay_switch ?? true,
      create_time: now
    }

    // 更新扁平应用列表
    mockApps.push(newApp)

    // 同步到游戏维度 mockGames（按 game_name 归类）
    let game = mockGames.find(g => g.game_name === newApp.game_name)
    if (!game) {
      game = {
        id: mockGames.length + 1,
        sdk_app_id: sdkAppId,
        game_name: newApp.game_name,
        apps: []
      }
      mockGames.push(game)
    }
    game.apps.push({
      ...newApp,
      sdk_app_id: sdkAppId
    })

    return {
      code: 200,
      message: 'success',
      data: {
        game_name: newApp.game_name,
        pay_switch: newApp.pay_switch,
        sdk_app_id: sdkAppId,
        create_time: newApp.create_time
      }
    }
  },

  // 更新应用（含开通/关闭；优先 app_id，与列表行一一对应）
  async updateApp(key, data) {
    await delay()
    const index = resolveMockAppIndex(key)
    if (index === -1) {
      return {
        code: 404,
        message: '应用不存在',
        data: null
      }
    }

    const flatAppId = mockApps[index].app_id
    const updated = {
      ...mockApps[index],
      ...data
    }
    mockApps[index] = updated

    mockGames.forEach(game => {
      if (!Array.isArray(game.apps)) return
      const appIndex = game.apps.findIndex(a => a.app_id === flatAppId)
      if (appIndex === -1) return
      game.apps[appIndex] = {
        ...game.apps[appIndex],
        ...updated
      }
      if (data.sdk_app_id) {
        game.sdk_app_id = data.sdk_app_id
      }
    })

    const game = findMockGameForFlatApp(updated)

    return {
      code: 200,
      message: 'success',
      data: {
        game_name: updated.game_name,
        pay_switch: updated.pay_switch,
        sdk_app_id: data.sdk_app_id || (game ? game.sdk_app_id : 'Silver'),
        create_time: updated.create_time
      }
    }
  },

  // 获取商品列表
  async getGoods(params = {}) {
    await delay()
    let result = [...mockGoods]
    
    // 为每个商品添加game_name和prices（根据app_id从应用列表中查找）
    result = result.map(goods => {
      const app = mockApps.find(app => app.app_id.toLowerCase() === goods.app_id.toLowerCase())
      
    // 构建多币种定价数组
    // 如果商品有多个币种定价，使用prices数组；否则使用单个price和currency
    const prices = goods.prices || [
      {
        currency_code: goods.currency || '',
        country_code: goods.country_code || '',
        price: goods.price || 0,
        discount: goods.discount || 0,
        online: goods.status === 1
      }
    ]
      
      return {
        ...goods,
        game_name: app ? app.game_name : '',
        prices: prices
      }
    })
    
    if (params.app_id) {
      // 大小写不敏感匹配
      const appIdLower = params.app_id.toLowerCase()
      result = result.filter(goods => goods.app_id.toLowerCase() === appIdLower)
    }
    
    if (params.name) {
      result = result.filter(goods => 
        goods.name.toLowerCase().includes(params.name.toLowerCase())
      )
    }
    
    if (params.status !== undefined) {
      result = result.filter(goods => goods.status === params.status)
    }
    
    return {
      code: 200,
      message: 'success',
      data: {
        list: result,
        total: result.length
      }
    }
  },

  // 获取支付渠道列表
  async getPaymentChannels(params = {}) {
    await delay()
    let list = [...mockPaymentChannels]
    if (isDomesticRegion(params)) {
      list = filterDomesticChannels(list).map(localizeDomesticChannel)
    } else {
      list = list.filter(c =>
        OVERSEAS_PAYMENT_CHANNEL_NAMES.has(String(c.channel_name || '').toLowerCase())
      )
    }
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        total: list.length
      }
    }
  },

  async updatePaymentChannel(channelId, data = {}) {
    await delay()
    const idx = mockPaymentChannels.findIndex(c => c.channel_id === channelId)
    if (idx < 0) {
      return {
        code: 404,
        message: '支付渠道不存在',
        data: null
      }
    }
    const prev = mockPaymentChannels[idx]
    const merged = {
      ...prev,
      ...data,
      channel_id: channelId
    }
    mockPaymentChannels[idx] = merged
    return {
      code: 200,
      message: 'success',
      data: merged
    }
  },

  // 获取支付方式列表
  async getPaymentMethods(params = {}) {
    await delay()

    let result = readPaymentMethodsList()

    if (!params.include_all) {
      if (isDomesticRegion(params)) {
        result = filterDomesticPaymentMethods(result).map(localizeDomesticMethod)
      } else {
        result = filterOverseasPaymentMethods(result)
      }
    }

    // 筛选
    if (params.pay_type) {
      result = result.filter(item => item.pay_type === params.pay_type)
    }
    if (params.pay_method) {
      result = result.filter(item => 
        item.pay_name.toLowerCase().includes(params.pay_method.toLowerCase())
      )
    }
    
    return {
      code: 200,
      message: 'success',
      data: {
        list: result,
        total: result.length
      }
    }
  },

  async createPaymentMethod(data = {}) {
    await delay()
    const currentList = readPaymentMethodsList()
    const nextId = currentList.length > 0
      ? Math.max(...currentList.map(m => Number(m.id) || 0)) + 1
      : 1

    const channelIds = Array.isArray(data.channel_ids) ? data.channel_ids : []
    const normalized = {
      id: nextId,
      sdk_app_id: data.sdk_app_id || 'Silver',
      pay_name: data.pay_name || `支付方式-${nextId}`,
      pay_type: data.pay_type || 'wallet',
      channel_ids: channelIds,
      // 兼容现有列表过滤逻辑（国内/海外按 channel_id 前缀过滤）
      channel_id: data.channel_id || channelIds[0] || '',
      icon_url: data.icon_url || '',
      channel_param_configs:
        data.channel_param_configs && typeof data.channel_param_configs === 'object'
          ? data.channel_param_configs
          : {},
      status: (data.status === 'enabled' || data.status === 'disabled' || data.status === 'maintenance')
        ? data.status
        : 'enabled'
    }

    currentList.unshift(normalized)
    writePaymentMethodsList(currentList)
    return {
      code: 200,
      message: 'success',
      data: normalized
    }
  },

  async updatePaymentMethod(id, data = {}) {
    await delay()
    const numId = typeof id === 'string' ? parseInt(id, 10) : id
    if (Number.isNaN(numId)) {
      return { code: 400, message: '无效的支付方式 ID', data: null }
    }
    const currentList = readPaymentMethodsList()
    const idx = currentList.findIndex(m => m.id === numId)
    if (idx < 0) {
      return { code: 404, message: '支付方式不存在', data: null }
    }
    const prev = currentList[idx]
    const merged = { ...prev, ...data, id: numId }
    currentList[idx] = merged
    writePaymentMethodsList(currentList)
    return {
      code: 200,
      message: 'success',
      data: merged
    }
  },

  async deletePaymentMethod(id) {
    await delay()
    const numId = typeof id === 'string' ? parseInt(id, 10) : id
    if (Number.isNaN(numId)) {
      return { code: 400, message: '无效的支付方式 ID', data: null }
    }
    const currentList = readPaymentMethodsList()
    const idx = currentList.findIndex(m => m.id === numId)
    if (idx < 0) {
      return { code: 404, message: '支付方式不存在', data: null }
    }
    const removed = currentList[idx]
    currentList.splice(idx, 1)
    writePaymentMethodsList(currentList)
    return {
      code: 200,
      message: 'success',
      data: removed
    }
  },

  // 获取订单列表
  async getOrders(params = {}) {
    await delay()
    
    // Mock数据 - 订单列表（根据文档字段）
    const mockOrders = [
      {
        id: 1164086179701745,
        create_time: '2024-01-15 10:00:00',
        update_time: '2024-01-15 10:05:00',
        state: 2,
        user_id: '1000550001',
        user_passport_id: 'passport_1000550001',
        user_role_id: 'role_1000550001',
        user_ip: '10.130.149.0',
        channel_name: 'weixin',
        channel_order_id: 'cea4b4f45cee721246bfc4bc229b4f20-20131014161906',
        channel_currency: 'CNY',
        channel_fee: 10.06,
        country: 'CN',
        open_id: 'cea4b4f45cee721246bfc4bc229b4f20',
        login_type: 'wechat_minigame',
        goods_id: 'com.happyelements.gsp.gold.tw.25',
        payment_extend: '{"expiryMillis":1584685809000,"autoRenew":true}',
        app_id: 'saki_CN',
        game_zone_id: '1',
        game_server_id: '1',
        game_extend: '893647A7-512C-427A-B9DF-48FEA8C5C0B3'
      },
      {
        id: 2164086179701746,
        create_time: '2024-01-15 11:00:00',
        update_time: '2024-01-15 11:01:00',
        state: 1,
        user_id: '1000550002',
        user_passport_id: 'passport_1000550002',
        user_role_id: 'role_1000550002',
        user_ip: '10.130.149.1',
        channel_name: 'apple',
        channel_order_id: 'GPA.3354-4442-5736-04325',
        channel_currency: 'USD',
        channel_fee: 9.99,
        country: 'US',
        open_id: 'apple_user_123',
        login_type: 'apple',
        goods_id: 'com.happyelements.gsp.gold.us.50',
        payment_extend: null,
        app_id: 'saki_US',
        game_zone_id: '0',
        game_server_id: '0',
        game_extend: 'game_extend_data_001'
      },
      {
        id: 3164086179701747,
        create_time: '2024-01-15 12:00:00',
        update_time: '2024-01-15 12:00:00',
        state: 16,
        user_id: '1000550003',
        user_passport_id: 'passport_1000550003',
        user_role_id: 'role_1000550003',
        user_ip: '10.130.149.2',
        channel_name: null,
        channel_order_id: null,
        channel_currency: 'USD',
        channel_fee: 19.99,
        country: 'US',
        open_id: 'google_user_456',
        login_type: 'google',
        goods_id: 'com.happyelements.gsp.gold.us.100',
        payment_extend: null,
        app_id: 'saki_US',
        game_zone_id: '0',
        game_server_id: '0',
        game_extend: null
      },
      {
        id: 1164086179701748,
        create_time: '2024-01-15 13:00:00',
        update_time: '2024-01-15 13:05:00',
        state: 3,
        user_id: '1000550004',
        user_passport_id: 'passport_1000550004',
        user_role_id: 'role_1000550004',
        user_ip: '10.130.149.3',
        channel_name: 'alipay',
        channel_order_id: '2024011522001234567890123456',
        channel_currency: 'CNY',
        channel_fee: 68.00,
        country: 'CN',
        open_id: 'alipay_user_789',
        login_type: 'alipay',
        goods_id: 'com.happyelements.gsp.gold.cn.100',
        payment_extend: null,
        app_id: 'saki_CN',
        game_zone_id: '1',
        game_server_id: '1',
        game_extend: null
      },
      {
        id: 2164086179701749,
        create_time: '2024-01-15 14:00:00',
        update_time: '2024-01-15 14:10:00',
        state: 7,
        user_id: '1000550005',
        user_passport_id: 'passport_1000550005',
        user_role_id: 'role_1000550005',
        user_ip: '10.130.149.4',
        channel_name: 'stripe',
        channel_order_id: 'ch_1234567890abcdef',
        channel_currency: 'EUR',
        channel_fee: 15.99,
        country: 'GB',
        open_id: 'stripe_user_abc',
        login_type: 'stripe',
        goods_id: 'com.happyelements.gsp.gold.eu.50',
        payment_extend: null,
        app_id: 'saki_EU',
        game_zone_id: '0',
        game_server_id: '0',
        game_extend: null
      }
    ]
    
    let result = [...mockOrders]
    
    // 筛选
    if (params.order_id) {
      result = result.filter(order => 
        order.id.toString().includes(params.order_id)
      )
    }
    if (params.app_id) {
      result = result.filter(order => 
        order.app_id && order.app_id.toLowerCase().includes(params.app_id.toLowerCase())
      )
    }
    if (params.user_id) {
      result = result.filter(order => 
        order.user_id && order.user_id.includes(params.user_id)
      )
    }
    if (params.state !== undefined && params.state !== '') {
      result = result.filter(order => order.state === parseInt(params.state))
    }
    if (params.channel_name) {
      result = result.filter(order => 
        order.channel_name && order.channel_name.toLowerCase().includes(params.channel_name.toLowerCase())
      )
    }
    if (params.channel_order_id) {
      result = result.filter(order => 
        order.channel_order_id && order.channel_order_id.includes(params.channel_order_id)
      )
    }
    if (params.start_time) {
      const start = new Date(params.start_time).getTime()
      result = result.filter(order => {
        const orderTime = new Date(order.create_time).getTime()
        return orderTime >= start
      })
    }
    if (params.end_time) {
      const end = new Date(params.end_time).getTime()
      result = result.filter(order => {
        const orderTime = new Date(order.create_time).getTime()
        return orderTime <= end
      })
    }
    
    // 分页
    const page = params.page || 1
    const pageSize = params.page_size || 20
    const total = result.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = result.slice(start, end)
    
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        total
      }
    }
  },

  // 获取订单详情
  async getOrderDetail(orderId) {
    await delay()
    
    // 从订单列表中查找
    const res = await mockAPI.getOrders({ order_id: orderId.toString() })
    if (res.code === 200 && res.data.list.length > 0) {
      return {
        code: 200,
        message: 'success',
        data: res.data.list[0]
      }
    }
    
    return {
      code: 404,
      message: '订单不存在',
      data: null
    }
  },

  // 补单
  async repairOrder(orderId) {
    await delay()
    
    // 模拟补单接口
    // 根据文档：sign=toLowerCase(md5(orderId + SECRET))
    // 这里简化处理，直接返回成功
    
    // 检查订单是否存在
    const orderRes = await mockAPI.getOrderDetail(orderId)
    if (orderRes.code !== 200 || !orderRes.data) {
      return {
        code: 404,
        message: '订单不存在',
        ret: null
      }
    }
    
    // 只有状态为1（支付成功但还未加币）的订单可以补单
    if (orderRes.data.state !== 1) {
      return {
        code: 400,
        message: '只有支付成功但还未加币的订单可以补单',
        ret: null
      }
    }
    
    // 模拟补单成功，状态变为2（支付成功并且加币成功）
    return {
      code: 0,
      message: '',
      ret: {
        result: 'success'
      }
    }
  },

  // 获取订单配置
  async getOrderConfig() {
    await delay()
    
    // Mock数据 - 订单配置
    // 从localStorage读取配置，如果没有则使用默认值
    const storedConfig = localStorage.getItem('order_config')
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig)
        return {
          code: 200,
          message: 'success',
          data: config
        }
      } catch (e) {
        console.error('Failed to parse stored config:', e)
      }
    }
    
    // 默认配置：30分钟
    const defaultConfig = {
      timeout_value: 30,
      timeout_unit: 'minute'
    }
    
    return {
      code: 200,
      message: 'success',
      data: defaultConfig
    }
  },

  // 更新订单配置
  async updateOrderConfig(data) {
    await delay()
    
    // 保存到localStorage（实际应该调用后端API）
    const config = {
      timeout_value: data.timeout_value,
      timeout_unit: data.timeout_unit,
      update_time: new Date().toISOString()
    }
    localStorage.setItem('order_config', JSON.stringify(config))
    
    return {
      code: 200,
      message: 'success',
      data: config
    }
  },

  // 获取支付方式排序列表（概览）
  async getPaymentSortList(params = {}) {
    await delay()

    if (isDomesticRegion(params)) {
      let list = attachPublicTemplateIds(
        mockPaymentSortListDomestic.map(row => ({ ...row })),
        domesticPublicTemplateIdMap
      )
      if (params.country_code) {
        list = list.filter(item => item.country_code === params.country_code)
      }
      if (params.currency) {
        list = list.filter(item => item.currency === params.currency)
      }
      if (params.payment_env) {
        const want = paymentEnvBucket(params.payment_env)
        list = list.filter(item => paymentEnvBucket(item.payment_env) === want)
      }
      if (params.is_web_cashier !== undefined && params.is_web_cashier !== '') {
        const isWeb = params.is_web_cashier === true || params.is_web_cashier === 'true'
        list = list.filter(item => item.is_web_cashier === isWeb)
      }
      // 国内全局收银台模版固定保留 Web / 原生两条基线，不受历史删除缓存影响
      list = applyPaymentSortOfflineOverrides(list)
      list = mergeCashierTemplateDisplayNames(list)
      list = list.map((item) => ({ ...item, collect_postal_code: false }))
      list = mergeSortListSimulatorFromPersistedStore(list, params)
      const page = params.page || 1
      const pageSize = params.page_size || 10
      const total = list.length
      const start = (page - 1) * pageSize
      return {
        code: 200,
        message: 'success',
        data: {
          list: list.slice(start, start + pageSize),
          total
        }
      }
    }

    let result = attachPublicTemplateIds([...mockPaymentSortListOverseas], overseasPublicTemplateIdMap)

    // 筛选
    if (params.app_id) {
      result = result.filter(item => 
        item.app_id.toLowerCase().includes(params.app_id.toLowerCase())
      )
    }
    if (params.country_code) {
      result = result.filter(item => item.country_code === params.country_code)
    }
    if (params.currency) {
      result = result.filter(item => item.currency === params.currency)
    }
    if (params.payment_env) {
      const want = paymentEnvBucket(params.payment_env)
      result = result.filter(item => paymentEnvBucket(item.payment_env) === want)
    }
    if (params.is_web_cashier !== undefined) {
      const isWeb = params.is_web_cashier === true || params.is_web_cashier === 'true'
      result = result.filter(item => item.is_web_cashier === isWeb)
    }

    result = applyPaymentSortDeletedFilter(result)
    result = applyPaymentSortOfflineOverrides(result)
    result = mergeCashierTemplateDisplayNames(result)
    result = mergeSortListCollectPostalFromPaymentInfo(result)
    result = mergeSortListCollectPostalFromPersistedStore(result, params)
    result = mergeSortListSimulatorFromPersistedStore(result, params)

    // 分页
    const page = params.page || 1
    const pageSize = params.page_size || 10
    const total = result.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = result.slice(start, end)
    
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        total
      }
    }
  },

  /** 收银台模版下线（Mock：写入 localStorage，列表刷新后仍为已下线） */
  async setCashierTemplateOffline(payload) {
    await delay()
    const key = paymentSortRowKey({
      app_id: payload.app_id,
      country_code: payload.country_code,
      currency: payload.currency,
      payment_env: payload.payment_env,
      is_web_cashier: !!payload.is_web_cashier
    })
    const set = readPaymentSortOfflineKeys()
    set.add(key)
    writePaymentSortOfflineKeys(set)
    // 默认模版被下线时，移除默认指向，避免回退到不可用模版
    const scopeParams = {
      region: payload.region || 'overseas',
      scenario: payload.scenario || 'global'
    }
    if (getDefaultTemplateKeyForScope(scopeParams) === key) {
      setDefaultTemplateKeyForScope(scopeParams, '')
    }
    return {
      code: 200,
      message: 'success',
      data: {}
    }
  },

  /** 收银台模版重新发布（Mock：从 localStorage 离线集合移除） */
  async setCashierTemplateOnline(payload) {
    await delay()
    const key = paymentSortRowKey({
      app_id: payload.app_id,
      country_code: payload.country_code,
      currency: payload.currency,
      payment_env: payload.payment_env,
      is_web_cashier: !!payload.is_web_cashier
    })
    const set = readPaymentSortOfflineKeys()
    set.delete(key)
    writePaymentSortOfflineKeys(set)
    return {
      code: 200,
      message: 'success',
      data: {}
    }
  },

  /** 保存收银台模版展示名称（Mock：localStorage；留空则恢复为系统自动模版标识） */
  async saveCashierTemplateDisplayName(payload = {}) {
    await delay()
    const rowKey = paymentSortRowKey({
      app_id: payload.app_id,
      country_code: payload.country_code,
      currency: payload.currency,
      payment_env: payload.payment_env,
      is_web_cashier: !!payload.is_web_cashier
    })
    const name = String(payload.cashier_template_name || '').trim()
    const map = readPaymentSortDisplayNames()
    if (!name) {
      delete map[rowKey]
    } else {
      map[rowKey] = name
    }
    writePaymentSortDisplayNames(map)
    return {
      code: 200,
      message: 'success',
      data: {}
    }
  },

  /** 设为默认收银台模版（同一 scope 下仅允许一个默认） */
  async setCashierTemplateDefault(payload = {}) {
    await delay()
    const key = paymentSortRowKey({
      app_id: payload.app_id,
      country_code: payload.country_code,
      currency: payload.currency,
      payment_env: payload.payment_env,
      is_web_cashier: !!payload.is_web_cashier
    })
    setDefaultTemplateKeyForScope(
      {
        region: payload.region || 'overseas',
        scenario: payload.scenario || 'global'
      },
      key
    )
    return {
      code: 200,
      message: 'success',
      data: { default_template_key: key }
    }
  },

  /** 删除收银台模版（Mock：写入删除集合并清理关联状态） */
  async deleteCashierTemplate(payload = {}) {
    await delay()
    const rowKey = paymentSortRowKey({
      app_id: payload.app_id,
      country_code: payload.country_code,
      currency: payload.currency,
      payment_env: payload.payment_env,
      is_web_cashier: !!payload.is_web_cashier
    })

    const deleted = readPaymentSortDeletedKeys()
    deleted.add(rowKey)
    writePaymentSortDeletedKeys(deleted)

    try {
      const names = readPaymentSortDisplayNames()
      if (names && names[rowKey]) {
        delete names[rowKey]
        writePaymentSortDisplayNames(names)
      }
    } catch {
      // ignore
    }

    const offline = readPaymentSortOfflineKeys()
    if (offline.has(rowKey)) {
      offline.delete(rowKey)
      writePaymentSortOfflineKeys(offline)
    }

    const scope = {
      region: payload.region || 'overseas',
      scenario: payload.scenario || 'global'
    }
    if (getDefaultTemplateKeyForScope(scope) === rowKey) {
      setDefaultTemplateKeyForScope(scope, '')
    }

    try {
      const raw = localStorage.getItem(PAYMENT_SORT_CONFIG_STORAGE_KEY)
      const mapObj = raw ? JSON.parse(raw) : {}
      const storageKey = [
        scope.region,
        payload.app_id || '',
        payload.country_code || '',
        payload.currency || '',
        payload.payment_env || '',
        payload.is_web_cashier ? 'web' : 'nonweb'
      ].join('|')
      if (mapObj && typeof mapObj === 'object' && mapObj[storageKey]) {
        delete mapObj[storageKey]
        localStorage.setItem(PAYMENT_SORT_CONFIG_STORAGE_KEY, JSON.stringify(mapObj))
      }
    } catch {
      // ignore storage cleanup errors in mock mode
    }

    return {
      code: 200,
      message: 'success',
      data: {}
    }
  },

  /**
   * 按条件解析收银台模版：
   * 1. 先精确命中；
   * 2. 未命中时回退支付场景中配置的「默认公共模版」；
   * 3. 再依次尝试场景中已关联的其它公共模版（已发布）。
   */
  async resolveCashierTemplate(params = {}) {
    await delay()
    const listRes = await this.getPaymentSortList({
      region: params.region,
      scenario: params.scenario,
      page: 1,
      page_size: 1000
    })
    if (listRes.code !== 200) return listRes
    const list = listRes.data.list || []
    const exact = list.find(
      item =>
        mockCashierTemplateRowPublished(item) &&
        (!params.country_code || item.country_code === params.country_code) &&
        (!params.currency || item.currency === params.currency) &&
        (!params.payment_env ||
          paymentEnvBucket(item.payment_env) === paymentEnvBucket(params.payment_env)) &&
        (params.is_web_cashier === undefined || item.is_web_cashier === !!params.is_web_cashier)
    )
    if (exact) {
      return {
        code: 200,
        message: 'success',
        data: {
          matched_by: 'exact',
          template: exact
        }
      }
    }

    let scenario = null
    if (params.scenario) {
      const { getScenarioByKey } = await import('@/utils/scenarios')
      scenario = getScenarioByKey(params.scenario, params.region || 'overseas')
    }

    const tplId = row => getCashierPublicTemplateId(row)

    if (scenario) {
      const defId = (scenario.cashier_default_public_template_id || '').trim()
      if (defId) {
        const byDef = list.find(
          item => mockCashierTemplateRowPublished(item) && tplId(item) === defId
        )
        if (byDef) {
          return {
            code: 200,
            message: 'success',
            data: {
              matched_by: 'scenario_default',
              template: byDef
            }
          }
        }
      }
      const linked = Array.isArray(scenario.cashier_public_template_ids)
        ? scenario.cashier_public_template_ids
        : []
      for (const id of linked) {
        const sid = String(id || '').trim()
        if (!sid) continue
        const row = list.find(
          item => mockCashierTemplateRowPublished(item) && tplId(item) === sid
        )
        if (row) {
          return {
            code: 200,
            message: 'success',
            data: {
              matched_by: 'scenario_linked',
              template: row
            }
          }
        }
      }
    }

    return {
      code: 404,
      message: '未命中且无可用场景兜底模版',
      data: null
    }
  },

  async getScenarios(region = 'overseas') {
    await delay()
    const { getAllScenarios } = await import('@/utils/scenarios')
    return {
      code: 200,
      message: 'success',
      data: getAllScenarios(region)
    }
  },

  async createScenario(data, region = 'overseas') {
    await delay()
    try {
      const { createScenario } = await import('@/utils/scenarios')
      const scenario = createScenario(data, region)
      return { code: 200, message: 'success', data: scenario }
    } catch (e) {
      return { code: 400, message: e.message, data: null }
    }
  },

  async updateScenario(id, data, region = 'overseas') {
    await delay()
    try {
      const { updateScenarioById } = await import('@/utils/scenarios')
      const scenario = updateScenarioById(id, data, region)
      return { code: 200, message: 'success', data: scenario }
    } catch (e) {
      return { code: 400, message: e.message, data: null }
    }
  },

  async deleteScenario(id, region = 'overseas') {
    await delay()
    try {
      const { deleteScenarioById } = await import('@/utils/scenarios')
      deleteScenarioById(id, region)
      return { code: 200, message: 'success', data: {} }
    } catch (e) {
      return { code: 400, message: e.message, data: null }
    }
  },

  // 获取币种列表
  async getCurrencies() {
    await delay()
    return {
      code: 200,
      message: 'success',
      data: mockCurrencies
    }
  },

  // 获取语言列表
  async getLanguages() {
    await delay()
    return {
      code: 200,
      message: 'success',
      data: mockLanguages
    }
  },

  // 获取计费点配置概览
  async getGoodsConfig(params = {}) {
    await delay()
    
    // 获取所有商品数据
    const allGoods = [...mockGoods]
    
    // 为每个商品添加game_name
    const goodsWithGameName = allGoods.map(goods => {
      const app = mockApps.find(app => app.app_id.toLowerCase() === goods.app_id.toLowerCase())
      return {
        ...goods,
        game_name: app ? app.game_name : ''
      }
    })
    
    // 按应用分组统计
    const appStatsMap = new Map()
    
    goodsWithGameName.forEach(goods => {
      const appId = goods.app_id
      if (!appStatsMap.has(appId)) {
        const app = mockApps.find(a => a.app_id.toLowerCase() === appId.toLowerCase())
        appStatsMap.set(appId, {
          app_id: appId,
          game_name: app ? app.game_name : '',
          online_count: 0,
          currency_set: new Set(),
          country_set: new Set()
        })
      }
      
      const stats = appStatsMap.get(appId)
      if (goods.status === 1) {
        stats.online_count++
      }
      if (goods.currency) {
        stats.currency_set.add(goods.currency)
      }
      
      // 统计国家：从prices数组中提取country_code，或从goods的country_code字段
      if (goods.prices && goods.prices.length > 0) {
        goods.prices.forEach(price => {
          if (price.country_code) {
            stats.country_set.add(price.country_code)
          }
        })
      } else if (goods.country_code) {
        stats.country_set.add(goods.country_code)
      }
    })
    
    // 转换为数组
    let result = Array.from(appStatsMap.values()).map(stats => ({
      app_id: stats.app_id,
      game_name: stats.game_name,
      online_count: stats.online_count,
      country_count: stats.country_set.size,
      currency_count: stats.currency_set.size
    }))
    
    // 按游戏名称筛选
    if (params.game_name) {
      result = result.filter(item => item.game_name === params.game_name)
    }
    
    // 排序：先按游戏名，再按app_id
    result.sort((a, b) => {
      if (a.game_name !== b.game_name) {
        return a.game_name.localeCompare(b.game_name)
      }
      return a.app_id.localeCompare(b.app_id)
    })
    
    // 分页
    const page = params.page || 1
    const pageSize = params.page_size || 10
    const total = result.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = result.slice(start, end)
    
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        total
      }
    }
  },

  // 获取账单信息收集配置列表
  async getPaymentInfoConfigList(params = {}) {
    await delay()

    // 筛选
    let result = [...mockPaymentInfoConfigListRows]
    if (params.app_id) {
      result = result.filter(item => item.app_id.includes(params.app_id))
    }
    if (params.country_code) {
      result = result.filter(item => item.country_code === params.country_code)
    }
    if (params.currency) {
      result = result.filter(item => item.currency === params.currency)
    }
    if (params.payment_env) {
      result = result.filter(item => item.payment_env === params.payment_env)
    }
    if (params.is_web_cashier !== undefined) {
      const isWeb = params.is_web_cashier === true || params.is_web_cashier === 'true'
      result = result.filter(item => item.is_web_cashier === isWeb)
    }
    
    // 分页
    const page = params.page || 1
    const pageSize = params.page_size || 10
    const total = result.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = result.slice(start, end)
    
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        total
      }
    }
  },

  // 获取账单信息收集配置
  async getPaymentInfoConfig(params) {
    await delay()
    
    // 从localStorage读取配置，如果没有则使用默认值
    const isWeb = params.is_web_cashier === true || params.is_web_cashier === 'true'
    const webKey = isWeb ? 'web' : 'nonweb'
    const key = `payment_info_config_${params.app_id}_${params.country_code}_${params.currency}_${params.payment_env}_${webKey}`
    const storedConfig = localStorage.getItem(key)
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig)
        return {
          code: 200,
          message: 'success',
          data: config
        }
      } catch (e) {
        console.error('Failed to parse stored config:', e)
      }
    }

    // 先尝试带is_web_cashier的key，如果不存在则使用旧key（向后兼容）
    const configKeyWithWeb = `${params.app_id}_${params.currency}_${params.country_code}_${params.payment_env}_${webKey}`
    const configKeyWithoutWeb = `${params.app_id}_${params.currency}_${params.country_code}_${params.payment_env}`
    const config = mockPaymentInfoDetailMap[configKeyWithWeb] || mockPaymentInfoDetailMap[configKeyWithoutWeb] || {
      app_id: params.app_id,
      country_code: params.country_code,
      currency: params.currency,
      payment_env: params.payment_env,
      is_web_cashier: isWeb,
      collect_postal_code: false,
      collect_email: false
    }
    
    return {
      code: 200,
      message: 'success',
      data: config
    }
  },

  // 更新账单信息收集配置
  async updatePaymentInfoConfig(data) {
    await delay()
    
    // 保存到localStorage（实际应该调用后端API）
    const isWeb = data.is_web_cashier === true || data.is_web_cashier === 'true'
    const webKey = isWeb ? 'web' : 'nonweb'
    const key = `payment_info_config_${data.app_id}_${data.country_code}_${data.currency}_${data.payment_env}_${webKey}`
    const config = {
      app_id: data.app_id,
      country_code: data.country_code,
      currency: data.currency,
      payment_env: data.payment_env,
      is_web_cashier: isWeb,
      collect_postal_code: data.collect_postal_code || false,
      collect_email: data.collect_email || false,
      update_time: new Date().toISOString()
    }
    localStorage.setItem(key, JSON.stringify(config))
    
    return {
      code: 200,
      message: 'success',
      data: config
    }
  },

  // 获取渠道模板列表
  async getChannelTemplates(params = {}) {
    await delay()
    let templates = [...mockChannelTemplates]
    if (isDomesticRegion(params)) {
      templates = templates.filter(t => DOMESTIC_CHANNEL_NAMES.has(String(t.channel_name || '').toLowerCase()))
    } else {
      templates = templates.filter(t =>
        OVERSEAS_PAYMENT_CHANNEL_NAMES.has(String(t.channel_name || '').toLowerCase())
      )
    }
    const list = templates.map(template => {
      const name = String(template.channel_name || '').toLowerCase()
      let display_name = template.display_name
      if (isDomesticRegion(params)) {
        if (name === 'alipay') display_name = '支付宝'
        if (name === 'wechat') display_name = '微信支付'
      }
      return {
        channel_name: template.channel_name,
        display_name
      }
    })
    return {
      code: 200,
      message: 'success',
      data: { list }
    }
  },

  // 根据渠道名称获取渠道参数模板
  async getChannelTemplate(channelName) {
    await delay()
    const template = mockChannelTemplates.find(t => t.channel_name === channelName)
    if (!template) {
      return {
        code: 404,
        message: '渠道模板不存在',
        data: null
      }
    }
    return {
      code: 200,
      message: 'success',
      data: template
    }
  }
}

