<template>
  <div class="page-container" :class="{ 'is-readonly': readonly }">
    <div v-if="mode === 'page'" class="page-header">
      <h1 class="page-title">{{ isEdit ? '编辑支付渠道' : '创建支付渠道' }}</h1>
      <router-link
        to="/payment/channels"
        class="btn btn-text"
        aria-label="返回支付渠道列表"
      >
        <Icon name="arrowLeft" :size="16" />
        <span>返回</span>
      </router-link>
    </div>

    <div class="page-content">
      <div v-if="readonly" class="readonly-banner">当前为只读模式</div>
      <form @submit.prevent="handleSubmit" class="form-container">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">基础信息</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="channel-name" class="form-label">
                Channel Name <span class="required">*</span>
              </label>
              <div class="form-hint">
                选择支付渠道，系统将根据渠道模板显示对应的参数配置
              </div>
              <select
                id="channel-name"
                v-model="formData.channel_name"
                class="select"
                :disabled="readonly"
                required
                aria-required="true"
                @change="handleChannelNameChange"
              >
                <option value="">请选择支付渠道</option>
                <option
                  v-for="template in channelTemplates"
                  :key="template.channel_name"
                  :value="template.channel_name"
                >
                  {{ template.display_name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="merchant-account" class="form-label">
                渠道商户账户 <span class="required">*</span>
              </label>
              <input
                id="merchant-account"
                v-model="formData.merchant_account"
                type="text"
                class="input"
                :disabled="readonly"
                placeholder="请输入商户账号"
                required
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="contract-subject" class="form-label">
                我方签约主体
              </label>
              <input
                id="contract-subject"
                v-model="formData.contract_subject"
                type="text"
                class="input"
                :disabled="readonly"
                placeholder="请输入我方签约主体（非必填）"
              />
            </div>

            <div class="form-group">
              <label for="channel-subject" class="form-label">
                渠道签约主体
              </label>
              <input
                id="channel-subject"
                v-model="formData.channel_subject"
                type="text"
                class="input"
                :disabled="readonly"
                placeholder="请输入渠道签约主体（非必填）"
              />
            </div>

          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">渠道参数配置</h2>
          </div>
          <div class="card-body">
            <div v-if="!selectedTemplate" class="form-hint">
              请先选择支付渠道，系统将根据渠道模板显示对应的参数配置。
            </div>
            <div
              v-else
              v-for="param in selectedTemplate.parameters"
              :key="param.key"
              class="form-group"
            >
              <label :for="`channel-param-${param.key}`" class="form-label">
                {{ param.label }}
                <span v-if="param.required" class="required">*</span>
              </label>
              <div v-if="param.description" class="form-hint">{{ param.description }}</div>
              <textarea
                v-if="param.type === 'textarea'"
                :id="`channel-param-${param.key}`"
                v-model="channelParams[param.key]"
                class="textarea"
                rows="4"
                :disabled="readonly"
                :placeholder="`请输入${param.label}`"
              />
              <input
                v-else
                :id="`channel-param-${param.key}`"
                v-model="channelParams[param.key]"
                type="text"
                class="input"
                :disabled="readonly"
                :placeholder="`请输入${param.label}`"
              />
            </div>
          </div>
        </div>

        <div class="form-footer">
          <button
            v-if="!readonly"
            type="submit"
            class="btn btn-primary"
            :disabled="saving"
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
  name: 'PaymentChannelEdit',
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
      entityId: '',
      channelTemplates: [],
      selectedTemplate: null,
      channelParams: {},
      copySuccess: {},
      formData: {
        sdk_app_id: 'Silver',
        channel_name: '',
        merchant_account: '',
        contract_subject: '',
        channel_subject: '',
        status: true
      }
    }
  },
  computed: {
    apiRegion() {
      return this.$route.meta?.region || 'overseas'
    }
  },
  async mounted() {
    await this.fetchChannelTemplates()
    const channelId = this.prefill?.id ?? this.$route.params.id
    if (channelId) {
      this.isEdit = true
      this.entityId = channelId
      await this.fetchChannel(channelId)
    } else {
      // 创建模式：从 query 参数预填充字段
      const source = this.prefill || this.$route.query || {}
      if (source.channel_name) {
        this.formData.channel_name = source.channel_name
        await this.loadChannelTemplate(source.channel_name)
      }
    }
  },
  watch: {
    'formData.channel_name'(newVal) {
      if (newVal) {
        this.loadChannelTemplate(newVal)
      } else {
        this.selectedTemplate = null
        this.channelParams = {}
      }
    }
  },
  methods: {
    getPayTypeName(type) {
      const typeMap = {
        card: '卡支付',
        wallet: '钱包支付',
        bank: '银行转账'
      }
      return typeMap[type] || type
    },
    async fetchChannelTemplates() {
      try {
        const res = await paymentAPI.getChannelTemplates({ region: this.apiRegion })
        if (res.code === 200) {
          this.channelTemplates = res.data.list
        }
      } catch (err) {
        console.error(err)
      }
    },
    async loadChannelTemplate(channelName) {
      if (!channelName) {
        this.selectedTemplate = null
        this.channelParams = {}
        return
      }
      try {
        const res = await paymentAPI.getChannelTemplate(channelName)
        if (res.code === 200 && res.data) {
          this.selectedTemplate = res.data
          // 初始化参数字段
          const params = {}
          res.data.parameters.forEach(param => {
            params[param.key] = this.channelParams[param.key] || ''
          })
          this.channelParams = params
        } else {
          this.selectedTemplate = null
          this.channelParams = {}
        }
      } catch (err) {
        console.error(err)
        this.selectedTemplate = null
        this.channelParams = {}
      }
    },
    handleChannelNameChange() {
      this.loadChannelTemplate(this.formData.channel_name)
    },
    async fetchChannel(channelId) {
      try {
        const res = await paymentAPI.getPaymentChannelDetail(channelId, { region: this.apiRegion })
        if (res.code === 200 && res.data) {
          const channel = res.data
          this.formData = {
            sdk_app_id: channel.sdk_app_id || 'Silver',
            channel_name: channel.channel_name || '',
            merchant_account: channel.merchant_account || '',
            contract_subject: channel.contract_subject || '',
            channel_subject: channel.channel_subject || '',
            status: channel.status !== undefined ? channel.status : true
          }
          // 加载渠道模板并填充参数
          if (channel.channel_name) {
            await this.loadChannelTemplate(channel.channel_name)
            // 从 channel 数据中提取参数值
            if (this.selectedTemplate) {
              this.selectedTemplate.parameters.forEach(param => {
                // 兼容旧数据格式（public_key, private_key等）
                const paramValue = channel[param.key] || channel[`${param.key}_value`] || ''
                if (paramValue) {
                  this.channelParams[param.key] = paramValue
                }
              })
            }
          }
        } else {
          this.$message.error('支付渠道不存在')
          if (this.mode !== 'page') {
            this.$emit('cancel')
          } else {
            this.$router.push('/payment/channels')
          }
        }
      } catch (err) {
        this.$message.error('获取支付渠道信息失败')
        console.error(err)
      }
    },
    async handleSubmit() {
      if (this.readonly) return
      if (this.saving) return
      
      // 验证必填参数（channelParams 来自 JSON 解析）
      if (!this.selectedTemplate) {
        this.$message.error('请先选择支付渠道')
        return
      }

      if (this.selectedTemplate && this.selectedTemplate.parameters) {
        for (const param of this.selectedTemplate.parameters) {
          if (param.required) {
            const value = this.channelParams[param.key]
            if (value === undefined || value === null || value === '') {
              this.$message.error(`请填写 ${param.label}`)
              return
            }
          }
        }
      }
      
      try {
        await this.$confirm.confirmStatusChange()
      } catch {
        return
      }

      this.saving = true
      try {
        if (!this.formData.sdk_app_id) {
          this.formData.sdk_app_id = 'Silver'
        }
        // 合并表单数据和渠道参数
        const submitData = {
          ...this.formData,
          ...this.channelParams
        }

        let savedChannel = null
        if (this.isEdit) {
          // TODO: 调用更新API
          const res = await paymentAPI.updatePaymentChannel(this.entityId, {
            ...submitData,
            channel_id: this.entityId
          })
          savedChannel = res?.data || {
            ...submitData,
            channel_id: this.entityId
          }
          this.$message.success('更新成功')
        } else {
          // TODO: 调用创建API
          const res = await paymentAPI.createPaymentChannel(submitData)
          savedChannel = res?.data || submitData
          this.$message.success('创建成功')
        }
        if (this.mode !== 'page') {
          this.$emit('saved', savedChannel)
          this.$emit('cancel')
        } else {
          this.$router.push('/payment/channels')
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
        this.$router.push('/payment/channels')
      }
    },
    async handleCopy(text, type) {
      if (!text) {
        this.$message.warning('没有可复制的内容')
        return
      }
      
      try {
        await navigator.clipboard.writeText(text)
        this.$set(this.copySuccess, type, true)
        this.$message.success('已复制到剪贴板')
        setTimeout(() => {
          this.$set(this.copySuccess, type, false)
        }, 2000)
      } catch (err) {
        // 降级方案
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          this.$set(this.copySuccess, type, true)
          this.$message.success('已复制到剪贴板')
          setTimeout(() => {
            this.$set(this.copySuccess, type, false)
          }, 2000)
        } catch (e) {
          this.$message.error('复制失败')
        }
        document.body.removeChild(textarea)
      }
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

.form-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  line-height: 1.5;
}

.required {
  color: var(--color-error);
}

.input-with-copy {
  position: relative;
}

.textarea {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  resize: vertical;
  min-height: 120px;
}

.textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.btn-copy {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.btn-copy:hover {
  background-color: var(--color-bg);
  border-color: var(--color-primary);
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
}

.mono-inline {
  font-family: monospace;
}

.json-error {
  margin-top: var(--spacing-xs);
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.json-textarea {
  background: #0b0b0b;
  color: #e6f4ff;
  border-color: #2a2a2a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  line-height: 1.55;
}

.json-textarea::placeholder {
  color: rgba(230, 244, 255, 0.45);
}

.json-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);
}
</style>

