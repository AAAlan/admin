<template>
  <Modal
    :visible="visible"
    :title="`${readonly ? '查看' : '设置'}支付方式开放范围`"
    size="large"
    @update:visible="$emit('update:visible', $event)"
  >
    <div v-if="draft && method" class="template-rollout">
      <div class="scope-card">
        <span>当前收银台模版</span
        ><strong>{{ template.cashier_template_name || '未命名模版' }}</strong>
        <p>
          {{ method.pay_name }} · {{ method.channel_name || method.channel_id }}
        </p>
        <small
          >{{ template.useBackend ? `本模版的 ${businessMethodId(method)} 共 ${methods.filter(item => businessMethodId(item) === businessMethodId(method)).length} 个渠道共享此规则，不影响其他模版；渠道停用仍独立生效。` : '只影响本模版的当前方式条目，不影响其他模版，也不是渠道流量路由。' }}</small
        >
        <p v-if="template.provisional">
          新模版尚未分配正式 ID，首次保存后分桶可能变化；当前仅为临时试算。
        </p>
      </div>
      <fieldset :disabled="readonly">
        <legend>开放范围</legend>
        <div class="mode-options">
          <label
            v-for="option in modes"
            :key="option.value"
            :class="{ selected: draft.mode === option.value }"
          >
            <input
              v-model="draft.mode"
              type="radio"
              name="template-method-mode"
              :value="option.value"
            />{{ option.label }}
          </label>
        </div>
        <div v-if="draft.mode === 'gradual'" class="percentage-field">
          <label
            >开放比例
            <input
              v-model.number="draft.percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              aria-label="模版支付方式灰度比例"
            />
            %</label
          >
          <div class="quick-values">
            <button
              v-for="value in [1, 5, 25, 50]"
              :key="value"
              type="button"
              @click="draft.percentage = value"
            >
              {{ value }}%
            </button>
          </div>
          <p>同一用户稳定命中，扩量不重新分组。0% 可配白名单验证。</p>
        </div>
        <details class="advanced-targeting">
          <summary>
            高级设置 · 国家、用户 platform、黑白名单{{
              hasConditions ? '（已设置）' : ''
            }}
          </summary>
          <label class="field-label"
            >国家 / 地区
            <input
              v-model="countryText"
              placeholder="不限；如 US, DE, GB"
              aria-label="目标国家代码"
          /></label>
          <div class="field-label">
            用户 platform
            <div class="platform-options">
              <label v-for="platform in platforms" :key="platform"
                ><input
                  v-model="draft.platforms"
                  type="checkbox"
                  :value="platform"
                />{{ platform }}</label
              >
            </div>
          </div>
          <label class="field-label"
            >白名单
            <textarea
              v-model="draft.allow"
              rows="2"
              placeholder="用户 ID，以逗号或换行分隔"
            />
          </label>
          <label class="field-label"
            >黑名单
            <textarea
              v-model="draft.deny"
              rows="2"
              placeholder="黑名单优先，最多 100 人"
            />
          </label>
          <p>条件间取交集；白名单仅绕过比例，不能绕过关闭、条件或机构资格。</p>
        </details>
      </fieldset>
      <details class="rollout-preview">
        <summary>本模版效果试算 · 按需验证</summary>
        <label v-if="template.useBackend">服务端试算来源 <select v-model="previewSource"><option value="preview">当前编辑内容（未发布）</option><option value="published">服务端已发布版本</option></select></label>
        <p v-if="!template.useBackend">
          按当前编辑内容发布后试算，不代表线上状态。资格为手动样本，未接入真实支付服务。
        </p>
        <p v-if="template.useBackend" class="save-notice">由后端执行灰度判断；{{ previewSource === 'published' ? '使用服务端生效快照，不使用弹窗草稿' : '仅管理端试算，不发布、不发起支付' }}。</p>
        <p v-if="previewLoading" role="status">服务端试算中…</p><p v-if="previewError" role="alert" class="error-message">{{ previewError }}</p>
        <div class="preview-fields">
          <label
            >用户 ID<input
              v-model="profile.userId"
              placeholder="留空按固定演示会话"
          /></label>
          <label
            >用户 platform<select v-model="profile.platform">
              <option v-for="platform in platforms" :key="platform">
                {{ platform }}
              </option>
            </select></label
          >
          <label
            >国家代码<input v-model="profile.country" maxlength="2"
          /></label>
        </div>
        <label class="eligibility-sample"
          ><input
            v-model="eligibleSample"
            type="checkbox"
          />本单机构与交易资格通过（样本）</label
        >
        <div v-for="item in results" :key="item.entryId" class="preview-method">
          <div>
            <strong>{{ item.pay_name }}</strong
            ><small>{{ item.channel_name || item.channel_id }}</small>
          </div>
          <div>
            <span :class="item.hit ? 'hit' : 'miss'">{{
              item.hit ? '展示' : '不展示'
            }}</span
            ><small
              >{{ item.reason
              }}{{ item.bucket === null ? '' : ` · 桶 ${item.bucket}` }}</small
            >
          </div>
        </div>
        <p v-if="!previewLoading && !previewError && results.length && !results.some((item) => item.hit)" class="empty-warning">
          本单没有可展示的支付方式；不自动绕过灰度或发起其他支付。
        </p>
      </details>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <p class="save-notice">
        {{ template.useBackend ? '应用后仅更新当前表单；保存服务端草稿并由独立审批人发布后才生效。' : '应用后仅更新当前编辑内容；还需点击模版「保存」。Demo 保存至本机，未接入审批发布中心。' }}
      </p>
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="$emit('update:visible', false)">
        {{ readonly ? '关闭' : '取消' }}
      </button>
      <button v-if="!readonly" class="btn btn-primary" @click="apply">
        应用到当前模版
      </button>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue'
import { getPlatformOptions } from '@/utils/platformOptions.js'
import { businessMethodId, templateToBusinessDocument } from '@/utils/businessPaymentRollout.js'
import { rolloutRequest } from '@/api/rolloutBackend.js'
import {
  evaluateTemplateMethods,
  templateMethodEntryId,
  templateMethodRule,
  templateRuleErrors,
} from '@/utils/templatePaymentRollout.js'

export default {
  components: { Modal },
  props: {
    visible: Boolean,
    readonly: Boolean,
    method: Object,
    template: Object,
    methods: Array,
    region: { type: String, default: 'overseas' },
  },
  emits: ['update:visible', 'apply'],
  data() {
    return {
      draft: null,
      previewSource: 'preview', serverResults: [], previewLoading: false, previewError: '', previewTimer: null, previewSequence: 0,
      countryText: '',
      error: '',
      eligibleSample: true,
      profile: {
        userId: 'pilot_user',
        sessionId: 'template_demo_session',
        country: 'US',
        platform: 'apple',
      },
      modes: [
        { value: 'off', label: '关闭' },
        { value: 'gradual', label: '灰度开放' },
        { value: 'all', label: '全量开放' },
      ],
    }
  },
  computed: {
    platforms() {
      return getPlatformOptions(this.region)
    },
    hasConditions() {
      return (
        this.countryText.trim() ||
        this.draft?.platforms?.length ||
        this.draft?.allow?.trim() ||
        this.draft?.deny?.trim()
      )
    },
    editedRule() {
      return {
        ...this.draft,
        countries: [
          ...new Set(
            this.countryText
              .toUpperCase()
              .split(/[\s,，;；]+/)
              .filter(Boolean),
          ),
        ],
      }
    },
    results() {
      if (this.template?.useBackend) return this.serverResults
      if (!this.draft || !this.method) return []
      const key = templateMethodEntryId(this.method)
      const methods = (this.methods || []).map((item) =>
        templateMethodEntryId(item) === key
          ? {
              ...item,
              enabled: this.draft.mode !== 'off',
              rollout: this.editedRule,
            }
          : item,
      )
      return evaluateTemplateMethods(
        {
          ...this.template,
          region: this.region,
          enabled: true,
          published: true,
          payment_methods: methods,
        },
        { ...this.profile, country: this.profile.country.toUpperCase() },
        {
          eligibility: Object.fromEntries(
            methods.map((item) => [
              templateMethodEntryId(item),
              this.eligibleSample,
            ]),
          ),
        },
      )
    },
  },
  watch: {
    editedRule: { deep: true, handler() { this.schedulePreview() } },
    profile: { deep: true, handler() { this.schedulePreview() } },
    eligibleSample() { this.schedulePreview() },
    previewSource() { this.schedulePreview() },
    'draft.mode'(next, previous) {
      if (
        previous === 'gradual' &&
        next !== 'gradual' &&
        templateRuleErrors(this.editedRule, this.region).some((error) =>
          error.startsWith('比例'),
        )
      ) {
        const saved = templateMethodRule(this.method)?.percentage
        this.draft.percentage =
          typeof saved === 'number' &&
          Number.isFinite(saved) &&
          saved >= 0 &&
          saved <= 100
            ? saved
            : 0
      }
    },
    visible: {
      immediate: true,
      handler(value) {
        if (!value) { clearTimeout(this.previewTimer); this.previewSequence++; this.previewLoading = false; return }
        if (!value || !this.method) return
        this.draft = templateMethodRule(this.method)
        this.countryText = (this.draft?.countries || []).join(', ')
        this.error = ''
        this.schedulePreview()
      },
    },
  },
  beforeUnmount() { clearTimeout(this.previewTimer); this.previewSequence++ },
  methods: {
    businessMethodId,
    schedulePreview() {
      if (!this.visible || !this.template?.useBackend) return
      clearTimeout(this.previewTimer)
      const sequence = ++this.previewSequence
      this.serverResults = []; this.previewError = ''; this.previewLoading = true
      this.previewTimer = setTimeout(() => this.fetchPreview(sequence), 200)
    },
    async fetchPreview(sequence) {
      this.serverResults = []; this.previewError = ''
      if (this.template.provisional) { this.previewError = '首次保存模版后可进行服务端试算'; this.previewLoading = false; return }
      if (this.previewSource !== 'published' && templateRuleErrors(this.editedRule, this.region).length) { this.previewError = '请先填写有效规则'; this.previewLoading = false; return }
      this.previewLoading = true
      try {
        let document
        if (this.previewSource !== 'published') {
          const id = businessMethodId(this.method)
          const methods = this.methods.map(item => businessMethodId(item) === id ? { ...item, rollout: this.editedRule } : item)
          document = templateToBusinessDocument({ ...this.template, payment_methods: methods })
        }
        const result = await rolloutRequest(`/templates/${encodeURIComponent(this.template.template_id)}/preview`, { method: 'POST', body: {
          source: this.previewSource, document: this.previewSource === 'published' ? undefined : document,
          profile: { ...this.profile, country: this.profile.country.toUpperCase(), currency: this.template.currency, amountMinor: 4999, riskAllowed: true }, eligibleSample: this.eligibleSample,
        } })
        if (sequence === this.previewSequence && this.visible) this.serverResults = result.data.methods.map(item => ({ ...item, entryId: item.id, pay_name: item.name, channel_name: `合资格渠道 ${item.eligibleChannels.length} 个` }))
      } catch (e) { if (sequence === this.previewSequence) this.previewError = e.message } finally { if (sequence === this.previewSequence) this.previewLoading = false }
    },
    apply() {
      if (this.readonly) return
      const errors = templateRuleErrors(this.editedRule, this.region)
      if (errors.length) {
        this.error = errors.join('；')
        return
      }
      this.$emit('apply', {
        entryId: templateMethodEntryId(this.method),
        rule: JSON.parse(JSON.stringify(this.editedRule)),
      })
      this.$emit('update:visible', false)
    },
  },
}
</script>

<style scoped>
.template-rollout {
  color: #344054;
  font-size: 13px;
}
.scope-card {
  background: #f4f7ff;
  border: 1px solid #dce5ff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.scope-card > span,
.scope-card > strong {
  display: block;
}
.scope-card > span,
small {
  color: #667085;
  font-size: 12px;
}
.scope-card > strong {
  margin-top: 4px;
  font-size: 16px;
  overflow-wrap: anywhere;
}
p {
  line-height: 1.6;
  margin: 8px 0;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
legend,
h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
.mode-options {
  display: flex;
  gap: 10px;
}
.mode-options > label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  border: 1px solid #d0d5dd;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
}
.mode-options > .selected {
  color: #315bea;
  border-color: #5b7cf3;
  background: #f5f7ff;
}
input:not([type='radio']):not([type='checkbox']),
textarea,
select {
  border: 1px solid #d0d5dd;
  border-radius: 5px;
  padding: 8px;
  font: inherit;
  min-width: 0;
  box-sizing: border-box;
  background: white;
  color: #344054;
}
.percentage-field {
  margin-top: 16px;
}
.percentage-field input {
  width: 90px;
  margin-left: 10px;
}
.quick-values {
  display: inline-flex;
  gap: 6px;
  margin-left: 12px;
}
.quick-values button {
  padding: 5px 10px;
  background: white;
  border: 1px solid #d0d5dd;
  border-radius: 4px;
  cursor: pointer;
  color: #315bea;
}
.advanced-targeting {
  margin: 12px 0;
  border-top: 1px solid #eaecf0;
  padding-top: 14px;
}
summary {
  cursor: pointer;
  font-weight: 500;
}
.field-label {
  display: flex;
  gap: 14px;
  align-items: start;
  margin-top: 14px;
}
.field-label > input,
.field-label > textarea,
.platform-options {
  flex: 1;
}
.platform-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.platform-options label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.rollout-preview {
  border-top: 1px solid #eaecf0;
  padding-top: 12px;
  margin-top: 10px;
}
.preview-fields {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.7fr;
  gap: 12px;
}
.preview-fields label {
  display: grid;
  gap: 6px;
}
.eligibility-sample {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 14px 0;
}
.preview-method {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid #f0f1f3;
}
.preview-method small {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.preview-method > div {
  min-width: 0;
}
.preview-method > div:last-child {
  text-align: right;
}
.hit {
  color: #168259;
}
.miss {
  color: #667085;
}
.error-message,
.empty-warning {
  color: #ba4425;
  background: #fff5ed;
  padding: 10px;
  border-radius: 5px;
}
.save-notice {
  color: #667085;
  font-size: 12px;
  margin-top: 18px;
}
@media (max-width: 640px) {
  .preview-method {
    flex-direction: column;
    gap: 6px;
  }
  .preview-method > div:last-child {
    text-align: left;
  }
  .mode-options {
    flex-wrap: wrap;
    gap: 6px;
  }
  .mode-options > label {
    padding: 10px 6px;
    white-space: nowrap;
    font-size: 12px;
  }
  .preview-fields {
    grid-template-columns: 1fr;
  }
  .field-label {
    flex-direction: column;
    gap: 6px;
  }
  .field-label > input,
  .field-label > textarea {
    width: 100%;
  }
  .quick-values {
    display: flex;
    margin: 10px 0;
  }
}
</style>
