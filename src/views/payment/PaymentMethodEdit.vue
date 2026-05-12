<template>
  <div class="page-container" :class="{ 'is-readonly': readonly }">
    <div v-if="mode === 'page'" class="page-header">
      <h1 class="page-title">{{ isEdit ? '编辑支付方式' : '创建支付方式' }}</h1>
      <router-link
        to="/payment/methods"
        class="btn btn-text"
        aria-label="返回支付方式列表"
      >
        <Icon name="arrowLeft" :size="16" />
        <span>返回</span>
      </router-link>
    </div>

    <div class="page-content">
      <div v-if="readonly" class="readonly-banner">当前为只读模式</div>
      <form @submit.prevent="handleSubmit" class="form-container">
        <div class="card">
          <div v-if="mode === 'page'" class="card-header">
            <h2 class="card-title">基础信息</h2>
          </div>
          <div class="card-body">
            <div v-if="mode === 'page'" class="form-group">
              <label class="form-label">Gameid</label>
              <div class="readonly-value">{{ currentGameName }}</div>
            </div>

            <div class="form-group">
              <label for="pay-name" class="form-label">
                subchannel <span class="required">*</span>
              </label>
              <input
                id="pay-name"
                v-model="formData.pay_name"
                type="text"
                class="input"
                :disabled="readonly"
                placeholder="请输入 subchannel 名称，如：CARD、PayPal"
                required
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="icon-url" class="form-label">
                图标URL
              </label>
              <div class="form-hint">
                支付方式图标的URL地址，建议尺寸：80x48px
              </div>
              <div class="input-group">
                <input
                  id="icon-url"
                  v-model="formData.icon_url"
                  type="text"
                  class="input"
                  :disabled="readonly"
                  placeholder="https://cdn.example.com/payment-icons/visa.png"
                  aria-label="图标URL"
                />
                <div v-if="formData.icon_url" class="icon-preview-container">
                  <div class="icon-preview-label">预览：</div>
                  <div class="icon-preview">
                    <img :src="formData.icon_url" :alt="formData.pay_name || '支付方式图标'" class="payment-icon-preview" @error="handleImageError" />
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="selected-card-brand" class="form-label">
                卡品牌 (selectedCardBrand)
              </label>
              <div class="form-hint">
                非必填。如需指定卡品牌，请从下拉菜单中选择
              </div>
              <select
                id="selected-card-brand"
                v-model="formData.selectedCardBrand"
                class="select"
                :disabled="readonly"
                aria-label="卡品牌"
              >
                <option value="">请选择卡品牌（可选）</option>
                <option
                  v-for="brand in cardBrandOptions"
                  :key="brand"
                  :value="brand"
                >
                  {{ brand }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-footer">
          <button
            v-if="!readonly"
            type="submit"
            class="btn btn-primary"
            :disabled="!canSubmit"
            aria-label="保存"
          >
            <Icon v-if="!saving" name="check" :size="16" />
            <span>{{ saving ? '保存中...' : '保存' }}</span>
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="handleCancel"
            :aria-label="readonly ? '关闭' : '取消'"
          >
            <span>{{ readonly ? '关闭' : '取消' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { paymentAPI } from '@/api'
import Icon from '@/components/Icon.vue'

export default {
  name: 'PaymentMethodEdit',
  components: {
    Icon
  },
  props: {
    mode: {
      type: String,
      default: 'page'
    },
    prefill: {
      type: Object,
      default: null
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['cancel', 'saved'],
  data() {
    return {
      isEdit: false,
      saving: false,
      initialFormSnapshot: '',
      channelOptions: [],
      channelTemplatesByName: {},
      channelTemplatesById: {},
      currentGameName: 'Silver',
      currentSdkAppId: 'Silver',
      formData: {
        sdk_app_id: 'Silver',
        pay_name: '',
        pay_type: '',
        status: 'enabled',
        icon_url: '',
        selectedCardBrand: '',
        channel_ids: [],
        channel_param_configs: {}
      },
      imageError: false,
      entityId: ''
    }
  },
  computed: {
    apiRegion() {
      return this.$route.meta?.region || 'overseas'
    },
    selectedChannelOptions() {
      const selected = new Set(this.formData.channel_ids || [])
      return this.channelOptions.filter(channel => selected.has(channel.channel_id))
    },
    isFormValid() {
      return (
        this.formData.pay_name &&
        this.isValidStatus(this.formData.status)
      )
    },
    hasChanges() {
      if (!this.isEdit) return true
      return this.getCurrentFormSnapshot() !== this.initialFormSnapshot
    },
    canSubmit() {
      if (this.saving) return false
      if (!this.isFormValid) return false
      if (this.isEdit && !this.hasChanges) return false
      return true
    },
    cardBrandOptions() {
      return ['visa', 'mastercard', 'American Express', 'Discover', 'Diners', 'JCB', 'Carte Bancaire']
    }
  },
  watch: {
    'formData.channel_ids': {
      deep: true,
      handler() {
        this.syncChannelParamConfigs()
      }
    }
  },
  async mounted() {
    await this.fetchChannels()
    if (Array.isArray(this.prefill?.channel_ids) && this.prefill.channel_ids.length > 0) {
      this.formData.channel_ids = [...this.prefill.channel_ids]
    }
    const id = this.prefill?.id ?? this.$route.params.id
    if (id) {
      this.isEdit = true
      this.entityId = id
      await this.fetchMethod(id)
      this.initialFormSnapshot = this.getCurrentFormSnapshot()
    } else {
      this.initialFormSnapshot = this.getCurrentFormSnapshot()
    }
  },
  methods: {
    getCurrentFormSnapshot() {
      const channelIds = Array.isArray(this.formData.channel_ids)
        ? [...this.formData.channel_ids].sort()
        : []
      const channelParamConfigs = this.formData.channel_param_configs && typeof this.formData.channel_param_configs === 'object'
        ? Object.keys(this.formData.channel_param_configs)
          .sort()
          .reduce((acc, key) => {
            const cfg = this.formData.channel_param_configs[key]
            acc[key] = cfg && typeof cfg === 'object' ? { ...cfg } : {}
            return acc
          }, {})
        : {}
      return JSON.stringify({
        sdk_app_id: this.formData.sdk_app_id || '',
        pay_name: this.formData.pay_name || '',
        status: this.formData.status || '',
        icon_url: this.formData.icon_url || '',
        selectedCardBrand: this.formData.selectedCardBrand || '',
        channel_ids: channelIds,
        channel_param_configs: channelParamConfigs
      })
    },
    isValidStatus(s) {
      return s === 'enabled' || s === 'disabled' || s === 'maintenance'
    },
    normalizeMethodStatus(method) {
      const st = method?.status
      if (st === 'enabled' || st === 'disabled' || st === 'maintenance') return st
      if (typeof st === 'boolean') return st ? 'enabled' : 'disabled'
      if (typeof method?.enabled === 'boolean') {
        return method.enabled ? 'enabled' : 'disabled'
      }
      return 'enabled'
    },
    async fetchChannels() {
      try {
        const res = await paymentAPI.getPaymentChannels({ region: this.apiRegion })
        if (res.code === 200) {
          this.channelOptions = res.data.list || []
        }
      } catch (err) {
        console.error(err)
      }
    },
    async fetchMethod(id) {
      try {
        const res = await paymentAPI.getPaymentMethodDetail(id, { region: this.apiRegion })
        if (res.code === 200 && res.data) {
          const method = res.data
          this.formData = {
            sdk_app_id: method.sdk_app_id || this.currentSdkAppId,
            pay_name: method.pay_name || '',
            pay_type: method.pay_type || '',
            status: this.normalizeMethodStatus(method),
            icon_url: method.icon_url || '',
            selectedCardBrand: method.selectedCardBrand || '',
            channel_ids: method.channel_ids || (method.channel_id ? [method.channel_id] : []),
            channel_param_configs: this.normalizeChannelParamConfigs(method.channel_param_configs)
          }
          this.syncChannelParamConfigs()
          await this.ensureChannelTemplatesLoaded()
          this.imageError = false
        } else {
          this.$message.error('支付方式不存在')
          if (this.mode !== 'page') {
            this.$emit('cancel')
          } else {
            this.$router.push('/payment/methods')
          }
        }
      } catch (err) {
        this.$message.error('获取支付方式信息失败')
        console.error(err)
      }
    },
    async handleSubmit() {
      if (this.readonly) return
      if (!this.canSubmit) return
      
      // 验证
      if (!this.isValidStatus(this.formData.status)) {
        this.$message.warning('请选择状态')
        return
      }
      // 子渠道表单当前不展示渠道参数配置，提交时不做模板必填拦截
      const parsedChannelParams = this.formData.channel_param_configs || {}
      
      try {
        await this.$confirm.confirmStatusChange()
      } catch {
        return
      }

      this.saving = true
      try {
        const submitData = {
          ...this.formData,
          channel_param_configs: parsedChannelParams
        }
        if (this.isEdit) {
          await paymentAPI.updatePaymentMethod(this.entityId, submitData)
          this.$message.success('更新成功')
        } else {
          await paymentAPI.createPaymentMethod(submitData)
          this.$message.success('创建成功')
        }
        if (this.mode !== 'page') {
          this.$emit('saved')
          // 保存后统一关闭弹窗/抽屉，回到列表
          this.$emit('cancel')
        } else {
          this.$router.push('/payment/methods')
        }
      } catch (err) {
        this.$message.error(err.message || '保存失败')
        console.error(err)
      } finally {
        this.saving = false
      }
    },
    handleCancel() {
      if (this.mode !== 'page') {
        this.$emit('cancel')
      } else {
        this.$router.push('/payment/methods')
      }
    },
    handleImageError(event) {
      this.imageError = true
      event.target.style.display = 'none'
    },
    normalizeChannelParamConfigs(rawConfigs) {
      if (!rawConfigs || typeof rawConfigs !== 'object') return {}
      const result = {}
      Object.entries(rawConfigs).forEach(([channelId, cfg]) => {
        if (cfg === undefined || cfg === null || cfg === '') {
          result[channelId] = {}
          return
        }
        if (typeof cfg === 'object' && !Array.isArray(cfg)) {
          result[channelId] = { ...cfg }
          return
        }
        if (typeof cfg === 'string') {
          try {
            const parsed = JSON.parse(cfg)
            result[channelId] = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
          } catch {
            result[channelId] = {}
          }
          return
        }
        result[channelId] = {}
      })
      return result
    },
    syncChannelParamConfigs() {
      const selected = new Set(this.formData.channel_ids || [])
      const current = this.formData.channel_param_configs || {}
      const next = {}
      this.formData.channel_ids.forEach((channelId) => {
        const prev = current[channelId]
        if (prev && typeof prev === 'object' && !Array.isArray(prev)) {
          next[channelId] = { ...prev }
        } else {
          next[channelId] = {}
        }
      })
      this.formData.channel_param_configs = next
      this.ensureChannelTemplatesLoaded()
      // 清理已取消选择的渠道配置
      Object.keys(current).forEach(channelId => {
        if (!selected.has(channelId)) delete current[channelId]
      })
    },
    async ensureChannelTemplatesLoaded() {
      const selected = this.selectedChannelOptions || []
      for (const channel of selected) {
        const channelId = channel.channel_id
        const channelName = channel.channel_name
        if (!channelId || !channelName) continue
        if (this.channelTemplatesById[channelId]) continue
        let template = this.channelTemplatesByName[channelName]
        if (!template) {
          try {
            const res = await paymentAPI.getChannelTemplate(channelName)
            if (res.code === 200 && res.data) {
              template = res.data
              this.channelTemplatesByName = {
                ...this.channelTemplatesByName,
                [channelName]: template
              }
            }
          } catch {
            template = null
          }
        }
        this.channelTemplatesById = {
          ...this.channelTemplatesById,
          [channelId]: template || { channel_name: channelName, parameters: [] }
        }
        if (!this.formData.channel_param_configs[channelId] || typeof this.formData.channel_param_configs[channelId] !== 'object') {
          this.formData.channel_param_configs[channelId] = {}
        }
        const params = (this.channelTemplatesById[channelId]?.parameters || [])
        params.forEach((param) => {
          if (this.formData.channel_param_configs[channelId][param.key] == null) {
            this.formData.channel_param_configs[channelId][param.key] = ''
          }
        })
      }
    },
    buildChannelParamConfigs() {
      const rawConfigs = this.formData.channel_param_configs || {}
      const parsed = {}
      for (const channelId of this.formData.channel_ids) {
        const channelCfg = rawConfigs[channelId]
        const cfg = (channelCfg && typeof channelCfg === 'object' && !Array.isArray(channelCfg)) ? channelCfg : {}
        parsed[channelId] = { ...cfg }
      }
      return parsed
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1000px;
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

.page-content {
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--spacing-xl);
}

.readonly-banner {
  margin-bottom: var(--spacing-md);
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.is-readonly :is(.input, .select, .textarea):disabled {
  background-color: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: not-allowed;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.card-header {
  padding: var(--spacing-lg);
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-black);
  margin: 0;
}

.card-body {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group:last-child {
  margin-bottom: 0;
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  max-height: 300px;
  overflow-y: auto;
}

.channel-param-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.channel-param-item {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background-color: var(--color-bg);
}

.channel-param-title {
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.select-all-row {
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.form-error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
}

.form-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.icon-preview-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.icon-preview-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.icon-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-icon-preview {
  max-width: 80px;
  max-height: 48px;
  object-fit: contain;
  border-radius: 4px;
  background-color: var(--color-white);
  padding: 4px;
  border: 1px solid var(--color-border);
}

.readonly-value {
  padding: 8px 12px;
  background-color: var(--color-bg, #f5f5f5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: default;
}
</style>

