<template>
  <section class="subchannel-features" aria-label="子渠道功能开关与灰度">
    <header>
      <h2>子渠道功能开关与灰度</h2>
      <span>{{
        useBackend ? '服务端草稿 · 独立发布' : '本机演示 · 未连接发布服务'
      }}</span>
    </header>
    <p>
      归属：{{ channelName }} / 子渠道
      {{ subchannelId }}。本区控制支付体验，支付方式是否展示仍由收银台模版决定。
    </p>
    <p class="scope-note">
      引用此子渠道的所有模版共用功能规则；切换渠道或子渠道不会共用用户桶。渠道基础信息仍为
      Mock，机构能力为注册样本，不代表真实开通。
    </p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-if="draft">
      <p
        v-if="legacyCardRules || state?.published?.rules.card_reuse"
        class="scope-note"
        role="status"
      >
        卡信息已合并为一个开关，上方沿用原保存规则。保存并审核发布后，新卡保存和历史卡复用将统一使用此范围与用户桶；已有生效配置暂不改变。旧待审需撤回或驳回后重新保存。
      </p>
      <fieldset
        v-for="key in featureKeys"
        :key="key"
        :disabled="!canEdit || busy"
        class="feature-rule"
      >
        <legend>{{ catalog[key].name }}</legend>
        <p>{{ catalog[key].description }}</p>
        <div class="mode-options">
          <label v-for="mode in modes" :key="mode.value"
            ><input
              v-model="draft.rules[key].mode"
              :name="`${subchannelId}-${key}-mode`"
              type="radio"
              :value="mode.value"
              :aria-label="`${catalog[key].name} ${mode.label}`"
              @change="normalizeInactivePercentage(key)"
            />{{ mode.label }}</label
          >
        </div>
        <label v-if="draft.rules[key].mode === 'gradual'" class="percentage"
          >开放比例
          <input
            v-model.number="draft.rules[key].percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            :aria-label="`${catalog[key].name} 灰度比例`"
          />
          %</label
        >
        <details class="advanced">
          <summary>高级设置 · 国家、用户 platform、黑白名单</summary>
          <label
            >国家 / 地区
            <input
              v-model="countryTexts[key]"
              placeholder="如 US, DE；留空不限"
          /></label>
          <div class="platforms">
            <span>用户 platform</span
            ><label v-for="platform in platforms" :key="platform"
              ><input
                v-model="draft.rules[key].platforms"
                type="checkbox"
                :value="platform"
              />{{ platform }}</label
            >
          </div>
          <label
            >白名单<textarea
              v-model="draft.rules[key].allow"
              rows="2"
              placeholder="用户 ID，以逗号或换行分隔；0% + 白名单可指定用户验证"
            />
          </label>
          <label
            >黑名单<textarea
              v-model="draft.rules[key].deny"
              rows="2"
              placeholder="黑名单优先，最多 100 人"
            />
          </label>
          <p>
            条件取交集；白名单只绕过比例，不绕过机构产品资格、渠道停用、登录和授权。
          </p>
        </details>
      </fieldset>
      <div class="save-row">
        <button
          v-if="!readonly"
          type="button"
          class="btn btn-primary"
          :disabled="!canEdit || busy || !dirty"
          @click="save"
        >
          {{
            busy ? '保存中…' : useBackend ? '保存功能草稿' : '保存本机功能规则'
          }}</button
        ><button
          type="button"
          class="btn btn-secondary"
          :disabled="busy"
          @click="load"
        >
          重新读取功能配置</button
        ><span v-if="dirty">未保存</span>
      </div>
      <p v-if="notice" role="status" class="success">{{ notice }}</p>
      <TemplateRolloutRelease
        v-if="useBackend && state"
        :template-id="state.template_id"
        :resource-path="resourcePath"
        feature-resource
        :dirty="dirty"
        :refresh-key="refreshKey"
        :read-only="readonly"
        @role="role = $event"
        @state="receiveState"
      />
      <p class="scope-note">
        {{
          useBackend
            ? '功能草稿需独立审核后生效，与上方子渠道基础信息的保存互不发布；回滚不会解除应急停用。'
            : '本机模式不代表线上发布；正式灰度请使用 npm run dev:full 的后端模式。'
        }}
      </p>
    </template>
  </section>
</template>

<script>
import {
  rolloutBackendEnabled,
  rolloutRequest,
  backendSession,
} from '@/api/rolloutBackend.js'
import {
  subchannelFeatureCatalog,
  subchannelFeatureKeys,
  closedFeatureRule,
  canonicalFeatureRules,
  editableFeatureDocument,
} from '@/utils/subchannelRollout.js'
import { getPlatformOptions } from '@/utils/platformOptions.js'
import { templateRuleErrors } from '@/utils/templatePaymentRollout.js'
import TemplateRolloutRelease from './TemplateRolloutRelease.vue'

export default {
  components: { TemplateRolloutRelease },
  props: {
    channelId: String,
    subchannelId: String,
    businessMethodId: String,
    channelName: String,
    readonly: Boolean,
    region: String,
  },
  data() {
    return {
      state: null,
      draft: null,
      baseDraftRevision: 0,
      countryTexts: {},
      original: '',
      legacyCardRules: false,
      busy: false,
      error: '',
      notice: '',
      role: 'viewer',
      refreshKey: 0,
      loadSequence: 0,
      catalog: subchannelFeatureCatalog,
      modes: [
        { value: 'off', label: '关闭' },
        { value: 'gradual', label: '灰度' },
        { value: 'all', label: '全量' },
      ],
    }
  },
  computed: {
    useBackend() {
      return rolloutBackendEnabled
    },
    featureKeys() {
      return subchannelFeatureKeys(this.businessMethodId)
    },
    platforms() {
      return getPlatformOptions(this.region)
    },
    resourcePath() {
      return `/channels/${encodeURIComponent(this.channelId)}/subchannels/${encodeURIComponent(this.subchannelId)}/features`
    },
    localKey() {
      return JSON.stringify([
        'subchannel-features-v1',
        'demo',
        this.region,
        'saki',
        this.channelId,
        this.subchannelId,
      ])
    },
    document() {
      return this.draft
        ? {
            ...this.draft,
            rules: Object.fromEntries(
              this.featureKeys.map((key) => [
                key,
                {
                  ...this.draft.rules[key],
                  countries: [
                    ...new Set(
                      (this.countryTexts[key] || '')
                        .toUpperCase()
                        .split(/[\s,，;；]+/)
                        .filter(Boolean),
                    ),
                  ],
                },
              ]),
            ),
          }
        : null
    },
    dirty() {
      return (
        !!this.draft &&
        (this.legacyCardRules ||
          (this.useBackend && this.state?.draftRevision === 0) ||
          JSON.stringify(this.document) !== this.original)
      )
    },
    canEdit() {
      return !this.readonly && this.role === 'editor' && !this.state?.pending
    },
  },
  watch: {
    resourcePath: {
      immediate: true,
      handler() {
        this.load()
      },
    },
  },
  beforeUnmount() {
    this.loadSequence++
  },
  methods: {
    normalizeInactivePercentage(key) {
      const rule = this.draft.rules[key]
      if (
        rule.mode !== 'gradual' &&
        templateRuleErrors(rule, this.region).some((error) =>
          error.startsWith('比例'),
        )
      ) {
        rule.percentage = JSON.parse(this.original).rules[key]?.percentage ?? 0
      }
    },
    syncDocument(document) {
      this.legacyCardRules = Object.hasOwn(document.rules || {}, 'card_reuse')
      this.draft = JSON.parse(
        JSON.stringify(editableFeatureDocument(document, this.region)),
      )
      this.countryTexts = Object.fromEntries(
        Object.entries(this.draft.rules).map(([key, rule]) => [
          key,
          rule.countries.join(', '),
        ]),
      )
      this.original = JSON.stringify(this.document)
    },
    async load() {
      const sequence = ++this.loadSequence
      this.error = ''
      this.notice = ''
      this.busy = true
      try {
        if (this.useBackend) {
          const session = await backendSession(),
            result = await rolloutRequest(this.resourcePath)
          if (sequence !== this.loadSequence) return
          this.role = session.role
          this.state = result.data
          this.baseDraftRevision = result.data.draftRevision
          this.syncDocument(result.data.draft)
        } else {
          const raw = localStorage.getItem(this.localKey)
          const document = {
            channel_id: this.channelId,
            subchannel_id: this.subchannelId,
            business_method_id: this.businessMethodId,
            rules: Object.fromEntries(
              this.featureKeys.map((key) => [key, closedFeatureRule()]),
            ),
          }
          if (raw) document.rules = JSON.parse(raw).rules
          this.role = 'editor'
          this.syncDocument(document)
        }
      } catch (e) {
        if (sequence === this.loadSequence) {
          this.draft = null
          this.error = e.message
        }
      } finally {
        if (sequence === this.loadSequence) this.busy = false
      }
    },
    receiveState(state) {
      const sync = !this.dirty && state.draftRevision !== this.baseDraftRevision
      this.state = state
      if (sync) {
        this.baseDraftRevision = state.draftRevision
        this.syncDocument(state.draft)
      }
    },
    async save() {
      if (!this.canEdit || this.busy) return
      this.error = ''
      this.notice = ''
      this.busy = true
      try {
        const document = {
          ...this.document,
          rules: canonicalFeatureRules(
            this.document.rules,
            this.featureKeys,
            this.region,
          ),
        }
        if (this.useBackend) {
          const result = await rolloutRequest(`${this.resourcePath}/draft`, {
            method: 'POST',
            body: { document, baseDraftRevision: this.baseDraftRevision },
          })
          this.state = result.data
          this.baseDraftRevision = result.data.draftRevision
          this.syncDocument(result.data.draft)
          this.refreshKey++
          this.notice = '功能草稿已保存，尚未改变已发布功能和模版支付方式。'
        } else {
          localStorage.setItem(this.localKey, JSON.stringify(document))
          this.syncDocument(document)
          this.notice = '本机功能规则已保存，未发布到线上。'
        }
      } catch (e) {
        this.error = `${e.message}${e.code ? `（${e.code}）` : ''}`
      } finally {
        this.busy = false
      }
    },
  },
}
</script>

<style scoped>
.subchannel-features {
  border: 1px solid #dce5f7;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  color: #344054;
  font-size: 13px;
}
header {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
h2 {
  margin: 0;
  font-size: 16px;
}
header span,
.scope-note {
  color: #667085;
  font-size: 12px;
}
p {
  line-height: 1.8;
}
.feature-rule {
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  margin: 18px 0;
  padding: 16px;
  min-width: 0;
}
legend {
  font-size: 14px;
  font-weight: 600;
  padding: 0 6px;
}
.mode-options,
.save-row,
.platforms {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.mode-options label {
  display: flex;
  gap: 6px;
  align-items: center;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  padding: 10px 16px;
}
input:not([type='radio']):not([type='checkbox']),
textarea {
  border: 1px solid #d0d5dd;
  border-radius: 5px;
  padding: 8px;
  font: inherit;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  color: #344054;
  background: white;
}
.percentage {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}
.percentage input {
  width: 95px;
}
.advanced {
  margin-top: 16px;
}
summary {
  cursor: pointer;
  padding: 8px 0;
}
.advanced > label {
  display: grid;
  gap: 6px;
  margin: 12px 0;
}
.platforms label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.error {
  color: #ae4328;
}
.success {
  color: #168259;
}
@media (max-width: 640px) {
  .subchannel-features {
    padding: 12px;
  }
  .mode-options {
    gap: 6px;
  }
  .mode-options label {
    padding: 10px;
  }
  .save-row button {
    max-width: 100%;
    white-space: normal;
  }
}
</style>
