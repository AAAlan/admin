<template>
  <div class="layout" :class="{ 'layout--collapsed': sidebarCollapsed, 'layout--mobile-open': mobileMenuExpanded }">
    <header class="layout-header topbar">
      <div class="topbar-left">
        <img class="brand-logo" src="/assets/leyunkong-logo.png" alt="" />
        <span class="topbar-brand">乐元素 · 乐云控</span>
        <span class="topbar-app-tag">
          <img src="/assets/silver-avatar.png" alt="" />
          <span>白银之城</span>
        </span>
      </div>
      <span class="topbar-title">收银台管理后台</span>
      <div class="topbar-right">
        <span class="topbar-product"><Icon name="globe" :size="14" /> Portal</span>
        <span class="topbar-product"><Icon name="grid" :size="14" /> WebStore</span>
        <span class="topbar-product"><Icon name="list" :size="14" /> LogCenter</span>
        <span class="topbar-user">管理员</span>
      </div>
    </header>

    <aside class="layout-sidebar">
      <router-link to="/payment/channels" class="sidebar-back-link" aria-label="返回" :title="sidebarCollapsed ? '返回' : undefined">
        <Icon name="arrowLeft" :size="16" />
        <span v-if="!sidebarCollapsed">返回</span>
      </router-link>
      <nav class="sidebar-nav" aria-label="主导航">
        <ul class="nav-list">
          <li v-for="group in navGroups" :key="group.key" class="nav-group">
            <button
              type="button"
              class="group-toggle"
              :class="{ 'group-toggle--active': isGroupActive(group) }"
              :aria-expanded="!!expandedGroups[group.key]"
              :aria-controls="`nav-${group.key}`"
              :aria-label="group.label"
              :title="sidebarCollapsed ? group.label : undefined"
              @click="toggleGroup(group.key)"
            >
              <Icon :name="group.icon" :size="15" />
              <span v-if="!sidebarCollapsed" class="group-label">{{ group.label }}</span>
              <Icon v-if="!sidebarCollapsed" name="arrowDown" :size="12" class="group-arrow" :class="{ 'group-arrow--expanded': expandedGroups[group.key] }" />
            </button>
            <ul v-if="expandedGroups[group.key] && !sidebarCollapsed" :id="`nav-${group.key}`" class="nav-submenu">
              <li v-for="item in group.items" :key="item.path">
                <router-link :to="item.path" class="nav-link" @click="mobileMenuExpanded = false">{{ item.label }}</router-link>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="sidebar-collapse" :aria-label="sidebarCollapsed ? '展开菜单' : '折叠菜单'" @click="toggleSidebar">
          <Icon name="list" :size="14" />
          <span v-if="!sidebarCollapsed">折叠菜单</span>
        </button>
        <span v-if="!sidebarCollapsed" class="sidebar-support">收银台管理</span>
      </div>
    </aside>

    <div class="layout-main">
      <main class="layout-content" role="main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import Icon from '@/components/Icon.vue'

const overseasItems = [
  { path: '/payment/channels', label: '支付渠道配置' },
  { path: '/payment/sort', label: '全局收银台模版' },
  { path: '/scenario', label: '支付场景管理' },
  { path: '/agreement/links', label: '协议设置' },
  { path: '/game-ship-config', label: '游戏发货配置' },
  { path: '/config-release', label: '配置发布' }
]
const domesticItems = [
  { path: '/domestic/payment/channels', label: '支付渠道配置' },
  { path: '/domestic/payment/sort', label: '全局收银台模版' },
  { path: '/domestic/scenario', label: '支付场景管理' },
  { path: '/domestic/game-ship-config', label: '游戏发货配置' },
  { path: '/domestic/config-release', label: '配置发布' }
]

export default {
  name: 'Layout',
  components: { Icon },
  data() {
    return {
      sidebarCollapsed: false,
      mobileMenuExpanded: false,
      expandedGroups: { domestic: false, overseas: false, tools: false },
      navGroups: [
        { key: 'domestic', label: '收银台（国内）', icon: 'server', items: domesticItems },
        { key: 'overseas', label: '收银台（海外）', icon: 'globe', items: overseasItems },
        { key: 'tools', label: '多语言配置', icon: 'settings', items: [{ path: '/i18n/config', label: '多语言配置' }] }
      ]
    }
  },
  watch: {
    '$route.path': {
      immediate: true,
      handler() {
        const activeGroup = this.navGroups.find(group => this.isGroupActive(group))
        if (activeGroup) this.expandedGroups[activeGroup.key] = true
      }
    }
  },
  methods: {
    isGroupActive(group) {
      return group.items.some(item => this.$route.path === item.path || this.$route.path.startsWith(`${item.path}/`))
    },
    toggleGroup(key) {
      if (window.matchMedia('(max-width: 640px)').matches) {
        this.mobileMenuExpanded = true
        this.sidebarCollapsed = false
        this.expandedGroups[key] = true
        return
      }
      if (this.sidebarCollapsed) {
        this.sidebarCollapsed = false
        this.expandedGroups[key] = true
      } else {
        this.expandedGroups[key] = !this.expandedGroups[key]
      }
    },
    toggleSidebar() {
      if (window.matchMedia('(max-width: 640px)').matches) {
        this.mobileMenuExpanded = !this.mobileMenuExpanded
      } else {
        this.sidebarCollapsed = !this.sidebarCollapsed
      }
    }
  }
}
</script>

<style scoped>
.layout {
  grid-template-columns: 216px minmax(0, 1fr);
  grid-template-rows: 46px minmax(0, 1fr);
  height: 100dvh;
  min-height: 0;
}
.layout--collapsed { grid-template-columns: 64px minmax(0, 1fr); }
.topbar {
  grid-column: 1 / -1;
  position: relative;
  height: 46px;
  padding: 0 16px;
  color: #fff;
  background: #ff5b60 url('/assets/topbar-background.png') repeat-x;
  border-bottom: 1px solid #ff888c;
}
.topbar-left, .topbar-right, .topbar-app-tag, .topbar-product {
  display: flex;
  align-items: center;
}
.topbar-left { gap: 12px; }
.brand-logo { width: 23px; height: 26px; object-fit: contain; }
.topbar-brand { font-size: 18px; font-weight: 600; white-space: nowrap; }
.topbar-app-tag {
  height: 35px;
  margin-left: 24px;
  padding: 0 15px;
  gap: 9px;
  border: 1px solid rgba(255,255,255,.65);
  border-radius: 4px;
  font-weight: 500;
}
.topbar-app-tag img { width: 21px; height: 21px; border-radius: 4px; }
.topbar-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}
.topbar-product { gap: 5px; padding: 0 16px; border-right: 1px solid rgba(255,255,255,.4); }
.topbar-user { padding-left: 16px; }
.layout-sidebar {
  width: auto;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow: hidden;
}
.sidebar-back-link {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 4px;
  padding: 10px 20px;
  min-height: 42px;
  color: #333;
  text-decoration: none;
}
.sidebar-nav { flex: 1; overflow-y: auto; padding: 0 4px; }
.nav-list, .nav-submenu { list-style: none; }
.group-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  padding: 10px 20px;
  border: 0;
  background: transparent;
  color: #333;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.group-label { flex: 1; white-space: nowrap; }
.group-arrow { transition: transform .2s; }
.group-arrow--expanded { transform: rotate(180deg); }
.group-toggle--active { color: #1677ff; }
.nav-link {
  display: flex;
  align-items: center;
  min-height: 40px;
  margin: 2px 0;
  padding: 8px 12px 8px 45px;
  border-radius: 6px;
  color: #333;
  text-decoration: none;
  white-space: nowrap;
}
.nav-link:hover, .group-toggle:hover, .sidebar-back-link:hover { background: #f5f5f5; }
.nav-link.router-link-active { background: #bae7ff; color: #0050b3; font-weight: 500; }
.sidebar-footer { display: flex; align-items: center; gap: 12px; border-top: 1px solid #f0f0f0; margin: 0 8px; padding: 12px 8px; white-space: nowrap; font-size: 12px; color: #666; }
.sidebar-collapse { display: flex; align-items: center; gap: 6px; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.sidebar-support { border-left: 1px solid #e8e8e8; padding-left: 12px; }
.layout-main { grid-column: 2; grid-row: 2; display: flex; min-width: 0; min-height: 0; }
.layout-content { padding: 2px 16px 30px; background: #f5f5f5; min-width: 0; }
.layout--collapsed .sidebar-back-link, .layout--collapsed .group-toggle { padding-left: 20px; }
@media (max-width: 1100px) {
  .topbar-product { display: none; }
  .topbar-title { left: auto; right: 110px; transform: none; font-size: 14px; }
  .topbar-app-tag { margin-left: 8px; }
}
@media (max-width: 640px) {
  .layout { grid-template-columns: 64px minmax(0, 1fr); }
  .topbar-brand { font-size: 15px; }
  .topbar-app-tag { margin-left: 0; padding: 0 8px; }
  .topbar-title, .topbar-right, .sidebar-back-link span, .group-label, .group-arrow, .nav-submenu, .sidebar-footer span { display: none; }
  .topbar-app-tag img { display: none; }
  .topbar-left { gap: 8px; }
  .layout--mobile-open .layout-sidebar { position: absolute; top: 46px; bottom: 0; left: 0; width: 216px; z-index: 80; box-shadow: 4px 0 16px rgba(0,0,0,.1); }
  .layout--mobile-open .group-label, .layout--mobile-open .group-arrow, .layout--mobile-open .sidebar-back-link span, .layout--mobile-open .sidebar-footer span { display: inline; }
  .layout--mobile-open .nav-submenu { display: block; }
  .layout-content { padding: 8px; }
}
</style>
