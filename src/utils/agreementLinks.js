/**
 * 隐私协议 / 用户协议链接配置（Mock 阶段：基于 localStorage）
 *
 * 维度：region（海外 / 国内）× 配置主体 × 协议类型 × 语言
 * 按 region 隔离存储：海外与国内的协议主体不同，两边数据互不影响。
 *
 * 条目结构：
 * {
 *   appId: string,        // 配置主体标识；统一收银台使用固定 key
 *   privacy: { zh_CN: url, en: url, zh_TW: url, ja: url, ko: url, de: url, fr: url, ru: url, th: url, es: url, pt_BR: url, id_ID: url },
 *   user:    { zh_CN: url, en: url, zh_TW: url, ja: url, ko: url, de: url, fr: url, ru: url, th: url, es: url, pt_BR: url, id_ID: url },
 *   updatedAt: string,    // ISO 时间
 *   publishedAt: string,  // 最近一次整体发布时间；草稿记录为空
 * }
 *
 * 协议配置使用独立语言集合，不影响其他多语言文案配置。
 */

export const LANGUAGES = [
  { code: 'zh_CN', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'zh_TW', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'de', name: '德语' },
  { code: 'fr', name: '法语' },
  { code: 'ru', name: '俄语' },
  { code: 'th', name: '泰语' },
  { code: 'es', name: '西班牙语' },
  { code: 'pt_BR', name: '巴葡' },
  { code: 'id_ID', name: '印尼' }
]

const STORAGE_KEYS = {
  overseas: 'cashier_agreement_links_overseas_v1',
  domestic: 'cashier_agreement_links_domestic_v1'
}

const PUBLISHED_STORAGE_KEYS = {
  overseas: 'cashier_agreement_links_published_overseas_v1',
  domestic: 'cashier_agreement_links_published_domestic_v1'
}

/** 协议类型枚举 */
export const AGREEMENT_TYPES = [
  { code: 'privacy', name: '隐私协议' },
  { code: 'user', name: '用户协议' }
]

/**
 * 历史数据兼容用的缺省语言：旧版不完整配置读取时，收银台回落到该语言的链接。
 * 新配置由页面校验为 12 种语言全部填写；海外回落英文，国内回落简体中文。
 */
const FALLBACK_LANG_BY_REGION = {
  overseas: 'en',
  domestic: 'zh_CN'
}

export function getFallbackLang(region) {
  return FALLBACK_LANG_BY_REGION[region] || FALLBACK_LANG_BY_REGION.overseas
}

function storageKey(region, published = false) {
  const keys = published ? PUBLISHED_STORAGE_KEYS : STORAGE_KEYS
  return keys[region] || keys.overseas
}

function emptyLangMap() {
  const map = {}
  for (const lang of LANGUAGES) map[lang.code] = ''
  return map
}

/** 补全缺失字段，保证读出来的条目结构完整 */
function normalizeEntry(appId, raw = {}) {
  const entry = {
    appId,
    updatedAt: raw.updatedAt || '',
    publishedAt: raw.publishedAt || ''
  }
  for (const type of AGREEMENT_TYPES) {
    const src = raw[type.code] || {}
    const map = emptyLangMap()
    for (const lang of LANGUAGES) {
      map[lang.code] = typeof src[lang.code] === 'string' ? src[lang.code].trim() : ''
    }
    entry[type.code] = map
  }
  return entry
}

function loadAll(region, published = false) {
  try {
    const raw = localStorage.getItem(storageKey(region, published))
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
  } catch {
    return {}
  }
}

function saveAll(region, map, published = false) {
  try {
    localStorage.setItem(storageKey(region, published), JSON.stringify(map))
  } catch {
    // 忽略写入失败（隐私模式 / 配额超限）
  }
}

/** 空结构：供未配置的应用直接使用，避免逐行读 localStorage */
export function emptyEntry(appId = '') {
  return normalizeEntry(appId)
}

/** 读取单个配置主体的协议链接配置；未配置时返回空结构 */
export function getEntry(region, appId) {
  const all = loadAll(region)
  return normalizeEntry(appId, all[appId])
}

/** 读取已发布的收银台协议配置；未发布时返回空结构 */
export function getPublishedEntry(region, appId) {
  const all = loadAll(region, true)
  return normalizeEntry(appId, all[appId])
}

/** 读取该 region 下所有已配置的条目（按 appId 索引） */
export function getAllEntries(region) {
  const all = loadAll(region)
  const out = {}
  for (const appId of Object.keys(all)) {
    out[appId] = normalizeEntry(appId, all[appId])
  }
  return out
}

/** 保存单个配置主体的协议链接配置 */
export function saveEntry(region, appId, data) {
  const all = loadAll(region)
  const entry = normalizeEntry(appId, data)
  entry.updatedAt = new Date().toISOString()
  all[appId] = entry
  saveAll(region, all)
  return entry
}

/** 将协议草稿发布为收银台当前生效版本 */
export function publishEntry(region, appId, data) {
  const all = loadAll(region, true)
  const entry = normalizeEntry(appId, data || getEntry(region, appId))
  entry.publishedAt = new Date().toISOString()
  all[appId] = entry
  saveAll(region, all, true)
  return entry
}

/** 清空单个配置主体的协议链接配置 */
export function clearEntry(region, appId) {
  const all = loadAll(region)
  delete all[appId]
  saveAll(region, all)
}

/**
 * URL 校验：仅接受 http / https 绝对地址。
 * 空串视为“未填写”，由调用方按完成度处理，不在这里报错。
 */
export function isValidUrl(url) {
  const s = (url || '').trim()
  if (!s) return true
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** 单个协议类型的填写完成度 */
export function completionOfType(langMap = {}) {
  const total = LANGUAGES.length
  const filled = LANGUAGES.filter(l => (langMap[l.code] || '').trim()).length
  return { filled, total }
}

/** 整条记录（隐私 + 用户协议）的填写完成度 */
export function completionOf(entry = {}) {
  let filled = 0
  let total = 0
  for (const type of AGREEMENT_TYPES) {
    const c = completionOfType(entry[type.code])
    filled += c.filled
    total += c.total
  }
  return { filled, total }
}

/**
 * 配置状态：
 * - full    全部语言均已配置
 * - partial 部分语言已配置
 * - empty   未配置
 */
export function statusOf(entry = {}) {
  const { filled, total } = completionOf(entry)
  if (total > 0 && filled === total) return 'full'
  if (filled > 0) return 'partial'
  return 'empty'
}

export const STATUS_LABELS = {
  full: '已配置',
  partial: '部分配置',
  empty: '未配置'
}

/**
 * 按收银台实际取值逻辑解析已发布版本的链接：
 * 指定语言 → 缺省语言（海外 en / 国内 zh_CN）→ 空串。
 * 返回 { url, lang, fallback }，fallback 标识是否发生了回落。
 */
export function resolveLink(region, appId, type, lang) {
  const entry = getPublishedEntry(region, appId)
  const map = entry[type] || {}
  const direct = (map[lang] || '').trim()
  if (direct) return { url: direct, lang, fallback: false }
  const fallbackLang = getFallbackLang(region)
  const fallbackUrl = (map[fallbackLang] || '').trim()
  if (fallbackUrl) return { url: fallbackUrl, lang: fallbackLang, fallback: true }
  return { url: '', lang: '', fallback: false }
}
