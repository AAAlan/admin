import { paymentSortRowKey } from './cashierPublicTemplateId.js'

export const CASHIER_TEMPLATE_STORAGE_KEY = 'payment_sort_configs_v1'

export function cashierTemplateStorageKey(item, region = item.region || 'overseas') {
  if (item.template_id) return `${region}|template|${item.template_id}`
  if (item.legacy_row_key) {
    return `${region}|${item.legacy_row_key.replace(/\|([01])$/, (_, web) => web === '1' ? '|web' : '|nonweb')}`
  }
  return [region, item.app_id || '', item.country_code || '', item.currency || '',
    item.payment_env || '', item.is_web_cashier ? 'web' : 'nonweb'].join('|')
}

export function readCashierTemplateStore() {
  const raw = localStorage.getItem(CASHIER_TEMPLATE_STORAGE_KEY)
  const store = raw ? JSON.parse(raw) : {}
  return store && typeof store === 'object' && !Array.isArray(store) ? store : {}
}

// Include newly created templates and overlay saved edits on legacy seed rows.
export function mergeSavedCashierTemplates(seedRows, region) {
  const rows = new Map(seedRows.map(row => [paymentSortRowKey(row), row]))
  for (const [storageKey, saved] of Object.entries(readCashierTemplateStore())) {
    if (!saved || !Array.isArray(saved.payment_methods)) continue
    if ((saved.region || storageKey.split('|')[0]) !== region) continue
    const rowKey = paymentSortRowKey(saved)
    rows.set(rowKey, {
      ...rows.get(rowKey), ...saved,
      method_count: saved.payment_methods.length,
      recommended_count: saved.payment_methods.filter(method => method.is_recommended).length
    })
  }
  return Array.from(rows.values())
}
