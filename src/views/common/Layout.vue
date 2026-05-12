<template>
  <div class="layout">
    <header class="layout-header topbar">
      <div class="topbar-left">
        <span class="brand-dot" aria-hidden="true"></span>
        <span class="topbar-brand">乐云控</span>
        <span class="topbar-app-tag">Silver</span>
      </div>
      <div class="topbar-right">
        <span class="topbar-circle" aria-hidden="true"></span>
      </div>
    </header>
    <aside class="layout-sidebar">
      <div class="sidebar-header">
        <router-link to="/payment/channels" class="sidebar-back-link">
          <span class="back-icon" aria-hidden="true">←</span>
          <span>所有游戏</span>
        </router-link>
      </div>
      <nav class="sidebar-nav" role="navigation" aria-label="主导航">
        <ul class="nav-list">
          <!-- 海外 -->
          <li class="nav-item nav-item-group">
            <button
              type="button"
              class="group-toggle group-toggle--stacked"
              :aria-expanded="String(overseasExpanded)"
              @click="toggleOverseas"
            >
              <span class="group-head">
                <span class="group-label">支付中心（海外）</span>
                <span class="group-note">未来会放在乐云控海外的页面上。此入口仅为 Demo 用。</span>
              </span>
              <span class="group-arrow" :class="{ 'group-arrow--expanded': overseasExpanded }" aria-hidden="true">▾</span>
            </button>
          </li>
          <template v-if="overseasExpanded">
            <li class="nav-item">
              <router-link to="/payment/channels" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>支付渠道配置</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/payment/sort" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>全局收银台模版</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/game-ship-config" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>游戏发货配置</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/scenario" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>支付场景管理</span>
              </router-link>
            </li>
          </template>

          <!-- 国内 -->
          <li class="nav-item nav-item-group">
            <button
              type="button"
              class="group-toggle"
              :aria-expanded="String(domesticExpanded)"
              @click="toggleDomestic"
            >
              <span class="group-label">支付中心（国内）</span>
              <span class="group-arrow" :class="{ 'group-arrow--expanded': domesticExpanded }" aria-hidden="true">▾</span>
            </button>
          </li>
          <template v-if="domesticExpanded">
            <li class="nav-item">
              <router-link to="/domestic/payment/channels" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>支付渠道配置</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/domestic/payment/sort" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>全局收银台模版</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/domestic/game-ship-config" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>游戏发货配置</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/domestic/scenario" class="nav-link">
                <span class="nav-icon" aria-hidden="true">◉</span>
                <span>支付场景管理</span>
              </router-link>
            </li>
          </template>

          <!-- 通用工具 -->
          <li v-if="!isDomesticRoute" class="nav-item nav-item-group">
            <span class="group-label" style="padding: 0 10px;">通用工具</span>
          </li>
          <li v-if="!isDomesticRoute" class="nav-item">
            <router-link to="/i18n/config" class="nav-link">
              <span class="nav-icon" aria-hidden="true">◉</span>
              <span>多语言配置</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </aside>
    <div class="layout-main">
      <header class="layout-sub-header">
        <div class="header-left">
          <nav aria-label="面包屑导航">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <router-link to="/payment/channels">首页</router-link>
              </li>
              <li class="breadcrumb-item" v-if="$route.meta.title">
                {{ $route.meta.title }}
              </li>
            </ol>
          </nav>
        </div>
        <div class="header-right">
          <span class="user-info">管理员</span>
          <button class="btn btn-text" aria-label="退出登录">退出</button>
        </div>
      </header>
      <main class="layout-content" role="main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Layout',
  data() {
    return {
      overseasExpanded: true,
      domesticExpanded: true
    }
  },
  computed: {
    isDomesticRoute() {
      return this.$route.meta?.region === 'domestic'
    }
  },
  methods: {
    toggleOverseas() {
      this.overseasExpanded = !this.overseasExpanded
    },
    toggleDomestic() {
      this.domesticExpanded = !this.domesticExpanded
    }
  }
}
</script>

<style scoped>
.sidebar-header {
  padding: 10px 12px;
  border-bottom: 1px solid #e7ebf0;
}

.sidebar-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius);
  color: #5d6675;
  text-decoration: none;
  transition: var(--transition-fast);
}

.sidebar-back-link:hover {
  background-color: #f2f5f8;
  color: #2f3848;
}

.back-icon {
  font-size: 13px;
  line-height: 1;
}

.sidebar-nav {
  padding: 8px 8px 16px;
}

.nav-list {
  list-style: none;
}

.nav-item {
  margin-bottom: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 6px;
  color: #5d6675;
  text-decoration: none;
  transition: var(--transition-fast);
  font-size: 13px;
}

.nav-link:hover {
  background-color: #eaf4ff;
  color: #2b8be8;
}

.nav-link.router-link-active {
  background-color: #eaf4ff;
  color: #2b8be8;
  font-weight: 600;
}

.nav-submenu {
  list-style: none;
  padding-left: 14px;
  margin-top: 2px;
}

.nav-submenu .nav-link {
  padding: 6px 10px;
  font-size: 13px;
}

.nav-item-group {
  margin: 10px 0 8px;
}

.group-toggle {
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.group-toggle--stacked {
  align-items: flex-start;
}

.group-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  text-align: left;
}

.group-label {
  display: inline-block;
  color: #8f97a5;
  font-size: 12px;
  line-height: 20px;
}

.group-note {
  display: block;
  color: #b0b6c0;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 400;
}

.group-toggle--stacked .group-arrow {
  margin-top: 2px;
  flex-shrink: 0;
}

.group-arrow {
  color: #a3acb8;
  font-size: 12px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.group-arrow--expanded {
  transform: rotate(180deg);
}

.nav-icon {
  color: #b1b8c4;
  font-size: 10px;
}

.nav-link-title {
  cursor: default;
}

.nav-link-title:hover {
  background: transparent;
  color: #5d6675;
}

.layout-main {
  grid-column: 2;
  grid-row: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.layout-sub-header {
  height: 40px;
  background-color: #ffffff;
  border-bottom: 1px solid #edf1f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.breadcrumb {
  display: flex;
  list-style: none;
  gap: 6px;
}

.breadcrumb-item {
  color: #98a1af;
  font-size: 12px;
}

.breadcrumb-item:not(:last-child)::after {
  content: '/';
  margin-left: 6px;
  color: #c8ced9;
}

.breadcrumb-item a {
  color: #98a1af;
  text-decoration: none;
}

.breadcrumb-item a:hover {
  color: #2b8be8;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  color: #7b8594;
  font-size: 12px;
}

.topbar {
  grid-column: 1 / -1;
  height: 46px;
  background: #27384a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-brand {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.topbar-app-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 4px;
  background: #d9a56a;
  color: #fff;
  font-size: 12px;
  line-height: 1;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5bc0ff, #3dbf6d);
}

.topbar-right {
  display: flex;
  align-items: center;
}

.topbar-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(12, 23, 34, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>


