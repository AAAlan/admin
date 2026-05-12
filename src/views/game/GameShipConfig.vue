<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">游戏发货配置</h1>
        <p class="page-desc">维护加币密钥与加币转发规则（按当前区域：{{ regionLabel }}）</p>
      </div>
    </div>
    <GameBaseConfigDetail
      v-if="detailRegion"
      :key="detailRegion"
      :region="detailRegion"
      mode="edit"
    />
  </div>
</template>

<script>
import GameBaseConfigDetail from './GameBaseConfigDetail.vue'

export default {
  name: 'GameShipConfig',
  components: { GameBaseConfigDetail },
  computed: {
    region() {
      return this.$route.meta?.region || 'overseas'
    },
    detailRegion() {
      return this.region === 'domestic' ? 'CN' : 'OVERSEA'
    },
    regionLabel() {
      return this.region === 'domestic' ? '国内' : '海外'
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: var(--spacing-lg);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.page-desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  line-height: 1.5;
}
</style>
