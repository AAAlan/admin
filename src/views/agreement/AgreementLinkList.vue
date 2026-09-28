<template>
  <div class="agreement-page">
    <div class="agreement-page-header">
      <div>
        <h1 class="page-title">协议设置</h1>
        <p class="page-desc">配置收银台在不同语言下展示的用户协议与隐私政策。</p>
      </div>
      <div class="header-states">
        <div class="header-statuses">
          <div class="save-state" :class="{ 'save-state--dirty': dirty }">
            <Icon :name="dirty ? 'alert' : 'check'" :size="15" />
            <span>{{ dirty ? '有未保存的更改' : '所有更改已保存' }}</span>
          </div>
          <div class="publish-state" :class="{ 'publish-state--pending': hasUnpublishedChanges, 'publish-state--published': !hasUnpublishedChanges && publishedAt }">
            <Icon :name="hasUnpublishedChanges ? 'alert' : 'check'" :size="15" />
            <span>{{ publicationStatusText }}</span>
          </div>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" :disabled="!dirty || saving" @click="saveForm">
            {{ saving ? '保存中...' : '保存草稿' }}
          </button>
          <button
            type="button"
            class="btn btn-warning"
            title="一次性发布 12 种语言的协议链接"
            aria-label="整体发布 12 种语言的协议链接"
            :disabled="dirty || !hasUnpublishedChanges || saving"
            @click="publishForm"
          >
            发布
          </button>
        </div>
      </div>
    </div>

    <div class="agreement-layout">
      <aside class="language-panel" aria-label="语言版本">
        <div class="language-panel-head">
          <div>
            <h2>语言版本</h2>
            <span>{{ LANGUAGES.length }} 个语言</span>
          </div>
        </div>

        <button
          v-for="lang in LANGUAGES"
          :key="lang.code"
          type="button"
          class="language-item"
          :class="{ 'language-item--active': activeLanguage === lang.code }"
          @click="activeLanguage = lang.code"
        >
          <span class="language-mark">{{ languageMark(lang.code) }}</span>
          <span class="language-copy">
            <strong>{{ lang.name }}</strong>
            <small>{{ languageLocale(lang.code) }}</small>
          </span>
          <span class="language-status" :class="{ 'language-status--empty': !isLanguageConfigured(lang.code) }" aria-hidden="true"></span>
          <span class="language-arrow" aria-hidden="true">›</span>
        </button>

        <div class="language-note">
          <Icon name="globe" :size="16" />
          <span>用户将根据收银台语言看到对应版本的协议。</span>
        </div>
      </aside>

      <section class="agreement-editor" aria-label="协议链接编辑">
        <div class="editor-header">
          <div class="editor-language">
            <span class="editor-language-mark">{{ languageMark(activeLanguage) }}</span>
            <div>
              <h2>{{ activeLanguageInfo.name }}</h2>
              <p>{{ languageLocale(activeLanguage) }}</p>
            </div>
          </div>
          <span v-if="isLanguageConfigured(activeLanguage)" class="configured-badge">已配置</span>
        </div>

        <div class="editor-body">
          <div v-for="type in AGREEMENT_TYPES" :key="type.code" class="link-field">
            <label :for="`agreement-${type.code}-${activeLanguage}`">{{ type.name }}链接</label>
            <p>{{ type.code === 'user' ? '用户在收银台点击“用户协议”时将跳转至此页面。' : '用户在收银台点击“隐私政策”时将跳转至此页面。' }}</p>
            <div class="link-input-wrap">
              <Icon name="globe" :size="16" />
              <input
                :id="`agreement-${type.code}-${activeLanguage}`"
                v-model="form[type.code][activeLanguage]"
                type="url"
                class="input"
                :class="{ 'input--invalid': fieldError(type.code) }"
                :placeholder="type.code === 'user' ? 'https://example.com/terms' : 'https://example.com/privacy'"
                @input="touch(type.code)"
                @blur="touch(type.code)"
              />
              <span class="input-action" aria-hidden="true">↗</span>
            </div>
            <span v-if="fieldError(type.code)" class="field-error">{{ fieldError(type.code) }}</span>
            <span v-else-if="form[type.code][activeLanguage]" class="field-success">
              <Icon name="check" :size="13" /> 链接格式正确
            </span>
          </div>

        </div>

        <div class="editor-footer">
          <span class="footer-hint"><Icon name="alert" :size="14" /> 保存后需点击“发布”才会生效</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import Icon from '@/components/Icon.vue'
import {
  LANGUAGES,
  AGREEMENT_TYPES,
  emptyEntry,
  getEntry,
  getPublishedEntry,
  saveEntry,
  publishEntry,
  getFallbackLang,
  isValidUrl
} from '@/utils/agreementLinks.js'

const GLOBAL_CASHIER_KEY = '__global_cashier__'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function agreementSnapshot(value = {}) {
  return AGREEMENT_TYPES.reduce((snapshot, type) => {
    snapshot[type.code] = { ...(value[type.code] || {}) }
    return snapshot
  }, {})
}

export default {
  name: 'AgreementLinkList',
  components: { Icon },
  props: {
    region: { type: String, default: '' }
  },
  data() {
    return {
      LANGUAGES,
      AGREEMENT_TYPES,
      activeLanguage: 'zh_CN',
      form: emptyEntry(GLOBAL_CASHIER_KEY),
      originalForm: emptyEntry(GLOBAL_CASHIER_KEY),
      publishedForm: emptyEntry(GLOBAL_CASHIER_KEY),
      publishedAt: '',
      touched: {},
      saving: false
    }
  },
  computed: {
    resolvedRegion() {
      return this.region || this.$route.meta?.region || 'overseas'
    },
    fallbackLanguage() {
      return getFallbackLang(this.resolvedRegion)
    },
    activeLanguageInfo() {
      return LANGUAGES.find(lang => lang.code === this.activeLanguage) || LANGUAGES[0]
    },
    dirty() {
      return JSON.stringify(this.form) !== JSON.stringify(this.originalForm)
    },
    hasUnpublishedChanges() {
      return JSON.stringify(agreementSnapshot(this.form)) !== JSON.stringify(agreementSnapshot(this.publishedForm))
    },
    publicationStatusText() {
      if (this.hasUnpublishedChanges) return '有未发布的更改'
      if (this.publishedAt) return `已发布 · ${this.formatTime(this.publishedAt)}`
      return '尚未发布'
    }
  },
  mounted() {
    this.loadForm()
  },
  methods: {
    languageMark(code) {
      return {
        zh_CN: '中', en: 'EN', zh_TW: '繁', ja: '日', ko: '한',
        de: 'DE', fr: 'FR', ru: 'RU', th: '泰', es: 'ES', pt_BR: '葡', id_ID: '印'
      }[code] || code.slice(0, 2).toUpperCase()
    },
    languageLocale(code) {
      return {
        zh_CN: 'zh-CN', en: 'en-US', zh_TW: 'zh-TW', ja: 'ja-JP', ko: 'ko-KR',
        de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU', th: 'th-TH', es: 'es-ES',
        pt_BR: 'pt-BR', id_ID: 'id-ID'
      }[code] || code
    },
    loadForm() {
      const saved = getEntry(this.resolvedRegion, GLOBAL_CASHIER_KEY)
      const published = getPublishedEntry(this.resolvedRegion, GLOBAL_CASHIER_KEY)
      this.form = saved
      this.originalForm = clone(saved)
      this.publishedForm = published
      this.publishedAt = published.publishedAt || ''
      this.touched = {}
    },
    formatTime(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    },
    isLanguageConfigured(code) {
      return AGREEMENT_TYPES.every(type => !!String(this.form[type.code]?.[code] || '').trim())
    },
    touch(type) {
      this.touched = { ...this.touched, [`${type}_${this.activeLanguage}`]: true }
    },
    fieldError(type) {
      if (!this.touched[`${type}_${this.activeLanguage}`]) return ''
      return isValidUrl(this.form[type][this.activeLanguage]) ? '' : '请输入 http 或 https 开头的完整地址'
    },
    validate() {
      const touched = {}
      for (const lang of LANGUAGES) {
        for (const type of AGREEMENT_TYPES) touched[`${type.code}_${lang.code}`] = true
      }
      this.touched = touched
      const invalid = AGREEMENT_TYPES.some(type =>
        LANGUAGES.some(lang => !isValidUrl(this.form[type.code][lang.code]))
      )
      if (invalid) {
        this.$message.error('存在格式不正确的链接，请检查后再保存')
        return false
      }
      const missingFallback = AGREEMENT_TYPES.filter(type => {
        const links = this.form[type.code]
        const hasAny = LANGUAGES.some(lang => String(links[lang.code] || '').trim())
        return hasAny && !String(links[this.fallbackLanguage] || '').trim()
      })
      if (missingFallback.length) {
        this.$message.error(`${missingFallback.map(type => type.name).join('、')}需要填写${this.fallbackLanguage === 'en' ? 'English' : '简体中文'}链接作为回落`)
        return false
      }
      return true
    },
    saveForm() {
      if (!this.validate()) return
      this.saving = true
      const saved = saveEntry(this.resolvedRegion, GLOBAL_CASHIER_KEY, this.form)
      this.form = saved
      this.originalForm = clone(saved)
      this.saving = false
      this.$message.success('协议设置已保存')
    },
    async publishForm() {
      if (this.dirty) {
        this.$message.warning('请先保存协议配置，再发布')
        return
      }
      if (!this.hasUnpublishedChanges) {
        this.$message.info('当前没有待发布的协议变更')
        return
      }
      if (!this.validate()) return
      try {
        await this.$confirm.confirmStatusChange({
          title: '整体发布协议配置',
          message: '确认整体发布当前已保存的 12 种语言协议链接吗？发布后将立即生效。',
          confirmText: '整体发布',
          cancelText: '取消'
        })
      } catch {
        return
      }
      const published = publishEntry(this.resolvedRegion, GLOBAL_CASHIER_KEY, this.form)
      this.publishedForm = clone(published)
      this.publishedAt = published.publishedAt
      this.$message.success('协议配置已发布并生效')
    },
  }
}
</script>

<style scoped>
.agreement-page { max-width: 1120px; margin: 0 auto; color: #20242d; }
.agreement-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 26px; }
.page-title { margin: 0 0 6px; font-size: 28px; font-weight: 700; letter-spacing: 0; }
.page-desc { margin: 0; color: #8a92a1; font-size: 14px; }
.header-states { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
.header-statuses { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.save-state { display: flex; align-items: center; gap: 7px; color: #7d8795; font-size: 13px; }
.save-state svg { color: #31b77a; }
.save-state--dirty svg { color: #d99a2b; }
.publish-state { display: flex; align-items: center; gap: 7px; color: #7d8795; font-size: 13px; }
.publish-state svg { color: #31b77a; }
.publish-state--pending svg { color: #d99a2b; }
.agreement-layout { display: grid; grid-template-columns: 286px minmax(0, 1fr); gap: 18px; align-items: start; }
.language-panel, .agreement-editor { background: #fff; border: 1px solid #e2e6ed; border-radius: 12px; box-shadow: 0 2px 8px rgba(29, 43, 70, 0.04); }
.language-panel { padding: 0 0 16px; overflow: hidden; }
.language-panel-head { display: flex; justify-content: space-between; align-items: center; padding: 22px 20px 18px; border-bottom: 1px solid #edf0f4; }
.language-panel-head h2 { margin: 0 0 4px; font-size: 16px; }
.language-panel-head span { color: #9aa2ae; font-size: 12px; }
.language-item { width: 100%; display: flex; align-items: center; gap: 11px; padding: 12px 18px; border: 0; background: transparent; text-align: left; cursor: pointer; color: inherit; }
.language-item--active { background: #eff1ff; box-shadow: inset 3px 0 #5d6bea; }
.language-mark, .editor-language-mark { display: grid; place-items: center; flex: 0 0 auto; width: 34px; height: 34px; border-radius: 9px; background: #f0f2f5; color: #596372; font-size: 12px; font-weight: 700; }
.language-item--active .language-mark, .editor-language-mark { background: #eef0ff; color: #5364e8; }
.language-copy { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.language-copy strong { font-size: 14px; }
.language-copy small { color: #98a0ad; font-size: 12px; }
.language-status { width: 7px; height: 7px; border-radius: 50%; background: #40bd80; }
.language-status--empty { background: #ccd1d9; }
.language-arrow { color: #9aa3b2; font-size: 20px; line-height: 1; }
.language-note { display: flex; gap: 9px; align-items: flex-start; margin: 13px 16px 0; padding: 14px 12px 0; border-top: 1px solid #edf0f4; color: #8892a1; font-size: 12px; line-height: 1.55; }
.language-note svg { flex: 0 0 auto; color: #818b98; }
.editor-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 28px; border-bottom: 1px solid #edf0f4; }
.editor-language { display: flex; align-items: center; gap: 12px; }
.editor-language h2 { margin: 0 0 4px; font-size: 17px; }
.editor-language p { margin: 0; color: #929aa7; font-size: 12px; }
.configured-badge { padding: 6px 10px; border-radius: 6px; background: #eaf8f0; color: #279861; font-size: 12px; font-weight: 600; }
.editor-body { padding: 28px; }
.link-field + .link-field { margin-top: 28px; }
.link-field label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 650; }
.link-field p { margin: 0 0 10px; color: #929aa7; font-size: 12px; }
.link-input-wrap { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 0 12px; border: 1px solid #dce1e8; border-radius: 8px; color: #8993a0; }
.link-input-wrap:focus-within { border-color: #6572e8; box-shadow: 0 0 0 3px rgba(101, 114, 232, 0.12); }
.link-input-wrap .input { flex: 1; min-width: 0; height: 40px; padding: 0; border: 0; box-shadow: none; }
.link-input-wrap .input:focus { box-shadow: none; }
.input-action { color: #8e98a7; font-size: 18px; }
.field-error, .field-success { display: flex; align-items: center; gap: 4px; margin-top: 7px; font-size: 12px; }
.field-error { color: #df4f5b; }
.field-success { color: #29a66d; }
.editor-footer { display: flex; justify-content: flex-end; align-items: center; gap: 16px; padding: 18px 28px; border-top: 1px solid #edf0f4; }
.footer-hint { display: flex; align-items: center; gap: 6px; color: #929aa7; font-size: 12px; }
@media (max-width: 860px) {
  .agreement-page-header { align-items: flex-start; gap: 14px; flex-direction: column; }
  .agreement-layout { grid-template-columns: 1fr; }
  .language-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding-bottom: 10px; }
  .language-panel-head, .language-note { grid-column: 1 / -1; }
  .language-item { padding: 10px 14px; }
}
@media (max-width: 560px) {
  .agreement-page { padding: 0 2px; }
  .page-title { font-size: 24px; }
  .header-states { align-items: flex-start; width: 100%; }
  .header-statuses { justify-content: flex-start; flex-wrap: wrap; }
  .header-actions { flex-wrap: wrap; }
  .language-panel { display: block; }
  .language-panel-head { padding: 18px 16px 14px; }
  .editor-header, .editor-body, .editor-footer { padding-left: 18px; padding-right: 18px; }
  .editor-footer { align-items: flex-start; flex-direction: column; }
}
</style>
