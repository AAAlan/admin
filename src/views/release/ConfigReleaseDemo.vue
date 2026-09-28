<template>
  <div class="release-page">
    <div class="page-header release-header">
      <div>
        <h1 class="page-title">配置发布</h1>
        <p class="page-subtitle">按全局配置、场景维度配置、游戏发货配置分别发布，发布前统一查看实时配置 Diff。</p>
      </div>
    </div>

    <section class="relation-note" aria-label="配置关系与发布边界">
      <strong>配置关系与发布边界：</strong>
      <span>支付渠道配置</span>
      <Icon name="arrowRight" :size="14" />
      <span>全局收银台模版</span>
      <Icon name="arrowRight" :size="14" />
      <span>Platform / 场景引用多个模版并独立发布</span>
      <span class="relation-note-separator"></span>
      <span>游戏发货配置独立全局发布</span>
    </section>

    <section class="draft-panel" aria-label="草稿池">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">草稿池</h2>
          <p class="panel-desc">各配置页保存草稿后汇入这里；发布页负责创建发布并提交审核，审核通过后才能发布。</p>
        </div>
        <span class="draft-flow">配置页保存草稿 → 创建发布并提交审核 → 审核通过 → 发布前实时 Diff</span>
      </div>
      <div class="draft-rule-note">
        草稿合并规则：同一发布单元在未提交审核前重复保存只更新同一条草稿；提交审核后草稿从草稿池移除，后续再次保存会生成新的草稿。
      </div>
      <div class="draft-table-wrap">
        <table class="draft-table">
          <thead>
            <tr>
              <th>草稿</th>
              <th>发布范围</th>
              <th>来源</th>
              <th>保存信息</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="draft in currentDrafts" :key="draft.id">
              <td>
                <div class="table-main-cell">
                  <strong>{{ draft.title }}</strong>
                  <span>{{ draft.id }}</span>
                </div>
              </td>
              <td>
                <div class="table-main-cell">
                  <strong>{{ draft.releaseMode }}</strong>
                  <span>{{ draft.scopeText }}</span>
                  <span>{{ draft.publishUnit }}</span>
                </div>
              </td>
              <td>
                <div class="table-main-cell">
                  <strong>{{ draft.sourcePage }}</strong>
                  <span>合并键：{{ draft.mergeKey }}</span>
                </div>
              </td>
              <td>
                <div class="table-main-cell">
                  <strong>{{ draft.updatedAt }}</strong>
                  <span>保存 {{ draft.saveCount }} 次</span>
                </div>
              </td>
              <td>
                <span class="status-tag status-tag--draft">未建单</span>
              </td>
              <td>
                <button class="btn btn-primary btn-sm" type="button" @click="openCreateRelease(draft)">
                  创建发布并提交审核
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="currentDrafts.length === 0" class="empty-state compact-empty">
          <p>当前区域和环境下暂无待建单草稿</p>
        </div>
      </div>
    </section>

    <div class="release-workspace">
      <section class="release-list-panel" aria-label="发布单列表">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">发布单</h2>
            <p class="panel-desc">{{ regionText }} / {{ envText }}</p>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="resetDemo">
            <Icon name="refresh" :size="14" />
            <span>重置</span>
          </button>
        </div>

        <div class="release-filters" role="tablist" aria-label="发布状态筛选">
          <button
            v-for="item in statusTabs"
            :key="item.value"
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip--active': statusFilter === item.value }"
            @click="statusFilter = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="release-table-wrap">
          <table class="release-table">
            <thead>
              <tr>
                <th>发布单</th>
                <th>发布范围</th>
                <th>创建信息</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="release in filteredReleases" :key="release.id">
                <td>
                  <div class="table-main-cell">
                    <strong>{{ release.title }}</strong>
                    <span>{{ release.id }}</span>
                  </div>
                </td>
                <td>
                  <div class="table-main-cell">
                    <strong>{{ release.releaseMode }}</strong>
                    <span>{{ release.scopeText }}</span>
                    <span>{{ release.publishUnit }}</span>
                  </div>
                </td>
                <td>
                  <div class="table-main-cell">
                    <strong>{{ release.operator }}</strong>
                    <span>{{ release.updatedAt }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-tag" :class="`status-tag--${release.status}`">{{ statusText(release.status) }}</span>
                </td>
                <td>
                  <button
                    v-if="release.status === 'approved'"
                    class="btn btn-success btn-sm"
                    type="button"
                    @click="openPrePublishCheck(release)"
                  >
                    发布
                  </button>
                  <div v-else-if="release.status === 'reviewing'" class="action-stack">
                    <button class="btn btn-primary btn-sm" type="button" @click="approveRelease(release)">
                      审核通过
                    </button>
                    <button class="btn btn-secondary btn-sm" type="button" @click="rejectRelease(release)">
                      驳回
                    </button>
                  </div>
                  <button
                    v-else
                    class="btn btn-secondary btn-sm"
                    type="button"
                    @click="openReleaseRecord(release)"
                  >
                    查看发布结果
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredReleases.length === 0" class="empty-state compact-empty">
            <p>当前筛选下没有发布单</p>
          </div>
        </div>
      </section>
    </div>

    <Modal v-model:visible="createModalVisible" title="创建发布并提交审核" size="large">
      <div v-if="selectedDraft" class="create-release-layout">
        <div class="create-release-summary">
          <div>
            <span>草稿</span>
            <strong>{{ selectedDraft.id }}</strong>
          </div>
          <div>
            <span>来源配置页</span>
            <strong>{{ selectedDraft.sourcePage }}</strong>
          </div>
          <div>
            <span>发布单元</span>
            <strong>{{ selectedDraft.publishUnit }}</strong>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label" for="release-title">发布标题</label>
          <input id="release-title" v-model.trim="createForm.title" class="input" type="text" />
        </div>
        <div class="draft-preview">
          <h3>提交后进入待审核列表</h3>
          <ul>
            <li>从草稿池移除这条草稿，生成一条待审核发布单。</li>
            <li>保留发布标题、发布单元和草稿来源，方便列表定位。</li>
            <li>审核通过后，发布人点击发布时再展示实时版本对比和具体 Diff。</li>
          </ul>
        </div>
        <p class="create-release-note">提交审核不会在这里要求复核 Diff；审核通过后，发布人点击“发布”才会进入“发布前 Diff”。</p>
      </div>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="createModalVisible = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="!selectedDraft" @click="createRelease">提交审核</button>
      </template>
    </Modal>

    <Modal v-model:visible="prePublishModalVisible" title="发布前 Diff" size="large">
      <div v-if="activeRelease" class="prepublish-modal">
        <div class="prepublish-state-line">
          <span class="validation-result" :class="{ 'validation-result--pass': !onlineChanged }">
            {{ onlineChanged ? '线上版本已变化，Diff 已重新计算' : '线上版本未变化，Diff 与建单时一致' }}
          </span>
        </div>

        <div class="prepublish-versions">
          <div>
            <span>建单时线上</span>
            <strong>v{{ activeRelease.baseVersion }}</strong>
          </div>
          <div>
            <span>当前线上</span>
            <strong>v{{ activeRelease.currentOnlineVersion || activeRelease.baseVersion }}</strong>
          </div>
          <div>
            <span>目标草稿</span>
            <strong>v{{ activeRelease.targetVersion }}</strong>
          </div>
        </div>

        <section class="modal-section">
          <h3>发布前 Diff</h3>
          <p>基于当前线上版本重新计算，避免待发布期间线上版本变化导致误覆盖。</p>
          <div class="config-file-list">
            <article v-for="file in configFileDiffs" :key="file.key" class="config-file-diff">
              <div class="config-file-head">
                <div>
                  <h4>{{ file.name }}</h4>
                  <p>{{ file.description }}</p>
                </div>
                <div class="config-file-summary" aria-label="文件变更摘要">
                  <span class="diff-count diff-count--added">新增 {{ file.summary.added }}</span>
                  <span class="diff-count diff-count--modified">修改 {{ file.summary.modified }}</span>
                  <span class="diff-count diff-count--removed">删除 {{ file.summary.removed }}</span>
                </div>
              </div>
              <div class="config-diff">
                <div class="config-diff-pane config-diff-pane--before">
                  <div class="config-diff-title">当前线上配置</div>
                  <pre><code><span
                    v-for="(line, index) in file.beforeLines"
                    :key="`before-${file.key}-${index}`"
                    :class="line.className"
                  ><span class="config-line-prefix">{{ line.marker }}</span>{{ line.text }}</span></code></pre>
                </div>
                <div class="config-diff-pane config-diff-pane--after">
                  <div class="config-diff-title">待发布配置</div>
                  <pre><code><span
                    v-for="(line, index) in file.afterLines"
                    :key="`after-${file.key}-${index}`"
                    :class="line.className"
                  ><span class="config-line-prefix">{{ line.marker }}</span>{{ line.text }}</span></code></pre>
                </div>
              </div>
            </article>

            <div v-if="configFileDiffs.length === 0" class="empty-state compact-empty">
              <p>没有可展示的配置文件 Diff</p>
            </div>
          </div>
        </section>

      </div>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="prePublishModalVisible = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="!canPublish" @click="confirmPrePublishCheck">确认无误</button>
      </template>
    </Modal>

    <Modal v-model:visible="publishModalVisible" title="二次确认发布" size="medium">
      <div class="publish-confirm">
        <p>即将发布「{{ activeRelease?.title }}」到 {{ envText }}。</p>
        <p>本次会基于当前线上 v{{ activeRelease?.currentOnlineVersion || activeRelease?.baseVersion }} 应用到目标 v{{ activeRelease?.targetVersion }}。</p>
        <p class="confirm-warning">确认后配置会立即生效，请再次确认发布范围与 Diff。</p>
      </div>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="publishModalVisible = false">取消</button>
        <button class="btn btn-success" type="button" @click="publishRelease">确认发布</button>
      </template>
    </Modal>

    <Modal v-model:visible="releaseRecordVisible" title="发布结果" size="medium">
      <div v-if="activeRelease" class="publish-confirm">
        <p>发布单「{{ activeRelease.title }}」已完成发布。</p>
        <p>{{ activeRelease.operator }} · {{ activeRelease.updatedAt }} · {{ activeRelease.releaseMode }}</p>
        <p>发布范围：{{ activeRelease.scopeText }} / {{ activeRelease.publishUnit }}</p>
        <p class="confirm-warning">历史发布单用于追溯记录；如需发布新配置，请从草稿池创建发布并提交审核。</p>
      </div>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="releaseRecordVisible = false">知道了</button>
      </template>
    </Modal>
  </div>
</template>

<script>
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'

const statusLabels = {
  reviewing: '待审核',
  approved: '待发布',
  published: '已发布',
  rejected: '已驳回',
  failed: '发布失败'
}

const initialReleases = [
  {
    id: 'REL-20260614-001',
    region: 'overseas',
    env: 'prod',
    title: '海外全局收银台模版与渠道参数发布',
    operator: '林夏',
    status: 'reviewing',
    updatedAt: '2026-06-14 16:20',
    baseVersion: 41,
    currentOnlineVersion: 43,
    targetVersion: 42,
    releaseMode: '全局发布',
    publishUnit: '全局配置',
    dependencyText: '全局收银台模版引用支付渠道基础参数',
    scopeText: '支付渠道配置 / 全局收银台模版',
    summary: { added: 1, modified: 6, removed: 1 },
    scopes: [
      { key: 'cashier', label: '全局收银台模版', count: 5 },
      { key: 'paymentBasics', label: '支付基础配置', count: 2 },
      { key: 'scenarioPlatform', label: '引用场景影响', count: 1 }
    ],
    issues: [
      { id: 'i1', level: 'warning', message: '该全局收银台模版被 3 个 platform/场景引用，发布后引用场景在下次单独发布时可选择新版本。' },
      { id: 'i2', level: 'pass', message: '全局收银台模版引用的支付渠道基础参数均存在且处于启用状态。' },
      { id: 'i3', level: 'pass', message: '渠道敏感字段已脱敏记录，发布包将从密钥服务读取真实值。' }
    ],
    changes: [
      {
        id: 'c1',
        scope: 'cashier',
        type: 'modified',
        risk: 'medium',
        title: 'Visa 在全局模版内排序提前',
        entity: 'template_global_usd_pc / US / USD / pc',
        field: 'template.payment_methods.pm_adyen_visa.sort_order',
        before: 2,
        after: 1
      },
      {
        id: 'c2',
        scope: 'cashier',
        type: 'modified',
        risk: 'medium',
        title: 'PayPal 在全局模版内推荐位关闭',
        entity: 'template_global_usd_pc / US / USD / pc',
        field: 'template.payment_methods.pm_paypal.is_recommended',
        before: true,
        after: false
      },
      {
        id: 'c3',
        scope: 'paymentBasics',
        type: 'modified',
        risk: 'high',
        title: 'Adyen 私钥变更',
        entity: 'channel_id: adyen_MerchantAccount_Test123',
        field: 'private_key',
        before: '******7YQ',
        after: '******2MB'
      },
      {
        id: 'c4',
        scope: 'cashier',
        type: 'added',
        risk: 'low',
        title: '全局模版新增 Apple Pay 支付方式',
        entity: 'template_global_usd_apple / US / USD / apple',
        field: 'template.payment_methods.pm_apple_pay',
        before: null,
        after: 'Apple Pay'
      },
      {
        id: 'c5',
        scope: 'cashier',
        type: 'removed',
        risk: 'medium',
        title: '全局模版移除过期 Stripe 测试通道',
        entity: 'template_global_usd_pc / US / USD / pc',
        field: 'template.payment_methods.pm_stripe_test',
        before: 'Stripe Test',
        after: null
      },
      {
        id: 'c6',
        scope: 'scenarioPlatform',
        type: 'modified',
        risk: 'low',
        title: '受影响场景引用关系提示',
        entity: 'platform=apple / scene=ios_web',
        field: 'referenced_cashier_template_version',
        before: 'template_global_usd_pc@v12',
        after: '可升级到 template_global_usd_pc@v13'
      },
      {
        id: 'c7',
        scope: 'paymentBasics',
        type: 'modified',
        risk: 'low',
        title: '渠道签约主体补全',
        entity: 'channel_id: stripe_acct_1234567890',
        field: 'channel_subject',
        before: '',
        after: 'Stripe, Inc.'
      },
      {
        id: 'c8',
        scope: 'cashier',
        type: 'modified',
        risk: 'low',
        title: '全局模版推荐文案更新',
        entity: 'template_global_gbp_pc / GB / GBP / pc',
        field: 'template.recommend_text',
        before: 'Fast checkout',
        after: 'Fast and secure checkout'
      }
    ]
  },
  {
    id: 'REL-20260613-004',
    region: 'overseas',
    env: 'prod',
    title: 'apple / ios_web 场景独立发布',
    operator: '唐可',
    status: 'published',
    updatedAt: '2026-06-13 21:10',
    baseVersion: 40,
    currentOnlineVersion: 41,
    targetVersion: 41,
    releaseMode: '局部发布',
    publishUnit: 'platform=apple / scene=ios_web',
    dependencyText: '引用 2 个全局收银台模版：template_global_usd_pc@v12、template_global_usd_apple@v5',
    scopeText: '支付场景管理',
    sourceDraftId: 'DRAFT-20260614-009',
    snapshotLockedAt: '2026/6/14 18:08:12',
    summary: { added: 0, modified: 3, removed: 0 },
    scopes: [
      { key: 'scenarioPlatform', label: '场景配置', count: 3 }
    ],
    issues: [
      { id: 'i1', level: 'pass', message: '当前场景引用的 2 个全局收银台模版版本均已发布，可独立发布该 platform/场景配置。' }
    ],
    changes: [
      {
        id: 'c1',
        scope: 'scenarioPlatform',
        type: 'modified',
        risk: 'low',
        title: '场景绑定的 PC 收银台模版版本变更',
        entity: 'platform=apple / scene=ios_web',
        field: 'cashier_template_refs.pc',
        before: 'template_global_usd_pc@v11',
        after: 'template_global_usd_pc@v12'
      },
      {
        id: 'c2',
        scope: 'scenarioPlatform',
        type: 'modified',
        risk: 'low',
        title: '场景计费点促销文案调整',
        entity: 'platform=apple / scene=ios_web / coin_2000',
        field: 'promoText_i18n_key.ja',
        before: 'お得',
        after: '期間限定'
      },
      {
        id: 'c3',
        scope: 'scenarioPlatform',
        type: 'modified',
        risk: 'low',
        title: '场景新增 Apple Web 收银台模版引用',
        entity: 'platform=apple / scene=ios_web',
        field: 'cashier_template_refs.apple_web',
        before: '空',
        after: 'template_global_usd_apple@v5'
      }
    ]
  },
  {
    id: 'REL-20260614-002',
    region: 'domestic',
    env: 'prod',
    title: 'android / cn_native 场景独立发布',
    operator: '许宁',
    status: 'draft',
    updatedAt: '2026-06-14 15:46',
    baseVersion: 18,
    currentOnlineVersion: 18,
    targetVersion: 19,
    releaseMode: '局部发布',
    publishUnit: 'platform=android / scene=cn_native',
    dependencyText: '引用 2 个国内全局收银台模版，其中 template_cn_cny_android@草稿 未发布',
    scopeText: '支付场景管理',
    summary: { added: 1, modified: 4, removed: 0 },
    scopes: [
      { key: 'cashier', label: '模版引用', count: 3 },
      { key: 'paymentBasics', label: '依赖校验', count: 1 },
      { key: 'paymentInfo', label: '账单信息收集', count: 1 }
    ],
    issues: [
      { id: 'i1', level: 'error', message: '当前场景引用的多个全局收银台模版中，template_cn_cny_android 仍是草稿版本，需要先发布全局模版或改回已发布版本。' },
      { id: 'i2', level: 'warning', message: '该场景将微信支付设为推荐，需要确认国内活动期流量策略。' }
    ],
    changes: [
      {
        id: 'c1',
        scope: 'cashier',
        type: 'modified',
        risk: 'medium',
        title: '场景绑定 Android 模版切换到草稿版本',
        entity: 'platform=android / scene=cn_native',
        field: 'cashier_template_refs.android',
        before: 'template_cn_cny_android@v8',
        after: 'template_cn_cny_android@draft'
      },
      {
        id: 'c2',
        scope: 'cashier',
        type: 'modified',
        risk: 'high',
        title: '引用模版未发布',
        entity: 'template_cn_cny_android',
        field: 'publish_status',
        before: 'published',
        after: 'draft'
      },
      {
        id: 'c3',
        scope: 'paymentInfo',
        type: 'added',
        risk: 'low',
        title: '场景新增邮箱收集规则',
        entity: 'platform=android / scene=cn_native',
        field: 'collect_email',
        before: null,
        after: true
      },
      {
        id: 'c4',
        scope: 'cashier',
        type: 'modified',
        risk: 'medium',
        title: '场景覆盖支付宝排序',
        entity: 'platform=android / scene=cn_native',
        field: 'scenario_override.alipay.sort_order',
        before: 1,
        after: 2
      },
      {
        id: 'c5',
        scope: 'paymentBasics',
        type: 'modified',
        risk: 'low',
        title: '依赖的微信渠道主体补全',
        entity: 'channel_id: wechat_mch_1650730611',
        field: 'channel_subject',
        before: '',
        after: '财付通支付科技有限公司'
      }
    ]
  },
  {
    id: 'REL-20260612-003',
    region: 'domestic',
    env: 'prod',
    title: '国内游戏发货回调地址发布',
    operator: '陈越',
    status: 'draft',
    updatedAt: '2026-06-12 18:32',
    baseVersion: 17,
    currentOnlineVersion: 17,
    targetVersion: 18,
    releaseMode: '独立全局发布',
    publishUnit: '游戏发货配置',
    dependencyText: '不依赖收银台模版引用链',
    scopeText: '游戏发货配置',
    summary: { added: 0, modified: 2, removed: 0 },
    scopes: [
      { key: 'gameApplications', label: '游戏发货配置', count: 2 }
    ],
    issues: [
      { id: 'i1', level: 'pass', message: '回调 URL 已通过格式校验。' },
      { id: 'i2', level: 'warning', message: '加币回调地址变更，请确认服务端已同步上线。' }
    ],
    changes: [
      {
        id: 'c1',
        scope: 'gameApplications',
        type: 'modified',
        risk: 'medium',
        title: '加币回调地址变更',
        entity: 'Silver / CN',
        field: 'addCoinUrl',
        before: 'https://old-pay.example.com/success',
        after: 'https://pay.example.com/success'
      },
      {
        id: 'c2',
        scope: 'gameApplications',
        type: 'modified',
        risk: 'high',
        title: '通知 ID 变更',
        entity: 'Silver / CN',
        field: 'notifyId',
        before: 'notify_1001',
        after: 'notify_2026_cn'
      }
    ]
  }
]

const initialDrafts = [
  {
    id: 'DRAFT-20260615-001',
    region: 'overseas',
    env: 'prod',
    title: 'apple / ios_web 场景草稿',
    sourcePage: '支付场景管理',
    operator: '林夏',
    updatedAt: '2026-06-15 10:18',
    releaseMode: '局部发布',
    publishUnit: 'platform=apple / scene=ios_web',
    mergeKey: 'overseas:prod:scenario:apple/ios_web',
    saveCount: 3,
    dependencyText: '引用 2 个全局收银台模版：template_global_usd_pc@v12、template_global_usd_apple@v5',
    scopeText: '支付场景管理',
    baseVersion: 42,
    targetVersion: 43,
    summary: { added: 1, modified: 3, removed: 0 },
    scopes: [
      { key: 'scenarioPlatform', label: '场景配置', count: 3 },
      { key: 'cashier', label: '模版引用', count: 1 }
    ],
    issues: [
      { id: 'i1', level: 'pass', message: '当前场景引用的 2 个全局收银台模版版本均已发布。' },
      { id: 'i2', level: 'warning', message: '该场景新增 Apple Web 收银台模版引用，请确认端能力覆盖。' }
    ],
    changes: [
      {
        id: 'd1',
        scope: 'scenarioPlatform',
        type: 'modified',
        risk: 'low',
        title: 'PC 收银台模版引用升级',
        entity: 'platform=apple / scene=ios_web',
        field: 'cashier_template_refs.pc',
        before: 'template_global_usd_pc@v12',
        after: 'template_global_usd_pc@v13'
      },
      {
        id: 'd2',
        scope: 'cashier',
        type: 'added',
        risk: 'medium',
        title: '新增 Apple Web 收银台模版引用',
        entity: 'platform=apple / scene=ios_web',
        field: 'cashier_template_refs.apple_web',
        before: null,
        after: 'template_global_usd_apple@v5'
      },
      {
        id: 'd3',
        scope: 'scenarioPlatform',
        type: 'modified',
        risk: 'low',
        title: '场景计费点促销文案调整',
        entity: 'platform=apple / scene=ios_web / coin_2000',
        field: 'promoText_i18n_key.en',
        before: 'Best value',
        after: 'Most popular'
      }
    ]
  },
  {
    id: 'DRAFT-20260615-003',
    region: 'overseas',
    env: 'prod',
    title: '海外全局收银台模版草稿',
    sourcePage: '全局收银台模版',
    operator: '周然',
    updatedAt: '2026-06-15 10:36',
    releaseMode: '全局发布',
    publishUnit: 'template_global_usd_pc',
    mergeKey: 'overseas:prod:global_cashier:template_global_usd_pc',
    saveCount: 1,
    dependencyText: '引用支付渠道基础参数 adyen_MerchantAccount_Test123',
    scopeText: '全局收银台模版',
    baseVersion: 13,
    targetVersion: 14,
    summary: { added: 0, modified: 3, removed: 0 },
    scopes: [
      { key: 'cashier', label: '全局收银台模版', count: 3 },
      { key: 'paymentBasics', label: '依赖校验', count: 1 }
    ],
    issues: [
      { id: 'i1', level: 'warning', message: '该模版被 3 个 platform/场景引用，发布后引用方可选择升级。' },
      { id: 'i2', level: 'pass', message: '引用的支付渠道基础参数均已发布。' }
    ],
    changes: [
      {
        id: 'd1',
        scope: 'cashier',
        type: 'modified',
        risk: 'medium',
        title: 'Visa 排序提前',
        entity: 'template_global_usd_pc',
        field: 'template.payment_methods.pm_adyen_visa.sort_order',
        before: 2,
        after: 1
      },
      {
        id: 'd2',
        scope: 'paymentBasics',
        type: 'modified',
        risk: 'low',
        title: '渠道依赖版本校验',
        entity: 'channel_id: adyen_MerchantAccount_Test123',
        field: 'referenced_channel_version',
        before: 'v8',
        after: 'v8'
      }
    ]
  },
  {
    id: 'DRAFT-20260615-004',
    region: 'overseas',
    env: 'prod',
    title: '海外游戏发货配置草稿',
    sourcePage: '游戏发货配置',
    operator: '陈越',
    updatedAt: '2026-06-15 10:52',
    releaseMode: '独立全局发布',
    publishUnit: 'game_shipping',
    mergeKey: 'overseas:prod:game_shipping:Silver',
    saveCount: 2,
    dependencyText: '不依赖收银台模版引用链',
    scopeText: '游戏发货配置',
    baseVersion: 8,
    targetVersion: 9,
    summary: { added: 0, modified: 2, removed: 0 },
    scopes: [
      { key: 'gameApplications', label: '游戏发货配置', count: 2 }
    ],
    issues: [
      { id: 'i1', level: 'pass', message: '回调 URL 格式校验通过。' },
      { id: 'i2', level: 'warning', message: '发货回调变更需要确认服务端灰度状态。' }
    ],
    changes: [
      {
        id: 'd1',
        scope: 'gameApplications',
        type: 'modified',
        risk: 'medium',
        title: '海外发货回调地址变更',
        entity: 'Silver / OVERSEA',
        field: 'addCoinUrl',
        before: 'https://old-pay.example.com/success',
        after: 'https://pay.example.com/success'
      }
    ]
  },
  {
    id: 'DRAFT-20260615-002',
    region: 'domestic',
    env: 'prod',
    title: '国内 Android 场景草稿',
    sourcePage: '支付场景管理',
    operator: '许宁',
    updatedAt: '2026-06-15 09:42',
    releaseMode: '局部发布',
    publishUnit: 'platform=android / scene=cn_native',
    mergeKey: 'domestic:prod:scenario:android/cn_native',
    saveCount: 2,
    dependencyText: '引用 2 个国内全局收银台模版，其中 template_cn_cny_android@草稿 未发布',
    scopeText: '支付场景管理',
    baseVersion: 19,
    targetVersion: 20,
    summary: { added: 1, modified: 4, removed: 0 },
    scopes: [
      { key: 'cashier', label: '模版引用', count: 3 },
      { key: 'paymentBasics', label: '依赖校验', count: 1 },
      { key: 'paymentInfo', label: '账单信息收集', count: 1 }
    ],
    issues: [
      { id: 'i1', level: 'error', message: '当前场景引用的多个全局收银台模版中，template_cn_cny_android 仍是草稿版本。' },
      { id: 'i2', level: 'warning', message: '该场景将微信支付设为推荐，需要确认国内活动期流量策略。' }
    ],
    changes: [
      {
        id: 'd1',
        scope: 'cashier',
        type: 'modified',
        risk: 'high',
        title: 'Android 模版引用切换到草稿版本',
        entity: 'platform=android / scene=cn_native',
        field: 'cashier_template_refs.android',
        before: 'template_cn_cny_android@v8',
        after: 'template_cn_cny_android@draft'
      },
      {
        id: 'd2',
        scope: 'paymentInfo',
        type: 'added',
        risk: 'low',
        title: '场景新增邮箱收集规则',
        entity: 'platform=android / scene=cn_native',
        field: 'collect_email',
        before: null,
        after: true
      }
    ]
  }
]

export default {
  name: 'ConfigReleaseDemo',
  components: { Icon, Modal },
  data() {
    const routeRegion = this.$route.meta?.region === 'domestic' ? 'domestic' : 'overseas'
    const first = initialReleases.find(item => item.region === routeRegion && item.env === 'prod')
    return {
      selectedRegion: routeRegion,
      selectedEnv: 'prod',
      statusFilter: 'reviewing',
      activeReleaseId: first?.id || '',
      selectedDraftId: '',
      releases: JSON.parse(JSON.stringify(initialReleases)),
      draftQueue: JSON.parse(JSON.stringify(initialDrafts)),
      createModalVisible: false,
      prePublishModalVisible: false,
      publishModalVisible: false,
      releaseRecordVisible: false,
      createForm: {
        title: 'Silver 支付配置发布'
      }
    }
  },
  computed: {
    regionText() {
      return this.selectedRegion === 'domestic' ? '国内' : '海外'
    },
    envText() {
      const map = { test: '测试环境', staging: '预发环境', prod: '生产环境' }
      return map[this.selectedEnv]
    },
    statusTabs() {
      return [
        { value: 'reviewing', label: '待审核' },
        { value: 'approved', label: '待发布' },
        { value: 'published', label: '已发布' },
        { value: 'all', label: '全部' }
      ]
    },
    currentReleases() {
      return this.releases.filter(item => item.region === this.selectedRegion && item.env === this.selectedEnv)
    },
    currentDrafts() {
      return this.draftQueue.filter(item => item.region === this.selectedRegion && item.env === this.selectedEnv)
    },
    selectedDraft() {
      return this.currentDrafts.find(item => item.id === this.selectedDraftId) || null
    },
    filteredReleases() {
      if (this.statusFilter === 'all') return this.currentReleases
      return this.currentReleases.filter(item => item.status === this.statusFilter)
    },
    activeRelease() {
      return this.currentReleases.find(item => item.id === this.activeReleaseId) || this.currentReleases[0] || null
    },
    configFileDiffs() {
      if (!this.activeRelease) return []
      const groups = this.activeRelease.changes.reduce((result, change) => {
        const key = change.scope || 'config'
        if (!result[key]) result[key] = []
        result[key].push(change)
        return result
      }, {})
      return Object.entries(groups).map(([key, changes]) => {
        const changedPaths = changes.reduce((result, change) => {
          result[change.field] = change.type
          return result
        }, {})
        return {
          key,
          name: this.configFileName(key),
          description: this.configFileDescription(key, changes),
          summary: this.configFileSummary(changes),
          changes,
          beforeLines: this.configFileLines(changes, 'before', changedPaths),
          afterLines: this.configFileLines(changes, 'after', changedPaths)
        }
      })
    },
    canPublish() {
      return this.activeRelease?.status === 'approved'
    },
    onlineChanged() {
      if (!this.activeRelease) return false
      return Number(this.activeRelease.currentOnlineVersion || this.activeRelease.baseVersion) !== Number(this.activeRelease.baseVersion)
    }
  },
  watch: {
    selectedRegion() {
      this.ensureActiveRelease()
      this.ensureActiveDraft()
    },
    selectedEnv() {
      this.ensureActiveRelease()
      this.ensureActiveDraft()
    },
  },
  mounted() {
    this.ensureActiveDraft()
  },
  methods: {
    ensureActiveRelease() {
      this.statusFilter = 'reviewing'
      const first = this.currentReleases[0]
      this.activeReleaseId = first?.id || ''
    },
    ensureActiveDraft() {
      if (this.selectedDraft && this.selectedDraft.region === this.selectedRegion && this.selectedDraft.env === this.selectedEnv) return
      this.selectedDraftId = this.currentDrafts[0]?.id || ''
    },
    statusText(status) {
      return statusLabels[status] || status
    },
    formatConfigValue(value) {
      if (value === undefined || value === null || value === '') return 'null'
      if (typeof value === 'string') return JSON.stringify(value)
      return JSON.stringify(value)
    },
    configFileName(scope) {
      const map = {
        cashier: 'cashier_templates.json',
        paymentBasics: 'payment_channel_basics.json',
        scenarioPlatform: 'scenario_platform_refs.json',
        paymentInfo: 'payment_info_rules.json',
        gameApplications: 'game_shipping.json'
      }
      return map[scope] || `${scope}.json`
    },
    configFileDescription(scope, changes) {
      const entities = [...new Set(changes.map(change => change.entity).filter(Boolean))]
      return entities.length > 0
        ? `涉及 ${entities.slice(0, 2).join(' / ')}，按配置文件整体对比`
        : '按配置文件整体对比'
    },
    configFileSummary(changes) {
      return changes.reduce((summary, change) => {
        if (change.type === 'added') summary.added += 1
        else if (change.type === 'removed') summary.removed += 1
        else summary.modified += 1
        return summary
      }, { added: 0, modified: 0, removed: 0 })
    },
    configFileLines(changes, side, changedPaths) {
      const config = JSON.parse(JSON.stringify(this.configFileBase(changes[0]?.scope)))
      changes.forEach(change => {
        const path = String(change.field || 'value').split('.').filter(Boolean)
        if ((side === 'before' && change.type === 'added') || (side === 'after' && change.type === 'removed')) {
          this.deleteConfigPath(config, path)
          return
        }
        const value = side === 'before' ? change.before : change.after
        this.setConfigPath(config, path, value)
      })
      return this.renderConfigObject(config, changedPaths, side)
    },
    configFileBase(scope) {
      const map = {
        cashier: {
          template_id: 'template_global_usd_pc',
          region: 'US',
          currency: 'USD',
          device: 'pc',
          status: 'published',
          publish_status: 'published',
          cashier_template_refs: {
            android: 'template_cn_cny_android@v8',
            apple_web: null,
            pc: 'template_global_usd_pc@v12'
          },
          template: {
            name: 'Global USD PC Checkout',
            recommend_text: 'Fast checkout',
            layout: 'standard',
            payment_methods: {
              pm_adyen_visa: {
                channel_id: 'adyen_MerchantAccount_Test123',
                enabled: true,
                is_recommended: true,
                sort_order: 2
              },
              pm_paypal: {
                channel_id: 'paypal_usd_main',
                enabled: true,
                is_recommended: true,
                sort_order: 3
              },
              pm_stripe_test: 'Stripe Test'
            }
          },
          scenario_override: {
            alipay: {
              enabled: true,
              sort_order: 1
            }
          }
        },
        paymentBasics: {
          channel_id: 'adyen_MerchantAccount_Test123',
          provider: 'Adyen',
          currency: 'USD',
          status: 'enabled',
          channel_subject: null,
          referenced_channel_version: 'v8',
          merchant_account: 'HappyElementsUSD',
          private_key: '******7YQ',
          risk_control: {
            three_ds: true,
            capture_mode: 'auto'
          }
        },
        scenarioPlatform: {
          platform: 'apple',
          scene: 'ios_web',
          status: 'online',
          referenced_cashier_template_version: 'template_global_usd_pc@v12',
          cashier_template_refs: {
            apple_web: null,
            mobile: 'template_global_usd_mobile@v6',
            pc: 'template_global_usd_pc@v12'
          },
          promoText_i18n_key: {
            en: 'Best value',
            ja: 'お得',
            zh_CN: '超值'
          },
          pricing_items: {
            coin_2000: {
              enabled: true,
              price: 19.99
            }
          }
        },
        paymentInfo: {
          scene: 'cn_native',
          collect_email: false,
          collect_phone: true,
          required_fields: ['role_id', 'server_id'],
          validation: {
            email_format: true,
            max_retry: 3
          }
        },
        gameApplications: {
          game_code: 'Silver',
          region: 'CN',
          status: 'enabled',
          addCoinUrl: 'https://old-pay.example.com/success',
          notifyId: 'notify_1001',
          timeout_seconds: 10,
          retry_policy: {
            max_retry: 3,
            interval_seconds: 30
          }
        }
      }
      return map[scope] || {
        enabled: true,
        updated_by: 'system',
        data: {}
      }
    },
    setConfigPath(target, path, value) {
      let current = target
      path.forEach((segment, index) => {
        if (index === path.length - 1) {
          current[segment] = value === undefined || value === '' ? null : value
          return
        }
        if (!current[segment] || typeof current[segment] !== 'object') current[segment] = {}
        current = current[segment]
      })
    },
    deleteConfigPath(target, path) {
      let current = target
      path.forEach((segment, index) => {
        if (!current || typeof current !== 'object') return
        if (index === path.length - 1) {
          delete current[segment]
          return
        }
        current = current[segment]
      })
    },
    renderConfigObject(config, changedPaths, side) {
      const lines = ['{']
      this.renderConfigEntries(config, changedPaths, side, [], 1, lines)
      lines.push('}')
      return lines.map(line => (typeof line === 'string' ? { text: line, marker: ' ', className: '' } : line))
    },
    renderConfigEntries(config, changedPaths, side, path, indentLevel, lines) {
      const entries = Object.entries(config).sort(([left], [right]) => left.localeCompare(right))
      entries.forEach(([key, value], index) => {
        const currentPath = [...path, key]
        const indent = '  '.repeat(indentLevel)
        const comma = index === entries.length - 1 ? '' : ','
        const isObject = value && typeof value === 'object' && !Array.isArray(value)
        if (isObject) {
          lines.push({ text: `${indent}"${key}": {`, marker: ' ', className: '' })
          this.renderConfigEntries(value, changedPaths, side, currentPath, indentLevel + 1, lines)
          lines.push({ text: `${indent}}${comma}`, marker: ' ', className: '' })
          return
        }
        const changeType = changedPaths[currentPath.join('.')]
        const isChanged = Boolean(changeType)
        const marker = this.configLineMarker(changeType, side)
        const className = this.configLineClass(changeType, side)
        lines.push({
          text: `${indent}"${key}": ${this.formatConfigValue(value)}${comma}`,
          marker,
          className
        })
      })
    },
    configLineMarker(changeType, side) {
      if (changeType === 'added' && side === 'after') return '+'
      if (changeType === 'removed' && side === 'before') return '-'
      return ' '
    },
    configLineClass(changeType, side) {
      if (!changeType) return ''
      if (changeType === 'modified') return 'config-line--modified'
      if (changeType === 'added' && side === 'after') return 'config-line--added'
      if (changeType === 'removed' && side === 'before') return 'config-line--removed'
      return ''
    },
    openCreateRelease(draft = this.selectedDraft) {
      if (!draft) {
        this.$message.info('请先保存或选择一条草稿')
        return
      }
      this.selectedDraftId = draft.id
      this.createForm.title = draft.title.replace('草稿', '发布')
      this.createModalVisible = true
    },
    createRelease() {
      if (!this.selectedDraft) return
      const now = new Date()
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      const id = `REL-${stamp}-${String(this.releases.length + 1).padStart(3, '0')}`
      const draftSnapshot = JSON.parse(JSON.stringify(this.selectedDraft))
      const release = {
        id,
        region: draftSnapshot.region,
        env: draftSnapshot.env,
        title: this.createForm.title || draftSnapshot.title.replace('草稿', '发布'),
        operator: '管理员',
        status: 'reviewing',
        updatedAt: '刚刚',
        baseVersion: draftSnapshot.baseVersion,
        currentOnlineVersion: draftSnapshot.baseVersion,
        targetVersion: draftSnapshot.targetVersion,
        releaseMode: draftSnapshot.releaseMode,
        publishUnit: draftSnapshot.publishUnit,
        dependencyText: draftSnapshot.dependencyText,
        scopeText: draftSnapshot.scopeText,
        summary: draftSnapshot.summary,
        scopes: draftSnapshot.scopes,
        issues: draftSnapshot.issues,
        changes: draftSnapshot.changes,
        sourceDraftId: draftSnapshot.id,
        snapshotLockedAt: new Date().toLocaleString()
      }
      this.releases.unshift(release)
      this.draftQueue = this.draftQueue.filter(item => item.id !== draftSnapshot.id)
      this.activeReleaseId = release.id
      this.statusFilter = 'reviewing'
      this.ensureActiveDraft()
      this.createModalVisible = false
      this.$message.success('已创建发布并提交审核，草稿已从草稿池移除')
    },
    openPrePublishCheck(release = this.activeRelease) {
      if (!release || release.status !== 'approved') return
      this.activeReleaseId = release.id
      this.prePublishModalVisible = true
    },
    approveRelease(release) {
      if (!release || release.status !== 'reviewing') return
      this.activeReleaseId = release.id
      this.updateActiveStatus('approved')
      this.statusFilter = 'approved'
      this.$message.success('审核通过，发布单已进入待发布')
    },
    rejectRelease(release) {
      if (!release || release.status !== 'reviewing') return
      this.activeReleaseId = release.id
      this.updateActiveStatus('rejected')
      this.statusFilter = 'all'
      this.$message.success('发布单已驳回')
    },
    openReleaseRecord(release) {
      if (!release) return
      this.activeReleaseId = release.id
      this.releaseRecordVisible = true
    },
    confirmPrePublishCheck() {
      if (!this.canPublish) return
      this.prePublishModalVisible = false
      this.publishModalVisible = true
    },
    publishRelease() {
      this.updateActiveStatus('published')
      this.statusFilter = 'published'
      this.prePublishModalVisible = false
      this.publishModalVisible = false
      this.$message.success('发布成功，线上版本已更新')
    },
    updateActiveStatus(status) {
      const item = this.releases.find(release => release.id === this.activeReleaseId)
      if (item) {
        item.status = status
        item.updatedAt = '刚刚'
      }
    },
    resetDemo() {
      this.releases = JSON.parse(JSON.stringify(initialReleases))
      this.draftQueue = JSON.parse(JSON.stringify(initialDrafts))
      this.ensureActiveRelease()
      this.ensureActiveDraft()
      this.$message.success('Demo 数据已重置')
    }
  }
}
</script>

<style scoped>
.release-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.release-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-subtitle {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.relation-note {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
  padding: 9px 12px;
}

.relation-note strong {
  color: var(--color-text-primary);
}

.relation-note .icon {
  color: var(--color-text-tertiary);
}

.relation-note-separator {
  width: 1px;
  height: 14px;
  background: var(--color-border);
  margin: 0 2px;
}

.draft-panel,
.release-list-panel {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
}

.panel-desc {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.draft-panel {
  padding: 16px;
}

.draft-rule-note {
  margin-top: 12px;
  color: #ad6800;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: var(--radius-md);
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 10px;
}

.draft-flow {
  display: inline-flex;
  align-items: center;
  color: #0958d9;
  background: var(--color-primary-light);
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
}

.release-workspace {
  display: block;
}

.release-list-panel {
  padding: 16px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}

.release-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.release-filters {
  margin: 14px 0;
}

.filter-chip {
  border: 1px solid var(--color-border);
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
}

.filter-chip--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: #91caff;
  font-weight: 600;
}

.draft-table-wrap,
.release-table-wrap {
  margin-top: 14px;
  overflow-x: auto;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
}

.draft-table,
.release-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  background: #fff;
}

.draft-table th,
.draft-table td,
.release-table th,
.release-table td {
  border-bottom: 1px solid var(--color-border-secondary);
  padding: 12px;
  text-align: left;
  vertical-align: top;
}

.draft-table th,
.release-table th {
  color: var(--color-text-secondary);
  background: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.draft-table tbody tr:hover,
.release-table tbody tr:hover {
  background: #f7fbff;
}

.draft-table tbody tr:last-child td,
.release-table tbody tr:last-child td {
  border-bottom: 0;
}

.draft-table th:last-child,
.draft-table td:last-child,
.release-table th:last-child,
.release-table td:last-child {
  width: 150px;
  text-align: right;
}

.table-main-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.table-main-cell strong {
  color: var(--color-text-primary);
  font-size: 13px;
  line-height: 1.35;
}

.table-main-cell span {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.status-tag,
.validation-result,
.diff-count {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  padding: 4px 8px;
  white-space: nowrap;
}

.status-tag--draft {
  color: #8c6d1f;
  background: #fffbe6;
}

.status-tag--reviewing {
  color: #0958d9;
  background: #e6f4ff;
}

.status-tag--approved {
  color: #389e0d;
  background: #f6ffed;
}

.status-tag--published {
  color: #51606f;
  background: #f2f5f8;
}

.status-tag--rejected,
.status-tag--failed {
  color: #cf1322;
  background: #fff1f0;
}

.diff-count--added {
  color: #389e0d;
  background: #f6ffed;
}

.diff-count--modified {
  color: #0958d9;
  background: #e6f4ff;
}

.diff-count--removed {
  color: #cf1322;
  background: #fff1f0;
}

.action-stack {
  display: inline-flex;
  justify-content: flex-end;
  gap: 6px;
}

.prepublish-versions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
  margin-bottom: 12px;
}

.prepublish-versions div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  background: #f8fafc;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  padding: 10px;
}

.prepublish-versions span {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.prepublish-versions strong {
  overflow-wrap: anywhere;
}

.config-file-list {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.config-file-diff {
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  padding: 12px;
  background: #fff;
}

.config-file-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.config-file-head h4 {
  margin: 0 0 3px;
  font-size: 14px;
}

.config-file-head p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.config-file-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.config-diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.config-diff-pane {
  min-width: 0;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #fff;
}

.config-diff-title {
  color: var(--color-text-secondary);
  background: #f8fafc;
  border-bottom: 1px solid var(--color-border-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 10px;
}

.config-diff pre {
  margin: 0;
  overflow: auto;
  max-height: 220px;
  padding: 10px 0;
  font-size: 12px;
  line-height: 1.6;
  tab-size: 2;
}

.config-diff code {
  display: block;
  min-width: max-content;
  color: #263238;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  white-space: pre;
}

.config-diff code > span {
  display: block;
  padding: 0 10px;
}

.config-line-prefix {
  display: inline-block;
  width: 14px;
  padding: 0;
  color: var(--color-text-tertiary);
  user-select: none;
}

.config-line--removed {
  color: #a8071a;
  background: #fff1f0;
}

.config-line--removed .config-line-prefix {
  color: #cf1322;
}

.config-line--modified {
  color: #0958d9;
  background: #e6f4ff;
}

.config-line--modified .config-line-prefix {
  color: #1677ff;
}

.config-line--added {
  color: #237804;
  background: #f6ffed;
}

.config-line--added .config-line-prefix {
  color: #389e0d;
}

.validation-result {
  color: #ad6800;
  background: #fff7e6;
}

.validation-result--pass {
  color: #389e0d;
  background: #f6ffed;
}

.compact-empty {
  padding: 24px 12px;
}

.create-release-layout {
  display: grid;
  gap: 14px;
}

.form-row {
  display: grid;
  gap: 6px;
}

.form-label {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.draft-preview {
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  background: #f8fafc;
  padding: 14px;
}

.draft-preview h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.draft-preview ul {
  margin-left: 18px;
  color: var(--color-text-secondary);
}

.create-release-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.create-release-summary div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  background: #f8fafc;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  padding: 10px;
}

.create-release-summary span,
.create-release-note {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.create-release-summary strong {
  overflow-wrap: anywhere;
}

.create-release-note {
  border: 1px solid #ffe58f;
  background: #fffbe6;
  border-radius: var(--radius-md);
  padding: 9px 10px;
}

.prepublish-modal {
  display: grid;
  gap: 14px;
}

.prepublish-state-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-section {
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  background: #fff;
  padding: 14px;
}

.modal-section h3 {
  margin: 0 0 4px;
  font-size: 14px;
}

.modal-section p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.publish-confirm {
  display: grid;
  gap: 10px;
  color: var(--color-text-secondary);
}

.confirm-warning {
  color: #ad6800;
}

@media (max-width: 860px) {
  .release-header,
  .panel-header,
  .config-file-head {
    flex-direction: column;
    align-items: stretch;
  }

  .create-release-summary,
  .prepublish-versions {
    grid-template-columns: 1fr;
  }

  .config-diff {
    grid-template-columns: 1fr;
  }
}
</style>
