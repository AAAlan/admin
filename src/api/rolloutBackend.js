import { templateToBusinessDocument } from '@/utils/businessPaymentRollout.js'

export const rolloutBackendEnabled =
  import.meta.env.VITE_ROLLOUT_BACKEND === 'true'
let sessionPromise
async function raw(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`/api/rollout${path}`, {
    method,
    credentials: 'same-origin',
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await res.json()
  if (!res.ok) {
    const error = new Error(result.message || '后端服务不可用')
    error.status = res.status
    error.code = result.code
    throw error
  }
  return result
}
export async function backendSession() {
  if (!sessionPromise)
    sessionPromise = (async () => {
      try {
        return (await raw('/session')).data
      } catch (e) {
        if (e.status !== 401) throw e
        const health = await raw('/health')
        if (health.data.mode !== 'local-demo')
          throw new Error('正式服务需要接入组织登录；不自动降级到演示身份')
        return (
          await raw('/session', { method: 'POST', body: { role: 'editor' } })
        ).data
      }
    })().catch((e) => {
      sessionPromise = null
      throw e
    })
  return sessionPromise
}
export async function switchBackendRole(role) {
  const result = await raw('/session', { method: 'POST', body: { role } })
  sessionPromise = Promise.resolve(result.data)
  return result.data
}
export async function rolloutRequest(path, options) {
  await backendSession()
  try {
    return await raw(path, options)
  } catch (e) {
    if (e.status === 401) sessionPromise = null
    throw e
  }
}
export function backendTemplateRecord(state) {
  const d = state.draft
  return {
    ...d,
    public_template_id: d.template_id,
    method_count: new Set(d.payment_methods.map((e) => e.business_method_id))
      .size,
    publish_status: state.published?.enabled ? 'published' : 'offline',
    backendState: state,
    payment_methods: d.payment_methods.map((e) => ({
      ...e,
      rollout: d.rules[e.business_method_id],
    })),
  }
}
export const rolloutTemplateAPI = {
  async list(params = {}) {
    const search = new URLSearchParams(
      Object.entries(params).filter(
        ([k, v]) => ['currency', 'page', 'page_size'].includes(k) && v !== '',
      ),
    )
    const res = await rolloutRequest(`/templates?${search}`)
    return {
      ...res,
      data: { ...res.data, list: res.data.list.map(backendTemplateRecord) },
    }
  },
  async read(id) {
    return {
      code: 200,
      data: backendTemplateRecord(
        (await rolloutRequest(`/templates/${encodeURIComponent(id)}`)).data,
      ),
    }
  },
  async save(input) {
    const body = {
      document: templateToBusinessDocument(input),
      baseDraftRevision: input.baseDraftRevision,
    }
    const path = input.create
      ? '/templates'
      : `/templates/${encodeURIComponent(input.template_id)}/draft`
    const res = await rolloutRequest(path, { method: 'POST', body })
    return { ...res, data: backendTemplateRecord(res.data) }
  },
}
