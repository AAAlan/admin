<template>
  <Modal
    :visible="visible"
    title="添加支付方式"
    size="large"
    :disable-teleport="contained"
    :contained="contained"
    @update:visible="handleUpdateVisible"
    @close="handleClose"
  >
    <div class="selector-content">
      <!-- Step 1: 选择支付渠道 -->
      <div class="step-section">
        <label class="form-label step-label">1. 选择支付渠道</label>
        <select
          v-model="selectedChannelId"
          class="select"
          @change="handleChannelChange"
        >
          <option value="">请选择支付渠道</option>
          <option
            v-for="ch in channelOptions"
            :key="ch.channel_id"
            :value="ch.channel_id"
          >
            {{ getChannelOptionLabel(ch) }}
          </option>
        </select>
      </div>

      <!-- Step 2: 选择子渠道 -->
      <div v-if="selectedChannelId" class="step-section">
        <label class="form-label step-label">2. 选择子渠道（subchannel）</label>
        <div v-if="uniqueSubchannels.length === 0" class="empty-state-sm">
          该渠道下暂无子渠道
        </div>
        <div v-else class="methods-list">
          <div
            v-for="sub in uniqueSubchannels"
            :key="sub.pay_name"
            class="method-item"
            :class="{ 'method-selected': isSubchannelSelected(sub.pay_name) }"
            @click="handleToggleSubchannel(sub)"
          >
            <div class="method-info">
              <div class="method-name">{{ sub.pay_name }}</div>
            </div>
            <div class="method-check">
              <Icon v-if="isSubchannelSelected(sub.pay_name)" name="check" :size="20" />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: 选择卡品牌（仅当选中的子渠道有卡品牌时） -->
      <div v-if="selectedSubchannelBrands.length > 0" class="step-section">
        <label class="form-label step-label">3. 选择卡品牌（selectedCardBrand）</label>
        <div class="brand-list">
          <label
            v-for="brand in selectedSubchannelBrands"
            :key="brand"
            class="brand-item"
            :class="{ 'brand-selected': selectedBrands.includes(brand) }"
          >
            <input
              type="checkbox"
              :value="brand"
              v-model="selectedBrands"
              class="brand-checkbox"
            />
            <span class="brand-label">{{ brand }}</span>
          </label>
        </div>
      </div>

      <div v-if="!selectedChannelId" class="empty-state">
        <p>请先选择支付渠道</p>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="handleClose" aria-label="取消">
        取消
      </button>
      <button class="btn btn-primary" @click="handleConfirm" aria-label="确认">
        <Icon name="check" :size="16" />
        <span>确认添加 ({{ selectedMethods.length }})</span>
      </button>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue'
import Icon from '@/components/Icon.vue'
import { paymentAPI } from '@/api'

export default {
  name: 'PaymentMethodSelector',
  components: {
    Modal,
    Icon
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    excludeIds: {
      type: Array,
      default: () => []
    },
    appId: {
      type: String,
      default: ''
    },
    currency: {
      type: String,
      default: ''
    },
    countryCode: {
      type: String,
      default: ''
    },
    contained: {
      type: Boolean,
      default: false
    },
    region: {
      type: String,
      default: 'overseas'
    }
  },
  emits: ['update:visible', 'close', 'confirm'],
  data() {
    return {
      channelOptions: [],
      allMethods: [],
      selectedChannelId: '',
      selectedSubchannelNames: [],
      selectedBrands: []
    }
  },
  computed: {
    selectedChannel() {
      return this.channelOptions.find(c => c.channel_id === this.selectedChannelId) || null
    },
    rawSubchannelsForChannel() {
      if (!this.selectedChannelId) return []
      return this.allMethods.filter(m => {
        const ids = Array.isArray(m.channel_ids) ? m.channel_ids : []
        return ids.includes(this.selectedChannelId) || m.channel_id === this.selectedChannelId
      })
    },
    uniqueSubchannels() {
      const seen = new Map()
      for (const m of this.rawSubchannelsForChannel) {
        if (seen.has(m.pay_name)) {
          const existing = seen.get(m.pay_name)
          if (m.selectedCardBrand && !existing.brands.includes(m.selectedCardBrand)) {
            existing.brands.push(m.selectedCardBrand)
          }
        } else {
          seen.set(m.pay_name, {
            pay_name: m.pay_name,
            brands: m.selectedCardBrand ? [m.selectedCardBrand] : []
          })
        }
      }
      return Array.from(seen.values())
    },
    selectedSubchannelBrands() {
      const allBrands = []
      for (const name of this.selectedSubchannelNames) {
        const sub = this.uniqueSubchannels.find(s => s.pay_name === name)
        if (sub && sub.brands.length > 0) {
          sub.brands.forEach(b => { if (!allBrands.includes(b)) allBrands.push(b) })
        }
      }
      return allBrands
    },
    selectedMethods() {
      const result = []
      for (const name of this.selectedSubchannelNames) {
        const sub = this.uniqueSubchannels.find(s => s.pay_name === name)
        if (!sub) continue
        if (sub.brands.length === 0) {
          const m = this.rawSubchannelsForChannel.find(x => x.pay_name === name)
          if (m) result.push(m)
        } else {
          for (const brand of this.selectedBrands) {
            if (!sub.brands.includes(brand)) continue
            const m = this.rawSubchannelsForChannel.find(
              x => x.pay_name === name && x.selectedCardBrand === brand
            )
            if (m) result.push(m)
          }
        }
      }
      return result
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.fetchData()
        this.selectedChannelId = ''
        this.selectedSubchannelNames = []
        this.selectedBrands = []
      }
    }
  },
  methods: {
    async fetchData() {
      try {
        const regionParam = this.region || 'overseas'
        const [channelRes, methodRes] = await Promise.all([
          paymentAPI.getPaymentChannels({ region: regionParam }),
          paymentAPI.getPaymentMethods({ region: regionParam, include_all: true })
        ])
        this.channelOptions = channelRes.code === 200 ? (channelRes.data.list || []) : []
        const channelMap = new Map(this.channelOptions.map(c => [c.channel_id, c]))
        const rawMethods = methodRes.code === 200 ? (methodRes.data.list || []) : []
        this.allMethods = rawMethods.map(m => {
          const mappedIds = Array.isArray(m.channel_ids) && m.channel_ids.length > 0
            ? m.channel_ids
            : (m.channel_id ? [m.channel_id] : [])
          const candidateIds = [...new Set(mappedIds.filter(Boolean))]
          return {
            id: m.id,
            payment_method_id: m.payment_method_id || `pm_${m.id}`,
            pay_name: m.pay_name,
            selectedCardBrand: m.selectedCardBrand || '',
            channel_id: m.channel_id,
            channel_ids: candidateIds,
            icon_url: m.icon_url || ''
          }
        })
      } catch (err) {
        console.error(err)
        this.channelOptions = []
        this.allMethods = []
      }
    },
    handleChannelChange() {
      this.selectedSubchannelNames = []
      this.selectedBrands = []
    },
    isSubchannelSelected(payName) {
      return this.selectedSubchannelNames.includes(payName)
    },
    handleToggleSubchannel(sub) {
      const idx = this.selectedSubchannelNames.indexOf(sub.pay_name)
      if (idx > -1) {
        this.selectedSubchannelNames.splice(idx, 1)
        if (sub.brands.length > 0) {
          this.selectedBrands = this.selectedBrands.filter(b => {
            const remaining = this.selectedSubchannelNames.some(name => {
              const s = this.uniqueSubchannels.find(x => x.pay_name === name)
              return s && s.brands.includes(b)
            })
            return remaining
          })
        }
      } else {
        this.selectedSubchannelNames.push(sub.pay_name)
      }
    },
    getChannelOptionLabel(channel) {
      const name = channel?.pay_name || channel?.channel_name || channel?.channel_id || '-'
      const merchantNo = channel?.merchant_account || '-'
      return `${name}（${merchantNo}）`
    },
    handleConfirm() {
      if (this.selectedSubchannelNames.length === 0) {
        this.$message.warning('请至少选择一个子渠道')
        return
      }
      if (this.selectedSubchannelBrands.length > 0 && this.selectedBrands.length === 0) {
        this.$message.warning('请选择卡品牌')
        return
      }
      const ch = this.selectedChannel
      const channelName = ch?.pay_name || ch?.channel_name || this.selectedChannelId
      const result = []
      for (const name of this.selectedSubchannelNames) {
        const sub = this.uniqueSubchannels.find(s => s.pay_name === name)
        if (!sub) continue
        const base = this.rawSubchannelsForChannel.find(x => x.pay_name === name)
        if (!base) continue
        if (sub.brands.length === 0) {
          result.push({
            ...base,
            channel_id: this.selectedChannelId,
            channel_name: channelName,
            selectedCardBrands: []
          })
        } else {
          result.push({
            ...base,
            channel_id: this.selectedChannelId,
            channel_name: channelName,
            selectedCardBrand: '',
            selectedCardBrands: [...this.selectedBrands].filter(b => sub.brands.includes(b))
          })
        }
      }
      this.$emit('confirm', result)
      this.handleClose()
    },
    handleUpdateVisible(value) {
      this.$emit('update:visible', value)
    },
    handleClose() {
      this.$emit('update:visible', false)
      this.$emit('close')
      this.selectedSubchannelNames = []
      this.selectedBrands = []
      this.selectedChannelId = ''
    },
    getPayTypeName(type) {
      const typeMap = { card: '卡支付', wallet: '钱包支付', bank: '银行转账' }
      return typeMap[type] || type
    }
  }
}
</script>

<style scoped>
.selector-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.step-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.step-label {
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 320px;
  overflow-y: auto;
}

.method-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition);
}

.method-item:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.method-item.method-selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.method-info {
  flex: 1;
}

.method-name {
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.method-details {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  font-size: var(--font-size-xs);
}

.method-check {
  color: var(--color-primary);
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-4xl);
  color: var(--color-text-tertiary);
}

.empty-state-sm {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.brand-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.brand-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition);
  font-size: var(--font-size-sm);
}

.brand-item:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.brand-item.brand-selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.brand-checkbox {
  accent-color: var(--color-primary);
}

.brand-label {
  font-weight: 500;
  color: var(--color-text-primary);
}
</style>
