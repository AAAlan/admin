<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">支付方式管理</h1>
      <button class="btn btn-primary" @click="handleCreate" aria-label="创建支付方式">
        <Icon name="plus" :size="16" />
        <span>创建支付方式</span>
      </button>
    </div>

    <div class="page-filters">
      <div class="filter-row">
        <div class="filter-item">
          <label for="filter-pay-type" class="form-label">支付类型</label>
          <select
            id="filter-pay-type"
            v-model="filters.pay_type"
            class="select"
            @change="handleSearch"
          >
            <option value="">全部类型</option>
            <option value="card">卡支付</option>
            <option value="wallet">钱包支付</option>
            <option value="bank">银行转账</option>
          </select>
        </div>
        <div class="filter-item">
          <label for="filter-pay-method" class="form-label">支付方式</label>
          <input
            id="filter-pay-method"
            type="text"
            class="input"
            placeholder="请输入支付方式名称"
            v-model="filters.pay_method"
            @keyup.enter="handleSearch"
            aria-label="支付方式"
          />
        </div>
        <div class="filter-item-search">
          <div class="search-group">
            <button class="btn btn-secondary" @click="handleSearch" aria-label="查询">
              <Icon name="search" :size="16" />
              <span>查询</span>
            </button>
            <button class="btn btn-text" @click="handleReset" aria-label="重置">
              <Icon name="refresh" :size="16" />
              <span>重置</span>
            </button>
          </div>
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

      <table v-else class="table" role="table" aria-label="支付方式列表">
        <thead>
          <tr role="row">
            <th role="columnheader" scope="col">支付方式ID</th>
            <th role="columnheader" scope="col">Gameid</th>
            <th role="columnheader" scope="col">支付方式名称</th>
            <th role="columnheader" scope="col">图标</th>
            <th role="columnheader" scope="col">支付类型</th>
            <th role="columnheader" scope="col" class="th-method-status">
              <div class="pay-switch-th">
                <span class="pay-switch-th-text">支付方式开关</span>
                <div class="pay-switch-help-wrap">
                  <button
                    type="button"
                    class="pay-switch-help-icon"
                    aria-label="支付方式开关说明"
                    aria-describedby="method-list-status-tooltip"
                  >
                    ?
                  </button>
                  <div
                    id="method-list-status-tooltip"
                    class="pay-switch-tooltip"
                    role="tooltip"
                  >
                    启用:收银台正常展示与支付;禁用:收银台不展示;维护:收银台展示但是临时不可用(如渠道升级)。变更将影响收银台展示,请在列表中切换并二次确认后生效。
                  </div>
                </div>
              </div>
            </th>
            <th role="columnheader" scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="method in methodList" :key="method.id" role="row">
            <td role="cell">
              <code class="channel-id">{{ method.id }}</code>
            </td>
            <td role="cell">
              <span class="game-tag">{{ getGameName(method.sdk_app_id) }}</span>
            </td>
            <td role="cell">
              <strong>{{ method.pay_name }}</strong>
            </td>
            <td role="cell">
              <div v-if="method.icon_url" class="icon-preview">
                <img :src="method.icon_url" :alt="method.pay_name" class="payment-icon" />
              </div>
              <span v-else class="text-muted">-</span>
            </td>
            <td role="cell">
              <span class="badge badge-info">{{ getPayTypeName(method.pay_type) }}</span>
            </td>
            <td role="cell" class="td-method-status" @click.stop>
              <div
                class="method-status-seg"
                role="group"
                :aria-label="`${method.pay_name} 支付方式开关`"
              >
                <button
                  v-for="opt in methodStatusSegOptions"
                  :key="opt.value"
                  type="button"
                  class="method-status-seg-btn"
                  :class="{
                    'is-active': normalizeMethodStatus(method) === opt.value,
                    [`is-${opt.value}`]: true
                  }"
                  :disabled="!!statusToggling[method.id]"
                  @click="onMethodStatusClick(method, opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </td>
            <td role="cell">
              <div class="table-actions">
                <button
                  class="btn btn-primary btn-sm"
                  @click="handleEdit(method)"
                  aria-label="编辑支付方式"
                >
                  <Icon name="edit" :size="14" />
                  <span>编辑</span>
                </button>
                <button
                  class="btn btn-text btn-sm"
                  @click="handleView(method)"
                  aria-label="查看支付方式"
                >
                  <Icon name="eye" :size="14" />
                  <span>查看</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && !error && methodList.length === 0" class="empty-state">
        <p>暂无数据</p>
      </div>
    </div>

    <Modal
      v-model:visible="createModalVisible"
      title="创建支付方式"
      size="large"
      @close="onCreateModalClose"
    >
      <PaymentMethodEdit
        v-if="createModalVisible"
        key="method-create"
        mode="modal"
        :prefill="createPrefill"
        @cancel="onCreateModalClose"
        @saved="handleCreateSaved"
      />
    </Modal>

    <Drawer
      v-model:visible="drawerVisible"
      :title="drawerTitle"
      :width="760"
      :show-header="true"
      @close="onDrawerClose"
    >
      <PaymentMethodEdit
        v-if="drawerVisible"
        :key="drawerEditKey"
        mode="drawer"
        :prefill="drawerPrefill"
        :readonly="drawerReadonly"
        @cancel="onDrawerClose"
        @saved="handleDrawerSaved"
      />
    </Drawer>
  </div>
</template>

<script>
import { paymentAPI } from '@/api'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'
import PaymentMethodEdit from './PaymentMethodEdit.vue'

export default {
  components: {
    Icon,
    Modal,
    Drawer,
    PaymentMethodEdit
  },
  name: 'PaymentMethods',
  data() {
    return {
      methodList: [],
      loading: false,
      error: null,
      filters: {
        pay_type: '',
        pay_method: ''
      },
      createModalVisible: false,
      createPrefill: {},
      drawerVisible: false,
      drawerPayload: null,
      drawerReadonly: false,
      statusToggling: {},
      methodStatusSegOptions: [
        { value: 'enabled', label: '启用' },
        { value: 'disabled', label: '禁用' },
        { value: 'maintenance', label: '维护' }
      ]
    }
  },
  computed: {
    apiRegion() {
      return this.$route.meta?.region || 'overseas'
    },
    drawerPrefill() {
      return this.drawerPayload || {}
    },
    drawerTitle() {
      const name = (this.drawerPayload && this.drawerPayload.pay_name) || ''
      if (this.drawerReadonly) return name ? `查看支付方式：${name}` : '查看支付方式'
      return name ? `编辑支付方式：${name}` : '编辑支付方式'
    },
    drawerEditKey() {
      if (!this.drawerVisible) return 'closed'
      const id = this.drawerPayload && this.drawerPayload.id
      return id != null && id !== '' ? `pm-${id}` : 'pm-edit'
    }
  },
  mounted() {
    this.fetchMethods()
  },
  methods: {
    async fetchMethods() {
      this.loading = true
      this.error = null
      try {
        const res = await paymentAPI.getPaymentMethods({ ...this.filters, region: this.apiRegion })
        if (res.code === 200) {
          this.methodList = res.data.list
        } else {
          this.error = res.message || '获取数据失败'
        }
      } catch (err) {
        this.error = '网络错误，请稍后重试'
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.fetchMethods()
    },
    handleReset() {
      this.filters = {
        pay_type: '',
        pay_method: ''
      }
      this.fetchMethods()
    },
    handleCreate() {
      this.createPrefill = {}
      this.createModalVisible = true
    },
    onCreateModalClose() {
      this.createModalVisible = false
      this.createPrefill = {}
    },
    handleCreateSaved() {
      this.onCreateModalClose()
      this.fetchMethods()
    },
    onDrawerClose() {
      this.drawerVisible = false
      this.drawerPayload = null
      this.drawerReadonly = false
    },
    handleEdit(method) {
      this.drawerPayload = {
        id: method.id,
        pay_name: method.pay_name || ''
      }
      this.drawerReadonly = false
      this.drawerVisible = true
    },
    handleView(method) {
      this.drawerPayload = {
        id: method.id,
        pay_name: method.pay_name || ''
      }
      this.drawerReadonly = true
      this.drawerVisible = true
    },
    handleDrawerSaved() {
      this.onDrawerClose()
      this.fetchMethods()
    },
    normalizeMethodStatus(method) {
      const s = method?.status
      if (s === 'enabled' || s === 'disabled' || s === 'maintenance') return s
      if (typeof s === 'boolean') return s ? 'enabled' : 'disabled'
      if (typeof method?.enabled === 'boolean') {
        return method.enabled ? 'enabled' : 'disabled'
      }
      return 'enabled'
    },
    async onMethodStatusClick(method, nextStatus) {
      const prev = this.normalizeMethodStatus(method)
      if (nextStatus === prev) return

      const name = method.pay_name || `ID ${method.id}`
      const labelMap = {
        enabled: '启用',
        disabled: '禁用',
        maintenance: '维护'
      }
      const msg = `确定将支付方式「${name}」的状态设为「${labelMap[nextStatus]}」吗？将影响收银台展示与用户可选支付方式，请谨慎确认。`

      try {
        await this.$confirm.confirmStatusChange({
          title: '支付方式开关确认',
          message: msg
        })
      } catch {
        return
      }

      const id = method.id
      this.statusToggling = { ...this.statusToggling, [id]: true }
      try {
        const res = await paymentAPI.updatePaymentMethod(
          id,
          { status: nextStatus },
          { region: this.apiRegion }
        )
        if (res.code !== 200) {
          throw new Error(res.message || '更新失败')
        }
        const st = res.data?.status
        if (st === 'enabled' || st === 'disabled' || st === 'maintenance') {
          method.status = st
        } else {
          method.status = nextStatus
        }
        this.$message.success(`已设为${labelMap[nextStatus]}`)
        await this.fetchMethods()
      } catch (err) {
        this.$message.error(err.message || '更新失败')
        console.error(err)
      } finally {
        const { [id]: _, ...rest } = this.statusToggling
        this.statusToggling = rest
      }
    },
    getPayTypeName(type) {
      const typeMap = {
        card: '卡支付',
        wallet: '钱包支付',
        bank: '银行转账'
      }
      return typeMap[type] || type
    },
    getGameName(sdkAppId) {
      const gameMap = { Silver: 'Silver', saki: 'Silver' }
      return gameMap[sdkAppId] || sdkAppId || '-'
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-black);
  margin: 0;
}

.page-filters {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
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

.page-content {
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--spacing-lg);
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-4xl);
  color: var(--color-gray);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-4xl);
  color: var(--color-gray);
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

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  align-items: center;
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.tag-more {
  display: inline-block;
  padding: 2px 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.text-muted {
  color: var(--color-text-tertiary);
}

.icon-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-icon {
  width: 40px;
  height: 24px;
  object-fit: contain;
  border-radius: 4px;
  background-color: var(--color-bg);
  padding: 2px;
}

.channel-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  padding: 2px 6px;
  border-radius: 3px;
}

.th-method-status {
  vertical-align: bottom;
  min-width: 200px;
}

.pay-switch-th {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pay-switch-th-text {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
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

.td-method-status {
  vertical-align: middle;
}

.method-status-seg {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg);
}

.method-status-seg-btn {
  margin: 0;
  padding: 5px 10px;
  font-size: var(--font-size-xs);
  line-height: 1.4;
  border: none;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast, 0.15s ease);
}

.method-status-seg-btn:last-child {
  border-right: none;
}

.method-status-seg-btn:hover:not(:disabled):not(.is-active) {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.method-status-seg-btn.is-active {
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.method-status-seg-btn.is-active.is-enabled {
  color: var(--color-success);
  background: var(--color-success-bg);
}

.method-status-seg-btn.is-active.is-disabled {
  color: var(--color-text-tertiary);
  background: var(--color-bg);
}

.method-status-seg-btn.is-active.is-maintenance {
  color: var(--color-warning);
  background: var(--color-warning-bg);
}

.method-status-seg-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.game-tag {
  display: inline-block;
  font-size: var(--font-size-xs);
  color: var(--color-primary, #1677ff);
  background-color: rgba(22, 119, 255, 0.08);
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
}
</style>

