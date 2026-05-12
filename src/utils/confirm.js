// 确认对话框工具函数
import { createApp } from 'vue'
import Confirm from '@/components/Confirm.vue'

function showConfirm(options) {
  return new Promise((resolve, reject) => {
    const {
      title = '确认',
      message = '',
      type = 'info',
      confirmText = '确定',
      cancelText = '取消',
      showCancel = true
    } = options

    const div = document.createElement('div')
    document.body.appendChild(div)

    const app = createApp(Confirm, {
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancel,
      onConfirm: () => {
        resolve(true)
        cleanup()
      },
      onCancel: () => {
        reject(false)
        cleanup()
      },
      onClose: () => {
        reject(false)
        cleanup()
      }
    })

    app.mount(div)
    let cleaned = false

    function cleanup() {
      if (cleaned) return
      cleaned = true
      setTimeout(() => {
        try {
          app.unmount()
        } catch {
          // ignore
        }
        try {
          if (div.parentNode) {
            div.parentNode.removeChild(div)
          } else {
            div.remove()
          }
        } catch {
          try {
            div.remove()
          } catch {
            // ignore
          }
        }
      }, 300)
    }
  })
}

const DEFAULT_STATUS_MESSAGE =
  '状态修改可能影响线上的真实交易，请谨慎确认后再继续。'

/**
 * 一次确认弹窗，用于所有会影响线上交易的状态变更（保存/确认时调用）。
 */
export async function confirmStatusChange(options = {}) {
  const base =
    typeof options === 'string'
      ? { message: options }
      : options
  const {
    title = '状态变更确认',
    message = DEFAULT_STATUS_MESSAGE,
    confirmText = '确认',
    cancelText = '取消'
  } = base

  await showConfirm({
    type: 'warning',
    title,
    message,
    confirmText,
    cancelText
  })
  return true
}

export default {
  confirmStatusChange,
  confirm(options) {
    if (typeof options === 'string') {
      return showConfirm({ message: options })
    }
    return showConfirm(options)
  },
  success(options) {
    return showConfirm({
      ...(typeof options === 'string' ? { message: options } : options),
      type: 'success'
    })
  },
  error(options) {
    return showConfirm({
      ...(typeof options === 'string' ? { message: options } : options),
      type: 'error'
    })
  },
  warning(options) {
    return showConfirm({
      ...(typeof options === 'string' ? { message: options } : options),
      type: 'warning'
    })
  }
}
