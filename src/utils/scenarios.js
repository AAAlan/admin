/**
 * 支付场景定义（多产线）
 *
 * 按 region 隔离：overseas（海外）/ domestic（国内）各自独立的场景列表和存储。
 * 数据持久化到 localStorage（Mock 阶段），正式环境由后端管理。
 */

const STORAGE_KEYS = {
  overseas: 'cashier_scenarios_v3',
  /** v4：国内列表按「平台应用内购买」思维导图重置 seed */
  domestic: 'cashier_scenarios_domestic_v4'
}

/** 支付场景 · 支付环境枚举（与管理后台「创建/编辑场景」一致） */
export const PAYMENT_ENV_OPTIONS = ['Mobile', 'PC', '游戏主机']
export const TEMPLATE_CONFIG_OPTIONS = ['游戏参数配置', '计费点配置', '端内计费点跳转Web支付开关', '计费点配置', '收银台模版配置']

/** 支付中心（海外）· Platform 枚举 */
export const PLATFORM_OPTIONS_OVERSEAS = ['apple', 'google', 'PSN', 'windows']

/** 支付中心（国内）· Platform 枚举 */
export const PLATFORM_OPTIONS_DOMESTIC = ['apple', 'huawei', 'vivo', 'PSN', 'windows', 'he']

export function getPlatformOptions(region = 'overseas') {
  return region === 'domestic' ? PLATFORM_OPTIONS_DOMESTIC : PLATFORM_OPTIONS_OVERSEAS
}

export const SEED = {
  overseas: [
    { id: 1, key: 'ios_iap', platform: 'apple', payment_env: 'Mobile', is_web_cashier: false, description: '应用内IAP' },
    { id: 2, key: 'ios_web', platform: 'apple', payment_env: 'Mobile', is_web_cashier: true, web_pay_scene: 'external_browser', description: '应用外支付：跳转外部浏览器打开网页Web支付' },
    { id: 3, key: 'android_iap', platform: 'google', payment_env: 'Mobile', is_web_cashier: false, description: '应用内IAP' },
    { id: 4, key: 'android_web', platform: 'google', payment_env: 'Mobile', is_web_cashier: true, web_pay_scene: 'external_browser', description: '应用外支付：跳转外部浏览器打开网页Web支付' },
    { id: 5, key: 'psn_iap', platform: 'PSN', payment_env: '游戏主机', is_web_cashier: false, description: '应用内IAP' },
    { id: 6, key: 'windows_web', platform: 'windows', payment_env: 'PC', is_web_cashier: true, web_pay_scene: 'embedded_browser', description: '应用外支付：内置浏览器打开网页Web支付' }
  ],
  /**
   * 国内 · 平台应用内购买（与产品思维导图一致）
   * - iOS / PSN：商店 IAP
   * - Android：IAP（厂商商店 SDK）+ 三方（原生收银台跳转微信/支付宝 App）
   * - Windows：三方（原生收银台，微信/支付宝扫码）
   * - 其他：导图「…」占位，可扩展鸿蒙等
   */
  domestic: [
    {
      id: 1,
      key: 'ios_iap',
      platform: 'apple',
      payment_env: 'Mobile',
      is_web_cashier: false,
      description: '【平台应用内购买】应用内 IAP：苹果 App Store 内购'
    },
    {
      id: 2,
      key: 'android_iap',
      platform: 'huawei',
      payment_env: 'Mobile',
      is_web_cashier: false,
      description: '【平台应用内购买】应用内 IAP：手机厂商应用商城统一支付 SDK'
    },
    {
      id: 3,
      key: 'android_web',
      platform: 'vivo',
      payment_env: 'Mobile',
      is_web_cashier: true,
      description: '【平台应用内购买】应用内三方支付：应用内自建原生收银台，跳转微信 App / 支付宝 App 支付'
    },
    {
      id: 4,
      key: 'psn_iap',
      platform: 'PSN',
      payment_env: '游戏主机',
      is_web_cashier: false,
      description: '【平台应用内购买】应用内 IAP：PlayStation 商店内购'
    },
    {
      id: 5,
      key: 'windows_native_checkout',
      platform: 'windows',
      payment_env: 'PC',
      is_web_cashier: true,
      description: '【平台应用内购买】应用内三方支付：应用内自建原生收银台，微信 App / 支付宝 App 扫码支付'
    },
    {
      id: 6,
      key: 'other_platforms',
      platform: 'huawei',
      payment_env: 'Mobile',
      is_web_cashier: false,
      description: '【平台应用内购买】其它平台（导图「…」：如鸿蒙等，可在此扩展配置）'
    }
  ]
}

// ---- 内部工具 ----

function storageKey(region) {
  return STORAGE_KEYS[region] || STORAGE_KEYS.overseas
}

function seedData(region) {
  return SEED[region] || SEED.overseas
}

function loadScenarios(region) {
  const key = storageKey(region)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) return arr.map(s => normalizeScenario(s, region))
    }
  } catch { /* fall through */ }
  const seed = seedData(region)
  localStorage.setItem(key, JSON.stringify(seed))
  return [...seed].map(s => normalizeScenario(s, region))
}

function saveScenarios(region, list) {
  localStorage.setItem(storageKey(region), JSON.stringify(list))
}

function nextId(list) {
  if (list.length === 0) return 1
  return Math.max(...list.map(s => s.id)) + 1
}

function buildPlatformId(platform, paymentEnv, isWeb) {
  return [platform, paymentEnv, isWeb ? 'Web' : 'IAP'].filter(Boolean).join('_')
}

/** 将历史 platform 文案（IOS/Android 等）迁到当前产线的 Platform 枚举 */
function migratePlatformField(raw, region = 'overseas') {
  let platform = String(raw.platform || '').trim()
  const allowed = getPlatformOptions(region)
  if (allowed.includes(platform)) return platform

  const lower = platform.toLowerCase()
  const isWeb = !!raw.is_web_cashier
  const key = raw.key || ''

  if (region === 'overseas') {
    if (platform === 'IOS' || lower === 'ios') return 'apple'
    if (platform === 'Android' || lower === 'android') return 'google'
    if (platform === 'Windows' || lower === 'windows') return 'windows'
    if (platform === 'PSN' || lower === 'psn') return 'PSN'
  } else {
    if (platform === 'IOS' || lower === 'ios') return 'apple'
    if (platform === 'Windows' || lower === 'windows') return 'windows'
    if (platform === 'PSN' || lower === 'psn') return 'PSN'
    if (platform === 'Android' || lower === 'android') {
      if (key === 'android_web' || isWeb) return 'vivo'
      return 'huawei'
    }
    if (platform === '其他') return 'huawei'
  }
  return platform
}

function assertPlatformAllowed(platform, region) {
  const allowed = getPlatformOptions(region)
  if (!allowed.includes(platform)) {
    throw new Error(`Platform 须为以下之一：${allowed.join('、')}`)
  }
}

function resolvePaymentEnvByPlatform(platform) {
  if (platform === 'PSN') return '游戏主机'
  if (platform === 'windows') return 'PC'
  return 'Mobile'
}

/** 全局收银台模版 ID 列表：优先数组，否则兼容历史单字段 */
function normalizeCashierPublicTemplateIds(raw) {
  if (Array.isArray(raw.cashier_public_template_ids)) {
    const seen = new Set()
    const out = []
    for (const x of raw.cashier_public_template_ids) {
      const s = x != null ? String(x).trim() : ''
      if (s && !seen.has(s)) {
        seen.add(s)
        out.push(s)
      }
    }
    return out
  }
  const legacy =
    raw.cashier_public_template_id != null ? String(raw.cashier_public_template_id).trim() : ''
  return legacy ? [legacy] : []
}

function normalizeScenario(raw, region = 'overseas') {
  const platform = migratePlatformField(raw, region)
  let payment_env = raw.payment_env || resolvePaymentEnvByPlatform(platform)
  if (payment_env === 'PS5') payment_env = '游戏主机'
  const is_web_cashier = !!raw.is_web_cashier
  let web_pay_scene = raw.web_pay_scene || ''
  if (is_web_cashier && !web_pay_scene) {
    web_pay_scene = 'external_browser'
  }
  if (!is_web_cashier) {
    web_pay_scene = ''
  }
  // Web / IAP 独立开关（主要用于海外）
  let web_enabled
  let iap_enabled
  if (raw.web_enabled !== undefined || raw.iap_enabled !== undefined) {
    web_enabled = !!raw.web_enabled
    iap_enabled = !!raw.iap_enabled
  } else {
    // 兼容历史数据：仅根据 is_web_cashier 推导
    web_enabled = !!is_web_cashier
    iap_enabled = !web_enabled
  }
  const default_iap_channel = raw.default_iap_channel || ''
  const cashier_public_template_ids = normalizeCashierPublicTemplateIds(raw)
  const cashier_public_template_id = cashier_public_template_ids[0] || ''
  let cashier_default_public_template_id =
    raw.cashier_default_public_template_id != null
      ? String(raw.cashier_default_public_template_id).trim()
      : ''
  if (
    cashier_default_public_template_id &&
    !cashier_public_template_ids.includes(cashier_default_public_template_id)
  ) {
    cashier_default_public_template_id = ''
  }
  let template_configs = ['游戏参数配置']
  if (region === 'domestic') {
    // 国内：所有支付形式都需要计费点；Web/原生三方额外需要收银台配置
    template_configs.push('计费点配置')
    if (is_web_cashier) {
      template_configs.push('收银台模版配置')
    }
  } else {
    // 海外：按 Web 开关区分模板；无论是否同时开启 IAP，只要 Web 开启就需要收银台配置
    if (web_enabled) {
      if (web_pay_scene === 'embedded_browser') {
        template_configs.push('收银台模版配置')
      } else {
        template_configs.push('端内计费点跳转Web支付开关', '计费点配置', '收银台模版配置')
      }
    } else {
      // 仅 IAP
      template_configs.push('计费点配置')
    }
  }
  const validTemplateSet = new Set(TEMPLATE_CONFIG_OPTIONS)
  template_configs = template_configs.filter((t, i, arr) => validTemplateSet.has(t) && arr.indexOf(t) === i)
  return {
    ...raw,
    platform,
    payment_env,
    is_web_cashier,
    web_pay_scene,
    web_enabled,
    iap_enabled,
    default_iap_channel,
    cashier_public_template_ids,
    cashier_public_template_id,
    cashier_default_public_template_id,
    template_configs,
    platform_id: buildPlatformId(platform, payment_env, is_web_cashier)
  }
}

function generateKey(data) {
  const parts = [data.platform || '', data.is_web_cashier ? 'web' : 'iap']
  return parts.map(p => p.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')).filter(Boolean).join('_')
}

// ---- 运行时缓存（按 region 隔离）----
const _cache = {}

function getAll(region = 'overseas') {
  if (!_cache[region]) _cache[region] = loadScenarios(region)
  return _cache[region]
}

// ---- 公开 API ----

export function refreshScenarios(region = 'overseas') {
  _cache[region] = loadScenarios(region)
}

export function getAllScenarios(region = 'overseas') {
  return getAll(region)
}

export function getScenarioById(id, region = 'overseas') {
  return getAll(region).find(s => s.id === Number(id)) || null
}

export function getScenarioByKey(key, region = 'overseas') {
  return getAll(region).find(s => s.key === key) || null
}

export function getPaymentEnvByScenario(key, region = 'overseas') {
  const s = getScenarioByKey(key, region)
  return s ? s.payment_env : ''
}

export function getIsWebCashierByScenario(key, region = 'overseas') {
  const s = getScenarioByKey(key, region)
  return s ? !!s.is_web_cashier : false
}

export function createScenario(data, region = 'overseas') {
  const all = getAll(region)
  const key = data.key || generateKey(data)
  if (all.find(s => s.key === key)) {
    throw new Error(`场景 key "${key}" 已存在`)
  }
  const platform = migratePlatformField(
    { platform: data.platform, is_web_cashier: data.is_web_cashier, key },
    region
  )
  assertPlatformAllowed(platform, region)
  const payment_env = data.payment_env || resolvePaymentEnvByPlatform(platform)
  const is_web_cashier = !!data.is_web_cashier
  const web_pay_scene = is_web_cashier ? (data.web_pay_scene || 'external_browser') : ''
  const cashier_public_template_ids = normalizeCashierPublicTemplateIds({
    cashier_public_template_ids: data.cashier_public_template_ids,
    cashier_public_template_id: data.cashier_public_template_id
  })
  const scenario = normalizeScenario(
    {
      id: nextId(all),
      key,
      platform,
      payment_env,
      is_web_cashier,
      web_pay_scene,
      web_enabled: data.web_enabled,
      iap_enabled: data.iap_enabled,
      default_iap_channel: data.default_iap_channel || '',
      cashier_public_template_ids,
      cashier_default_public_template_id:
        data.cashier_default_public_template_id != null
          ? String(data.cashier_default_public_template_id).trim()
          : '',
      template_configs: Array.isArray(data.template_configs) ? data.template_configs : [],
      description: data.description || ''
    },
    region
  )
  all.push(scenario)
  saveScenarios(region, all)
  _cache[region] = all
  return scenario
}

/** 按 id 更新场景；保留原有 key，避免已关联配置失效 */
export function updateScenarioById(id, data, region = 'overseas') {
  const all = getAll(region)
  const idx = all.findIndex(s => s.id === Number(id))
  if (idx === -1) {
    throw new Error('场景不存在')
  }
  const prev = all[idx]
  const platform = data.platform !== undefined ? data.platform : prev.platform
  const is_web_cashier =
    data.is_web_cashier !== undefined ? !!data.is_web_cashier : prev.is_web_cashier
  const web_pay_scene = is_web_cashier
    ? (data.web_pay_scene !== undefined ? data.web_pay_scene : (prev.web_pay_scene || 'external_browser'))
    : ''
  const description = data.description !== undefined ? data.description : prev.description
  const default_iap_channel =
    data.default_iap_channel !== undefined ? data.default_iap_channel : (prev.default_iap_channel || '')
  const web_enabled =
    data.web_enabled !== undefined ? !!data.web_enabled : (prev.web_enabled !== undefined ? !!prev.web_enabled : !!is_web_cashier)
  const iap_enabled =
    data.iap_enabled !== undefined ? !!data.iap_enabled : (prev.iap_enabled !== undefined ? !!prev.iap_enabled : !web_enabled)
  const template_configs = data.template_configs !== undefined ? data.template_configs : prev.template_configs
  let cashier_public_template_ids
  if (data.cashier_public_template_ids !== undefined) {
    cashier_public_template_ids = normalizeCashierPublicTemplateIds({
      cashier_public_template_ids: data.cashier_public_template_ids
    })
  } else if (data.cashier_public_template_id !== undefined) {
    const s = String(data.cashier_public_template_id || '').trim()
    cashier_public_template_ids = s ? [s] : []
  } else {
    cashier_public_template_ids = normalizeCashierPublicTemplateIds(prev)
  }
  let cashier_default_public_template_id
  if (data.cashier_default_public_template_id !== undefined) {
    cashier_default_public_template_id = String(data.cashier_default_public_template_id || '').trim()
  } else {
    cashier_default_public_template_id =
      prev.cashier_default_public_template_id != null
        ? String(prev.cashier_default_public_template_id).trim()
        : ''
  }
  const migratedPlatform = migratePlatformField(
    { platform, is_web_cashier, key: prev.key },
    region
  )
  assertPlatformAllowed(migratedPlatform, region)
  const payment_env =
    data.payment_env !== undefined
      ? data.payment_env
      : resolvePaymentEnvByPlatform(migratedPlatform)
  const updated = normalizeScenario(
    {
      ...prev,
      platform: migratedPlatform,
      payment_env,
      is_web_cashier,
      web_pay_scene,
      web_enabled,
      iap_enabled,
      default_iap_channel,
      cashier_public_template_ids,
      cashier_default_public_template_id,
      template_configs,
      description
    },
    region
  )
  all[idx] = updated
  saveScenarios(region, all)
  _cache[region] = all
  return updated
}

export function deleteScenarioById(id, region = 'overseas') {
  const all = getAll(region)
  const next = all.filter(s => s.id !== Number(id))
  if (next.length === all.length) {
    throw new Error('场景不存在')
  }
  saveScenarios(region, next)
  _cache[region] = next
}

// 兼容旧代码的静态导出（默认 overseas）
export const SCENARIOS = getAll('overseas')
export const SCENARIO_MAP = Object.fromEntries(SCENARIOS.map(s => [s.key, s]))
export const DEFAULT_SCENARIO = SCENARIOS[0]?.key || ''
