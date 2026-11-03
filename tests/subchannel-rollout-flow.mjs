import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { createServer as createHttpServer } from 'node:http'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
}
const server = await createServer({
  server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  appType: 'custom',
})
const vmFor = (component, props = {}) => {
  const target = {
    $route: { meta: { region: 'overseas' }, query: {} },
    $emit() {},
    ...props,
  }
  Object.assign(target, component.data?.call(target))
  for (const [name, method] of Object.entries(component.methods || {}))
    target[name] = method.bind(target)
  for (const [name, getter] of Object.entries(component.computed || {}))
    Object.defineProperty(target, name, { get: getter.bind(target) })
  return target
}
try {
  const { default: Panel } = await server.ssrLoadModule(
    '/src/views/payment/SubchannelFeatureRollout.vue',
  )
  const { default: Channels } = await server.ssrLoadModule(
    '/src/views/payment/PaymentChannels.vue',
  )
  const { default: Editor } = await server.ssrLoadModule(
    '/src/views/payment/PaymentMethodEdit.vue',
  )
  const { default: Home } = await server.ssrLoadModule(
    '/src/views/payment/PaymentRolloutHome.vue',
  )
  const channels = vmFor(Channels)
  channels.handleEditSubchannel(
    { channel_id: 'account_b', pay_name: 'PayPal B' },
    { id: '5', pay_name: 'PayPal' },
  )
  assert.equal(channels.subEditDrawerPayload._parentChannelId, 'account_b')
  const editor = vmFor(Editor, { prefill: channels.subEditDrawerPayload })
  assert.equal(editor.featureChannelId, 'account_b')
  assert.deepEqual(editor.featureKeys, ['paypal_quick'])
  editor.formData.pay_name = 'CARD'
  assert.equal(
    editor.featureBusinessId,
    'paypal',
    'Unsaved metadata must not switch feature resource',
  )

  const props = {
    channelId: 'account_b',
    subchannelId: '5',
    businessMethodId: 'paypal',
    channelName: 'PayPal B',
    region: 'overseas',
    readonly: false,
  }
  const panel = vmFor(Panel, props)
  await panel.load()
  assert.equal(
    panel.useBackend,
    false,
    'This flow test intentionally uses isolated Mock storage',
  )
  assert.equal(panel.draft.rules.paypal_quick.mode, 'off')
  panel.draft.rules.paypal_quick.mode = 'gradual'
  panel.draft.rules.paypal_quick.percentage = 0
  panel.draft.rules.paypal_quick.allow = 'pilot_user'
  panel.draft.rules.paypal_quick.platforms = ['apple']
  assert.equal(storage.size, 0, 'Editing without save never persists')
  await panel.save()
  assert.equal(storage.size, 1)
  const reopened = vmFor(Panel, props)
  await reopened.load()
  assert.equal(reopened.draft.rules.paypal_quick.allow, 'pilot_user')
  await reopened.preview()
  assert.equal(reopened.results[0].code, 'ALLOW')
  assert.equal(reopened.previewStale, false)
  reopened.authorizationSample = false
  assert.equal(reopened.previewStale, true)
  await reopened.preview()
  assert.equal(reopened.results[0].code, 'AUTHORIZATION_REQUIRED')
  reopened.draft.rules.paypal_quick.percentage = 100.001
  reopened.draft.rules.paypal_quick.mode = 'off'
  reopened.normalizeInactivePercentage('paypal_quick')
  assert.equal(
    reopened.draft.rules.paypal_quick.percentage,
    0,
    'Hidden invalid percentages must not block shutdown',
  )
  assert.equal(
    reopened.draft.rules.paypal_quick.allow,
    'pilot_user',
    'Mode switches retain advanced conditions',
  )
  const other = vmFor(Panel, { ...props, channelId: 'account_c' })
  await other.load()
  assert.equal(other.draft.rules.paypal_quick.mode, 'off')
  const readonly = vmFor(Panel, { ...props, readonly: true })
  await readonly.load()
  readonly.draft.rules.paypal_quick.mode = 'all'
  const saved = JSON.stringify([...storage])
  await readonly.save()
  assert.equal(JSON.stringify([...storage]), saved)
  storage.set(
    other.localKey,
    JSON.stringify({
      rules: {
        paypal_quick: { ...other.draft.rules.paypal_quick, devices: ['ios'] },
      },
    }),
  )
  await other.load()
  assert.equal(other.draft, null)
  assert(other.error.includes('不支持'))

  const homeApp = createSSRApp(Home).component('RouterLink', {
    props: ['to'],
    setup(props, { slots }) {
      return () => h('a', { href: props.to }, slots.default?.())
    },
  })
  const homeHtml = await renderToString(homeApp)
  assert(homeHtml.includes('前往子渠道配置'))
  assert(homeHtml.includes('前往收银台模版'))
  assert(
    !homeHtml.includes('type="radio"'),
    'Home must not expose a second rule editor',
  )
  const routeSource = await readFile(
    new URL('../src/router/index.js', import.meta.url),
    'utf8',
  )
  assert(
    routeSource.includes("import('@/views/payment/PaymentRolloutHome.vue')"),
  )
  assert(
    !routeSource.includes("import('@/views/payment/PaymentRolloutDemo.vue')"),
  )
  console.log(
    'Passed: parent binding, stable resource identity, Mock save/reopen/unsaved isolation/readonly/invalid storage, authorization preview, and navigation-only rollout home.',
  )
} finally {
  await server.close()
}
