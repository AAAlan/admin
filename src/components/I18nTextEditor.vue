<template>
  <Teleport to="body">
    <div v-if="visible" class="i18n-overlay" role="dialog" aria-modal="true" :aria-label="`多语言编辑 - ${categoryLabel}`" @click.self="handleCancel">
      <div class="i18n-panel">
        <div class="i18n-panel-header">
          <div class="i18n-panel-title">
            <span class="i18n-icon" aria-hidden="true">🌐</span>
            多语言配置
            <span class="i18n-category-badge">{{ categoryLabel }}</span>
          </div>
          <button type="button" class="i18n-close-btn" aria-label="关闭" @click="handleCancel">✕</button>
        </div>

        <div class="i18n-panel-body">
          <div class="i18n-key-row">
            <span class="i18n-key-label">Key</span>
            <span class="i18n-required">*</span>
            <input
              v-model="form.key"
              class="i18n-key-input"
              type="text"
              :disabled="readonly"
              placeholder="请输入唯一 Key（例如 recommend_card_fast）"
            />
            <span class="i18n-completion-badge" :class="completionClass">
              {{ completion.filled }}/{{ completion.total }} 已填
            </span>
          </div>

          <div class="i18n-hint">
            Key 与简体中文为必填；Key 仅支持小写字母、数字、下划线。其余语言由翻译人员根据 Key 填写。
          </div>

          <div
            v-for="lang in languages"
            :key="lang.code"
            class="i18n-lang-row"
          >
            <label :for="`i18n-${lang.code}`" class="i18n-lang-label">
              {{ lang.name }}
              <span v-if="lang.required" class="i18n-required">*</span>
            </label>
            <textarea
              :id="`i18n-${lang.code}`"
              v-model="form[lang.code]"
              class="i18n-textarea"
              :placeholder="lang.required ? '请输入原文（简体中文）' : `${lang.name} 翻译（可先留空）`"
              rows="2"
              :disabled="readonly"
            />
            <span v-if="form[lang.code] && form[lang.code].trim()" class="i18n-filled-dot" title="已填写" aria-hidden="true">●</span>
            <span v-else class="i18n-empty-dot" title="待翻译" aria-hidden="true">○</span>
          </div>
        </div>

        <div class="i18n-panel-footer">
          <button type="button" class="btn btn-secondary" @click="handleCancel">取消</button>
          <button v-if="!readonly" type="button" class="btn btn-primary" :disabled="!canSave" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { LANGUAGES, CATEGORIES, getEntry, upsertEntry, completionOf } from '@/utils/i18nTextStore.js'

export default {
  name: 'I18nTextEditor',
  props: {
    visible: { type: Boolean, default: false },
    /** 已有条目的 key；为空则新建 */
    i18nKey: { type: String, default: '' },
    /** 类别：'recommend' | 'goods_name' | 'promo' */
    category: { type: String, default: 'text' },
    /** 预填简体中文（从父组件当前 input 值同步过来） */
    zhCnDefault: { type: String, default: '' },
    /** 显示位置描述，便于在管理列表中识别来源 */
    usedBy: { type: String, default: '' },
    readonly: { type: Boolean, default: false }
  },
  emits: ['update:visible', 'saved'],
  data() {
    return {
      languages: LANGUAGES,
      form: this.buildForm()
    }
  },
  computed: {
    categoryLabel() {
      return CATEGORIES[this.category] || this.category
    },
    completion() {
      return completionOf(this.form)
    },
    completionClass() {
      const { filled, total } = this.completion
      if (filled === total) return 'i18n-completion--full'
      if (filled > 1) return 'i18n-completion--partial'
      return 'i18n-completion--empty'
    },
    canSave() {
      return !!(this.form.key && this.form.key.trim() && this.form.zh_CN && this.form.zh_CN.trim())
    }
  },
  watch: {
    visible(v) {
      if (v) this.form = this.buildForm()
    }
  },
  methods: {
    buildForm() {
      const existing = this.i18nKey ? getEntry(this.i18nKey) : null
      return {
        key: existing?.key || this.i18nKey || '',
        category: this.category,
        zh_CN: existing?.zh_CN ?? this.zhCnDefault ?? '',
        en: existing?.en ?? '',
        ja: existing?.ja ?? '',
        ko: existing?.ko ?? '',
        zh_TW: existing?.zh_TW ?? '',
        usedBy: this.usedBy || existing?.usedBy || ''
      }
    },
    handleSave() {
      if (!this.canSave) return
      const key = String(this.form.key || '').trim()
      if (!/^[a-z0-9_]+$/.test(key)) {
        this.$message.warning('Key 格式不合法：仅支持小写字母、数字、下划线')
        return
      }
      const current = this.i18nKey ? getEntry(this.i18nKey) : null
      const sameKeyExisting = getEntry(key)
      if ((!current || current.key !== key) && sameKeyExisting) {
        this.$message.warning(`Key「${key}」已存在，请更换后再保存`)
        return
      }
      const saved = upsertEntry({ ...this.form, usedBy: this.usedBy || this.form.usedBy })
      this.$emit('saved', saved)
      this.$emit('update:visible', false)
    },
    handleCancel() {
      this.$emit('update:visible', false)
    }
  }
}
</script>

<style scoped>
.i18n-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.i18n-panel {
  width: min(600px, 96vw);
  max-height: 90vh;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}

.i18n-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #edf1f5;
  flex-shrink: 0;
}

.i18n-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.i18n-icon {
  font-size: 18px;
}

.i18n-category-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #eaf4ff;
  color: #1677ff;
  font-size: 12px;
  font-weight: 500;
}

.i18n-close-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #9aa4b2;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}
.i18n-close-btn:hover {
  color: #374151;
}

.i18n-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.i18n-key-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  border-radius: 6px;
  padding: 8px 12px;
}

.i18n-key-label {
  font-size: 11px;
  font-weight: 600;
  color: #8f97a5;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.i18n-key-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  border: 1px solid #d9dfe9;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12px;
  color: #374151;
  background: #fff;
  font-family: 'Menlo', 'Monaco', monospace;
}
.i18n-key-input:focus {
  outline: none;
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}
.i18n-key-input:disabled {
  background: #f8fafc;
  color: #6b7280;
  cursor: not-allowed;
}

.i18n-completion-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}
.i18n-completion--full    { background: #f0faf0; color: #389e0d; }
.i18n-completion--partial { background: #fffbe6; color: #d48806; }
.i18n-completion--empty   { background: #f5f5f5; color: #8c8c8c; }

.i18n-hint {
  font-size: 12px;
  color: #9aa4b2;
  line-height: 1.5;
}

.i18n-lang-row {
  display: grid;
  grid-template-columns: 100px 1fr 18px;
  align-items: start;
  gap: 8px;
}

.i18n-lang-label {
  padding-top: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.i18n-required {
  color: #f5222d;
  margin-left: 2px;
}

.i18n-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid #d9dfe9;
  border-radius: 6px;
  font-size: 13px;
  color: #1f2937;
  resize: vertical;
  transition: border-color 0.15s;
  line-height: 1.5;
  font-family: inherit;
}
.i18n-textarea:focus {
  outline: none;
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}
.i18n-textarea:disabled {
  background: #f8fafc;
  color: #6b7280;
  cursor: not-allowed;
}

.i18n-filled-dot { color: #52c41a; font-size: 12px; padding-top: 8px; }
.i18n-empty-dot  { color: #d9d9d9; font-size: 12px; padding-top: 8px; }

.i18n-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #edf1f5;
  flex-shrink: 0;
}
</style>
