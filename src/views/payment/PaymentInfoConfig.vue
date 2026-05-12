<template>
  <div class="page-container">
    <div v-if="mode === 'page'" class="page-header">
      <h1 class="page-title">收银台账单信息收集</h1>
      <router-link
        to="/payment/info-config"
        class="btn btn-text"
        aria-label="返回列表"
      >
        <Icon name="arrowLeft" :size="16" />
        <span>返回</span>
      </router-link>
    </div>

    <div class="page-content">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">配置筛选</h2>
        </div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label for="config-currency" class="form-label">
                币种 <span class="required">*</span>
              </label>
              <select
                id="config-currency"
                v-model="config.currency_code"
                class="select"
                @change="handleCurrencyChange"
                required
                aria-required="true"
              >
                <option value="">请选择币种</option>
                <option v-for="currency in currencies" :key="currency.code" :value="currency.code">
                  {{ currency.code }} - {{ currency.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="config-country" class="form-label">
                国家地区 <span class="required">*</span>
              </label>
              <select
                id="config-country"
                v-model="config.country_code"
                class="select"
                @change="handleCountryChange"
                :disabled="!config.currency_code"
                required
                aria-required="true"
              >
                <option value="">请选择国家地区</option>
                <option value="US">US - 美国</option>
                <option value="CN">CN - 中国</option>
                <option value="JP">JP - 日本</option>
                <option value="KR">KR - 韩国</option>
                <option value="GB">GB - 英国</option>
                <option value="DE">DE - 德国</option>
                <option value="FR">FR - 法国</option>
                <option value="CA">CA - 加拿大</option>
                <option value="AU">AU - 澳大利亚</option>
              </select>
            </div>

            <div class="form-group">
              <label for="config-payment-env" class="form-label">
                支付环境 <span class="required">*</span>
              </label>
              <div class="form-hint">
                区分不同端内的收银台情况
              </div>
              <select
                id="config-payment-env"
                v-model="config.payment_env"
                class="select"
                @change="handlePaymentEnvChange"
                :disabled="!config.country_code"
                required
                aria-required="true"
              >
                <option value="">请选择支付环境</option>
                <option value="pc">PC</option>
                <option value="android">Android</option>
                <option value="apple">Apple</option>
                <option value="recharge_mall">充值商城</option>
              </select>
            </div>

            <div class="form-group">
              <label for="config-is-web-cashier" class="form-label">
                是否web收银台
              </label>
              <div class="form-hint">
                标识该收银台是否为web端收银台
              </div>
              <label class="checkbox-label">
                <input
                  id="config-is-web-cashier"
                  type="checkbox"
                  v-model="config.is_web_cashier"
                  @change="handleIsWebCashierChange"
                />
                <span>是</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div v-if="config.payment_env" class="card">
        <div class="card-header">
          <div class="card-header-content">
            <div>
              <h2 class="card-title">账单信息收集配置</h2>
              <p class="card-desc">配置收银台是否需要收集用户的账单信息。开启后，用户在支付时需要填写相应的信息。</p>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="config-form">
            <div class="config-item">
              <div class="config-item-header">
                <label class="config-label">
                  <input
                    type="checkbox"
                    v-model="formData.collect_postal_code"
                    class="checkbox"
                  />
                  <span class="label-text">是否收集邮编</span>
                </label>
              </div>
              <p class="config-desc">开启后，收银台将要求用户填写邮编信息，用于计算税费；某些支付渠道（如信用卡）也可能需要邮编进行风控验证。</p>
            </div>

            <div class="config-item">
              <div class="config-item-header">
                <label class="config-label">
                  <input
                    type="checkbox"
                    v-model="formData.collect_email"
                    class="checkbox"
                  />
                  <span class="label-text">是否收集用户邮箱</span>
                </label>
              </div>
              <p class="config-desc">开启后，收银台将要求用户填写邮箱信息。用于发送订单确认邮件和账单信息。</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="config.country_code" class="form-footer">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!hasChanges || saving"
          @click="handleSave"
          aria-label="保存配置"
        >
          <Icon v-if="!saving" name="check" :size="16" />
          <span>{{ saving ? '保存中...' : '保存配置' }}</span>
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="handleReset"
          :disabled="saving"
          aria-label="重置"
        >
          <span>重置</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { paymentAPI, appAPI } from '@/api'
import Icon from '@/components/Icon.vue'

export default {
  name: 'PaymentInfoConfig',
  emits: ['saved', 'cancel'],
  props: {
    mode: {
      type: String,
      default: 'page'
    },
    prefill: {
      type: Object,
      default: null
    }
  },
  components: {
    Icon
  },
  data() {
    return {
      appList: [],
      currencies: [
        { code: 'USD', name: '美元' },
        { code: 'CNY', name: '人民币' },
        { code: 'EUR', name: '欧元' },
        { code: 'GBP', name: '英镑' },
        { code: 'JPY', name: '日元' },
        { code: 'KRW', name: '韩元' },
        { code: 'CAD', name: '加元' },
        { code: 'AUD', name: '澳元' }
      ],
      config: {
        app_id: 'saki',
        currency_code: '',
        country_code: '',
        payment_env: '',
        is_web_cashier: false
      },
      formData: {
        collect_postal_code: false,
        collect_email: false
      },
      originalFormData: null,
      saving: false
    }
  },
  computed: {
    hasChanges() {
      if (!this.originalFormData) return false
      return (
        this.formData.collect_postal_code !== this.originalFormData.collect_postal_code ||
        this.formData.collect_email !== this.originalFormData.collect_email
      )
    }
  },
  watch: {
    prefill: {
      deep: true,
      handler(newVal) {
        this.applyPrefill(newVal)
      }
    }
  },
  async mounted() {
    await this.fetchAppList()
    await this.applyPrefill(this.prefill || this.$route.query)
  },
  methods: {
    async applyPrefill(source) {
      const src = source || {}

      this.config.app_id = src.app_id || ''
      if (!this.config.app_id) this.config.app_id = 'saki'
      this.config.country_code = src.country_code || ''
      this.config.currency_code = src.currency || ''
      this.config.payment_env = src.payment_env || ''
      if (src.is_web_cashier !== undefined) {
        this.config.is_web_cashier = src.is_web_cashier === 'true' || src.is_web_cashier === true
      } else {
        this.config.is_web_cashier = false
      }

      // 清空旧数据，避免切换抽屉配置时残留
      this.formData = {
        collect_postal_code: false,
        collect_email: false
      }
      this.originalFormData = null
      this.saving = false

      // 如果所有参数都有，则加载配置
      if (this.config.app_id && this.config.country_code && this.config.currency_code && this.config.payment_env) {
        await this.fetchConfig()
      }
    },
    async fetchAppList() {
      try {
        const res = await appAPI.getApps()
        if (res.code === 200) {
          this.appList = res.data.list || []
        }
      } catch (err) {
        console.error(err)
      }
    },
    handleAppChange() {
      if (!this.config.app_id) {
        this.config.currency_code = ''
        this.config.country_code = ''
        this.config.payment_env = ''
        this.config.is_web_cashier = false
        this.formData = {
          collect_postal_code: false,
          collect_email: false
        }
        this.originalFormData = null
      }
    },
    handleCurrencyChange() {
      if (!this.config.currency_code) {
        this.config.country_code = ''
        this.config.payment_env = ''
        this.config.is_web_cashier = false
        this.formData = {
          collect_postal_code: false,
          collect_email: false
        }
        this.originalFormData = null
      }
    },
    async handleCountryChange() {
      if (!this.config.country_code) {
        this.config.payment_env = ''
        this.config.is_web_cashier = false
        this.formData = {
          collect_postal_code: false,
          collect_email: false
        }
        this.originalFormData = null
      }
    },
    async handlePaymentEnvChange() {
      if (this.config.payment_env) {
        await this.fetchConfig()
      } else {
        this.formData = {
          collect_postal_code: false,
          collect_email: false
        }
        this.originalFormData = null
      }
    },
    async handleIsWebCashierChange() {
      // 当是否web收银台字段改变时，重新加载配置
      if (this.config.payment_env) {
        await this.fetchConfig()
      }
    },
    async fetchConfig() {
      if (!this.config.app_id || !this.config.country_code || !this.config.currency_code || !this.config.payment_env) {
        return
      }
      try {
        const res = await paymentAPI.getPaymentInfoConfig({
          app_id: this.config.app_id,
          country_code: this.config.country_code,
          currency: this.config.currency_code,
          payment_env: this.config.payment_env,
          is_web_cashier: this.config.is_web_cashier
        })
        if (res.code === 200 && res.data) {
          this.formData = {
            collect_postal_code: res.data.collect_postal_code || false,
            collect_email: res.data.collect_email || false
          }
        } else {
          // 如果没有配置，使用默认值（全部关闭）
          this.formData = {
            collect_postal_code: false,
            collect_email: false
          }
        }
        this.originalFormData = JSON.parse(JSON.stringify(this.formData))
      } catch (err) {
        console.error(err)
        // 出错时使用默认值
        this.formData = {
          collect_postal_code: false,
          collect_email: false
        }
        this.originalFormData = JSON.parse(JSON.stringify(this.formData))
      }
    },
    async handleSave() {
      if (!this.config.app_id || !this.config.country_code || !this.config.currency_code || !this.config.payment_env) {
        this.$message.error('请先选择应用、币种、国家地区和支付环境')
        return
      }

      this.saving = true
      try {
        const res = await paymentAPI.updatePaymentInfoConfig({
          app_id: this.config.app_id,
          country_code: this.config.country_code,
          currency: this.config.currency_code,
          payment_env: this.config.payment_env,
          is_web_cashier: this.config.is_web_cashier,
          ...this.formData
        })
        if (res.code === 200) {
          this.$message.success('保存成功')
          this.originalFormData = JSON.parse(JSON.stringify(this.formData))
          if (this.mode === 'modal' || this.mode === 'drawer') {
            this.$emit('saved')
            this.$emit('cancel')
          }
        } else {
          this.$message.error(res.message || '保存失败')
        }
      } catch (err) {
        this.$message.error('保存失败，请稍后重试')
        console.error(err)
      } finally {
        this.saving = false
      }
    },
    handleReset() {
      if (this.originalFormData) {
        this.formData = JSON.parse(JSON.stringify(this.originalFormData))
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
  color: var(--color-text-primary);
  margin: 0;
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.form-row {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.form-row .form-group {
  flex: 1;
  min-width: 200px;
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
  line-height: 1.5;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.config-item {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius);
  background-color: var(--color-bg-container);
}

.config-item-header {
  margin-bottom: var(--spacing-sm);
}

.config-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-primary);
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.label-text {
  font-size: var(--font-size-base);
}

.config-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-sm) 0 0 0;
  line-height: 1.6;
}

.form-footer {
  display: flex;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-secondary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

