// API服务 - 使用Mock数据
import { mockAPI } from './mock'

// 应用相关API（支付配置需要）
export const appAPI = {
  // 获取应用列表
  getApps(params) {
    return mockAPI.getApps(params)
  },

  // 获取应用详情
  getAppDetail(appId) {
    return mockAPI.getAppDetail(appId)
  },

  // 创建应用
  createApp(data) {
    return mockAPI.createApp(data)
  },

  // 更新应用（包括开通/关闭）
  updateApp(appId, data) {
    return mockAPI.updateApp(appId, data)
  }
}

// 支付相关API
export const paymentAPI = {
  // 获取支付渠道列表
  getPaymentChannels(params) {
    return mockAPI.getPaymentChannels(params)
  },

  // 获取支付渠道详情
  getPaymentChannelDetail(channelId, params = {}) {
    return mockAPI.getPaymentChannels(params).then(res => {
      const channel = res.data.list.find(item => item.channel_id === channelId)
      return {
        code: 200,
        message: 'success',
        data: channel || null
      }
    })
  },

  // 创建支付渠道
  createPaymentChannel(data) {
    // 生成 channel_id：基于 channel_name 和 merchant_account
    const generateChannelId = (channelName, merchantAccount) => {
      const safeChannelName = channelName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const safeMerchantAccount = merchantAccount.replace(/[^a-zA-Z0-9]/g, '_')
      return `${safeChannelName}_${safeMerchantAccount}`
    }
    
    return Promise.resolve({
      code: 200,
      message: 'success',
      data: { 
        ...data, 
        channel_id: generateChannelId(data.channel_name, data.merchant_account),
        create_time: new Date().toLocaleString() 
      }
    })
  },

  // 更新支付渠道
  updatePaymentChannel(channelId, data, params = {}) {
    return mockAPI.updatePaymentChannel(channelId, data, params)
  },

  // 获取支付方式排序列表
  getPaymentSortList(params) {
    return mockAPI.getPaymentSortList(params)
  },

  setCashierTemplateOffline(data) {
    return mockAPI.setCashierTemplateOffline(data)
  },

  setCashierTemplateOnline(data) {
    return mockAPI.setCashierTemplateOnline(data)
  },

  saveCashierTemplateDisplayName(data) {
    return mockAPI.saveCashierTemplateDisplayName(data)
  },

  setCashierTemplateDefault(data) {
    return mockAPI.setCashierTemplateDefault(data)
  },

  deleteCashierTemplate(data) {
    return mockAPI.deleteCashierTemplate(data)
  },

  resolveCashierTemplate(params) {
    return mockAPI.resolveCashierTemplate(params)
  },

  getScenarios(region) {
    return mockAPI.getScenarios(region)
  },

  createScenario(data, region) {
    return mockAPI.createScenario(data, region)
  },

  updateScenario(id, data, region) {
    return mockAPI.updateScenario(id, data, region)
  },

  deleteScenario(id, region) {
    return mockAPI.deleteScenario(id, region)
  },

  // 获取支付方式列表
  getPaymentMethods(params) {
    return mockAPI.getPaymentMethods(params)
  },

  // 获取支付方式详情
  getPaymentMethodDetail(id, params = {}) {
    return mockAPI.getPaymentMethods(params).then(res => {
      const method = res.data.list.find(item => item.id === parseInt(id))
      return {
        code: 200,
        message: 'success',
        data: method || null
      }
    })
  },

  // 创建支付方式
  createPaymentMethod(data) {
    return mockAPI.createPaymentMethod(data)
  },

  // 更新支付方式
  updatePaymentMethod(id, data, params = {}) {
    return mockAPI.updatePaymentMethod(id, data, params)
  },

  // 删除支付方式
  deletePaymentMethod(id) {
    return mockAPI.deletePaymentMethod(id)
  },

  // 获取账单信息收集配置列表
  getPaymentInfoConfigList(params) {
    return mockAPI.getPaymentInfoConfigList(params)
  },

  // 获取账单信息收集配置
  getPaymentInfoConfig(params) {
    return mockAPI.getPaymentInfoConfig(params)
  },

  // 更新账单信息收集配置
  updatePaymentInfoConfig(data) {
    return mockAPI.updatePaymentInfoConfig(data)
  },

  // 获取渠道模板列表
  getChannelTemplates(params = {}) {
    return mockAPI.getChannelTemplates(params)
  },

  // 根据渠道名称获取渠道参数模板
  getChannelTemplate(channelName) {
    return mockAPI.getChannelTemplate(channelName)
  }
}

// 配置相关API
export const configAPI = {
  // 获取币种列表
  getCurrencies() {
    return mockAPI.getCurrencies()
  }
}
