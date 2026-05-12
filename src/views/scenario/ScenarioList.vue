<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">支付场景管理</h1>
        <p class="page-desc">创建并维护支付场景（平台、支付形式、Web 端内外等）</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <span aria-hidden="true">+</span> 创建场景
      </button>
    </div>

    <div v-if="loading" class="loading-wrap">
      <span class="loading"></span>
      <span>加载中…</span>
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>支付形式</th>
              <th>说明</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in scenarios" :key="item.id">
              <td>{{ item.platform }}</td>
              <td>
                <div class="payment-form-tags">
                  <span
                    v-for="tag in getPaymentFormTags(item)"
                    :key="`${item.id}_${tag.type}`"
                    class="meta-tag"
                    :class="tag.type === 'web' ? 'meta-tag--web' : 'meta-tag--iap'"
                  >
                    {{ tag.label }}
                  </span>
                </div>
              </td>
              <td>{{ item.description || '-' }}</td>
              <td>
                <div class="table-actions" role="group" :aria-label="`场景 ${scenarioRowLabel(item)} 操作`">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    aria-label="配置该支付场景"
                    @click="openScenarioConfig(item)"
                  >
                    配置
                  </button>
                  <button type="button" class="btn btn-text btn-sm" @click="openEdit(item)">
                    <Icon name="edit" :size="14" />
                    <span>编辑</span>
                  </button>
                  <button type="button" class="btn btn-text btn-sm btn-danger-text" @click="handleDelete(item)">
                    <Icon name="delete" :size="14" />
                    <span>删除</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="scenarios.length === 0" class="empty-state">
        暂无支付场景，请点击「创建场景」添加
      </div>
    </template>

    <!-- 创建场景：居中弹窗 -->
    <Modal
      v-model:visible="scenarioCreateModalVisible"
      title="创建支付场景"
      size="medium"
      @close="closeDialog"
    >
      <div class="form-body">
        <div class="form-group">
          <label class="form-label">
            Platform <span class="required">*</span>
            <span class="field-help-wrap">
              <span class="field-help" aria-label="platform 提示">?</span>
              <span class="field-help-tooltip">platform 的枚举是从 portal sdk 里面同步过来的。</span>
            </span>
          </label>
          <select v-model="form.platform" class="select">
            <option value="" disabled>请选择</option>
            <option v-if="formPlatformIsOrphan" :value="form.platform">{{ form.platform }}（历史值）</option>
            <option v-for="p in platformOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <!-- 支付形式：海外采用 Web / IAP 两个开关；国内继续沿用旧下拉 -->
        <template v-if="region === 'overseas'">
          <div class="form-group">
            <label class="form-label">Web 收银台</label>
            <div class="switch-row">
              <label class="switch">
                <input
                  v-model="form.web_enabled"
                  type="checkbox"
                  @change="onWebToggle"
                />
                <span class="switch-slider"></span>
              </label>
              <span class="switch-label">开启后，该场景作为 Web 收银台场景</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">IAP 支付</label>
            <div class="switch-row">
              <label class="switch">
                <input
                  v-model="form.iap_enabled"
                  type="checkbox"
                  @change="onIapToggle"
                />
                <span class="switch-slider"></span>
              </label>
              <span class="switch-label">开启后，该场景作为 IAP 场景（内购）</span>
            </div>

            <div v-if="form.iap_enabled" class="iap-default-row">
              <label class="form-label iap-default-label">默认 IAP 渠道（可选）</label>
              <select
                v-model="form.default_iap_channel"
                class="select"
                aria-label="默认 IAP 渠道"
              >
                <option value="">不指定</option>
                <option value="google_play">Google Play</option>
                <option value="apple">Apple</option>
              </select>
              <p class="form-hint">
                仅用于标记推荐的 IAP 渠道，不会限制实际可用渠道。
              </p>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="form-group">
            <label class="form-label">支付形式</label>
            <select v-model="form.domestic_payment_form" class="select" @change="onPaymentFormChange">
              <option value="iap">IAP支付</option>
              <option value="web">Web收银台</option>
              <option value="native_third_party">原生三方支付收银台</option>
            </select>
          </div>
        </template>

        <div class="form-group">
          <label class="form-label">描述</label>
          <input
            v-model="form.description"
            class="input"
            placeholder="场景说明（可选）"
          />
        </div>
      </div>

      <template #footer>
        <div class="drawer-form-footer">
          <button type="button" class="btn btn-secondary" @click="closeDialog">取消</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!canSubmit || submitting"
            @click="handleSubmit"
          >
            {{ submitButtonLabel }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- 编辑场景：右侧抽屉 -->
    <Drawer
      v-model:visible="scenarioEditDrawerVisible"
      title="编辑支付场景"
      :width="480"
      :show-header="true"
      @close="closeDialog"
    >
      <div class="form-body">
        <div class="form-group">
          <label class="form-label">
            Platform <span class="required">*</span>
            <span class="field-help-wrap">
              <span class="field-help" aria-label="platform 提示">?</span>
              <span class="field-help-tooltip">platform 的枚举是从 portal sdk 里面同步过来的。</span>
            </span>
          </label>
          <select v-model="form.platform" class="select">
            <option value="" disabled>请选择</option>
            <option v-if="formPlatformIsOrphan" :value="form.platform">{{ form.platform }}（历史值）</option>
            <option v-for="p in platformOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <template v-if="region === 'overseas'">
          <div class="form-group">
            <label class="form-label">Web 收银台</label>
            <div class="switch-row">
              <label class="switch">
                <input
                  v-model="form.web_enabled"
                  type="checkbox"
                  @change="onWebToggle"
                />
                <span class="switch-slider"></span>
              </label>
              <span class="switch-label">开启后，该场景作为 Web 收银台场景</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">IAP 支付</label>
            <div class="switch-row">
              <label class="switch">
                <input
                  v-model="form.iap_enabled"
                  type="checkbox"
                  @change="onIapToggle"
                />
                <span class="switch-slider"></span>
              </label>
              <span class="switch-label">开启后，该场景作为 IAP 场景（内购）</span>
            </div>

            <div v-if="form.iap_enabled" class="iap-default-row">
              <label class="form-label iap-default-label">默认 IAP 渠道（可选）</label>
              <select
                v-model="form.default_iap_channel"
                class="select"
                aria-label="默认 IAP 渠道"
              >
                <option value="">不指定</option>
                <option value="google_play">Google Play</option>
                <option value="apple">Apple</option>
              </select>
              <p class="form-hint">
                仅用于标记推荐的 IAP 渠道，不会限制实际可用渠道。
              </p>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="form-group">
            <label class="form-label">支付形式</label>
            <select v-model="form.domestic_payment_form" class="select" @change="onPaymentFormChange">
              <option value="iap">IAP支付</option>
              <option value="web">Web收银台</option>
              <option value="native_third_party">原生三方支付收银台</option>
            </select>
          </div>
        </template>

        <div class="form-group">
          <label class="form-label">描述</label>
          <input
            v-model="form.description"
            class="input"
            placeholder="场景说明（可选）"
          />
        </div>
      </div>

      <div class="drawer-form-footer">
        <button type="button" class="btn btn-secondary" @click="closeDialog">取消</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!canSubmit || submitting"
          @click="handleSubmit"
        >
          {{ submitButtonLabel }}
        </button>
      </div>
    </Drawer>
  </div>
</template>

<script>
import { paymentAPI } from '@/api'
import { refreshScenarios, getPlatformOptions } from '@/utils/scenarios'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'

export default {
  name: 'ScenarioList',
  components: { Icon, Modal, Drawer },
  data() {
    return {
      loading: false,
      scenarios: [],
      scenarioCreateModalVisible: false,
      scenarioEditDrawerVisible: false,
      dialogMode: 'create',
      editingId: null,
      submitting: false,
      form: this.emptyForm()
    }
  },
  computed: {
    region() {
      return this.$route.meta?.region || 'overseas'
    },
    canSubmit() {
      if (!this.form.platform) return false
      return true
    },
    submitButtonLabel() {
      if (this.submitting) {
        return this.dialogMode === 'edit' ? '保存中…' : '创建中…'
      }
      return this.dialogMode === 'edit' ? '保存' : '创建'
    },
    platformOptions() {
      return getPlatformOptions(this.region)
    },
    formPlatformIsOrphan() {
      return !!this.form.platform && !this.platformOptions.includes(this.form.platform)
    }
  },
  watch: {
    region() {
      this.fetchScenarios()
    },
    '$route.query.config'(q) {
      if (q != null && q !== '') {
        this.redirectConfigQueryToScenarioPage(q)
      }
    }
  },
  mounted() {
    this.fetchScenarios().then(() => {
      this.redirectConfigQueryFromList()
    })
  },
  methods: {
    emptyForm() {
      return {
        platform: '',
        // 后端仍使用 is_web_cashier / web_pay_scene 字段；前端在海外用 web_enabled / iap_enabled 组织交互
        is_web_cashier: false,
        web_pay_scene: 'external_browser',
        description: '',
        web_enabled: false,
        iap_enabled: true,
        default_iap_channel: '',
        domestic_payment_form: 'iap'
      }
    },
    getPaymentFormTags(item) {
      if (!item) return [{ type: 'iap', label: '-' }]
      if (this.region === 'overseas') {
        const tags = []
        if (item.web_enabled) tags.push({ type: 'web', label: 'Web收银台' })
        if (item.iap_enabled) tags.push({ type: 'iap', label: 'IAP' })
        if (tags.length > 0) return tags
        return [{ type: 'iap', label: '未配置' }]
      }
      if (item.web_pay_scene === 'native_third_party') {
        return [{ type: 'web', label: '原生三方支付收银台' }]
      }
      if (!item.is_web_cashier) return [{ type: 'iap', label: 'IAP支付' }]
      return [{ type: 'web', label: 'Web收银台' }]
    },
    onPaymentFormChange() {
      // 仅国内继续使用下拉，海外由两个开关控制
      if (this.region === 'overseas') return
      if (this.form.domestic_payment_form === 'iap') {
        this.form.is_web_cashier = false
        this.form.web_pay_scene = 'external_browser'
        return
      }
      this.form.is_web_cashier = true
      if (this.form.domestic_payment_form === 'native_third_party') {
        this.form.web_pay_scene = 'native_third_party'
      } else if (!this.form.web_pay_scene || this.form.web_pay_scene === 'native_third_party') {
        this.form.web_pay_scene = 'external_browser'
      }
    },
    syncPaymentFormFromSwitches() {
      if (this.region !== 'overseas') return
      const web = !!this.form.web_enabled
      const iap = !!this.form.iap_enabled
      // is_web_cashier 仍然表示「纯 Web 场景」；其余组合都按 IAP 归类，保持与现有模板绑定逻辑兼容
      this.form.is_web_cashier = web && !iap
    },
    onWebToggle() {
      if (this.region !== 'overseas') return
      this.syncPaymentFormFromSwitches()
    },
    onIapToggle() {
      if (this.region !== 'overseas') return
      this.syncPaymentFormFromSwitches()
    },
    async fetchScenarios() {
      this.loading = true
      try {
        const res = await paymentAPI.getScenarios(this.region)
        if (res.code === 200) {
          this.scenarios = res.data
        }
      } finally {
        this.loading = false
      }
    },
    scenarioConfigBasePath() {
      return this.region === 'domestic' ? '/domestic/scenario' : '/scenario'
    },
    openScenarioConfig(item) {
      const id = item && item.id
      if (id == null) return
      this.$router.push(`${this.scenarioConfigBasePath()}/${id}`).catch(() => {})
    },
    /** 兼容旧链接 ?config=场景id，跳转至独立配置页 */
    redirectConfigQueryToScenarioPage(raw) {
      const id = String(raw).trim()
      if (!id) return
      const nextQuery = { ...this.$route.query }
      delete nextQuery.config
      this.$router
        .replace({
          path: `${this.scenarioConfigBasePath()}/${id}`,
          query: Object.keys(nextQuery).length ? nextQuery : undefined
        })
        .catch(() => {})
    },
    redirectConfigQueryFromList() {
      const q = this.$route.query.config
      if (q == null || q === '') return
      this.redirectConfigQueryToScenarioPage(q)
    },
    scenarioRowLabel(item) {
      if (!item) return ''
      return item.description || item.key || item.platform || String(item.id ?? '')
    },
    openCreate() {
      this.scenarioEditDrawerVisible = false
      this.dialogMode = 'create'
      this.editingId = null
      this.form = this.emptyForm()
      if (this.region === 'domestic') {
        this.onPaymentFormChange()
      }
      this.scenarioCreateModalVisible = true
    },
    openEdit(item) {
      this.scenarioCreateModalVisible = false
      this.dialogMode = 'edit'
      this.editingId = item.id
      this.form = {
        platform: item.platform || '',
        is_web_cashier: !!item.is_web_cashier,
        web_pay_scene: item.is_web_cashier
          ? (item.web_pay_scene || 'external_browser')
          : 'external_browser',
        description: item.description || '',
        web_enabled: this.region === 'overseas' ? !!item.web_enabled : false,
        iap_enabled: this.region === 'overseas' ? !!item.iap_enabled : !item.is_web_cashier,
        default_iap_channel: this.region === 'overseas' ? (item.default_iap_channel || '') : '',
        domestic_payment_form:
          this.region === 'domestic'
            ? (!item.is_web_cashier
                ? 'iap'
                : (item.web_pay_scene === 'native_third_party' ? 'native_third_party' : 'web'))
            : 'iap'
      }
      if (this.region === 'overseas') {
        this.syncPaymentFormFromSwitches()
      } else {
        this.onPaymentFormChange()
      }
      this.scenarioEditDrawerVisible = true
    },
    closeDialog() {
      this.scenarioCreateModalVisible = false
      this.scenarioEditDrawerVisible = false
      this.resetDialogState()
    },
    /** 弹窗关闭后重置表单（含点遮罩 / 点 X 关闭） */
    resetDialogState() {
      this.submitting = false
      this.dialogMode = 'create'
      this.editingId = null
      this.form = this.emptyForm()
    },
    isApiSuccess(res) {
      const c = res && res.code
      return c === 200 || c === '200'
    },
    async handleSubmit() {
      if (!this.canSubmit || this.submitting) return
      try {
        await this.$confirm.confirm({
          type: 'warning',
          title: this.dialogMode === 'edit' ? '确认保存场景' : '确认创建场景',
          message: this.dialogMode === 'edit' ? '确定保存当前场景修改吗？' : '确定创建该支付场景吗？'
        })
      } catch {
        return
      }
      this.submitting = true
      try {
        if (this.region === 'overseas') {
          this.syncPaymentFormFromSwitches()
        } else {
          this.onPaymentFormChange()
        }
        const isWeb = this.form.is_web_cashier === true || this.form.is_web_cashier === 'true'
        const payload = {
          ...this.form,
          is_web_cashier: isWeb,
          web_pay_scene: isWeb ? (this.form.web_pay_scene || 'external_browser') : '',
          // 仅海外使用默认 IAP 渠道，国内忽略
          default_iap_channel: this.region === 'overseas' ? (this.form.default_iap_channel || '') : ''
        }
        if (this.dialogMode === 'edit' && this.editingId != null) {
          const res = await paymentAPI.updateScenario(this.editingId, payload, this.region)
          if (this.isApiSuccess(res)) {
            refreshScenarios(this.region)
            this.$message.success('场景已更新')
            this.closeDialog()
            await this.fetchScenarios()
          } else {
            this.$message.error(res.message || '保存失败')
          }
        } else {
          const res = await paymentAPI.createScenario(payload, this.region)
          if (this.isApiSuccess(res)) {
            refreshScenarios(this.region)
            this.$message.success('场景创建成功')
            this.closeDialog()
            await this.fetchScenarios()
          } else {
            this.$message.error(res.message || '创建失败')
          }
        }
      } catch (e) {
        this.$message.error(e.message || '操作失败')
      } finally {
        this.submitting = false
      }
    },
    async handleDelete(item) {
      try {
        await this.$confirm.confirm({
          type: 'warning',
          title: '删除支付场景',
          message: `确定删除「${this.scenarioRowLabel(item)}」吗？删除后不可恢复，且可能影响已关联的配置引用。`
        })
      } catch {
        return
      }
      try {
        const res = await paymentAPI.deleteScenario(item.id, this.region)
        if (res.code === 200) {
          refreshScenarios(this.region)
          this.$message.success('已删除')
          await this.fetchScenarios()
        } else {
          this.$message.error(res.message || '删除失败')
        }
      } catch (e) {
        this.$message.error(e.message || '删除失败')
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
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px;
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.loading-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 60px 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.table-wrap {
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-container);
}

.meta-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
}

.meta-tag--iap {
  background: #e6f7ff;
  color: #0070c0;
}

.meta-tag--web {
  background: #f0faf0;
  color: #389e0d;
}

.payment-form-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-base);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
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
  content: '';
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

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.iap-default-row {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.iap-default-label {
  font-weight: 400;
}

.template-select-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 10px 12px;
  background: var(--color-bg-container);
}

.template-select-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.template-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.template-ops {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.template-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.template-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  user-select: none;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.field-help-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.field-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  cursor: help;
  vertical-align: middle;
}

.field-help-tooltip {
  position: absolute;
  left: 0;
  top: calc(100% + 8px);
  transform: none;
  z-index: 20;
  width: 280px;
  max-width: min(280px, calc(100vw - 48px));
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.86);
  color: #fff;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  white-space: normal;
  visibility: hidden;
  opacity: 0;
  transition: none;
  pointer-events: none;
}

.field-help-tooltip::after {
  content: '';
  position: absolute;
  left: 12px;
  bottom: 100%;
  border: 5px solid transparent;
  border-bottom-color: rgba(0, 0, 0, 0.86);
}

.field-help-wrap:hover .field-help-tooltip,
.field-help-wrap:focus-within .field-help-tooltip {
  visibility: visible;
  opacity: 1;
}

.required {
  color: var(--color-error);
}

.form-row {
  display: flex;
  gap: var(--spacing-base);
}

.form-row > .form-group {
  flex: 1;
}

.drawer-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-base);
  border-top: 1px solid var(--color-border-secondary);
}

.btn-danger-text {
  color: var(--color-error, #f5222d);
}

.btn-danger-text:hover {
  color: var(--color-error, #cf1322);
}
</style>
