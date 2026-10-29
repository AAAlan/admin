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

  vm.$route.meta.region = 'overseas'
  Page.watch['$route.meta.region'].call(vm)
  assert.equal(vm.template.currency, 'USD')
  assert.equal(vm.order.country, 'US')
  assert.equal(vm.order.device, 'web')

  const app = createSSRApp(Page)
  app.config.globalProperties.$route = { meta: { region: 'domestic' } }
  const html = await renderToString(app)
  assert(html.includes('收银台支付方式决策'))
  assert(html.includes('2 / 4 种可用'))
  assert(html.includes('模拟发起前校验'))
  assert(html.includes('demo_shared_cny'))
  assert(html.includes('查看本次决策快照与模板尝试'))
  assert(!html.includes('ReferenceError'))
  console.log('Passed: page render; eligibility and query guards; rule/strategy draft isolation; three sorting modes and fallback; independent tags/default; ranking lock/refresh; template-bound selection; backup switch confirmation; tax/mixed orders; reset and region isolation.')
} finally {
  await server.close()
}
