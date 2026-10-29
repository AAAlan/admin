<template>
  <div class="rollout-workspace">
    <div class="breadcrumb">
      收银台（海外） <span>/</span> 支付体验管理
      <span>/</span> 功能开关与灰度发布
    </div>
    <header class="rollout-heading">
      <div>
        <h1>功能开关与灰度发布 <span class="demo-label">交互 Demo</span></h1>
        <p>让新的支付体验，先从一小部分用户开始。</p>
      </div>
      <div v-if="tab === 'features'" class="heading-actions">
        <button class="btn btn-secondary" @click="showTest('draft')">
          效果预览</button
        ><button
          class="btn btn-primary"
          :disabled="
            !changes.length || !!workspace.pending || role !== 'editor'
          "
          @click="openAction('submit')"
        >
          <Icon name="upload" :size="14" />提交发布<span v-if="changes.length">
            · {{ changes.length }}</span
          >
        </button>
        <details class="utility-menu" @toggle="onUtilityToggle">
          <summary class="btn btn-secondary">更多</summary>
          <div class="utility-content">
            <button @click="showHistory">发布记录与回滚</button>
            <button @click="showTest('live')">预览已发布配置</button>
            <button
              :disabled="role !== 'emergency'"
              @click="openAction('kill')"
            >
              紧急停用非基础能力
            </button>
            <button
              v-if="killedKeys.length"
              :disabled="role !== 'emergency'"
              @click="openAction('resume')"
            >
              恢复已停用能力
            </button>
            <small>应急操作需在「演示工具」切换应急身份</small>
          </div>
        </details>
      </div>
    </header>

    <div v-if="tab === 'features'" class="scope-bar">
      <div>
        <span class="scope-label">作用域</span><strong>白银之城</strong
        ><span class="scope-divider">/</span>Web Store<span
          class="scope-divider"
          >/</span
        ><span class="environment-dot"></span> 本地演示环境
      </div>
      <details class="utility-menu demo-tools" @toggle="onUtilityToggle">
        <summary>
          演示工具{{
            role === 'reviewer'
              ? ' · 审批'
              : role === 'emergency'
                ? ' · 应急'
                : ''
          }}
        </summary>
        <div class="utility-content">
          <label class="role-label"
            >演示身份<select v-model="role" aria-label="演示身份">
              <option value="editor">运营 · 林晓（编辑）</option>
              <option value="reviewer">审批 · 陈安（发布 / 回滚）</option>
              <option value="emergency">应急 · 周宁（停用 / 恢复）</option>
            </select></label
          >
          <small>仅模拟角色隔离，不代表真实鉴权。</small>
          <details class="capability-tools">
            <summary>机构状态样本</summary>
            <label
              >控制对象<select
                v-model="capabilityTarget"
                aria-label="机构样本对象"
              >
                <option
                  v-for="item in catalog"
                  :key="item.key"
                  :value="item.key"
                >
                  {{ item.name }}
                </option>
              </select></label
            >
            <label
              >模拟机构状态<select
                v-model="workspace.capabilities[capabilityTarget]"
                aria-label="模拟机构状态"
              >
                <option
                  v-for="(label, state) in readinessLabels"
                  :key="state"
                  :value="state"
                >
                  {{ label }}
                </option>
              </select></label
            >
            <small
              >仅用于验证阻断；不是机构开通操作，不随发布或回滚改变。</small
            >
          </details>
        </div>
      </details>
    </div>
    <p v-if="tab === 'features'" class="scope-notice">
      <Icon
        name="alert"
        :size="14"
      />所有更改仅在本页内存生效，刷新即重置。不接入真实支付、不修改现有配置；身份切换仅模拟权限，不是真实鉴权。
    </p>

    <div v-if="notice" class="notice" role="status">
      {{ notice
      }}<button aria-label="关闭通知" @click="notice = ''">
        <Icon name="close" :size="14" />
      </button>
    </div>
    <div v-if="tab === 'features' && workspace.pending" class="pending-banner">
      <div>
        <strong>有一份配置正在等待独立审核</strong>
        <p>
          {{ workspace.pending.submitter }} 提交 · 基于 v{{
            workspace.pending.baseRevision
          }}
          · {{ workspace.pending.reason }}
        </p>
      </div>
      <div>
        <template v-if="role === 'reviewer'"
          ><button class="btn btn-secondary" @click="openAction('reject')">
            驳回</button
          ><button class="btn btn-primary" @click="openAction('approve')">
            查看并审核发布
          </button></template
        ><button
          v-else-if="role === 'editor'"
          class="btn btn-secondary"
          @click="openAction('withdraw')"
        >
          撤回审核</button
        ><span v-else>切换审批身份查看审核操作</span>
      </div>
    </div>
    <div v-if="tab === 'features' && killedKeys.length" class="kill-banner" role="status">
      <Icon name="alert" :size="17" />
      <div>
        <strong>{{ killedKeys.length }} 项能力已紧急停用</strong>
        <p>
          紧急停用独立于配置版本，发布和回滚不会解除。基础银行卡不受此总停用影响。
        </p>
      </div>
      <button
        v-if="role === 'emergency'"
        class="btn btn-secondary"
        @click="openAction('resume')"
      >
        恢复已停用能力
      </button>
    </div>

    <nav class="rollout-tabs" aria-label="灰度管理">
      <button
        v-for="item in tabs"
        :key="item.id"
        :class="{ active: tab === item.id }"
        :aria-current="tab === item.id ? 'page' : undefined"
        @click="tab = item.id"
      >
        {{ item.name }}
      </button>
      <div v-if="tab === 'features'" class="version-indicator">
        <span class="live-dot"></span>当前生效 v{{ workspace.revision
        }}<span v-if="changes.length" class="draft-tag"
          >{{ changes.length }} 项未发布</span
        >
      </div>
    </nav>

    <section v-if="tab === 'methods'" class="template-method-entry rules-panel">
      <h2>在收银台模版内管理支付方式灰度</h2>
      <p>先选择具体模版，再为其中的支付方式设置开放范围。每个模版独立生效，不提供场景级支付方式总开关。</p>
      <p>操作路径：全局收银台模版 → 编辑 → 对应支付方式「设置开放范围」→ 保存模版。</p>
      <router-link class="btn btn-primary" to="/payment/sort">前往收银台模版</router-link>
      <p class="template-method-note">模版内支持关闭 / 灰度 / 全量、用户 platform 条件和效果试算。此页的版本、审批与应急仅用于独立功能开关样本，不会发布或停用模版支付方式。</p>
    </section>
    <template v-if="tab === 'features'">
      <div class="configuration-layout">
        <section class="rules-panel">
          <div class="section-heading">
            <div>
              <h2>
                {{ tab === 'features' ? '支付功能开关' : '支付方式可见性' }}
              </h2>
              <p>
                {{
                  tab === 'features'
                    ? '功能灰度不改变支付入口；关闭新保存，不等于关闭历史卡复用。'
                    : '先完成机构开通，再配置向谁开放；已开通也不代表所有订单都能使用。'
                }}
              </p>
            </div>
            <span class="subtle-tag">配置草稿</span>
          </div>
          <div v-if="tab === 'methods'" class="inline-info">
            基础银行卡全量保留。灰度不会绕过币种、设备、金额与机构准入要求，也不改变原有排序。
          </div>
          <div class="rules-table-wrap">
            <table class="rules-table">
              <thead>
                <tr>
                  <th>{{ tab === 'features' ? '功能' : '支付方式' }}</th>
                  <th>开放范围</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in currentCatalog"
                  :key="item.key"
                  :class="{ 'changed-row': itemChanged(item.key) }"
                >
                  <td>
                    <div class="rule-identity">
                      <span class="payment-mark" :class="item.color">{{
                        item.mark
                      }}</span>
                      <div>
                        <button class="name-button" @click="openRule(item)">
                          {{ item.name }}</button
                        ><span v-if="item.baseline" class="baseline-tag"
                          >基础兜底</span
                        >
                        <p>{{ item.description }}</p>
                        <span
                          class="readiness-badge"
                          :class="{ blocked: !readinessFor(item.key).ready }"
                          >机构{{
                            readinessLabels[readinessFor(item.key).state]
                          }}
                          · 样本</span
                        >
                        <span v-if="itemChanged(item.key)" class="changed-label"
                          >有未发布变更</span
                        >
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="switch-cell">
                      <span
                        class="mode-text"
                        :class="draft.rules[item.key].mode"
                        >{{ ruleSummary(draft.rules[item.key]) }}</span
                      >
                    </div>
                    <span v-if="workspace.kills[item.key]" class="stop-label"
                      >紧急停用覆盖中</span
                    >
                    <p
                      v-if="hasTargeting(draft.rules[item.key])"
                      class="table-hint"
                    >
                      {{ conditions(draft.rules[item.key]) }}
                    </p>
                    <p v-if="itemChanged(item.key)" class="table-hint">
                      当前生效：{{
                        ruleSummary(workspace.current.rules[item.key])
                      }}
                    </p>
                  </td>
                  <td>
                    <button class="text-link" @click="openRule(item)">
                      {{
                        canEdit && !item.baseline ? '设置开放范围' : '查看规则'
                      }}<Icon name="arrowRight" :size="12" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <details v-if="tab === 'features'" class="advanced-feature">
            <summary>
              高级设置 · 历史卡复用<span
                v-if="itemChanged('card_reuse')"
                class="draft-tag"
                >有未发布变更</span
              ><span v-if="workspace.kills.card_reuse" class="stop-label"
                >紧急停用中</span
              >
            </summary>
            <div class="advanced-feature-row">
              <div>
                <strong>{{ reuseItem.name }}</strong>
                <p>
                  仅控制已有卡的展示与使用，与「记住卡信息」独立。关闭新保存不会影响历史卡。
                </p>
              </div>
              <span class="mode-text" :class="draft.rules.card_reuse.mode">{{
                ruleSummary(draft.rules.card_reuse)
              }}</span>
              <button class="text-link" @click="openRule(reuseItem)">
                {{ canEdit ? '设置开放范围' : '查看规则' }}
              </button>
            </div>
          </details>
          <div class="rules-footer">
            <Icon name="alert" :size="14" /><span
              >这里修改的是草稿。提交审核并由独立审批人发布后，才会改变演示生效版本。</span
            ><button
              v-if="changes.length && canEdit"
              class="text-link"
              @click="discardDraft"
            >
              放弃草稿
            </button>
          </div>
        </section>
      </div>
    </template>

    <dialog
      ref="auxiliaryDialog"
      class="rollout-dialog auxiliary-dialog"
      aria-labelledby="auxiliary-title"
      @cancel.prevent="closeAuxiliary"
    >
      <header class="dialog-heading">
        <h2 id="auxiliary-title">
          {{ auxiliaryView === 'test' ? '效果预览' : '发布记录与回滚' }}
        </h2>
        <button
          class="icon-button"
          aria-label="关闭辅助面板"
          @click="closeAuxiliary"
        >
          <Icon name="close" :size="19" />
        </button>
      </header>
      <div class="dialog-content">
        <section v-if="auxiliaryView === 'test'" class="test-section">
          <p class="inline-info">
            服务端资格与灰度决策 → 允许展示的支付方式集合 → 机构会话 /
            安全组件。此处仅试算，不创建真实会话；不可用时不自动发起其他支付。
          </p>
          <div class="section-heading">
            <div>
              <h3>这位用户会看到什么</h3>
              <p>
                更换身份和交易条件，逐项查看命中原因。机构能力与 token
                均为虚构样本。
              </p>
            </div>
            <div class="source-picker">
              <button
                :class="{ active: previewSource === 'live' }"
                @click="previewSource = 'live'"
              >
                已发布 v{{ workspace.revision }}</button
              ><button
                :class="{ active: previewSource === 'draft' }"
                @click="previewSource = 'draft'"
              >
                当前草稿
              </button>
            </div>
          </div>
          <div class="sample-buttons">
            <span>快速场景</span
            ><button
              v-for="sample in samples"
              :key="sample.id"
              class="btn btn-secondary btn-sm"
              @click="loadSample(sample.id)"
            >
              {{ sample.name }}
            </button>
          </div>
          <div class="test-layout">
            <section class="profile-panel">
              <h3>用户与交易条件</h3>
              <label class="checkbox-line"
                ><input
                  v-model="profile.loggedIn"
                  type="checkbox"
                />用户已登录</label
              ><label
                :for="profile.loggedIn ? 'rollout-user' : 'rollout-session'"
                >{{ profile.loggedIn ? '用户 ID' : '稳定会话 ID' }}</label
              ><input
                v-if="profile.loggedIn"
                id="rollout-user"
                v-model="profile.customerId"
                class="input"
              /><input
                v-else
                id="rollout-session"
                v-model="profile.sessionId"
                class="input"
              />
              <p class="field-help">
                登录用户按 userId 分桶；游客仅开放普通支付入口。
              </p>
              <div class="profile-grid">
                <div>
                  <label for="rollout-country">国家 / 地区</label
                  ><select
                    id="rollout-country"
                    v-model="profile.country"
                    class="select"
                  >
                    <option value="US">美国 · US</option>
                    <option value="DE">德国 · DE</option>
                    <option value="GB">英国 · GB</option>
                  </select>
                </div>
                <div>
                  <label for="rollout-platform">用户 platform</label
                  ><select
                    id="rollout-platform"
                    v-model="profile.platform"
                    class="select"
                  >
                    <option
                      v-for="platform in rolloutPlatforms"
                      :key="platform"
                      :value="platform"
                    >
                      {{ platform }}
                    </option>
                  </select>
                </div>
                <div>
                  <label for="rollout-currency">币种</label
                  ><select
                    id="rollout-currency"
                    v-model="profile.currency"
                    class="select"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                  </select>
                </div>
                <div>
                  <label for="rollout-amount">实付金额</label
                  ><input
                    id="rollout-amount"
                    v-model="profile.amount"
                    class="input"
                    inputmode="decimal"
                  />
                </div>
              </div>
              <h4>已有授权（样本）</h4>
              <label class="checkbox-line"
                ><input v-model="profile.paypalConsent" type="checkbox" />PayPal
                授权有效</label
              ><label class="checkbox-line"
                ><input v-model="profile.paypalToken" type="checkbox" />钱包
                token 有效</label
              ><label class="checkbox-line"
                ><input
                  v-model="profile.cardConsent"
                  type="checkbox"
                />历史卡保存授权有效</label
              ><label class="checkbox-line"
                ><input v-model="profile.cardToken" type="checkbox" />已有有效卡
                token</label
              >
              <details class="advanced-testing">
                <summary>高级边界测试</summary>
                <label for="rollout-payment-device"
                  >支付设备环境（资格样本）</label
                >
                <select
                  id="rollout-payment-device"
                  v-model="profile.device"
                  class="select"
                >
                  <option value="web">Web 浏览器</option>
                  <option value="ios">iOS 设备</option>
                  <option value="android">Android 设备</option>
                </select>
                <p class="field-help">
                  仅验证 Apple Pay 等机构设备资格，不参与用户 platform 筛选。
                </p>
                <label class="checkbox-line"
                  ><input
                    v-model="profile.providerReady"
                    type="checkbox"
                  />本单机构健康检查通过（样本）</label
                ><label class="checkbox-line"
                  ><input
                    v-model="profile.tokenScopeMatches"
                    type="checkbox"
                  />token 用户 / 商户 / 环境匹配</label
                ><label class="checkbox-line"
                  ><input
                    v-model="profile.riskBlocked"
                    type="checkbox"
                  />本单被风控阻断</label
                ><label class="checkbox-line"
                  ><input
                    v-model="profile.challenge"
                    type="checkbox"
                  />机构要求额外验证</label
                ><label for="rollout-payment-state">原笔支付状态</label
                ><select
                  id="rollout-payment-state"
                  v-model="profile.paymentState"
                  class="select"
                >
                  <option value="idle">未发起支付</option>
                  <option value="processing">处理中</option>
                  <option value="unknown">结果未知</option>
                </select>
              </details>
            </section>
            <section class="checkout-area">
              <div class="checkout-meta">
                <span
                  ><span class="live-dot"></span
                  >{{
                    previewSource === 'draft'
                      ? '草稿预览 · 不影响已发布'
                      : `已发布 v${workspace.revision}`
                  }}</span
                ><span>用户侧效果 · 非真实收银台</span>
              </div>
              <div v-if="decision.errors.length" class="error-box" role="alert">
                <p v-for="error in decision.errors" :key="error">{{ error }}</p>
              </div>
              <div v-else class="checkout-preview">
                <div class="checkout-brand">
                  <span class="mini-brand">S</span> SILVER CITY
                  <span>安全收银台</span>
                </div>
                <div class="order-summary">
                  <p>白银之城 · 星辉礼包</p>
                  <strong>{{ money(profile.amount) }}</strong
                  ><small>已包含优惠及税费 · 演示订单</small>
                </div>
                <h3>选择支付方式</h3>
                <div v-if="!visibleMethods.length" class="empty-checkout">
                  本单暂无可用支付方式。请稍后重试或联系支持，不自动发起支付。
                </div>
                <label
                  v-for="method in visibleMethods"
                  :key="method.key"
                  class="checkout-method"
                  :class="{ selected: selectedMethod === method.key }"
                >
                  <input
                    v-model="selectedMethod"
                    type="radio"
                    name="checkout-method"
                    :value="method.key"
                  />
                  <span class="checkout-method-name"
                    >{{ method.name
                    }}<small>{{
                      method.key === 'paypal' && featureHit('paypal_quick')
                        ? '已授权钱包 · 快捷支付'
                        : method.key === 'card' && featureHit('card_reuse')
                          ? 'Visa ···· 4242（虚构样本）或使用新卡'
                          : method.key === 'card'
                            ? '输入新卡 · 由支付机构组件收集'
                            : method.key === 'paypal'
                              ? '标准 PayPal 授权流程'
                              : '继续后由机构校验'
                    }}</small></span
                  >
                  <span class="payment-mark small-mark" :class="method.color">{{
                    method.mark
                  }}</span>
                </label>
                <div
                  v-if="selectedMethod === 'card' && featureHit('card_reuse')"
                  class="card-entry-options"
                >
                  <label
                    ><input
                      v-model="cardEntryMode"
                      type="radio"
                      name="card-entry"
                      value="saved"
                    />已保存卡 ···· 4242</label
                  >
                  <label
                    ><input
                      v-model="cardEntryMode"
                      type="radio"
                      name="card-entry"
                      value="new"
                    />使用新卡</label
                  >
                </div>
                <div
                  v-if="selectedMethod === 'card' && newCardSelected"
                  class="new-card-note"
                >
                  生产由支付机构安全组件收集新卡信息。本 Demo 不采集卡号。
                </div>
                <div
                  v-if="
                    selectedMethod === 'card' &&
                    newCardSelected &&
                    featureHit('card_save')
                  "
                  class="save-consent"
                >
                  <label class="checkbox-line"
                    ><input
                      v-model="saveConsent"
                      type="checkbox"
                    />保存本次新卡，方便下次付款</label
                  ><small
                    >仅在你主动同意后保存。记住卡不代表允许自动扣款。</small
                  >
                </div>
                <div v-if="profile.challenge" class="challenge-notice">
                  支付机构要求额外验证。开关和灰度不能跳过验证。
                </div>
                <p v-if="decision.paymentNotice" class="error-box">
                  {{ decision.paymentNotice }}
                </p>
                <button
                  class="checkout-pay"
                  :disabled="!decision.canPay || !selectedMethod"
                  @click="simulatePayment"
                >
                  模拟确认 · {{ money(profile.amount) }}
                </button>
                <p class="checkout-disclaimer">
                  不会采集卡号、创建 token 或发起扣款
                </p>
                <div
                  v-if="paymentFeedback"
                  class="payment-feedback"
                  role="status"
                >
                  {{ paymentFeedback }}
                </div>
              </div>
            </section>
          </div>
          <section class="decision-detail">
            <div class="section-heading">
              <div>
                <h3>可解释的命中结果</h3>
                <p>
                  每个开关独立分桶；白名单只绕过比例，不绕过关闭、目标条件或支付资格。
                </p>
              </div>
              <span class="subtle-tag">10,000 个桶 · FNV-1a</span>
            </div>
            <div class="rules-table-wrap">
              <table class="trace-table">
                <thead>
                  <tr>
                    <th>决策对象</th>
                    <th>结果</th>
                    <th>分桶 / 阈值</th>
                    <th>决策原因</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in [...decision.methods, ...decision.features]"
                    :key="item.key"
                  >
                    <td>{{ item.name }}</td>
                    <td>
                      <span class="result-dot" :class="{ hit: item.hit }"></span
                      >{{ item.hit ? '开放' : '不开放' }}
                    </td>
                    <td class="mono">
                      {{ item.bucket }} /
                      {{ item.mode === 'gradual' ? item.threshold : '—' }}
                    </td>
                    <td>
                      {{ item.reason
                      }}<small class="reason-code">{{ item.code }}</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <details class="seed-detail">
              <summary>分桶与安全说明</summary>
              <p>
                种子：environment + gameId + sceneId + flagKey + 带类型的用户 /
                会话
                ID；不包含版本、比例、国家或金额。百分比对目标条件内的人群生效，不代表真实曝光占比。游客登录后更换身份，下个收银台会话重新决策。
              </p>
              <p>
                此处实时试算便于演示。生产应冻结本单展示快照；支付提交时服务端再查资格与紧急开关，禁用后不自动改选。名单不用于认证或授权。
              </p>
            </details>
          </section>
        </section>

        <section v-else class="history-section">
          <div class="section-heading">
            <div>
              <h2>发布与操作记录</h2>
              <p>
                每次发布生成不可变配置快照；回滚生成新版本，应急覆盖独立保留。仅本页内存记录，非持久化审计。
              </p>
            </div>
          </div>
          <h3>配置版本</h3>
          <div class="rules-table-wrap">
            <table class="trace-table">
              <thead>
                <tr>
                  <th>版本</th>
                  <th>发布说明</th>
                  <th>发布人 / 时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="version in workspace.versions"
                  :key="version.revision"
                >
                  <td>
                    <strong>v{{ version.revision }}</strong
                    ><span
                      v-if="version.revision === workspace.revision"
                      class="current-label"
                      >当前生效</span
                    >
                  </td>
                  <td>{{ version.reason }}</td>
                  <td>
                    {{ version.actor
                    }}<small class="reason-code">{{
                      formatDate(version.at)
                    }}</small>
                  </td>
                  <td>
                    <button
                      class="text-link"
                      :disabled="
                        role !== 'reviewer' ||
                        version.revision === workspace.revision
                      "
                      @click="openAction('rollback', version.revision)"
                    >
                      回滚到此版本
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="audit-heading">
            操作流水 <span>包括审核、停用和恢复</span>
          </h3>
          <div v-if="!workspace.events.length" class="empty-history">
            <Icon name="list" :size="28" />
            <h4>还没有操作记录</h4>
            <p>试试修改一个开关、提交审核，再切换审批身份发布。</p>
            <button class="btn btn-secondary" @click="closeAuxiliary">
              返回配置
            </button>
          </div>
          <ol v-else class="audit-list">
            <li v-for="event in workspace.events" :key="event.id">
              <span class="audit-dot"></span>
              <div>
                <strong>{{ eventNames[event.type] }}</strong
                ><span>{{ event.actor }} · {{ formatDate(event.at) }}</span>
                <p>{{ event.reason }}</p>
                <small>{{ event.message }}</small>
                <details v-if="event.changes.length">
                  <summary>查看 {{ event.changes.length }} 项变更</summary>
                  <p v-for="change in event.changes" :key="change.key">
                    {{ change.name }}：{{ change.before }} → {{ change.after }}
                  </p>
                </details>
              </div>
            </li>
          </ol>
        </section>
      </div>
      <footer class="dialog-actions">
        <button class="btn btn-secondary" @click="closeAuxiliary">
          返回配置
        </button>
      </footer>
    </dialog>

    <footer class="research-footer">
      <details>
        <summary>设计依据与演示边界</summary>
        <p>
          参考官方公开文档，不是 Stripe / Adyen
          的后台复刻。稳定分桶、独立审批、应急覆盖和发布节奏为本产品设计建议，不冒称机构内建能力。
        </p>
        <div class="source-links">
          <a
            href="https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods"
            target="_blank"
            rel="noopener noreferrer"
            >Stripe · 动态支付方式</a
          ><a
            href="https://docs.antom.com/ac/merchant_service/enable_payment"
            target="_blank"
            rel="noopener noreferrer"
            >Antom · 开通与状态</a
          ><a
            href="https://docs.antom.com/ac/cashierpay/element?platform=web-wap"
            target="_blank"
            rel="noopener noreferrer"
            >Antom · Payment Element</a
          ><a
            href="https://docs.stripe.com/payments/save-and-reuse?payment-ui=elements"
            target="_blank"
            rel="noopener noreferrer"
            >Stripe · 保存支付方式</a
          ><a
            href="https://docs.adyen.com/online-payments/tokenization"
            target="_blank"
            rel="noopener noreferrer"
            >Adyen · Tokenization</a
          ><a
            href="https://docs.adyen.com/payment-methods/add-payment-methods"
            target="_blank"
            rel="noopener noreferrer"
            >Adyen · 方式管理</a
          ><a
            href="https://developer.paypal.com/platforms/checkout/standard/best-practices/"
            target="_blank"
            rel="noopener noreferrer"
            >PayPal · 最新最佳实践</a
          >
        </div>
        <p>
          调研日期：2026-10-29。无真实审批、机构接口、持久化、埋点、定时发布、自动扩量或离线扣款。卡片末四位仅虚构样本。完整
          PRD：docs/cashier-payment-rollout-prd.md。
        </p>
      </details>
    </footer>

    <dialog
      ref="ruleDialog"
      class="rollout-dialog rule-dialog"
      aria-labelledby="rule-dialog-title"
      @cancel.prevent="closeRule"
    >
      <template v-if="editingItem"
        ><header class="dialog-heading">
          <div>
            <h2 id="rule-dialog-title">{{ editingItem.name }} · 开放规则</h2>
            <p>{{ editingItem.note }}</p>
          </div>
          <button
            class="icon-button"
            aria-label="关闭规则配置"
            @click="closeRule"
          >
            <Icon name="close" :size="19" />
          </button>
        </header>
        <div class="dialog-content">
          <div
            class="readiness-note"
            :class="{ blocked: !readinessFor(editingItem.key).ready }"
          >
            <strong
              >机构准入 ·
              {{
                readinessLabels[readinessFor(editingItem.key).state]
              }}（样本）</strong
            >
            <p>
              {{
                readinessFor(editingItem.key).reason
              }}。可先规划草稿；未就绪时不能新增或扩大开放。
            </p>
          </div>
          <fieldset :disabled="!canEdit || editingItem.baseline">
            <legend>开放模式</legend>
            <div class="mode-options">
              <label
                v-for="(label, mode) in rolloutModes"
                :key="mode"
                :class="{ selected: editingRule.mode === mode }"
                ><input
                  v-model="editingRule.mode"
                  type="radio"
                  name="rule-mode"
                  :value="mode"
                />{{
                  mode === 'gradual' ? '灰度' : mode === 'all' ? '全量' : label
                }}</label
              >
            </div>
            <button
              type="button"
              class="text-link pilot-shortcut"
              @click="setPilot"
            >
              仅指定用户验证<Icon name="arrowRight" :size="12" />
            </button>
            <div
              v-if="editingRule.mode === 'gradual'"
              class="percentage-editor"
            >
              <label for="rollout-percentage"
                >灰度流量 <small>目标条件内的用户</small></label
              >
              <div>
                <input
                  id="rollout-percentage"
                  v-model="editingRule.percentage"
                  class="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                /><span>%</span>
              </div>
              <div class="preset-percentages">
                <button
                  v-for="value in [1, 5, 25, 50]"
                  :key="value"
                  type="button"
                  :class="{ active: Number(editingRule.percentage) === value }"
                  @click="editingRule.percentage = value"
                >
                  {{ value }}%
                </button>
              </div>
              <p class="field-help">
                修改比例不更换分桶种子。扩量保留原命中用户，缩量会移除超出新阈值的用户。
              </p>
              <p v-if="Number(editingRule.percentage) === 0" class="field-help">
                0%
                不开放随机流量，仅允许白名单中的合资格登录用户；未填名单则无人开放。已有国家、用户
                platform 和黑名单条件继续有效。
              </p>
            </div>
            <details
              :key="editingItem.key"
              ref="advancedRules"
              class="advanced-rule"
            >
              <summary>
                高级设置
                <small>{{
                  hasTargeting(editingRule)
                    ? '已设置人群条件'
                    : '国家、用户 platform、黑白名单（可选）'
                }}</small>
              </summary>
              <h3>目标条件</h3>
              <p class="field-help">
                国家与用户 platform 之间取交集；同一条件内取并集。不选代表全部。
                platform 沿用海外场景枚举，不按当前浏览器或设备识别。
              </p>
              <div class="condition-field">
                <span>国家 / 地区</span
                ><label
                  v-for="country in [
                    ['US', '美国'],
                    ['DE', '德国'],
                    ['GB', '英国'],
                  ]"
                  :key="country[0]"
                  ><input
                    v-model="editingRule.countries"
                    type="checkbox"
                    :value="country[0]"
                  />{{ country[1] }}</label
                >
              </div>
              <div class="condition-field">
                <span>用户 platform</span
                ><label v-for="platform in rolloutPlatforms" :key="platform"
                  ><input
                    v-model="editingRule.platforms"
                    type="checkbox"
                    :value="platform"
                  />{{ platform }}</label
                >
              </div>
              <label for="rollout-allow" class="form-label"
                >白名单 <small>仅绕过百分比</small></label
              ><textarea
                id="rollout-allow"
                ref="allowInput"
                v-model="editingRule.allow"
                rows="3"
                placeholder="输入演示用户 ID，以逗号或换行分隔"
              /><label for="rollout-deny" class="form-label"
                >黑名单 <small>优先于白名单</small></label
              ><textarea
                id="rollout-deny"
                v-model="editingRule.deny"
                rows="3"
                placeholder="不向这些用户开放，最多 100 个 ID"
              />
            </details>
          </fieldset>
          <p class="priority-note">
            开放范围不能绕过用户授权、机构资格与风控；紧急停用始终优先。
          </p>
          <div v-if="ruleErrors.length" class="error-box" role="alert">
            <p v-for="error in ruleErrors" :key="error">{{ error }}</p>
          </div>
        </div>
        <footer class="dialog-actions">
          <span>保存为草稿，不立即生效</span
          ><button class="btn btn-secondary" @click="closeRule">取消</button
          ><button
            v-if="canEdit && !editingItem.baseline"
            class="btn btn-primary"
            :disabled="ruleErrors.length > 0"
            @click="saveRule"
          >
            保存规则草稿
          </button>
        </footer></template
      >
    </dialog>

    <dialog
      ref="actionDialog"
      class="rollout-dialog action-dialog"
      aria-labelledby="action-title"
      @cancel.prevent="closeAction"
    >
      <header class="dialog-heading">
        <div>
          <h2 id="action-title">{{ actionTitles[actionType] }}</h2>
          <p>{{ actionDescription }}</p>
        </div>
        <button
          class="icon-button"
          aria-label="关闭发布操作"
          @click="closeAction"
        >
          <Icon name="close" :size="19" />
        </button>
      </header>
      <div class="dialog-content">
        <div
          v-if="['submit', 'approve', 'rollback'].includes(actionType)"
          class="readiness-note"
          :class="{ blocked: actionReadinessErrors.length }"
        >
          <strong
            >发布前检查 ·
            {{
              actionReadinessErrors.length ? '机构准入未通过' : '可继续审核'
            }}</strong
          >
          <p v-for="error in actionReadinessErrors" :key="error">{{ error }}</p>
          <p v-if="!actionReadinessErrors.length">
            新增 / 扩大开放的机构准入已通过，或本次仅关闭 /
            收窄；审批时再次检查最新状态。
          </p>
          <p>
            基础银行卡规则保留；用户授权、token、本单资格仍需在支付时校验。配置发布不会开通机构。
          </p>
        </div>
        <div
          v-if="['submit', 'approve', 'rollback'].includes(actionType)"
          class="change-review"
        >
          <div v-for="change in actionChanges" :key="change.key">
            <strong>{{ change.name }}</strong
            ><span
              >{{ change.before }}<Icon name="arrowRight" :size="12" />{{
                change.after
              }}</span
            >
          </div>
        </div>
        <div
          v-if="['kill', 'resume'].includes(actionType)"
          class="emergency-targets"
        >
          <p
            v-for="key in actionType === 'resume'
              ? killedKeys
              : nonBaselineKeys"
            :key="key"
          >
            {{ catalog.find((item) => item.key === key).name }}
          </p>
          <strong>不终止已发起的支付，不删除 token，不解除用户授权。</strong>
        </div>
        <p v-if="actionType === 'submit'" class="inline-info">
          以不可变快照提交。提交后切换「审批 ·
          陈安」才能发布；编辑员不能自审。该流程仅在本地模拟。
        </p>
        <p v-if="actionType === 'rollback'" class="inline-info">
          将历史规则复制为新版本；所有紧急停用继续有效，待审核版本作废。
        </p>
        <label for="rollout-action-reason" class="form-label"
          >操作原因 <small>必填，至少 5 个字</small></label
        ><textarea
          id="rollout-action-reason"
          v-model="actionReason"
          rows="3"
          placeholder="说明本次变更的业务目的、风险或恢复依据"
        />
        <p v-if="actionError" class="error-box" role="alert">
          {{ actionError }}
        </p>
      </div>
      <footer class="dialog-actions">
        <span>仅影响本页 Demo</span
        ><button class="btn btn-secondary" @click="closeAction">取消</button
        ><button
          class="btn"
          :class="actionType === 'kill' ? 'danger-button' : 'btn-primary'"
          :disabled="
            actionReason.trim().length < 5 || actionReadinessErrors.length > 0
          "
          @click="confirmAction"
        >
          {{ actionTitles[actionType] }}
        </button>
      </footer>
    </dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import {
  cloneRollout,
  createRolloutProfile,
  createRolloutWorkspace,
  evaluateRollout,
  isRolloutPercentage,
  parseRolloutIds,
  readinessLabels,
  rolloutReadiness,
  rolloutReadinessErrors,
  rolloutBucket,
  rolloutCatalog,
  rolloutChanges,
  rolloutModes,
  rolloutPlatforms,
  transitionRollout,
  validateRolloutConfig,
} from '@/utils/paymentRollout.js'

const catalog = rolloutCatalog
const workspace = ref(createRolloutWorkspace())
const capabilityTarget = ref('klarna')
const advancedRules = ref(null),
  allowInput = ref(null)
const draft = ref(cloneRollout(workspace.value.current))
const role = ref('editor'),
  tab = ref('features'),
  notice = ref(''),
  previewSource = ref('live')
const profile = ref(createRolloutProfile()),
  selectedMethod = ref(''),
  saveConsent = ref(false),
  paymentFeedback = ref('')
const cardEntryMode = ref('saved')
const ruleDialog = ref(null),
  actionDialog = ref(null),
  editingItem = ref(null),
  editingRule = ref(null)
const auxiliaryDialog = ref(null)
const auxiliaryView = ref('test')
const reuseItem = catalog.find((item) => item.key === 'card_reuse')
const actionType = ref('submit'),
  actionReason = ref(''),
  actionError = ref(''),
  rollbackTarget = ref(null)
const tabs = [
  { id: 'features', name: '功能开关' },
  { id: 'methods', name: '支付方式灰度' },
]
const samples = [
  { id: 'hit', name: '灰度命中用户' },
  { id: 'guest', name: '游客结账' },
  { id: 'ios', name: 'iOS 钱包' },
  { id: 'de', name: '德国分期' },
  { id: 'revoked', name: '授权已撤销' },
]
const eventNames = {
  submit: '提交审核',
  approve: '审核发布',
  reject: '驳回审核',
  withdraw: '撤回审核',
  rollback: '配置回滚',
  kill: '紧急停用',
  resume: '显式恢复',
}
const actionTitles = {
  submit: '提交发布审核',
  approve: '审核通过并发布',
  reject: '驳回配置',
  withdraw: '撤回审核',
  rollback: '确认回滚',
  kill: '紧急停止非基础能力',
  resume: '显式恢复已停用能力',
}
const canEdit = computed(
  () => role.value === 'editor' && !workspace.value.pending,
)
const changes = computed(() =>
  rolloutChanges(workspace.value.current, draft.value),
)
const currentCatalog = computed(() =>
  catalog.filter(
    (item) =>
      item.kind === 'feature' &&
      item.key !== 'card_reuse',
  ),
)
const killedKeys = computed(() =>
  catalog
    .filter((item) => workspace.value.kills[item.key])
    .map((item) => item.key),
)
const nonBaselineKeys = catalog
  .filter((item) => !item.baseline)
  .map((item) => item.key)
const previewConfig = computed(() =>
  previewSource.value === 'draft' ? draft.value : workspace.value.current,
)
const decision = computed(() =>
  evaluateRollout(
    previewConfig.value,
    profile.value,
    workspace.value.kills,
    workspace.value.capabilities,
  ),
)
const visibleMethods = computed(() =>
  decision.value.methods.filter((item) => item.hit),
)
const newCardSelected = computed(
  () => !featureHit('card_reuse') || cardEntryMode.value === 'new',
)
const ruleErrors = computed(() => {
  if (!editingItem.value || !editingRule.value) return []
  const candidate = cloneRollout(draft.value)
  candidate.rules[editingItem.value.key] = editingRule.value
  return validateRolloutConfig(candidate)
})
const actionChanges = computed(() => {
  if (actionType.value === 'approve')
    return workspace.value.pending
      ? rolloutChanges(workspace.value.current, workspace.value.pending.config)
      : []
  if (actionType.value === 'rollback') {
    const version = workspace.value.versions.find(
      (item) => item.revision === rollbackTarget.value,
    )
    return version
      ? rolloutChanges(workspace.value.current, version.config)
      : []
  }
  return changes.value
})
const actionDescription = computed(
  () =>
    ({
      submit: `基于生效版本 v${workspace.value.revision}，${changes.value.length} 项变更需要审核。`,
      approve: '发布审核快照，不读取审核期间的新草稿；所有应急覆盖继续有效。',
      reject: '已发布配置不变；运营可修改草稿后重新提交。',
      withdraw: '撤回待审核快照，不改变已发布配置。',
      rollback: `回滚至 v${rollbackTarget.value} 的配置内容，生成新的递增版本。`,
      kill: '立即停止全部非基础能力，优先于白名单与已发布配置。',
      resume: '显式解除应急覆盖，恢复后仍按当前已发布规则判断。',
    })[actionType.value],
)
const actionReadinessErrors = computed(() => {
  let candidate = null
  if (actionType.value === 'submit') candidate = draft.value
  if (actionType.value === 'approve')
    candidate = workspace.value.pending?.config
  if (actionType.value === 'rollback')
    candidate = workspace.value.versions.find(
      (item) => item.revision === rollbackTarget.value,
    )?.config
  return candidate
    ? rolloutReadinessErrors(
        workspace.value.current,
        candidate,
        workspace.value.capabilities,
      )
    : []
})
function readinessFor(key) {
  return rolloutReadiness(workspace.value.capabilities, key)
}

watch(
  () => editingRule.value?.mode,
  (mode) => {
    // An invalid, now-hidden input must not block turning a feature off or fully on.
    // Preserve valid in-progress values; otherwise restore the last saved percentage.
    if (
      mode &&
      mode !== 'gradual' &&
      !isRolloutPercentage(editingRule.value.percentage)
    ) {
      editingRule.value.percentage =
        draft.value.rules[editingItem.value.key].percentage
    }
  },
)

watch(
  [
    profile,
    previewConfig,
    () => workspace.value.kills,
    () => workspace.value.capabilities,
  ],
  () => {
    paymentFeedback.value = ''
    saveConsent.value = false
    // Never automatically switch a customer's payment choice after eligibility changes.
    if (!visibleMethods.value.some((item) => item.key === selectedMethod.value))
      selectedMethod.value = ''
  },
  { deep: true },
)
watch(selectedMethod, () => {
  paymentFeedback.value = ''
  saveConsent.value = false
})
watch(cardEntryMode, () => {
  paymentFeedback.value = ''
  saveConsent.value = false
})
watch(
  () => featureHit('card_reuse'),
  (available, previous) => {
    if (
      previous &&
      !available &&
      selectedMethod.value === 'card' &&
      cardEntryMode.value === 'saved'
    ) {
      selectedMethod.value = ''
    }
  },
)
watch(
  () =>
    profile.value.loggedIn
      ? `user:${profile.value.customerId}`
      : `session:${profile.value.sessionId}`,
  () => {
    selectedMethod.value = ''
    cardEntryMode.value = 'saved'
  },
)
watch(role, () => {
  closeMenus()
  if (ruleDialog.value?.open) closeRule()
  if (actionDialog.value?.open) closeAction()
})

function showTest(source) {
  previewSource.value = source
  auxiliaryView.value = 'test'
  closeMenus()
  auxiliaryDialog.value.showModal()
}
function showHistory() {
  auxiliaryView.value = 'history'
  closeMenus()
  auxiliaryDialog.value.showModal()
}
function closeAuxiliary() {
  auxiliaryDialog.value.close()
}
function onUtilityToggle(event) {
  if (event.target.open) closeMenus(event.target)
}
function closeMenus(except = null) {
  document
    .querySelectorAll('.rollout-workspace .utility-menu[open]')
    .forEach((menu) => {
      if (menu !== except) menu.open = false
    })
}
function hasTargeting(rule) {
  return !!(
    rule.countries.length ||
    rule.platforms.length ||
    rule.allow.trim() ||
    rule.deny.trim()
  )
}
function itemChanged(key) {
  return (
    JSON.stringify(workspace.value.current.rules[key]) !==
    JSON.stringify(draft.value.rules[key])
  )
}
function conditions(rule) {
  return [
    rule.countries.length ? rule.countries.join(' / ') : '全部国家',
    rule.platforms.length
      ? `用户 platform：${rule.platforms.join(' / ')}`
      : '全部用户 platform',
    rule.allow.trim() ? '含白名单' : '',
    rule.deny.trim() ? '含黑名单' : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
function ruleSummary(rule) {
  if (rule.mode === 'gradual' && Number(rule.percentage) === 0)
    return parseRolloutIds(rule.allow).length
      ? `仅指定用户 · 白名单 ${parseRolloutIds(rule.allow).length} 人`
      : '0% · 暂不开放'
  return rule.mode === 'gradual'
    ? `${rule.percentage}% 灰度`
    : rolloutModes[rule.mode]
}
async function setPilot() {
  editingRule.value.mode = 'gradual'
  editingRule.value.percentage = 0
  await nextTick()
  advancedRules.value.open = true
  allowInput.value.focus()
}
function openRule(item) {
  editingItem.value = item
  editingRule.value = cloneRollout(draft.value.rules[item.key])
  ruleDialog.value.showModal()
}
function closeRule() {
  ruleDialog.value.close()
  editingItem.value = null
  editingRule.value = null
}
function saveRule() {
  if (!canEdit.value || editingItem.value.baseline || ruleErrors.value.length)
    return
  draft.value.rules[editingItem.value.key] = cloneRollout(editingRule.value)
  notice.value = '已保存规则草稿；当前生效配置未改变。'
  closeRule()
}
function discardDraft() {
  draft.value = cloneRollout(workspace.value.current)
  notice.value = '已放弃全部草稿更改。'
}
function openAction(type, target = null) {
  closeMenus()
  actionType.value = type
  rollbackTarget.value = target
  actionReason.value = ''
  actionError.value = ''
  actionDialog.value.showModal()
}
function closeAction() {
  actionDialog.value.close()
  actionError.value = ''
}
function confirmAction() {
  const result = transitionRollout(workspace.value, {
    type: actionType.value,
    role: role.value,
    reason: actionReason.value,
    config: draft.value,
    baseRevision: workspace.value.revision,
    targetRevision: rollbackTarget.value,
    keys: ['kill', 'resume'].includes(actionType.value)
      ? actionType.value === 'resume'
        ? killedKeys.value
        : nonBaselineKeys
      : undefined,
  })
  if (!result.ok) {
    actionError.value = result.error
    return
  }
  workspace.value = result.state
  if (['approve', 'rollback'].includes(actionType.value))
    draft.value = cloneRollout(result.state.current)
  notice.value = result.message
  closeAction()
}
function featureHit(key) {
  return decision.value.features.some((item) => item.key === key && item.hit)
}
function money(value) {
  const amount = Number(value)
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: profile.value.currency,
      }).format(amount)
    : '金额无效'
}
function formatDate(value) {
  return value === '演示初始版本'
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(value))
}
function loadSample(id) {
  const next = createRolloutProfile()
  if (id === 'guest') next.loggedIn = false
  if (id === 'revoked') {
    next.paypalConsent = false
    next.cardConsent = false
  }
  if (id === 'de') {
    next.country = 'DE'
    next.currency = 'EUR'
    next.amount = '99.00'
  }
  if (['hit', 'ios'].includes(id)) {
    for (let index = 1; index < 50000; index++) {
      const identity = `user:demo_${index}`
      const keys = id === 'ios' ? ['apple_pay'] : ['paypal_quick', 'card_save']
      if (
        keys.every(
          (key) =>
            rolloutBucket(previewConfig.value.scope, key, identity) <
            Math.max(
              1,
              Math.round(
                Number(previewConfig.value.rules[key].percentage) * 100,
              ),
            ),
        )
      ) {
        next.customerId = `demo_${index}`
        break
      }
    }
    if (id === 'ios') next.device = 'ios'
  }
  profile.value = next
  selectedMethod.value = ''
  paymentFeedback.value = ''
  notice.value =
    id === 'de'
      ? '德国分期样例已载入；Klarna 默认关闭且开通处理中。可先保存草稿，再在演示工具中模拟机构就绪。'
      : '已载入样本。是否开放仍由当前预览版本及安全条件决定。'
}
function simulatePayment() {
  const fresh = evaluateRollout(
    previewConfig.value,
    profile.value,
    workspace.value.kills,
    workspace.value.capabilities,
  )
  if (
    !fresh.canPay ||
    !fresh.methods.some((item) => item.key === selectedMethod.value && item.hit)
  ) {
    selectedMethod.value = ''
    paymentFeedback.value = '资格已变化，请重新选择；未发起扣款。'
    return
  }
  if (fresh.requiresChallenge) {
    paymentFeedback.value =
      '模拟结果：需要支付机构额外验证。未模拟验证通过，也未发起扣款。'
    return
  }
  const flow =
    selectedMethod.value === 'paypal'
      ? featureHit('paypal_quick')
        ? '使用有效授权钱包'
        : '进入标准 PayPal 授权流程'
      : selectedMethod.value === 'card'
        ? newCardSelected.value
          ? '使用机构的新卡组件'
          : '使用历史卡 token'
        : '进入支付机构流程'
  const saving =
    selectedMethod.value === 'card' &&
    newCardSelected.value &&
    featureHit('card_save')
      ? saveConsent.value
        ? '；收到本次保存新卡的主动同意，生产仅在新卡组件成功确认后保存'
        : '；未同意保存，不新建卡 token'
      : ''
  paymentFeedback.value = `模拟结果：${flow}${saving}。未创建订单、未创建 token、未发起扣款。`
}
</script>

<style scoped>
.template-method-entry { padding: 28px; margin-top: 20px; }
.template-method-entry p { color: #667085; line-height: 1.8; max-width: 850px; margin: 14px 0; }
.template-method-entry .btn { display: inline-flex; margin: 8px 0; }
.template-method-note { font-size: 12px; }
.readiness-badge {
  display: inline-block;
  margin-top: 6px;
  margin-right: 8px;
  color: #64746d;
  font-size: 11px;
}
.readiness-badge.blocked {
  color: #a36114;
}
.readiness-note {
  padding: 12px 14px;
  margin-bottom: 18px;
  border: 1px solid #dce9e3;
  border-radius: 8px;
  background: #f6faf8;
  color: #3c6352;
  line-height: 1.6;
}
.readiness-note p {
  margin: 5px 0 0;
  font-size: 12px;
}
.readiness-note.blocked {
  border-color: #f0d7b1;
  background: #fffaf1;
  color: #91591b;
}
.pilot-shortcut {
  margin: 12px 0;
}
.capability-tools {
  border-top: 1px solid #eee;
  padding-top: 10px;
  margin-top: 6px;
}
.capability-tools > summary {
  cursor: pointer;
  font-size: 12px;
}
.capability-tools label {
  display: block;
  margin-top: 10px;
  font-size: 12px;
}
.capability-tools select {
  display: block;
  width: 100%;
  margin-top: 5px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background: white;
}
.rollout-workspace {
  color: #262626;
  font-size: 13px;
}
.card-entry-options {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin: 15px 0;
  padding: 0 3px;
}
.card-entry-options label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #687588;
  cursor: pointer;
}
.card-entry-options input {
  accent-color: #1677ff;
}
.new-card-note {
  padding: 10px 12px;
  font-size: 10px;
  color: #8c8c8c;
  background: #fafafa;
  border: 1px dashed #e4e7ec;
  border-radius: 4px;
  line-height: 1.8;
  margin-top: 12px;
}
.breadcrumb {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #8c8c8c;
  font-size: 12px;
  margin-bottom: 20px;
}
.breadcrumb span {
  color: #c4c4c4;
}
.rollout-heading,
.heading-actions,
.scope-bar,
.scope-bar > div,
.role-label,
.rollout-tabs,
.version-indicator,
.section-heading,
.aside-title,
.switch-cell,
.rule-identity,
.dialog-heading,
.dialog-actions {
  display: flex;
  align-items: center;
}
.rollout-heading {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
h1 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 23px;
  line-height: 1.5;
  margin: 0 0 6px;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.rollout-heading p,
.section-heading p {
  color: #8c8c8c;
  margin: 4px 0 0;
  line-height: 1.7;
  font-size: 13px;
}
.demo-label {
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  color: #757575;
  border-radius: 4px;
  font-size: 11px;
  padding: 1px 6px;
  font-weight: 400;
  letter-spacing: 0;
}
.heading-actions {
  gap: 8px;
}
.scope-bar {
  background: #fafafa;
  border: 1px solid #efefef;
  border-radius: 6px;
  padding: 13px 16px;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.scope-bar > div {
  gap: 12px;
  flex-wrap: wrap;
}
.scope-label {
  color: #8c8c8c;
  margin-right: 4px;
}
.scope-divider {
  color: #c8c8c8;
}
.environment-dot,
.live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #52a77b;
  border-radius: 50%;
  flex-shrink: 0;
}
.role-label {
  gap: 9px;
  font-size: 12px;
  color: #8c8c8c;
}
.role-label select {
  border: none;
  background: transparent;
  font-size: 12px;
  color: #595959;
  cursor: pointer;
  padding: 3px;
}
.scope-notice {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  color: #8c8c8c;
  margin: 10px 0 23px;
  line-height: 1.6;
}
.scope-notice svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.rollout-tabs {
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 24px;
  gap: 26px;
  flex-wrap: wrap;
}
.rollout-tabs > button {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0 0 15px;
  font-size: 14px;
  color: #595959;
  cursor: pointer;
}
.rollout-tabs > button.active {
  color: #1677ff;
  font-weight: 500;
}
.rollout-tabs > button.active:after {
  position: absolute;
  content: '';
  height: 2px;
  background: #1677ff;
  bottom: -1px;
  left: 0;
  right: 0;
}
.rollout-tabs button > span {
  margin-left: 6px;
  background: #f4f4f4;
  color: #8c8c8c;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}
.version-indicator {
  margin-left: auto;
  gap: 7px;
  font-size: 12px;
  color: #8c8c8c;
  padding-bottom: 14px;
}
.draft-tag {
  color: #b77914;
  background: #fff7e6;
  margin-left: 5px;
  padding: 1px 6px;
  border-radius: 3px;
}
.configuration-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.rules-panel {
  min-width: 0;
}
.section-heading {
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}
h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  line-height: 1.5;
}
h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}
h4 {
  font-size: 13px;
  margin: 22px 0 12px;
}
.subtle-tag {
  font-size: 11px;
  white-space: nowrap;
  color: #8c8c8c;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 2px 7px;
}
.rules-table-wrap {
  overflow-x: auto;
}
.rules-table,
.trace-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  table-layout: auto;
  font-size: 12px;
}
.rules-table th,
.trace-table th {
  background: #fafafa;
  padding: 12px 14px;
  color: #8c8c8c;
  font-weight: 400;
  white-space: nowrap;
  border-bottom: 1px solid #e8e8e8;
}
.rules-table td {
  padding: 22px 14px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.rules-table th:first-child {
  width: 48%;
}
.rules-table th:nth-child(2) {
  width: 32%;
}
.rules-table th:last-child {
  width: 20%;
}
.changed-row {
  background: #fcfdff;
}
.rule-identity {
  gap: 12px;
  align-items: flex-start;
}
.payment-mark {
  width: 36px;
  height: 36px;
  border: 1px solid #e8ebf0;
  background: #f7f9fc;
  color: #53678a;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  font-weight: 650;
  flex-shrink: 0;
  font-style: normal;
}
.payment-mark.paypal {
  color: #073b80;
  background: #f3f7ff;
  font-style: italic;
}
.payment-mark.apple {
  background: #fafafa;
  color: #252525;
}
.payment-mark.klarna {
  background: #fff0f4;
  color: #282128;
}
.rule-identity p {
  color: #8c8c8c;
  margin: 5px 0 0;
  font-size: 11px;
  line-height: 1.7;
  max-width: 260px;
}
.name-button {
  border: none;
  padding: 0;
  background: none;
  color: #262626;
  font-weight: 500;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.name-button:hover {
  color: #1677ff;
}
.baseline-tag,
.current-label {
  font-size: 10px;
  margin-left: 7px;
  background: #f5f5f5;
  padding: 1px 5px;
  color: #8c8c8c;
  border-radius: 3px;
}
.current-label {
  color: #389267;
  background: #f0faf5;
}
.changed-label {
  display: inline-block;
  color: #1677ff;
  font-size: 10px;
  margin-top: 5px;
}
.switch-cell {
  gap: 8px;
  white-space: nowrap;
}
.rollout-switch {
  width: 29px;
  height: 17px;
  border-radius: 10px;
  border: 0;
  background: #bfbfbf;
  padding: 2px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.rollout-switch span {
  display: block;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 2px #0002;
  transition: transform 0.2s;
}
.rollout-switch.on {
  background: #1677ff;
}
.rollout-switch.on span {
  transform: translateX(12px);
}
.rollout-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mode-text {
  font-size: 12px;
  color: #8c8c8c;
}
.mode-text.gradual {
  color: #1677ff;
}
.mode-text.all {
  color: #389267;
}
.stop-label {
  display: block;
  color: #cf4545;
  font-size: 10px;
  margin-top: 7px;
}
.percentage {
  font-weight: 600;
  font-size: 18px;
  line-height: 1.3;
}
.percentage small {
  font-size: 11px;
  margin-left: 2px;
  font-weight: 400;
}
.traffic-track {
  width: 104px;
  max-width: 100%;
  background: #edf0f5;
  border-radius: 3px;
  height: 4px;
  margin-top: 7px;
  overflow: hidden;
}
.traffic-track span {
  display: block;
  height: 100%;
  background: #649ff9;
}
.table-hint {
  color: #9a9a9a;
  font-size: 10px;
  margin: 5px 0 0;
  line-height: 1.7;
}
.audience-summary {
  color: #595959;
  font-size: 12px;
}
.text-link {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  color: #1677ff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.text-link:disabled {
  color: #bfbfbf;
  cursor: not-allowed;
}
.rules-footer {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 0;
  color: #9a9a9a;
  font-size: 11px;
  line-height: 1.6;
}
.rules-footer svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.rules-footer button {
  margin-left: auto;
}
.rollout-aside {
  border-left: 1px solid #f0f0f0;
  padding-left: 24px;
}
.aside-section {
  padding: 0 0 24px;
  margin-bottom: 22px;
  border-bottom: 1px solid #f0f0f0;
}
.aside-title {
  gap: 7px;
  margin-bottom: 18px;
}
.aside-title > svg {
  color: #8c8c8c;
}
.aside-title > span {
  margin-left: auto;
  color: #8c8c8c;
  font-size: 11px;
}
.safety-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.safety-list li {
  display: flex;
  gap: 9px;
  margin: 0 0 17px;
}
.safety-list li:last-child {
  margin: 0;
}
.check-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4e9b76;
  background: #f0f8f4;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 10px;
  flex-shrink: 0;
  margin-top: 1px;
}
.safety-list strong {
  font-size: 12px;
  font-weight: 500;
}
.safety-list p,
.aside-note p {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.8;
  margin: 4px 0 0;
}
.preview-summary dl {
  margin: 0 0 15px;
}
.preview-summary dl > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 13px;
  font-size: 12px;
}
.preview-summary dt {
  color: #8c8c8c;
}
.preview-summary dd {
  margin: 0;
  color: #595959;
}
.full-width {
  width: 100%;
  font-size: 12px;
}
.aside-note h3 {
  margin-bottom: 10px;
  font-size: 12px;
}
.aside-note .release-steps {
  color: #595959;
  font-size: 10px;
  line-height: 2;
}
.release-steps span {
  color: #bfbfbf;
  margin: 0 2px;
}
.danger-link {
  color: #cf4545;
  margin-top: 17px;
}
.aside-note > small {
  display: block;
  color: #aaa;
  font-size: 10px;
  margin-top: 5px;
}
.principle-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  padding: 22px 24px;
  background: #fafbfc;
  border: 1px solid #eef0f3;
  border-radius: 6px;
}
.principle-strip > div {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 10px;
  row-gap: 5px;
}
.principle-strip strong {
  color: #9db4d6;
  font-size: 11px;
  grid-row: 1 / 3;
  margin-top: 2px;
}
.principle-strip span {
  font-size: 12px;
  color: #595959;
}
.principle-strip small {
  font-size: 10px;
  color: #9a9a9a;
}
.principle-strip > svg {
  color: #bfc9d6;
  flex-shrink: 0;
}
.notice,
.pending-banner,
.kill-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  margin-bottom: 18px;
  background: #f0f7ff;
  border: 1px solid #d8e9ff;
  border-radius: 6px;
  color: #3067a6;
  font-size: 12px;
  line-height: 1.6;
}
.notice button {
  margin-left: auto;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}
.pending-banner {
  justify-content: space-between;
}
.pending-banner p,
.kill-banner p {
  margin: 3px 0 0;
  font-size: 11px;
}
.pending-banner > div:last-child {
  display: flex;
  gap: 8px;
}
.kill-banner {
  background: #fff4f2;
  border-color: #ffd5cd;
  color: #b74a3d;
}
.kill-banner > button {
  margin-left: auto;
}
.inline-info {
  padding: 11px 13px;
  border-radius: 4px;
  color: #687d9a;
  background: #f5f8fd;
  font-size: 12px;
  margin: 0 0 15px;
  line-height: 1.7;
}
.source-picker {
  display: flex;
  background: #f5f5f5;
  border-radius: 5px;
  padding: 3px;
  flex-shrink: 0;
}
.source-picker button {
  border: 0;
  padding: 6px 12px;
  color: #8c8c8c;
  font-size: 12px;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
}
.source-picker button.active {
  background: white;
  box-shadow: 0 1px 4px #0001;
  color: #1677ff;
}
.sample-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.sample-buttons > span {
  color: #8c8c8c;
  font-size: 12px;
  margin-right: 5px;
}
.test-layout {
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
  border: 1px solid #e8e8e8;
  border-radius: 7px;
  overflow: hidden;
}
.profile-panel {
  padding: 23px;
}
.profile-panel > h3 {
  margin-bottom: 18px;
}
.profile-panel > label:not(.checkbox-line),
.profile-grid label,
.advanced-testing > label:not(.checkbox-line) {
  display: block;
  margin: 12px 0 6px;
  font-size: 12px;
  color: #595959;
}
.profile-panel .input,
.profile-panel .select {
  width: 100%;
  min-width: 0;
}
.field-help {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.7;
  margin-top: 7px;
}
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}
.checkbox-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #595959;
  margin: 10px 0;
  line-height: 1.7;
  cursor: pointer;
}
.checkbox-line input {
  flex-shrink: 0;
  margin-top: 3px;
  accent-color: #1677ff;
}
.advanced-testing {
  padding-top: 16px;
  margin-top: 19px;
  border-top: 1px solid #efefef;
}
.advanced-testing summary,
.seed-detail summary,
.research-footer summary {
  color: #8c8c8c;
  cursor: pointer;
  font-size: 12px;
}
.checkout-area {
  padding: 20px 28px 30px;
  background: #f7f8fa;
  border-left: 1px solid #e8e8e8;
  min-width: 0;
}
.checkout-meta {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9a9a9a;
  gap: 10px;
  margin-bottom: 24px;
}
.checkout-meta .live-dot {
  margin-right: 6px;
}
.checkout-preview {
  max-width: 420px;
  margin: 0 auto;
  padding: 25px 27px 18px;
  background: white;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  box-shadow: 0 4px 14px #29395b05;
}
.checkout-brand {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.4px;
  color: #555f72;
}
.checkout-brand > span:last-child {
  margin-left: auto;
  font-weight: 400;
  font-size: 10px;
  letter-spacing: 0;
  color: #a0a6af;
}
.mini-brand {
  background: #6d7fa2;
  color: white;
  font-size: 12px;
  border-radius: 5px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.order-summary {
  padding: 26px 0 24px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 23px;
}
.order-summary p {
  font-size: 12px;
  color: #8c8c8c;
  margin: 0 0 10px;
}
.order-summary strong {
  display: block;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.7px;
}
.order-summary small {
  display: block;
  color: #aaa;
  font-size: 10px;
  margin-top: 5px;
}
.checkout-preview > h3 {
  font-size: 12px;
  margin-bottom: 12px;
}
.checkout-method {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 13px 12px;
  margin-top: 9px;
  cursor: pointer;
}
.checkout-method.selected {
  border-color: #6f9fe5;
  background: #f7faff;
}
.checkout-method > input {
  accent-color: #1677ff;
}
.checkout-method-name {
  font-size: 12px;
  font-weight: 500;
}
.checkout-method-name small {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: #9a9a9a;
  margin-top: 3px;
  line-height: 1.6;
}
.small-mark {
  width: 29px;
  height: 24px;
  font-size: 14px;
  border-radius: 4px;
  margin-left: auto;
}
.save-consent {
  margin: 17px 0;
  padding: 0 3px;
}
.save-consent .checkbox-line {
  font-size: 11px;
  margin: 0;
}
.save-consent > small {
  font-size: 10px;
  color: #aaa;
  display: block;
  padding-left: 21px;
  margin-top: 4px;
  line-height: 1.6;
}
.checkout-pay {
  display: block;
  width: 100%;
  border: none;
  border-radius: 5px;
  background: #324b78;
  color: white;
  padding: 12px;
  margin-top: 22px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
}
.checkout-pay:disabled {
  cursor: not-allowed;
  background: #bec7d7;
}
.checkout-disclaimer {
  text-align: center;
  font-size: 10px;
  color: #a7a7a7;
  margin: 12px 0 0;
}
.empty-checkout,
.challenge-notice {
  padding: 14px;
  background: #fff9ee;
  color: #a67b32;
  font-size: 11px;
  line-height: 1.8;
  margin-top: 12px;
  border-radius: 4px;
}
.payment-feedback {
  font-size: 11px;
  line-height: 1.8;
  background: #f0f8f4;
  color: #408263;
  padding: 12px;
  border-radius: 4px;
  margin-top: 15px;
}
.decision-detail {
  margin-top: 28px;
}
.trace-table td {
  border-bottom: 1px solid #f0f0f0;
  padding: 15px 14px;
  font-size: 12px;
  line-height: 1.7;
}
.trace-table th:first-child {
  width: 17%;
}
.trace-table th:nth-child(2) {
  width: 16%;
}
.trace-table th:nth-child(3) {
  width: 22%;
}
.result-dot {
  width: 5px;
  height: 5px;
  background: #bfbfbf;
  border-radius: 50%;
  display: inline-block;
  margin-right: 7px;
  vertical-align: middle;
}
.result-dot.hit {
  background: #52a77b;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
  color: #8c8c8c;
}
.reason-code {
  display: block;
  color: #aaa;
  font-size: 10px;
}
.seed-detail {
  margin-top: 16px;
}
.seed-detail p,
.research-footer p {
  color: #8c8c8c;
  font-size: 11px;
  line-height: 1.9;
  margin-top: 8px;
}
.history-section > h3 {
  margin-bottom: 16px;
}
.audit-heading {
  margin-top: 30px;
}
.audit-heading span {
  color: #aaa;
  font-size: 11px;
  font-weight: 400;
  margin-left: 10px;
}
.empty-history {
  padding: 40px 20px;
  color: #a8a8a8;
  text-align: center;
  background: #fafafa;
  border: 1px dashed #e8e8e8;
  border-radius: 6px;
}
.empty-history h4 {
  margin: 13px 0 6px;
  color: #595959;
  font-weight: 500;
}
.empty-history p {
  font-size: 12px;
  margin-bottom: 18px;
}
.audit-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.audit-list li {
  display: flex;
  gap: 18px;
  padding: 0 0 24px 6px;
  position: relative;
}
.audit-list li:before {
  content: '';
  position: absolute;
  width: 1px;
  background: #e8e8e8;
  left: 10px;
  top: 12px;
  bottom: 0;
}
.audit-list li:last-child:before {
  display: none;
}
.audit-dot {
  margin-top: 4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid #9abce8;
  background: white;
  z-index: 1;
  flex-shrink: 0;
}
.audit-list strong {
  font-size: 12px;
}
.audit-list div > span {
  margin-left: 12px;
  font-size: 11px;
  color: #aaa;
}
.audit-list p {
  font-size: 12px;
  color: #595959;
  margin: 7px 0;
}
.audit-list small {
  font-size: 11px;
  color: #8c8c8c;
}
.audit-list details {
  margin-top: 8px;
  font-size: 11px;
  color: #8c8c8c;
}
.research-footer {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid #f0f0f0;
}
.research-footer summary {
  font-size: 11px;
}
.source-links {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.source-links a {
  color: #1677ff;
  font-size: 11px;
  text-decoration: none;
}
.rollout-dialog {
  padding: 0;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  width: min(570px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  margin: auto;
  color: #262626;
  box-shadow: 0 20px 80px #0002;
}
.rollout-dialog::backdrop {
  background: #1a223852;
}
.auxiliary-dialog {
  width: min(1100px, calc(100vw - 32px));
}
.utility-menu {
  position: relative;
  flex-shrink: 0;
}
.utility-menu summary {
  cursor: pointer;
  list-style: none;
}
.utility-menu summary::-webkit-details-marker {
  display: none;
}
.utility-content {
  position: absolute;
  z-index: 20;
  right: 0;
  top: calc(100% + 8px);
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 6px 24px #0001;
  padding: 10px;
  width: min(270px, calc(100vw - 64px));
}
.utility-content > button {
  display: block;
  width: 100%;
  border: 0;
  background: none;
  text-align: left;
  font-size: 12px;
  padding: 10px 8px;
  color: #595959;
  cursor: pointer;
}
.utility-content > button:hover:not(:disabled) {
  background: #f5f8ff;
}
.utility-content small {
  display: block;
  font-size: 11px;
  color: #8c8c8c;
  padding: 6px 8px;
  line-height: 1.7;
}
.demo-tools summary {
  font-size: 12px;
  color: #8c8c8c;
}
.utility-content .role-label {
  display: grid;
  gap: 10px;
  padding: 8px;
}
.utility-content select {
  width: 100%;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 7px;
}
.advanced-feature {
  margin-top: 20px;
  border: 1px solid #ededed;
  border-radius: 6px;
}
.advanced-feature > summary {
  padding: 14px 16px;
  cursor: pointer;
  font-size: 12px;
  color: #737373;
}
.advanced-feature-row {
  padding: 16px;
  border-top: 1px solid #efefef;
  display: flex;
  align-items: center;
  gap: 24px;
}
.advanced-feature-row > div {
  flex: 1;
}
.advanced-feature-row p {
  color: #8c8c8c;
  line-height: 1.8;
  margin: 6px 0 0;
  font-size: 12px;
}
.advanced-feature-row .text-link {
  white-space: nowrap;
}
.advanced-rule {
  margin-top: 24px;
  border-top: 1px solid #efefef;
  padding-top: 16px;
}
.advanced-rule > summary {
  cursor: pointer;
  color: #595959;
  font-size: 12px;
}
.advanced-rule > summary small {
  color: #8c8c8c;
  margin-left: 6px;
  font-weight: normal;
}
.advanced-rule h3 {
  margin-top: 20px;
}
:global(body:has(.rollout-dialog[open])) {
  overflow: hidden;
}
.dialog-heading {
  padding: 20px 24px;
  border-bottom: 1px solid #efefef;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}
.dialog-heading h2 {
  font-size: 16px;
}
.dialog-heading p {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.8;
  margin: 6px 0 0;
}
.icon-button {
  border: none;
  background: none;
  padding: 2px;
  cursor: pointer;
  color: #8c8c8c;
}
.dialog-content {
  padding: 21px 24px;
  max-height: calc(100dvh - 235px);
  overflow-y: auto;
  font-size: 12px;
}
.dialog-content fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.dialog-content legend {
  padding: 0;
  font-size: 12px;
  margin-bottom: 12px;
  font-weight: 500;
}
.mode-options {
  display: flex;
  gap: 8px;
}
.mode-options label {
  flex: 1;
  padding: 10px 8px;
  border: 1px solid #e8e8e8;
  border-radius: 5px;
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  cursor: pointer;
}
.mode-options label.selected {
  border-color: #8ab8f5;
  color: #1677ff;
  background: #f7faff;
}
.mode-options input {
  accent-color: #1677ff;
}
.percentage-editor {
  margin-top: 20px;
}
.percentage-editor > label {
  font-size: 12px;
  display: block;
  margin-bottom: 10px;
}
.percentage-editor small,
.form-label small {
  color: #aaa;
  font-size: 10px;
  font-weight: 400;
  margin-left: 7px;
}
.percentage-editor > div:has(.input) {
  display: flex;
  gap: 8px;
  align-items: center;
}
.percentage-editor .input {
  width: 90px;
}
.percentage-editor input[type='range'] {
  width: 100%;
  margin: 15px 0 10px;
  accent-color: #1677ff;
}
.preset-percentages {
  display: flex;
  gap: 7px;
}
.preset-percentages button {
  padding: 4px 9px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  color: #8c8c8c;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}
.preset-percentages button.active {
  color: #1677ff;
  border-color: #91caff;
  background: #f0f7ff;
}
.dialog-content h3 {
  font-size: 12px;
  margin-top: 24px;
}
.condition-field {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 15px;
  flex-wrap: wrap;
}
.condition-field > span {
  width: 100px;
  flex-shrink: 0;
  white-space: nowrap;
  color: #8c8c8c;
}
.condition-field label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
.condition-field input {
  accent-color: #1677ff;
}
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin: 22px 0 9px;
}
.dialog-content textarea {
  width: 100%;
  resize: vertical;
  padding: 10px;
  font-size: 12px;
  line-height: 1.7;
  border: 1px solid #ddd;
  border-radius: 5px;
  color: #595959;
  outline-color: #1677ff;
  min-height: 64px;
}
.dialog-content textarea::placeholder {
  color: #b8b8b8;
  font-size: 11px;
}
.priority-note {
  margin: 15px 0 0;
  background: #fafafa;
  padding: 10px;
  font-size: 10px;
  color: #8c8c8c;
  line-height: 1.8;
}
.dialog-actions {
  padding: 14px 24px;
  border-top: 1px solid #efefef;
  gap: 8px;
  background: white;
}
.dialog-actions > span {
  font-size: 11px;
  color: #aaa;
  margin-right: auto;
}
.error-box {
  background: #fff2f0;
  color: #bd4b3e;
  border-radius: 5px;
  padding: 11px;
  font-size: 12px;
  line-height: 1.8;
  margin-top: 14px;
}
.error-box p {
  margin: 0;
}
.change-review {
  border: 1px solid #eee;
  border-radius: 5px;
  margin-bottom: 16px;
}
.change-review > div {
  padding: 11px 13px;
  border-bottom: 1px solid #f0f0f0;
}
.change-review > div:last-child {
  border: 0;
}
.change-review strong {
  font-size: 12px;
  font-weight: 500;
  display: block;
  margin-bottom: 6px;
}
.change-review span {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8c8c8c;
  font-size: 11px;
  overflow-wrap: anywhere;
}
.change-review span svg {
  flex-shrink: 0;
}
.danger-button {
  background: #d95252;
  color: white;
  border-color: #d95252;
}
.emergency-targets {
  background: #fff5f3;
  padding: 13px;
  border-radius: 5px;
  color: #a05850;
  font-size: 12px;
}
.emergency-targets p {
  display: inline-block;
  margin: 3px 8px 6px 0;
}
.emergency-targets strong {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 400;
}
button:disabled {
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid #1677ff;
  outline-offset: 2px;
}
@media (min-width: 1600px) {
  .rules-table td {
    padding-top: 27px;
    padding-bottom: 27px;
  }
  .rollout-workspace {
    --extra-space: 1;
  }
}
@media (max-width: 1240px) {
  .configuration-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .rollout-aside {
    padding-left: 18px;
  }
  .rules-table td,
  .rules-table th {
    padding-left: 9px;
    padding-right: 9px;
  }
  .rule-identity {
    gap: 8px;
  }
  .payment-mark {
    width: 30px;
    height: 30px;
    font-size: 18px;
  }
  .rules-table .text-link svg {
    display: none;
  }
  .rules-table th:first-child {
    width: 36%;
  }
  .version-indicator {
    font-size: 11px;
  }
  .principle-strip {
    padding: 18px 15px;
    gap: 6px;
  }
  .principle-strip small {
    font-size: 9px;
  }
}
@media (max-width: 1000px) {
  .configuration-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .rollout-aside {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
    border-left: 0;
    padding: 20px 0 0;
    border-top: 1px solid #eee;
  }
  .aside-section {
    margin: 0;
    border: 0;
    padding: 0;
  }
  .aside-note {
    grid-column: 1 / -1;
    border-top: 1px solid #eee;
    padding-top: 18px;
  }
  .rollout-heading {
    flex-wrap: wrap;
  }
  .principle-strip {
    flex-wrap: wrap;
  }
  .principle-strip > div {
    min-width: 115px;
  }
  .principle-strip > svg {
    display: none;
  }
  .version-indicator {
    width: 100%;
    margin: -3px 0 0;
    padding-bottom: 10px;
  }
  .rollout-tabs {
    gap: 22px;
  }
  .test-layout {
    grid-template-columns: minmax(230px, 280px) 1fr;
  }
  .checkout-area {
    padding: 15px;
  }
  .checkout-preview {
    padding: 18px;
  }
  .checkout-meta {
    flex-wrap: wrap;
  }
}
@media (max-width: 760px) {
  h1 {
    font-size: 20px;
  }
  .scope-bar {
    padding: 12px;
  }
  .scope-bar > div {
    gap: 8px;
  }
  .rollout-heading {
    margin-bottom: 18px;
  }
  .heading-actions {
    width: 100%;
  }
  .rollout-tabs {
    gap: 18px;
  }
  .rollout-tabs > button {
    font-size: 12px;
  }
  .rules-table thead {
    display: none;
  }
  .rules-table tbody {
    display: grid;
    gap: 12px;
  }
  .rules-table tr {
    display: grid;
    grid-template-columns: 1fr auto;
    border: 1px solid #ededed;
    border-radius: 6px;
  }
  .rules-table td {
    border: 0;
    padding: 14px;
    min-width: 0;
  }
  .rules-table td:first-child {
    grid-column: 1 / -1;
    padding-bottom: 0;
  }
  .rules-table td:last-child {
    align-self: center;
  }
  .advanced-feature-row {
    flex-wrap: wrap;
    gap: 14px;
  }
  .advanced-feature-row > div {
    flex-basis: 100%;
  }
  .advanced-feature-row > button {
    margin-left: auto;
  }
  .demo-tools .utility-content {
    left: 0;
    right: auto;
  }
  .trace-table {
    min-width: 610px;
  }
  .rollout-aside {
    gap: 16px;
  }
  .test-layout {
    grid-template-columns: 1fr;
  }
  .checkout-area {
    border-left: 0;
    border-top: 1px solid #e8e8e8;
    padding: 16px;
  }
  .test-section > .section-heading {
    flex-wrap: wrap;
  }
  .pending-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .principle-strip {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .profile-panel {
    padding: 18px;
  }
  .source-picker {
    width: 100%;
  }
  .source-picker button {
    flex: 1;
  }
  .kill-banner {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .kill-banner > div {
    flex: 1;
  }
  .kill-banner > button {
    margin-left: 28px;
  }
}
@media (max-width: 440px) {
  .breadcrumb {
    font-size: 10px;
    gap: 5px;
    flex-wrap: wrap;
  }
  .rollout-heading h1 {
    font-size: 19px;
  }
  .heading-actions .btn {
    padding-left: 10px;
    padding-right: 10px;
    font-size: 12px;
  }
  .scope-bar > div {
    font-size: 11px;
    gap: 6px;
  }
  .role-label {
    flex-wrap: wrap;
    gap: 5px;
  }
  .scope-notice {
    font-size: 10px;
  }
  .rollout-tabs {
    gap: 14px;
  }
  .rollout-tabs > button {
    font-size: 11px;
  }
  .rollout-aside {
    grid-template-columns: 1fr;
  }
  .aside-note {
    grid-column: auto;
  }
  .principle-strip {
    padding: 16px 10px;
    gap: 18px 8px;
  }
  .principle-strip > div {
    min-width: 0;
    column-gap: 6px;
  }
  .principle-strip small {
    line-height: 1.7;
  }
  .section-heading p {
    font-size: 12px;
  }
  .section-heading h2 {
    font-size: 15px;
  }
  .dialog-heading,
  .dialog-content {
    padding: 17px;
  }
  .dialog-actions {
    padding: 12px 17px;
    flex-wrap: wrap;
  }
  .dialog-actions > span {
    width: 100%;
  }
  .dialog-actions > .btn:first-of-type {
    margin-left: auto;
  }
  .mode-options {
    gap: 5px;
  }
  .mode-options label {
    padding: 9px 5px;
    gap: 3px;
    font-size: 11px;
  }
  .condition-field {
    gap: 10px;
  }
  .condition-field > span {
    width: 100%;
  }
  .preset-percentages {
    gap: 5px;
  }
  .preset-percentages button {
    padding: 4px 8px;
  }
  .checkout-preview {
    padding: 16px;
  }
  .checkout-brand {
    font-size: 9px;
    letter-spacing: 0.7px;
  }
  .checkout-brand > span:last-child {
    font-size: 9px;
  }
  .source-links {
    gap: 9px;
  }
}
</style>
