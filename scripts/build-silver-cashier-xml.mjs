/**
 * 生成 Silver 单游戏管理后台配置 XML（海外 / 国内两套 region），结构参考 silver.xml。
 * 运行：npm run export:xml
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

const [{ SEED }, { IAP_GOODS_ROWS }, mock, cashierIds] = await Promise.all([
  import('../src/utils/scenarios.js'),
  import('../src/utils/iapGoods.js'),
  import('../src/api/mock.js'),
  import('../src/utils/cashierPublicTemplateId.js')
])

const {
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

const { buildPublicTemplateIdMap, attachPublicTemplateIds, getCashierPublicTemplateId } = cashierIds

const overseasPublicTemplateIdMap = buildPublicTemplateIdMap(mockPaymentSortListOverseas)
const domesticPublicTemplateIdMap = buildPublicTemplateIdMap(mockPaymentSortListDomestic)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const silverXmlPath = join(root, 'silver.xml')
const outDir = join(root, 'config')
const outFile = join(outDir, 'silver-cashier-admin.xml')

function escapeXml(s) {
  if (s == null || s === '') return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function readSilverGameVersion() {
  try {
    const raw = readFileSync(silverXmlPath, 'utf8')
    const m = raw.match(/<game\s+[^>]*version="(\d+)"/)
    return m ? m[1] : '39'
  } catch {
    return '39'
  }
}

const DOMESTIC_CHANNEL = new Set(['alipay', 'wechat'])

function isDomesticApp(app) {
  const id = String(app.app_id || '').toLowerCase()
  const cc = String(app.country_code || '').toUpperCase()
  return cc === 'CN' || id.endsWith('_cn')
}

const appsDomestic = mockApps.filter(isDomesticApp)
const appsOverseas = mockApps.filter(a => !isDomesticApp(a))

const channelsDomestic = mockPaymentChannels.filter(c =>
  DOMESTIC_CHANNEL.has(String(c.channel_name || '').toLowerCase())
)
const channelsOverseas = mockPaymentChannels.filter(
  c => !DOMESTIC_CHANNEL.has(String(c.channel_name || '').toLowerCase())
)

const methodsDomestic = mockPaymentMethodsList.filter(m => {
  const id = String(m.channel_id || '').toLowerCase()
  return id.startsWith('alipay_') || id.startsWith('wechat_')
})
const methodsOverseas = filterOverseasPaymentMethods(mockPaymentMethodsList)

const goodsDomestic = mockGoods.filter(
  g =>
    String(g.currency || '').toUpperCase() === 'CNY' ||
    String(g.app_id || '').toLowerCase().endsWith('_cn')
)
const goodsOverseas = mockGoods.filter(
  g =>
    String(g.currency || '').toUpperCase() !== 'CNY' &&
    !String(g.app_id || '').toLowerCase().endsWith('_cn')
)

const paymentInfoRowsDomestic = mockPaymentInfoConfigListRows.filter(
  r => String(r.country_code || '').toUpperCase() === 'CN'
)
const paymentInfoRowsOverseas = mockPaymentInfoConfigListRows.filter(
  r => String(r.country_code || '').toUpperCase() !== 'CN'
)

function payMethodsFromSortRows(rows, idMap) {
  const lines = []
  const enriched = attachPublicTemplateIds(rows, idMap)
  for (const row of enriched) {
    const area = escapeXml(row.country_code)
    const env = escapeXml(row.payment_env)
    const web = row.is_web_cashier ? 'true' : 'false'
    const payType = escapeXml(`template_${getCashierPublicTemplateId(row)}`)
    lines.push(`    <payArea area="${area}">`)
    lines.push(`      <payEnv gameEnv="${env}" web="${web}">`)
    lines.push(`        <payTypeInfo payType="${payType}">`)
    lines.push(`          <recommend>${row.recommended_count > 0 ? 'true' : 'false'}</recommend>`)
    lines.push(`          <name>${escapeXml(`${row.app_id} ${row.currency} 收银台`)}</name>`)
    lines.push(
      `          <desc>${escapeXml(`method_count=${row.method_count}; recommended_count=${row.recommended_count}; publish_status=${row.publish_status}`)}</desc>`
    )
    lines.push(`          <webUrl/>`)
    lines.push(`          <icon/>`)
    lines.push(`        </payTypeInfo>`)
    lines.push(`      </payEnv>`)
    lines.push(`    </payArea>`)
  }
  return lines.join('\n')
}

function appsXml(apps) {
  return apps
    .map(
      a => `    <app app_id="${escapeXml(a.app_id)}" game_name="Silver" platform="${escapeXml(a.platform)}" country_code="${escapeXml(a.country_code)}" pay_switch="${a.pay_switch ? 'true' : 'false'}"/>`
    )
    .join('\n')
}

function channelsXml(list) {
  return list
    .map(
      c =>
        `    <payment channelName="${escapeXml(c.channel_name)}" channel_id="${escapeXml(c.channel_id)}" pay_name="${escapeXml(c.pay_name)}" status="${c.status ? 'true' : 'false'}"/>`
    )
    .join('\n')
}

function methodsXml(list) {
  return list
    .map(
      m =>
        `    <payMethod id="${m.id}" pay_name="${escapeXml(m.pay_name)}" pay_type="${escapeXml(m.pay_type)}" channel_id="${escapeXml(m.channel_id)}" status="${escapeXml(m.status)}"/>`
    )
    .join('\n')
}

function goodsXml(list) {
  return list
    .map(
      g =>
        `      <item id="${g.id}" app_id="${escapeXml(g.app_id)}" name="${escapeXml(g.name)}" game_product_id="${escapeXml(g.game_product_id)}" price="${g.price}" currency="${escapeXml(g.currency)}" status="${g.status}"/>`
    )
    .join('\n')
}

function iapRowsXml(rows) {
  return rows
    .map(
      r =>
        `    <iapSku gameGoodsId="${r.gameGoodsId}" goodsName="${escapeXml(r.goodsName)}" sku="${escapeXml(r.sku)}" skuType="${escapeXml(r.skuType)}" scenario="${escapeXml(r.scenario)}"/>`
    )
    .join('\n')
}

function scenariosXml(arr) {
  return arr
    .map(
      s =>
        `    <scenario id="${s.id}" key="${escapeXml(s.key)}" platform="${escapeXml(s.platform)}" payment_env="${escapeXml(s.payment_env)}" is_web_cashier="${s.is_web_cashier ? 'true' : 'false'}"><description>${escapeXml(s.description)}</description></scenario>`
    )
    .join('\n')
}

function paymentInfoRowsXml(rows) {
  return rows
    .map(
      r =>
        `    <billingCollect app_id="${escapeXml(r.app_id)}" country="${escapeXml(r.country_code)}" currency="${escapeXml(r.currency)}" payment_env="${escapeXml(r.payment_env)}" web="${r.is_web_cashier ? 'true' : 'false'}" collect_postal="${r.collect_postal_code}" collect_email="${r.collect_email}"/>`
    )
    .join('\n')
}

const silverVersion = readSilverGameVersion()

const domesticSortXml = payMethodsFromSortRows(
  mockPaymentSortListDomestic,
  domesticPublicTemplateIdMap
)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<game version="${escapeXml(silverVersion)}" id="Silver" logicalGame="Silver" exportedFrom="cashier-admin-mock">
  <note><![CDATA[本文件由 npm run export:xml 生成。单游戏 Silver；region=overseas / domestic 为管理后台两套数据切片。密钥类字段在后台 mock 中为演示占位，结构与 silver.xml 不完全一致处见 silverXmlFieldsNotInAdmin。]]></note>

  <shared>
    <cubeKey note="silver.xml 有，后台当前无此配置项"/>
    <cubeAppId note="silver.xml 有，后台当前无此配置项"/>
    <cubeServerKeyId note="silver.xml 有，后台当前无此配置项"/>
    <currencies>
${mockCurrencies.map(c => `      <currency code="${escapeXml(c.code)}" name="${escapeXml(c.name)}"/>`).join('\n')}
    </currencies>
    <languages>
${mockLanguages.map(l => `      <language code="${escapeXml(l.code)}" name="${escapeXml(l.name)}"/>`).join('\n')}
    </languages>
    <iapGoods>
${iapRowsXml(IAP_GOODS_ROWS)}
    </iapGoods>
    <channelTemplates>
${mockChannelTemplates
  .map(
    t =>
      `      <channelTemplate channel_name="${escapeXml(t.channel_name)}" display_name="${escapeXml(t.display_name)}"/>`
  )
  .join('\n')}
    </channelTemplates>
    <paymentInfoDetailKeys count="${Object.keys(mockPaymentInfoDetailMap).length}" note="详情见 mockPaymentInfoDetailMap，此处省略展开"/>
  </shared>

  <region name="overseas">
    <scenarioSeeds>
${scenariosXml(SEED.overseas)}
    </scenarioSeeds>
    <apps>
${appsXml(appsOverseas)}
    </apps>
    <goodsCatalog>
${goodsXml(goodsOverseas)}
    </goodsCatalog>
    <platform name="web" note="对应 silver.xml 海外 Web 收银（Adyen/PayPal/Xsolla 等抽象）">
      <paymentChannels>
${channelsXml(channelsOverseas)}
      </paymentChannels>
      <paymentMethods>
${methodsXml(methodsOverseas)}
      </paymentMethods>
    </platform>
    <payMethods>
${payMethodsFromSortRows(mockPaymentSortListOverseas, overseasPublicTemplateIdMap)}
    </payMethods>
    <billingInfoCollectList>
${paymentInfoRowsXml(paymentInfoRowsOverseas)}
    </billingInfoCollectList>
  </region>

  <region name="domestic">
    <scenarioSeeds>
${scenariosXml(SEED.domestic)}
    </scenarioSeeds>
    <apps>
${appsXml(appsDomestic)}
    </apps>
    <goodsCatalog>
${goodsXml(goodsDomestic)}
    </goodsCatalog>
    <platform name="he" note="对应 silver.xml 国内 he 平台（微信/支付宝等）">
      <paymentChannels>
${channelsXml(channelsDomestic)}
      </paymentChannels>
      <paymentMethods>
${methodsXml(methodsDomestic)}
      </paymentMethods>
    </platform>
    <payMethods>
${domesticSortXml}
    </payMethods>
    <billingInfoCollectList>
${paymentInfoRowsXml(paymentInfoRowsDomestic)}
    </billingInfoCollectList>
  </region>

  <silverXmlFieldsNotInAdmin>
    <field path="cubeKey" silverXml="有" admin="无"/>
    <field path="cubeAppId" silverXml="有" admin="无"/>
    <field path="cubeServerKeyId" silverXml="有" admin="无"/>
    <field path="payMethods/payTypeAttrs/payTypeAttr CDATA(JSON)" silverXml="有" admin="无"/>
    <field path="payTypeInfo/icon, webUrl 业务文案" silverXml="有" admin="收银台排序侧无 icon/webUrl 字段"/>
    <field path="platform/payment 下真实密钥、证书、mchId、resultUrl、notifyUrl、redirectUrl 等" silverXml="有" admin="渠道编辑有模板字段，与 XML 节点名/粒度不一致"/>
    <field path="apple: bundleId, validCertHashs, dcConfig, universalLink" silverXml="有" admin="无（IAP SKU 在 iapGoods）"/>
    <field path="windows: webProducts, callbackUrl, addCoinUrl, addCoinSecret, addCoinForwards" silverXml="有" admin="订单配置仅有超时等，无加币 URL/Secret"/>
    <field path="psn: serverLabel, entitlementLabel" silverXml="有" admin="IAP 商品无 entitlementLabel"/>
    <field path="epic / xsolla_web 完整参数与商品 catalog" silverXml="有" admin="无 Epic/Xsolla 专用配置"/>
    <field path="useridWhitelist" silverXml="有" admin="无"/>
    <field path="game/@version 语义（客户端资源版本）" silverXml="有" admin="导出时仅引用 silver.xml 的版本号作对照"/>
  </silverXmlFieldsNotInAdmin>
</game>
`

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, xml, 'utf8')
console.log(`Wrote ${outFile}`)
