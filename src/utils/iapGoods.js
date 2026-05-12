export const IAP_GOODS_ROWS = [
  { gameGoodsId: 20000021, goodsName: '新拓名6', sku: 'com.he.silver.diamond6', skuType: '消耗型', scenario: 'ios_iap' },
  { gameGoodsId: 20100006, goodsName: '每周6充值卡', sku: 'com.he.silver.weekly6', skuType: '订阅型', scenario: 'ios_iap' },
  { gameGoodsId: 20000022, goodsName: '钻石B', sku: 'com.he.silver.diamondB', skuType: '消耗型', scenario: 'ios_iap' },
  { gameGoodsId: 20000023, goodsName: '钻石C', sku: 'com.he.silver.diamondC', skuType: '消耗型', scenario: 'ios_iap' },
  { gameGoodsId: 20000024, goodsName: '月卡', sku: 'com.he.silver.monthly', skuType: '订阅型', scenario: 'ios_iap' },
  { gameGoodsId: 20000025, goodsName: '季卡', sku: 'com.he.silver.quarterly', skuType: '订阅型', scenario: 'ios_iap' },
  { gameGoodsId: 20000026, goodsName: '限定礼包A', sku: 'com.he.silver.giftA', skuType: '非消耗型', scenario: 'ios_iap' },
  { gameGoodsId: 30000001, goodsName: 'Android钻石A', sku: 'com.he.silver.gp.diamondA', skuType: '消耗型', scenario: 'android_iap' },
  { gameGoodsId: 30000002, goodsName: 'Android IAP月卡', sku: 'com.he.silver.gp.monthly', skuType: '订阅型', scenario: 'android_iap' },
  { gameGoodsId: 30000003, goodsName: 'Android钻石B', sku: 'com.he.silver.gp.diamondB', skuType: '消耗型', scenario: 'android_iap' },
  { gameGoodsId: 30000004, goodsName: 'Android季卡', sku: 'com.he.silver.gp.quarterly', skuType: '订阅型', scenario: 'android_iap' },
  { gameGoodsId: 50000001, goodsName: 'PS5钻石包', sku: 'SILVER00001', skuType: '消耗型', scenario: 'psn_iap' },
  { gameGoodsId: 50000002, goodsName: 'PS5月卡', sku: 'SILVER00002', skuType: '订阅型', scenario: 'psn_iap' },
  { gameGoodsId: 50000003, goodsName: 'PS5限定礼包', sku: 'SILVER00003', skuType: '非消耗型', scenario: 'psn_iap' }
]

export function createIapGoodsRows() {
  return IAP_GOODS_ROWS.map(row => ({ ...row }))
}
