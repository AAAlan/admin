<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">游戏基础配置</h1>
      <div class="header-actions">
        <button class="btn btn-primary" type="button" @click="handleCreate">
          创建游戏基础配置
        </button>
      </div>
    </div>

    <div class="page-content">
      <table class="table" role="table" aria-label="游戏基础配置列表">
        <thead>
          <tr role="row">
            <th role="columnheader" scope="col">游戏名称</th>
            <th role="columnheader" scope="col">区域</th>
            <th role="columnheader" scope="col">说明</th>
            <th role="columnheader" scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cfg in configs" :key="cfg.type" role="row">
            <td role="cell">
              <span class="badge badge-info">{{ cfg.gameName }}</span>
            </td>
            <td role="cell">
              <span class="badge badge-info">{{ cfg.type }}</span>
            </td>
            <td role="cell">{{ cfg.desc }}</td>
            <td role="cell" class="actions-cell">
              <button class="btn btn-text btn-sm" type="button" @click="openDetail(cfg.type, 'view')">
                查看
              </button>
              <button class="btn btn-primary btn-sm" type="button" @click="openDetail(cfg.type, 'edit')">
                编辑
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal
      v-model:visible="createModalVisible"
      title="创建游戏基础配置"
      size="xlarge"
      @close="onCreateModalClose"
    >
      <GameBaseConfigDetail
        v-if="createModalVisible"
        :key="`create-${createModalRegion}`"
        :region="createModalRegion"
        mode="edit"
        embed-in-drawer
        @saved="onCreateModalClose"
        @cancel="onCreateModalClose"
      />
    </Modal>

    <Drawer v-model:visible="drawerVisible" :title="drawerTitle" :width="980">
      <GameBaseConfigDetail
        v-if="drawerVisible"
        :key="`${drawerRegion}-${drawerMode}`"
        :region="drawerRegion"
        :mode="drawerMode"
        embed-in-drawer
        @saved="drawerVisible = false"
        @cancel="drawerVisible = false"
      />
    </Drawer>
  </div>
</template>

<script>
import Modal from '@/components/Modal.vue'
import Drawer from '@/components/Drawer.vue'
import GameBaseConfigDetail from './GameBaseConfigDetail.vue'

export default {
  name: 'GameBaseConfigList',
  components: {
    Modal,
    Drawer,
    GameBaseConfigDetail
  },
  data() {
    return {
      configs: [
        { type: 'CN', gameName: 'Silver', desc: '中国区基础配置' },
        { type: 'OVERSEA', gameName: 'Silver', desc: '海外区基础配置' }
      ],
      createModalVisible: false,
      createModalRegion: 'CN',
      drawerVisible: false,
      drawerRegion: 'CN',
      drawerMode: 'view'
    }
  },
  computed: {
    drawerTitle() {
      // 与截图保持一致：展示游戏名 + 详情
      return 'Silver - 详情信息'
    }
  },
  methods: {
    openDetail(type, mode) {
      this.drawerRegion = type
      this.drawerMode = mode
      this.drawerVisible = true
    },
    handleCreate() {
      this.createModalRegion = 'CN'
      this.createModalVisible = true
    },
    onCreateModalClose() {
      this.createModalVisible = false
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-content {
  padding: var(--spacing-xl);
}

.btn-sm {
  padding: 6px 10px;
  font-size: var(--font-size-sm);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.header-actions {
  display: flex;
  align-items: center;
}

.actions-cell {
  display: flex;
  gap: var(--spacing-sm);
}
</style>

