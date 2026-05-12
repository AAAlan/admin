/** 延迟整页刷新，便于先看到成功提示 */
export function reloadPageSoon(delayMs = 450) {
  window.setTimeout(() => {
    window.location.reload()
  }, delayMs)
}
