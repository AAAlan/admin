/**
 * 支付中心（海外）Web 支付场景独立 XML，结构对齐 config/web_saki.xml。
 * 数据来源：scenarios.js 海外 is_web_cashier 场景 + mock 商品/支付方式/收银台 Web 行。
 * 运行：npm run export:web-overseas
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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

const [{ SEED }, mock] = await Promise.all([
  import('../src/utils/scenarios.js'),
  import('../src/api/mock.js')
])

const {
  mockGoods,
  mockPaymentMethodsList,
  mockPaymentSortListOverseas,
  filterOverseasPaymentMethods
} = mock

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const webSakiPath = join(root, 'config', 'web_saki.xml')
const outDir = join(root, 'config')
const outFile = join(outDir, 'web_silver_overseas.xml')

function escapeXml(s) {
  if (s == null || s === '') return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function readWebSakiVersion() {
  try {
    const raw = readFileSync(webSakiPath, 'utf8')
    const m = raw.match(/<web\s+[^>]*version="(\d+)"/)
    return m ? m[1] : '1'
  } catch {
    return '1'
  }
}

const WEB_LANGS = ['en', 'zh', 'ko']

function currencySymbol(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'USD') return '$'
  if (c === 'GBP') return '£'
  if (c === 'EUR') return '€'
  if (c === 'JPY') return '¥'
  if (c === 'KRW') return '₩'
  if (c === 'CAD') return 'C$'
  if (c === 'AUD') return 'A$'
  return ''
}

function formatPrice(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '0.00'
  return x.toFixed(2)
}

const overseasWebScenarios = SEED.overseas.filter(s => s.is_web_cashier)

const goodsOverseas = mockGoods.filter(
  g =>
    String(g.currency || '').toUpperCase() !== 'CNY' &&
    !String(g.app_id || '').toLowerCase().endsWith('_cn')
)

const methodsOverseas = filterOverseasPaymentMethods(mockPaymentMethodsList)

const enablePayChannel = [
  ...new Set(methodsOverseas.map(m => String(m.channel_id || '').split('_')[0] || m.pay_type).filter(Boolean))
].join(',')

const webSortRows = mockPaymentSortListOverseas.filter(r => r.is_web_cashier)
const enableCountry = [
  ...new Set(
    webSortRows.map(r => r.country_code).filter(c => c && String(c).toUpperCase() !== 'CN')
  )
].join(',')

/** 与 web_saki 中 sdkPlatform 命名对齐的占位 */
const scenarioPlatform = {
  ios_web: { name: 'pc_en', sdkPlatform: 'apple_en', scenarioKey: 'ios_web' },
  android_web: { name: 'pc_en', sdkPlatform: 'googleplay_en', scenarioKey: 'android_web' },
  windows_web: { name: 'pc_en', sdkPlatform: 'windows_web', scenarioKey: 'windows_web' }
}

function webProductsXml() {
  const lines = []
  for (const g of goodsOverseas) {
    const sym = currencySymbol(g.currency)
    const price = formatPrice(g.price)
    for (const lang of WEB_LANGS) {
      lines.push(
        `      <webProduct id="${g.id}" price="${price}" currency="${escapeXml(g.currency)}" currencySymbol="${escapeXml(sym)}" discount="1.00" discountPrice="${price}" lang="${lang}" online="${g.status === 1 ? '1' : '0'}"/>`
      )
    }
  }
  return lines.join('\n')
}

const productsBlock = webProductsXml()

const version = readWebSakiVersion()

const platformBlocks = overseasWebScenarios
  .map(s => {
    const map = scenarioPlatform[s.key] || {
      name: 'pc_en',
      sdkPlatform: `${s.key}_en`,
      scenarioKey: s.key
    }
    return `  <platform name="${escapeXml(map.name)}" serverNode="US" sdkPlatform="${escapeXml(map.sdkPlatform)}" pay_switch="1" default_currency="USD" default_lang="en" scenarioKey="${escapeXml(map.scenarioKey)}" scenarioDesc="${escapeXml(s.description)}"> 
    <!-- 开放的国家, 多个用逗号隔开（来自海外 Web 收银台模版 Mock 聚合） -->  
    <enableCountry>${escapeXml(enableCountry || 'US,JP,KR,GB,DE,CA,AU')}</enableCountry>  
    <!-- 开放的支付方式, 多个用逗号隔开（来自海外支付方式 Mock，不含国内微信/支付宝） -->  
    <enablePayChannel>${escapeXml(enablePayChannel || 'adyen,stripe,paypal,apple,google')}</enablePayChannel>  
    <webProducts> 
${productsBlock}
    </webProducts>  
    <whitelist/>  
    <blacklist/> 
  </platform>`
  })
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>

<!-- 支付中心（海外）Web 支付场景：单游戏 Silver（sdk saki），结构参考同目录 web_saki.xml -->
<web version="${escapeXml(version)}" gameId="Silver" sdkAppId="Silver" region="overseas" configScope="web_cashier_only"> 
${platformBlocks}
</web>
`

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, xml, 'utf8')
console.log(`Wrote ${outFile}`)
