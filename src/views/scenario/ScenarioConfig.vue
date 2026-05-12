<template>
  <div class="page-container" :class="{ 'scenario-config--embedded': isEmbedded }">
    <div class="page-header">
      <button
        v-if="!isEmbedded"
        type="button"
        class="back-link"
        @click="goBackToScenarioList"
      >
        <span class="back-icon" aria-hidden="true">←</span>
        <span>返回场景列表</span>
      </button>
      <div class="header-info" v-if="currentScenarioObj">
        <h1 class="page-title">{{ currentScenarioObj.platform }}</h1>
      </div>
    </div>

    <div class="tabs" role="tablist" aria-label="场景配置tabs">
      <button
        v-if="showGoodsTab"
        class="tab-item"
        type="button"
        :class="{ 'tab-active': activeTab === 'goods' }"
        @click="switchTab('goods')"
      >
        {{ goodsTabLabel }}
      </button>
      <button
        v-if="showCashierTemplateTab"
        class="tab-item"
        type="button"
        :class="{ 'tab-active': activeTab === 'cashier' }"
        @click="switchTab('cashier')"
      >
        收银台配置
      </button>
    </div>

    <div class="tab-content">
      <div
        v-if="showCashierTemplateTab && activeTab === 'cashier' && scenarioId"
        class="cashier-tab-pane"
      >
        <div class="cashier-entry card-like">
          <h2 class="cashier-entry-title">收银台模版关联</h2>
          <dl class="cashier-entry-stats">
            <div class="cashier-entry-row">
              <dt>已关联模版</dt>
              <dd>{{ cashierLinkedCount }} 个</dd>
            </div>
            <div class="cashier-entry-row">
              <dt>默认模版</dt>
              <dd>
                <code v-if="cashierDefaultIdDisplay" class="cashier-entry-code">{{ cashierDefaultIdDisplay }}</code>
                <span v-else class="cashier-entry-muted">未设置</span>
              </dd>
            </div>
          </dl>
          <div class="cashier-entry-actions" role="group" aria-label="收银台配置操作">
            <template v-if="!hasLinkedCashierTemplates">
              <button type="button" class="btn btn-primary" @click="openCashierCreateModal">
                创建收银台配置
              </button>
            </template>
            <template v-else>
              <button type="button" class="btn btn-primary" @click="openCashierDrawerEdit">
                编辑配置
              </button>
              <button type="button" class="btn btn-secondary" @click="openCashierDrawerView">
                查看配置
              </button>
            </template>
          </div>
        </div>
      </div>
      <GoodsConfig
        v-if="showGoodsTab && activeTab === 'goods' && scenarioKey"
        :key="'goods_' + scenarioKey"
        :scenario="scenarioKey"
        :is-web="needsCashierTemplate"
        embedded
      />
    </div>

    <Drawer
      v-model:visible="cashierDrawerVisible"
      :title="cashierDrawerTitle"
      :width="920"
      @close="onCashierDrawerClose"
    >
      <ScenarioCashierTemplateBind
        v-if="cashierDrawerVisible"
        :key="'cashier_drawer_' + scenarioId + '_' + (cashierDrawerReadonly ? 'v' : 'e')"
        :scenario-numeric-id="scenarioId"
        :region="region"
        :embedded="true"
        :readonly="cashierDrawerReadonly"
        @saved="onCashierBindSaved"
      />
    </Drawer>

    <Modal
      v-model:visible="cashierCreateModalVisible"
      title="创建收银台配置"
      size="xlarge"
      @close="onCashierCreateModalClose"
    >
      <div class="cashier-modal-bind">
        <ScenarioCashierTemplateBind
          v-if="cashierCreateModalVisible"
          :key="'cashier_modal_' + scenarioId"
          :scenario-numeric-id="scenarioId"
          :region="region"
          :embedded="true"
          :readonly="false"
          @saved="onCashierBindSaved"
        />
      </div>
    </Modal>
  </div>
</template>

<script>
import { getScenarioById } from '@/utils/scenarios'
import GoodsConfig from '@/views/goods/GoodsConfig.vue'
import ScenarioCashierTemplateBind from '@/views/scenario/ScenarioCashierTemplateBind.vue'
import Drawer from '@/components/Drawer.vue'
import Modal from '@/components/Modal.vue'

const VALID_TABS = ['goods', 'cashier']

/** Vue Router 的 query 值可能是 string | string[]，需归一成合法 tab 字符串 */
function normalizeRouteTabQuery(raw) {
  let v = raw
  if (Array.isArray(v)) v = v[0]
  if (typeof v !== 'string' || !v) return 'goods'
  return VALID_TABS.includes(v) ? v : 'goods'
}

export default {
  name: 'ScenarioConfig',
  components: {
    GoodsConfig,
    ScenarioCashierTemplateBind,
    Drawer,
    Modal
  },
  props: {
    /** 抽屉内嵌时传入场景 id，不再依赖路由 params */
    externalScenarioId: {
      type: [String, Number],
      default: null
    }
  },
  emits: ['close'],
  data() {
    return {
      activeTab: 'goods',
      cashierDrawerVisible: false,
      cashierDrawerReadonly: false,
      cashierCreateModalVisible: false
    }
  },
  computed: {
    region() {
      return this.$route.meta?.region || 'overseas'
    },
    isEmbedded() {
      return this.externalScenarioId != null && this.externalScenarioId !== ''
    },
    scenarioListPath() {
      return this.region === 'domestic' ? '/domestic/scenario' : '/scenario'
    },
    scenarioId() {
      if (this.isEmbedded) return String(this.externalScenarioId)
      return this.$route.params.id || ''
    },
    currentScenarioObj() {
      return getScenarioById(this.scenarioId, this.region)
    },
    selectedTemplateConfigs() {
      return Array.isArray(this.currentScenarioObj?.template_configs) ? this.currentScenarioObj.template_configs : []
    },
    hasGoodsTemplate() {
      return this.selectedTemplateConfigs.includes('计费点配置')
    },
    hasGoodsPointTemplate() {
      return this.selectedTemplateConfigs.includes('计费点配置')
    },
    hasCashierTemplate() {
      return this.selectedTemplateConfigs.includes('收银台模版配置')
    },
    scenarioPaymentFormBadge() {
      const s = this.currentScenarioObj
      if (!s) return ''
      if (!s.is_web_cashier) return 'IAP支付'
      if (s.web_pay_scene === 'embedded_browser') return 'Web收银台 · 端内'
      return 'Web收银台 · 端外'
    },
    scenarioKey() {
      return this.currentScenarioObj?.key || ''
    },
    needsCashierTemplate() {
      return !!this.currentScenarioObj?.is_web_cashier
    },
    /** IAP 场景（非 Web 收银台）下「计费点」页签对应计费点配置；Web 场景同名 */
    goodsTabLabel() {
      if (this.hasGoodsTemplate) return '计费点配置'
      if (this.hasGoodsPointTemplate) return '计费点配置'
      return '计费点配置'
    },
    showGoodsTab() {
      if (!this.currentScenarioObj) return false
      return this.hasGoodsTemplate || this.hasGoodsPointTemplate
    },
    showCashierTemplateTab() {
      const s = this.currentScenarioObj
      if (!s || !this.hasCashierTemplate) return false
      if (this.region === 'domestic') {
        return !!s.is_web_cashier
      }
      // 海外：只要 Web 开关开启，就展示收银台配置 Tab
      return !!s.web_enabled
    },
    availableTabs() {
      const tabs = []
      if (this.showGoodsTab) tabs.push('goods')
      if (this.showCashierTemplateTab) tabs.push('cashier')
      return tabs
    },
    cashierLinkedCount() {
      const s = this.currentScenarioObj
      if (!s) return 0
      const raw = s.cashier_public_template_ids
      if (!Array.isArray(raw)) return 0
      return raw.filter(x => x != null && String(x).trim() !== '').length
    },
    cashierDefaultIdDisplay() {
      const id = this.currentScenarioObj?.cashier_default_public_template_id
      if (id == null) return ''
      const t = String(id).trim()
      return t || ''
    },
    /** 已有至少一条已保存的模版关联：主入口为抽屉「编辑」；否则仅弹窗「创建」 */
    hasLinkedCashierTemplates() {
      return this.cashierLinkedCount > 0
    },
    cashierDrawerTitle() {
      return this.cashierDrawerReadonly ? '查看收银台配置' : '编辑收银台配置'
    }
  },
  mounted() {
    this.syncActiveTabFromRoute()
    this.validateActiveTab()
  },
  watch: {
    externalScenarioId() {
      this.activeTab = 'goods'
      this.closeCashierOverlays()
      this.validateActiveTab()
    },
    scenarioId() {
      this.syncActiveTabFromRoute()
      this.validateActiveTab()
      this.closeCashierOverlays()
    },
    /** 浏览器前进/后退或外链带 query 时与 URL 对齐 */
    '$route.query.tab'() {
      if (this.isEmbedded) return
      const next = normalizeRouteTabQuery(this.$route.query.tab)
      if (next !== this.activeTab) {
        this.activeTab = next
        this.validateActiveTab()
      }
    },
    /** 仅在同一场景引用变化时校验（避免 deep 监听导致频繁 replace 与返回导航竞态） */
    currentScenarioObj() {
      this.validateActiveTab()
    }
  },
  methods: {
    closeCashierOverlays() {
      this.cashierDrawerVisible = false
      this.cashierDrawerReadonly = false
      this.cashierCreateModalVisible = false
    },
    openCashierDrawerEdit() {
      this.cashierCreateModalVisible = false
      this.cashierDrawerReadonly = false
      this.cashierDrawerVisible = true
    },
    openCashierDrawerView() {
      this.cashierCreateModalVisible = false
      this.cashierDrawerReadonly = true
      this.cashierDrawerVisible = true
    },
    openCashierCreateModal() {
      this.cashierDrawerVisible = false
      this.cashierCreateModalVisible = true
    },
    onCashierDrawerClose() {
      this.cashierDrawerVisible = false
      this.cashierDrawerReadonly = false
    },
    onCashierCreateModalClose() {
      this.cashierCreateModalVisible = false
    },
    onCashierBindSaved() {
      this.closeCashierOverlays()
    },
    syncActiveTabFromRoute() {
      this.activeTab = normalizeRouteTabQuery(this.$route?.query?.tab)
    },
    goBackToScenarioList() {
      if (this.isEmbedded) {
        this.$emit('close')
        return
      }
      this.$router.push(this.scenarioListPath).catch(() => {})
    },
    validateActiveTab() {
      const tabs = this.availableTabs
      const fallback = tabs[0] || 'goods'
      if (!tabs.includes(this.activeTab)) {
        this.activeTab = fallback
        this.updateQuery()
      }
    },
    switchTab(tab) {
      if (!this.availableTabs.includes(tab)) return
      this.activeTab = tab
      if (tab !== 'cashier') {
        this.closeCashierOverlays()
      }
      this.updateQuery()
    },
    updateQuery() {
      if (this.isEmbedded) return
      const r = this.$route
      const query = { ...r.query, tab: this.activeTab }
      delete query.cashier_sub
      const loc = r.name
        ? { name: r.name, params: { ...r.params }, query }
        : { path: r.path, query }
      this.$router.replace(loc).catch(() => {})
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.scenario-config--embedded.page-container {
  max-width: none;
  margin: 0;
}

.page-header {
  position: relative;
  z-index: 2;
  margin-bottom: var(--spacing-lg);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 var(--spacing-md);
  padding: 0;
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-decoration: none;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}

.back-link:hover {
  color: var(--color-primary);
}

.back-icon {
  font-size: 14px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.scenario-id {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.scenario-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
}

.badge--iap {
  background: #e6f7ff;
  color: #0070c0;
}

.badge--web {
  background: #f0faf0;
  color: #389e0d;
}

.scenario-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.tabs {
  position: relative;
  z-index: 5;
  display: flex;
  gap: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-xl);
}

.tab-item {
  padding: var(--spacing-md) var(--spacing-xl);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: var(--transition);
}

.tab-item:hover {
  color: var(--color-primary);
}

.tab-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

.tab-content {
  min-height: 400px;
}

.cashier-tab-pane {
  max-width: 960px;
}

.cashier-entry.card-like {
  padding: var(--spacing-xl);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg, 8px);
  background: var(--color-bg-container, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.cashier-entry-title {
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.cashier-entry-stats {
  margin: 0 0 var(--spacing-xl);
}

.cashier-entry-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-sm) var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border-secondary);
}

.cashier-entry-row:last-child {
  border-bottom: none;
}

.cashier-entry-row dt {
  margin: 0;
  min-width: 96px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.cashier-entry-row dd {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.cashier-entry-code {
  font-size: 13px;
  word-break: break-all;
}

.cashier-entry-muted {
  color: var(--color-text-tertiary);
}

.cashier-entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.cashier-modal-bind {
  margin: calc(-1 * var(--spacing-lg)) 0;
  max-height: min(72vh, 900px);
  overflow-y: auto;
}
</style>
