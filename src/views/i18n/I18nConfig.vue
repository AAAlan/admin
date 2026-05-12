<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">多语言配置</h1>
      <p class="page-desc">统一管理支付方式推荐文案、商品名称、跳转促销文案的多语言翻译。</p>
    </div>

    <div class="page-content">
      <!-- 筛选栏 -->
      <div class="page-filters">
        <div class="filter-row">
          <div class="filter-item">
            <label class="form-label">类别</label>
            <select v-model="filters.category" class="select">
              <option value="">全部</option>
              <option v-for="(label, code) in CATEGORIES" :key="code" :value="code">{{ label }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="form-label">Key / 原文</label>
            <input v-model="filters.keyword" class="input" type="text" placeholder="搜索 Key 或简体中文" />
          </div>
          <div class="filter-item">
            <label class="form-label">翻译状态</label>
            <select v-model="filters.status" class="select">
              <option value="">全部</option>
              <option value="full">已完成</option>
              <option value="partial">部分翻译</option>
              <option value="empty">待翻译</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary btn-sm" type="button" @click="handleSearch">搜索</button>
            <button class="btn btn-text btn-sm" type="button" @click="handleReset">重置</button>
          </div>
        </div>
      </div>

      <!-- 统计条 -->
      <div class="stat-bar">
        <span class="stat-item">共 <strong>{{ allEntries.length }}</strong> 条</span>
        <span class="stat-item stat-full">已完成 <strong>{{ countByStatus('full') }}</strong></span>
        <span class="stat-item stat-partial">部分翻译 <strong>{{ countByStatus('partial') }}</strong></span>
        <span class="stat-item stat-empty">待翻译 <strong>{{ countByStatus('empty') }}</strong></span>
      </div>

      <!-- 主表格 -->
      <table class="table" role="table" aria-label="多语言配置列表">
        <thead>
          <tr>
            <th>Key</th>
            <th>类别</th>
            <th>简体中文（原文）</th>
            <th v-for="lang in secondaryLangs" :key="lang.code">{{ lang.name }}</th>
            <th>使用位置</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredEntries.length === 0">
            <td :colspan="5 + secondaryLangs.length" class="empty-cell">暂无数据</td>
          </tr>
          <tr v-for="entry in filteredEntries" :key="entry.key">
            <td>
              <code class="mono-text">{{ entry.key }}</code>
            </td>
            <td>
              <span class="badge badge-info">{{ CATEGORIES[entry.category] || entry.category }}</span>
            </td>
            <td class="cell-source">{{ entry.zh_CN || '-' }}</td>
            <td v-for="lang in secondaryLangs" :key="lang.code" class="cell-translation">
              <span v-if="entry[lang.code]" class="translation-text">{{ entry[lang.code] }}</span>
              <span v-else class="translation-empty">待翻译</span>
            </td>
            <td class="cell-usedby">{{ entry.usedBy || '-' }}</td>
            <td class="cell-time">{{ formatTime(entry.updatedAt) }}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-primary btn-sm" type="button" @click="handleEdit(entry)">
                  编辑翻译
                </button>
                <button class="btn btn-text btn-sm btn-danger-text" type="button" @click="handleDelete(entry)">
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑面板 -->
    <I18nTextEditor
      v-model:visible="editorVisible"
      :i18n-key="editingKey"
      :category="editingCategory"
      :zh-cn-default="editingZhCn"
      :used-by="editingUsedBy"
      @saved="onSaved"
    />
  </div>
</template>

<script>
import {
  getAllEntries,
  deleteEntry,
  CATEGORIES,
  LANGUAGES,
  completionOf
} from '@/utils/i18nTextStore.js'
import I18nTextEditor from '@/components/I18nTextEditor.vue'

export default {
  name: 'I18nConfig',
  components: { I18nTextEditor },
  data() {
    return {
      CATEGORIES,
      LANGUAGES,
      filters: { category: '', keyword: '', status: '' },
      appliedFilters: { category: '', keyword: '', status: '' },
      allEntries: [],
      editorVisible: false,
      editingKey: '',
      editingCategory: 'text',
      editingZhCn: '',
      editingUsedBy: ''
    }
  },
  computed: {
    secondaryLangs() {
      return LANGUAGES.filter(l => !l.required)
    },
    filteredEntries() {
      let list = [...this.allEntries]
      const { category, keyword, status } = this.appliedFilters
      if (category) list = list.filter(e => e.category === category)
      if (keyword) {
        const kw = keyword.toLowerCase()
        list = list.filter(e =>
          e.key.toLowerCase().includes(kw) ||
          (e.zh_CN || '').toLowerCase().includes(kw)
        )
      }
      if (status) {
        list = list.filter(e => this.statusOf(e) === status)
      }
      return list
    }
  },
  mounted() {
    this.reload()
  },
  methods: {
    reload() {
      this.allEntries = getAllEntries()
    },
    handleSearch() {
      this.appliedFilters = { ...this.filters }
    },
    handleReset() {
      this.filters = { category: '', keyword: '', status: '' }
      this.appliedFilters = { category: '', keyword: '', status: '' }
    },
    statusOf(entry) {
      const { filled, total } = completionOf(entry)
      if (filled === total) return 'full'
      if (filled > 1) return 'partial'
      return 'empty'
    },
    countByStatus(status) {
      return this.allEntries.filter(e => this.statusOf(e) === status).length
    },
    formatTime(iso) {
      if (!iso) return '-'
      try {
        const d = new Date(iso)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      } catch {
        return '-'
      }
    },
    handleEdit(entry) {
      this.editingKey = entry.key
      this.editingCategory = entry.category
      this.editingZhCn = entry.zh_CN
      this.editingUsedBy = entry.usedBy
      this.editorVisible = true
    },
    async handleDelete(entry) {
      try {
        await this.$confirm.confirmStatusChange({
          title: '确认删除',
          message: `删除后相关组件的多语言绑定将失效，确认删除 Key「${entry.key}」？`,
          confirmText: '删除',
          cancelText: '取消'
        })
      } catch {
        return
      }
      deleteEntry(entry.key)
      this.reload()
      this.$message.success('已删除')
    },
    onSaved() {
      this.reload()
      this.$message.success('多语言配置已保存')
    }
  }
}
</script>

<style scoped>
.page-container { max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0 0 4px; }
.page-desc { font-size: 13px; color: #8f97a5; margin: 0; }

.page-content { background: #fff; border: 1px solid #e7ebf0; border-radius: 8px; padding: 20px; }

.page-filters { margin-bottom: 16px; }
.filter-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.filter-item { flex: 0 0 auto; min-width: 160px; }
.filter-actions { display: flex; gap: 8px; margin-left: auto; align-items: flex-end; }

.stat-bar {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 16px;
}
.stat-item { font-size: 13px; color: #5d6675; }
.stat-item strong { color: #1f2937; }
.stat-full strong   { color: #389e0d; }
.stat-partial strong { color: #d48806; }
.stat-empty strong  { color: #8c8c8c; }

.empty-cell { text-align: center; padding: 40px 0; color: #aaa; }

.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.badge-info { background: rgba(22, 119, 255, 0.08); color: #1677ff; }

.mono-text {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  color: #374151;
  background: #f0f4f8;
  padding: 2px 6px;
  border-radius: 4px;
}

.cell-source { max-width: 200px; word-break: break-all; color: #1f2937; font-size: 13px; }
.cell-translation { max-width: 150px; word-break: break-all; font-size: 13px; }
.translation-text { color: #374151; }
.translation-empty { color: #c0c5ce; font-style: italic; font-size: 12px; }
.cell-usedby { font-size: 12px; color: #8f97a5; max-width: 140px; word-break: break-all; }
.cell-time { font-size: 12px; color: #9aa4b2; white-space: nowrap; }

.table-actions { display: flex; gap: 8px; align-items: center; }
.btn-danger-text { color: #f5222d; }
</style>
