<template>
  <div>
    <!-- 基础信息 -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">基础信息</h2>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Gameid:</label>
          <div class="readonly-value">Silver</div>
        </div>

        <div class="form-group">
          <label class="form-label">加币密钥:</label>
          <textarea v-model="detail.appKey" class="textarea" rows="2" :disabled="mode === 'view'" />
        </div>

        <div class="form-group">
          <label class="form-label">web加币密钥:</label>
          <textarea v-model="detail.webApiKey" class="textarea" rows="2" :disabled="mode === 'view'" />
        </div>
      </div>
    </div>

    <!-- 加币转发（原「游戏配置」区域） -->
    <div class="card">
      <div class="card-header card-header--row">
        <h2 class="card-title">加币转发</h2>
        <button
          v-if="mode === 'edit'"
          class="btn btn-primary"
          type="button"
          @click="openAddForwardModal"
        >
          添加一行
        </button>
      </div>
      <div class="card-body card-body--flush">
        <div class="table-scroll">
          <table class="table table--coin-forward" role="table" aria-label="加币转发列表">
            <thead>
              <tr role="row">
                <th scope="col">url</th>
                <th scope="col">notifyId</th>
                <th scope="col">描述</th>
                <th scope="col">url 检查结果</th>
                <th scope="col" class="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in forwardRows" :key="row.id" role="row">
                <td class="td-url">
                  <span class="cell-text">{{ row.url || '—' }}</span>
                </td>
                <td>{{ row.notifyId || '—' }}</td>
                <td class="td-desc">
                  <span class="cell-text">{{ row.description || '—' }}</span>
                </td>
                <td>
                  <span class="url-check" :class="'url-check--' + row.urlCheckResult">
                    <span class="url-check-icon" aria-hidden="true">{{ urlCheckIcon(row.urlCheckResult) }}</span>
                    {{ urlCheckLabel(row.urlCheckResult) }}
                  </span>
                </td>
                <td class="table-cell-actions">
                  <button type="button" class="btn btn-text btn-sm" @click="checkForwardUrl(row)">
                    检查 url
                  </button>
                  <button
                    v-if="mode === 'edit'"
                    type="button"
                    class="btn btn-text btn-sm"
                    @click="openEditForwardRow(row)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="mode === 'edit'"
                    type="button"
                    class="btn btn-text btn-sm btn-text--danger"
                    @click="removeForwardRow(row)"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="form-footer">
      <button
        class="btn btn-primary"
        type="button"
        :disabled="mode === 'view' || !hasUnsavedChanges"
        @click="handleSubmit"
      >
        发布
      </button>
    </div>

    <Modal v-model:visible="addModalVisible" title="新增" size="large" @close="onAddModalClose">
      <div class="edit-form">
        <div class="form-group">
          <label class="form-label" for="cf-add-url">
            url <span class="label-required" aria-hidden="true">*</span>
          </label>
          <input id="cf-add-url" v-model="createForm.url" class="config-input config-input--block" type="text" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cf-add-notify">notifyId</label>
          <input id="cf-add-notify" v-model="createForm.notifyId" class="config-input config-input--block" type="text" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cf-add-desc">描述</label>
          <input id="cf-add-desc" v-model="createForm.description" class="config-input config-input--block" type="text" />
        </div>
        <div class="add-modal-actions">
          <button type="button" class="btn btn-primary" @click="saveNewForwardRow">保存</button>
        </div>
      </div>
    </Modal>

    <Modal v-model:visible="editModalVisible" title="编辑加币转发" size="large" @close="onEditModalClose">
      <div class="edit-form">
        <div class="form-group">
          <label class="form-label" for="cf-edit-url">url</label>
          <input id="cf-edit-url" v-model="editForm.url" class="config-input config-input--block" type="text" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cf-edit-notify">notifyId</label>
          <input id="cf-edit-notify" v-model="editForm.notifyId" class="config-input config-input--block" type="text" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cf-edit-desc">描述</label>
          <input id="cf-edit-desc" v-model="editForm.description" class="config-input config-input--block" type="text" />
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-text" @click="editModalVisible = false">取消</button>
        <button type="button" class="btn btn-primary" @click="saveEditForwardRow">确定</button>
      </template>
    </Modal>
  </div>
</template>

<script>
import Modal from '@/components/Modal.vue'

let forwardRowSeq = 1

function cloneRows(rows) {
  return rows.map((r) => {
    const { userId, ...rest } = r
    return {
      ...rest,
      description: rest.description != null && rest.description !== '' ? rest.description : (userId || '')
    }
  })
}

function seedForwardRows(isCn) {
  if (isCn) {
    return [
      { id: forwardRowSeq++, url: 'https://betacharge.silverpalace.cn/payment', notifyId: 'k8sbeta', description: '', urlCheckResult: 'unknown' },
      { id: forwardRowSeq++, url: 'https://releasecharge.silverpalace.cn/payment', notifyId: 'k8srelease', description: '', urlCheckResult: 'unknown' },
      { id: forwardRowSeq++, url: 'http://test.payment.happyelements.cn/success.html', notifyId: 'k8stest', description: '', urlCheckResult: 'unknown' },
      { id: forwardRowSeq++, url: 'http://dev2.payment.happyelements.cn/success.html', notifyId: 'sdktest', description: '', urlCheckResult: 'unknown' },
      { id: forwardRowSeq++, url: 'http://dev2.payment.happyelements.cn/success.html', notifyId: 'dktest', description: '', urlCheckResult: 'unknown' },
      { id: forwardRowSeq++, url: 'http://k8sdev.payment.happyelements.cn/callback', notifyId: 'k8sdev', description: '', urlCheckResult: 'unknown' }
    ]
  }
  return [
    { id: forwardRowSeq++, url: 'http://dev2.payment.happyelements.com/success.html', notifyId: 'sdktest', description: '', urlCheckResult: 'unknown' },
    { id: forwardRowSeq++, url: 'http://dev2.payment.happyelements.com/success.html', notifyId: 'dktest', description: '', urlCheckResult: 'unknown' },
    { id: forwardRowSeq++, url: 'http://k8sdev.payment.happyelements.com/callback', notifyId: 'k8sdev', description: '', urlCheckResult: 'unknown' },
    { id: forwardRowSeq++, url: 'https://betacharge.silverpalace.cn/payment', notifyId: 'k8sbeta', description: '', urlCheckResult: 'unknown' },
    { id: forwardRowSeq++, url: 'https://releasecharge.silverpalace.cn/payment', notifyId: 'k8srelease', description: '', urlCheckResult: 'unknown' },
    { id: forwardRowSeq++, url: 'http://test.payment.happyelements.com/success.html', notifyId: 'k8stest', description: '', urlCheckResult: 'unknown' }
  ]
}

export default {
  name: 'GameBaseConfigDetail',
  components: { Modal },
  props: {
    region: {
      type: String,
      default: 'CN'
    },
    scenario: {
      type: String,
      default: ''
    },
    mode: {
      type: String,
      default: 'view'
    },
    embedInDrawer: {
      type: Boolean,
      default: false
    }
  },
  emits: ['saved', 'cancel'],
  data() {
    return {
      detail: {},
      forwardRows: [],
      savedPayloadSignature: '',
      addModalVisible: false,
      createForm: { url: '', notifyId: '', description: '' },
      editModalVisible: false,
      editingRowId: null,
      editForm: { url: '', notifyId: '', description: '' }
    }
  },
  computed: {
    effectiveRegion() {
      if (this.scenario) {
        const scenarioToRegion = {
          app_ios_iap: 'OVERSEA',
          app_ios_web: 'OVERSEA',
          app_android_iap: 'OVERSEA',
          app_android_web: 'OVERSEA',
          psn_ps5_iap: 'OVERSEA',
          pc_windows_web: 'OVERSEA'
        }
        return scenarioToRegion[this.scenario] || this.region
      }
      return this.region
    },
    hasUnsavedChanges() {
      return this.buildPayloadSignature() !== this.savedPayloadSignature
    }
  },
  watch: {
    effectiveRegion: {
      immediate: true,
      handler(newVal) {
        this.applyRegion(newVal)
      }
    },
    scenario: {
      immediate: true,
      handler() {
        this.applyScenarioData()
      }
    }
  },
  methods: {
    urlCheckIcon(status) {
      if (status === 'ok') return '✓'
      if (status === 'fail') return '✗'
      if (status === 'checking') return '…'
      return '!'
    },
    urlCheckLabel(status) {
      if (status === 'ok') return '正常'
      if (status === 'fail') return '异常'
      if (status === 'checking') return '检查中…'
      return '未知'
    },
    applyScenarioData() {
      if (!this.scenario) return
      const appKey = 'b6bd4d4b6c3fd880768c5e622a9994'
      const webApiKey = '17vaIAw7iQdKR7uGmT94fWndwPDw7u'
      this.detail = { appKey, webApiKey }
      this.forwardRows = cloneRows(seedForwardRows(false))
      this.markAsSaved()
    },
    applyRegion(region) {
      if (this.scenario) return
      const isCn = region === 'CN'
      const appKey = 'b6bd4d4b6c3fd880768c5e622a9994'
      const webApiKey = '17vaIAw7iQdKR7uGmT94fWndwPDw7u'
      this.detail = { appKey, webApiKey }
      this.forwardRows = cloneRows(seedForwardRows(isCn))
      this.markAsSaved()
    },
    buildPayloadSignature() {
      return JSON.stringify({
        appKey: this.detail.appKey,
        webApiKey: this.detail.webApiKey,
        forwardRows: this.forwardRows.map(({ id, url, notifyId, description, urlCheckResult }) => ({
          id,
          url,
          notifyId,
          description,
          urlCheckResult
        }))
      })
    },
    markAsSaved() {
      this.savedPayloadSignature = this.buildPayloadSignature()
    },
    openAddForwardModal() {
      this.createForm = { url: '', notifyId: '', description: '' }
      this.addModalVisible = true
    },
    onAddModalClose() {
      this.createForm = { url: '', notifyId: '', description: '' }
    },
    saveNewForwardRow() {
      const url = String(this.createForm.url || '').trim()
      if (!url) {
        this.$message.warning('请填写 url')
        return
      }
      this.forwardRows.push({
        id: forwardRowSeq++,
        url,
        notifyId: String(this.createForm.notifyId || '').trim(),
        description: String(this.createForm.description || '').trim(),
        urlCheckResult: 'unknown'
      })
      this.addModalVisible = false
      this.onAddModalClose()
    },
    openEditForwardRow(row) {
      this.editingRowId = row.id
      this.editForm = {
        url: row.url || '',
        notifyId: row.notifyId || '',
        description: row.description != null ? row.description : (row.userId || '')
      }
      this.editModalVisible = true
    },
    onEditModalClose() {
      this.editingRowId = null
    },
    saveEditForwardRow() {
      const row = this.forwardRows.find((r) => r.id === this.editingRowId)
      if (!row) {
        this.editModalVisible = false
        return
      }
      row.url = String(this.editForm.url || '').trim()
      row.notifyId = String(this.editForm.notifyId || '').trim()
      row.description = String(this.editForm.description || '').trim()
      if ('userId' in row) delete row.userId
      row.urlCheckResult = 'unknown'
      this.editModalVisible = false
      this.editingRowId = null
    },
    async removeForwardRow(row) {
      try {
        await this.$confirm.confirm({
          type: 'warning',
          title: '删除加币转发',
          message: '确认删除该行配置吗？'
        })
      } catch {
        return
      }
      this.forwardRows = this.forwardRows.filter((r) => r.id !== row.id)
    },
    checkForwardUrl(row) {
      const url = String(row.url || '').trim()
      if (!url) {
        this.$message.warning('请先填写 url')
        return
      }
      row.urlCheckResult = 'checking'
      window.setTimeout(() => {
        try {
          const u = new URL(url)
          row.urlCheckResult =
            u.protocol === 'http:' || u.protocol === 'https:' ? 'ok' : 'fail'
        } catch {
          row.urlCheckResult = 'fail'
        }
      }, 600)
    },
    async handleSubmit() {
      if (this.mode === 'view' || !this.hasUnsavedChanges) return
      try {
        await this.$confirm.confirm({
          type: 'warning',
          title: '保存游戏发货配置',
          message: '确认保存当前修改吗？保存后配置才会生效。'
        })
      } catch {
        return
      }
      this.markAsSaved()
      this.$message.success('保存成功')
      if (this.embedInDrawer) {
        this.$emit('saved')
      }
    }
  }
}
</script>

<style scoped>
.drawer-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xl) 0;
}

.card {
  margin-bottom: var(--spacing-xl);
}

.card-header--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.card-body--flush {
  margin-left: calc(-1 * var(--spacing-lg));
  margin-right: calc(-1 * var(--spacing-lg));
  width: calc(100% + 2 * var(--spacing-lg));
}

.table-scroll {
  overflow-x: auto;
}

.table--coin-forward {
  margin-bottom: 0;
}

.label-required {
  color: #cf1322;
  font-weight: 600;
}

.add-modal-actions {
  margin-top: var(--spacing-xl);
  display: flex;
  justify-content: flex-start;
}

.th-actions {
  min-width: 200px;
}

.td-url {
  max-width: 360px;
}

.td-desc {
  max-width: 220px;
}

.cell-text {
  display: inline-block;
  word-break: break-all;
  font-size: var(--font-size-sm);
}

.url-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
}

.url-check-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.url-check--unknown {
  color: #ad6800;
}

.url-check--unknown .url-check-icon {
  background: #fff7e6;
  color: #d48806;
  border: 1px solid #ffd591;
}

.url-check--ok {
  color: #237804;
}

.url-check--ok .url-check-icon {
  background: #f6ffed;
  color: #389e0d;
  border: 1px solid #b7eb8f;
}

.url-check--fail {
  color: #cf1322;
}

.url-check--fail .url-check-icon {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffa39e;
}

.url-check--checking {
  color: var(--color-text-secondary);
}

.url-check--checking .url-check-icon {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.btn-text--danger {
  color: #cf1322;
}

.btn-text--danger:hover {
  color: #a8071a;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  margin-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-secondary);
}

.readonly-value {
  padding: 8px 12px;
  background-color: var(--color-bg, #f5f5f5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: default;
}

.config-input {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background-color: var(--color-white, #fff);
  outline: none;
  transition: border-color 0.2s;
}

.config-input--block {
  width: 100%;
  box-sizing: border-box;
}

.config-input:focus {
  border-color: var(--color-primary, #1677ff);
}

.edit-form {
  padding: 0 var(--spacing-sm);
}
</style>
