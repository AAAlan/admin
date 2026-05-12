/**
 * 支付中心（国内）——独立构建产物，路由不再带 /domestic 前缀（部署在各自域名根路径）
 */
export const domesticChildRoutes = [
  {
    path: '/payment/channels',
    name: 'DomesticPaymentChannels',
    component: () => import('@/views/payment/PaymentChannels.vue'),
    meta: { title: '支付渠道管理', region: 'domestic' }
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
    name: 'DomesticPaymentMethods',
    component: () => import('@/views/payment/PaymentMethods.vue'),
    meta: { title: '支付方式管理', region: 'domestic' }
  },
  {
    path: '/payment/methods/create',
    redirect: '/payment/methods'
  },
  {
    path: '/payment/methods/edit/:id',
    redirect: '/payment/methods'
  },
  {
    path: '/payment/sort',
    name: 'DomesticPaymentSortList',
    component: () => import('@/views/payment/PaymentSortList.vue'),
    meta: { title: '全局收银台模版', region: 'domestic' }
  },
  {
    path: '/payment/sort/config',
    redirect: '/payment/sort'
  },
  {
    path: '/scenario',
    name: 'DomesticScenarioList',
    component: () => import('@/views/scenario/ScenarioList.vue'),
    meta: { title: '支付场景管理', region: 'domestic' }
  },
  {
    path: '/scenario/:id(\\d+)',
    name: 'DomesticScenarioConfig',
    component: () => import('@/views/scenario/ScenarioConfig.vue'),
    meta: { title: '场景配置', region: 'domestic' }
  }
]
