/**
 * 全局收银台模版展示 ID：游戏名（app_id 前缀）+ 国家 + 币种。
 * 同一 (game, country, currency) 多条模版按种子列表出现顺序加 _2、_3…
 */

export function cashierGameNameFromAppId(appId) {
  const s = String(appId || 'saki').trim()
  const i = s.indexOf('_')
  return i === -1 ? s : s.slice(0, i)
}

export function paymentSortRowKey(item) {
  return `${item.app_id}|${item.country_code}|${item.currency}|${item.payment_env}|${item.is_web_cashier ? '1' : '0'}`
}

export function buildPublicTemplateIdBase(item) {
  const game = cashierGameNameFromAppId(item.app_id)
  const country = item.country_code || 'NA'
  const currency = item.currency || 'NA'
  return `${game}_${country}_${currency}`
}

/** 按 canonical 列表顺序生成 rowKey -> public_template_id */
export function buildPublicTemplateIdMap(canonicalOrderedList) {
  const counts = new Map()
  const idByRowKey = new Map()
  if (!Array.isArray(canonicalOrderedList)) return idByRowKey
  for (const item of canonicalOrderedList) {
    const rk = paymentSortRowKey(item)
    const base = buildPublicTemplateIdBase(item)
    const n = (counts.get(base) || 0) + 1
    counts.set(base, n)
    const id = n === 1 ? base : `${base}_${n}`
    idByRowKey.set(rk, id)
  }
  return idByRowKey
}

export function attachPublicTemplateIds(list, idByRowKey) {
  if (!Array.isArray(list) || !idByRowKey) return list
  return list.map(item => ({
    ...item,
    public_template_id: idByRowKey.get(paymentSortRowKey(item)) || buildPublicTemplateIdBase(item)
  }))
}

export function getCashierPublicTemplateId(item) {
  if (item && item.public_template_id) return item.public_template_id
  return buildPublicTemplateIdBase(item)
}
