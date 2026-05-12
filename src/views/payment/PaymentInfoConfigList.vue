<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">收银台账单信息收集</h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" type="button" aria-label="创建配置" @click="handleCreateConfig">
          <Icon name="plus" :size="16" />
          <span>创建配置</span>
        </button>
      </div>
    </div>

    <div class="page-filters">
      <div class="filter-row">
        <div class="filter-item">
          <label for="filter-country" class="form-label">国家地区</label>
          <select
            id="filter-country"
            v-model="filters.country_code"
            class="select"
            aria-label="国家地区"
          >
            <option value="">全部国家地区</option>
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
        <div class="filter-item">
          <label for="filter-currency" class="form-label">币种</label>
          <select
            id="filter-currency"
            v-model="filters.currency"
            class="select"
            aria-label="币种"
          >
            <option value="">全部币种</option>
            <option value="USD">USD - 美元</option>
            <option value="CNY">CNY - 人民币</option>
            <option value="EUR">EUR - 欧元</option>
            <option value="GBP">GBP - 英镑</option>
            <option value="JPY">JPY - 日元</option>
            <option value="KRW">KRW - 韩元</option>
            <option value="CAD">CAD - 加元</option>
            <option value="AUD">AUD - 澳元</option>
          </select>
        </div>
        <div class="filter-item">
          <label for="filter-payment-env" class="form-label">支付环境</label>
          <select
            id="filter-payment-env"
            v-model="filters.payment_env"
            class="select"
            aria-label="支付环境"
          >
            <option value="">全部环境</option>
            <option value="pc">PC</option>
            <option value="android">Android</option>
            <option value="apple">Apple</option>
            <option value="recharge_mall">充值商城</option>
          </select>
        </div>
        <div class="filter-item-search">
          <div class="search-group">
            <button class="btn btn-secondary" @click="handleSearch" aria-label="查询">
              <Icon name="search" :size="16" />
              <span>查询</span>
            </button>
            <button class="btn btn-text" @click="handleReset" aria-label="重置">
              <Icon name="refresh" :size="16" />
              <span>重置</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div v-if="loading" class="loading-container">
        <div class="loading"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="error" class="alert alert-error" role="alert">
        <span>✗</span>
        <span>{{ error }}</span>
      </div>

      <table v-else class="table" role="table" aria-label="账单信息收集配置列表">
        <thead>
          <tr role="row">
            <th role="columnheader" scope="col">国家地区</th>
            <th role="columnheader" scope="col">币种</th>
            <th role="columnheader" scope="col">支付环境</th>
            <th role="columnheader" scope="col">是否web收银台</th>
            <th role="columnheader" scope="col">是否收集邮编</th>
            <th role="columnheader" scope="col">是否收集用户邮箱</th>
            <th role="columnheader" scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in configList" :key="`${item.app_id}_${item.country_code}_${item.currency}_${item.payment_env}`" role="row">
            <td role="cell">{{ item.country_code }}</td>
            <td role="cell">{{ item.currency }}</td>
            <td role="cell">
              <span class="badge badge-info">{{ getPaymentEnvText(item.payment_env) }}</span>
            </td>
            <td role="cell">
              <span class="badge" :class="item.is_web_cashier ? 'badge-success' : 'badge-secondary'">
                {{ item.is_web_cashier ? '是' : '否' }}
              </span>
            </td>
            <td role="cell">
              <span v-if="item.collect_postal_code" class="badge badge-success">是</span>
              <span v-else class="badge badge-secondary">否</span>
            </td>
            <td role="cell">
              <span v-if="item.collect_email" class="badge badge-success">是</span>
              <span v-else class="badge badge-secondary">否</span>
            </td>
            <td role="cell">
              <button
                class="btn btn-primary btn-sm"
                @click="handleEdit(item)"
                aria-label="配置"
              >
                <Icon name="settings" :size="14" />
                <span>配置</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && !error && configList.length === 0" class="empty-state">
        <p>暂无数据</p>
      </div>

      <!-- 分页 -->
      <div v-if="!loading && !error && total > 0" class="pagination">
        <div class="pagination-info">
          共 {{ total }} 条记录，第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="pagination-controls">
          <button
            class="btn btn-text"
            :disabled="currentPage === 1"
            @click="handlePageChange(currentPage - 1)"
            aria-label="上一页"
          >
            <Icon name="arrowLeft" :size="16" />
            <span>上一页</span>
          </button>
          <button
            class="btn btn-text"
            :disabled="currentPage === totalPages"
            @click="handlePageChange(currentPage + 1)"
            aria-label="下一页"
          >
            <span>下一页</span>
            <Icon name="arrowRight" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <Modal
      v-model:visible="createModalVisible"
      title="创建账单信息收集配置"
      size="large"
      @close="onCreateModalClose"
    >
      <PaymentInfoConfig
        v-if="createModalVisible"
        key="info-config-create"
        mode="modal"
        :prefill="createPrefill"
        @saved="handleCreateModalSaved"
      />
    </Modal>

    <Drawer
      v-model:visible="configDrawerVisible"
      title="账单信息收集配置"
      :width="800"
      :show-header="true"
      @close="onConfigDrawerClose"
    >
      <PaymentInfoConfig
        v-if="configDrawerVisible"
        :key="configDrawerEditKey"
        mode="drawer"
        :prefill="configDrawerPrefill"
        @saved="handleConfigDrawerSaved"
      />
    </Drawer>
  </div>
</template>

<script>
import { paymentAPI } from '@/api'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'
import PaymentInfoConfig from './PaymentInfoConfig.vue'

export default {
  name: 'PaymentInfoConfigList',
  components: {
    Icon,
    Modal,
    Drawer,
    PaymentInfoConfig
  },
  data() {
    return {
      configList: [],
      loading: false,
      error: null,
      filters: {
        country_code: '',
        currency: '',
        payment_env: ''
      },
      currentPage: 1,
      pageSize: 10,
      total: 0,
      createModalVisible: false,
      createPrefill: {},
      configDrawerVisible: false,
      configDrawerPayload: null
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.pageSize)
    },
    configDrawerPrefill() {
      return this.configDrawerPayload || {}
    },
    configDrawerEditKey() {
      if (!this.configDrawerVisible) return 'closed'
      const p = this.configDrawerPayload || {}
      return [
        p.app_id,
        p.country_code,
        p.currency,
        p.payment_env,
        p.is_web_cashier
      ].join('|')
    }
  },
  mounted() {
    this.fetchList()
  },
  watch: {
    configDrawerVisible(newVal) {
      if (!newVal) {
        this.fetchList()
      }
    },
    createModalVisible(newVal) {
      if (!newVal) {
        this.fetchList()
      }
    }
  },
  methods: {
    async fetchList() {
      this.loading = true
      this.error = null
      try {
        const params = {
          page: this.currentPage,
          page_size: this.pageSize,
          ...this.filters
        }
        const res = await paymentAPI.getPaymentInfoConfigList(params)
        if (res.code === 200) {
          this.configList = res.data.list
          this.total = res.data.total
        } else {
          this.error = res.message || '获取数据失败'
        }
      } catch (err) {
        this.error = err.message || '获取数据失败'
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.currentPage = 1
      this.fetchList()
    },
    handleReset() {
      this.filters = {
        country_code: '',
        currency: '',
        payment_env: ''
      }
      this.currentPage = 1
      this.fetchList()
    },
    getPaymentEnvText(env) {
      const envMap = {
        pc: 'PC',
        android: 'Android',
        apple: 'Apple',
        psn: '游戏主机',
        recharge_mall: '充值商城',
        Mobile: 'Mobile',
        PC: 'PC',
        游戏主机: '游戏主机'
      }
      return envMap[env] || env
    },
    handlePageChange(page) {
      this.currentPage = page
      this.fetchList()
    },
    handleEdit(item) {
      this.configDrawerPayload = {
        app_id: item.app_id,
        country_code: item.country_code,
        currency: item.currency,
        payment_env: item.payment_env,
        is_web_cashier: item.is_web_cashier
      }
      this.configDrawerVisible = true
    },
    handleCreateConfig() {
      this.createPrefill = {}
      this.createModalVisible = true
    },
    onCreateModalClose() {
      this.createModalVisible = false
      this.createPrefill = {}
    },
    handleCreateModalSaved() {
      this.onCreateModalClose()
    },
    onConfigDrawerClose() {
      this.configDrawerVisible = false
      this.configDrawerPayload = null
    },
    handleConfigDrawerSaved() {
      this.onConfigDrawerClose()
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.header-left {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: var(--spacing-base);
}

.page-filters {
  margin-bottom: var(--spacing-xl);
}

.filter-row {
  display: flex;
  gap: var(--spacing-base);
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-item {
  flex: 0 0 auto;
  min-width: 200px;
}

.filter-item-search {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.search-group {
  display: flex;
  gap: var(--spacing-sm);
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
}

.pagination-info {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.pagination-controls {
  display: flex;
  gap: var(--spacing-sm);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.badge-success {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.badge-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}
</style>

