/**
 * 多语言文案存储（Mock 阶段：基于 localStorage）
 *
 * 条目结构：
 * {
 *   key: string,        // 全局唯一 key，格式：类别_随机短串
 *   category: string,   // 使用场景分类：'recommend' | 'goods_name' | 'promo'
 *   zh_CN: string,      // 简体中文（原文，必填）
 *   en:    string,
 *   ja:    string,
 *   ko:    string,
 *   zh_TW: string,
 *   usedBy: string,     // 使用位置描述（如支付方式名称、商品 ID）
 *   updatedAt: string,  // ISO 时间
 * }
 */

const STORAGE_KEY = 'i18n_text_entries_v1'

export const LANGUAGES = [
  { code: 'zh_CN', name: '简体中文', required: true },
  { code: 'en',    name: 'English' },
  { code: 'ja',    name: '日本語' },
  { code: 'ko',    name: '한국어' },
  { code: 'zh_TW', name: '繁體中文' }
]

export const CATEGORIES = {
  recommend: '支付方式推荐文案',
  goods_name: '商品名称',
  promo: '跳转促销文案'
}

function randomShort() {
  return Math.random().toString(36).slice(2, 7)
}

export function generateKey(category = 'text') {
  return `${category}_${randomShort()}`
}

export function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveEntries(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export function getAllEntries() {
  return loadEntries()
}

export function getEntry(key) {
  return loadEntries().find(e => e.key === key) || null
}

/** 新建或更新一条多语言条目，返回保存后的条目 */
export function upsertEntry(entry) {
  const list = loadEntries()
  const idx = list.findIndex(e => e.key === entry.key)
  const next = {
    key: entry.key,
    category: entry.category || 'text',
    zh_CN: entry.zh_CN || '',
    en: entry.en || '',
    ja: entry.ja || '',
    ko: entry.ko || '',
    zh_TW: entry.zh_TW || '',
    usedBy: entry.usedBy || '',
    updatedAt: new Date().toISOString()
  }
  if (idx === -1) {
    list.push(next)
  } else {
    list[idx] = next
  }
  saveEntries(list)
  return next
}

export function deleteEntry(key) {
  const list = loadEntries().filter(e => e.key !== key)
  saveEntries(list)
}

/** 返回某条目各语言的填写完成率（已填/总语言数） */
export function completionOf(entry) {
  if (!entry) return { filled: 0, total: LANGUAGES.length }
  const filled = LANGUAGES.filter(l => entry[l.code] && entry[l.code].trim()).length
  return { filled, total: LANGUAGES.length }
}
