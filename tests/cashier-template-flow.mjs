import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer as createHttpServer } from 'node:http'

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
}

// Load real Vue components and the mock API with the project's Vite aliases.
// This checks state/persistence without driving a browser or touching user data.
const server = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' })
try {
  const { paymentAPI } = await server.ssrLoadModule('/src/api/index.js')
  const { default: Form } = await server.ssrLoadModule('/src/views/payment/PaymentSort.vue')
  const { default: Selector } = await server.ssrLoadModule('/src/views/payment/PaymentMethodSelector.vue')
  const { default: List } = await server.ssrLoadModule('/src/views/payment/PaymentSortList.vue')
  const { default: Modal } = await server.ssrLoadModule('/src/components/Modal.vue')
  const messages = []
  function vmFor(component, props = {}) {
    const vm = {
      $route: { meta: {}, query: {} },
      $message: Object.fromEntries(['success', 'warning', 'error'].map(type => [type, text => messages.push({ type, text })])),
      $confirm: { confirmStatusChange: () => { throw new Error('Unexpected overseas status prompt') } },
      events: [],
      $emit(name, value) { this.events.push({ name, value }) },
      ...props
    }
    Object.assign(vm, component.data.call(vm))
    for (const [name, method] of Object.entries(component.methods || {})) vm[name] = method.bind(vm)
    for (const [name, getter] of Object.entries(component.computed || {})) {
      Object.defineProperty(vm, name, { get: getter.bind(vm) })
    }
    return vm
  }
  const list = async region => (await paymentAPI.getPaymentSortList({ region, page_size: 1000 })).data.list
  const baseline = await list('overseas')
  const form = vmFor(Form, { mode: 'modal', region: 'overseas', readonly: false, prefill: {} })
  await form.applyPrefill({})
  form.config.cashier_template_name = 'qa_main'
  form.config.currency_code = 'USD'
  await form.handleCurrencyChange()
  assert.equal(form.channelList.length, 0, 'New currency must not automatically fill payment methods')
  form.config.is_simulator = true

  const selector = vmFor(Selector, { region: 'overseas', excludeIds: [] })
  await selector.fetchData()
  selector.selectedChannelId = selector.allMethods.find(method => method.pay_name === 'CARD').channel_id
  assert.deepEqual(selector.uniqueSubchannels.map(sub => sub.pay_name).sort(), ['CARD', 'doku_wallet', 'googlepay', 'paynow', 'paysafecard'].sort(), 'The observed Adyen subchannels must be available')
  const card = selector.uniqueSubchannels.find(method => method.pay_name === 'CARD')
  selector.handleToggleSubchannel(card)
  assert.equal(selector.selectedMethods.length, 1, 'A card subchannel counts once without a brand step')
  selector.handleConfirm()
  const selected = selector.events.find(event => event.name === 'confirm').value
  form.handleMethodSelected(selected)
  form.handleMethodSelected(selected)
  assert.equal(form.channelList.length, 1, 'Repeated additions must not duplicate a method')
  const secondChannel = selector.allMethods.filter(method => method.pay_name === 'CARD').flatMap(method => method.channel_ids).find(id => id !== selected[0].channel_id)
  assert(secondChannel)
  form.handleMethodSelected([{ ...selected[0], channel_id: secondChannel, channel_name: 'Second channel' }])
  form.togglePaymentMethodEnabled(form.channelList[1], { target: { checked: false } })
  assert.equal(form.channelList[0].enabled, true, 'Same method ID across channels must toggle independently')
  form.channelList[0].is_recommended = true
  form.channelList[0].recommend_text = 'Recommended'
  form.draggedIndex = 0
  form.handleDrop(1, { preventDefault() {} })
  await form.handleSave()
  assert(form.events.some(event => event.name === 'saved'))
  let rows = await list('overseas')
  const created = rows.find(row => row.cashier_template_name === 'qa_main')
  assert(created.template_id)
  assert.equal(created.method_count, 2)
  assert.equal(created.is_simulator, true)
  assert.equal(created.payment_methods[0].enabled, false)
  assert.equal(created.payment_methods[1].is_recommended, true)
  assert.deepEqual(created.payment_methods.map(method => method.sort_order), [1, 2])
  assert.equal(rows.length, baseline.length + 1)
  assert.equal((await list('domestic')).length, 2, 'Overseas writes must not leak into domestic templates')
  const parentList = vmFor(List, { region: 'overseas', scenario: '', embedded: false })
  parentList.filters.currency = 'JPY'
  await parentList.handleCreateModalSaved()
  assert.equal(parentList.filters.currency, '')
  assert.equal(parentList.currentPage, parentList.totalPages)
  assert(parentList.sortList.some(row => row.template_id === created.template_id), 'New templates must be visible after creation even with an active currency filter')

  selector.selectedChannelId = selected[0].channel_id
  selector.excludeIds = [`${selected[0].channel_id}::CARD`]
  selector.handleToggleSubchannel(card)
  assert.equal(selector.selectedMethods.length, 0, 'Already-added methods must be unavailable')

  const another = await paymentAPI.saveCashierTemplate({ ...created, create: true, cashier_template_name: 'qa_second' })
  assert.notEqual(another.data.template_id, created.template_id)
  assert.equal((await list('overseas')).length, baseline.length + 2, 'Same-currency templates must coexist')

  const editor = vmFor(Form, { mode: 'drawer', region: 'overseas', readonly: false, prefill: created })
  await editor.applyPrefill(created)
  assert.equal(editor.config.is_simulator, true)
  assert.equal(editor.channelList.length, 2)
  editor.config.currency_code = 'JPY'
  editor.config.cashier_template_name = 'qa_changed'
  editor.config.is_simulator = false
  await editor.handleCurrencyChange()
  editor.handleReset()
  assert.equal(editor.config.currency_code, 'USD')
  assert.equal(editor.config.cashier_template_name, 'qa_main')
  assert.equal(editor.config.is_simulator, true)
  assert.equal(editor.channelList.length, 2, 'Reset must restore fields and payment methods together')
  editor.config.cashier_template_name = 'qa_edited'
  editor.handleRemoveMethod(0)
  await editor.handleSave()
  rows = await list('overseas')
  const edited = rows.find(row => row.template_id === created.template_id)
  assert.equal(edited.cashier_template_name, 'qa_edited')
  assert.equal(edited.method_count, 1)
  assert.equal(rows.length, baseline.length + 2, 'Editing must not append a new template')

  const viewer = vmFor(Form, { mode: 'drawer', region: 'overseas', readonly: true, prefill: edited })
  await viewer.applyPrefill(edited)
  const storedBeforeReadonly = JSON.stringify([...storage])
  viewer.handleRemoveMethod(0)
  await viewer.handleSave()
  assert.equal(JSON.stringify([...storage]), storedBeforeReadonly, 'Viewing must not persist any mutation')
  assert.equal(viewer.channelList.length, 1)

  const listVm = vmFor(List, { region: 'overseas', scenario: '', embedded: false })
  listVm.$confirm = { confirm: async () => { throw new Error('Cancelled') } }
  await listVm.handleDeleteSort(edited)
  assert.equal((await list('overseas')).length, baseline.length + 2, 'Cancelled deletion must keep the template')
  await paymentAPI.deleteCashierTemplate({ ...edited, region: 'overseas' })
  rows = await list('overseas')
  assert(!rows.some(row => row.template_id === created.template_id))
  assert(rows.some(row => row.template_id === another.data.template_id), 'Deletion must not remove another same-currency template')

  listVm.handleEditSort(baseline[0])
  const legacyEditor = vmFor(Form, { mode: 'drawer', region: 'overseas', readonly: false, prefill: listVm.drawerPayload })
  await legacyEditor.applyPrefill(listVm.drawerPayload)
  legacyEditor.config.currency_code = 'HKD'
  legacyEditor.config.cashier_template_name = 'qa_legacy_edit'
  await legacyEditor.handleSave()
  rows = await list('overseas')
  assert.equal(rows.length, baseline.length + 1, 'Changing a seed template currency must update its original identity')
  const legacyEdited = rows.find(row => row.cashier_template_name === 'qa_legacy_edit')
  assert.equal(legacyEdited.currency, 'HKD')
  await paymentAPI.deleteCashierTemplate({ ...legacyEdited, region: 'overseas' })
  assert(!(await list('overseas')).some(row => row.public_template_id === baseline[0].public_template_id), 'Deleted seed edits must not resurrect the seed')

  const failed = vmFor(Form, { mode: 'modal', region: 'overseas', readonly: false, prefill: {} })
  await failed.applyPrefill({})
  failed.config.currency_code = 'USD'
  failed.config.cashier_template_name = 'qa_storage_failure'
  const setItem = localStorage.setItem
  const loggedError = console.error
  localStorage.setItem = () => { throw new Error('Storage full') }
  console.error = () => {}
  try {
    await failed.handleSave()
    assert(!failed.events.some(event => event.name === 'saved'), 'Storage failure must not emit success')
    assert.equal(messages.at(-1).type, 'error')
    assert.equal(failed.saving, false)
  } finally {
    localStorage.setItem = setItem
    console.error = loggedError
  }

  const app = createSSRApp(Form, { mode: 'modal', region: 'overseas' })
  app.component('router-link', { template: '<a><slot /></a>' })
  const html = await renderToString(app)
  assert(html.includes('模拟器模式'))
  assert(html.includes('保存'))
  assert(!html.includes('国家/IP'))
  assert(!html.includes('邮编'))
  assert(!html.includes('collect_postal_code'))

  globalThis.document = { body: { style: { overflow: 'auto' } } }
  const outerModal = vmFor(Modal)
  const innerModal = vmFor(Modal)
  Modal.watch.visible.handler.call(outerModal, true)
  Modal.watch.visible.handler.call(innerModal, true)
  Modal.watch.visible.handler.call(innerModal, false)
  assert.equal(document.body.style.overflow, 'hidden', 'Closing the selector must keep the outer modal scroll lock')
  Modal.beforeUnmount.call(outerModal)
  assert.equal(document.body.style.overflow, 'auto', 'Closing the last modal must restore the original body scroll state')
  delete globalThis.document
  console.log('Passed: create, selector, sorting, recommendation, per-channel enable, reset, edit, readonly, deletion, legacy migration, storage failure, and removed collection fields.')
} finally {
  await server.close()
}
