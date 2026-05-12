import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/index.css'
import './styles/components.css'

// 全局工具函数
import message from './utils/message'
import confirm from './utils/confirm'
import { reloadPageSoon } from './utils/reloadPage'

const app = createApp(App)

// 挂载到全局属性
app.config.globalProperties.$message = message
app.config.globalProperties.$confirm = confirm
app.config.globalProperties.$reloadPageSoon = reloadPageSoon

app.use(router)
app.mount('#app')


