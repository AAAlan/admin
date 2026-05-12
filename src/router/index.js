import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/views/common/Layout.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/scenario',
    children: [
      // ========== 支付中心（海外）==========
      {
        path: '/payment/channels',
        name: 'PaymentChannels',
        component: () => import('@/views/payment/PaymentChannels.vue'),
        meta: { title: '支付渠道管理', region: 'overseas' }
      },
      {
        path: '/payment/channels/create',
        redirect: '/payment/channels'
      },
      {
        path: '/payment/channels/edit/:id',
        redirect: '/payment/channels'
      },
      {
        path: '/payment/methods',
        redirect: '/payment/channels'
      },
      {
        path: '/payment/methods/create',
        redirect: '/payment/channels'
      },
      {
        path: '/payment/methods/edit/:id',
        redirect: '/payment/channels'
      },
      {
        path: '/payment/sort',
        name: 'PaymentSortList',
        component: () => import('@/views/payment/PaymentSortList.vue'),
        meta: { title: '全局收银台模版', region: 'overseas' }
      },
      {
        path: '/payment/sort/config',
        redirect: '/payment/sort'
      },
      {
        path: '/payment/info-config',
        name: 'PaymentInfoConfigList',
        component: () => import('@/views/payment/PaymentInfoConfigList.vue'),
        meta: { title: '收银台账单信息收集', region: 'overseas' }
      },
      {
        path: '/payment/info-config/config',
        redirect: to => ({
          path: '/payment/info-config',
          query: to.query
        })
      },
      {
        path: '/apps',
        name: 'GameAppList',
        component: () => import('@/views/app/GameAppList.vue'),
        meta: { title: '游戏应用管理', region: 'overseas' }
      },
      {
        path: '/apps/create',
        redirect: '/apps'
      },
      {
        path: '/apps/edit/:id',
        redirect: '/apps'
      },
      {
        path: '/scenario',
        name: 'ScenarioList',
        component: () => import('@/views/scenario/ScenarioList.vue'),
        meta: { title: '支付场景管理', region: 'overseas' }
      },
      {
        path: '/scenario/:id(\\d+)',
        name: 'ScenarioConfig',
        component: () => import('@/views/scenario/ScenarioConfig.vue'),
        meta: { title: '场景配置', region: 'overseas' }
      },
      {
        path: '/game-ship-config',
        name: 'GameShipConfig',
        component: () => import('@/views/game/GameShipConfig.vue'),
        meta: { title: '游戏发货配置', region: 'overseas' }
      },
      { path: '/game-base-config', redirect: '/game-ship-config' },
      { path: '/goods/config', redirect: '/scenario' },
      {
        path: '/i18n/config',
        name: 'I18nConfig',
        component: () => import('@/views/i18n/I18nConfig.vue'),
        meta: { title: '多语言配置' }
      },

      // ========== 支付中心（国内）==========
      {
        path: '/domestic/payment/channels',
        name: 'DomesticPaymentChannels',
        component: () => import('@/views/payment/PaymentChannels.vue'),
        meta: { title: '支付渠道管理', region: 'domestic' }
      },
      {
        path: '/domestic/payment/channels/create',
        redirect: '/domestic/payment/channels'
      },
      {
        path: '/domestic/payment/channels/edit/:id',
        redirect: '/domestic/payment/channels'
      },
      {
        path: '/domestic/payment/methods',
        redirect: '/domestic/payment/channels'
      },
      {
        path: '/domestic/payment/methods/create',
        redirect: '/domestic/payment/channels'
      },
      {
        path: '/domestic/payment/methods/edit/:id',
        redirect: '/domestic/payment/channels'
      },
      {
        path: '/domestic/payment/sort',
        name: 'DomesticPaymentSortList',
        component: () => import('@/views/payment/PaymentSortList.vue'),
        meta: { title: '全局收银台模版', region: 'domestic' }
      },
      {
        path: '/domestic/payment/sort/config',
        redirect: '/domestic/payment/sort'
      },
      {
        path: '/domestic/scenario',
        name: 'DomesticScenarioList',
        component: () => import('@/views/scenario/ScenarioList.vue'),
        meta: { title: '支付场景管理', region: 'domestic' }
      },
      {
        path: '/domestic/scenario/:id(\\d+)',
        name: 'DomesticScenarioConfig',
        component: () => import('@/views/scenario/ScenarioConfig.vue'),
        meta: { title: '场景配置', region: 'domestic' }
      },
      {
        path: '/domestic/game-ship-config',
        name: 'DomesticGameShipConfig',
        component: () => import('@/views/game/GameShipConfig.vue'),
        meta: { title: '游戏发货配置', region: 'domestic' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
