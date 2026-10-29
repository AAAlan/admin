<template>
  <div class="availability-demo page-container">
    <header class="page-header demo-header">
      <div>
        <div class="demo-heading"><h1 class="page-title">收银台支付方式决策</h1><span class="demo-tag">交互 Demo</span></div>
        <p class="demo-subtitle">先判断本单能用什么，再决定如何排序、标记和选择，并解释每一步。</p>
      </div>
      <button class="btn btn-secondary" type="button" @click="resetDemo"><Icon name="refresh" :size="14" />重置示例</button>
    </header>

    <div class="demo-notice"><Icon name="alert" :size="16" /><span>独立本地示例，不读取或修改线上配置，不发起真实支付。机构查询、限额及渠道均为虚构数据，未接入 Stripe / Adyen / Antom。</span></div>

    <section class="template-summary" aria-label="当前演示模板">
      <div><span class="summary-label">本单采用模板</span><strong>{{ decision.selectedTemplate ? activeTemplate.name : '尚未命中兼容模板' }}</strong><code>{{ activeTemplate.id }}</code></div>
      <div><span class="summary-label">模板币种</span><strong>{{ template.currency }}</strong></div>
      <div><span class="summary-label">候选支付方式</span><strong>{{ activeTemplate.methods.length }} 种</strong></div>
      <div><span class="summary-label">生效排序</span><strong>{{ modeName(decision.ranking?.effectiveMode) }}</strong></div>
      <div><span class="summary-label">生效版本</span><strong>规则 v{{ activeTemplate.version }} / 策略 v{{ strategy.version }}</strong></div>
    </section>

    <nav class="demo-tabs" aria-label="演示内容">
      <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: tab === item.id }" :aria-current="tab === item.id ? 'page' : undefined" @click="tab = item.id">{{ item.name }}</button>
    </nav>

    <template v-if="tab === 'simulation'">
      <section class="demo-panel decision-process" aria-labelledby="decision-process-heading">
        <div class="panel-heading"><div><h2 id="decision-process-heading">本单决策过程</h2><p>运营试算视角：从订单到最终列表，不把模拟评分当真实支付效果。</p></div><button class="btn btn-secondary" type="button" @click="refreshDecision">重新决策</button></div>
        <ol class="decision-steps"><li v-for="(step, index) in decisionTrace" :key="step.name"><span class="step-index">{{ index + 1 }}</span><div><strong>{{ step.name }}</strong><p>{{ step.detail }}</p></div></li></ol>
        <details class="decision-snapshot">
          <summary>查看本次决策快照与模板尝试</summary>
          <p class="field-hint">仅当前页面内存中的判断依据，不是生产审计记录；顺序冻结期间，当前评分变化不会改写已展示的排序依据。</p>
          <dl class="snapshot-grid"><div v-for="item in decisionSnapshot" :key="item.name"><dt>{{ item.name }}</dt><dd>{{ item.detail }}</dd></div></dl>
          <h3>模板尝试记录</h3>
          <ol v-if="decision.attempts.length" class="template-attempts"><li v-for="attempt in decision.attempts" :key="attempt.id"><strong>{{ attempt.name }} · {{ statusTitle(attempt.status) }}</strong><span>{{ attempt.count }} 种可直接支付{{ attempt.id === decision.selectedTemplate?.id ? ' · 当前展示来源' : '' }}</span><p>{{ attempt.message || '本模板已独立完成判断。' }}</p></li></ol>
          <p v-else class="field-hint">订单校验未通过或无需支付，未尝试模板。</p>
        </details>
      </section>
      <div class="simulation-grid">
        <section class="demo-panel order-panel" aria-labelledby="order-heading">
          <div class="panel-heading"><h2 id="order-heading">模拟一笔订单</h2><span>修改后实时试算</span></div>
          <div class="panel-body">
            <label class="field-label" for="availability-product">选择示例商品</label>
            <select id="availability-product" class="select" :value="selectedCaseId" @change="loadCase($event.target.value)">
              <option v-for="item in cases" :key="item.id" :value="item.id">{{ item.name }} · {{ money(item.price) }}</option>
            </select>
            <p class="field-hint case-note">示例预设：{{ currentCase.note }}。修改条件后以实时结果为准。</p>

            <div class="form-grid">
              <div><label class="field-label" for="availability-price">模拟商品定价</label><div class="amount-input"><span>{{ order.currency }}</span><input id="availability-price" v-model="order.price" type="text" inputmode="decimal" autocomplete="off" /></div></div>
              <div><label class="field-label" for="availability-discount">优惠金额</label><div class="amount-input"><span>{{ order.currency }}</span><input id="availability-discount" v-model="order.discount" type="text" inputmode="decimal" autocomplete="off" /></div></div>
              <div><label class="field-label" for="availability-tax">模拟税费</label><div class="amount-input"><span>{{ order.currency }}</span><input id="availability-tax" v-model="order.tax" type="text" inputmode="decimal" autocomplete="off" /></div></div>
            </div>
            <div class="payable-summary"><span>本次实际支付金额</span><strong data-testid="payable-amount">{{ format(decision.amount.payable, order.currency) }}</strong></div>
            <p class="field-hint">演示实付 = 定价 − 优惠 + 税费；包含金额边界。正式金额由订单服务确认。</p>

            <div class="condition-heading">其他订单条件</div>
            <div class="form-grid">
              <div><label class="field-label" for="availability-type">商品类型</label><select id="availability-type" :value="productType" class="select" @change="setProductType($event.target.value)"><option value="one_time">一次性购买</option><option value="subscription">自动续费订阅</option><option value="mixed">一次性 + 订阅合并订单</option></select></div>
              <div><label class="field-label" for="availability-currency">订单币种</label><select id="availability-currency" v-model="order.currency" class="select"><option value="CNY">CNY</option><option value="USD">USD</option></select></div>
              <div><label class="field-label" for="availability-country">交易地区</label><select id="availability-country" v-model="order.country" class="select"><option :value="template.country">{{ template.country === 'CN' ? '中国大陆 · CN' : '美国 · US' }}</option><option value="HK">中国香港 · HK</option></select></div>
              <div><label class="field-label" for="availability-device">支付环境</label><select id="availability-device" v-model="order.device" class="select"><option value="web">网页收银台</option><option value="native">原生收银台</option></select></div>
            </div>
            <label class="verification-field"><input v-model="order.verified" type="checkbox" />已满足实名资格 <span>仅影响有此要求的方式</span></label>
            <div class="condition-heading">排序数据样本（运营模拟，不是用户偏好设置）</div>
            <div class="form-grid">
              <div><label class="field-label" for="decision-history">成功支付历史样本</label><select id="decision-history" v-model="historyScenario" class="select"><option value="none">无有效成功历史</option><option value="wallet_b">上次钱包 B，更早银行卡</option><option value="card">上次银行卡，更早钱包 B</option><option value="expired">仅有过期历史</option><option value="other_account">仅有其他账户历史</option><option value="unavailable">历史服务不可用</option></select></div>
              <div><label class="field-label" for="decision-scores">评分服务样本</label><select id="decision-scores" v-model="scoreScenario" class="select"><option value="normal">正常示例评分</option><option value="reverse">更新为另一组评分</option><option value="partial">钱包 B 缺少可信评分</option><option value="ties">全部同分</option><option value="timeout">评分查询超时</option><option value="insufficient">整体样本不足</option><option value="expired">评分结果已过期</option></select></div>
            </div>
            <p class="field-hint">三种模式在「决策策略」切换。手动选择后只更新排序数据不会跳动；可点击「重新决策」主动刷新。</p>
            <div class="condition-heading">异常与资金安全模拟</div>
            <div class="form-grid">
              <div><label class="field-label" for="availability-query">机构查询场景（本地模拟）</label><select id="availability-query" v-model="queryMode" class="select"><option value="normal">正常返回</option><option value="timeout">全部查询超时</option><option value="expired">返回已过期结果</option><option value="mismatch">返回旧订单结果</option></select></div>
              <div><label class="field-label" for="availability-payment-state">原笔支付状态</label><select id="availability-payment-state" v-model="order.paymentState" class="select"><option value="idle">尚未发起</option><option value="processing">支付处理中</option><option value="unknown">支付结果未知</option></select></div>
            </div>
            <p class="field-hint">单渠道异常可在「适用规则」中模拟；查询失败不等于本单不支持。</p>
          </div>
        </section>

        <section class="demo-panel preview-panel" aria-labelledby="preview-heading">
          <div class="panel-heading"><h2 id="preview-heading">用户视角预览</h2><span class="result-pill" data-testid="available-count">{{ decision.availableMethods.length }} / {{ activeTemplate.methods.length }} 种可用</span></div>
          <div class="panel-body">
            <div class="checkout-title"><strong>{{ order.productName }}</strong><span>{{ productTypeLabel(productType) }}</span></div>
            <div class="checkout-amount"><span>应付金额</span><strong>{{ format(decision.amount.payable, order.currency) }}</strong></div>
            <p class="preview-instruction">选择支付方式</p>
            <div v-if="decision.visibleMethods.length" class="method-options" role="radiogroup" aria-label="选择支付方式">
              <div v-for="method in decision.visibleMethods" :key="method.id" class="method-option" :class="{ selected: selectedMethodId === method.id, 'method-option--disabled': !method.available }">
                <label class="method-choice"><input v-model="selectedMethodId" type="radio" name="availability-payment-method" :value="method.id" :disabled="!method.available" :aria-label="method.name" @change="chooseMethod(method.id)" /><span class="method-option-content"><strong>{{ method.name }}</strong><span>{{ method.available ? method.description : method.userMessage }}</span><span v-if="method.available && decision.ranking?.tags[method.id]?.length" class="method-tags"><span v-for="tag in decision.ranking.tags[method.id]" :key="tag">{{ tag }}</span></span></span></label>
                <button v-if="method.state === 'requires_action'" class="btn btn-text" type="button" @click="completeQualification">模拟完成实名</button>
                <span v-else-if="!method.available" class="status-label status-label--muted">{{ stateLabel(method.state) }}</span>
              </div>
            </div>
            <div v-if="decision.status !== 'ready'" class="preview-empty" :class="{ 'preview-empty--error': decision.status !== 'zero_amount' }" role="status">
              <Icon :name="decision.status === 'zero_amount' ? 'check' : 'alert'" :size="24" />
              <strong>{{ emptyTitle }}</strong><p v-for="message in decision.errors" :key="message">{{ message }}</p>
              <p v-if="decision.status === 'no_methods'">当前商品和订单条件下暂无可用方式，请调整订单或联系支持；不会混入其他模板的支付方式。</p>
              <p v-if="decision.status === 'unconfirmed'">查询未成功或结果失效，不代表此订单不支持支付。</p>
              <p v-if="decision.status === 'action_required'">请先完成必要资格，再选择支付方式。</p>
              <p v-if="decision.status === 'temporarily_unavailable'">支付服务暂时不可用，请稍后重试或联系支持。</p>
            </div>
            <div v-if="hasQueryIssue" class="query-notice" role="status">{{ decision.availableMethods.length ? '部分支付方式尚未确认。已独立确认可用的方式仍可选择。' : '支付方式尚未确认，请重试查询。' }}<button class="btn btn-text" type="button" @click="retryQuery">重试查询（恢复正常模拟）</button></div>
            <button v-else-if="decision.status === 'temporarily_unavailable'" class="btn btn-text" type="button" @click="retryQuery">重新检查状态</button>
            <p v-if="paymentBlocked" class="selection-notice" role="alert">原笔支付处理中或结果未知，请先查单。不能再次发起或自动换渠道扣款。</p>
            <p v-if="selectionNotice" class="selection-notice" role="status">{{ selectionNotice }}</p>
            <button class="btn btn-primary simulate-button" type="button" :disabled="!selectedMethodId || decision.status !== 'ready' || paymentBlocked" @click="confirmSimulation">模拟发起前校验</button>
            <p class="field-hint preview-footnote">默认规则：{{ defaultName(strategy.defaultPolicy) }}。仅首次预览应用，不代表用户已授权付款；失效后不自动改选。</p>
            <div v-if="confirmation" class="confirmation" role="status">{{ confirmation }}</div>
          </div>
          <div class="preview-bottom"><Icon name="check" :size="14" />先判断可用性，再排序，发起前再次校验</div>
        </section>
      </div>

      <section class="demo-panel explanation-panel" aria-labelledby="explanation-heading">
        <div class="panel-heading"><div><h2 id="explanation-heading">为什么展示、为什么这样排序</h2><p>运营诊断视角：适用性、顺序、标签与默认选中分别解释。</p><p>规则 v{{ decision.ruleVersion || '—' }} · 来源：{{ consultation.source }} · 查询于 {{ time(consultation.observedAt) }} · 有效至 {{ time(consultation.expiresAt) }} · {{ queryMode === 'mismatch' ? '订单版本不匹配' : '绑定当前订单条件' }}</p></div><span>{{ decision.ranking?.frozen ? '交互中顺序已冻结' : modeName(decision.ranking?.effectiveMode) }}</span></div>
        <div v-if="!decision.methods.length" class="diagnostic-empty">{{ decision.errors.join(' ') || '当前订单无法进行支付方式判断。' }}</div>
        <div v-else class="table-scroll">
          <table class="diagnostic-table" aria-label="支付方式适用性判断明细">
            <thead><tr><th>支付方式</th><th>业务金额限制</th><th>本次结果</th><th>顺序与展示依据</th><th>判断原因与渠道明细</th></tr></thead>
            <tbody><tr v-for="method in decision.methods" :key="method.id">
              <td><strong>{{ method.name }}</strong></td><td class="amount-range">{{ money(method.minAmount) }} – {{ money(method.maxAmount) }}</td>
              <td><span class="status-label" :class="method.available ? 'status-label--success' : 'status-label--muted'">{{ stateLabel(method.state) }}</span><p class="field-hint">{{ method.visible ? method.available ? '展示，可选择' : '展示，不可选择' : '默认隐藏' }}</p></td>
              <td><template v-if="method.available"><strong>第 {{ decision.availableMethods.findIndex(item => item.id === method.id) + 1 }} 位</strong><p class="field-hint">{{ decision.ranking?.reasons[method.id] }}</p><p class="field-hint">标签：{{ decision.ranking?.tags[method.id]?.join('、') || '无' }}<br />首次默认候选：{{ decision.ranking?.defaultMethodId === method.id ? '是' : '否' }}</p></template><span v-else class="field-hint">不参与可支付排序、推荐或默认选中</span></td>
              <td><span v-if="method.available">满足本单条件，{{ method.eligibleChannels.length }} 条渠道可用；不代表必然支付成功。</span><ul v-else class="reason-list"><li v-for="(reason, index) in method.reasons" :key="`${reason.code}_${index}`">{{ reason.message }}<small>{{ sourceLabel(reason.source) }} · {{ reason.code }} · 版本 {{ reason.sourceVersion }}</small></li></ul>
                <details class="channel-details"><summary>查看 {{ method.channels.length }} 条渠道判断</summary><div v-for="channel in method.channels" :key="channel.id" class="channel-result"><strong>{{ channel.name }} · {{ stateLabel(channel.state) }}</strong><span>商户 {{ channel.merchantAccount }} · {{ channel.capabilityVersion }} · 更新 {{ channel.updatedAt }}</span><span :class="{ 'channel-available': channel.available }">{{ channel.available ? '渠道条件满足' : channel.reasons.map(reason => `${sourceLabel(reason.source)}：${reason.message}`).join('；') }}</span><span>模拟原始结果：{{ channel.rawCode || '无成功查询结果' }}</span></div></details>
              </td>
            </tr></tbody>
          </table>
        </div>
      </section>
    </template>

    <section v-else-if="tab === 'strategy'" class="demo-panel" aria-labelledby="strategy-heading">
      <div class="panel-heading"><div><h2 id="strategy-heading">收银台支付方式决策策略</h2><p>这是运营侧演示配置，不是用户主动设置偏好。策略草稿不影响当前预览，应用时显式重开预览。</p></div><button class="btn btn-primary" type="button" :disabled="strategyErrors.length > 0 || !strategyDirty" @click="applyStrategy">应用策略并重开预览</button></div>
      <div class="draft-toolbar"><span>当前生效：{{ modeName(strategy.mode) }} · 策略 v{{ strategy.version }}</span><span>{{ strategyDirty ? '存在未应用策略草稿' : '草稿与生效策略一致' }}</span><button class="btn btn-text" type="button" :disabled="!strategyDirty" @click="discardStrategy">放弃策略草稿</button><span role="status">{{ strategyNotice }}</span></div>
      <div v-if="strategyErrors.length" class="config-errors" role="alert"><p v-for="error in strategyErrors" :key="error">{{ error }}</p></div>
      <div class="panel-body"><div class="form-grid">
        <div><label class="field-label" for="decision-mode">排序模式</label><select id="decision-mode" v-model="strategyDraft.mode" class="select"><option value="fixed">固定排序</option><option value="preference">用户偏好排序（成功历史推断）</option><option value="data_driven">数据驱动排序（示例评分）</option></select></div>
        <div><label class="field-label" for="decision-default">默认选中规则</label><select id="decision-default" v-model="strategyDraft.defaultPolicy" class="select"><option value="none">不默认选中</option><option value="first">第一可用项</option><option value="history">最近可用成功历史优先，无记录回第一可用项</option></select></div>
        <div><label class="field-label" for="decision-recommended">推荐标签指定方式</label><select id="decision-recommended" v-model="strategyDraft.recommendedMethodId" class="select"><option value="">不展示推荐标签</option><option v-for="method in template.methods" :key="method.id" :value="method.id">{{ method.name }}</option></select><p class="field-hint">仅在该方式本单可用时展示，不因此调整顺序或自动选中。</p></div>
        <div><label class="verification-field"><input v-model="strategyDraft.showHistoryTag" type="checkbox" />展示有依据的成功历史标签</label><p class="field-hint">确为最近一次成功才标“上次成功使用”；跳过不可用方式而采用更早记录时标“曾成功使用”。</p><label class="verification-field"><input v-model="strategyDraft.backupEnabled" type="checkbox" />启用预先授权的兼容备用模板</label><p class="field-hint">主模板无可直接支付方式时才尝试；单次只展示一套模板。</p></div>
      </div>
      <h3 class="condition-heading">基础展示顺序</h3><ol class="base-order-list"><li v-for="(methodId, index) in strategyDraft.baseOrder" :key="methodId"><span>{{ index + 1 }}. {{ methodName(methodId) }}</span><div><button class="btn btn-text" type="button" :disabled="index === 0" :aria-label="`${methodName(methodId)}上移`" @click="moveBaseMethod(index, -1)">上移</button><button class="btn btn-text" type="button" :disabled="index === strategyDraft.baseOrder.length - 1" :aria-label="`${methodName(methodId)}下移`" @click="moveBaseMethod(index, 1)">下移</button></div></li></ol>
      <h3 class="condition-heading">本地决策口径</h3><ul class="strategy-rules"><li>固定模式沿用基础顺序；偏好模式最多提前一项本单可用的成功历史方式。</li><li>数据模式保留有效历史一项，其余按可信示例评分；整体异常回偏好，再回基础。单项缺分保留原位置，同分稳定。</li><li>当前主模板：{{ template.name }}；可选备用：{{ backupTemplate.name }}。两套模板分别判断、分别查询，不合并方式。</li><li>预览采用策略草稿与线上隔离的本地应用机制，不读取或发布真实配置。</li></ul>
      <h3 class="condition-heading">当前评分样本（非真实转化预测）</h3><div class="comparison-methods"><span v-for="method in template.methods" :key="method.id">{{ method.name }}：{{ scoreSnapshots[template.id].values[method.id] ?? '无可信分' }}</span></div>
      </div>
    </section>

    <section v-else-if="tab === 'rules'" class="demo-panel" aria-labelledby="rules-heading">
      <div class="panel-heading"><div><h2 id="rules-heading">模板业务限制草稿</h2><p>编辑不会影响当前生效 v{{ template.version }}；校验通过后才能应用到本地演示。业务限制不能放宽机构能力。</p></div><button class="btn btn-primary" type="button" :disabled="configurationErrors.length > 0 || !draftDirty" @click="applyDraft">应用草稿到演示</button></div>
      <div class="draft-toolbar"><span>{{ draftDirty ? '存在未应用草稿，试算仍使用生效版本' : '草稿与生效版本一致' }}</span><button class="btn btn-text" type="button" :disabled="!draftDirty" @click="discardDraft">放弃草稿修改</button><span v-if="draftNotice" role="status">{{ draftNotice }}</span></div>
      <div v-if="configurationErrors.length" class="config-errors" role="alert"><strong>规则尚未生效，请先修正：</strong><p v-for="error in configurationErrors" :key="error">{{ error }}</p></div>
      <div v-else-if="draftDirty" class="draft-impact" role="status"><strong>应用前影响预览</strong><p>以下使用当前地区、终端、资格和查询场景；比较的是可直接选择的方式。</p><ul><li v-for="row in draftImpactRows" :key="row.id">{{ row.name }}：生效 {{ row.before }} 种 → 草稿 {{ row.after }} 种<span v-if="row.after === 0"> · {{ statusTitle(row.status) }}</span></li></ul><p v-if="!draftImpactRows.length">当前示例的可选方式数量未变化，不代表所有真实订单无影响。</p><p>仅本地演示可直接应用；生产变更仍须影响复核及发布审批。</p></div>
      <div class="table-scroll"><table class="rules-table" aria-label="支付方式业务限制配置"><thead><tr><th>支付方式</th><th>模板开关</th><th>最低金额（{{ template.currency }}）</th><th>最高金额（{{ template.currency }}）</th><th>适用范围（示例能力）</th></tr></thead><tbody>
        <tr v-for="method in draftTemplate.methods" :key="method.id"><td><strong>{{ method.name }}</strong></td><td><label class="enabled-control"><input v-model="method.enabled" type="checkbox" :aria-label="`${method.name}模板开关`" />{{ method.enabled ? '启用' : '关闭' }}</label></td>
          <td><input v-model="method.minAmount" class="input limit-input" type="text" inputmode="decimal" :aria-label="`${method.name}最低金额`" /></td>
          <td><input v-model="method.maxAmount" class="input limit-input" type="text" inputmode="decimal" :aria-label="`${method.name}最高金额`" /></td>
          <td>{{ method.productTypes.includes('subscription') ? '一次性购买 / 订阅' : '一次性购买' }}<br /><span class="field-hint">{{ method.devices.length === 2 ? '网页 / 原生' : '仅网页' }}{{ method.requiresVerified ? ' · 需实名' : '' }}</span></td>
        </tr>
      </tbody></table></div>
      <div class="channel-config"><h3>渠道能力与实时状态（独立于草稿）</h3><p class="field-hint">机构能力只读；状态、开关为即时故障模拟，不是业务规则发布。仅修改本地示例，不调用支付机构。</p>
        <div class="table-scroll"><table class="rules-table" aria-label="渠道能力与状态"><thead><tr><th>所属方式 / 渠道</th><th>渠道硬性金额范围</th><th>渠道开关</th><th>实时状态</th></tr></thead><tbody>
          <template v-for="method in template.methods" :key="method.id"><tr v-for="channel in method.channels" :key="channel.id"><td><strong>{{ channel.name }}</strong><p class="field-hint">{{ method.name }} · {{ channel.merchantAccount }}<br />{{ channel.capabilityVersion }} · {{ channel.updatedAt }}</p></td><td>{{ money(channel.minAmount) }} – {{ money(channel.maxAmount) }}</td>
            <td><label class="enabled-control"><input v-model="channel.enabled" type="checkbox" :aria-label="`${channel.name}开关`" />{{ channel.enabled ? '启用' : '关闭' }}</label></td>
            <td><select v-model="channel.health" class="select" :aria-label="`${channel.name}状态`"><option value="available">可用</option><option value="maintenance">维护中</option><option value="unknown">状态未确认</option><option value="timeout">查询超时</option><option value="restricted">机构明确不支持本单</option></select></td>
          </tr></template>
        </tbody></table></div>
      </div>
    </section>

    <section v-else class="demo-panel" aria-labelledby="comparison-heading">
      <div class="panel-heading"><div><h2 id="comparison-heading">同场景，多商品决策对比</h2><p>使用生效规则和策略、当前环境及数据样本；每个商品独立模拟查询，标明实际模板。未应用草稿不参与。</p></div><button class="btn btn-secondary" type="button" @click="tab = 'simulation'">返回试算</button></div>
      <div class="table-scroll"><table class="comparison-table" aria-label="同模板多商品对比"><thead><tr><th>商品</th><th>定价 / 优惠</th><th>实际支付</th><th>可展示的支付方式</th><th>操作</th></tr></thead><tbody>
        <tr v-for="row in comparisonRows" :key="row.id"><td><strong>{{ row.name }}</strong><p class="field-hint">{{ productTypeLabel(row.type) }}</p></td><td>{{ money(row.price, order.currency) }}<p class="field-hint">优惠 {{ money(row.discount, order.currency) }} / 税费 {{ money(row.tax || '0.00', order.currency) }}</p></td><td><strong>{{ format(row.result.amount.payable, order.currency) }}</strong></td>
          <td><div v-if="row.result.visibleMethods.length" class="comparison-methods"><span v-for="method in row.result.visibleMethods" :key="method.id">{{ method.name }}{{ method.available ? '' : ` · ${stateLabel(method.state)}` }}</span></div><span v-else class="field-hint">{{ statusTitle(row.result.status) }}</span><p class="field-hint">{{ row.result.selectedTemplate?.name || '未命中模板' }} · {{ modeName(row.result.ranking?.effectiveMode) }}</p></td>
          <td><button class="btn btn-text" type="button" :aria-label="`试算${row.name}`" @click="loadCase(row.id); tab = 'simulation'">试算</button></td>
        </tr>
      </tbody></table></div>
    </section>
    <p class="demo-scope">本地演示：适用性 + 三种排序 + 标签与默认选中 + 兼容备用模板 + 决策解释。历史、评分、机构查询均为虚构数据，查询 / 评分默认有效期 120 秒；无真实模型、后端、支付、存储、审批或自动刷新。</p>
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
      selectedCaseId: 'small', selectedMethodId: '', selectionNotice: '', confirmation: '', tab: 'simulation',
      tabs: [{ id: 'simulation', name: '商品试算' }, { id: 'strategy', name: '决策策略' }, { id: 'rules', name: '适用规则' }, { id: 'comparison', name: '多商品对比' }]
    }
  },
  computed: {
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
      this.rankingLock = null
      this.selectedMethodId = ''
      this.selectedTemplateId = ''
      this.selectionNotice = ''
      this.refreshDecision()
      const defaultId = this.decision.ranking?.defaultMethodId
      if (defaultId && !this.paymentBlocked) this.chooseMethod(defaultId, false)
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
      this.tab = 'simulation'
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
.demo-heading, .demo-header, .demo-notice, .panel-heading, .demo-tabs, .template-summary, .method-option, .checkout-title, .checkout-amount, .payable-summary, .verification-field, .preview-bottom { display: flex; align-items: center; }
.demo-header { gap: 16px; flex-wrap: wrap; margin-bottom: 20px; justify-content: space-between; }
.demo-heading { gap: 10px; flex-wrap: wrap; }
.demo-subtitle { color: #595959; margin-top: 4px; font-size: 13px; }
.demo-tag, .result-pill { font-size: 12px; color: #0958d9; background: #e6f4ff; border: 1px solid #bae0ff; border-radius: 4px; padding: 2px 8px; white-space: nowrap; }
.demo-notice { gap: 9px; align-items: flex-start; padding: 11px 14px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px; font-size: 12px; color: #664d03; }
.demo-notice svg { flex-shrink: 0; margin-top: 2px; }
.template-summary { gap: 24px; flex-wrap: wrap; padding: 20px 0; }
.template-summary > div { display: flex; flex-direction: column; gap: 4px; }
.template-summary > div:first-child { flex: 1; min-width: 180px; }
.summary-label { font-size: 12px; color: #737373; }
.template-summary strong { font-size: 14px; font-weight: 500; }
.template-summary code { color: #737373; font-size: 11px; }
.demo-tabs { gap: 24px; border-bottom: 1px solid #e8e8e8; margin-bottom: 20px; }
.demo-tabs button { border: 0; border-bottom: 2px solid transparent; padding: 10px 0 12px; color: #595959; background: transparent; font: inherit; cursor: pointer; }
.demo-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; font-weight: 500; }
.decision-process { margin-bottom: 20px; }
.decision-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; list-style: none; padding: 18px; }
.decision-steps li { display: flex; align-items: flex-start; gap: 9px; min-width: 0; }
.step-index { display: flex; align-items: center; justify-content: center; border: 1px solid #91caff; background: #e6f4ff; color: #0958d9; border-radius: 50%; width: 23px; height: 23px; flex-shrink: 0; font-size: 12px; }
.decision-steps strong { font-size: 13px; font-weight: 500; }
.decision-steps p { font-size: 12px; color: #737373; line-height: 1.65; margin-top: 5px; overflow-wrap: anywhere; }
.decision-snapshot { border-top: 1px solid #f0f0f0; padding: 14px 18px; font-size: 12px; }
.decision-snapshot summary { color: #1677ff; cursor: pointer; }
.snapshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; margin: 16px 0; }
.snapshot-grid dt { color: #737373; margin-bottom: 5px; }
.snapshot-grid dd { margin: 0; color: #333; line-height: 1.7; overflow-wrap: anywhere; }
.decision-snapshot h3 { font-size: 13px; margin-top: 16px; }
.template-attempts { padding-left: 20px; display: grid; gap: 12px; margin-top: 12px; }
.template-attempts strong, .template-attempts span { display: block; margin-bottom: 4px; }
.template-attempts span, .template-attempts p { color: #737373; line-height: 1.6; }
.base-order-list { list-style: none; padding: 0; display: grid; gap: 8px; max-width: 560px; }
.base-order-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; background: #fafafa; border: 1px solid #e8e8e8; border-radius: 5px; font-size: 13px; }
.strategy-rules { padding-left: 18px; display: grid; gap: 8px; color: #595959; font-size: 13px; line-height: 1.7; }
.method-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.method-tags > span { display: inline-block; color: #0958d9; background: #e6f4ff; border-radius: 3px; padding: 1px 5px; font-size: 11px; }
.simulation-grid { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr); gap: 20px; align-items: start; }
.demo-panel { min-width: 0; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden; background: #fff; }
.panel-heading { justify-content: space-between; align-items: flex-start; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #f0f0f0; }
.panel-heading h2 { font-size: 15px; font-weight: 600; }
.panel-heading > span, .panel-heading p { color: #737373; font-size: 12px; }
.panel-heading p { margin-top: 5px; }
.panel-body { padding: 18px; }
.field-label { display: block; font-size: 13px; color: #333; margin-bottom: 7px; }
.select { width: 100%; }
.field-hint { font-size: 12px; color: #737373; margin-top: 5px; line-height: 1.6; }
.case-note { margin-bottom: 18px; }
.form-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
.amount-input { display: flex; align-items: center; min-width: 0; height: 34px; border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden; }
.amount-input:focus-within { outline: 2px solid #91caff; }
.amount-input span { color: #737373; font-size: 12px; background: #fafafa; padding: 6px 8px; border-right: 1px solid #eee; }
.amount-input input { border: 0; background: transparent; min-width: 0; width: 100%; padding: 6px 8px; font: inherit; outline: none; }
.payable-summary { justify-content: space-between; margin-top: 20px; padding: 14px; border-radius: 6px; background: #f5faff; color: #333; font-size: 13px; }
.payable-summary strong { color: #0958d9; font-size: 22px; font-variant-numeric: tabular-nums; }
.condition-heading { border-top: 1px solid #f0f0f0; padding-top: 18px; margin: 20px 0 14px; font-weight: 500; font-size: 13px; }
.verification-field { gap: 7px; flex-wrap: wrap; font-size: 13px; margin-top: 18px; }
.verification-field span { color: #737373; font-size: 12px; }
input[type='checkbox'], input[type='radio'] { accent-color: #1677ff; width: 15px; height: 15px; flex-shrink: 0; }
.checkout-title { justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.checkout-title span { font-size: 12px; color: #737373; }
.checkout-amount { justify-content: space-between; padding: 18px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 18px; }
.checkout-amount > span { color: #595959; font-size: 13px; }
.checkout-amount strong { font-size: 28px; line-height: 1.3; font-variant-numeric: tabular-nums; }
.preview-instruction { font-size: 13px; margin-bottom: 12px; }
.method-options { display: grid; gap: 10px; }
.method-option { gap: 12px; border: 1px solid #d9d9d9; border-radius: 6px; padding: 14px; cursor: pointer; }
.method-option:hover { border-color: #91caff; }
.method-option.selected { border-color: #1677ff; background: #f5faff; }
.method-choice { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; cursor: inherit; }
.method-option--disabled { background: #fafafa; cursor: default; border-color: #e8e8e8; }
.method-option--disabled .method-option-content strong { color: #737373; }
.method-option .btn { flex-shrink: 0; white-space: normal; }
.query-notice { margin-top: 12px; padding: 10px; background: #e6f4ff; border-radius: 4px; font-size: 12px; color: #0958d9; }
.query-notice .btn { display: block; margin-top: 5px; padding-left: 0; }
.draft-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 18px; background: #f5faff; color: #0958d9; font-size: 12px; }
.draft-impact { padding: 14px 18px; font-size: 12px; background: #fffbe6; color: #664d03; }
.draft-impact p { margin-top: 6px; }
.draft-impact ul { padding-left: 18px; margin-top: 8px; display: grid; gap: 5px; }
.method-option-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.method-option-content strong { font-size: 14px; font-weight: 500; }
.method-option-content > span, .channel-count { font-size: 12px; color: #737373; }
.simulate-button { width: 100%; justify-content: center; margin-top: 24px; height: 38px; }
.preview-footnote { text-align: center; }
.preview-bottom { gap: 6px; justify-content: center; color: #737373; padding: 12px 18px; background: #fafafa; border-top: 1px solid #f0f0f0; font-size: 12px; }
.selection-notice { color: #ad6800; background: #fffbe6; padding: 10px; font-size: 12px; margin-top: 12px; border-radius: 4px; }
.confirmation { background: #f6ffed; border: 1px solid #b7eb8f; color: #3f6600; padding: 10px; font-size: 12px; margin-top: 12px; border-radius: 4px; }
.preview-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 24px 16px; margin-top: 12px; background: #fafafa; border: 1px dashed #d9d9d9; border-radius: 6px; }
.preview-empty svg { color: #389e0d; }
.preview-empty--error svg { color: #d48806; }
.preview-empty p { font-size: 12px; color: #737373; }
.explanation-panel { margin-top: 20px; }
.table-scroll { overflow-x: auto; }
.diagnostic-table, .rules-table, .comparison-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.diagnostic-table th, .rules-table th, .comparison-table th { background: #fafafa; font-weight: 500; color: #595959; white-space: nowrap; }
.diagnostic-table td, .diagnostic-table th, .rules-table td, .rules-table th, .comparison-table td, .comparison-table th { padding: 14px 18px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
.diagnostic-table tr:last-child td, .rules-table tr:last-child td, .comparison-table tr:last-child td { border-bottom: 0; }
.diagnostic-table strong, .rules-table strong, .comparison-table strong { font-weight: 500; }
.diagnostic-table td:first-child { min-width: 95px; }
.amount-range { white-space: nowrap; font-size: 12px; }
.status-label { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 12px; white-space: nowrap; }
.status-label--success { color: #237804; background: #f6ffed; border: 1px solid #b7eb8f; }
.status-label--muted { color: #595959; background: #fafafa; border: 1px solid #d9d9d9; }
.reason-list { list-style: none; min-width: 190px; display: grid; gap: 4px; }
.reason-list small { display: block; color: #737373; font-size: 11px; overflow-wrap: anywhere; }
.channel-details { margin-top: 8px; font-size: 12px; min-width: 190px; }
.channel-details summary { color: #1677ff; cursor: pointer; }
.channel-result { display: grid; gap: 4px; padding: 10px; background: #fafafa; margin-top: 6px; border-radius: 4px; color: #737373; }
.channel-result strong { color: #595959; }
.channel-result .channel-available { color: #237804; }
.diagnostic-empty { padding: 24px; color: #737373; font-size: 13px; }
.limit-input { min-width: 110px; max-width: 150px; }
.enabled-control { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
.channel-config { border-top: 1px solid #e8e8e8; padding-top: 20px; }
.channel-config > h3 { font-size: 14px; padding: 0 18px; }
.channel-config > p { padding: 0 18px; margin-bottom: 14px; }
.config-errors { background: #fff2f0; color: #a8071a; padding: 14px 18px; font-size: 12px; }
.config-errors p { margin-top: 4px; }
.comparison-methods { display: flex; flex-wrap: wrap; gap: 6px; min-width: 170px; }
.comparison-methods span { background: #f5f5f5; border: 1px solid #e8e8e8; padding: 2px 7px; border-radius: 4px; font-size: 12px; }
.demo-scope { color: #737373; font-size: 12px; line-height: 1.7; margin-top: 18px; }
@media (max-width: 1100px) { .simulation-grid { grid-template-columns: minmax(0, 1fr); } .template-summary { gap: 16px; } .decision-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .template-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); } .template-summary > div:first-child { grid-column: 1 / -1; } .demo-tabs { gap: 18px; flex-wrap: wrap; } .panel-heading, .panel-body { padding: 14px; } .panel-heading { flex-wrap: wrap; } .form-grid, .decision-steps { grid-template-columns: minmax(0, 1fr); gap: 12px; } .checkout-amount strong { font-size: 24px; } .method-option { padding: 12px; } .channel-count { display: none; } }
</style>
