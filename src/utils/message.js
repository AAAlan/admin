// 消息提示工具函数（默认展示 3 秒后自动关闭）
import { createApp } from 'vue'
import Message from '@/components/Message.vue'

const DEFAULT_DURATION_MS = 3000

/** createApp() 返回的应用实例，须对其调用 unmount() */
let messageRootApp = null
/** 传给 app.mount() 的宿主节点，始终在 document.body 下 */
let messageHostEl = null

function destroyMessage() {
  try {
    if (messageRootApp) {
      messageRootApp.unmount()
    }
  } catch {
    // ignore
  }
  messageRootApp = null

  const el = messageHostEl
  messageHostEl = null
  if (!el) return
  try {
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    } else {
      el.remove()
    }
  } catch {
    try {
      el.remove()
    } catch {
      // ignore
    }
  }
}

function showMessage(content, type = 'info', duration = DEFAULT_DURATION_MS) {
  if (messageRootApp || messageHostEl) {
    destroyMessage()
  }

  const host = document.createElement('div')
  messageHostEl = host
  document.body.appendChild(host)

  const app = createApp(Message, {
    visible: true,
    content,
    type,
    duration: duration ?? DEFAULT_DURATION_MS,
    onClose: () => {
      setTimeout(() => {
        destroyMessage()
      }, 300)
    }
  })

  messageRootApp = app
  app.mount(host)
}

export default {
  success(content, duration) {
    showMessage(content, 'success', duration)
  },
  error(content, duration) {
    showMessage(content, 'error', duration)
  },
  warning(content, duration) {
    showMessage(content, 'warning', duration)
  },
  info(content, duration) {
    showMessage(content, 'info', duration)
  }
}
