<template>
  <div class="cashier-bind" :class="{ 'cashier-bind--embedded': embedded }">
    <div v-if="loading" class="panel panel--loading">
      <span class="loading-dot" aria-hidden="true" />
      <span>加载中…</span>
    </div>
    <div v-else-if="loadError" class="alert alert-error" role="alert">{{ loadError }}</div>
    <div v-else class="panel">
      <header class="panel-head">
        <div class="panel-head__title">
          <h2 class="panel-title" id="cashier-template-multi-label">
            {{ readonly ? '已关联收银台模版' : '关联收银台模版' }}
          </h2>
          <span v-if="options.length || (readonly && localSelectedIds.length)" class="count-badge">
            {{ readonly ? '已关联' : '已选' }} {{ localSelectedIds.length }}
          </span>
          <span v-if="dirty && !readonly" class="dirty-pill" aria-live="polite">未保存</span>
        </div>
        <div class="panel-head__actions">
          <input
            v-if="!readonly && options.length"
            v-model.trim="listFilter"
            type="search"
            class="filter-input"
            placeholder="筛选 ID / 国家 / 币种"
            aria-label="筛选模版列表"
          />
          <router-link class="btn btn-ghost btn-sm" :to="publicSortPath">
            公共模版库
          </router-link>
          <button
            v-if="!readonly"
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="saving || refreshing"
            @click="handleRefreshList"
          >
            {{ refreshing ? '刷新中…' : '刷新' }}
          </button>
        </div>
      </header>
      <div class="subhead">
        <p v-if="lastFetchedAt" class="meta-refresh">
          已同步 {{ lastFetchedAt }}
          <template v-if="readonly"> · 本页展示已关联 {{ listRows.length }} 条</template>
          <template v-else-if="options.length"> · 共 {{ options.length }} 条</template>
        </p>
        <div v-if="!readonly && options.length" class="bulk-actions">
          <button type="button" class="btn-link" :disabled="saving || !filteredOptions.length" @click="selectAllFiltered">
            全选当前列表
          </button>
          <span class="bulk-sep" aria-hidden="true">|</span>
          <button type="button" class="btn-link" :disabled="saving || !localSelectedIds.length" @click="clearAllSelection">
            清空勾选
          </button>
        </div>
      </div>

      <div
        v-if="offlineLinkedAtFetch.length"
        class="alert alert-warn offline-linked-banner"
        role="alert"
        aria-live="polite"
      >
        <p class="offline-linked-banner__title">以下已关联收银台模版在公共库中为未发布或已下线：</p>
        <ul class="offline-linked-banner__list">
          <li v-for="item in offlineLinkedAtFetch" :key="'off-' + item.id">
            <code class="offline-linked-banner__code">{{ item.label }}</code>
          </li>
        </ul>
        <p v-if="readonly" class="offline-linked-banner__note">
          全局收银台模版下线后，场景侧关联通常已由系统自动更新并与线上生效。上表供核对；如需调整请使用「编辑配置」并保存确认。
        </p>
        <p v-else class="offline-linked-banner__note">
          全局收银台模版下线后，场景关联已由系统自动更新并<strong>已与线上生效</strong>。本页勾选与列表即当前生效结果；编辑区已去掉不可用的下线项。请点击下方「保存（确认）」表示您已审阅并确认展示无误。
        </p>
      </div>

      <ul
        v-if="listRows.length > 0"
        class="template-list"
        role="group"
        aria-labelledby="cashier-template-multi-label"
      >
        <li
          v-for="row in listRows"
          :key="row.kind === 'opt' ? row.o.id : 'orphan-' + row.id"
          class="template-row"
          :class="
            row.kind === 'opt'
              ? {
                  'template-row--offline': !row.o.isPublished,
                  'template-row--checked':
                    row.o.isPublished && (readonly || localSelectedIds.includes(row.o.id))
                }
              : {}
          "
        >
          <template v-if="row.kind === 'orphan'">
            <div class="template-row__main template-row__main--orphan-view">
              <span class="template-row__body">
                <span class="template-row__id">{{ row.id }}</span>
                <span class="template-row__meta">
                  <span class="pill pill--muted">未出现在当前公共模版列表</span>
                </span>
              </span>
            </div>
            <span class="status-tag status-tag--warn" title="公共库中无对应条目">—</span>
          </template>
          <template v-else>
            <label
              class="template-row__main"
              :class="{ 'template-row__main--no-check': !row.o.isPublished || readonly }"
            >
              <input
                v-if="!readonly"
                type="checkbox"
                class="check-input"
                :checked="localSelectedIds.includes(row.o.id)"
                :disabled="saving || !row.o.isPublished"
                @change="onOptionToggle(row.o.id, $event.target.checked)"
              />
              <input
                v-else
                type="checkbox"
                class="check-input"
                checked
                disabled
                tabindex="-1"
                aria-hidden="true"
              />
              <span class="template-row__body">
                <span class="template-row__id">{{ row.o.rowKey }}</span>
                <span class="template-row__meta">
                  <span class="pill">{{ row.o.country }}/{{ row.o.currency }}</span>
                  <span class="pill pill--muted">{{ row.o.methodCount }} 种支付</span>
                </span>
              </span>
            </label>
            <span
              class="status-tag"
              :class="row.o.isPublished ? 'status-tag--ok' : 'status-tag--warn'"
            >
              {{ row.o.isPublished ? '已发布' : '未发布' }}
            </span>
          </template>
        </li>
      </ul>
      <div v-else-if="options.length === 0" class="empty-state">暂无可用模版</div>
      <div v-else-if="!readonly" class="empty-state">无匹配项，请调整筛选</div>
      <div v-else class="empty-state">尚未关联收银台模版</div>

      <div v-if="localSelectedIds.length > 0" class="default-block">
        <div class="default-block__head">
          <span class="form-label" :id="defaultFieldLabelId">默认模版</span>
        </div>
        <div
          v-if="!readonly"
          class="radio-group"
          role="radiogroup"
          :aria-labelledby="defaultFieldLabelId"
        >
          <label v-for="opt in defaultRadioOptions" :key="'def-' + opt.id" class="radio-row">
            <input
              v-model="localDefaultId"
              type="radio"
              class="radio-input"
              :value="opt.id"
              :disabled="saving || !isOptionPublished(opt.id)"
            />
            <span class="radio-text">
              {{ opt.label }}
              <span v-if="!isOptionPublished(opt.id)" class="badge-offline badge-offline--inline">未发布</span>
            </span>
          </label>
        </div>
        <p v-else class="readonly-default">{{ defaultReadonlyText }}</p>
      </div>

      <footer v-if="!readonly" class="panel-footer">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="saving || !canSubmitCashierConfig"
          @click="handleSave"
        >
          {{ saving ? '提交中…' : '保存（确认）' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import { paymentAPI } from '@/api'
import { getScenarioById, refreshScenarios } from '@/utils/scenarios'
import { getCashierPublicTemplateId, paymentSortRowKey } from '@/utils/cashierPublicTemplateId.js'

function normalizePublishStatus(item) {
  const s = item && item.publish_status
  if (s === 'offline' || s === 'draft') return 'offline'
  return 'published'
}

function scenarioTemplateIds(scenario) {
  if (!scenario) return []
  if (Array.isArray(scenario.cashier_public_template_ids) && scenario.cashier_public_template_ids.length) {
    const seen = new Set()
    const out = []
    for (const x of scenario.cashier_public_template_ids) {
      const s = x != null ? String(x).trim() : ''
      if (s && !seen.has(s)) {
        seen.add(s)
        out.push(s)
      }
    }
    return out
  }
  const legacy = scenario.cashier_public_template_id != null ? String(scenario.cashier_public_template_id).trim() : ''
  return legacy ? [legacy] : []
}

function idsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function scenarioDefaultTemplateId(scenario) {
  if (!scenario || scenario.cashier_default_public_template_id == null) return ''
  return String(scenario.cashier_default_public_template_id).trim()
}

export default {
  name: 'ScenarioCashierTemplateBind',
  emits: ['saved'],
  props: {
    scenarioNumericId: {
      type: [String, Number],
      required: true
    },
    region: {
      type: String,
      default: 'overseas'
    },
    embedded: {
      type: Boolean,
      default: true
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: true,
      loadError: null,
      options: [],
      localSelectedIds: [],
      initialSelectedIds: [],
      localDefaultId: '',
      initialDefaultId: '',
      saving: false,
      refreshing: false,
      lastFetchedAt: '',
      listFilter: '',
      /** 本次拉取公共列表后检测到的：曾关联且未发布/下线的模版（编辑态在本地对齐前快照，用于提示与确认） */
      offlineLinkedAtFetch: []
    }
  },
  computed: {
    filteredOptions() {
      const q = (this.listFilter || '').toLowerCase()
      if (!q) return this.options
      return this.options.filter(o => {
        const hay = `${o.rowKey} ${o.country} ${o.currency} ${o.paymentEnv} ${o.internalKey || ''}`.toLowerCase()
        return hay.includes(q)
      })
    },
    /** 编辑：全量筛选列表；查看：仅已关联（含公共库中无详情的 ID） */
    listRows() {
      if (this.readonly) {
        const q = (this.listFilter || '').toLowerCase()
        const rows = []
        const selected = new Set(this.localSelectedIds)
        for (const o of this.options) {
          if (!selected.has(o.id)) continue
          if (q) {
            const hay = `${o.rowKey} ${o.country} ${o.currency} ${o.paymentEnv} ${o.internalKey || ''}`.toLowerCase()
            if (!hay.includes(q)) continue
          }
          rows.push({ kind: 'opt', o })
        }
        for (const id of this.localSelectedIds) {
          if (this.options.some(o => o.id === id)) continue
          if (q && !String(id).toLowerCase().includes(q)) continue
          rows.push({ kind: 'orphan', id })
        }
        return rows
      }
      return this.filteredOptions.map(o => ({ kind: 'opt', o }))
    },
    defaultFieldLabelId() {
      return `cashier-default-label-${this.scenarioNumericId}`
    },
    publicSortPath() {
      return this.region === 'domestic' ? '/domestic/payment/sort' : '/payment/sort'
    },
    currentScenario() {
      return getScenarioById(this.scenarioNumericId, this.region)
    },
    defaultRadioOptions() {
      return this.localSelectedIds.map(id => ({
        id,
        label: this.options.find(o => o.id === id)?.rowKey || id
      }))
    },
    defaultReadonlyText() {
      if (!this.localDefaultId) return '无默认模版'
      const opt = this.defaultRadioOptions.find(o => o.id === this.localDefaultId)
      return opt ? opt.label : this.localDefaultId
    },
    dirty() {
      return (
        !idsEqual(this.localSelectedIds, this.initialSelectedIds) ||
        (this.localDefaultId || '') !== (this.initialDefaultId || '')
      )
    },
    /** 允许提交：有本地修改，或存在下线模版提示需运营保存确认 */
    canSubmitCashierConfig() {
      if (!this.localSelectedIds.length || !this.localDefaultId) return false
      return this.dirty || this.offlineLinkedAtFetch.length > 0
    },
  },
  watch: {
    scenarioNumericId() {
      this.bootstrap()
    },
    region() {
      this.bootstrap()
    }
  },
  mounted() {
    this.bootstrap()
  },
  methods: {
    syncSelectionFromScenario() {
      const ids = scenarioTemplateIds(this.currentScenario)
      this.initialSelectedIds = [...ids]
      this.localSelectedIds = [...ids]
      let def = scenarioDefaultTemplateId(this.currentScenario)
      if (def && !ids.includes(def)) {
        def = ''
      }
      if (!def && ids.length) {
        def = ids[0]
      }
      this.localDefaultId = def
      this.initialDefaultId = def
    },
    reconcileDefaultAfterSelectionChange() {
      if (!this.localSelectedIds.length) {
        this.localDefaultId = ''
        return
      }
      if (this.localDefaultId && !this.localSelectedIds.includes(this.localDefaultId)) {
        this.localDefaultId = ''
      }
      if (!this.localDefaultId) {
        this.localDefaultId = this.localSelectedIds[0]
      }
    },
    isOptionPublished(id) {
      const o = this.options.find(x => x.id === id)
      if (!o) return true
      return !!o.isPublished
    },
    reconcileDefaultPublishState() {
      if (this.readonly) return
      if (!this.localDefaultId) return
      const defId = this.localDefaultId
      const o = this.options.find(x => x.id === defId)
      if (o && !o.isPublished) {
        this.localDefaultId = ''
        const label = o.rowKey || defId
        this.$message.warning(
          `默认收银台模版「${label}」已下线或未发布；场景默认项已与系统对齐，请保存（确认）以完成审阅。`
        )
        this.reconcileDefaultAfterSelectionChange()
      }
    },
    /** 列表刷新后：将本地勾选与公共库已发布项对齐（场景侧已由系统随全局状态更新，此处仅对齐展示） */
    uncheckOfflineLinkedSelections() {
      if (this.readonly) return
      const prev = this.localSelectedIds
      const next = prev.filter(id => {
        const o = this.options.find(x => x.id === id)
        if (!o) return true
        return !!o.isPublished
      })
      if (next.length === prev.length) return
      this.localSelectedIds = next
      this.reconcileDefaultAfterSelectionChange()
    },
    /** 当前勾选与公共列表对比：已关联且未发布的条目（用于拉取后快照与提示） */
    buildOfflineLinkedDetailsFromSelection() {
      const out = []
      for (const id of this.localSelectedIds) {
        const o = this.options.find(x => x.id === id)
        if (o && !o.isPublished) {
          out.push({ id, label: o.rowKey || String(id) })
        }
      }
      return out
    },
    notifyOfflineLinkedToast(items) {
      if (!items.length) return
      const max = 6
      const labels = items.map(x => x.label)
      const head = labels.slice(0, max).join('、')
      const suffix = labels.length > max ? ` 等共 ${labels.length} 个` : ''
      const tail = this.readonly
        ? '场景关联通常已自动更新并生效，请在下方列表核对。'
        : '场景关联已由系统自动更新并生效；本页勾选已对齐。请点击「保存（确认）」完成审阅。'
      this.$message.warning(`已关联模版中有未发布/已下线：${head}${suffix}。${tail}`)
    },
    async handleRefreshList() {
      if (this.readonly || this.saving) return
      this.refreshing = true
      this.loadError = null
      try {
        await this.fetchPublicTemplates()
        if (!this.loadError) {
          this.$message.success('已刷新')
        }
      } catch (e) {
        this.loadError = e.message || '刷新失败'
      } finally {
        this.refreshing = false
      }
    },
    async bootstrap() {
      this.loading = true
      this.loadError = null
      this.listFilter = ''
      this.syncSelectionFromScenario()
      try {
        await this.fetchPublicTemplates()
      } finally {
        this.loading = false
      }
    },
    async fetchPublicTemplates() {
      const scenario = this.currentScenario
      if (!scenario) {
        this.options = []
        this.offlineLinkedAtFetch = []
        return
      }
      try {
        const res = await paymentAPI.getPaymentSortList({
          region: this.region,
          page: 1,
          page_size: 2000
        })
        if (res.code !== 200) {
          this.loadError = res.message || '获取公共收银台配置失败'
          this.options = []
          this.offlineLinkedAtFetch = []
          return
        }
        const list = res.data?.list || []
        this.options = list.map(row => {
          const pub = normalizePublishStatus(row) === 'published'
          const id = getCashierPublicTemplateId(row)
          return {
            id,
            rowKey: id,
            internalKey: paymentSortRowKey(row),
            isPublished: pub,
            country: row.country_code || '—',
            currency: row.currency || '—',
            paymentEnv: row.payment_env || '—',
            methodCount: row.method_count || 0
          }
        })
        this.lastFetchedAt = new Date().toLocaleString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
        const offlineDetails = this.buildOfflineLinkedDetailsFromSelection()
        this.offlineLinkedAtFetch = offlineDetails
        if (offlineDetails.length) {
          this.notifyOfflineLinkedToast(offlineDetails)
        }
        this.uncheckOfflineLinkedSelections()
        this.reconcileDefaultPublishState()
      } catch (e) {
        this.loadError = e.message || '获取公共收银台配置失败'
        this.options = []
        this.offlineLinkedAtFetch = []
      }
    },
    onOptionToggle(id, checked) {
      if (this.readonly || this.saving) return
      if (checked && !this.isOptionPublished(id)) {
        return
      }
      if (checked) {
        if (!this.localSelectedIds.includes(id)) {
          this.localSelectedIds = [...this.localSelectedIds, id]
        }
      } else {
        this.localSelectedIds = this.localSelectedIds.filter(x => x !== id)
      }
      this.reconcileDefaultAfterSelectionChange()
    },
    selectAllFiltered() {
      if (this.readonly || this.saving) return
      const set = new Set(this.localSelectedIds)
      for (const o of this.filteredOptions) {
        if (o.isPublished) set.add(o.id)
      }
      this.localSelectedIds = [...set]
      this.reconcileDefaultAfterSelectionChange()
    },
    clearAllSelection() {
      if (this.readonly || this.saving) return
      this.localSelectedIds = []
      this.reconcileDefaultAfterSelectionChange()
    },
    async handleSave() {
      if (this.readonly || this.saving) return
      if (!this.localSelectedIds.length) {
        this.$message.error('请先关联至少一个收银台模版，再设置默认模版。')
        return
      }
      if (!this.localDefaultId) {
        this.$message.error('必须选择一个默认模版。')
        return
      }
      try {
        await this.$confirm.confirm({
          type: 'warning',
          title: '确认收银台配置',
          message:
            '当前展示为系统已生效的关联与默认模版（含全局模版下线等自动变更）。保存仅表示您已审阅并确认无误，确定继续？'
        })
      } catch {
        return
      }
      this.saving = true
      try {
        const res = await paymentAPI.updateScenario(
          this.scenarioNumericId,
          {
            cashier_public_template_ids: [...this.localSelectedIds],
            cashier_default_public_template_id: this.localDefaultId || ''
          },
          this.region
        )
        if (res.code === 200) {
          refreshScenarios(this.region)
          this.initialSelectedIds = [...this.localSelectedIds]
          this.initialDefaultId = this.localDefaultId || ''
          this.$message.success('已确认')
          this.$emit('saved')
          await this.fetchPublicTemplates()
        } else {
          this.$message.error(res.message || '确认失败')
        }
      } catch (e) {
        this.$message.error(e.message || '确认失败')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.cashier-bind {
  max-width: 720px;
}

.cashier-bind--embedded {
  max-width: none;
}

.panel {
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg, 8px);
  background: var(--color-bg-container, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  padding: var(--spacing-md, 16px);
}

.panel--loading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: cashier-pulse 1s ease-in-out infinite;
}

@keyframes cashier-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.panel-head__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.count-badge {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-bg-layout, rgba(0, 0, 0, 0.04));
}

.dirty-pill {
  font-size: 11px;
  font-weight: 600;
  color: #d48806;
  padding: 2px 8px;
  border-radius: 4px;
  background: #fff7e6;
  border: 1px solid #ffd591;
}

.panel-head__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.filter-input {
  min-width: 160px;
  max-width: 220px;
  height: 30px;
  padding: 0 10px;
  font-size: 13px;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius, 6px);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
}

.filter-input::placeholder {
  color: var(--color-text-tertiary);
}

.filter-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.12);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--color-primary);
  border: 1px solid var(--color-border-secondary);
  background: var(--color-bg-container);
  border-radius: var(--radius, 6px);
  padding: 0 10px;
  height: 30px;
  font-size: 12px;
  font-weight: 500;
  transition: border-color 0.15s, background 0.15s;
}

.btn-ghost:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-layout, rgba(0, 0, 0, 0.02));
}

.subhead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-refresh {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.bulk-sep {
  color: var(--color-border-secondary);
  user-select: none;
}

.btn-link {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.btn-link:disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
  text-decoration: none;
}

.alert-warn {
  padding: 10px 12px;
  border-radius: var(--radius);
  background: #fffbe6;
  border: 1px solid #ffe58f;
  color: #ad6800;
  font-size: var(--font-size-xs);
  line-height: 1.5;
  margin-bottom: 12px;
}

.offline-linked-banner__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #ad6800;
}

.offline-linked-banner__list {
  margin: 0 0 8px;
  padding-left: 20px;
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.65;
}

.offline-linked-banner__code {
  font-size: 12px;
  word-break: break-all;
}

.offline-linked-banner__note {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.badge-offline {
  display: inline-block;
  margin-left: 8px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #ad6800;
  background: #fff7e6;
  border: 1px solid #ffd591;
  vertical-align: middle;
}

.badge-offline--inline {
  margin-left: 6px;
}

.template-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius, 8px);
  max-height: 360px;
  overflow-y: auto;
  background: var(--color-bg-layout, #fafafa);
}

.template-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-bottom: 1px solid var(--color-border-secondary);
  background: var(--color-bg-container, #fff);
  transition: background 0.12s;
}

.template-row:last-child {
  border-bottom: none;
}

.template-row--checked:not(.template-row--offline) {
  background: rgba(24, 144, 255, 0.04);
}

.template-row--offline {
  background: rgba(250, 140, 22, 0.05);
}

.template-row__main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 12px 14px;
  cursor: pointer;
  min-width: 0;
}

.template-row__main:hover {
  background: rgba(0, 0, 0, 0.02);
}

.template-row__main--no-check {
  cursor: not-allowed;
}

.template-row__main--no-check:hover {
  background: transparent;
}

.template-row__main--orphan-view {
  flex: 1;
  display: flex;
  align-items: flex-start;
  padding: 12px 12px 12px 14px;
  cursor: default;
  min-width: 0;
}

.check-input {
  margin-top: 4px;
  flex-shrink: 0;
}

.template-row__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.template-row__id {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  word-break: break-all;
  line-height: 1.35;
}

.template-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(24, 144, 255, 0.1);
  color: #096dd9;
  font-weight: 500;
}

.pill--muted {
  background: var(--color-bg-layout, rgba(0, 0, 0, 0.06));
  color: var(--color-text-secondary);
  font-weight: 400;
}

.status-tag {
  flex-shrink: 0;
  align-self: center;
  margin-right: 12px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.status-tag--ok {
  color: #389e0d;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.status-tag--warn {
  color: #ad6800;
  background: #fffbe6;
  border: 1px solid #ffe58f;
}

.empty-state {
  margin: 0 0 16px;
  padding: 28px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-tertiary);
  border: 1px dashed var(--color-border-secondary);
  border-radius: var(--radius, 8px);
  background: var(--color-bg-layout, #fafafa);
}

.default-block {
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-secondary);
}

.default-block__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.default-block__hint {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.radio-input {
  margin-top: 3px;
  flex-shrink: 0;
}

.radio-text {
  line-height: 1.45;
}

.readonly-default {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.panel-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-secondary);
}

.alert-error {
  padding: 10px 12px;
  border-radius: var(--radius);
  background: #fff2f0;
  color: #cf1322;
  font-size: var(--font-size-sm);
}
</style>
