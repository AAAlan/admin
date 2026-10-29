import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer as createHttpServer } from 'node:http'

const storage = new Map()
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
}
const server = await createServer({
  server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  appType: 'custom',
})
try {
  const { default: Form } = await server.ssrLoadModule(
    '/src/views/payment/PaymentSort.vue',
  )
  const { default: Editor } = await server.ssrLoadModule(
    '/src/views/payment/TemplateMethodRollout.vue',
  )
  const { templateMethodEntryId, templateMethodRule } =
    await server.ssrLoadModule('/src/utils/templatePaymentRollout.js')
  const { paymentAPI } = await server.ssrLoadModule('/src/api/index.js')
  const vm = (component, props) => {
    const target = {
      $route: { meta: {}, query: {} },
      $emit() {},
      $message: { success() {}, warning() {}, error() {} },
      ...props,
    }
    Object.assign(target, component.data.call(target))
    for (const [key, method] of Object.entries(component.methods))
      target[key] = method.bind(target)
    for (const [key, getter] of Object.entries(component.computed))
      Object.defineProperty(target, key, { get: getter.bind(target) })
    return target
  }
  const baseMethod = {
    id: 'same_id',
    payment_method_id: 'pm_paypal',
    channel_id: 'channel_a',
    channel_name: 'Provider A',
    pay_name: 'PayPal',
    enabled: true,
  }
  const a = (
    await paymentAPI.saveCashierTemplate({
      create: true,
      region: 'overseas',
      app_id: 'saki',
      currency: 'USD',
      cashier_template_name: 'qa_template_a',
      publish_status: 'published',
      payment_methods: [baseMethod, { ...baseMethod, channel_id: 'channel_b' }],
    })
  ).data
  const b = (
    await paymentAPI.saveCashierTemplate({
      ...a,
      create: true,
      cashier_template_name: 'qa_template_b',
    })
  ).data
  const form = vm(Form, {
    mode: 'drawer',
    region: 'overseas',
    readonly: false,
    prefill: a,
  })
  await form.applyPrefill(a)
  form.config.payment_env = 'pc'
  assert.equal(form.rolloutTemplateContext.environment, 'demo', 'Legacy device metadata is never the rollout environment')
  const before = JSON.stringify([...storage])
  form.openMethodRollout(form.channelList[0])
  const rule = {
    ...templateMethodRule(form.channelList[0]),
    mode: 'gradual',
    percentage: 5,
    platforms: ['google'],
    allow: 'pilot_user',
  }
  form.applyMethodRollout({
    entryId: templateMethodEntryId(form.channelList[0]),
    rule,
  })
  assert.equal(form.channelList[0].rollout.percentage, 5)
  assert.equal(
    form.channelList[1].rollout,
    undefined,
    'Channel B must not inherit channel A rule',
  )
  assert.equal(
    JSON.stringify([...storage]),
    before,
    'Applying dialog must not persist',
  )
  form.handleReset()
  assert.equal(form.channelList[0].rollout, undefined)
  form.applyMethodRollout({
    entryId: templateMethodEntryId(form.channelList[0]),
    rule,
  })
  await form.handleSave()
  const reopened = vm(Form, {
    mode: 'drawer',
    region: 'overseas',
    readonly: false,
    prefill: a,
  })
  await reopened.applyPrefill(a)
  assert.deepEqual(reopened.channelList[0].rollout, rule)
  const other = vm(Form, {
    mode: 'drawer',
    region: 'overseas',
    readonly: false,
    prefill: b,
  })
  await other.applyPrefill(b)
  assert.equal(
    templateMethodRule(other.channelList[0]).mode,
    'all',
    'Template B must stay independent',
  )
  const readonly = vm(Form, {
    mode: 'drawer',
    region: 'overseas',
    readonly: true,
    prefill: a,
  })
  await readonly.applyPrefill(a)
  const saved = JSON.stringify([...storage])
  readonly.applyMethodRollout({
    entryId: templateMethodEntryId(readonly.channelList[0]),
    rule: { ...rule, mode: 'off' },
  })
  await readonly.handleSave()
  assert.equal(JSON.stringify([...storage]), saved)
  assert.equal(readonly.channelList[0].rollout.mode, 'gradual')
  const editor = vm(Editor, {
    visible: true,
    readonly: false,
    method: reopened.channelList[0],
    template: reopened.rolloutTemplateContext,
    methods: reopened.channelList,
    region: 'overseas',
  })
  Editor.watch.visible.handler.call(editor, true)
  editor.draft.percentage = 100.001
  editor.apply()
  assert(editor.error.includes('最多两位小数'))
  editor.draft.percentage = 5
  editor.profile.platform = 'apple'
  assert.equal(editor.results[0].code, 'PLATFORM_MISS')
  editor.profile.platform = 'google'
  assert.equal(editor.results[0].code, 'ALLOW')
  editor.eligibleSample = false
  assert(editor.results.every((result) => !result.hit))
  const context = {}
  const html = await renderToString(
    createSSRApp(Editor, {
      visible: true,
      readonly: false,
      method: reopened.channelList[0],
      template: reopened.rolloutTemplateContext,
      methods: reopened.channelList,
      region: 'overseas',
    }),
    context,
  )
  assert(html.includes('teleport'))
  assert(context.teleports.body.includes('本模版效果试算'))
  assert(context.teleports.body.includes('用户 platform'))
  assert(!context.teleports.body.includes('客户端'))
  assert(
    !/<details[^>]*open/.test(context.teleports.body),
    'Advanced conditions start collapsed',
  )
  console.log(
    'Passed: real template form apply/reset/save/reopen, per-channel/template isolation, readonly, editor validation and eligibility preview; isolated in-memory storage only.',
  )
} finally {
  await server.close()
}
