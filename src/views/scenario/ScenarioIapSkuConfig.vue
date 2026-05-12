<template>
  <div :class="embedded ? '' : 'page-container'">
    <div :class="embedded ? 'iap-sku-embedded' : 'page-content'">
      <div class="page-filters">
        <div class="filter-row">
          <div class="filter-item filter-item-wide">
            <label class="form-label" for="iap-filter-id">计费点 / GameGood ID</label>
            <input
              id="iap-filter-id"
              v-model="filters.keyword"
              class="input"
              type="text"
              placeholder="请输入计费点或 GameGood ID"
            />
          </div>
          <div class="filter-item">
            <label class="form-label" for="iap-filter-jump">是否跳转</label>
            <select id="iap-filter-jump" v-model="filters.jump" class="select">
              <option value="">全部</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary btn-sm" type="button" @click="handleSearch">搜索</button>
            <button class="btn btn-text btn-sm" type="button" @click="handleReset">重置</button>
          </div>
        </div>
      </div>

      <div class="section-head">
        <h2 class="section-title">计费点配置</h2>
        <span class="section-meta">已选择 {{ selectedCount }} 个商品</span>
        <div v-if="selectedCount > 0" class="section-batch-actions">
          <button class="btn btn-secondary btn-sm" type="button" @click="jumpModalVisible = true">设置跳转</button>
        </div>
        <div class="section-sync-actions">
          <button class="btn btn-secondary btn-sm btn-sync" type="button" @click="syncFromIapProducts">
            <Icon name="refresh" :size="14" />
            <span>从 IAP 重新同步</span>
          </button>
          <div class="sync-help-tooltip-wrap">
            <button
              type="button"
              class="sync-help-icon"
              aria-label="从 IAP 重新同步功能说明"
              aria-describedby="iap-sync-tooltip-desc"
            >
              ?
            </button>
            <div id="iap-sync-tooltip-desc" class="sync-help-bubble" role="tooltip">
              从<strong>相同支付环境</strong>、<strong>相同 platform</strong> 的 IAP 支付配置同步计费点商品（GameGood ID 与计费点）。<br />
              已存在商品的「是否跳转」「促销文案」<strong>不会被覆盖</strong>；本次同步<strong>新出现</strong>的商品默认「是否跳转」为<strong>否</strong>，促销文案为<strong>空</strong>。
            </div>
          </div>
        </div>
      </div>

      <table class="table iap-sku-table" role="table" aria-label="应用内SKU Web支付开关">
        <thead>
          <tr>
            <th class="th-check" scope="col">
              <label class="sr-only">全选</label>
              <input
                type="checkbox"
                :checked="allFilteredSelected"
                @change="toggleSelectAll($event)"
              />
            </th>
            <th scope="col">GameGood ID</th>
            <th scope="col">计费点</th>
            <th scope="col">
              是否跳转
              <span class="th-help" title="开启后，C 端消费者可选择 Web 支付，将弹出支付方式选择">?</span>
            </th>
            <th scope="col">
              促销文案
              <span class="th-help" title="用于收银台展示的促销文案">?</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredRows.length === 0">
            <td colspan="5" class="empty-cell">暂无数据</td>
          </tr>
          <tr v-for="row in filteredRows" :key="row.gameGoodsId + row.sku">
            <td class="td-check">
              <input
                type="checkbox"
                :checked="selectedIds.has(row.gameGoodsId)"
                @change="toggleRow(row.gameGoodsId, $event)"
              />
            </td>
            <td>{{ row.gameGoodsId }}</td>
            <td><code class="sku-code">{{ row.sku }}</code></td>
            <td>
              <label class="ui-switch">
                <input v-model="row.webPayEnabled" type="checkbox" @change="updateRowSetting(row)" />
                <span class="ui-switch-slider" aria-hidden="true" />
              </label>
            </td>
            <td>
              <input
                v-model="row.englishPromotion"
                class="input input-promo"
                type="text"
                placeholder="请输入促销文案"
                @input="updateRowSetting(row)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div class="page-footer">
        <button class="btn btn-primary btn-save-lg" type="button" :disabled="!hasUnsavedChanges" @click="handleSave">
          保存
        </button>
      </div>

      <Modal v-model:visible="jumpModalVisible" title="设置跳转" size="small">
        <div class="batch-modal-body">
          <label class="batch-modal-option">
            <input v-model="pendingBatchJump" type="radio" :value="true" />
            <span>开启</span>
          </label>
          <label class="batch-modal-option">
            <input v-model="pendingBatchJump" type="radio" :value="false" />
            <span>关闭</span>
          </label>
        </div>
        <template #footer>
          <button type="button" class="btn btn-secondary" @click="jumpModalVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="confirmBatchJump">确定</button>
        </template>
      </Modal>
    </div>
  </div>
</template>

<script>
import { getAllScenarios, getScenarioByKey } from '@/utils/scenarios'
import { IAP_GOODS_ROWS } from '@/utils/iapGoods'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'

const IAP_SKU_SETTINGS_SEED = []
export default {
  name: 'ScenarioIapSkuConfig',
  components: {
    Icon,
    Modal
  },
  props: {
    scenarioKey: {
      type: String,
      default: ''
    },
    region: {
      type: String,
      default: 'overseas'
    },
    embedded: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      filters: {
        keyword: '',
        jump: ''
      },
      jumpModalVisible: false,
      pendingBatchJump: true,
      selectedIds: new Set(),
      savedSignatures: {},
      rowSettings: IAP_SKU_SETTINGS_SEED.reduce((acc, item) => {
        acc[`${item.scenario}:${item.gameGoodsId}`] = {
          webPayEnabled: !!item.webPayEnabled,
          englishPromotion: item.englishPromotion || ''
        }
        return acc
      }, {})
    }
  },
  computed: {
    currentScenario() {
      if (!this.scenarioKey) return null
      return getScenarioByKey(this.scenarioKey, this.region)
    },
    sourceIapScenarioKey() {
      const current = this.currentScenario
      if (!current) return ''
      const match = getAllScenarios(this.region).find(
        s => !s.is_web_cashier && s.platform === current.platform && s.payment_env === current.payment_env
      )
      return match ? match.key : ''
    },
    scenarioRows() {
      if (!this.scenarioKey || !this.sourceIapScenarioKey) return []
      return IAP_GOODS_ROWS
        .filter(row => row.scenario === this.sourceIapScenarioKey)
        .map(row => {
          const setting = this.rowSettings[`${this.scenarioKey}:${row.gameGoodsId}`] || {}
          return {
            ...row,
            webPayEnabled: !!setting.webPayEnabled,
            englishPromotion: setting.englishPromotion || ''
          }
        })
    },
    filteredRows() {
      let rows = this.scenarioRows
      const kw = this.filters.keyword.trim().toLowerCase()
      if (kw) {
        rows = rows.filter(
          r =>
            String(r.gameGoodsId).includes(kw) ||
            (r.sku && r.sku.toLowerCase().includes(kw))
        )
      }
      if (this.filters.jump === 'yes') rows = rows.filter(r => r.webPayEnabled)
      if (this.filters.jump === 'no') rows = rows.filter(r => !r.webPayEnabled)
      return rows
    },
    selectedCount() {
      return this.selectedIds.size
    },
    filteredIds() {
      return new Set(this.filteredRows.map(r => r.gameGoodsId))
    },
    allFilteredSelected() {
      if (this.filteredRows.length === 0) return false
      return this.filteredRows.every(r => this.selectedIds.has(r.gameGoodsId))
    },
    currentSignature() {
      return JSON.stringify(
        this.scenarioRows.map(row => ({
          gameGoodsId: row.gameGoodsId,
          webPayEnabled: !!row.webPayEnabled,
          englishPromotion: row.englishPromotion || ''
        }))
      )
    },
    hasUnsavedChanges() {
      const saved = this.savedSignatures[this.scenarioKey] || ''
      return this.currentSignature !== saved
    }
  },
  watch: {
    scenarioKey() {
      this.selectedIds = new Set()
      this.filters = { keyword: '', jump: '' }
      this.$nextTick(() => {
        this.markScenarioAsSaved()
      })
    },
    scenarioRows: {
      immediate: true,
      handler() {
        if (!this.scenarioKey) return
        if (!this.savedSignatures[this.scenarioKey]) {
          this.markScenarioAsSaved()
        }
      }
    }
  },
  methods: {
    markScenarioAsSaved() {
      if (!this.scenarioKey) return
      this.savedSignatures = {
        ...this.savedSignatures,
        [this.scenarioKey]: this.currentSignature
      }
    },
    handleSearch() {
      // 依赖 computed 过滤
    },
    handleReset() {
      this.filters = { keyword: '', jump: '' }
    },
    toggleRow(id, ev) {
      const next = new Set(this.selectedIds)
      if (ev.target.checked) next.add(id)
      else next.delete(id)
      this.selectedIds = next
    },
    toggleSelectAll(ev) {
      const next = new Set(this.selectedIds)
      const ids = this.filteredIds
      if (ev.target.checked) {
        ids.forEach(id => next.add(id))
      } else {
        ids.forEach(id => next.delete(id))
      }
      this.selectedIds = next
    },
    updateRowSetting(row) {
      this.rowSettings = {
        ...this.rowSettings,
        [`${this.scenarioKey}:${row.gameGoodsId}`]: {
          webPayEnabled: !!row.webPayEnabled,
          englishPromotion: row.englishPromotion || ''
        }
      }
    },
    applySelectedJump(enabled) {
      const nextSettings = { ...this.rowSettings }
      this.selectedIds.forEach(id => {
        const key = `${this.scenarioKey}:${id}`
        const prev = nextSettings[key] || {}
        nextSettings[key] = {
          webPayEnabled: enabled,
          englishPromotion: prev.englishPromotion || ''
        }
      })
      this.rowSettings = nextSettings
    },
    async confirmBatchJump() {
      if (this.selectedIds.size === 0) {
        this.jumpModalVisible = false
        return
      }
      try {
        await this.$confirm.confirm({
          type: 'warning',
          title: '确认批量设置跳转',
          message: '确定将选中商品按当前设置更新跳转状态吗？'
        })
      } catch {
        return
      }
      this.applySelectedJump(this.pendingBatchJump === true)
      this.jumpModalVisible = false
    },
    async handleSave() {
      if (!this.hasUnsavedChanges) return
      try {
        await this.$confirm.confirm({
          type: 'warning',
          title: '保存端内计费点跳转Web支付开关',
          message: '确认保存当前修改吗？保存后配置才会生效。'
        })
      } catch {
        return
      }
      this.markScenarioAsSaved()
      this.$message.success('保存成功')
    },
    syncFromIapProducts() {
      if (!this.scenarioKey || !this.sourceIapScenarioKey) return
      const sourceRows = IAP_GOODS_ROWS.filter(row => row.scenario === this.sourceIapScenarioKey)
      const validIds = new Set(sourceRows.map(row => row.gameGoodsId))
      const nextSettings = {}

      Object.keys(this.rowSettings).forEach(key => {
        const [scenario, goodsIdRaw] = key.split(':')
        if (scenario !== this.scenarioKey) {
          nextSettings[key] = this.rowSettings[key]
          return
        }
        const goodsId = Number(goodsIdRaw)
        if (validIds.has(goodsId)) {
          nextSettings[key] = this.rowSettings[key]
        }
      })

      sourceRows.forEach(row => {
        const key = `${this.scenarioKey}:${row.gameGoodsId}`
        if (!nextSettings[key]) {
          nextSettings[key] = {
            webPayEnabled: false,
            englishPromotion: ''
          }
        }
      })

      this.rowSettings = nextSettings
      this.selectedIds = new Set([...this.selectedIds].filter(id => validIds.has(id)))
      this.$message.success('已同步 IAP 计费点商品数据')
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-content,
.iap-sku-embedded {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--spacing-lg);
}

.page-filters {
  margin-bottom: var(--spacing-xl);
}

.filter-row {
  display: flex;
  gap: var(--spacing-base);
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-item {
  flex: 0 0 auto;
  min-width: 160px;
}

.filter-item-wide {
  min-width: 280px;
  flex: 1 1 280px;
}

.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.filter-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-left: auto;
  align-items: flex-end;
}

.section-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.section-sync-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.section-batch-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.batch-modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-modal-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.btn-sync {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sync-help-tooltip-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.sync-help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: var(--color-text-tertiary);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  cursor: help;
  flex-shrink: 0;
}

.sync-help-icon:hover,
.sync-help-icon:focus-visible {
  color: var(--color-primary, #1677ff);
  border-color: var(--color-primary, #1677ff);
}

.sync-help-bubble {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  visibility: hidden;
  opacity: 0;
  width: max-content;
  max-width: min(320px, 85vw);
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.55;
  color: #fff;
  text-align: left;
  white-space: normal;
  background: rgba(0, 0, 0, 0.88);
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease;
}

.sync-help-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -6px;
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.88);
}

.sync-help-tooltip-wrap:hover .sync-help-bubble,
.sync-help-tooltip-wrap:focus-within .sync-help-bubble {
  visibility: visible;
  opacity: 1;
}

.section-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.th-check,
.td-check {
  width: 48px;
  text-align: center;
  vertical-align: middle;
}

.th-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  cursor: help;
  vertical-align: middle;
}

.sku-code {
  font-size: var(--font-size-xs);
  word-break: break-all;
  background: var(--color-bg, #f5f5f5);
  padding: 2px 6px;
  border-radius: 3px;
}

.input-promo {
  min-width: 200px;
  max-width: 100%;
}

.page-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-secondary);
}

.btn-save-lg {
  min-width: 96px;
  height: 40px;
  padding: 0 20px;
  font-size: var(--font-size-base);
  font-weight: 600;
}

.empty-cell {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-tertiary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ui-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
  vertical-align: middle;
  cursor: pointer;
}

.ui-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.ui-switch-slider {
  position: absolute;
  inset: 0;
  background: #d9d9d9;
  border-radius: 11px;
  transition: background 0.2s;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset;
}

.ui-switch-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.ui-switch input:checked + .ui-switch-slider {
  background: var(--color-primary, #1677ff);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04) inset;
}

.ui-switch input:checked + .ui-switch-slider::before {
  transform: translateX(22px);
}
</style>
