<template>
  <div class="cashier-template-list" :class="embedded ? '' : 'page-container'">
    <div v-if="!embedded" class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" type="button" aria-label="创建配置" @click="handleCreateConfig">
          <Icon name="plus" :size="16" />
          <span>创建配置</span>
        </button>
      </div>
    </div>

    <div v-if="embedded" class="embedded-header">
      <div class="header-actions">
        <button class="btn btn-primary" type="button" aria-label="创建配置" @click="handleCreateConfig">
          <Icon name="plus" :size="16" />
          <span>创建配置</span>
        </button>
      </div>
    </div>

    <div class="page-filters">
      <div class="filter-row">
        <div class="filter-item">
          <label for="filter-currency" class="form-label">币种：</label>
          <select
            id="filter-currency"
            v-model="filters.currency"
            class="select"
            :class="{ 'select--empty': !filters.currency }"
            aria-label="币种"
          >
            <option value="">全部币种</option>
            <option v-for="currency in currencies" :key="currency.code" :value="currency.code">{{ currency.code }} - {{ currency.name }}</option>
          </select>
        </div>
        <div v-if="resolvedRegion === 'domestic'" class="filter-item">
          <label for="filter-domestic-cashier-type" class="form-label">模版类型</label>
          <select
            id="filter-domestic-cashier-type"
            v-model="filters.domestic_cashier_kind"
            class="select"
            aria-label="收银台模版类型"
          >
            <option value="">全部类型</option>
            <option value="native">原生收银台</option>
            <option value="web">Web 收银台</option>
          </select>
        </div>
        <div class="filter-actions">
          <button type="button" class="btn btn-primary" aria-label="查询" @click="handleSearch">查询</button>
          <button type="button" class="btn btn-secondary" aria-label="重置筛选" @click="handleReset">重置</button>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div v-if="loading" class="loading-container">
        <div class="loading"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="error" class="alert alert-error" role="alert">
        <span>✗</span>
        <span>{{ error }}</span>
      </div>

      <table class="table" role="table" aria-label="支付方式排序列表">
        <thead>
          <tr role="row">
            <th role="columnheader" scope="col">模版名称</th>
            <th v-if="resolvedRegion === 'domestic'" role="columnheader" scope="col" class="th-template-kind">模版类型</th>
            <th v-if="resolvedRegion === 'domestic'" role="columnheader" scope="col" class="th-simulator">模拟器</th>
            <th role="columnheader" scope="col" class="th-currency">币种</th>
            <th role="columnheader" scope="col" class="th-method-count">支付方式数量</th>
            <th v-if="resolvedRegion === 'domestic'" role="columnheader" scope="col" class="th-pay-switch">
              <div class="pay-switch-th">
                <span class="pay-switch-th-text">模版开关</span>
                <div class="pay-switch-help-wrap">
                  <button
                    type="button"
                    class="pay-switch-help-icon"
                    aria-label="模版开关说明"
                    aria-describedby="sort-list-pay-switch-tooltip"
                  >
                    ?
                  </button>
                  <div
                    id="sort-list-pay-switch-tooltip"
                    class="pay-switch-tooltip"
                    role="tooltip"
                  >
                    用于控制收银台模版是否处于已发布状态；关闭即为下线，下线后模版不可用，可能影响线上真实交易。未命中具体模版时的兜底默认请在「支付场景管理」对应场景的「收银台配置」中设置。
                  </div>
                </div>
              </div>
            </th>
            <th role="columnheader" scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sortList" :key="'sort_' + paymentSortRowKey(item)" role="row">
            <td role="cell">
              <span class="template-display-name">{{ getCashierTemplateDisplayName(item) }}</span>
            </td>
            <td v-if="resolvedRegion === 'domestic'" role="cell">
              {{ formatDomesticCashierKind(item) }}
            </td>
            <td v-if="resolvedRegion === 'domestic'" role="cell">
              <span v-if="item.is_simulator" class="badge badge-success">是</span>
              <span v-else class="badge badge-secondary">否</span>
            </td>
            <td role="cell">{{ item.currency }}</td>
            <td role="cell">
              <span class="stat-number">{{ item.method_count }}</span>
              <span class="stat-unit">个</span>
            </td>
            <td v-if="resolvedRegion === 'domestic'" role="cell" class="td-pay-switch" @click.stop>
              <label class="channel-switch">
                <input
                  type="checkbox"
                  :checked="isCashierTemplatePublished(item)"
                  :disabled="!!sortStatusToggling[sortRowToggleKey(item)]"
                  :aria-label="`${getCashierTemplateDisplayName(item)} 模版发布开关`"
                  @change="onCashierPublishStatusChange(item, $event)"
                />
                <span class="channel-switch-slider" aria-hidden="true" />
              </label>
            </td>
            <td role="cell" class="table-cell-actions">
              <button
                class="btn btn-text table-action-link"
                @click="handleEditSort(item)"
                aria-label="编辑收银台配置"
              >
                <span>编辑</span>
              </button>
              <button
                class="btn btn-text table-action-link"
                @click="handleViewSort(item)"
                aria-label="查看收银台配置"
              >
                <span>查看</span>
              </button>
              <button v-if="resolvedRegion === 'overseas'" type="button" class="btn btn-text table-action-link delete-action" :disabled="!!deletingKeys[paymentSortRowKey(item)]" :aria-label="`删除 ${getCashierTemplateDisplayName(item)}`" @click="handleDeleteSort(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && !error && sortList.length === 0" class="empty-state">
        <p>暂无数据</p>
      </div>

      <!-- 分页 -->
      <div v-if="!loading && !error && total > 0" class="pagination">
        <div class="pagination-info">
          共 {{ total }} 条记录，第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="pagination-controls">
          <button
            class="btn btn-text"
            :disabled="currentPage === 1"
            @click="handlePageChange(currentPage - 1)"
            aria-label="上一页"
          >
            <Icon name="arrowLeft" :size="16" />
            <span>上一页</span>
          </button>
          <button
            class="btn btn-text"
            :disabled="currentPage === totalPages"
            @click="handlePageChange(currentPage + 1)"
            aria-label="下一页"
          >
            <span>下一页</span>
            <Icon name="arrowRight" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <Modal
      v-model:visible="createModalVisible"
      title="创建收银台配置"
      size="large"
      variant="cashier"
      @close="onSortCreateModalClose"
    >
      <PaymentSort
        v-if="createModalVisible"
        :key="sortCreateModalKey"
        mode="modal"
        :prefill="createPayload"
        :region="resolvedRegion"
        @saved="handleCreateModalSaved"
        @cancel="onSortCreateModalClose"
      />
    </Modal>

    <Drawer
      v-model:visible="drawerVisible"
      :title="drawerTitle"
      :width="760"
      :show-header="true"
      @close="onSortDrawerClose"
    >
      <PaymentSort
        v-if="drawerVisible"
        :key="sortDrawerEditKey"
        mode="drawer"
        :prefill="drawerPayload"
        :readonly="drawerReadonly"
        :region="resolvedRegion"
        @saved="handleDrawerSaved"
        @cancel="onSortDrawerClose"
      />
    </Drawer>
  </div>
</template>

<script>
import { paymentAPI } from '@/api'
import { getPaymentEnvByScenario, getIsWebCashierByScenario } from '@/utils/scenarios'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'
import PaymentSort from './PaymentSort.vue'
import { getCashierPublicTemplateId, paymentSortRowKey } from '@/utils/cashierPublicTemplateId.js'
import { cashierCurrencies } from '@/utils/cashierCurrencies.js'

export default {
  name: 'PaymentSortList',
  components: {
    Icon,
    Modal,
    Drawer,
    PaymentSort
  },
  props: {
    scenario: {
      type: String,
      default: ''
    },
    embedded: {
      type: Boolean,
      default: false
    },
    region: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      sortList: [],
      currencies: cashierCurrencies,
      deletingKeys: {},
      loading: false,
      error: null,
      createModalVisible: false,
      createPayload: null,
      drawerVisible: false,
      drawerPayload: null,
      drawerReadonly: false,
      filters: {
        currency: '',
        payment_env: '',
        /** domestic: '' | 'native' | 'web' */
        domestic_cashier_kind: ''
      },
      currentPage: 1,
      pageSize: 10,
      total: 0,
      sortStatusToggling: {}
    }
  },
  computed: {
    resolvedRegion() {
      return this.region || this.$route.meta?.region || 'overseas'
    },
    pageTitle() {
      return this.$route.meta?.title || '全局收银台模版'
    },
    totalPages() {
      return Math.ceil(this.total / this.pageSize)
    },
    drawerTitle() {
      return this.drawerReadonly ? '查看收银台配置' : '收银台配置'
    },
    sortCreateModalKey() {
      if (!this.createModalVisible) return 'closed'
      return `sort-create-${JSON.stringify(this.createPayload || {})}`
    },
    sortDrawerEditKey() {
      if (!this.drawerVisible) return 'closed'
      const p = this.drawerPayload || {}
      return [
        p.template_id,
        p.app_id,
        p.country_code,
        p.currency,
        p.payment_env,
        p.is_web_cashier
      ].join('|')
    }
  },
  watch: {
    resolvedRegion(next, prev) {
      if (next === prev) return
      this.onSortCreateModalClose()
      this.onSortDrawerClose()
      this.handleReset()
    },
    scenario: {
      immediate: false,
      handler() {
        this.applyScenarioFilter()
        this.currentPage = 1
        this.fetchList()
      }
    }
  },
  mounted() {
    this.applyScenarioFilter()
    this.fetchList()
  },
  methods: {
    paymentSortRowKey,
    applyScenarioFilter() {
      if (this.scenario) {
        this.filters.payment_env = getPaymentEnvByScenario(this.scenario)
      }
    },
    handleCreateConfig() {
      const payload = {}
      if (this.resolvedRegion === 'domestic') {
        payload.country_code = 'CN'
        payload.currency = 'CNY'
      }
      if (this.scenario) {
        payload.scenario = this.scenario
        payload.payment_env = getPaymentEnvByScenario(this.scenario)
        payload.is_web_cashier = getIsWebCashierByScenario(this.scenario)
      }
      this.createPayload = payload
      this.createModalVisible = true
    },
    onSortCreateModalClose() {
      this.createModalVisible = false
      this.createPayload = null
    },
    async handleCreateModalSaved() {
      this.onSortCreateModalClose()
      this.filters.currency = ''
      this.filters.domestic_cashier_kind = ''
      this.currentPage = 1
      await this.fetchList()
      if (this.totalPages > 1) {
        this.currentPage = this.totalPages
        await this.fetchList()
      }
    },
    async fetchList() {
      this.loading = true
      this.error = null
      try {
        const params = {
          page: this.currentPage,
          page_size: this.pageSize,
          region: this.resolvedRegion,
          scenario: this.scenario || 'global',
          ...this.filters
        }
        if (this.scenario) {
          params.is_web_cashier = getIsWebCashierByScenario(this.scenario)
        } else if (this.resolvedRegion === 'domestic' && this.filters.domestic_cashier_kind === 'web') {
          params.is_web_cashier = true
        } else if (this.resolvedRegion === 'domestic' && this.filters.domestic_cashier_kind === 'native') {
          params.is_web_cashier = false
        }
        const res = await paymentAPI.getPaymentSortList(params)
        if (res.code === 200) {
          this.sortList = res.data.list || []
          this.total = res.data.total
        } else {
          this.error = res.message || '获取数据失败'
        }
      } catch (err) {
        this.error = err.message || '获取数据失败'
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    handlePageChange(page) {
      this.currentPage = page
      this.fetchList()
    },
    getCashierTemplateId(item) {
      return getCashierPublicTemplateId(item)
    },
    getCashierTemplateDisplayName(item) {
      const n = item && item.cashier_template_name != null ? String(item.cashier_template_name).trim() : ''
      return n || this.getCashierTemplateId(item)
    },
    handleEditSort(item) {
      this.drawerPayload = {
        template_id: item.template_id,
        legacy_row_key: item.template_id ? '' : paymentSortRowKey(item),
        method_count: item.method_count,
        app_id: item.app_id,
        country_code: item.country_code,
        currency: item.currency,
        payment_env: item.payment_env,
        is_web_cashier: item.is_web_cashier,
        publish_status: this.normalizePublishStatus(item),
        cashier_template_name: (() => {
          const c = String(item.cashier_template_name_custom || '').trim()
          return c || this.getCashierTemplateId(item)
        })(),
        is_simulator: !!item.is_simulator
      }
      this.drawerReadonly = false
      this.drawerVisible = true
    },
    onSortDrawerClose() {
      this.drawerVisible = false
      this.drawerPayload = null
      this.drawerReadonly = false
    },
    handleViewSort(item) {
      this.drawerPayload = {
        template_id: item.template_id,
        legacy_row_key: item.template_id ? '' : paymentSortRowKey(item),
        method_count: item.method_count,
        app_id: item.app_id,
        country_code: item.country_code,
        currency: item.currency,
        payment_env: item.payment_env,
        is_web_cashier: item.is_web_cashier,
        publish_status: this.normalizePublishStatus(item),
        cashier_template_name: (() => {
          const c = String(item.cashier_template_name_custom || '').trim()
          return c || this.getCashierTemplateId(item)
        })(),
        is_simulator: !!item.is_simulator
      }
      this.drawerReadonly = true
      this.drawerVisible = true
    },
    sortRowToggleKey(item) {
      return this.getCashierTemplateId(item)
    },
    async handleDeleteSort(item) {
      const key = paymentSortRowKey(item)
      if (this.deletingKeys[key]) return
      try {
        await this.$confirm.confirm({
          title: '删除收银台模版',
          message: `确定删除模版「${this.getCashierTemplateDisplayName(item)}」吗？`,
          type: 'warning',
          confirmText: '删除'
        })
      } catch {
        return
      }
      this.deletingKeys = { ...this.deletingKeys, [key]: true }
      try {
        const res = await paymentAPI.deleteCashierTemplate({ ...item, region: this.resolvedRegion, scenario: this.scenario || 'global' })
        if (res.code !== 200) throw new Error(res.message || '删除失败')
        this.currentPage = Math.min(this.currentPage, Math.max(1, Math.ceil((this.total - 1) / this.pageSize)))
        await this.fetchList()
        this.$message.success('删除成功')
      } catch (err) {
        this.$message.error(err.message || '删除失败')
      } finally {
        const { [key]: _, ...rest } = this.deletingKeys
        this.deletingKeys = rest
      }
    },
    isCashierTemplatePublished(item) {
      return this.normalizePublishStatus(item) === 'published'
    },
    async onCashierPublishStatusChange(item, event) {
      const key = this.sortRowToggleKey(item)
      const next = event.target.checked
      const prev = this.isCashierTemplatePublished(item)
      if (next === prev) return

      event.target.checked = prev

      const idLabel = this.getCashierTemplateDisplayName(item)
      const msg = next
        ? `确定将收银台模版「${idLabel}」设为已发布吗？发布后模版将恢复为可用状态。`
        : `确定将收银台模版「${idLabel}」下线吗？下线后模版将不可用，可能影响线上真实交易，请谨慎操作。`

      try {
        await this.$confirm.confirmStatusChange({
          title: next ? '发布收银台模版' : '下线收银台模版',
          message: msg
        })
      } catch {
        return
      }

      this.sortStatusToggling = { ...this.sortStatusToggling, [key]: true }
      try {
        const payload = {
          template_id: item.template_id,
          app_id: item.app_id,
          country_code: item.country_code,
          currency: item.currency,
          payment_env: item.payment_env,
          is_web_cashier: item.is_web_cashier,
          region: this.resolvedRegion,
          scenario: this.scenario || 'global'
        }
        const res = next
          ? await paymentAPI.setCashierTemplateOnline(payload)
          : await paymentAPI.setCashierTemplateOffline(payload)
        if (res.code !== 200) {
          throw new Error(res.message || '更新失败')
        }
        item.publish_status = next ? 'published' : 'offline'
        this.$message.success(next ? '已发布' : '已下线')
        await this.fetchList()
      } catch (err) {
        this.$message.error(err.message || '操作失败')
        console.error(err)
      } finally {
        const { [key]: _, ...rest } = this.sortStatusToggling
        this.sortStatusToggling = rest
      }
    },
    normalizePublishStatus(item) {
      const s = item?.publish_status
      if (s === 'published' || s === 'offline') return s
      return 'published'
    },
    formatDomesticCashierKind(item) {
      return item.is_web_cashier ? 'Web 收银台' : '原生收银台'
    },
    handleSearch() {
      this.currentPage = 1
      this.fetchList()
    },
    handleReset() {
      this.filters = {
        currency: '',
        payment_env: '',
        domestic_cashier_kind: ''
      }
      this.currentPage = 1
      this.fetchList()
    },
    handleDrawerSaved() {
      this.onSortDrawerClose()
      this.fetchList()
    }
  }
}
</script>

<style scoped>
.delete-action { color: #ff4d4f; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.header-left {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: var(--spacing-base);
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
  min-width: 200px;
}

.filter-item-search {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.search-group {
  display: flex;
  gap: var(--spacing-sm);
}

.stat-number {
  font-weight: 600;
  color: var(--color-text);
}

.stat-unit {
  color: var(--color-text-secondary);
  margin-left: var(--spacing-xs);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-success {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.badge-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
}

.pagination-info {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.pagination-controls {
  display: flex;
  gap: var(--spacing-sm);
}

.th-pay-switch {
  vertical-align: middle;
  text-align: center;
  width: 168px;
  min-width: 168px;
  max-width: 168px;
}

.pay-switch-th {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.pay-switch-th-text {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.pay-switch-help-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.pay-switch-help-icon {
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

.pay-switch-help-icon:hover,
.pay-switch-help-icon:focus-visible {
  color: var(--color-primary);
  border-color: var(--color-primary);
  outline: none;
}

.pay-switch-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  visibility: hidden;
  opacity: 0;
  width: max-content;
  max-width: min(300px, 85vw);
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

.pay-switch-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -6px;
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.88);
}

.pay-switch-help-wrap:hover .pay-switch-tooltip,
.pay-switch-help-wrap:focus-within .pay-switch-tooltip {
  visibility: visible;
  opacity: 1;
}

.td-pay-switch {
  vertical-align: middle;
  text-align: center;
  width: 168px;
  min-width: 168px;
  max-width: 168px;
}

.channel-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  vertical-align: middle;
}

.channel-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.channel-switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d9d9d9;
  transition: var(--transition, 0.2s ease);
  border-radius: 24px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset;
}

.channel-switch-slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  transition: var(--transition, 0.2s ease);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.channel-switch input:checked + .channel-switch-slider {
  background-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04) inset;
}

.channel-switch input:checked + .channel-switch-slider::before {
  transform: translateX(20px);
}

.channel-switch input:disabled + .channel-switch-slider {
  opacity: 0.55;
  cursor: not-allowed;
}

.embedded-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacing-lg);
}

.template-display-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  word-break: break-all;
}


.cashier-template-list .page-header { margin-bottom: 16px; min-height: 32px; }
.cashier-template-list .page-title { font-size: 18px; line-height: 32px; }
.cashier-template-list .page-filters { margin-bottom: 16px; }
.cashier-template-list .filter-row { align-items: center; gap: 16px; }
.cashier-template-list .filter-item { display: flex; align-items: center; gap: 8px; min-width: 0; }
.cashier-template-list .filter-item .form-label { white-space: nowrap; }
.cashier-template-list .filter-item .select { width: 200px; }
.filter-actions { display: flex; gap: 8px; }
.cashier-template-list .page-content { gap: 0; overflow-x: auto; }
.cashier-template-list .table { min-width: 900px; border-collapse: separate; border-spacing: 0; }
.cashier-template-list .table th { height: 54px; background: #fafafa; padding: 16px; white-space: nowrap; }
.cashier-template-list .table th:first-child { border-top-left-radius: 8px; min-width: 280px; }
.cashier-template-list .table th:last-child { border-top-right-radius: 8px; width: 180px; }
.cashier-template-list .table .th-currency { width: 120px; min-width: 120px; }
.cashier-template-list .table .th-method-count { width: 140px; min-width: 140px; }
.cashier-template-list .table .th-template-kind { width: 140px; min-width: 140px; }
.cashier-template-list .table .th-simulator { width: 90px; min-width: 90px; }
.cashier-template-list .table td { height: 57px; padding: 16px; color: #262626; }
.cashier-template-list .table td.table-cell-actions { display: table-cell; white-space: nowrap; }
.cashier-template-list .table td.table-cell-actions .btn + .btn { margin-left: 16px; }
.cashier-template-list .table-action-link { padding: 0; height: auto; color: #1677ff; }
.cashier-template-list .table-action-link.delete-action { color: #ff4d4f; }
.cashier-template-list .template-display-name, .cashier-template-list .stat-number { font-weight: 400; }
.cashier-template-list .stat-unit { color: #262626; }
.cashier-template-list .pagination { margin-top: 16px; padding-top: 0; border-top: none; }
.cashier-template-list .pay-switch-th-text { font-weight: 600; }
@media (max-width: 640px) {
  .cashier-template-list .filter-row { align-items: flex-start; gap: 12px; }
  .cashier-template-list .filter-item { flex: 1 1 100%; }
  .cashier-template-list .filter-item .select { width: auto; flex: 1; min-width: 0; }
  .cashier-template-list .page-header { align-items: flex-start; gap: 12px; }
  .cashier-template-list .pagination { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>

