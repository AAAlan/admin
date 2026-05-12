<template>
  <div :class="embedded ? '' : 'page-container'">
    <div v-if="!embedded" class="page-header">
      <h1 class="page-title">配置详情</h1>
    </div>

    <div :class="embedded ? '' : 'page-content'">
      <div class="page-filters">
        <div class="filter-row">
          <div class="filter-item">
            <label class="form-label">GoodsID</label>
            <input v-model="filters.goodsId" class="input" type="text" placeholder="请输入 GoodsID" />
          </div>
          <div class="filter-item">
            <label class="form-label">商品名称</label>
            <input v-model="filters.goodsName" class="input" type="text" placeholder="请输入商品名称" />
          </div>
          <div class="filter-item">
            <label class="form-label">商品类型</label>
            <select v-model="filters.goodsType" class="select">
              <option value="">全部</option>
              <option v-for="t in goodsTypeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="form-label">SKUID</label>
            <input v-model="filters.skuId" class="input" type="text" placeholder="请输入 SKUID" />
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary btn-sm" type="button" @click="handleSearch">搜索</button>
            <button class="btn btn-text btn-sm" type="button" @click="handleReset">重置</button>
          </div>
        </div>

        <div class="add-row">
          <div class="add-row-actions">
            <button class="btn btn-primary btn-sm" type="button" @click="handleAdd">
              <Icon name="plus" :size="16" />
              <span>添加计费点</span>
            </button>
            <button class="btn btn-secondary btn-sm" type="button" @click="downloadCsvTemplate">下载模板</button>
            <button class="btn btn-secondary btn-sm" type="button" @click="triggerCsvUpload">上传CSV</button>
            <button class="btn btn-warning btn-sm" type="button" :disabled="!hasUnpublishedChanges" @click="publishChanges">发布</button>
            <input ref="csvInput" type="file" accept=".csv,text/csv" class="hidden-file-input" @change="handleCsvUpload" />
          </div>
        </div>
      </div>

      <div v-if="hasUnpublishedChanges" class="draft-banner">
        当前存在未发布的计费点配置变更，请点击右上角“发布”统一生效。
      </div>

      <table class="table" role="table" aria-label="计费点商品配置表格">
        <thead>
          <tr role="row">
            <th scope="col">GoodsID</th>
            <th scope="col">商品名称</th>
            <th scope="col">商品类型</th>
            <th scope="col">SKUID</th>
            <th scope="col">币种</th>
            <th scope="col">价格</th>
            <th scope="col">折扣</th>
            <th scope="col">跳转</th>
            <th scope="col">发布状态</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredRows.length === 0">
            <td colspan="10" class="empty-cell">暂无数据</td>
          </tr>
          <tr v-for="row in filteredRows" :key="row.rowKey" role="row">
            <td>{{ row.goodsId }}</td>
            <td>{{ row.goodsName }}</td>
            <td><span class="badge badge-info">{{ row.goodsType }}</span></td>
            <td>
              <code v-if="row.skuId" class="mono-text">{{ row.skuId }}</code>
              <span v-else class="text-muted">-</span>
            </td>
            <td class="cell-multi-line">{{ formatCurrencies(row) }}</td>
            <td class="cell-multi-line">{{ formatPrices(row) }}</td>
            <td class="cell-multi-line">{{ formatDiscounts(row) }}</td>
            <td>
              <label class="ui-switch">
                <input v-model="row.webJumpEnabled" type="checkbox" @change="markDirty(row)" />
                <span class="ui-switch-slider" aria-hidden="true" />
              </label>
            </td>
            <td>
              <span
                class="publish-status-tag"
                :class="isRowPublished(row) ? 'publish-status-tag--published' : 'publish-status-tag--unpublished'"
              >
                {{ isRowPublished(row) ? '已发布' : '未发布' }}
              </span>
            </td>
            <td>
              <div class="table-actions">
                <button class="btn btn-text btn-sm" type="button" @click="handleView(row)">
                  <Icon name="eye" :size="14" />
                  <span>查看</span>
                </button>
                <button class="btn btn-primary btn-sm" type="button" @click="handleEdit(row)">
                  <Icon name="edit" :size="14" />
                  <span>编辑</span>
                </button>
                <button class="btn btn-text btn-sm btn-danger-text" type="button" @click="handleDelete(row)">
                  <Icon name="delete" :size="14" />
                  <span>删除</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-model:visible="goodsCreateModalVisible" title="添加配置" size="medium">
      <form v-if="goodsCreateModalVisible" key="goods-create-form" @submit.prevent="handleSave" class="modal-form">
        <div class="form-group">
          <label class="form-label">GoodsID <span class="required">*</span></label>
          <input v-model="form.goodsId" class="input" type="text" placeholder="请输入 GoodsID" :disabled="viewMode || !!editingRow" />
        </div>

        <div class="form-group">
          <label class="form-label">商品名称 <span class="required">*</span></label>
          <div class="field-i18n-row">
            <input v-model="form.goodsName" class="input" type="text" placeholder="请输入商品名称（简体中文原文）" :disabled="viewMode" />
            <button
              v-if="enableI18nTranslate"
              type="button"
              class="btn btn-i18n"
              :class="{ 'btn-i18n--active': hasValidI18nKey(form.goodsName_i18n_key) }"
              :title="hasValidI18nKey(form.goodsName_i18n_key) ? '查看/编辑多语言' : '配置多语言'"
              @click="openGoodsNameI18n"
            >🌐 <span class="btn-i18n-label">{{ hasValidI18nKey(form.goodsName_i18n_key) ? '已配置' : '多语言' }}</span></button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">商品类型 <span class="required">*</span></label>
          <select v-model="form.goodsType" class="select" :disabled="viewMode">
            <option value="">请选择</option>
            <option v-for="t in goodsTypeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">SKUID <span class="hint-optional">（非必填，IAP 场景）</span></label>
          <input v-model="form.skuId" class="input" type="text" placeholder="请输入 SKUID" :disabled="viewMode" />
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <label class="form-label">多币种定价与折扣 <span class="hint-optional">（非必填）</span></label>
            <p class="hint-optional">支持添加多个币种；如填写某币种，需同时填写币种与价格，折扣可选。</p>
          </div>
          <table class="table table-nested" role="table" aria-label="多币种定价与折扣">
            <thead>
              <tr>
                <th>币种</th>
                <th>价格</th>
                <th>折扣</th>
                <th v-if="!viewMode"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in form.currencyPricings" :key="'pricing-' + idx + '-' + p.currency">
                <td>
                  <template v-if="viewMode">{{ p.currency }}</template>
                  <select v-else v-model="p.currency" class="select select-inline">
                    <option value="">请选择</option>
                    <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
                  </select>
                </td>
                <td>
                  <template v-if="viewMode">{{ p.price }}</template>
                  <div v-else class="affix-input-group input-inline">
                    <span class="affix-input-prefix">{{ getCurrencySymbol(p.currency) }}</span>
                    <input v-model="p.price" class="affix-input-field" type="text" placeholder="" />
                  </div>
                </td>
                <td>
                  <template v-if="viewMode">{{ p.discount || '-' }}</template>
                  <div v-else class="affix-input-group input-inline">
                    <input v-model="p.discount" class="affix-input-field" type="text" placeholder="" />
                    <span class="affix-input-suffix">%</span>
                  </div>
                </td>
                <td v-if="!viewMode">
                  <button
                    class="btn btn-text btn-sm btn-danger-text"
                    type="button"
                    @click="removeCurrencyPricing(idx)"
                  >
                    移除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!viewMode" class="add-currency-row">
            <button class="btn btn-secondary btn-sm" type="button" @click="addCurrencyPricing">添加币种</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">跳转 <span class="hint-optional">（非必填）</span></label>
          <label class="ui-switch ui-switch-inline">
            <input v-model="form.webJumpEnabled" type="checkbox" :disabled="viewMode" />
            <span class="ui-switch-slider" aria-hidden="true" />
          </label>
        </div>

        <div v-if="form.webJumpEnabled" class="form-group">
          <label class="form-label">跳转促销文案 <span class="hint-optional">（非必填）</span></label>
          <div class="field-i18n-row">
            <input v-model="form.promoText" class="input" type="text" placeholder="请输入促销文案（简体中文原文）" :disabled="viewMode" />
            <button
              v-if="enableI18nTranslate"
              type="button"
              class="btn btn-i18n"
              :class="{ 'btn-i18n--active': hasValidI18nKey(form.promoText_i18n_key) }"
              :title="hasValidI18nKey(form.promoText_i18n_key) ? '查看/编辑多语言' : '配置多语言'"
              @click="openPromoTextI18n"
            >🌐 <span class="btn-i18n-label">{{ hasValidI18nKey(form.promoText_i18n_key) ? '已配置' : '多语言' }}</span></button>
          </div>
        </div>

        <div class="form-footer">
          <button class="btn btn-secondary" type="button" @click="goodsCreateModalVisible = false">取消</button>
          <button v-if="!viewMode" class="btn btn-primary" type="submit" :disabled="!canSubmit">保存</button>
        </div>
      </form>
    </Modal>

    <Drawer v-model:visible="goodsEditDrawerVisible" :title="goodsEditDrawerTitle" :width="760" :show-header="true">
      <form v-if="goodsEditDrawerVisible" :key="goodsFormDrawerKey" @submit.prevent="handleSave" class="modal-form">
        <div class="form-group">
          <label class="form-label">GoodsID <span v-if="!viewMode" class="required">*</span></label>
          <input v-model="form.goodsId" class="input" type="text" placeholder="请输入 GoodsID" :disabled="viewMode || !!editingRow" />
        </div>

        <div class="form-group">
          <label class="form-label">商品名称 <span v-if="!viewMode" class="required">*</span></label>
          <div class="field-i18n-row">
            <input v-model="form.goodsName" class="input" type="text" placeholder="请输入商品名称（简体中文原文）" :disabled="viewMode" />
            <button
              v-if="enableI18nTranslate"
              type="button"
              class="btn btn-i18n"
              :class="{ 'btn-i18n--active': hasValidI18nKey(form.goodsName_i18n_key) }"
              :title="hasValidI18nKey(form.goodsName_i18n_key) ? '查看/编辑多语言' : '配置多语言'"
              @click="openGoodsNameI18n"
            >🌐 <span class="btn-i18n-label">{{ hasValidI18nKey(form.goodsName_i18n_key) ? '已配置' : '多语言' }}</span></button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">商品类型 <span v-if="!viewMode" class="required">*</span></label>
          <select v-model="form.goodsType" class="select" :disabled="viewMode">
            <option value="">请选择</option>
            <option v-for="t in goodsTypeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">SKUID <span class="hint-optional">（非必填，IAP 场景）</span></label>
          <input v-model="form.skuId" class="input" type="text" placeholder="请输入 SKUID" :disabled="viewMode" />
        </div>

        <div class="form-section">
          <div class="form-section-head">
            <label class="form-label">多币种定价与折扣 <span class="hint-optional">（非必填）</span></label>
            <p class="hint-optional">支持添加多个币种；如填写某币种，需同时填写币种与价格，折扣可选。</p>
          </div>
          <table class="table table-nested" role="table" aria-label="多币种定价与折扣">
            <thead>
              <tr>
                <th>币种</th>
                <th>价格</th>
                <th>折扣</th>
                <th v-if="!viewMode"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in form.currencyPricings" :key="'pricing-edit-' + idx + '-' + p.currency">
                <td>
                  <template v-if="viewMode">{{ p.currency }}</template>
                  <select v-else v-model="p.currency" class="select select-inline">
                    <option value="">请选择</option>
                    <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
                  </select>
                </td>
                <td>
                  <template v-if="viewMode">{{ p.price }}</template>
                  <div v-else class="affix-input-group input-inline">
                    <span class="affix-input-prefix">{{ getCurrencySymbol(p.currency) }}</span>
                    <input v-model="p.price" class="affix-input-field" type="text" placeholder="" />
                  </div>
                </td>
                <td>
                  <template v-if="viewMode">{{ p.discount || '-' }}</template>
                  <div v-else class="affix-input-group input-inline">
                    <input v-model="p.discount" class="affix-input-field" type="text" placeholder="" />
                    <span class="affix-input-suffix">%</span>
                  </div>
                </td>
                <td v-if="!viewMode">
                  <button
                    class="btn btn-text btn-sm btn-danger-text"
                    type="button"
                    @click="removeCurrencyPricing(idx)"
                  >
                    移除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!viewMode" class="add-currency-row">
            <button class="btn btn-secondary btn-sm" type="button" @click="addCurrencyPricing">添加币种</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">跳转 <span class="hint-optional">（非必填）</span></label>
          <label class="ui-switch ui-switch-inline">
            <input v-model="form.webJumpEnabled" type="checkbox" :disabled="viewMode" />
            <span class="ui-switch-slider" aria-hidden="true" />
          </label>
        </div>

        <div v-if="form.webJumpEnabled" class="form-group">
          <label class="form-label">跳转促销文案 <span class="hint-optional">（非必填）</span></label>
          <div class="field-i18n-row">
            <input v-model="form.promoText" class="input" type="text" placeholder="请输入促销文案（简体中文原文）" :disabled="viewMode" />
            <button
              v-if="enableI18nTranslate"
              type="button"
              class="btn btn-i18n"
              :class="{ 'btn-i18n--active': hasValidI18nKey(form.promoText_i18n_key) }"
              :title="hasValidI18nKey(form.promoText_i18n_key) ? '查看/编辑多语言' : '配置多语言'"
              @click="openPromoTextI18n"
            >🌐 <span class="btn-i18n-label">{{ hasValidI18nKey(form.promoText_i18n_key) ? '已配置' : '多语言' }}</span></button>
          </div>
        </div>

        <div class="form-footer">
          <button class="btn btn-secondary" type="button" @click="goodsEditDrawerVisible = false">{{ viewMode ? '关闭' : '取消' }}</button>
          <button v-if="!viewMode" class="btn btn-primary" type="submit" :disabled="!canSubmit">保存</button>
        </div>
      </form>
    </Drawer>

    <!-- 多语言编辑器 -->
    <I18nTextEditor
      v-if="enableI18nTranslate"
      v-model:visible="i18nEditorVisible"
      :i18n-key="i18nEditingKey"
      :category="i18nEditingCategory"
      :zh-cn-default="i18nEditingZhCn"
      :used-by="i18nEditingUsedBy"
      @saved="onI18nSaved"
    />
  </div>
</template>

<script>
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'
import I18nTextEditor from '@/components/I18nTextEditor.vue'
import { createIapGoodsRows } from '@/utils/iapGoods'
import { getEntry } from '@/utils/i18nTextStore.js'

const currencyOptions = ['USD', 'CNY', 'EUR', 'JPY', 'GBP', 'KRW']
const goodsTypeOptions = ['消耗型', '订阅型', '非消耗型', '钻石', '月卡', '礼包', '皮肤']
const GOODS_PUBLISHED_IAP_KEY = 'goods_config_published_iap_v1'
const GOODS_PUBLISHED_WEB_KEY = 'goods_config_published_web_v1'
const GOODS_DRAFT_IAP_KEY = 'goods_config_draft_iap_v1'
const GOODS_DRAFT_WEB_KEY = 'goods_config_draft_web_v1'

function readRowsFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function writeRowsToStorage(key, rows) {
  try {
    localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    // ignore
  }
}

function normalizePricings(raw) {
  if (Array.isArray(raw.currencyPricings) && raw.currencyPricings.length) {
    const rows = raw.currencyPricings.map(p => ({
      currency: String(p.currency || p.currencyCode || '').trim(),
      price: String(p.price || '').trim(),
      discount: String(p.discount || '').trim()
    }))
    // 非必填：完全空行不入库
    return rows.filter(p => p.currency || p.price || p.discount)
  }
  const currency = raw.currency ? String(raw.currency).trim() : 'USD'
  const price = raw.price != null ? String(raw.price).trim() : ''
  const discount = raw.discount != null ? String(raw.discount).trim() : ''
  if (!currency && !price && !discount) return []
  if (!price && !discount && !raw.currency) return []
  return [{ currency, price, discount }]
}

function normalizeRow(input, scenario) {
  const raw = input || {}
  const goodsId = raw.goodsId ?? raw.gameGoodsId ?? ''
  const goodsType = raw.goodsType || raw.skuType || raw.webGoodsType || ''
  const skuId = raw.skuId || raw.sku || ''
  const pricings = normalizePricings(raw)
  return {
    goodsId: String(goodsId),
    goodsName: raw.goodsName || '',
    goodsName_i18n_key: raw.goodsName_i18n_key || '',
    goodsType,
    skuId,
    currencyPricings: pricings,
    webJumpEnabled: !!(raw.webJumpEnabled || raw.webPayEnabled),
    promoText: raw.promoText || '',
    promoText_i18n_key: raw.promoText_i18n_key || '',
    scenario: raw.scenario || scenario || '',
    rowKey: `${String(goodsId)}|${skuId || '-'}|${raw.scenario || scenario || ''}`
  }
}

function toForm(row) {
  return {
    goodsId: row.goodsId || '',
    goodsName: row.goodsName || '',
    goodsName_i18n_key: row.goodsName_i18n_key || '',
    goodsType: row.goodsType || '',
    skuId: row.skuId || '',
    currencyPricings: normalizePricings(row),
    webJumpEnabled: !!row.webJumpEnabled,
    promoText: row.promoText || '',
    promoText_i18n_key: row.promoText_i18n_key || ''
  }
}

export default {
  name: 'GoodsConfig',
  components: { Icon, Modal, Drawer, I18nTextEditor },
  props: {
    scenario: { type: String, default: '' },
    isWeb: { type: Boolean, default: false },
    embedded: { type: Boolean, default: false }
  },
  data() {
    const iapSeed = createIapGoodsRows().map(r => normalizeRow(r, r.scenario))
    const webSeed = [
      { gameGoodsId: 20000030, goodsName: 'iOS Web钻石A', webGoodsType: '钻石', currencyPricings: [{ currency: 'USD', price: '0.99', discount: '95' }, { currency: 'CNY', price: '6.00', discount: '' }], webPayEnabled: true, scenario: 'ios_web' },
      { gameGoodsId: 20000031, goodsName: 'iOS Web月卡', webGoodsType: '月卡', currencyPricings: [{ currency: 'USD', price: '4.99', discount: '' }, { currency: 'EUR', price: '4.59', discount: '90' }], webPayEnabled: false, scenario: 'ios_web' },
      { gameGoodsId: 30000010, goodsName: 'Android Web钻石A', webGoodsType: '钻石', currencyPricings: [{ currency: 'CNY', price: '6.00', discount: '' }, { currency: 'USD', price: '0.99', discount: '' }], webPayEnabled: true, scenario: 'android_web' }
    ].map(r => normalizeRow(r, r.scenario))
    const publishedIap = readRowsFromStorage(GOODS_PUBLISHED_IAP_KEY, iapSeed).map(r => normalizeRow(r, r.scenario))
    const publishedWeb = readRowsFromStorage(GOODS_PUBLISHED_WEB_KEY, webSeed).map(r => normalizeRow(r, r.scenario))
    const draftIap = readRowsFromStorage(GOODS_DRAFT_IAP_KEY, publishedIap).map(r => normalizeRow(r, r.scenario))
    const draftWeb = readRowsFromStorage(GOODS_DRAFT_WEB_KEY, publishedWeb).map(r => normalizeRow(r, r.scenario))

    return {
      filters: { goodsId: '', goodsName: '', goodsType: '', skuId: '' },
      goodsTypeOptions,
      currencyOptions,
      goodsCreateModalVisible: false,
      goodsEditDrawerVisible: false,
      editingRow: null,
      viewMode: false,
      form: toForm({}),
      publishedIapGoodsRows: JSON.parse(JSON.stringify(publishedIap)),
      publishedWebGoodsRows: JSON.parse(JSON.stringify(publishedWeb)),
      draftIapGoodsRows: JSON.parse(JSON.stringify(draftIap)),
      draftWebGoodsRows: JSON.parse(JSON.stringify(draftWeb)),
      i18nEditorVisible: false,
      i18nEditingKey: '',
      i18nEditingCategory: 'goods_name',
      i18nEditingZhCn: '',
      i18nEditingUsedBy: '',
      i18nTargetField: ''
    }
  },
  computed: {
    enableI18nTranslate() {
      return this.$route.meta?.region !== 'domestic'
    },
    rowsSource() {
      return this.isWeb ? this.draftWebGoodsRows : this.draftIapGoodsRows
    },
    publishedRowsSource() {
      return this.isWeb ? this.publishedWebGoodsRows : this.publishedIapGoodsRows
    },
    rowsByScenario() {
      if (!this.scenario) return this.rowsSource
      return this.rowsSource.filter(r => r.scenario === this.scenario)
    },
    filteredRows() {
      let rows = this.rowsByScenario
      if (this.filters.goodsId) rows = rows.filter(r => String(r.goodsId).includes(this.filters.goodsId))
      if (this.filters.goodsName) {
        const kw = this.filters.goodsName.toLowerCase()
        rows = rows.filter(r => (r.goodsName || '').toLowerCase().includes(kw))
      }
      if (this.filters.goodsType) rows = rows.filter(r => r.goodsType === this.filters.goodsType)
      if (this.filters.skuId) {
        const kw = this.filters.skuId.toLowerCase()
        rows = rows.filter(r => (r.skuId || '').toLowerCase().includes(kw))
      }
      return rows
    },
    canSubmit() {
      if (!this.form.goodsId || !this.form.goodsName || !this.form.goodsType) return false
      if (!Array.isArray(this.form.currencyPricings)) return true
      const seen = new Set()
      for (const p of this.form.currencyPricings) {
        const c = String(p.currency || '').trim()
        const price = String(p.price || '').trim()
        const discount = String(p.discount || '').trim()
        // 非必填：整行都不填时直接跳过
        if (!c && !price && !discount) continue
        // 只要填写了任一项，就要求币种和价格完整
        if (!c || !price) return false
        if (Number.isNaN(Number(price)) || Number(price) <= 0) return false
        if (seen.has(c)) return false
        seen.add(c)
      }
      return true
    },
    goodsEditDrawerTitle() {
      return this.viewMode ? '查看配置' : '编辑配置'
    },
    goodsFormDrawerKey() {
      if (!this.goodsEditDrawerVisible) return 'closed'
      return this.editingRow?.rowKey || 'goods-edit'
    },
    hasUnpublishedChanges() {
      return JSON.stringify(this.rowsSource) !== JSON.stringify(this.publishedRowsSource)
    }
  },
  mounted() {
    this.cleanupInvalidI18nKeys()
  },
  watch: {
    draftIapGoodsRows: {
      deep: true,
      handler(v) {
        writeRowsToStorage(GOODS_DRAFT_IAP_KEY, v)
      }
    },
    draftWebGoodsRows: {
      deep: true,
      handler(v) {
        writeRowsToStorage(GOODS_DRAFT_WEB_KEY, v)
      }
    },
    publishedIapGoodsRows: {
      deep: true,
      handler(v) {
        writeRowsToStorage(GOODS_PUBLISHED_IAP_KEY, v)
      }
    },
    publishedWebGoodsRows: {
      deep: true,
      handler(v) {
        writeRowsToStorage(GOODS_PUBLISHED_WEB_KEY, v)
      }
    }
  },
  methods: {
    hasValidI18nKey(key) {
      const value = String(key || '').trim()
      if (!value) return false
      return !!getEntry(value)
    },
    cleanupInvalidI18nKeys() {
      const clearRowKeys = (rows) => {
        if (!Array.isArray(rows)) return
        rows.forEach((row) => {
          const goodsKey = String(row.goodsName_i18n_key || '').trim()
          const promoKey = String(row.promoText_i18n_key || '').trim()
          if (goodsKey && !getEntry(goodsKey)) row.goodsName_i18n_key = ''
          if (promoKey && !getEntry(promoKey)) row.promoText_i18n_key = ''
        })
      }
      clearRowKeys(this.draftIapGoodsRows)
      clearRowKeys(this.draftWebGoodsRows)
      clearRowKeys(this.publishedIapGoodsRows)
      clearRowKeys(this.publishedWebGoodsRows)
      const formGoodsKey = String(this.form.goodsName_i18n_key || '').trim()
      const formPromoKey = String(this.form.promoText_i18n_key || '').trim()
      if (formGoodsKey && !getEntry(formGoodsKey)) this.form.goodsName_i18n_key = ''
      if (formPromoKey && !getEntry(formPromoKey)) this.form.promoText_i18n_key = ''
    },
    getTargetRows(isPublished = false) {
      if (this.isWeb) return isPublished ? this.publishedWebGoodsRows : this.draftWebGoodsRows
      return isPublished ? this.publishedIapGoodsRows : this.draftIapGoodsRows
    },
    downloadCsvTemplate() {
      const header = ['goodsId', 'goodsName', 'goodsType', 'skuId', 'currencyPricings', 'webJumpEnabled', 'promoText']
      const demo = [
        '20000021',
        '新拓名6',
        '消耗型',
        'com.he.silver.diamond6',
        'USD:0.99:95|CNY:6.00:',
        'false',
        '限时首充返利'
      ]
      const csv = `${header.join(',')}\n${demo.join(',')}\n`
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'goods-config-template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    triggerCsvUpload() {
      if (this.$refs.csvInput) this.$refs.csvInput.value = ''
      this.$refs.csvInput?.click()
    },
    parseCurrencyPricings(raw) {
      const text = String(raw || '').trim()
      if (!text) return []
      return text.split('|').map(seg => {
        const [currency = '', price = '', discount = ''] = seg.split(':')
        return {
          currency: String(currency || '').trim(),
          price: String(price || '').trim(),
          discount: String(discount || '').trim()
        }
      }).filter(p => p.currency || p.price || p.discount)
    },
    parseCsvLine(line) {
      // 轻量 CSV 解析：支持双引号转义与逗号
      const out = []
      let curr = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            curr += '"'
            i += 1
          } else {
            inQuotes = !inQuotes
          }
          continue
        }
        if (ch === ',' && !inQuotes) {
          out.push(curr)
          curr = ''
          continue
        }
        curr += ch
      }
      out.push(curr)
      return out.map(v => String(v || '').trim())
    },
    async handleCsvUpload(event) {
      const file = event?.target?.files?.[0]
      if (!file) return
      const text = await file.text()
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length <= 1) {
        this.$message.warning('CSV 文件内容为空')
        return
      }
      const headers = this.parseCsvLine(lines[0])
      const requiredHeaders = ['goodsId', 'goodsName', 'goodsType']
      if (requiredHeaders.some(h => !headers.includes(h))) {
        this.$message.warning(`CSV 缺少必填列：${requiredHeaders.join(', ')}`)
        return
      }
      const toObj = (values) => {
        const obj = {}
        headers.forEach((h, idx) => { obj[h] = values[idx] || '' })
        return obj
      }
      const target = this.getTargetRows(false)
      let imported = 0
      for (let i = 1; i < lines.length; i += 1) {
        const row = toObj(this.parseCsvLine(lines[i]))
        if (!row.goodsId || !row.goodsName || !row.goodsType) continue
        const normalized = normalizeRow({
          goodsId: row.goodsId,
          goodsName: row.goodsName,
          goodsType: row.goodsType,
          skuId: row.skuId || '',
          currencyPricings: this.parseCurrencyPricings(row.currencyPricings),
          webJumpEnabled: String(row.webJumpEnabled || '').toLowerCase() === 'true',
          promoText: row.promoText || '',
          scenario: this.scenario
        }, this.scenario)
        const idx = target.findIndex(item => item.rowKey === normalized.rowKey)
        if (idx === -1) target.push(normalized)
        else target.splice(idx, 1, normalized)
        imported += 1
      }
      this.$message.success(`CSV 导入成功，共处理 ${imported} 条`)
    },
    async publishChanges() {
      if (!this.hasUnpublishedChanges) {
        this.$message.info('暂无可发布的变更')
        return
      }
      try {
        await this.$confirm.confirmStatusChange({
          title: '发布计费点配置',
          message: '确认发布当前所有计费点配置变更吗？发布后将统一生效。',
          confirmText: '发布',
          cancelText: '取消'
        })
      } catch {
        return
      }
      if (this.isWeb) {
        this.publishedWebGoodsRows = JSON.parse(JSON.stringify(this.draftWebGoodsRows))
      } else {
        this.publishedIapGoodsRows = JSON.parse(JSON.stringify(this.draftIapGoodsRows))
      }
      this.$message.success('发布成功')
    },
    handleSearch() {},
    handleReset() {
      this.filters = { goodsId: '', goodsName: '', goodsType: '', skuId: '' }
    },

    openGoodsNameI18n() {
      this.i18nTargetField = 'goodsName'
      this.i18nEditingCategory = 'goods_name'
      this.i18nEditingKey = this.form.goodsName_i18n_key || ''
      this.i18nEditingZhCn = this.form.goodsName || ''
      this.i18nEditingUsedBy = `商品名称 / ${this.form.goodsId || '新建'}`
      this.i18nEditorVisible = true
    },
    openPromoTextI18n() {
      this.i18nTargetField = 'promoText'
      this.i18nEditingCategory = 'promo'
      this.i18nEditingKey = this.form.promoText_i18n_key || ''
      this.i18nEditingZhCn = this.form.promoText || ''
      this.i18nEditingUsedBy = `跳转促销文案 / ${this.form.goodsId || '新建'}`
      this.i18nEditorVisible = true
    },
    onI18nSaved(entry) {
      if (this.i18nTargetField === 'goodsName') {
        this.form.goodsName_i18n_key = entry.key
      } else if (this.i18nTargetField === 'promoText') {
        this.form.promoText_i18n_key = entry.key
      }
      this.i18nTargetField = ''
    },
    addCurrencyPricing() {
      this.form.currencyPricings.push({ currency: '', price: '', discount: '' })
    },
    removeCurrencyPricing(idx) {
      this.form.currencyPricings.splice(idx, 1)
    },
    getCurrencySymbol(currencyCode) {
      const map = {
        USD: '$',
        CNY: '¥',
        EUR: '€',
        JPY: '¥',
        GBP: '£',
        KRW: '₩'
      }
      return map[String(currencyCode || '').toUpperCase()] || '$'
    },
    formatCurrencies(row) {
      return (row.currencyPricings || []).map(p => p.currency || '-').join(' / ')
    },
    formatPrices(row) {
      return (row.currencyPricings || [])
        .map(p => {
          const price = p.price || '-'
          if (price === '-') return '-'
          return `${this.getCurrencySymbol(p.currency)}${price}`
        })
        .join(' / ')
    },
    formatDiscounts(row) {
      return (row.currencyPricings || [])
        .map(p => (p.discount ? `${p.discount}%` : '-'))
        .join(' / ')
    },
    isRowPublished(row) {
      const published = this.publishedRowsSource.find(item => item.rowKey === row.rowKey)
      if (!published) return false
      return JSON.stringify(row) === JSON.stringify(published)
    },
    handleAdd() {
      this.editingRow = null
      this.viewMode = false
      this.form = toForm({ currencyPricings: [{ currency: 'USD', price: '', discount: '' }] })
      this.goodsCreateModalVisible = true
    },
    handleView(row) {
      this.editingRow = row
      this.viewMode = true
      this.form = toForm(row)
      this.goodsEditDrawerVisible = true
    },
    handleEdit(row) {
      this.editingRow = row
      this.viewMode = false
      this.form = toForm(row)
      this.goodsEditDrawerVisible = true
    },
    async handleDelete(row) {
      try {
        await this.$confirm.confirm({
          title: '删除计费点配置',
          message: `确认删除 GoodsID「${row.goodsId}」的计费点配置吗？`,
          type: 'warning',
          confirmText: '删除',
          cancelText: '取消'
        })
      } catch {
        return
      }
      const target = this.getTargetRows(false)
      const idx = target.findIndex(item => item.rowKey === row.rowKey)
      if (idx === -1) {
        this.$message.warning('未找到可删除的数据')
        return
      }
      target.splice(idx, 1)
      this.$message.success('删除成功，变更已暂存，请发布生效')
    },
    markDirty() {},
    handleSave() {
      if (!this.canSubmit) return
      const payload = normalizeRow({ ...this.form }, this.scenario)
      if (this.editingRow) {
        Object.assign(this.editingRow, payload)
        this.$message.success('配置已暂存，请发布生效')
      } else {
        const target = this.getTargetRows(false)
        target.push(payload)
        this.$message.success('配置已暂存，请发布生效')
      }
      this.goodsCreateModalVisible = false
      this.goodsEditDrawerVisible = false
      this.editingRow = null
    }
  }
}
</script>

<style scoped>
.page-container { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-xl); }
.page-title { font-size: var(--font-size-2xl); font-weight: 600; color: var(--color-text-primary); margin: 0; }
.page-content { background-color: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--spacing-lg); }
.page-filters { margin-bottom: var(--spacing-xl); }
.filter-row { display: flex; gap: var(--spacing-base); align-items: flex-end; flex-wrap: wrap; }
.filter-item { flex: 0 0 auto; min-width: 180px; }
.filter-actions { display: flex; gap: var(--spacing-sm); margin-left: auto; align-items: flex-end; }
.add-row { margin-top: var(--spacing-lg); }
.add-row-actions { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.hidden-file-input { display: none; }
.draft-banner { margin: 0 0 var(--spacing-md); padding: 8px 10px; border: 1px solid #ffe58f; background: #fffbe6; color: #8d6d1f; border-radius: 6px; font-size: 12px; }
.btn-warning { background: #faad14; border-color: #faad14; color: #fff; }
.btn-warning:disabled { opacity: 0.6; cursor: not-allowed; }
.table-actions { display: flex; gap: var(--spacing-sm); align-items: center; }
.empty-cell { text-align: center; padding: 40px 0; color: var(--color-text-tertiary, #999); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: var(--font-size-xs); font-weight: 500; }
.badge-info { background-color: rgba(22, 119, 255, 0.08); color: var(--color-primary, #1677ff); }
.publish-status-tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 500; line-height: 1.2; }
.publish-status-tag::before { content: ''; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; }
.publish-status-tag--published { color: #389e0d; background: #f6ffed; border: 1px solid #b7eb8f; }
.publish-status-tag--published::before { background: #52c41a; }
.publish-status-tag--unpublished { color: #d48806; background: #fffbe6; border: 1px solid #ffe58f; }
.publish-status-tag--unpublished::before { background: #faad14; }
.mono-text { font-family: 'Monaco', 'Menlo', monospace; font-size: var(--font-size-xs); color: var(--color-text-secondary); background-color: var(--color-bg, #f5f5f5); padding: 2px 6px; border-radius: 3px; }
.text-muted { color: var(--color-text-tertiary, #999); }
.cell-multi-line { white-space: pre-line; line-height: 1.5; }
.modal-form { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.form-group { display: flex; flex-direction: column; }
.form-section { border: 1px solid var(--color-border-secondary); border-radius: var(--radius); padding: var(--spacing-md); }
.form-section-head { margin-bottom: var(--spacing-sm); }
.table-nested { margin-top: var(--spacing-sm); }
.table-nested th, .table-nested td { padding: var(--spacing-sm) var(--spacing-md); }
.select-inline { min-width: 120px; }
.input-inline { width: 140px; }
.affix-input-group {
  display: flex;
  align-items: center;
  width: 140px;
  height: 32px;
  border: 1px solid #d9dfe9;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}
.affix-input-prefix,
.affix-input-suffix {
  width: 34px;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2f3848;
  background: #f7f9fc;
  border-right: 1px solid #e7ebf0;
  font-size: 14px;
}
.affix-input-suffix {
  border-right: none;
  border-left: 1px solid #e7ebf0;
}
.affix-input-field {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  padding: 0 10px;
  font-size: 14px;
  color: #2f3848;
  background: transparent;
}
.affix-input-group:focus-within {
  border-color: var(--color-primary, #1677ff);
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.12);
}
.add-currency-row { margin-top: var(--spacing-sm); }
.required { color: var(--color-error, #f5222d); }
.hint-optional { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
.form-footer { display: flex; justify-content: flex-end; gap: var(--spacing-md); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border); }
.btn-danger-text { color: var(--color-error, #f5222d); }

.field-i18n-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-i18n-row .input {
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
.btn-i18n-label { font-size: 12px; }
.ui-switch { position: relative; display: inline-block; width: 44px; height: 22px; vertical-align: middle; cursor: pointer; }
.ui-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.ui-switch-slider { position: absolute; inset: 0; background: #d9d9d9; border-radius: 11px; transition: background 0.2s; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset; }
.ui-switch-slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px; background: #ffffff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); }
.ui-switch input:checked + .ui-switch-slider { background: var(--color-primary, #1677ff);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04) inset; }
.ui-switch input:checked + .ui-switch-slider::before { transform: translateX(22px); }
.ui-switch-inline { margin-top: 4px; }
</style>
