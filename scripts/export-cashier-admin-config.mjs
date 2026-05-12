/**
 * 将 Mock / 种子配置按「管理后台侧栏结构」导出为两个文件：海外 / 国内。
 * 运行：npm run export:config
 *
 * 输出：
 * - config/cashier-admin-config-silver-overseas.json
 * - config/cashier-admin-config-silver-domestic.json
 *
 * games.Silver 子结构与 Layout 侧栏一致：
 * - paymentBasics：支付渠道/支付方式等基础数据（渠道、渠道模板、支付方式、币种、语言）
 * - scenarioPlatform：支付场景管理（场景种子、IAP 计费点、商品）
 * - cashier：收银台模版 / 账单信息收集（仅海外路由齐全；国内仅有默认收银台行）
 * - gameApplications：游戏与应用（仅海外有独立路由；国内可省略或给空对象）
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const _lsMem = new Map()
globalThis.localStorage = {
  getItem(k) {
    return _lsMem.has(k) ? _lsMem.get(k) : null
  },
  setItem(k, v) {
    _lsMem.set(k, String(v))
  },
  removeItem(k) {
    _lsMem.delete(k)
  }
}

const [{ SEED }, { IAP_GOODS_ROWS }, mock] = await Promise.all([
  import('../src/utils/scenarios.js'),
  import('../src/utils/iapGoods.js'),
  import('../src/api/mock.js')
])

const {
  mockGames,
  mockApps,
  mockGoods,
  mockPaymentChannels,
  mockChannelTemplates,
  mockCurrencies,
  mockLanguages,
  mockPaymentMethodsList,
  mockPaymentSortListOverseas,
  mockPaymentSortListDomestic,
  mockPaymentInfoConfigListRows,
  mockPaymentInfoDetailMap,
  filterOverseasPaymentMethods
} = mock

const DOMESTIC_CHANNEL_NAMES = new Set(['alipay', 'wechat'])
const OVERSEAS_CHANNEL_NAMES = new Set(['adyen', 'stripe', 'paypal'])

function filterDomesticChannels(list) {
  return list.filter(c => DOMESTIC_CHANNEL_NAMES.has(String(c.channel_name || '').toLowerCase()))
}

function filterDomesticPaymentMethods(list) {
  return list.filter(m => {
    const id = String(m.channel_id || '').toLowerCase()
    return id.startsWith('alipay_') || id.startsWith('wechat_')
  })
}

function filterOverseasChannels(list) {
  return list.filter(c => OVERSEAS_CHANNEL_NAMES.has(String(c.channel_name || '').toLowerCase()))
}

function filterChannelTemplates(list, allowed) {
  return list.filter(t => allowed.has(String(t.channel_name || '').toLowerCase()))
}

function scenarioKeySet(region) {
  const seed = SEED[region] || []
  return new Set(seed.map(s => s.key))
}

function filterIapGoodsByRegion(rows, region) {
  const keys = scenarioKeySet(region)
  return rows.filter(r => keys.has(r.scenario))
}

function goodsOverseas(goods) {
  return goods.filter(
    g =>
      String(g.currency || '').toUpperCase() !== 'CNY' &&
      !String(g.app_id || '').toLowerCase().endsWith('_cn')
  )
}

function goodsDomestic(goods) {
  return goods.filter(
    g =>
      String(g.currency || '').toUpperCase() === 'CNY' ||
      String(g.app_id || '').toLowerCase().endsWith('_cn')
  )
}

function filterGamesByAppPredicate(games, appPredicate) {
  return games
    .map(g => ({
      ...g,
      apps: (g.apps || []).filter(appPredicate)
    }))
    .filter(g => g.apps.length > 0)
}

function isCnApp(a) {
  return (
    String(a.country_code || '').toUpperCase() === 'CN' ||
    String(a.app_id || '').toLowerCase().endsWith('_cn')
  )
}

function filterFlatAppsDomestic(apps) {
  return apps.filter(isCnApp)
}

function filterPaymentInfoRows(rows, overseas) {
  return rows.filter(r =>
    overseas ? String(r.country_code || '').toUpperCase() !== 'CN' : String(r.country_code || '').toUpperCase() === 'CN'
  )
}

function filterPaymentInfoDetailMap(map, overseas) {
  const out = {}
  for (const [k, v] of Object.entries(map || {})) {
    const cn = String(v.country_code || '').toUpperCase() === 'CN'
    if (overseas ? !cn : cn) out[k] = v
  }
  return out
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'config')
const SILVER_GAME_ID = 'Silver'

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

function buildSilverOverseas() {
  const channels = filterOverseasChannels(mockPaymentChannels)
  const methods = filterOverseasPaymentMethods(mockPaymentMethodsList)
  const templates = filterChannelTemplates(mockChannelTemplates, OVERSEAS_CHANNEL_NAMES)

  return {
    paymentBasics: {
      paymentChannels: channels,
      channelTemplates: templates,
      paymentMethods: methods,
      currencies: mockCurrencies,
      languages: mockLanguages
    },
    scenarioPlatform: {
      scenarios: SEED.overseas,
      iapGoods: filterIapGoodsByRegion(IAP_GOODS_ROWS, 'overseas'),
      goods: goodsOverseas(mockGoods)
    },
    cashier: {
      sortTemplates: mockPaymentSortListOverseas,
      paymentInfoCollection: {
        listRows: filterPaymentInfoRows(mockPaymentInfoConfigListRows, true),
        detailByKey: filterPaymentInfoDetailMap(mockPaymentInfoDetailMap, true)
      }
    },
    gameApplications: {
      games: mockGames,
      apps: mockApps
    },
    orderConfigDefault: {
      timeout_value: 30,
      timeout_unit: 'minute'
    }
  }
}

function buildSilverDomestic() {
  const channels = filterDomesticChannels(mockPaymentChannels).map(localizeDomesticChannel)
  const methods = filterDomesticPaymentMethods(mockPaymentMethodsList).map(localizeDomesticMethod)
  const templates = filterChannelTemplates(mockChannelTemplates, DOMESTIC_CHANNEL_NAMES)

  return {
    paymentBasics: {
      paymentChannels: channels,
      channelTemplates: templates,
      paymentMethods: methods,
      currencies: mockCurrencies,
      languages: mockLanguages
    },
    scenarioPlatform: {
      scenarios: SEED.domestic,
      iapGoods: filterIapGoodsByRegion(IAP_GOODS_ROWS, 'domestic'),
      goods: goodsDomestic(mockGoods)
    },
    cashier: {
      sortTemplates: [...mockPaymentSortListDomestic],
      paymentInfoCollection: {
        listRows: filterPaymentInfoRows(mockPaymentInfoConfigListRows, false),
        detailByKey: filterPaymentInfoDetailMap(mockPaymentInfoDetailMap, false)
      }
    },
    gameApplications: {
      games: filterGamesByAppPredicate(mockGames, isCnApp),
      apps: filterFlatAppsDomestic(mockApps)
    },
    orderConfigDefault: {
      timeout_value: 30,
      timeout_unit: 'minute'
    }
  }
}

function writePayload(region, silverBody) {
  const isOverseas = region === 'overseas'
  const suffix = isOverseas ? 'overseas' : 'domestic'
  const file = join(outDir, `cashier-admin-config-silver-${suffix}.json`)
  const payload = {
    _meta: {
      format: 'cashier-admin-config',
      version: 3,
      region,
      gameId: SILVER_GAME_ID,
      generatedAt: new Date().toISOString(),
      description: isOverseas
        ? 'Silver 游戏 · 支付中心（海外）静态配置。games.Silver 与侧栏「支付渠道管理 / 支付方式管理 / 支付场景管理」一致；cashier、gameApplications 对应海外侧额外能力。'
        : 'Silver 游戏 · 支付中心（国内）静态配置。games.Silver 与侧栏「支付渠道管理 / 支付方式管理 / 支付场景管理」一致；数据已按国内渠道/场景过滤。'
    },
    games: {
      [SILVER_GAME_ID]: silverBody
    }
  }
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${file}`)
}

mkdirSync(outDir, { recursive: true })
writePayload('overseas', buildSilverOverseas())
writePayload('domestic', buildSilverDomestic())
