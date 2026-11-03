import { createHash, randomUUID } from 'node:crypto'
import {
  canonicalTemplate,
  evaluateBusinessTemplate,
  ruleIsNarrowing,
} from '../src/utils/businessPaymentRollout.js'

export class ServiceError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}
export const fail = (status, code, message) => {
  throw new ServiceError(status, code, message)
}
export const scopeKey = (scope) =>
  JSON.stringify([scope.environment, scope.region, scope.appId])
const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const clone = (value) => structuredClone(value)
// Expiry/observation times may refresh while the underlying order facts stay unchanged.
const contextHash = (context) =>
  hash({
    ...Object.fromEntries(
      [
        'orderId',
        'templateId',
        'appId',
        'environment',
        'region',
        'userId',
        'sessionId',
        'platform',
        'country',
        'amountMinor',
        'currency',
        'riskAllowed',
        'paymentState',
        'subchannels',
      ].map((key) => [key, context[key]]),
    ),
    eligibility: Object.entries(context.eligibility || {}).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  })

export class RolloutService {
  constructor(
    store,
    {
      capabilityReader = () => false,
      contextReader = () => null,
      now = () => Date.now(),
      resourceNamespace = '',
      featureEvaluator = () => null,
    } = {},
  ) {
    this.store = store
    this.capabilityReader = capabilityReader
    this.contextReader = contextReader
    this.now = now
    this.resourceNamespace = resourceNamespace
    this.featureEvaluator = featureEvaluator
  }
  key(actor) {
    return this.resourceNamespace
      ? JSON.stringify([this.resourceNamespace, scopeKey(actor.scope)])
      : scopeKey(actor.scope)
  }
  newId() {
    return `cashier_${randomUUID()}`
  }
  requireRole(actor, roles) {
    if (!roles.includes(actor.role))
      fail(403, 'FORBIDDEN', '当前身份无权执行此操作')
  }
  state(actor, id) {
    return (
      this.store.get(this.key(actor), id) ||
      fail(404, 'NOT_FOUND', '模版不存在或不在当前授权范围')
    )
  }
  document(input, actor, id) {
    try {
      return canonicalTemplate(input, actor.scope, id)
    } catch (e) {
      fail(422, 'INVALID_CONFIG', e.message)
    }
  }
  reason(input) {
    if (
      typeof input.reason !== 'string' ||
      input.reason.trim().length < 2 ||
      input.reason.length > 500
    )
      fail(422, 'REASON_REQUIRED', '请填写 2–500 字的操作原因')
  }
  compare(actual, expected) {
    if (!Number.isSafeInteger(expected) || actual !== expected)
      fail(409, 'VERSION_CONFLICT', '配置已变更，请重新读取后操作')
  }
  emergencyKeys(state, key) {
    return [key]
  }
  log(actor, state, action, reason, requestId) {
    this.store.audit(this.key(actor), state.template_id, {
      action,
      actor: actor.id,
      role: actor.role,
      reason,
      at: new Date(this.now()).toISOString(),
      requestId,
      revision: state.revision,
      draftRevision: state.draftRevision,
      emergencyEpoch: state.emergencyEpoch,
      configHash: hash(state.published || state.draft),
    })
  }
  checkReadiness(actor, before, after) {
    if (after.enabled === false) return
    for (const [id, rule] of Object.entries(after.rules)) {
      if (
        rule.mode === 'gradual' &&
        rule.percentage === 0 &&
        !rule.allow.trim()
      )
        continue
      const oldEntries =
        before?.payment_methods
          .filter((e) => e.business_method_id === id && e.enabled)
          .map((e) => e.id) || []
      const newEntries = after.payment_methods.filter(
        (e) => e.business_method_id === id && e.enabled,
      )
      if (!newEntries.length) continue
      const unchangedContext =
        before &&
        before.currency === after.currency &&
        before.enabled === after.enabled
      const safe =
        unchangedContext &&
        ruleIsNarrowing(before.rules[id], rule) &&
        newEntries.every((e) => oldEntries.includes(e.id))
      if (
        rule.mode !== 'off' &&
        !safe &&
        !newEntries.some((e) => this.capabilityReader(actor.scope, e) === true)
      )
        fail(
          422,
          'CAPABILITY_NOT_READY',
          `${id} 尚无已就绪的机构渠道，不能新增或扩量`,
        )
    }
  }
  save(actor, id, input, requestId) {
    this.requireRole(actor, ['editor'])
    return this.store.transaction(() => {
      const key = this.key(actor),
        templateId = id || this.newId(actor, input),
        existing = id ? this.state(actor, id) : this.store.get(key, templateId)
      if (existing) {
        this.compare(existing.draftRevision, input.baseDraftRevision)
        if (existing.pending) fail(409, 'PENDING_REVIEW', '审核中不能修改草稿')
      }
      const doc = this.document(input.document, actor, templateId)
      const state = existing || {
        template_id: templateId,
        revision: 0,
        draftRevision: 0,
        published: null,
        pending: null,
        kills: {},
        emergencyEpoch: 0,
      }
      state.draft = doc
      state.draftRevision++
      this.store.put(key, state)
      this.log(actor, state, 'save_draft', '保存模版草稿', requestId)
      return state
    })
  }
  transition(actor, id, action, input, requestId) {
    const roles = {
      submit: ['editor'],
      withdraw: ['editor'],
      approve: ['reviewer'],
      reject: ['reviewer'],
      rollback: ['reviewer'],
      kill: ['emergency'],
      resume: ['emergency'],
    }
    if (!roles[action]) fail(404, 'NOT_FOUND', '操作不存在')
    this.requireRole(actor, roles[action])
    this.reason(input)
    return this.store.transaction(() => {
      const key = this.key(actor),
        s = this.state(actor, id)
      if (action === 'submit') {
        this.compare(s.draftRevision, input.draftRevision)
        this.compare(s.revision, input.baseRevision)
        if (s.pending) fail(409, 'PENDING_REVIEW', '已有待审核快照')
        if (hash(s.draft) === hash(s.published))
          fail(409, 'NO_CHANGES', '没有待发布变更')
        this.checkReadiness(actor, s.published, s.draft)
        s.pending = {
          id: randomUUID(),
          submitter: actor.id,
          reason: input.reason,
          document: clone(s.draft),
          baseRevision: s.revision,
          draftRevision: s.draftRevision,
          emergencyEpoch: s.emergencyEpoch,
        }
      } else if (['approve', 'reject', 'withdraw'].includes(action)) {
        if (!s.pending || s.pending.id !== input.pendingId)
          fail(409, 'STALE_REVIEW', '待审快照不存在或已失效')
        this.compare(s.revision, s.pending.baseRevision)
        this.compare(s.emergencyEpoch, s.pending.emergencyEpoch)
        if (action === 'withdraw' && actor.id !== s.pending.submitter)
          fail(403, 'FORBIDDEN', '只有提交者可以撤回')
        if (action !== 'withdraw' && actor.id === s.pending.submitter)
          fail(403, 'SELF_REVIEW', '不能审核自己提交的配置')
        if (action === 'approve') {
          const doc = this.document(s.pending.document, actor, id)
          this.checkReadiness(actor, s.published, doc)
          s.published = doc
          s.revision++
          this.store.version(key, id, s.revision, doc)
        }
        s.pending = null
      } else if (action === 'rollback') {
        this.compare(s.revision, input.baseRevision)
        this.compare(s.draftRevision, input.baseDraftRevision)
        if (s.pending) fail(409, 'PENDING_REVIEW', '请先处理待审核配置')
        const target = this.store
          .versions(key, id)
          .find((v) => v.revision === input.targetRevision)
        if (!target) fail(404, 'VERSION_NOT_FOUND', '历史版本不存在')
        const doc = this.document(target.document, actor, id)
        this.checkReadiness(actor, s.published, doc)
        s.published = doc
        s.draft = clone(doc)
        s.draftRevision++
        s.revision++
        this.store.version(key, id, s.revision, doc)
      } else {
        this.compare(s.emergencyEpoch, input.emergencyEpoch)
        if (
          !Array.isArray(input.methodIds) ||
          !input.methodIds.length ||
          input.methodIds.some(
            (m) =>
              !Object.hasOwn(s.draft.rules, m) &&
              !Object.hasOwn(s.published?.rules || {}, m),
          )
        )
          fail(422, 'INVALID_METHOD', '停用目标必须为该模版的业务支付方式')
        for (const methodId of new Set(
          input.methodIds.flatMap((key) => this.emergencyKeys(s, key)),
        )) {
          if (action === 'kill') s.kills[methodId] = true
          else delete s.kills[methodId]
        }
        s.emergencyEpoch++
        s.pending = null
      }
      this.store.put(key, s)
      this.log(actor, s, action, input.reason, requestId)
      return s
    })
  }
  preview(actor, id, input) {
    this.requireRole(actor, ['editor', 'reviewer', 'viewer', 'emergency'])
    const s = this.state(actor, id)
    const doc =
      input.source === 'published'
        ? s.published
        : input.document
          ? this.document(input.document, actor, id)
          : s.draft
    if (!doc) fail(409, 'NOT_PUBLISHED', '模版尚未发布')
    const context = input.profile
    if (!context || typeof context !== 'object')
      fail(422, 'INVALID_PROFILE', '缺少试算样本')
    const eligibility = Object.fromEntries(
      doc.payment_methods.map((e) => [
        e.id,
        input.eligibleSample === true &&
          this.capabilityReader(actor.scope, e) === true,
      ]),
    )
    return {
      ...evaluateBusinessTemplate(doc, actor.scope, context, {
        kills: s.kills,
        eligibility,
      }),
      source: input.source === 'published' ? 'published' : 'preview',
      revision: s.revision,
      simulation: true,
    }
  }
  async decide(actor, input) {
    this.requireRole(actor, ['service'])
    if (
      typeof input.orderId !== 'string' ||
      !input.orderId ||
      input.orderId.length > 160 ||
      typeof input.templateId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(input.templateId) ||
      Object.keys(input).some((k) => !['orderId', 'templateId'].includes(k))
    )
      fail(
        422,
        'INVALID_REQUEST',
        '决策只接收 orderId 与 templateId，不接收客户端资格',
      )
    let trusted, timeout
    try {
      trusted = await Promise.race([
        Promise.resolve().then(() =>
          this.contextReader(actor.scope, input.orderId),
        ),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('context timeout')), 2500)
        }),
      ])
    } catch {
      fail(
        503,
        'CONTEXT_UNAVAILABLE',
        '可信上下文查询失败或超时，暂不提供支付方式',
      )
    } finally {
      clearTimeout(timeout)
    }
    if (
      !trusted ||
      trusted.orderId !== input.orderId ||
      trusted.templateId !== input.templateId ||
      trusted.appId !== actor.scope.appId ||
      trusted.environment !== actor.scope.environment ||
      trusted.region !== actor.scope.region ||
      !Number.isFinite(trusted.expiresAt) ||
      trusted.expiresAt <= this.now()
    )
      fail(
        503,
        'CONTEXT_UNAVAILABLE',
        '可信用户、订单或机构资格上下文不可用 / 已过期',
      )
    // Re-read published state after awaiting external adapters.
    const s = this.state(actor, input.templateId)
    if (!s.published) fail(409, 'NOT_PUBLISHED', '模版尚未发布')
    if (trusted.paymentState !== 'idle')
      fail(409, 'PAYMENT_IN_PROGRESS', '原笔支付处理中或状态未知，请先查单')
    const eligibility = Object.fromEntries(
      s.published.payment_methods.map((e) => [
        e.id,
        trusted.eligibility?.[e.id] === true &&
          this.capabilityReader(actor.scope, e) === true,
      ]),
    )
    const result = evaluateBusinessTemplate(s.published, actor.scope, trusted, {
      kills: s.kills,
      eligibility,
    })
    for (const method of result.allowedMethods)
      for (const route of method.eligibleChannels) {
        const entry = s.published.payment_methods.find((e) => e.id === route.id)
        route.subchannelFeatures = this.featureEvaluator(actor, entry, trusted)
      }
    const data = {
      ...result,
      decisionId: randomUUID(),
      orderId: input.orderId,
      templateId: input.templateId,
      revision: s.revision,
      emergencyEpoch: s.emergencyEpoch,
      contextHash: contextHash(trusted),
      featureSnapshot: hash(
        result.allowedMethods.map((m) =>
          m.eligibleChannels.map((c) => [c.id, c.subchannelFeatures]),
        ),
      ),
      expiresAt: Math.min(trusted.expiresAt, this.now() + 60000),
    }
    this.store.saveDecision(scopeKey(actor.scope), data.decisionId, data)
    return data
  }
  async revalidate(actor, decisionId, input) {
    this.requireRole(actor, ['service'])
    const old = this.store.decision(scopeKey(actor.scope), decisionId)
    if (!old || old.expiresAt <= this.now())
      fail(409, 'DECISION_EXPIRED', '决策不存在或已过期，请重新确认')
    const offered = old.allowedMethods
      .find((m) => m.id === input.methodId)
      ?.eligibleChannels.some((c) => c.channelId === input.channelId)
    if (!offered)
      fail(409, 'SELECTION_NOT_OFFERED', '所选方式或渠道不在原展示结果内')
    const current = await this.decide(actor, {
      orderId: old.orderId,
      templateId: old.templateId,
    })
    if (old.expiresAt <= this.now())
      fail(409, 'DECISION_EXPIRED', '复核期间原决策过期，请重新展示并确认')
    const valid =
      current.revision === old.revision &&
      current.emergencyEpoch === old.emergencyEpoch &&
      current.contextHash === old.contextHash &&
      current.featureSnapshot === old.featureSnapshot &&
      current.allowedMethods.some(
        (m) =>
          m.id === input.methodId &&
          m.eligibleChannels.some((c) => c.channelId === input.channelId),
      )
    if (!valid)
      fail(
        409,
        'RECONFIRM_REQUIRED',
        '配置、订单或资格已变化，请重新展示并确认，不自动切换方式',
      )
    return {
      valid: true,
      decisionId: current.decisionId,
      revision: current.revision,
      note: '仅资格复核，不创建或发起支付；支付服务仍须以订单锁和幂等键原子提交',
    }
  }
}
