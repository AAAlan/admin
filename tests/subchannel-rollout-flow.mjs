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
  const { default: Release } = await server.ssrLoadModule(
    '/src/views/payment/TemplateRolloutRelease.vue',
  )
  const release = vmFor(Release, { featureResource: true })
  release.state = {
    draft: { rules: { card_save: { mode: 'off' } } },
    kills: { card_reuse: true },
  }
  release.methodId = 'card_save'
  assert.deepEqual(release.methodIds, ['card_save'])
  assert.deepEqual(release.emergencyLabels, ['记住卡信息'])
  assert.equal(
    release.selectedEmergencyStopped,
    true,
    'Unified control must allow explicitly resuming legacy reuse-only emergency coverage',
  )
  release.state.kills = {}
  assert.equal(release.selectedEmergencyStopped, false)
  release.featureResource = false
  release.state.kills = { card_reuse: true }
  assert.equal(
    release.selectedEmergencyStopped,
    false,
    'Ordinary template methods do not inherit feature aliases',
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
  assert.equal(reopened.draft.rules.paypal_quick.percentage, 0)
  assert.deepEqual(reopened.draft.rules.paypal_quick.platforms, ['apple'])
  assert.equal(Panel.methods.preview, undefined)
  assert.equal(Object.hasOwn(reopened, 'profile'), false)
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

  const cardProps = { ...props, subchannelId: '3', businessMethodId: 'card' }
  const cardPanel = vmFor(Panel, cardProps)
  await cardPanel.load()
  assert.deepEqual(cardPanel.featureKeys, ['card_save'])
  const legacyCard = {
    ...cardPanel.document,
    rules: {
      card_save: { ...cardPanel.draft.rules.card_save, mode: 'all' },
      card_reuse: { ...cardPanel.draft.rules.card_save },
    },
  }
  storage.set(cardPanel.localKey, JSON.stringify(legacyCard))
  const legacyStorage = storage.get(cardPanel.localKey)
  await cardPanel.load()
  assert.equal(cardPanel.legacyCardRules, true)
  assert.equal(
    cardPanel.dirty,
    true,
    'Legacy consolidation requires an explicit save',
  )
  assert.equal(storage.get(cardPanel.localKey), legacyStorage)
  await cardPanel.save()
  assert.deepEqual(
    Object.keys(JSON.parse(storage.get(cardPanel.localKey)).rules),
    ['card_save'],
  )
  assert.equal(cardPanel.legacyCardRules, false)
  const singleControl = {
    ...Panel,
    watch: {},
    data() {
      return {
        ...Panel.data.call(this),
        draft: cardPanel.document,
        countryTexts: { card_save: '' },
        role: 'editor',
      }
    },
  }
  const cardHtml = await renderToString(createSSRApp(singleControl, cardProps))
  assert.equal(
    (cardHtml.match(/<legend(?:\s|>)/g) || []).length,
    1,
    'CARD renders exactly one control',
  )
  assert.equal((cardHtml.match(/type="radio"/g) || []).length, 3)
  assert(!cardHtml.includes('使用已保存的卡'))
  for (const [panelProps, document, countryTexts] of [
    [cardProps, cardPanel.document, { card_save: '' }],
    [props, reopened.document, { paypal_quick: '' }],
  ]) {
    const noPreviewPanel = {
      ...singleControl,
      data() {
        return {
          ...Panel.data.call(this),
          draft: document,
          countryTexts,
          role: 'editor',
        }
      },
    }
    const html = await renderToString(createSSRApp(noPreviewPanel, panelProps))
    assert(!html.includes('功能效果试算'))
    assert(!html.includes('试算功能效果'))
    assert(!html.includes('试算来源'))
    assert(!html.includes('sample-fields'))
    assert(html.includes('高级设置'))
    assert(html.includes('保存本机功能规则'))
    assert(html.includes('重新读取功能配置'))
  }

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
    'Passed: parent binding, Mock persistence/isolation/readonly, single card control, explicit legacy consolidation, no feature preview for CARD/PayPal, and navigation-only home.',
  )
} finally {
  await server.close()
}
