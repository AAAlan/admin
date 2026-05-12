<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">支付渠道管理</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="handleCreate" aria-label="创建支付渠道">
          <Icon name="plus" :size="16" />
          <span>创建支付渠道</span>
        </button>
      </div>
    </div>

    <div class="page-filters">
      <div class="filter-group">
        <label for="search-channel" class="sr-only">搜索支付渠道</label>
        <input
          id="search-channel"
          type="text"
          class="input"
          placeholder="搜索支付渠道名称"
          v-model="searchKeyword"
          @keyup.enter="handleSearch"
          aria-label="搜索支付渠道"
        />
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

    <div class="page-content">
      <div v-if="loading" class="loading-container">
        <div class="loading"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="error" class="alert alert-error" role="alert">
        <span>✗</span>
        <span>{{ error }}</span>
      </div>

      <table v-else class="table channel-list-table" role="table" aria-label="支付渠道列表">
        <thead>
          <tr role="row">
            <th role="columnheader" scope="col" style="width:36px"></th>
            <th role="columnheader" scope="col">channel name</th>
            <th role="columnheader" scope="col">渠道商户账户</th>
            <th role="columnheader" scope="col" class="th-pay-switch">
              <div class="pay-switch-th">
                <span class="pay-switch-th-text">渠道开关</span>
                <div class="pay-switch-help-wrap">
                  <button
                    type="button"
                    class="pay-switch-help-icon"
                    aria-label="渠道开关说明"
                    aria-describedby="channel-list-pay-switch-tooltip"
                  >
                    ?
                  </button>
                  <div
                    id="channel-list-pay-switch-tooltip"
                    class="pay-switch-tooltip"
                    role="tooltip"
                  >
                    用于控制该支付渠道是否启用；关闭后不可用于新的支付方式绑定与收银台相关配置。
                  </div>
                </div>
              </div>
            </th>
            <th role="columnheader" scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="channel in channelList" :key="channel.channel_id">
            <tr role="row" class="channel-row" :class="{ 'channel-row--expanded': expandedChannels[channel.channel_id] }">
              <td role="cell" class="td-expand">
                <button
                  type="button"
                  class="expand-toggle"
                  :aria-expanded="String(!!expandedChannels[channel.channel_id])"
                  :aria-label="expandedChannels[channel.channel_id] ? '折叠子渠道' : '展开子渠道'"
                  @click="toggleExpand(channel.channel_id)"
                >
                  <span class="expand-arrow" :class="{ 'expand-arrow--open': expandedChannels[channel.channel_id] }">▶</span>
                </button>
              </td>
              <td role="cell">
                <strong>{{ channel.pay_name || channel.channel_name || '-' }}</strong>
              </td>
              <td role="cell">{{ channel.merchant_account || '-' }}</td>
              <td role="cell" class="td-pay-switch" @click.stop>
                <label class="channel-switch">
                  <input
                    type="checkbox"
                    :checked="isChannelEnabled(channel)"
                    :disabled="!!statusToggling[channel.channel_id]"
                    :aria-label="`${channel.pay_name || channel.channel_name || channel.channel_id} 渠道开关`"
                    @change="onChannelStatusChange(channel, $event)"
                  />
                  <span class="channel-switch-slider" aria-hidden="true"></span>
                </label>
              </td>
              <td role="cell">
                <div class="table-actions">
                  <button
                    class="btn btn-primary btn-sm"
                    @click="handleEdit(channel)"
                    aria-label="编辑支付渠道"
                  >
                    <Icon name="edit" :size="14" />
                    <span>编辑</span>
                  </button>
                  <button
                    class="btn btn-text btn-sm"
                    @click="handleView(channel)"
                    aria-label="查看支付渠道"
                  >
                    <Icon name="eye" :size="14" />
                    <span>查看</span>
                  </button>
                </div>
              </td>
            </tr>

            <!-- 子渠道展开区域 -->
            <tr v-if="expandedChannels[channel.channel_id]" :key="`sub-${channel.channel_id}`" class="subchannel-panel-row">
              <td :colspan="5" class="subchannel-panel-cell">
                <div class="subchannel-panel">
                  <div class="subchannel-header">
                    <div class="subchannel-header-left">
                      <span class="subchannel-title">子渠道</span>
                      <span class="subchannel-count">共 {{ getSubchannels(channel).length }} 条</span>
                    </div>
                    <button class="btn btn-primary btn-sm" @click="handleCreateSubchannel(channel)">
                      <Icon name="plus" :size="14" />
                      <span>添加子渠道</span>
                    </button>
                  </div>

                  <div v-if="getSubchannels(channel).length === 0" class="subchannel-empty">
                    暂无子渠道，点击上方按钮添加
                  </div>

                  <div v-else class="subchannel-table-wrap">
                    <table class="subchannel-table">
                      <thead>
                        <tr>
                          <th>subchannel</th>
                          <th>卡品牌</th>
                          <th>图标</th>
                          <th class="th-sub-actions">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="method in getSubchannels(channel)" :key="method.id">
                          <td>
                            <strong class="subchannel-name">{{ method.pay_name }}</strong>
                          </td>
                          <td>
                            <span v-if="method.selectedCardBrand" class="badge badge-info">{{ method.selectedCardBrand }}</span>
                            <span v-else class="text-muted">-</span>
                          </td>
                          <td>
                            <div v-if="method.icon_url" class="icon-preview">
                              <img :src="method.icon_url" :alt="method.pay_name" class="payment-icon" />
                            </div>
                            <span v-else class="text-muted">-</span>
                          </td>
                          <td>
                            <div class="subchannel-actions">
                              <button class="btn btn-primary btn-sm" @click="handleEditSubchannel(method)" aria-label="编辑子渠道">
                                <Icon name="edit" :size="14" />
                                <span>编辑</span>
                              </button>
                              <button class="btn btn-danger btn-sm" @click="handleRemoveSubchannel(channel, method)" aria-label="移除子渠道">
                                <Icon name="delete" :size="14" />
                                <span>移除</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="!loading && !error && channelList.length === 0" class="empty-state">
        <p>暂无数据</p>
      </div>
    </div>

    <Modal
      v-model:visible="createModalVisible"
      title="创建支付渠道"
      size="large"
      @close="onCreateModalClose"
    >
      <PaymentChannelEdit
        v-if="createModalVisible"
        key="channel-create"
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
      <PaymentChannelEdit
        v-if="drawerVisible"
        :key="drawerEditKey"
        mode="drawer"
        :prefill="drawerPrefill"
        :readonly="drawerReadonly"
        @cancel="onDrawerClose"
        @saved="handleDrawerSaved"
      />
    </Drawer>

    <!-- 子渠道（支付方式）创建弹窗 -->
    <Modal
      v-model:visible="subCreateModalVisible"
      title="添加子渠道"
      size="large"
      @close="onSubCreateModalClose"
    >
      <PaymentMethodEdit
        v-if="subCreateModalVisible"
        :key="`sub-create-${subCreateParentChannelId}`"
        mode="modal"
        :prefill="subCreatePrefill"
        @cancel="onSubCreateModalClose"
        @saved="handleSubCreateSaved"
      />
    </Modal>

    <!-- 子渠道（支付方式）编辑抽屉 -->
    <Drawer
      v-model:visible="subEditDrawerVisible"
      :title="subEditDrawerTitle"
      :width="760"
      :show-header="true"
      @close="onSubEditDrawerClose"
    >
      <PaymentMethodEdit
        v-if="subEditDrawerVisible"
        :key="subEditDrawerKey"
        mode="drawer"
        :prefill="subEditDrawerPrefill"
        @cancel="onSubEditDrawerClose"
        @saved="handleSubEditSaved"
      />
    </Drawer>
  </div>
</template>

<script>
import { paymentAPI } from '@/api'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'
import PaymentChannelEdit from './PaymentChannelEdit.vue'
import PaymentMethodEdit from './PaymentMethodEdit.vue'

export default {
  components: {
    Icon,
    Modal,
    Drawer,
    PaymentChannelEdit,
    PaymentMethodEdit
  },
  name: 'PaymentChannels',
  data() {
    return {
      channelList: [],
      allMethods: [],
      loading: false,
      error: null,
      searchKeyword: '',
      createModalVisible: false,
      createPrefill: {},
      drawerVisible: false,
      drawerPayload: null,
      drawerReadonly: false,
      subMethodOverrides: {},
      statusToggling: {},
      expandedChannels: {},
      methodStatusToggling: {},
      methodStatusSegOptions: [
        { value: 'enabled', label: '启用' },
        { value: 'disabled', label: '禁用' },
        { value: 'maintenance', label: '维护' }
      ],
      subCreateModalVisible: false,
      subCreateParentChannelId: '',
      subCreatePrefill: {},
      subEditDrawerVisible: false,
      subEditDrawerPayload: null
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
      const name = (this.drawerPayload && this.drawerPayload.channel_name) || ''
      if (this.drawerReadonly) return name ? `查看支付渠道：${name}` : '查看支付渠道'
      return name ? `编辑支付渠道：${name}` : '编辑支付渠道'
    },
    drawerEditKey() {
      if (!this.drawerVisible) return 'closed'
      const id = this.drawerPayload && this.drawerPayload.id
      return id != null && id !== '' ? `ch-${id}` : 'ch-edit'
    },
    subEditDrawerPrefill() {
      return this.subEditDrawerPayload || {}
    },
    subEditDrawerTitle() {
      const name = (this.subEditDrawerPayload && this.subEditDrawerPayload.pay_name) || ''
      return name ? `编辑子渠道：${name}` : '编辑子渠道'
    },
    subEditDrawerKey() {
      if (!this.subEditDrawerVisible) return 'closed'
      const id = this.subEditDrawerPayload && this.subEditDrawerPayload.id
      return id != null && id !== '' ? `sub-${id}` : 'sub-edit'
    }
  },
  mounted() {
    this.loadSubMethodOverrides()
    this.fetchChannels()
  },
  methods: {
    loadSubMethodOverrides() {
      try {
        const raw = localStorage.getItem('payment_channel_sub_methods')
        this.subMethodOverrides = raw ? JSON.parse(raw) : {}
      } catch {
        this.subMethodOverrides = {}
      }
    },
    saveSubMethodOverrides() {
      try {
        localStorage.setItem('payment_channel_sub_methods', JSON.stringify(this.subMethodOverrides))
      } catch {
        // ignore
      }
    },
    upsertSubMethodOverride(savedChannel) {
      if (!savedChannel || !savedChannel.channel_id) return
      const names = savedChannel.open_payment_method_names || []
      if (!Array.isArray(names) || names.length === 0) return
      this.subMethodOverrides = {
        ...this.subMethodOverrides,
        [savedChannel.channel_id]: names
      }
      this.saveSubMethodOverrides()
    },
    async fetchChannels() {
      this.loading = true
      this.error = null
      try {
        const regionParams = { region: this.apiRegion }
        const [channelsRes, methodsRes] = await Promise.all([
          paymentAPI.getPaymentChannels(regionParams),
          paymentAPI.getPaymentMethods(regionParams)
        ])

        if (channelsRes.code === 200) {
          const rawChannels = channelsRes.data.list || []
          const methods = methodsRes.code === 200 ? (methodsRes.data.list || []) : []
          this.allMethods = methods

          this.channelList = rawChannels.map(channel => ({
            ...channel
          }))
        } else {
          this.error = channelsRes.message || '获取数据失败'
        }
      } catch (err) {
        this.error = '网络错误，请稍后重试'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    // --- 展开/折叠 ---
    toggleExpand(channelId) {
      this.expandedChannels = {
        ...this.expandedChannels,
        [channelId]: !this.expandedChannels[channelId]
      }
    },

    getSubchannels(channel) {
      const cid = channel.channel_id
      return this.allMethods.filter(m => {
        const ids = Array.isArray(m.channel_ids) ? m.channel_ids : []
        return ids.includes(cid) || m.channel_id === cid
      })
    },

    getPayTypeName(type) {
      const typeMap = { card: '卡支付', wallet: '钱包支付', bank: '银行转账' }
      return typeMap[type] || type
    },

    normalizeMethodStatus(method) {
      const s = method?.status
      if (s === 'enabled' || s === 'disabled' || s === 'maintenance') return s
      if (typeof s === 'boolean') return s ? 'enabled' : 'disabled'
      if (typeof method?.enabled === 'boolean') return method.enabled ? 'enabled' : 'disabled'
      return 'enabled'
    },

    async onMethodStatusClick(method, nextStatus) {
      const prev = this.normalizeMethodStatus(method)
      if (nextStatus === prev) return

      const name = method.pay_name || `ID ${method.id}`
      const labelMap = { enabled: '启用', disabled: '禁用', maintenance: '维护' }
      const msg = `确定将子渠道「${name}」的状态设为「${labelMap[nextStatus]}」吗？`

      try {
        await this.$confirm.confirmStatusChange({ title: '子渠道开关确认', message: msg })
      } catch { return }

      const id = method.id
      this.methodStatusToggling = { ...this.methodStatusToggling, [id]: true }
      try {
        const res = await paymentAPI.updatePaymentMethod(id, { status: nextStatus }, { region: this.apiRegion })
        if (res.code !== 200) throw new Error(res.message || '更新失败')
        const st = res.data?.status
        method.status = (st === 'enabled' || st === 'disabled' || st === 'maintenance') ? st : nextStatus
        this.$message.success(`已设为${labelMap[nextStatus]}`)
      } catch (err) {
        this.$message.error(err.message || '更新失败')
        console.error(err)
      } finally {
        const { [id]: _, ...rest } = this.methodStatusToggling
        this.methodStatusToggling = rest
      }
    },

    // --- 子渠道 CRUD ---
    handleCreateSubchannel(channel) {
      this.subCreateParentChannelId = channel.channel_id
      this.subCreatePrefill = {
        channel_ids: [channel.channel_id],
        _parentChannelId: channel.channel_id
      }
      this.subCreateModalVisible = true
    },
    onSubCreateModalClose() {
      this.subCreateModalVisible = false
      this.subCreatePrefill = {}
      this.subCreateParentChannelId = ''
    },
    handleSubCreateSaved() {
      this.onSubCreateModalClose()
      this.fetchChannels()
    },
    handleEditSubchannel(method) {
      this.subEditDrawerPayload = {
        id: method.id,
        pay_name: method.pay_name || ''
      }
      this.subEditDrawerVisible = true
    },
    onSubEditDrawerClose() {
      this.subEditDrawerVisible = false
      this.subEditDrawerPayload = null
    },
    handleSubEditSaved() {
      this.onSubEditDrawerClose()
      this.fetchChannels()
    },
    async handleRemoveSubchannel(channel, method) {
      const name = method.pay_name || `ID ${method.id}`
      const channelName = channel.pay_name || channel.channel_name || channel.channel_id
      const methodId = Number(method.id)
      try {
        await this.$confirm.confirmStatusChange({
          title: '移除子渠道确认',
          message: `确定从渠道「${channelName}」中移除子渠道「${name}」吗？这将取消该支付方式与此渠道的关联。`
        })
      } catch { return }

      try {
        const res = await paymentAPI.deletePaymentMethod(methodId)
        if (res.code !== 200) throw new Error(res.message || '移除失败')
        // 先本地移除，保证每次点击都立即生效
        this.allMethods = this.allMethods.filter(m => Number(m.id) !== methodId)
        this.$message.success('已移除子渠道')
        // 再同步一次远端结果，避免本地与存储状态偏差
        await this.fetchChannels()
      } catch (err) {
        this.$message.error(err.message || '移除失败')
        console.error(err)
      }
    },

    // --- 渠道本身的操作 ---
    handleSearch() {
      this.fetchChannels()
    },
    handleReset() {
      this.searchKeyword = ''
      this.fetchChannels()
    },
    handleCreate() {
      this.createPrefill = {}
      this.createModalVisible = true
    },
    onCreateModalClose() {
      this.createModalVisible = false
      this.createPrefill = {}
    },
    handleCreateSaved(savedChannel) {
      this.onCreateModalClose()
      this.upsertSubMethodOverride(savedChannel)
      this.fetchChannels()
    },
    handleEdit(channel) {
      this.drawerPayload = {
        id: channel.channel_id,
        channel_name: channel.pay_name || channel.channel_name || ''
      }
      this.drawerReadonly = false
      this.drawerVisible = true
    },
    onDrawerClose() {
      this.drawerVisible = false
      this.drawerPayload = null
      this.drawerReadonly = false
    },
    handleView(channel) {
      this.drawerPayload = {
        id: channel.channel_id,
        channel_name: channel.pay_name || channel.channel_name || ''
      }
      this.drawerReadonly = true
      this.drawerVisible = true
    },
    handleDrawerSaved(savedChannel) {
      this.onDrawerClose()
      this.upsertSubMethodOverride(savedChannel)
      this.fetchChannels()
    },
    isChannelEnabled(channel) {
      if (channel.status === undefined || channel.status === null) return true
      return !!channel.status
    },
    async onChannelStatusChange(channel, event) {
      const id = channel.channel_id
      const next = event.target.checked
      const prev = this.isChannelEnabled(channel)
      if (next === prev) return

      event.target.checked = prev

      const name = channel.pay_name || channel.channel_name || id
      const msg = next
        ? `确定启用支付渠道「${name}」吗？启用后可用于绑定支付方式及收银台相关配置。`
        : `确定关闭支付渠道「${name}」吗？关闭后不可用于新的支付方式绑定，可能影响线上收银台，请谨慎操作。`

      try {
        await this.$confirm.confirmStatusChange({ title: '渠道开关确认', message: msg })
      } catch { return }

      this.statusToggling = { ...this.statusToggling, [id]: true }
      try {
        const res = await paymentAPI.updatePaymentChannel(id, { status: next }, { region: this.apiRegion })
        if (res.code !== 200) throw new Error(res.message || '更新失败')
        if (res.data && typeof res.data.status === 'boolean') {
          channel.status = res.data.status
        } else {
          channel.status = next
        }
        this.$message.success(next ? '已启用支付渠道' : '已关闭支付渠道')
        await this.fetchChannels()
      } catch (err) {
        this.$message.error(err.message || '更新失败')
        console.error(err)
      } finally {
        const { [id]: _, ...rest } = this.statusToggling
        this.statusToggling = rest
      }
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

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.page-filters {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.filter-group {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.filter-group .input {
  flex: 1;
  max-width: 300px;
}

.page-content {
  background-color: #ffffff;
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

.th-pay-switch {
  vertical-align: middle;
  text-align: center;
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

.channel-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  padding: 2px 6px;
  border-radius: 3px;
}

.mono-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.2;
}

/* 展开/折叠按钮 */
.td-expand {
  padding: 0 !important;
  text-align: center;
  vertical-align: middle;
}

.expand-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  border-radius: 4px;
  transition: background 0.15s ease, color 0.15s ease;
}

.expand-toggle:hover {
  background: var(--color-bg);
  color: var(--color-primary);
}

.expand-arrow {
  display: inline-block;
  font-size: 10px;
  transition: transform 0.2s ease;
}

.expand-arrow--open {
  transform: rotate(90deg);
}

.channel-row--expanded > td {
  border-bottom: none;
}

/* 主列表：固定列算法，避免展开子渠道后内层表格撑乱表头与各列对齐 */
.channel-list-table {
  table-layout: fixed;
}

.channel-list-table > thead > tr > th:nth-child(1),
.channel-list-table > tbody > tr.channel-row > td:nth-child(1) {
  width: 44px;
}

.channel-list-table > thead > tr > th:nth-child(4),
.channel-list-table > tbody > tr.channel-row > td:nth-child(4) {
  width: 168px;
  min-width: 168px;
  max-width: 168px;
  text-align: center;
}

.channel-list-table > thead > tr > th:nth-child(5),
.channel-list-table > tbody > tr.channel-row > td:nth-child(5) {
  width: 200px;
  min-width: 180px;
}

.channel-list-table > thead > tr > th:nth-child(2),
.channel-list-table > tbody > tr.channel-row > td:nth-child(2) {
  width: 26%;
  min-width: 0;
}

.channel-list-table > thead > tr > th:nth-child(3),
.channel-list-table > tbody > tr.channel-row > td:nth-child(3) {
  min-width: 0;
  word-break: break-word;
}

/* 子渠道面板 */
.subchannel-panel-row > td {
  padding: 0 !important;
}

.subchannel-panel-cell {
  background: var(--color-bg, #fafafa);
  min-width: 0;
  vertical-align: top;
}

.subchannel-panel {
  margin: 0 0 var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  max-width: 100%;
  box-sizing: border-box;
}

.subchannel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.subchannel-header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.subchannel-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.subchannel-count {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.subchannel-empty {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.subchannel-table-wrap {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
}

.subchannel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  table-layout: fixed;
}

.subchannel-table th,
.subchannel-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.subchannel-table th {
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  font-size: var(--font-size-xs);
}

.th-sub-actions {
  width: 180px;
}

.subchannel-name {
  color: var(--color-text-primary);
}

.subchannel-table tbody tr:last-child td {
  border-bottom: none;
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

.subchannel-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  white-space: nowrap;
}

/* 子渠道状态分段按钮 */
.td-method-status {
  vertical-align: middle;
}

.method-status-seg {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 6px);
  overflow: hidden;
  background: var(--color-bg);
}

.method-status-seg-btn {
  margin: 0;
  padding: 4px 8px;
  font-size: var(--font-size-xs);
  line-height: 1.4;
  border: none;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-container, #fff);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: 0.15s ease;
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
  color: var(--color-success, #52c41a);
  background: var(--color-success-bg, #f6ffed);
}

.method-status-seg-btn.is-active.is-disabled {
  color: var(--color-text-tertiary);
  background: var(--color-bg);
}

.method-status-seg-btn.is-active.is-maintenance {
  color: var(--color-warning, #faad14);
  background: var(--color-warning-bg, #fffbe6);
}

.method-status-seg-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-danger {
  color: var(--color-error, #ff4d4f);
  border-color: var(--color-error, #ff4d4f);
  background: transparent;
}

.btn-danger:hover {
  color: #fff;
  background: var(--color-error, #ff4d4f);
}
</style>

