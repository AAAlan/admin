<template>
  <div class="page-container" :class="{ 'is-readonly': readonly }">
    <div v-if="mode === 'page'" class="page-header">
      <h1 class="page-title">全局收银台模版</h1>
      <router-link
        :to="sortListPath"
        class="btn btn-text"
        aria-label="返回列表"
      >
        <Icon name="arrowLeft" :size="16" />
        <span>返回</span>
      </router-link>
    </div>

    <div class="page-content">
      <div v-if="readonly" class="readonly-banner">当前为只读模式</div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">基础配置</h2>
        </div>
        <div class="card-body">
          <div class="config-fields-list">
            <div class="form-group form-group--template-name">
              <label for="sort-cashier-name" class="form-label">
                收银台模版名称 <span class="required">*</span>
              </label>
              <input
                id="sort-cashier-name"
                v-model.trim="config.cashier_template_name"
                type="text"
                class="input"
                :class="{ 'input--invalid': config.cashier_template_name && !isCashierTemplateNameValid }"
                :disabled="readonly"
                placeholder="例如 saki_usd_web_main"
                maxlength="64"
                autocomplete="off"
              />
              <div class="name-spec-block">
                <p class="form-hint">
                  <strong>规范：</strong>2～64 位，仅字母、数字、<code class="hint-code">_</code>、<code class="hint-code">-</code>。
                  示例：<code class="hint-code">saki_usd_web_main</code>、<code class="hint-code">silver_CN_native_01</code>。
                </p>
              </div>
            </div>

            <div class="form-group">
              <label for="sort-country" class="form-label">
                国家/IP <span class="required">*</span>
              </label>
              <select
                id="sort-country"
                v-model="config.country_code"
                class="select"
                :disabled="readonly || lockDomesticBasicFields"
                @change="handleCountryChange"
                required
                aria-required="true"
              >
                <option value="">请选择国家/IP</option>
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
              <label for="sort-currency" class="form-label">
                币种 <span class="required">*</span>
              </label>
              <select
                id="sort-currency"
                v-model="config.currency_code"
                class="select"
                :disabled="readonly || lockDomesticBasicFields"
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

            <div v-if="paymentRegion !== 'domestic'" class="form-group form-group--collect-postal">
              <div class="collect-postal-head">
                <span id="sort-collect-postal-label" class="form-label">邮编收集</span>
                <div class="switch-group collect-postal-switch" @click.stop>
                  <label class="switch">
                    <input
                      v-model="config.collect_postal_code"
                      type="checkbox"
                      :disabled="readonly"
                      :aria-labelledby="'sort-collect-postal-label'"
                    />
                    <span class="switch-slider" />
                  </label>
                  <span class="switch-label">{{ config.collect_postal_code ? '开启' : '关闭' }}</span>
                </div>
              </div>
              <p class="form-hint">
                开启后，海外收银台将引导用户填写邮编，用于税费计算或部分卡渠道风控；可按模版单独控制，与「收银台账单信息收集」能力对齐。
              </p>
            </div>

            <div v-if="showDomesticTemplateTypeField" class="form-group">
              <span id="sort-domestic-type-label" class="form-label">
                收银台模版类型 <span class="required">*</span>
              </span>
              <div
                class="domestic-cashier-type-options"
                role="radiogroup"
                aria-labelledby="sort-domestic-type-label"
              >
                <label class="radio-option">
                  <input
                    v-model="config.is_web_cashier"
                    type="radio"
                    class="radio-input"
                    :value="false"
                    :disabled="readonly || lockDomesticTemplateType"
                  />
                  <span>原生收银台模版</span>
                </label>
                <label class="radio-option">
                  <input
                    v-model="config.is_web_cashier"
                    type="radio"
                    class="radio-input"
                    :value="true"
                    :disabled="readonly || lockDomesticTemplateType"
                  />
                  <span>Web 收银台模版</span>
                </label>
              </div>
              <p v-if="lockDomesticTemplateType && prefill?.scenario" class="form-hint">
                类型与当前支付场景一致，创建后如需另一类模版请从列表重新创建。
              </p>
            </div>

            <div v-if="paymentRegion === 'domestic'" class="form-group form-group--simulator">
              <div class="simulator-switch-head">
                <span id="sort-simulator-label" class="form-label">模拟器</span>
                <div class="switch-group simulator-switch" @click.stop>
                  <label class="switch">
                    <input
                      v-model="config.is_simulator"
                      type="checkbox"
                      :disabled="readonly"
                      :aria-labelledby="'sort-simulator-label'"
                    />
                    <span class="switch-slider" />
                  </label>
                  <span class="switch-label">{{ config.is_simulator ? '模拟器' : '非模拟器' }}</span>
                </div>
              </div>
              <p class="form-hint">开启后按<strong>模拟器环境</strong>运行该收银台模版；关闭为正常设备环境。</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-content">
            <div>
              <h2 class="card-title">支付方式配置</h2>
              <p class="card-desc">拖拽调整顺序，排在前面的支付方式会优先展示给用户。可为每条方式单独启用或禁用。</p>
            </div>
            <button
              v-if="!readonly"
              class="btn btn-primary"
              :disabled="!isConfigReady"
              @click="handleAddMethod"
              aria-label="添加支付方式"
            >
              <Icon name="plus" :size="16" />
              <span>添加支付方式</span>
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="config-info">
            <span class="info-tag">应用: {{ config.app_id }}</span>
            <span class="info-tag">币种: {{ config.currency_code || '未选择' }}</span>
            <span class="info-tag">国家/IP: {{ config.country_code || '未选择' }}</span>
            <span v-if="paymentRegion === 'domestic'" class="info-tag">
              模版类型: {{ config.is_web_cashier ? 'Web 收银台' : '原生收银台' }}
            </span>
            <span v-if="paymentRegion === 'domestic'" class="info-tag">
              模拟器: {{ config.is_simulator ? '是' : '否' }}
            </span>
            <span v-if="paymentRegion !== 'domestic'" class="info-tag">
              邮编收集: {{ config.collect_postal_code ? '开启' : '关闭' }}
            </span>
          </div>
          <p v-if="!isConfigReady" class="form-hint config-waiting-hint">
            请先选择币种和国家/IP，再配置支付方式排序与开关。
          </p>
          <div v-else class="sortable-list">
            <div
              v-for="(method, index) in channelList"
              :key="method.id"
              class="sortable-item"
              :class="{ 'sortable-item--disabled': method.enabled === false }"
              :draggable="!readonly"
              @dragstart="handleDragStart(index, $event)"
              @dragover.prevent="handleDragOver(index, $event)"
              @drop="handleDrop(index, $event)"
              @dragend="handleDragEnd"
            >
              <div class="drag-handle">
                <Icon name="more" :size="16" />
              </div>
              <div class="item-content">
                <div class="item-head">
                  <div class="item-name">{{ method.pay_name }}</div>
                </div>
                <div v-if="method.selectedCardBrands && method.selectedCardBrands.length > 0" class="item-details">
                  <span
                    v-for="brand in method.selectedCardBrands"
                    :key="brand"
                    class="badge badge-info"
                  >{{ brand }}</span>
                </div>
                <div class="item-channel-info">
                  <span class="channel-info-label">渠道：</span>
                  <span class="channel-info-value">{{ method.channel_name || method.channel_id || '-' }}</span>
                </div>
                <div class="item-recommend">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      v-model="method.is_recommended"
                      :disabled="readonly"
                    />
                    推荐支付方式
                  </label>
                  <div v-if="method.is_recommended" class="recommend-text-row">
                    <input
                      v-model="method.recommend_text"
                      type="text"
                      class="input recommend-input"
                      :disabled="readonly"
                      placeholder="请输入推荐文案，如：到账快、手续费低"
                      aria-label="推荐文案"
                    />
                    <button
                      v-if="enableI18nTranslate"
                      type="button"
                      class="btn btn-i18n"
                      :class="{ 'btn-i18n--active': hasValidI18nKey(method.recommend_i18n_key) }"
                      :title="hasValidI18nKey(method.recommend_i18n_key) ? '查看/编辑多语言配置' : '配置多语言'"
                      @click="openRecommendI18n(method)"
                    >
                      🌐
                      <span class="btn-i18n-label">{{ hasValidI18nKey(method.recommend_i18n_key) ? '已配置' : '多语言' }}</span>
                    </button>
                  </div>
                  <div v-if="paymentRegion === 'domestic'" class="item-qr-scan">
                    <label class="checkbox-label">
                      <input
                        v-model="method.qr_scan_pay"
                        type="checkbox"
                        :disabled="readonly"
                      />
                      二维码扫码支付
                    </label>
                  </div>
                </div>
              </div>
              <div class="item-actions">
                <div class="item-order">{{ index + 1 }}</div>
                <div class="switch-group method-enable-switch" @click.stop>
                  <label class="switch">
                    <input
                      type="checkbox"
                      :checked="method.enabled !== false"
                      :disabled="readonly"
                      :aria-label="`${method.pay_name} ${method.enabled !== false ? '启用' : '禁用'}`"
                      @change="togglePaymentMethodEnabled(method, $event)"
                    />
                    <span class="switch-slider"></span>
                  </label>
                  <span class="switch-label">{{ method.enabled !== false ? '启用' : '禁用' }}</span>
                </div>
                <button
                  v-if="!readonly"
                  class="btn btn-icon btn-danger-text"
                  @click.stop="handleRemoveMethod(index)"
                  :aria-label="`删除 ${method.pay_name}`"
                >
                  <Icon name="delete" :size="16" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="isConfigReady && channelList.length === 0" class="empty-state">
            <p>暂无支付方式</p>
            <button v-if="!readonly" class="btn btn-primary" @click="handleAddMethod">
              <Icon name="plus" :size="16" />
              <span>添加支付方式</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="!readonly" class="form-footer">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!isConfigReady || !hasChanges || saving || !isCashierTemplateNameValid"
          @click="handleSave"
          :aria-label="primarySaveAriaLabel"
        >
          <Icon v-if="!saving" name="check" :size="16" />
          <span>{{ saving ? primarySavePendingLabel : primarySaveLabel }}</span>
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="handleReset"
          aria-label="重置"
        >
          <span>重置</span>
        </button>
      </div>
    </div>

    <!-- 支付方式选择器 -->
    <PaymentMethodSelector
      v-model:visible="showMethodSelector"
      :app-id="config.app_id"
      :currency="config.currency_code"
      :country-code="config.country_code"
      :exclude-ids="channelList.map(m => m.id)"
      :contained="mode === 'drawer'"
      :region="paymentRegion"
      @confirm="handleMethodSelected"
    />

    <!-- 推荐文案多语言编辑 -->
    <I18nTextEditor
      v-if="enableI18nTranslate"
      v-model:visible="i18nEditorVisible"
      :i18n-key="i18nEditingKey"
      category="recommend"
      :zh-cn-default="i18nEditingZhCn"
      :used-by="i18nEditingUsedBy"
      @saved="onRecommendI18nSaved"
    />
  </div>
</template>

<script>
import { appAPI, configAPI, paymentAPI } from '@/api'
import Icon from '@/components/Icon.vue'
import PaymentMethodSelector from './PaymentMethodSelector.vue'
import { cashierGameNameFromAppId, getCashierPublicTemplateId } from '@/utils/cashierPublicTemplateId.js'
import I18nTextEditor from '@/components/I18nTextEditor.vue'
import { getEntry } from '@/utils/i18nTextStore.js'

const PAYMENT_SORT_CONFIG_STORAGE_KEY = 'payment_sort_configs_v1'

export default {
  name: 'PaymentSort',
  props: {
    mode: {
      type: String,
      default: 'page'
    },
    prefill: {
      type: Object,
      default: null
    },
    /** 与支付场景产线一致：overseas / domestic；未传时用路由 meta */
    region: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  components: {
    Icon,
    PaymentMethodSelector,
    I18nTextEditor
  },
  emits: ['saved'],
  data() {
    return {
      appList: [],
      currencies: [],
      channelList: [],
      originalChannelList: [],
      config: {
        app_id: 'saki',
        currency_code: '',
        country_code: '',
        payment_env: '',
        is_web_cashier: false,
        publish_status: 'offline',
        cashier_template_name: '',
        collect_postal_code: false,
        is_simulator: false
      },
      originalPublishStatus: 'offline',
      originalCashierTemplateName: '',
      originalCollectPostalCode: false,
      originalIsSimulator: false,
      saving: false,
      draggedIndex: null,
      showMethodSelector: false,
      i18nEditorVisible: false,
      i18nEditingKey: '',
      i18nEditingZhCn: '',
      i18nEditingUsedBy: '',
      i18nTargetMethod: null
    }
  },
  computed: {
    paymentRegion() {
      return this.region || this.$route.meta?.region || 'overseas'
    },
    sortListPath() {
      return this.paymentRegion === 'domestic' ? '/domestic/payment/sort' : '/payment/sort'
    },
    lockDomesticBasicFields() {
      return this.paymentRegion === 'domestic'
    },
    showDomesticTemplateTypeField() {
      return this.paymentRegion === 'domestic'
    },
    enableI18nTranslate() {
      return this.paymentRegion !== 'domestic'
    },
    /** 国内：从场景带入或编辑已有模版时锁定类型，避免与已存在 rowKey 不一致 */
    lockDomesticTemplateType() {
      if (this.readonly) return true
      if (this.mode === 'drawer') return true
      if (this.prefill?.scenario && this.prefill.is_web_cashier !== undefined) return true
      return false
    },
    isConfigReady() {
      return !!(this.config.app_id && this.config.currency_code && this.config.country_code)
    },
    /** 收银台模版名称：必填 + 2～64，仅字母数字下划线连字符 */
    isCashierTemplateNameValid() {
      const t = String(this.config.cashier_template_name || '').trim()
      return /^[a-zA-Z0-9_-]{2,64}$/.test(t)
    },
    hasChanges() {
      return (
        JSON.stringify(this.channelList) !== JSON.stringify(this.originalChannelList) ||
        this.config.publish_status !== this.originalPublishStatus ||
        String(this.config.cashier_template_name || '').trim() !==
          String(this.originalCashierTemplateName || '').trim() ||
        !!this.config.collect_postal_code !== !!this.originalCollectPostalCode ||
        !!this.config.is_simulator !== !!this.originalIsSimulator
      )
    },
    /** 创建弹窗：主操作即发布；抽屉/独立页仍用「确认」 */
    primarySaveLabel() {
      return this.mode === 'modal' ? '发布' : '确认'
    },
    primarySavePendingLabel() {
      return this.mode === 'modal' ? '发布中...' : '确认中...'
    },
    primarySaveAriaLabel() {
      return this.mode === 'modal' ? '发布' : '确认'
    }
  },
  watch: {
    prefill: {
      deep: true,
      handler(newVal) {
        // 抽屉打开后，可能会多次切换配置对象，此时需要重新用新参数初始化
        this.applyPrefill(newVal)
      }
    },
    'config.is_web_cashier'(next, prev) {
      if (prev === undefined || next === prev) return
      if (this.readonly || this.lockDomesticTemplateType) return
      if (this.paymentRegion !== 'domestic' || this.mode !== 'modal') return
      this.channelList = []
      this.originalChannelList = []
      if (this.config.app_id && this.config.currency_code && this.config.country_code) {
        this.fetchChannels()
      }
    }
  },
  async mounted() {
    await this.fetchApps()
    await this.fetchCurrencies()

    // 页面模式继续兼容使用路由 query 预填充；抽屉模式则优先使用传入的 prefill
    await this.applyPrefill(this.prefill || this.$route.query)
  },
  methods: {
    getCurrentConfigKey() {
      return [
        this.paymentRegion || 'overseas',
        this.config.app_id || '',
        this.config.country_code || '',
        this.config.currency_code || '',
        this.config.payment_env || '',
        this.config.is_web_cashier ? 'web' : 'nonweb'
      ].join('|')
    },
    readPersistedConfigs() {
      try {
        const raw = localStorage.getItem(PAYMENT_SORT_CONFIG_STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    },
    writePersistedConfigs(payload) {
      try {
        localStorage.setItem(PAYMENT_SORT_CONFIG_STORAGE_KEY, JSON.stringify(payload || {}))
      } catch {
        // ignore storage errors in mock mode
      }
    },
    readPersistedCurrentConfig() {
      const store = this.readPersistedConfigs()
      const key = this.getCurrentConfigKey()
      const item = store[key]
      if (!item || !Array.isArray(item.payment_methods)) return null
      return item
    },
    persistCurrentConfig() {
      const store = this.readPersistedConfigs()
      const key = this.getCurrentConfigKey()
      store[key] = {
        app_id: this.config.app_id,
        country_code: this.config.country_code,
        currency: this.config.currency_code,
        payment_env: this.config.payment_env,
        is_web_cashier: this.config.is_web_cashier,
        publish_status: this.config.publish_status,
        cashier_template_name: String(this.config.cashier_template_name || '').trim(),
        collect_postal_code: this.paymentRegion !== 'domestic' && !!this.config.collect_postal_code,
        is_simulator: this.paymentRegion === 'domestic' && !!this.config.is_simulator,
        payment_methods: this.channelList.map((item, index) => ({
          ...item,
          sort_order: index + 1
        }))
      }
      this.writePersistedConfigs(store)
    },
    async applyPrefill(source) {
      const src = source || {}

      this.saving = false
      this.showMethodSelector = false
      this.draggedIndex = null

      this.config.app_id = src.app_id || ''
      if (!this.config.app_id) this.config.app_id = 'saki'
      this.config.currency_code = src.currency || ''
      this.config.country_code = src.country_code || ''
      this.config.payment_env = src.payment_env || ''

      if (src.is_web_cashier !== undefined) {
        this.config.is_web_cashier = src.is_web_cashier === 'true' || src.is_web_cashier === true
      } else {
        this.config.is_web_cashier = false
      }

      if (src.publish_status === 'published' || src.publish_status === 'offline') {
        this.config.publish_status = src.publish_status
      } else {
        this.config.publish_status = 'offline'
      }

      this.config.cashier_template_name =
        src.cashier_template_name != null ? String(src.cashier_template_name).trim() : ''

      if (this.paymentRegion === 'domestic') {
        this.config.collect_postal_code = false
      } else if (src.collect_postal_code !== undefined && src.collect_postal_code !== null) {
        this.config.collect_postal_code = src.collect_postal_code === true || src.collect_postal_code === 'true'
      } else {
        this.config.collect_postal_code = false
      }

      if (this.paymentRegion === 'domestic') {
        if (src.is_simulator !== undefined && src.is_simulator !== null) {
          this.config.is_simulator = src.is_simulator === true || src.is_simulator === 'true'
        } else {
          this.config.is_simulator = false
        }
      } else {
        this.config.is_simulator = false
      }

      if (this.paymentRegion === 'domestic') {
        this.config.country_code = 'CN'
        this.config.currency_code = 'CNY'
      }

      // 清空旧数据，避免切换抽屉配置时残留列表
      this.channelList = []
      this.originalChannelList = []

      // 如果关键参数都已填充，自动加载支付方式列表
      if (this.config.app_id && this.config.currency_code && this.config.country_code) {
        await this.fetchChannels()
      }
      this.originalPublishStatus = this.config.publish_status
      this.originalCashierTemplateName = String(this.config.cashier_template_name || '').trim()
      this.originalCollectPostalCode = !!this.config.collect_postal_code
      this.originalIsSimulator = !!this.config.is_simulator
    },
    async fetchApps() {
      try {
        const res = await appAPI.getApps()
        if (res.code === 200) {
          this.appList = res.data.list
        }
      } catch (err) {
        console.error(err)
      }
    },
    async fetchCurrencies() {
      try {
        // Mock数据 - 币种列表
        this.currencies = [
          { code: 'USD', name: '美元' },
          { code: 'CNY', name: '人民币' },
          { code: 'EUR', name: '欧元' },
          { code: 'GBP', name: '英镑' },
          { code: 'JPY', name: '日元' },
          { code: 'KRW', name: '韩元' },
          { code: 'CAD', name: '加元' },
          { code: 'AUD', name: '澳元' }
        ]
      } catch (err) {
        console.error(err)
      }
    },
    async handleAppChange() {
      if (!this.config.app_id) {
        this.config.currency_code = ''
        this.config.country_code = ''
        this.channelList = []
      }
    },
    async handleCurrencyChange() {
      if (this.lockDomesticBasicFields) return
      if (!this.config.currency_code) {
        this.config.country_code = ''
        this.channelList = []
      }
    },
    async handleCountryChange() {
      if (this.lockDomesticBasicFields) return
      if (this.config.country_code) {
        await this.fetchChannels()
      } else {
        this.channelList = []
      }
    },
    async fetchChannels() {
      if (!this.config.app_id || !this.config.currency_code || !this.config.country_code) {
        return
      }
      try {
        const persisted = this.readPersistedCurrentConfig()
        if (persisted) {
          this.config.publish_status = persisted.publish_status || this.config.publish_status || 'offline'
          if (persisted.cashier_template_name !== undefined && persisted.cashier_template_name !== null) {
            this.config.cashier_template_name = String(persisted.cashier_template_name || '').trim()
          }
          if (this.paymentRegion !== 'domestic' && persisted.collect_postal_code !== undefined) {
            this.config.collect_postal_code = !!persisted.collect_postal_code
          }
          if (this.paymentRegion === 'domestic') {
            this.config.collect_postal_code = false
          }
          if (this.paymentRegion === 'domestic' && persisted.is_simulator !== undefined) {
            this.config.is_simulator = !!persisted.is_simulator
          }
          if (this.paymentRegion !== 'domestic') {
            this.config.is_simulator = false
          }
          this.channelList = (persisted.payment_methods || []).map((m, index) => ({
            ...m,
            channel_name: m.channel_name || m.payment_channel_name || m.channel_id || '',
            selectedCardBrands: Array.isArray(m.selectedCardBrands) ? m.selectedCardBrands : [],
            enabled: m.enabled !== false,
            sort_order: index + 1,
            qr_scan_pay: this.paymentRegion === 'domestic' && !!m.qr_scan_pay
          }))
          const cleaned = this.cleanupInvalidI18nKeysInMethods(this.channelList)
          this.originalChannelList = JSON.parse(JSON.stringify(this.channelList))
          this.originalCashierTemplateName = String(this.config.cashier_template_name || '').trim()
          this.originalCollectPostalCode = !!this.config.collect_postal_code
          this.originalIsSimulator = !!this.config.is_simulator
          if (cleaned) this.persistCurrentConfig()
          return
        }

        const [methodRes, channelRes] = await Promise.all([
          paymentAPI.getPaymentMethods({ region: this.paymentRegion }),
          paymentAPI.getPaymentChannels({ region: this.paymentRegion })
        ])
        const methods = methodRes.code === 200 ? (methodRes.data.list || []) : []
        const channels = channelRes.code === 200 ? (channelRes.data.list || []) : []
        const channelNameMap = new Map(
          channels.map(c => [c.channel_id, c.pay_name || c.channel_name || c.channel_id])
        )
        const mergedMap = new Map()
        methods.forEach((m) => {
          const channelId = m.channel_id || (Array.isArray(m.channel_ids) ? m.channel_ids[0] : '')
          if (!channelId || !m.pay_name) return
          const key = `${channelId}::${m.pay_name}`
          const existing = mergedMap.get(key)
          if (existing) {
            if (m.selectedCardBrand && !existing.selectedCardBrands.includes(m.selectedCardBrand)) {
              existing.selectedCardBrands.push(m.selectedCardBrand)
            }
            return
          }
          mergedMap.set(key, {
            id: String(m.id || key),
            payment_method_id: m.payment_method_id || `pm_${m.id || key}`,
            pay_name: m.pay_name,
            selectedCardBrands: m.selectedCardBrand ? [m.selectedCardBrand] : [],
            channel_id: channelId,
            channel_name: channelNameMap.get(channelId) || channelId,
            enabled: true,
            is_recommended: false,
            recommend_text: '',
            qr_scan_pay: false,
            country_code: this.config.country_code,
            currency: this.config.currency_code
          })
        })
        this.channelList = Array.from(mergedMap.values()).map((item, index) => ({
          ...item,
          sort_order: index + 1,
          qr_scan_pay: this.paymentRegion === 'domestic' ? !!item.qr_scan_pay : false
        }))
        this.cleanupInvalidI18nKeysInMethods(this.channelList)
        this.originalChannelList = JSON.parse(JSON.stringify(this.channelList))
        this.originalCashierTemplateName = String(this.config.cashier_template_name || '').trim()
        this.originalCollectPostalCode = !!this.config.collect_postal_code
        this.originalIsSimulator = !!this.config.is_simulator
      } catch (err) {
        console.error(err)
      }
    },
    handleDragStart(index, event) {
      if (this.readonly) return
      this.draggedIndex = index
      event.dataTransfer.effectAllowed = 'move'
      event.currentTarget.style.opacity = '0.5'
    },
    handleDragOver(index, event) {
      if (this.readonly) return
      if (this.draggedIndex === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },
    handleDrop(index, event) {
      if (this.readonly) return
      event.preventDefault()
      if (this.draggedIndex === null || this.draggedIndex === index) return

      const draggedItem = this.channelList[this.draggedIndex]
      this.channelList.splice(this.draggedIndex, 1)
      this.channelList.splice(index, 0, draggedItem)
      this.draggedIndex = null
    },
    handleDragEnd(event) {
      event.currentTarget.style.opacity = '1'
      this.draggedIndex = null
    },
    handleAddMethod() {
      if (this.readonly) return
      if (!this.isConfigReady) {
        this.$message.warning('请先选择币种和国家/IP')
        return
      }
      this.showMethodSelector = true
    },
    handleRemoveMethod(index) {
      if (this.readonly) return
      this.channelList.splice(index, 1)
    },
    togglePaymentMethodEnabled(method, event) {
      if (this.readonly) return
      const on = !!event.target.checked
      const idx = this.channelList.findIndex(m => m.id === method.id)
      if (idx > -1) {
        this.channelList.splice(idx, 1, { ...this.channelList[idx], enabled: on })
      }
    },
    handleMethodSelected(methods) {
      if (this.readonly) return
      methods.forEach(method => {
        const newMethod = {
          ...method,
          channel_id: method.channel_id || '',
          channel_name: method.channel_name || method.channel_id || '',
          selectedCardBrands: method.selectedCardBrands || [],
          enabled: true,
          is_recommended: false,
          recommend_text: '',
          qr_scan_pay: false,
          country_code: this.config.country_code,
          currency: this.config.currency_code,
          sort_order: this.channelList.length + 1
        }
        const exists = this.channelList.some(
          m => m.pay_name === newMethod.pay_name && m.channel_id === newMethod.channel_id
        )
        if (!exists) {
          this.channelList.push(newMethod)
        }
      })
    },
    async handleSave() {
      if (!this.isCashierTemplateNameValid) {
        this.$message.warning(
          '请填写符合规范的收银台模版名称：2～64 个字符，仅可使用英文字母、数字、下划线 _、连字符 -，且不能为空。'
        )
        return
      }
      // 创建模式下：同一范围内不允许出现相同国家/IP + 币种的模版
      if (this.mode === 'modal') {
        const duplicatedTemplateId = await this.findDuplicateCountryCurrencyTemplateId()
        if (duplicatedTemplateId) {
          this.$message.warning(`当前国家/IP与币种组合已存在模版（${duplicatedTemplateId}），请勿重复创建`)
          return
        }
      }

      try {
        await this.$confirm.confirmStatusChange()
      } catch {
        return
      }

      this.saving = true
      try {
        this.config.publish_status = 'published'
        const saveData = {
          app_id: this.config.app_id,
          country_code: this.config.country_code,
          currency: this.config.currency_code,
          payment_env: this.config.payment_env,
          is_web_cashier: this.config.is_web_cashier,
          region: this.paymentRegion,
          publish_status: this.config.publish_status,
          payment_methods: this.channelList.map((item, index) => ({
            id: item.id,
            payment_method_id: item.payment_method_id,
            channel_id: item.channel_id,
            payment_channel_id: item.payment_channel_id,
            payment_channel_name: item.payment_channel_name,
            country_code: item.country_code,
            currency: item.currency,
            sort_order: index + 1,
            enabled: item.enabled !== false,
            is_recommended: !!item.is_recommended,
            recommend_text: item.is_recommended ? (item.recommend_text || '') : '',
            qr_scan_pay: this.paymentRegion === 'domestic' ? !!item.qr_scan_pay : false
          }))
        }
        await paymentAPI.setCashierTemplateOnline(saveData)
        await paymentAPI.saveCashierTemplateDisplayName({
          app_id: this.config.app_id,
          country_code: this.config.country_code,
          currency: this.config.currency_code,
          payment_env: this.config.payment_env,
          is_web_cashier: this.config.is_web_cashier,
          cashier_template_name: String(this.config.cashier_template_name || '').trim()
        })
        this.persistCurrentConfig()
        this.$message.success(this.mode === 'modal' ? '发布成功' : '保存成功')
        this.originalChannelList = JSON.parse(JSON.stringify(this.channelList))
        this.originalPublishStatus = this.config.publish_status
        this.originalCashierTemplateName = String(this.config.cashier_template_name || '').trim()
        this.originalCollectPostalCode = !!this.config.collect_postal_code
        this.originalIsSimulator = !!this.config.is_simulator
        if (this.mode === 'drawer' || this.mode === 'modal') {
          this.$emit('saved')
          if (this.mode === 'drawer') this.$emit('cancel')
        }
      } catch (err) {
        this.$message.error('保存失败')
        console.error(err)
      } finally {
        this.saving = false
      }
    },
    handleReset() {
      this.channelList = JSON.parse(JSON.stringify(this.originalChannelList))
      this.config.publish_status = this.originalPublishStatus
      this.config.cashier_template_name = String(this.originalCashierTemplateName || '').trim()
      this.config.collect_postal_code = !!this.originalCollectPostalCode
      this.config.is_simulator = !!this.originalIsSimulator
    },
    hasValidI18nKey(key) {
      const value = String(key || '').trim()
      if (!value) return false
      return !!getEntry(value)
    },
    cleanupInvalidI18nKeysInMethods(methods) {
      if (!Array.isArray(methods)) return false
      let changed = false
      methods.forEach((m) => {
        const key = String(m?.recommend_i18n_key || '').trim()
        if (key && !getEntry(key)) {
          m.recommend_i18n_key = ''
          changed = true
        }
      })
      return changed
    },

    openRecommendI18n(method) {
      this.i18nTargetMethod = method
      this.i18nEditingKey = method.recommend_i18n_key || ''
      this.i18nEditingZhCn = method.recommend_text || ''
      this.i18nEditingUsedBy = `推荐文案 / ${method.pay_name || ''}`
      this.i18nEditorVisible = true
    },
    onRecommendI18nSaved(entry) {
      if (this.i18nTargetMethod) {
        this.i18nTargetMethod.recommend_i18n_key = entry.key
      }
      this.i18nTargetMethod = null
    },
    getPayTypeName(type) {
      const typeMap = {
        card: '卡支付',
        wallet: '钱包支付',
        bank: '银行转账'
      }
      return typeMap[type] || type
    },
    async findDuplicateCountryCurrencyTemplateId() {
      try {
        const scenario = this.prefill?.scenario || 'global'
        const res = await paymentAPI.getPaymentSortList({
          page: 1,
          page_size: 1000,
          region: this.paymentRegion,
          scenario
        })
        if (res.code !== 200) return ''
        const list = res.data?.list || []
        const game = cashierGameNameFromAppId(this.config.app_id)
        const duplicated = list.find(
          item =>
            cashierGameNameFromAppId(item.app_id) === game &&
            item.country_code === this.config.country_code &&
            item.currency === this.config.currency_code &&
            (item.payment_env || '') === (this.config.payment_env || '') &&
            !!item.is_web_cashier === !!this.config.is_web_cashier
        )
        if (!duplicated) return ''
        return getCashierPublicTemplateId(duplicated)
      } catch (err) {
        console.error(err)
        return ''
      }
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
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

.readonly-banner {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.is-readonly :is(.input, .select, textarea):disabled {
  background-color: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: not-allowed;
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

.config-fields-list {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.domestic-cashier-type-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-base);
  margin-top: var(--spacing-xs);
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.radio-input {
  margin: 0;
}

.radio-input:disabled + span {
  opacity: 0.85;
}

.config-fields-list .form-group {
  flex: 1;
  min-width: 200px;
}

.config-fields-list .form-group--template-name {
  flex: 1 1 100%;
  min-width: 220px;
}

.config-fields-list .form-group--template-name .input {
  max-width: 520px;
}

.config-fields-list .form-group--template-name .input--invalid:not(:disabled) {
  border-color: #cf1322;
}

.config-fields-list .form-group--collect-postal {
  flex: 1 1 100%;
  min-width: 220px;
}

.collect-postal-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.collect-postal-switch {
  flex-shrink: 0;
}

.config-fields-list .form-group--simulator {
  flex: 1 1 100%;
  min-width: 220px;
}

.simulator-switch-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.simulator-switch {
  flex-shrink: 0;
}

.name-spec-block {
  margin-top: var(--spacing-xs);
}

.hint-code {
  font-size: var(--font-size-xs);
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--color-bg, #f5f5f5);
  border: 1px solid var(--color-border-secondary, #f0f0f0);
}

.card-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-sm) 0 0 0;
}

.card-header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-lg);
}

.form-hint {
  display: block;
  margin-top: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.config-waiting-hint {
  margin-bottom: var(--spacing-md);
}

.sortable-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.sortable-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius);
  cursor: move;
  transition: var(--transition);
}

.sortable-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.sortable-item--disabled {
  opacity: 0.72;
  border-style: dashed;
}

.method-enable-switch {
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.method-enable-switch .switch-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.switch-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d9d9d9;
  transition: var(--transition);
  border-radius: 24px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  transition: var(--transition);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.switch input:checked + .switch-slider {
  background-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04) inset;
}

.switch input:checked + .switch-slider:before {
  transform: translateX(20px);
}

.switch-label {
  color: var(--color-text);
  font-size: var(--font-size-base);
}

.sortable-item.dragging {
  opacity: 0.5;
}

.drag-handle {
  color: var(--color-text-tertiary);
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.item-content {
  flex: 1;
}

.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.item-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.item-details {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  font-size: var(--font-size-xs);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-sm);
}

.item-recommend {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
}

.item-qr-scan {
  margin-top: var(--spacing-sm);
}

.item-channel-info {
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.channel-info-label {
  font-weight: 500;
}

.channel-info-value {
  color: var(--color-text-primary);
}

.recommend-text-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--spacing-sm);
}

.recommend-input {
  flex: 1;
  min-width: 0;
}

.btn-i18n {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  height: 32px;
  border: 1px solid #d9dfe9;
  border-radius: 6px;
  background: #f8fafc;
  color: #5d6675;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-i18n:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #eaf4ff;
}
.btn-i18n--active {
  border-color: #52c41a;
  color: #389e0d;
  background: #f6ffed;
}
.btn-i18n-label {
  font-size: 12px;
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

.item-order {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg);
  border-radius: 50%;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  cursor: pointer;
  transition: var(--transition);
}

.btn-danger-text {
  color: var(--color-text-tertiary);
}

.btn-danger-text:hover {
  color: var(--color-danger, #e53e3e);
  background-color: rgba(229, 62, 62, 0.08);
}

.config-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.info-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-4xl);
  color: var(--color-text-tertiary);
}

.empty-state .btn {
  margin-top: var(--spacing-md);
}

@media (max-width: 960px) {
  .card-header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .card-header-content .btn {
    width: 100%;
    justify-content: center;
  }

  .sortable-item {
    padding: var(--spacing-md);
  }

  .item-actions {
    flex-direction: row;
    align-self: flex-end;
  }
}

@media (max-width: 640px) {
  .item-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

