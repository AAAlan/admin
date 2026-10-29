import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer as createHttpServer } from 'node:http'

// Verify the real page's state transitions without accessing browser storage
// or user configuration. Browser interaction checks complement this file.
const server = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' })
try {
  const { default: Page } = await server.ssrLoadModule('/src/views/payment/PaymentAvailabilityDemo.vue')
  const vm = { $route: { meta: { region: 'domestic' } } }
  Object.assign(vm, Page.data.call(vm))
  for (const [name, method] of Object.entries(Page.methods)) vm[name] = method.bind(vm)
  for (const [name, getter] of Object.entries(Page.computed)) Object.defineProperty(vm, name, { get: getter.bind(vm) })
  const reconcile = () => Page.watch.decisionInputs.call(vm)

  assert.equal(vm.decision.availableMethods.length, 2)
  assert.equal(vm.tab, 'methods')
  assert.deepEqual(vm.tabs.map(item => item.name), ['支付方式', '展示策略', '测试预览'])
  assert.equal(vm.filteredMethods.length, 4)
  vm.methodSearch = '银行'
  assert.deepEqual(vm.filteredMethods.map(item => item.id), ['card'])
  vm.methodSearch = '不存在'
  assert.equal(vm.filteredMethods.length, 0)
  vm.methodSearch = ''
  vm.loadCase('multi_channel')
  reconcile()
  assert.equal(vm.decision.availableMethods.length, 3)
  vm.chooseMethod('card')
  vm.confirmSimulation()
  assert(vm.confirmation.includes('¥6.00'))
  vm.order.price = '30.00'
  reconcile()
  assert.equal(vm.selectedMethodId, 'card', 'Still-valid selection is preserved')
  assert.equal(vm.confirmation, '', 'Old confirmation is invalidated on order change')
  vm.order.discount = '28.00'
  reconcile()
  assert.equal(vm.selectedMethodId, '', 'Ineligible selection is cleared')
  assert(vm.selectionNotice.includes('重新选择'))
  reconcile()
  assert(vm.selectionNotice.includes('重新选择'), 'Subsequent updates must not erase a still-unresolved selection warning')
  vm.selectedMethodId = 'card'
  vm.confirmSimulation()
  assert.equal(vm.selectedMethodId, '', 'A stale ID cannot bypass confirmation checks')
  assert.equal(vm.confirmation, '')
  vm.chooseMethod('wallet_a')
  assert.equal(vm.selectionNotice, '', 'An explicit new selection acknowledges the warning')
  vm.confirmSimulation()
  assert(vm.confirmation.includes('未创建支付订单'))

  vm.draftTemplate.methods[0].minAmount = '6000'
  reconcile()
  assert(vm.configurationErrors.length)
  assert.equal(vm.decision.status, 'ready', 'Invalid draft must not affect active checkout')
  assert.equal(vm.selectedMethodId, 'wallet_a')
  vm.applyDraft()
  assert.equal(vm.template.version, 1, 'Invalid draft cannot be applied')
  vm.discardDraft()
  vm.draftTemplate.methods[0].minAmount = '3.00'
  assert(vm.draftImpactRows.some(item => item.id === 'small' && item.before > item.after))
  vm.template.methods[1].channels[0].health = 'maintenance'
  vm.applyDraft()
  reconcile()
  assert.equal(vm.template.version, 2)
  assert.equal(vm.template.methods[1].channels[0].health, 'maintenance', 'Applying draft cannot restore stale channel state')
  assert.equal(vm.selectedMethodId, '', 'New active rules invalidate ineligible selection')
  assert.equal(vm.draftDirty, false)
  vm.resetDemo()
  assert.equal(vm.template.methods[0].minAmount, '0.01')
  assert.equal(vm.order.discount, '0.00')
  assert.equal(vm.selectedCaseId, 'small')
  assert.equal(vm.decision.availableMethods.length, 2)

  vm.loadCase('large')
  vm.order.verified = false
  reconcile()
  assert.equal(vm.decision.methods[3].state, 'requires_action')
  assert.equal(vm.decision.visibleMethods.length, 4)
  vm.completeQualification()
  assert.equal(vm.decision.methods[3].available, true)
  assert.equal(vm.selectedMethodId, '', 'Qualification completion must not auto-select')
  vm.chooseMethod('installments')
  vm.confirmSimulation()
  assert(vm.confirmation.includes('校验通过'))
  vm.queryMode = 'timeout'
  reconcile()
  assert.equal(vm.decision.status, 'unconfirmed')
  assert.equal(vm.decision.ranking, null)
  assert(vm.decisionTrace[3].detail.includes('不进行支付排序'))
  assert(vm.decisionSnapshot.some(item => item.detail.includes('不排序、不推荐、不默认选中')))
  assert.equal(vm.selectedMethodId, '')
  vm.retryQuery()
  assert.equal(vm.decision.availableMethods.length, 4)
  assert.equal(vm.selectedMethodId, '')
  for (const mode of ['expired', 'mismatch']) {
    vm.queryMode = mode
    assert.equal(vm.decision.status, 'unconfirmed')
    vm.selectedMethodId = 'card'
    vm.confirmSimulation()
    assert.equal(vm.confirmation, '')
  }
  vm.retryQuery()
  vm.chooseMethod('card')
  vm.order.paymentState = 'unknown'
  vm.confirmSimulation()
  assert(vm.selectionNotice.includes('先查单'))
  assert.equal(vm.confirmation, '')
  vm.order.paymentState = 'idle'

  vm.loadCase('tax')
  assert.equal(vm.decision.amount.payable, 500)
  vm.loadCase('mixed')
  assert.deepEqual(vm.order.productTypes, ['one_time', 'subscription'])
  assert.deepEqual(vm.decision.availableMethods.map(item => item.id), ['card'])

  vm.order.device = 'native'
  vm.order.country = 'HK'
  vm.loadCase('subscription')
  reconcile()
  assert.equal(vm.order.device, 'native', 'Switching product preserves shared conditions')
  assert.equal(vm.order.country, 'HK')
  assert.deepEqual(vm.decision.availableMethods.map(item => item.id), ['card'])
  const comparison = vm.comparisonRows.find(item => item.id === 'large')
  assert.deepEqual(comparison.result.availableMethods.map(item => item.id), ['card'])

  vm.resetDemo()
  vm.loadCase('standard')
  vm.historyScenario = 'wallet_b'
  vm.strategyDraft.mode = 'data_driven'
  vm.strategyDraft.recommendedMethodId = 'wallet_a'
  vm.strategyDraft.defaultPolicy = 'first'
  assert.equal(vm.strategyDirty, true)
  assert.equal(vm.decision.ranking.effectiveMode, 'fixed', 'Unapplied strategy does not affect checkout')
  assert.equal(vm.selectedMethodId, '')
  vm.applyStrategy()
  reconcile()
  assert.equal(vm.strategy.version, 2)
  assert.deepEqual(vm.decision.availableMethods.map(item => item.id), ['wallet_b', 'card', 'wallet_a'])
  assert.equal(vm.selectedMethodId, 'wallet_b', 'Explicit strategy application opens preview with configured default')
  assert.deepEqual(vm.decision.ranking.tags.wallet_a, ['推荐'])
  assert.equal(vm.rankingLock, null, 'Default choice is not a manual interaction lock')

  vm.chooseMethod('card')
  vm.scoreScenario = 'reverse'
  assert.deepEqual(vm.decision.availableMethods.map(item => item.id), ['wallet_b', 'card', 'wallet_a'])
  assert.equal(vm.decision.ranking.frozen, true)
  vm.refreshDecision()
  reconcile()
  assert.deepEqual(vm.decision.availableMethods.map(item => item.id), ['wallet_b', 'wallet_a', 'card'])
  assert.equal(vm.selectedMethodId, 'card', 'Refresh preserves a still-valid confirmed choice')
  vm.scoreScenario = 'timeout'
  assert.equal(vm.decision.ranking.effectiveMode, 'preference')
  vm.historyScenario = 'other_account'
  assert.equal(vm.decision.ranking.effectiveMode, 'fixed')

  vm.queryMode = 'timeout'
  vm.strategyDraft.backupEnabled = true
  vm.applyStrategy()
  reconcile()
  assert.equal(vm.queryMode, 'timeout', 'Applying strategy must not silently recover an active query fault')
  assert.equal(vm.selectedMethodId, '')
  assert.equal(vm.decision.status, 'unconfirmed')
  vm.retryQuery()
  vm.chooseMethod('card')
  vm.template.methods.forEach(method => method.channels.forEach(channel => { channel.health = 'maintenance' }))
  reconcile()
  assert.equal(vm.decision.selectedTemplate.id, vm.backupTemplate.id)
  assert.equal(vm.selectedMethodId, '', 'Same method ID in another template requires explicit confirmation')
  assert(vm.selectionNotice.includes('重新选择'))
  vm.chooseMethod('card')
  vm.confirmSimulation()
  assert(vm.confirmation.includes('已授权备用模板'))

  vm.resetDemo()
  vm.strategyDraft.defaultPolicy = 'history'
  vm.strategyDraft.recommendedMethodId = 'card'
  vm.applyStrategy()
  assert.equal(vm.selectedMethodId, 'wallet_a')
  assert.equal(vm.decision.ranking.tags.card, undefined, 'Ineligible method gets neither tag nor default')
  vm.strategyDraft.baseOrder = ['wallet_a', 'wallet_a']
  const strategyVersion = vm.strategy.version
  vm.applyStrategy()
  assert.equal(vm.strategy.version, strategyVersion, 'Invalid strategy stays isolated')
  vm.discardStrategy()
  vm.moveBaseMethod(1, -1)
  vm.applyStrategy()
  assert.equal(vm.decision.availableMethods[0].id, 'wallet_b')
  vm.resetDemo()
  assert.equal(vm.strategy.mode, 'fixed')
  assert.equal(vm.strategy.backupEnabled, false)
  assert.equal(vm.rankingLock, null)

  vm.loadCase('standard')
  vm.historyScenario = 'wallet_b'
  vm.order.device = 'native'
  vm.strategyDraft.mode = 'preference'
  vm.applyStrategy()
  assert.deepEqual(vm.decision.ranking.tags.card, ['曾成功使用'])
  assert(vm.decisionSnapshot.some(item => item.detail.includes('用户偏好排序 → 用户偏好排序')))
  vm.resetDemo()

  // The new workspace applies one reviewed change set, not two independent saves.
  vm.openMethod('wallet_a')
  assert.equal(vm.editingMethod.id, 'wallet_a')
  vm.editingMethod.minAmount = '3.00'
  vm.closeMethod()
  assert.equal(vm.editingMethod, null)
  assert.equal(vm.template.methods[0].minAmount, '0.01', 'Closing details retains draft, not live changes')
  assert.equal(vm.methodChanged('wallet_a'), true)
  vm.methodFilter = 'changed'
  assert.deepEqual(vm.filteredMethods.map(item => item.id), ['wallet_a'])
  assert.equal(vm.pendingChanges.length, 1)
  vm.strategyDraft.baseOrder = ['wallet_a', 'wallet_a']
  assert.equal(vm.applyConfiguration(), false)
  assert.equal(vm.template.version, 1, 'Invalid strategy must also prevent partial rule application')
  assert.equal(vm.template.methods[0].minAmount, '0.01')
  vm.discardStrategy()
  vm.strategyDraft.mode = 'preference'
  vm.draftTemplate.methods[0].minAmount = '6000.00'
  assert.equal(vm.applyConfiguration(), false)
  assert.equal(vm.strategy.version, 1, 'Invalid rule must also prevent partial strategy application')
  assert.equal(vm.strategy.mode, 'fixed')
  vm.draftTemplate.methods[0].minAmount = '3.00'
  vm.strategyDraft.mode = 'preference'
  vm.strategyDraft.backupEnabled = true
  vm.queryMode = 'timeout'
  vm.template.methods[1].channels[0].health = 'maintenance'
  assert.equal(vm.pendingChanges.length, 3)
  assert.equal(vm.applyConfiguration(), true)
  assert.equal(vm.template.version, 2)
  assert.equal(vm.strategy.version, 2)
  assert.equal(vm.tab, 'simulation')
  assert.equal(vm.testView, 'single')
  assert.equal(vm.hasChanges, false)
  assert.equal(vm.queryMode, 'timeout')
  assert.equal(vm.template.methods[1].channels[0].health, 'maintenance')
  assert(vm.configurationNotice.includes('未发布线上'))
  vm.restoreTestEnvironment()
  assert.equal(vm.queryMode, 'normal')
  assert.equal(vm.template.methods[1].channels[0].health, 'available')
  assert.equal(vm.template.methods[0].minAmount, '3.00', 'Restore test conditions must not reset configured business rules')
  assert.equal(vm.strategy.mode, 'preference')
  assert.equal(vm.hasChanges, false, 'Fault simulation is never a configuration draft')
  vm.draftTemplate.methods[2].enabled = false
  vm.strategyDraft.defaultPolicy = 'first'
  vm.restoreTestEnvironment()
  assert.equal(vm.draftTemplate.methods[2].enabled, false, 'Restore test conditions retains unfinished method edits')
  assert.equal(vm.strategyDraft.defaultPolicy, 'first', 'Restore test conditions retains unfinished strategy edits')
  assert.equal(vm.selectedMethodId, '', 'Restore test conditions must not apply a draft default or auto-select')
  vm.methodFilter = 'disabled'
  assert.deepEqual(vm.filteredMethods.map(item => item.id), ['card'])
  vm.discardConfiguration()
  assert.equal(vm.hasChanges, false)
  assert.equal(vm.template.methods[2].enabled, true)
  vm.resetDemo()

  vm.$route.meta.region = 'overseas'
  Page.watch['$route.meta.region'].call(vm)
  assert.equal(vm.template.currency, 'USD')
  assert.equal(vm.order.country, 'US')
  assert.equal(vm.order.device, 'web')

  const app = createSSRApp(Page)
  app.config.globalProperties.$route = { meta: { region: 'domestic' } }
  const html = await renderToString(app)
  assert(html.includes('收银台支付方式决策'))
  assert(html.includes('支付方式列表'))
  assert(html.includes('搜索支付方式'))
  assert(html.includes('查看变更并应用'))
  const buttonLabels = (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []).map(button => button.replace(/<[^>]*>/g, '').trim())
  assert.equal(buttonLabels.filter(label => label === '测试预览').length, 1, 'Testing has one navigation entry, not duplicate actions')
  assert(!html.includes('模拟发起前校验'), 'Default view focuses on configuration, not test/debug controls')
  assert(!html.includes('ReferenceError'))
  const testApp = createSSRApp({ ...Page, data() { return { ...Page.data.call(this), tab: 'simulation' } } })
  testApp.config.globalProperties.$route = { meta: { region: 'domestic' } }
  const testHtml = await renderToString(testApp)
  assert(testHtml.includes('2 / 4 种可用'))
  assert(testHtml.includes('模拟发起前校验'))
  assert(testHtml.includes('查看决策详情'))
  assert(testHtml.includes('高级测试'))
  assert(!testHtml.includes('支付方式业务限制配置'), 'Simulation does not duplicate configuration editing')
  console.log('Passed: configuration/test separation; searchable method list; detail draft retention; atomic reviewed application; test restoration isolation; page render; eligibility/query guards; three sorting modes and fallback; ranking lock; template-bound selection; backup confirmation; reset and region isolation.')
} finally {
  await server.close()
}
