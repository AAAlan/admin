<template>
  <div class="availability-demo page-container">
    <header class="page-header demo-header">
      <div>
        <div class="demo-heading"><h1 class="page-title">收银台支付方式决策</h1><span class="demo-tag">测试环境</span></div>
        <p class="demo-subtitle">管理支付方式和展示策略，再用订单验证实际效果。</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" type="button" :disabled="!hasChanges" @click="openReview">查看变更并应用<span v-if="hasChanges"> · {{ pendingChanges.length }}</span></button>
      </div>
    </header>

    <div class="demo-notice"><Icon name="alert" :size="15" /><span>仅本地演示，使用虚构数据；不修改线上配置，不发起真实支付。</span></div>
    <section class="config-context" aria-label="当前配置范围">
      <div><strong>{{ template.name }}</strong><span>{{ template.currency }} · {{ template.country === 'CN' ? '中国大陆' : '美国' }} · 演示商户</span></div>
      <span class="context-version">规则 v{{ template.version }} / 策略 v{{ strategy.version }}</span>
    </section>
    <div v-if="hasChanges" class="draft-banner" role="status"><span><strong>{{ pendingChanges.length }} 项未应用更改</strong> · 测试仍使用已应用配置</span><button class="btn btn-text" type="button" @click="discardConfiguration">放弃全部更改</button></div>
    <p v-if="configurationNotice" class="configuration-notice" role="status">{{ configurationNotice }}</p>
    <nav class="demo-tabs" aria-label="管理工作区">
      <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: tab === item.id }" :aria-current="tab === item.id ? 'page' : undefined" @click="tab = item.id">{{ item.name }}<span v-if="item.id === 'methods'" class="tab-count">{{ template.methods.length }}</span></button>
    </nav>

    <section v-if="tab === 'methods'" class="demo-panel" aria-labelledby="methods-heading">
      <div class="panel-heading"><div><h2 id="methods-heading">支付方式</h2><p>统一管理模板候选。启用不等于每笔订单都可用，系统仍会检查金额、商品和渠道能力。</p></div><span>{{ draftTemplate.methods.filter(method => method.enabled).length }} 种启用</span></div>
      <div class="method-toolbar">
        <label class="search-field"><Icon name="search" :size="15" /><input v-model="methodSearch" class="input" type="search" aria-label="搜索支付方式" placeholder="搜索支付方式" /></label>
        <select v-model="methodFilter" class="select status-filter" aria-label="筛选配置状态"><option value="all">全部状态</option><option value="enabled">已启用</option><option value="disabled">已停用</option><option value="changed">有未应用更改</option></select>
        <span class="field-hint">显示 {{ filteredMethods.length }} / {{ template.methods.length }} 种</span>
      </div>
      <div class="table-scroll"><table class="workspace-table method-table" aria-label="支付方式列表"><thead><tr><th>支付方式</th><th>模板状态</th><th>支付能力</th><th>业务金额限制</th><th>操作</th></tr></thead><tbody>
        <tr v-for="method in filteredMethods" :key="method.id">
          <td><button class="method-name" type="button" @click="openMethod(method.id)">{{ method.name }}</button><span v-if="methodChanged(method.id)" class="pending-label">待应用</span><p class="field-hint">{{ method.channels.length }} 条执行渠道</p></td>
          <td><span class="status-label" :class="method.enabled ? 'status-label--success' : 'status-label--muted'">{{ method.enabled ? '已启用' : '已停用' }}</span></td>
          <td>{{ method.productTypes.includes('subscription') ? '一次性 / 订阅' : '一次性支付' }}<p class="field-hint">{{ method.devices.length === 2 ? '网页、原生' : '仅网页' }}{{ method.requiresVerified ? ' · 需实名' : '' }}</p></td>
          <td>{{ money(method.minAmount) }} – {{ money(method.maxAmount) }}<p class="field-hint">还须满足渠道硬性限额</p></td>
          <td><button class="btn btn-text" type="button" :aria-label="`管理${method.name}`" @click="openMethod(method.id)">管理</button></td>
        </tr>
        <tr v-if="!filteredMethods.length"><td colspan="5" class="empty-cell">没有匹配的支付方式。<button class="btn btn-text" type="button" @click="methodSearch = ''; methodFilter = 'all'">清除筛选</button></td></tr>
      </tbody></table></div>
      <div class="panel-footnote">机构授权、支持范围和渠道限额只读；业务设置只能收窄适用范围。</div>
    </section>

    <section v-else-if="tab === 'strategy'" class="demo-panel" aria-labelledby="strategy-heading">
      <div class="panel-heading"><div><h2 id="strategy-heading">展示策略</h2><p>只调整本单可用方式的展示，不改变支付资格或执行渠道。</p></div><span>当前已应用：{{ modeName(strategy.mode) }}</span></div>
      <div class="strategy-layout">
        <section class="strategy-main">
          <label class="field-label" for="decision-mode">排序模式</label>
          <select id="decision-mode" v-model="strategyDraft.mode" class="select"><option value="fixed">固定排序</option><option value="preference">用户偏好排序（成功历史推断）</option><option value="data_driven">数据驱动排序（示例评分）</option></select>
          <p class="mode-description">{{ modeDescription }}</p>
          <h3>基础顺序</h3><p class="field-hint">固定模式按此展示；其他模式也以此作为稳定兜底。</p>
          <ol class="base-order-list"><li v-for="(methodId, index) in strategyDraft.baseOrder" :key="methodId"><span><span class="order-index">{{ index + 1 }}</span>{{ methodName(methodId) }}<small v-if="!draftTemplate.methods.find(method => method.id === methodId)?.enabled">已停用，不参与本单排序</small></span><div><button class="btn btn-text" type="button" :disabled="index === 0" :aria-label="`${methodName(methodId)}上移`" @click="moveBaseMethod(index, -1)">上移</button><button class="btn btn-text" type="button" :disabled="index === strategyDraft.baseOrder.length - 1" :aria-label="`${methodName(methodId)}下移`" @click="moveBaseMethod(index, 1)">下移</button></div></li></ol>
        </section>
        <aside class="strategy-side"><h3>始终遵守</h3><ul><li>先检查可用性，再排序。</li><li>历史偏好最多提前一项。</li><li>数据异常回偏好，再回基础顺序。</li><li>用户已操作时，普通数据更新不打乱列表。</li></ul><p>没有用户主动设置偏好，也没有运营活动置顶。</p></aside>
      </div>
      <details class="settings-disclosure"><summary>更多展示设置<span>默认选择、推荐与历史标签</span></summary><div class="form-grid">
        <div><label class="field-label" for="decision-default">默认选中规则</label><select id="decision-default" v-model="strategyDraft.defaultPolicy" class="select"><option value="none">不默认选中</option><option value="first">第一可用项</option><option value="history">最近可用成功历史优先，无记录回第一可用项</option></select><p class="field-hint">仅重开预览时应用，不代表用户已授权付款。</p></div>
        <div><label class="field-label" for="decision-recommended">推荐标签指定方式</label><select id="decision-recommended" v-model="strategyDraft.recommendedMethodId" class="select"><option value="">不展示推荐标签</option><option v-for="method in template.methods" :key="method.id" :value="method.id">{{ method.name }}</option></select><p class="field-hint">仅本单可用时展示；标签不置顶、不改变默认选择。</p></div>
        <div class="full-width"><label class="checkbox-label"><input v-model="strategyDraft.showHistoryTag" type="checkbox" />展示有依据的成功历史标签</label><p class="field-hint">最近一次成功标“上次成功使用”；采用更早记录标“曾成功使用”。</p></div>
      </div></details>
      <details class="settings-disclosure"><summary>无可用方式时的兜底<span>兼容备用模板</span></summary><label class="checkbox-label"><input v-model="strategyDraft.backupEnabled" type="checkbox" />启用预先授权的兼容备用模板</label><p class="field-hint">{{ backupTemplate.name }} · 仅主模板无可直接支付方式时尝试；不合并列表，不绕过硬限制，切换模板须重新确认选择。</p></details>
    </section>

    <section v-else aria-labelledby="testing-heading">
      <div class="testing-heading"><div><h2 id="testing-heading">测试预览</h2><p class="field-hint">使用已应用配置；修改测试条件不会改写配置。</p></div><div class="segmented" aria-label="测试视图"><button type="button" :class="{ active: testView === 'single' }" :aria-pressed="testView === 'single'" @click="testView = 'single'">单笔订单</button><button type="button" :class="{ active: testView === 'batch' }" :aria-pressed="testView === 'batch'" @click="testView = 'batch'">多商品对比</button></div></div>
      <template v-if="testView === 'single'">
        <div class="simulation-grid">
          <section class="demo-panel order-panel" aria-labelledby="order-heading">
            <div class="panel-heading"><h2 id="order-heading">订单条件</h2><span>修改后即时计算</span></div>
            <div class="panel-body">
              <label class="field-label" for="availability-product">选择示例商品</label><select id="availability-product" class="select" :value="selectedCaseId" @change="loadCase($event.target.value)"><option v-for="item in cases" :key="item.id" :value="item.id">{{ item.name }} · {{ money(item.price) }}</option></select>
              <div class="form-grid amount-grid">
                <div><label class="field-label" for="availability-price">模拟商品定价</label><input id="availability-price" v-model="order.price" class="input" type="text" inputmode="decimal" autocomplete="off" /></div>
                <div><label class="field-label" for="availability-discount">优惠金额</label><input id="availability-discount" v-model="order.discount" class="input" type="text" inputmode="decimal" autocomplete="off" /></div>
                <div><label class="field-label" for="availability-tax">模拟税费</label><input id="availability-tax" v-model="order.tax" class="input" type="text" inputmode="decimal" autocomplete="off" /></div>
              </div>
              <div class="payable-summary"><span>最终待支付金额 · {{ order.currency }}</span><strong data-testid="payable-amount">{{ format(decision.amount.payable, order.currency) }}</strong></div>
              <div class="form-grid order-fields">
                <div><label class="field-label" for="availability-country">交易地区</label><select id="availability-country" v-model="order.country" class="select"><option :value="template.country">{{ template.country === 'CN' ? '中国大陆 · CN' : '美国 · US' }}</option><option value="HK">中国香港 · HK</option></select></div>
                <div><label class="field-label" for="availability-device">支付环境</label><select id="availability-device" v-model="order.device" class="select"><option value="web">网页收银台</option><option value="native">原生收银台</option></select></div>
                <div class="full-width"><label class="field-label" for="decision-history">成功支付历史样本</label><select id="decision-history" v-model="historyScenario" class="select"><option value="none">无有效成功历史</option><option value="wallet_b">上次钱包 B，更早银行卡</option><option value="card">上次银行卡，更早钱包 B</option><option value="expired">仅有过期历史</option><option value="other_account">仅有其他账户历史</option><option value="unavailable">历史服务不可用</option></select></div>
              </div>
              <details class="inline-details"><summary>更多订单条件</summary><div class="form-grid">
                <div><label class="field-label" for="availability-type">商品类型</label><select id="availability-type" :value="productType" class="select" @change="setProductType($event.target.value)"><option value="one_time">一次性购买</option><option value="subscription">自动续费订阅</option><option value="mixed">一次性 + 订阅合并订单</option></select></div>
                <div><label class="field-label" for="availability-currency">订单币种</label><select id="availability-currency" v-model="order.currency" class="select"><option value="CNY">CNY</option><option value="USD">USD</option></select></div>
                <label class="checkbox-label full-width"><input v-model="order.verified" type="checkbox" />已满足实名资格</label>
              </div></details>
            </div>
          </section>
          <section class="demo-panel preview-panel" aria-labelledby="preview-heading">
            <div class="panel-heading"><h2 id="preview-heading">收银台效果</h2><span class="result-pill" data-testid="available-count">{{ decision.availableMethods.length }} / {{ activeTemplate.methods.length }} 种可用</span></div>
            <div class="panel-body">
              <div class="checkout-title"><strong>{{ order.productName }}</strong><span>{{ productTypeLabel(productType) }}</span></div>
              <div class="checkout-amount"><span>应付金额</span><strong>{{ format(decision.amount.payable, order.currency) }}</strong></div>
              <p class="preview-instruction">选择支付方式</p>
              <div v-if="decision.visibleMethods.length" class="method-options" role="radiogroup" aria-label="选择支付方式">
                <div v-for="method in decision.visibleMethods" :key="method.id" class="method-option" :class="{ selected: selectedMethodId === method.id, 'method-option--disabled': !method.available }">
                  <label class="method-choice"><input v-model="selectedMethodId" type="radio" name="availability-payment-method" :value="method.id" :disabled="!method.available" :aria-label="method.name" @change="chooseMethod(method.id)" /><span class="method-option-content"><strong>{{ method.name }}</strong><span>{{ method.available ? method.description : method.userMessage }}</span><span v-if="method.available && decision.ranking?.tags[method.id]?.length" class="method-tags"><span v-for="tag in decision.ranking.tags[method.id]" :key="tag">{{ tag }}</span></span></span></label>
                  <button v-if="method.state === 'requires_action'" class="btn btn-text" type="button" @click="completeQualification">模拟完成实名</button><span v-else-if="!method.available" class="status-label status-label--muted">{{ stateLabel(method.state) }}</span>
                </div>
              </div>
              <div v-if="decision.status !== 'ready'" class="preview-empty" role="status"><strong>{{ emptyTitle }}</strong><p v-for="message in decision.errors" :key="message">{{ message }}</p><p v-if="decision.status === 'unconfirmed'">查询未成功或结果失效，不代表本单不支持支付。</p></div>
              <div v-if="hasQueryIssue" class="query-notice" role="status">{{ decision.availableMethods.length ? '部分方式尚未确认，独立确认可用的方式仍可选择。' : '支付方式尚未确认，请重试。' }}<button class="btn btn-text" type="button" @click="retryQuery">重试查询（恢复正常模拟）</button></div>
              <p v-if="paymentBlocked" class="selection-notice" role="alert">原笔支付处理中或结果未知，请先查单。不能再次发起或自动换渠道扣款。</p>
              <p v-if="selectionNotice" class="selection-notice" role="status">{{ selectionNotice }}</p>
              <button class="btn btn-primary simulate-button" type="button" :disabled="!selectedMethodId || decision.status !== 'ready' || paymentBlocked" @click="confirmSimulation">模拟发起前校验</button>
              <div v-if="confirmation" class="confirmation" role="status">{{ confirmation }}</div>
            </div>
            <div class="preview-bottom"><span>{{ modeName(decision.ranking?.effectiveMode) }}{{ decision.ranking?.frozen ? ' · 顺序已冻结' : '' }}</span><button class="btn btn-text" type="button" @click="refreshDecision">重新决策</button></div>
            <p v-if="decision.ranking?.fallbackReason || decision.selectedTemplate?.id === backupTemplate.id" class="result-note" role="status">{{ decision.ranking?.fallbackReason }}{{ decision.selectedTemplate?.id === backupTemplate.id ? '；当前使用已授权备用模板' : '' }}</p>
          </section>
        </div>

        <details class="demo-panel diagnostic-panel">
          <summary class="section-summary">查看决策详情<span>隐藏原因、排序依据与版本有效期</span></summary>
          <nav class="detail-tabs" aria-label="决策详情视图"><button v-for="item in diagnosticTabs" :key="item.id" class="btn btn-text" type="button" :class="{ active: diagnosticView === item.id }" :aria-pressed="diagnosticView === item.id" @click="diagnosticView = item.id">{{ item.name }}</button></nav>
          <div v-if="diagnosticView === 'methods'" class="table-scroll">
            <table class="workspace-table diagnostic-table" aria-label="支付方式适用性判断明细"><thead><tr><th>支付方式</th><th>本单结果</th><th>展示依据</th><th>执行渠道</th></tr></thead><tbody>
              <tr v-for="method in decision.methods" :key="method.id"><td><strong>{{ method.name }}</strong></td><td><span class="status-label" :class="method.available ? 'status-label--success' : 'status-label--muted'">{{ stateLabel(method.state) }}</span><p class="field-hint">{{ method.visible ? method.available ? '展示，可选择' : '展示，不可选择' : '默认隐藏' }}</p></td>
                <td><template v-if="method.available">第 {{ decision.availableMethods.findIndex(item => item.id === method.id) + 1 }} 位 · {{ decision.ranking?.reasons[method.id] }}<p class="field-hint">标签：{{ decision.ranking?.tags[method.id]?.join('、') || '无' }}；首次默认候选：{{ decision.ranking?.defaultMethodId === method.id ? '是' : '否' }}</p></template><ul v-else class="reason-list"><li v-for="(reason, index) in method.reasons" :key="`${reason.code}_${index}`">{{ reason.message }}<small>{{ sourceLabel(reason.source) }} · {{ reason.code }} · v{{ reason.sourceVersion }}</small></li></ul></td>
                <td><details class="channel-details"><summary>{{ method.eligibleChannels.length }} / {{ method.channels.length }} 条可用</summary><div v-for="channel in method.channels" :key="channel.id" class="channel-result"><strong>{{ channel.name }} · {{ stateLabel(channel.state) }}</strong><span>{{ channel.merchantAccount }} · {{ channel.capabilityVersion }}</span><span>{{ channel.available ? '满足本单条件，不保证支付成功' : channel.reasons.map(reason => reason.message).join('；') }}</span><span>模拟原始结果：{{ channel.rawCode || '无成功查询结果' }}</span></div></details></td>
              </tr><tr v-if="!decision.methods.length"><td colspan="4">{{ decision.errors.join(' ') }}</td></tr>
            </tbody></table>
          </div>
          <ol v-else-if="diagnosticView === 'trace'" class="decision-steps"><li v-for="(step, index) in decisionTrace" :key="step.name"><span class="step-index">{{ index + 1 }}</span><div><strong>{{ step.name }}</strong><p>{{ step.detail }}</p></div></li></ol>
          <div v-else class="snapshot-body"><p class="field-hint">当前内存快照，不是生产审计记录。</p><dl class="snapshot-grid"><div v-for="item in decisionSnapshot" :key="item.name"><dt>{{ item.name }}</dt><dd>{{ item.detail }}</dd></div></dl><h3>模板尝试</h3><ol class="template-attempts"><li v-for="attempt in decision.attempts" :key="attempt.id"><strong>{{ attempt.name }} · {{ statusTitle(attempt.status) }}</strong><p>{{ attempt.count }} 种可直接支付 · {{ attempt.message || '已独立完成判断' }}</p></li></ol></div>
        </details>

        <details class="demo-panel advanced-testing">
          <summary class="section-summary">高级测试<span>评分异常、机构查询、原笔状态与渠道故障</span></summary>
          <div class="panel-body"><div class="test-environment-heading"><p class="field-hint">仅模拟运行状态，不属于可发布的业务配置。重新决策不会擅自恢复故障。</p><button class="btn btn-secondary" type="button" @click="restoreTestEnvironment">恢复测试环境</button></div>
            <div class="form-grid">
              <div><label class="field-label" for="decision-scores">评分服务样本</label><select id="decision-scores" v-model="scoreScenario" class="select"><option value="normal">正常示例评分</option><option value="reverse">更新为另一组评分</option><option value="partial">钱包 B 缺少可信评分</option><option value="ties">全部同分</option><option value="timeout">评分查询超时</option><option value="insufficient">整体样本不足</option><option value="expired">评分结果已过期</option></select><p class="field-hint">{{ strategy.mode === 'data_driven' ? '只影响数据排序，不改变资格。' : '当前模式不使用评分。' }}</p></div>
              <div><label class="field-label" for="availability-query">机构查询场景（本地模拟）</label><select id="availability-query" v-model="queryMode" class="select"><option value="normal">正常返回</option><option value="timeout">全部查询超时</option><option value="expired">返回已过期结果</option><option value="mismatch">返回旧订单结果</option></select></div>
              <div><label class="field-label" for="availability-payment-state">原笔支付状态</label><select id="availability-payment-state" v-model="order.paymentState" class="select"><option value="idle">尚未发起</option><option value="processing">支付处理中</option><option value="unknown">支付结果未知</option></select></div>
            </div>
            <details class="inline-details"><summary>逐渠道故障模拟（主模板）</summary><div class="table-scroll"><table class="workspace-table" aria-label="渠道故障模拟"><thead><tr><th>渠道</th><th>模拟开关</th><th>模拟状态</th></tr></thead><tbody><template v-for="method in template.methods" :key="method.id"><tr v-for="channel in method.channels" :key="channel.id"><td>{{ channel.name }}</td><td><input v-model="channel.enabled" type="checkbox" :aria-label="`${channel.name}开关`" /></td><td><select v-model="channel.health" class="select" :aria-label="`${channel.name}状态`"><option value="available">可用</option><option value="maintenance">维护中</option><option value="unknown">状态未确认</option><option value="timeout">查询超时</option><option value="restricted">机构明确不支持本单</option></select></td></tr></template></tbody></table></div></details>
          </div>
        </details>
      </template>
      <section v-else class="demo-panel" aria-labelledby="comparison-heading">
        <div class="panel-heading"><div><h2 id="comparison-heading">同配置，多商品对比</h2><p>沿用当前地区、终端、资格和测试样本，逐单计算；草稿不参与。</p></div><span>{{ comparisonRows.filter(row => row.result.status === 'ready').length }} / {{ cases.length }} 个示例可支付</span></div>
        <div class="table-scroll"><table class="workspace-table comparison-table" aria-label="同模板多商品对比"><thead><tr><th>商品 / 实付</th><th>本单展示结果</th><th>实际模板与排序</th><th>操作</th></tr></thead><tbody><tr v-for="row in comparisonRows" :key="row.id"><td><strong>{{ row.name }}</strong><p class="field-hint">{{ format(row.result.amount.payable, order.currency) }} · {{ productTypeLabel(row.type) }}</p></td><td><div v-if="row.result.visibleMethods.length" class="comparison-methods"><span v-for="method in row.result.visibleMethods" :key="method.id">{{ method.name }}{{ method.available ? '' : ` · ${stateLabel(method.state)}` }}</span></div><span v-else>{{ statusTitle(row.result.status) }}</span></td><td>{{ row.result.selectedTemplate?.name || '未命中模板' }}<p class="field-hint">{{ modeName(row.result.ranking?.effectiveMode) }}</p></td><td><button class="btn btn-text" type="button" :aria-label="`试算${row.name}`" @click="loadCase(row.id); testView = 'single'">查看单笔</button></td></tr></tbody></table></div>
      </section>
    </section>

    <footer class="workspace-footer"><details><summary>演示范围与行业参考</summary><p>参考 Stripe 的方式启用、独立可用条件和动态展示，以及 Adyen 的方式列表与侧栏详情。不是任一厂商后台的复刻，也不表示接入了其能力。</p><p><a href="https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods" target="_blank" rel="noopener noreferrer">Stripe 动态支付方式</a> · <a href="https://docs.stripe.com/payments/payment-method-rules" target="_blank" rel="noopener noreferrer">Stripe 可用性规则</a> · <a href="https://docs.adyen.com/payment-methods/add-payment-methods/" target="_blank" rel="noopener noreferrer">Adyen 方式管理</a></p><p>历史、评分、渠道均为虚构数据；查询 / 评分默认有效期 120 秒。无真实机构、模型、支付、存储、审批或线上发布。</p><button class="btn btn-text" type="button" @click="resetDemo">重置全部演示数据</button></details></footer>

    <dialog ref="methodDialog" class="method-dialog" aria-labelledby="method-dialog-title" @cancel.prevent="closeMethod">
      <template v-if="editingMethod"><div class="dialog-header"><div><h2 id="method-dialog-title">{{ editingMethod.name }}</h2><p class="field-hint">编辑本模板中的业务设置</p></div><button class="btn btn-text" type="button" aria-label="关闭支付方式详情" @click="closeMethod"><Icon name="close" :size="18" /></button></div>
        <div class="dialog-body">
          <label class="checkbox-label"><input v-model="editingMethod.enabled" type="checkbox" :aria-label="`${editingMethod.name}模板开关`" />在本模板中启用</label><p class="field-hint">关闭后本模板不再展示此方式，历史和评分不能恢复它。</p>
          <h3>业务金额限制 · {{ template.currency }}</h3><p class="field-hint">按优惠、税费后的最终金额判断，且必须同时满足渠道限额。</p>
          <div class="form-grid"><div><label class="field-label" for="method-minimum">最低金额</label><input id="method-minimum" v-model="editingMethod.minAmount" class="input" type="text" inputmode="decimal" :aria-label="`${editingMethod.name}最低金额`" /></div><div><label class="field-label" for="method-maximum">最高金额</label><input id="method-maximum" v-model="editingMethod.maxAmount" class="input" type="text" inputmode="decimal" :aria-label="`${editingMethod.name}最高金额`" /></div></div>
          <div v-if="configurationErrors.length" class="config-errors" role="alert"><p v-for="error in configurationErrors" :key="error">{{ error }}</p></div>
          <h3>支付能力 <span class="readonly-label">只读</span></h3><dl class="capability-list"><div><dt>交易类型</dt><dd>{{ editingMethod.productTypes.includes('subscription') ? '一次性购买、订阅' : '一次性购买' }}</dd></div><div><dt>终端</dt><dd>{{ editingMethod.devices.join(' / ') }}</dd></div><div><dt>资格要求</dt><dd>{{ editingMethod.requiresVerified ? '需实名' : '无额外实名要求' }}</dd></div></dl>
          <details class="inline-details"><summary>{{ editingMethod.channels.length }} 条渠道的能力与限额</summary><div v-for="channel in liveEditingMethod.channels" :key="channel.id" class="channel-result"><strong>{{ channel.name }}</strong><span>{{ money(channel.minAmount) }} – {{ money(channel.maxAmount) }}</span><span>商户 {{ channel.merchantAccount }} · {{ channel.authorized ? '已授权' : '未授权' }}</span><span>{{ channel.capabilityVersion }} · {{ channel.updatedAt }}</span></div></details>
        </div><div class="dialog-footer"><span class="field-hint">关闭保留草稿，统一应用后才生效。</span><button class="btn btn-primary" type="button" @click="closeMethod">完成编辑</button></div>
      </template>
    </dialog>

    <dialog ref="reviewDialog" class="review-dialog" aria-labelledby="review-title" @cancel.prevent="closeReview">
      <div class="dialog-header"><div><h2 id="review-title">确认配置变更</h2><p class="field-hint">全部通过校验后一起应用，仅作用于当前 Demo。</p></div><button class="btn btn-text" type="button" aria-label="关闭变更确认" @click="closeReview"><Icon name="close" :size="18" /></button></div>
      <div class="dialog-body">
        <div v-if="allConfigurationErrors.length" class="config-errors" role="alert"><strong>暂不能应用，请修正：</strong><p v-for="error in allConfigurationErrors" :key="error">{{ error }}</p></div>
        <ul class="change-list"><li v-for="change in pendingChanges" :key="change.name"><strong>{{ change.name }}</strong><span>{{ change.before }} <Icon name="arrowRight" :size="13" /> {{ change.after }}</span></li></ul>
        <div v-if="draftDirty && !configurationErrors.length" class="draft-impact"><h3>典型商品影响</h3><ul v-if="draftImpactRows.length"><li v-for="row in draftImpactRows" :key="row.id">{{ row.name }}：{{ row.before }} → {{ row.after }} 种可用<span v-if="row.after === 0"> · {{ statusTitle(row.status) }}</span></li></ul><p v-else>当前示例的可用数量未变化；不代表真实订单无影响。</p></div>
        <p class="field-hint">应用后将重开测试预览；不会恢复模拟故障，也不会发布线上。生产仍需审批、灰度及回滚。</p>
      </div><div class="dialog-footer"><button class="btn btn-secondary" type="button" @click="closeReview">返回编辑</button><button class="btn btn-primary" type="button" :disabled="allConfigurationErrors.length > 0 || !hasChanges" @click="applyConfiguration">应用到 Demo 并测试</button></div>
    </dialog>
  </div>
</template>

<script>
import Icon from '@/components/Icon.vue'
import { availabilityStates, createDemoConsultation, formatAmount, reasonSources, toMinorUnits, validateTemplate } from '@/utils/paymentAvailability.js'
import { applyRankingLock, createRankingLock, decisionEligibilityKey, defaultPolicyNames, evaluateCashierDecision, sortingModeNames, validateCashierSelection, validateDecisionStrategy } from '@/utils/cashierDecision.js'
import { availabilityDemoCases, createAvailabilityDemoTemplate, createDecisionDemoBackup, createDecisionDemoHistory, createDecisionDemoScores, createDecisionDemoStrategy, createDemoOrder } from '@/utils/paymentAvailabilityDemo.js'

export default {
  name: 'PaymentAvailabilityDemo',
  components: { Icon },
  data() {
    const template = createAvailabilityDemoTemplate(this.$route.meta.region || 'domestic')
    const strategy = createDecisionDemoStrategy(template)
    return {
      template, draftTemplate: JSON.parse(JSON.stringify(template)), order: createDemoOrder(availabilityDemoCases[0], template), cases: availabilityDemoCases,
      backupTemplate: createDecisionDemoBackup(this.$route.meta.region || 'domestic'), strategy, strategyDraft: JSON.parse(JSON.stringify(strategy)),
      historyScenario: 'none', scoreScenario: 'normal', rankingLock: null, selectedTemplateId: '', strategyNotice: '',
      queryMode: 'normal', queryNonce: 0, clock: Date.now(), draftNotice: '',
      selectedCaseId: 'small', selectedMethodId: '', selectionNotice: '', confirmation: '', tab: 'methods',
      methodSearch: '', methodFilter: 'all', editingMethodId: '', configurationNotice: '', testView: 'single', diagnosticView: 'methods',
      tabs: [{ id: 'methods', name: '支付方式' }, { id: 'strategy', name: '展示策略' }, { id: 'simulation', name: '测试预览' }],
      diagnosticTabs: [{ id: 'methods', name: '方式原因' }, { id: 'trace', name: '执行过程' }, { id: 'snapshot', name: '版本与有效期' }]
    }
  },
  computed: {
    editingMethod() { return this.draftTemplate.methods.find(method => method.id === this.editingMethodId) || null },
    liveEditingMethod() { return this.template.methods.find(method => method.id === this.editingMethodId) || null },
    filteredMethods() {
      const query = this.methodSearch.trim().toLowerCase()
      return this.draftTemplate.methods.filter(method => (!query || method.name.toLowerCase().includes(query)) &&
        (this.methodFilter === 'all' || this.methodFilter === 'enabled' && method.enabled || this.methodFilter === 'disabled' && !method.enabled || this.methodFilter === 'changed' && this.methodChanged(method.id)))
    },
    hasChanges() { return this.draftDirty || this.strategyDirty },
    allConfigurationErrors() { return [...this.configurationErrors, ...this.strategyErrors] },
    modeDescription() {
      return ({ fixed: '按基础顺序展示，本单不可用的方式自动跳过。', preference: '最多将一个本单可用的成功历史方式提前，其余保持基础顺序。', data_driven: '保留有效历史一项，其余按可信示例评分；异常时自动回退。不是已接入的真实预测模型。' })[this.strategyDraft.mode] || '请修正排序模式。'
    },
    pendingChanges() {
      const changes = []
      for (const draft of this.draftTemplate.methods) {
        const active = this.template.methods.find(method => method.id === draft.id)
        if (draft.enabled !== active.enabled) changes.push({ name: `${draft.name} · 模板状态`, before: active.enabled ? '已启用' : '已停用', after: draft.enabled ? '启用' : '停用' })
        if (draft.minAmount !== active.minAmount || draft.maxAmount !== active.maxAmount) changes.push({ name: `${draft.name} · 业务金额限制`, before: `${this.money(active.minAmount)} – ${this.money(active.maxAmount)}`, after: `${this.money(draft.minAmount)} – ${this.money(draft.maxAmount)}` })
      }
      const fields = { mode: ['排序模式', value => this.modeName(value)], baseOrder: ['基础顺序', value => value.map(id => this.methodName(id)).join('、')],
        defaultPolicy: ['默认选中', value => this.defaultName(value)], recommendedMethodId: ['推荐标签', value => value ? this.methodName(value) : '不展示'],
        showHistoryTag: ['成功历史标签', value => value ? '展示' : '不展示'], backupEnabled: ['备用模板', value => value ? '启用' : '不启用'] }
      for (const [key, [name, display]] of Object.entries(fields)) if (JSON.stringify(this.strategyDraft[key]) !== JSON.stringify(this.strategy[key])) changes.push({ name, before: display(this.strategy[key]), after: display(this.strategyDraft[key]) })
      return changes
    },
    currentCase() { return this.cases.find(item => item.id === this.selectedCaseId) || this.cases[0] },
    allTemplates() { return [this.template, this.backupTemplate] },
    consultations() { this.queryNonce; return Object.fromEntries(this.allTemplates.map(template => [template.id, createDemoConsultation(template, this.order, this.queryMode)])) },
    historySample() { return createDecisionDemoHistory(this.historyScenario, this.order) },
    scoreSnapshots() { this.queryNonce; return Object.fromEntries(this.allTemplates.map(template => [template.id, createDecisionDemoScores(template, this.order, this.scoreScenario)])) },
    freshDecision() { this.clock; return evaluateCashierDecision(this.decisionInput()) },
    decision() { return applyRankingLock(this.freshDecision, this.order, this.strategy, this.rankingLock) },
    activeTemplate() { return this.decision.selectedTemplate || this.template },
    consultation() { return this.consultations[this.activeTemplate.id] },
    strategyErrors() { return validateDecisionStrategy(this.strategyDraft) },
    strategyDirty() { return JSON.stringify(this.strategyDraft) !== JSON.stringify(this.strategy) },
    configurationErrors() { return validateTemplate(this.draftTemplate) },
    draftDirty() { return JSON.stringify(this.businessRules(this.draftTemplate)) !== JSON.stringify(this.businessRules(this.template)) },
    draftImpactRows() {
      if (this.configurationErrors.length) return []
      const preview = this.withBusinessRules(this.draftTemplate)
      return this.comparisonRows.map(row => {
        const order = { ...createDemoOrder(row, preview), currency: this.order.currency, country: this.order.country, device: this.order.device, verified: this.order.verified }
        const after = this.evaluateForOrder(order, preview)
        return { id: row.id, name: row.name, before: row.result.availableMethods.length, after: after.availableMethods.length, status: after.status }
      }).filter(row => row.before !== row.after)
    },
    productType() { return this.order.productTypes.length > 1 ? 'mixed' : this.order.productTypes[0] },
    paymentBlocked() { return ['processing', 'unknown'].includes(this.order.paymentState) },
    hasQueryIssue() { return this.decision.methods.some(method => method.state === 'unknown') },
    decisionInputs() { return JSON.stringify([this.template, this.backupTemplate, this.order, this.queryMode, this.queryNonce, this.strategy.version, this.decision.selectedTemplate?.id, this.decision.methods.map(item => [item.id, item.state])]) },
    emptyTitle() { return this.statusTitle(this.decision.status) },
    decisionTrace() {
      const result = this.decision
      const ranking = result.ranking
      return [
        { name: '确认本单', detail: `${this.order.productName} · ${this.format(result.amount.payable, this.order.currency)} · ${this.productTypeLabel(this.productType)}；${result.status === 'invalid_order' ? '订单校验未通过' : '以本次最终金额和可信订单条件判断'}` },
        { name: '匹配模板', detail: result.attempts.length ? result.attempts.map(item => `${item.name}：${item.count} 种可用（${this.statusTitle(item.status)}）`).join('；') : this.statusTitle(result.status) },
        { name: '确认适用性', detail: result.methods.length ? Object.entries(availabilityStates).map(([state, label]) => `${label} ${result.methods.filter(method => method.state === state).length}`).join(' / ') : result.errors.join(' ') },
        { name: '确定展示顺序', detail: ranking ? `${this.modeName(ranking.requestedMode)} → ${this.modeName(ranking.effectiveMode)}；${ranking.frozen ? '已手动选择，普通数据更新不改变顺序；新数据将在重新决策后应用' : ranking.fallbackReason || ranking.scoreStatus}` : '没有可支付集合，不进行支付排序' },
        { name: '处理标签与选择', detail: `推荐、历史标签和默认选中独立。默认策略：${this.defaultName(this.strategy.defaultPolicy)}；${this.selectedMethodId ? `当前选择 ${this.methodName(this.selectedMethodId)}` : '当前未选择'}，不等于已授权或已付款。` },
        { name: '发起前复核', detail: this.paymentBlocked ? '原笔处理中或结果未知，先查单，不再次发起' : '点击模拟校验时重查模板归属、金额条件及查询有效期；不会创建真实支付' }
      ]
    },
    decisionSnapshot() {
      const result = this.decision
      const ranking = result.ranking
      const score = this.scoreSnapshots[result.selectedTemplate?.id]
      return [
        { name: '判断时间与结果', detail: `${this.time(result.evaluatedAt)} · ${this.statusTitle(result.status)}` },
        { name: '本单事实', detail: `${this.order.productName} · ${this.format(result.amount.payable, this.order.currency)} · ${this.order.country} / ${this.order.device} · ${this.order.verified ? '已实名' : '未实名'}` },
        { name: '业务与账户范围', detail: `${this.order.gameId} / ${this.order.sceneId} / ${this.order.environment}；${this.order.customerId || '游客'}；历史授权${this.order.historyConsent ? '有效' : '无效'}` },
        { name: '生效版本', detail: result.selectedTemplate ? `${result.selectedTemplate.name} · 规则 v${result.ruleVersion} / 策略 v${this.strategy.version}；能力 ${[...new Set(result.methods.flatMap(method => method.channels.map(channel => channel.capabilityVersion)))].join('、')}` : `未采用模板 · 策略 v${this.strategy.version}` },
        { name: '机构查询有效期', detail: result.selectedTemplate ? `${this.time(this.consultation.observedAt)} — ${this.time(this.consultation.expiresAt)}；${this.queryMode === 'normal' ? '正常模拟，仍须检查逐渠道结果' : '异常模拟，不作为放行依据'}` : '未进入模板查询判断' },
        { name: '当前评分样本', detail: this.strategy.mode === 'data_driven' && score ? `${this.time(score.observedAt)} — ${this.time(score.expiresAt)}；${this.freshDecision.ranking?.scoreStatus || '无可支付集合，不采用评分'}${ranking?.frozen ? '；展示仍沿用冻结依据' : ''}` : '当前未使用评分' },
        { name: '排序与回退', detail: ranking ? `${this.modeName(ranking.requestedMode)} → ${this.modeName(ranking.effectiveMode)}；${ranking.fallbackReason || '未触发回退'}${ranking.frozen ? '；交互中冻结' : ''}` : '无可支付集合，不排序、不推荐、不默认选中' },
        { name: '最终可支付顺序', detail: result.availableMethods.map(method => method.name).join(' → ') || '无' },
        { name: '首次默认候选', detail: ranking?.defaultMethodId ? `${this.methodName(ranking.defaultMethodId)}；不是支付授权，也不覆盖用户选择` : '无' },
        { name: '当前选择绑定', detail: this.selectedMethodId ? `${this.methodName(this.selectedMethodId)} · ${this.selectedTemplateId}；发起前再次复核` : '未选择，不自动发起' }
      ]
    },
    comparisonRows() {
      return this.cases.map(item => {
        const order = { ...createDemoOrder(item, this.template), currency: this.order.currency, country: this.order.country, device: this.order.device, verified: this.order.verified }
        return { ...item, result: this.evaluateForOrder(order) }
      })
    }
  },
  watch: {
    hasChanges(value) { if (value) this.configurationNotice = '' },
    decisionInputs() {
      this.confirmation = ''
      if (this.rankingLock && this.rankingLock.key !== decisionEligibilityKey(this.freshDecision, this.order, this.strategy)) this.rankingLock = null
      if (this.selectedMethodId && (this.selectedTemplateId !== this.decision.selectedTemplate?.id || !this.decision.availableMethods.some(method => method.id === this.selectedMethodId))) {
        this.selectedMethodId = ''
        this.selectedTemplateId = ''
        this.selectionNotice = '订单条件、模板或规则已变化，原选择失效，请重新选择。系统不会自动替您切换。'
      }
    },
    '$route.meta.region'() { this.resetDemo() }
  },
  mounted() {
    this.clockTimer = setInterval(() => { this.clock = Date.now() }, 1000)
  },
  beforeUnmount() { clearInterval(this.clockTimer) },
  methods: {
    methodChanged(id) {
      const current = this.template.methods.find(method => method.id === id)
      const draft = this.draftTemplate.methods.find(method => method.id === id)
      return ['enabled', 'minAmount', 'maxAmount'].some(key => current[key] !== draft[key])
    },
    openMethod(id) {
      this.editingMethodId = id
      this.$nextTick?.(() => this.$refs.methodDialog.showModal())
    },
    closeMethod() { this.$refs?.methodDialog?.close(); this.editingMethodId = '' },
    openReview() { if (this.hasChanges) this.$refs?.reviewDialog?.showModal() },
    closeReview() { this.$refs?.reviewDialog?.close() },
    openTesting() { this.tab = 'simulation'; this.testView = 'single' },
    discardConfiguration() { this.discardDraft(); this.discardStrategy(); this.configurationNotice = '已放弃全部配置草稿，已应用配置未改变。' },
    applyConfiguration() {
      // Validate the entire change set before either part is changed; never partially apply.
      if (!this.hasChanges || this.allConfigurationErrors.length) return false
      if (this.draftDirty) this.applyDraft()
      if (this.strategyDirty) this.applyStrategy()
      else this.reopenPreview()
      this.closeReview()
      this.openTesting()
      this.diagnosticView = 'methods'
      this.configurationNotice = `已应用本地配置：规则 v${this.template.version} / 策略 v${this.strategy.version}，已重开测试预览，未发布线上。`
      return true
    },
    reopenPreview() {
      this.rankingLock = null
      this.selectedMethodId = ''
      this.selectedTemplateId = ''
      this.selectionNotice = ''
      this.refreshDecision()
      const defaultId = this.decision.ranking?.defaultMethodId
      if (defaultId && !this.paymentBlocked) this.chooseMethod(defaultId, false)
    },
    restoreTestEnvironment() {
      this.allTemplates.forEach(template => template.methods.forEach(method => method.channels.forEach(channel => { channel.enabled = true; channel.health = 'available' })))
      this.queryMode = 'normal'
      this.scoreScenario = 'normal'
      this.historyScenario = 'none'
      this.order.paymentState = 'idle'
      this.refreshDecision()
    },
    format: formatAmount,
    modeName(mode) { return sortingModeNames[mode] || '尚未排序' },
    defaultName(policy) { return defaultPolicyNames[policy] || '不默认选中' },
    methodName(id) { return this.template.methods.find(method => method.id === id)?.name || id },
    decisionInput(now) {
      const history = this.historySample
      const scores = this.scoreSnapshots
      const consultations = this.consultations
      // Capture evaluation time after new snapshots exist, not a millisecond before them.
      return { templates: this.allTemplates, order: this.order, strategy: this.strategy, history, scores, consultations, now: now ?? Date.now() }
    },
    evaluateForOrder(order, primary = this.template) {
      const templates = [primary, this.backupTemplate]
      return evaluateCashierDecision({ templates, order, strategy: this.strategy, history: createDecisionDemoHistory(this.historyScenario, order, this.clock),
        scores: Object.fromEntries(templates.map(template => [template.id, createDecisionDemoScores(template, order, this.scoreScenario, this.clock)])),
        consultations: Object.fromEntries(templates.map(template => [template.id, createDemoConsultation(template, order, this.queryMode, this.clock)])), now: this.clock })
    },
    chooseMethod(id, manual = true) {
      if (!this.decision.availableMethods.some(method => method.id === id)) return
      this.selectedMethodId = id
      this.selectedTemplateId = this.decision.selectedTemplate.id
      this.selectionNotice = ''
      this.confirmation = ''
      if (manual) this.rankingLock = createRankingLock(this.decision, this.order, this.strategy)
    },
    discardStrategy() { this.strategyDraft = JSON.parse(JSON.stringify(this.strategy)); this.strategyNotice = '' },
    moveBaseMethod(index, delta) {
      const target = index + delta
      if (target < 0 || target >= this.strategyDraft.baseOrder.length) return
      const next = [...this.strategyDraft.baseOrder]
      ;[next[index], next[target]] = [next[target], next[index]]
      this.strategyDraft.baseOrder = next
    },
    applyStrategy() {
      if (this.strategyErrors.length || !this.strategyDirty) return
      this.strategy = { ...JSON.parse(JSON.stringify(this.strategyDraft)), version: this.strategy.version + 1 }
      this.discardStrategy()
      this.reopenPreview()
      this.strategyNotice = `已应用本地策略 v${this.strategy.version} 并重开预览，未发布线上。`
    },
    refreshDecision() {
      this.rankingLock = null
      this.queryNonce++
      this.clock = Date.now()
      this.confirmation = ''
      // Refresh snapshots under the selected simulation; do not silently recover a fault.
    },
    stateLabel(state) { return availabilityStates[state] || state },
    sourceLabel(source) { return reasonSources[source] || source },
    time(value) { return new Date(value).toLocaleTimeString('zh-CN', { hour12: false }) },
    productTypeLabel(type) { return ({ one_time: '一次性购买', subscription: '自动续费订阅', mixed: '一次性 + 订阅合并订单' })[type] },
    statusTitle(status) { return ({ ready: '可选择支付方式', invalid_config: '生效规则异常', invalid_order: '请补充或修正订单信息', incompatible: '模板不兼容或未授权', no_template: '未命中兼容模板', zero_amount: '本单无需支付', no_methods: '本单暂无适用支付方式', unconfirmed: '暂时无法确认支付方式', action_required: '请先完成必要条件', temporarily_unavailable: '支付服务暂时不可用' })[status] || status },
    businessRules(template) { return template.methods.map(({ id, enabled, minAmount, maxAmount }) => ({ id, enabled, minAmount, maxAmount })) },
    withBusinessRules(draft) {
      const rules = this.businessRules(draft)
      return { ...this.template, version: this.template.version + 1,
        methods: this.template.methods.map(method => ({ ...method, ...rules.find(rule => rule.id === method.id) })) }
    },
    discardDraft() {
      this.draftTemplate = JSON.parse(JSON.stringify(this.template))
      this.draftNotice = ''
    },
    applyDraft() {
      if (this.configurationErrors.length || !this.draftDirty) return
      // Apply business fields only: a stale draft must never restore old channel health or authorization.
      this.template = this.withBusinessRules(this.draftTemplate)
      this.discardDraft()
      this.draftNotice = `已应用到本地演示 v${this.template.version}，未发布到线上。`
      this.clock = Date.now()
    },
    setProductType(type) { this.order.productTypes = type === 'mixed' ? ['one_time', 'subscription'] : [type] },
    completeQualification() { this.order.verified = true },
    retryQuery() {
      this.queryMode = 'normal'
      this.clock = Date.now()
      this.queryNonce++
      this.confirmation = ''
      // Per-channel faults remain until explicitly restored in the channel simulation table.
    },
    money(value, currency = this.template.currency) { return formatAmount(toMinorUnits(value), currency) },
    loadCase(id) {
      const item = this.cases.find(entry => entry.id === id)
      if (!item) return
      this.selectedCaseId = id
      // Changing a product preserves common order conditions and the same template.
      const product = createDemoOrder(item, this.template)
      this.order = { ...this.order, productName: product.productName, productTypes: product.productTypes, price: product.price, discount: product.discount, tax: product.tax }
      this.clock = Date.now()
    },
    resetDemo() {
      this.closeMethod()
      this.closeReview()
      this.template = createAvailabilityDemoTemplate(this.$route.meta.region || 'domestic')
      this.backupTemplate = createDecisionDemoBackup(this.$route.meta.region || 'domestic')
      this.strategy = createDecisionDemoStrategy(this.template)
      this.discardStrategy()
      this.historyScenario = 'none'
      this.scoreScenario = 'normal'
      this.rankingLock = null
      this.selectedTemplateId = ''
      this.discardDraft()
      this.order = createDemoOrder(this.cases[0], this.template)
      this.queryMode = 'normal'
      this.queryNonce++
      this.clock = Date.now()
      this.selectedCaseId = 'small'
      this.selectedMethodId = ''
      this.selectionNotice = ''
      this.confirmation = ''
      this.methodSearch = ''
      this.methodFilter = 'all'
      this.configurationNotice = ''
      this.testView = 'single'
      this.diagnosticView = 'methods'
      this.tab = 'methods'
    },
    confirmSimulation() {
      const result = validateCashierSelection(this.decisionInput(), { methodId: this.selectedMethodId, templateId: this.selectedTemplateId })
      if (!result.valid) {
        this.selectedMethodId = ''
        this.selectedTemplateId = ''
        this.selectionNotice = result.error || '发起前校验未通过，请检查订单条件并重新选择。'
        this.confirmation = ''
        return
      }
      this.selectionNotice = ''
      this.confirmation = `发起前校验通过：${result.method.name}，${formatAmount(result.decision.amount.payable, this.order.currency)}，${result.decision.selectedTemplate.name}，规则 v${result.decision.ruleVersion}。具备发起条件，不代表必然支付成功。仅完成本地模拟，未创建支付订单、未路由扣款。`
    }
  }
}
</script>

<style scoped>
.demo-header, .demo-heading, .header-actions, .config-context, .panel-heading, .method-toolbar, .testing-heading, .test-environment-heading, .dialog-header, .dialog-footer, .checkout-title, .checkout-amount, .payable-summary, .preview-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.demo-header { margin-bottom: 16px; flex-wrap: wrap; }
.demo-heading { justify-content: flex-start; gap: 9px; flex-wrap: wrap; }
.demo-subtitle { font-size: 13px; color: #595959; margin-top: 3px; }
.header-actions { flex-wrap: wrap; }
.demo-tag, .tab-count { font-size: 11px; padding: 1px 7px; border-radius: 4px; color: #0958d9; background: #e6f4ff; white-space: nowrap; }
.demo-notice { display: flex; gap: 8px; align-items: center; color: #595959; font-size: 12px; padding: 10px 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 5px; }
.demo-notice svg { flex-shrink: 0; }
.config-context { padding: 18px 0; flex-wrap: wrap; }
.config-context > div { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.config-context strong { font-size: 14px; font-weight: 600; }
.config-context span { color: #737373; font-size: 12px; }
.draft-banner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: #fffbe6; border: 1px solid #ffe58f; color: #664d03; border-radius: 5px; font-size: 12px; margin-bottom: 12px; }
.configuration-notice { padding: 10px 12px; margin-bottom: 12px; font-size: 12px; line-height: 1.7; background: #f6ffed; border: 1px solid #b7eb8f; color: #3f6600; border-radius: 5px; }
.demo-tabs { display: flex; gap: 28px; border-bottom: 1px solid #e8e8e8; margin-bottom: 20px; }
.demo-tabs button { display: flex; align-items: center; gap: 7px; padding: 8px 0 12px; background: none; border: 0; border-bottom: 2px solid transparent; font: inherit; font-size: 14px; color: #595959; cursor: pointer; }
.demo-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; font-weight: 500; }
.demo-panel { border: 1px solid #e8e8e8; border-radius: 6px; min-width: 0; overflow: hidden; background: white; }
.panel-heading { padding: 16px 18px; border-bottom: 1px solid #f0f0f0; align-items: flex-start; flex-wrap: wrap; }
.panel-heading h2, .testing-heading h2 { font-size: 15px; font-weight: 600; }
.panel-heading p, .panel-heading > span { font-size: 12px; line-height: 1.7; color: #737373; }
.panel-heading p { margin-top: 4px; }
.panel-body { padding: 18px; }
.method-toolbar { padding: 14px 18px; justify-content: flex-start; flex-wrap: wrap; }
.search-field { display: flex; align-items: center; position: relative; width: 260px; max-width: 100%; }
.search-field svg { position: absolute; left: 11px; color: #8c8c8c; pointer-events: none; }
.search-field .input { padding-left: 33px; }
.input, .select { width: 100%; min-width: 0; font-size: 13px; }
.status-filter { width: 170px; max-width: 100%; }
.method-toolbar > .field-hint { margin-left: auto; }
.table-scroll { overflow-x: auto; width: 100%; }
.workspace-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.workspace-table th { font-size: 12px; font-weight: 500; color: #737373; background: #fafafa; white-space: nowrap; }
.workspace-table th, .workspace-table td { padding: 14px 18px; border-bottom: 1px solid #f0f0f0; vertical-align: top; line-height: 1.65; }
.workspace-table tr:last-child td { border-bottom: 0; }
.method-table { min-width: 700px; }
.method-name { font: inherit; font-weight: 500; color: #1677ff; cursor: pointer; background: none; padding: 0; border: 0; }
.method-table td:last-child { width: 80px; }
.pending-label { color: #ad6800; font-size: 11px; margin-left: 8px; white-space: nowrap; }
.status-label { display: inline-block; padding: 0 7px; font-size: 12px; border-radius: 4px; white-space: nowrap; }
.status-label--success { background: #f6ffed; border: 1px solid #b7eb8f; color: #237804; }
.status-label--muted { background: #fafafa; border: 1px solid #d9d9d9; color: #595959; }
.field-hint { font-size: 12px; color: #737373; line-height: 1.65; margin-top: 4px; }
.field-label { display: block; font-size: 13px; margin-bottom: 7px; color: #333; }
.panel-footnote { padding: 12px 18px; font-size: 12px; color: #737373; border-top: 1px solid #f0f0f0; }
.empty-cell { text-align: center; padding: 32px !important; color: #737373; }
.strategy-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; }
.strategy-main { padding: 20px; min-width: 0; }
.strategy-main > .select { max-width: 480px; }
.strategy-main h3 { margin: 24px 0 4px; font-size: 14px; }
.mode-description { color: #595959; font-size: 12px; line-height: 1.7; margin-top: 10px; max-width: 520px; }
.strategy-side { padding: 20px; background: #fafafa; border-left: 1px solid #f0f0f0; }
.strategy-side h3 { font-size: 13px; font-weight: 500; }
.strategy-side ul { padding-left: 18px; margin: 12px 0; display: grid; gap: 12px; }
.strategy-side li, .strategy-side p { font-size: 12px; color: #737373; line-height: 1.7; }
.base-order-list { list-style: none; padding: 0; margin-top: 14px; display: grid; gap: 8px; max-width: 600px; }
.base-order-list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #e8e8e8; border-radius: 5px; font-size: 13px; }
.base-order-list li > span { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.base-order-list li > div { flex-shrink: 0; }
.base-order-list small { color: #8c8c8c; font-size: 11px; }
.order-index { color: #8c8c8c; font-size: 12px; min-width: 10px; }
.settings-disclosure { padding: 16px 20px; border-top: 1px solid #f0f0f0; font-size: 13px; }
.settings-disclosure > summary, .section-summary { cursor: pointer; font-weight: 500; font-size: 13px; color: #333; }
.settings-disclosure > summary span, .section-summary > span { font-weight: 400; color: #737373; font-size: 12px; margin-left: 10px; }
.settings-disclosure[open] > summary { margin-bottom: 18px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.full-width { grid-column: 1 / -1; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
input[type='checkbox'], input[type='radio'] { accent-color: #1677ff; width: 15px; height: 15px; flex-shrink: 0; }
.testing-heading { margin: 4px 0 16px; flex-wrap: wrap; }
.segmented { display: flex; border: 1px solid #d9d9d9; padding: 3px; border-radius: 6px; gap: 3px; background: #fafafa; }
.segmented button { background: transparent; color: #595959; border: 0; padding: 5px 12px; border-radius: 4px; cursor: pointer; font: inherit; font-size: 12px; }
.segmented button.active { background: #fff; color: #1677ff; box-shadow: 0 1px 3px #00000012; }
.simulation-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.amount-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.amount-grid .field-label { font-size: 12px; }
.payable-summary { padding: 12px; margin-top: 14px; background: #f5faff; border-radius: 5px; font-size: 12px; }
.payable-summary strong { font-size: 21px; color: #0958d9; font-variant-numeric: tabular-nums; }
.order-fields { margin-top: 18px; }
.inline-details { margin-top: 20px; font-size: 12px; border-top: 1px solid #f0f0f0; padding-top: 14px; }
.inline-details > summary { color: #1677ff; cursor: pointer; }
.inline-details[open] > summary { margin-bottom: 16px; }
.checkout-title { font-size: 13px; flex-wrap: wrap; }
.checkout-title > span { color: #737373; font-size: 12px; }
.checkout-amount { margin: 16px 0; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #595959; }
.checkout-amount strong { font-size: 26px; color: #262626; font-variant-numeric: tabular-nums; }
.preview-instruction { font-size: 12px; margin-bottom: 12px; color: #595959; }
.result-pill { font-size: 12px; color: #0958d9 !important; }
.method-options { display: grid; gap: 9px; }
.method-option { display: flex; align-items: center; gap: 8px; border: 1px solid #d9d9d9; padding: 12px; border-radius: 5px; }
.method-option.selected { border-color: #1677ff; background: #f5faff; }
.method-option--disabled { background: #fafafa; }
.method-choice { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; min-width: 0; }
.method-option--disabled .method-choice { cursor: default; }
.method-option-content { display: grid; gap: 3px; min-width: 0; }
.method-option-content strong { font-weight: 500; font-size: 13px; }
.method-option-content > span { font-size: 12px; color: #737373; line-height: 1.6; }
.method-option .btn { flex-shrink: 0; }
.method-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.method-tags > span { color: #0958d9; background: #e6f4ff; border-radius: 3px; font-size: 11px; padding: 1px 5px; }
.simulate-button { width: 100%; justify-content: center; margin-top: 18px; }
.preview-bottom { padding: 8px 18px; border-top: 1px solid #f0f0f0; background: #fafafa; font-size: 12px; color: #737373; }
.result-note { padding: 10px 18px; font-size: 12px; color: #ad6800; background: #fffbe6; line-height: 1.7; }
.preview-empty { padding: 18px; background: #fafafa; border: 1px dashed #d9d9d9; border-radius: 5px; display: grid; gap: 6px; text-align: center; }
.preview-empty strong { font-size: 13px; font-weight: 500; }
.preview-empty p { font-size: 12px; color: #737373; line-height: 1.65; }
.selection-notice, .query-notice { padding: 10px; border-radius: 4px; margin-top: 12px; font-size: 12px; line-height: 1.7; background: #fffbe6; color: #ad6800; }
.query-notice { background: #e6f4ff; color: #0958d9; }
.query-notice .btn { display: block; padding-left: 0; }
.confirmation { padding: 10px; background: #f6ffed; border: 1px solid #b7eb8f; color: #3f6600; border-radius: 4px; font-size: 12px; line-height: 1.7; margin-top: 12px; }
.diagnostic-panel, .advanced-testing { margin-top: 16px; }
.section-summary { padding: 16px 18px; }
.detail-tabs { padding: 0 12px 10px; display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #f0f0f0; }
.detail-tabs .btn { color: #737373; }
.detail-tabs .active { color: #1677ff; background: #e6f4ff; }
.diagnostic-table { min-width: 740px; }
.reason-list { list-style: none; padding: 0; display: grid; gap: 6px; }
.reason-list small { color: #8c8c8c; font-size: 11px; display: block; overflow-wrap: anywhere; }
.channel-details { min-width: 160px; font-size: 12px; }
.channel-details summary { color: #1677ff; cursor: pointer; }
.channel-result { display: grid; gap: 5px; padding: 12px; margin-top: 10px; border: 1px solid #f0f0f0; background: #fafafa; border-radius: 5px; font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; color: #737373; }
.channel-result strong { color: #333; font-weight: 500; }
.decision-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; list-style: none; padding: 20px; }
.decision-steps li { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.step-index { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #e6f4ff; color: #0958d9; flex-shrink: 0; font-size: 12px; }
.decision-steps strong { font-weight: 500; font-size: 13px; }
.decision-steps p { font-size: 12px; color: #737373; line-height: 1.7; margin-top: 4px; }
.snapshot-body { padding: 18px; }
.snapshot-body h3 { font-size: 13px; }
.snapshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 18px; margin: 18px 0; font-size: 12px; }
.snapshot-grid dt { color: #737373; margin-bottom: 5px; }
.snapshot-grid dd { margin: 0; line-height: 1.7; overflow-wrap: anywhere; }
.template-attempts { padding-left: 20px; margin-top: 12px; display: grid; gap: 12px; font-size: 12px; line-height: 1.7; }
.template-attempts p { color: #737373; }
.advanced-testing .workspace-table { min-width: 500px; }
.test-environment-heading { align-items: flex-start; flex-wrap: wrap; margin-bottom: 18px; }
.comparison-table { min-width: 700px; }
.comparison-methods { display: flex; flex-wrap: wrap; gap: 6px; }
.comparison-methods > span { background: #f5f5f5; border: 1px solid #e8e8e8; font-size: 12px; padding: 1px 6px; border-radius: 4px; }
.workspace-footer { margin-top: 20px; font-size: 12px; color: #737373; line-height: 1.8; }
.workspace-footer summary { cursor: pointer; }
.workspace-footer p { margin-top: 8px; }
.workspace-footer a { color: #1677ff; }
dialog { color: #262626; background: #fff; padding: 0; border: 1px solid #e8e8e8; box-shadow: 0 12px 48px #00000024; }
dialog::backdrop { background: #00000055; }
.method-dialog { width: min(520px, 100vw); max-width: 100vw; height: 100dvh; max-height: 100dvh; margin: 0 0 0 auto; right: 0; left: auto; border-radius: 0; border-width: 0 0 0 1px; }
.review-dialog { width: min(660px, calc(100vw - 24px)); max-height: calc(100dvh - 40px); margin: auto; border-radius: 8px; }
.dialog-header { position: sticky; top: 0; background: #fff; padding: 18px 20px; border-bottom: 1px solid #f0f0f0; z-index: 1; }
.dialog-header h2 { font-size: 16px; font-weight: 600; margin: 0; }
.dialog-body { padding: 20px; font-size: 13px; }
.dialog-body h3 { font-size: 14px; margin: 24px 0 12px; font-weight: 500; }
.dialog-body > .form-grid { margin-top: 14px; }
.dialog-footer { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #f0f0f0; padding: 14px 20px; flex-wrap: wrap; }
.review-dialog .dialog-footer { justify-content: flex-end; }
.readonly-label { font-size: 11px; color: #737373; border: 1px solid #d9d9d9; padding: 0 5px; border-radius: 3px; font-weight: 400; margin-left: 6px; }
.capability-list { display: grid; gap: 12px; font-size: 12px; }
.capability-list > div { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 10px; }
.capability-list dt { color: #737373; }
.capability-list dd { margin: 0; }
.config-errors { padding: 12px; background: #fff2f0; color: #a8071a; font-size: 12px; line-height: 1.7; margin-top: 14px; border-radius: 4px; }
.change-list { padding: 0; list-style: none; display: grid; gap: 16px; }
.change-list li { display: grid; gap: 5px; border-bottom: 1px solid #f0f0f0; padding-bottom: 12px; }
.change-list strong { font-size: 13px; font-weight: 500; }
.change-list span { font-size: 12px; color: #595959; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; overflow-wrap: anywhere; }
.change-list svg { flex-shrink: 0; }
.draft-impact { background: #fffbe6; color: #664d03; padding: 12px; margin: 16px 0; border-radius: 5px; font-size: 12px; line-height: 1.8; }
.draft-impact h3 { font-size: 13px; margin: 0 0 8px; }
.draft-impact ul { padding-left: 18px; }
@media (max-width: 1100px) { .strategy-layout { grid-template-columns: minmax(0, 1fr); } .strategy-side { border-left: 0; border-top: 1px solid #f0f0f0; } .strategy-side ul { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) { .simulation-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) {
  .header-actions { width: 100%; }
  .config-context > div { display: grid; gap: 5px; }
  .demo-tabs { gap: 20px; }
  .demo-tabs button { font-size: 13px; }
  .tab-count { display: none; }
  .panel-heading, .panel-body, .strategy-main, .strategy-side, .snapshot-body, .dialog-body { padding: 14px; }
  .form-grid, .decision-steps, .strategy-side ul { grid-template-columns: minmax(0, 1fr); }
  .amount-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .base-order-list li { flex-wrap: wrap; }
  .method-toolbar { padding: 14px; }
  .method-toolbar > .field-hint { margin-left: 0; }
  .search-field, .status-filter { width: 100%; }
  .settings-disclosure > summary span, .section-summary > span { display: block; margin: 5px 0 0; }
  .test-environment-heading > .btn { white-space: normal; height: auto; min-height: 32px; }
  .method-option { flex-wrap: wrap; }
  .dialog-footer { gap: 8px; }
}
</style>
