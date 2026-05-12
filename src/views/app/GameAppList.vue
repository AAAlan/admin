<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">游戏应用管理</h1>
      <button class="btn btn-primary" @click="handleCreate" aria-label="创建游戏应用">
        <Icon name="plus" :size="16" />
        <span>创建游戏应用</span>
      </button>
    </div>

    <div class="page-filters">
      <div class="filter-row">
        <div class="filter-item">
          <label for="filter-sdk-app-id" class="form-label">Game id</label>
          <input
            id="filter-sdk-app-id"
            type="text"
            class="input"
            placeholder="例如：Silver"
            v-model="filters.sdk_app_id"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="filter-item">
          <label for="filter-game-name" class="form-label">游戏名</label>
          <input
            id="filter-game-name"
            type="text"
            class="input"
            placeholder="支持模糊搜索"
            v-model="filters.game_name"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="filter-item">
          <label for="filter-status" class="form-label">开通状态</label>
          <select
            id="filter-status"
            v-model="filters.pay_switch"
            class="select"
            @change="handleSearch"
          >
            <option value="">全部</option>
            <option value="true">已开通</option>
            <option value="false">已关闭</option>
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

      <table v-else class="table" role="table" aria-label="游戏应用列表">
        <thead>
          <tr role="row">
            <th role="columnheader" scope="col">Game id</th>
            <th role="columnheader" scope="col">游戏名</th>
            <th role="columnheader" scope="col">开通状态</th>
            <th role="columnheader" scope="col">创建时间</th>
            <th role="columnheader" scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in appList" :key="app.app_id" role="row">
            <td role="cell">
              <code class="mono-text">{{ app.sdk_app_id }}</code>
            </td>
            <td role="cell">{{ app.game_name || '-' }}</td>
            <td role="cell">
              <span
                class="badge"
                :class="app.pay_switch ? 'badge-success' : 'badge-secondary'"
              >
                {{ app.pay_switch ? '已开通' : '已关闭' }}
              </span>
            </td>
            <td role="cell">{{ app.create_time }}</td>
            <td role="cell">
              <div class="table-actions">
                <button
                  class="btn btn-text btn-sm"
                  @click="handleEdit(app)"
                  aria-label="编辑游戏应用"
                >
                  <Icon name="edit" :size="14" />
                  <span>编辑</span>
                </button>
                <button
                  class="btn btn-text btn-sm"
                  @click="handleToggle(app)"
                  aria-label="切换开通状态"
                >
                  <Icon :name="app.pay_switch ? 'close' : 'check'" :size="14" />
                  <span>{{ app.pay_switch ? '关闭' : '开通' }}</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && !error && appList.length === 0" class="empty-state">
        <p>暂无数据</p>
      </div>
    </div>

    <Modal
      v-model:visible="createModalVisible"
      title="创建游戏应用"
      size="large"
      @close="onCreateModalClose"
    >
      <GameAppEdit
        v-if="createModalVisible"
        key="app-create"
        mode="modal"
        :prefill="createPrefill"
        @cancel="onCreateModalClose"
        @saved="handleCreateSaved"
      />
    </Modal>

    <Drawer
      v-model:visible="drawerVisible"
      :title="drawerTitle"
      :width="760"
      :show-header="true"
      @close="onDrawerClose"
    >
      <GameAppEdit
        v-if="drawerVisible"
        :key="drawerEditKey"
        mode="drawer"
        :prefill="drawerPrefill"
        @cancel="onDrawerClose"
        @saved="handleDrawerSaved"
      />
    </Drawer>
  </div>
</template>

<script>
import { appAPI } from '@/api'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'
import GameAppEdit from './GameAppEdit.vue'

export default {
  name: 'GameAppList',
  components: {
    Icon,
    Modal,
    Drawer,
    GameAppEdit
  },
  data() {
    return {
      appList: [],
      loading: false,
      error: null,
      filters: {
        sdk_app_id: '',
        game_name: '',
        pay_switch: ''
      },
      createModalVisible: false,
      createPrefill: {},
      drawerVisible: false,
      drawerPayload: null
    }
  },
  computed: {
    drawerPrefill() {
      return this.drawerPayload || {}
    },
    drawerTitle() {
      const label =
        (this.drawerPayload && (this.drawerPayload.app_name || this.drawerPayload.id)) || ''
      return label ? `编辑游戏应用：${label}` : '编辑游戏应用'
    },
    drawerEditKey() {
      if (!this.drawerVisible) return 'closed'
      const id = this.drawerPayload && this.drawerPayload.id
      return id != null && id !== '' ? `app-${id}` : 'app-edit'
    }
  },
  mounted() {
    this.fetchApps()
  },
  methods: {
    async fetchApps() {
      this.loading = true
      this.error = null
      try {
        const params = {}
        // Game id（sdk_app_id）统一为 Silver；列表行以 app_id 区分
        if (this.filters.sdk_app_id) {
          params.sdk_app_id = this.filters.sdk_app_id
        }
        if (this.filters.game_name) {
          params.game_name = this.filters.game_name
        }
        const res = await appAPI.getApps(params)
        if (res.code === 200) {
          let list = res.data.list || []
          if (this.filters.sdk_app_id) {
            const keyword = this.filters.sdk_app_id.toLowerCase()
            list = list.filter(item =>
              (item.sdk_app_id || '').toLowerCase().includes(keyword)
            )
          }
          if (this.filters.pay_switch !== '') {
            const expected = this.filters.pay_switch === 'true'
            list = list.filter(item => item.pay_switch === expected)
          }
          this.appList = list
        } else {
          this.error = res.message || '获取游戏应用列表失败'
        }
      } catch (err) {
        this.error = '网络错误，请稍后重试'
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.fetchApps()
    },
    handleReset() {
      this.filters = {
        sdk_app_id: '',
        game_name: '',
        pay_switch: ''
      }
      this.fetchApps()
    },
    handleCreate() {
      this.createPrefill = {}
      this.createModalVisible = true
    },
    onCreateModalClose() {
      this.createModalVisible = false
      this.createPrefill = {}
    },
    handleCreateSaved() {
      this.onCreateModalClose()
      this.fetchApps()
    },
    onDrawerClose() {
      this.drawerVisible = false
      this.drawerPayload = null
    },
    handleEdit(app) {
      this.drawerPayload = {
        id: app.app_id,
        app_name: app.app_name,
        game_name: app.game_name
      }
      this.drawerVisible = true
    },
    handleDrawerSaved() {
      this.onDrawerClose()
      this.fetchApps()
    },
    async handleToggle(app) {
      const targetStatus = !app.pay_switch
      try {
        await this.$confirm.confirmStatusChange()
      } catch {
        return
      }
      try {
        await appAPI.updateApp(app.app_id, { pay_switch: targetStatus })
        this.$message.success(targetStatus ? '开通成功' : '关闭成功')
        app.pay_switch = targetStatus
        await this.fetchApps()
      } catch (err) {
        console.error(err)
        this.$message.error('操作失败，请稍后重试')
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-black);
  margin: 0;
}

.page-filters {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius);
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

.page-content {
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--spacing-lg);
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-4xl);
  color: var(--color-gray);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-4xl);
  color: var(--color-gray);
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

.mono-text {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: var(--font-size-xs);
}
</style>

