import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { RolloutStore } from './store.mjs'
import { createRolloutServer } from './http.mjs'
import { seedDemo } from './demo-seed.mjs'

export async function startApi({
  demo = process.argv.includes('--demo'),
  port = Number(process.env.ROLLOUT_PORT || 3002),
  host = process.env.ROLLOUT_HOST || '127.0.0.1',
  filename = process.env.ROLLOUT_DB || resolve('.data/rollouts.sqlite'),
  capabilityReader,
  contextReader,
  subchannelReader,
  featureCapabilityReader,
} = {}) {
  if (demo && host !== '127.0.0.1')
    throw new Error('本地身份模拟只允许绑定 127.0.0.1')
  // A deployment-owned local module, never a path or executable supplied by HTTP clients.
  if (!demo && process.env.ROLLOUT_ADAPTER_MODULE) {
    const adapters = await import(
      pathToFileURL(resolve(process.env.ROLLOUT_ADAPTER_MODULE)).href
    )
    if (
      typeof adapters.capabilityReader !== 'function' ||
      typeof adapters.contextReader !== 'function'
    )
      throw new Error('适配器模块须导出 capabilityReader 与 contextReader 函数')
    capabilityReader = adapters.capabilityReader
    contextReader = adapters.contextReader
    subchannelReader = adapters.subchannelReader
    featureCapabilityReader = adapters.featureCapabilityReader
    if (
      (subchannelReader !== undefined &&
        typeof subchannelReader !== 'function') ||
      (featureCapabilityReader !== undefined &&
        typeof featureCapabilityReader !== 'function')
    )
      throw new Error('子渠道与功能资格适配器必须为函数')
  }
  const store = new RolloutStore(filename)
  if (demo) seedDemo(store)
  let server
  try {
    ;({ server } = createRolloutServer({
      store,
      demo,
      capabilityReader,
      contextReader,
      subchannelReader,
      featureCapabilityReader,
      principals: JSON.parse(process.env.ROLLOUT_PRINCIPALS || '[]'),
      origins: (process.env.ROLLOUT_ORIGINS || 'http://127.0.0.1:3001').split(
        ',',
      ),
      allowedHosts: (
        process.env.ROLLOUT_ALLOWED_HOSTS || '127.0.0.1,localhost,[::1]'
      ).split(','),
    }))
  } catch (error) {
    store.close()
    throw error
  }
  return new Promise((resolveStart, reject) => {
    server.once('error', (error) => {
      store.close()
      reject(error)
    })
    server.listen(port, host, () => {
      console.log(
        `Rollout API: http://${host}:${server.address().port}/api/rollout (${demo ? 'LOCAL DEMO; simulated identity/capabilities; no real payment' : `authenticated; context adapter ${contextReader ? 'configured' : 'not configured; runtime fails closed'}`})`,
      )
      resolveStart({ server, store })
    })
  })
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { server, store } = await startApi()
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () =>
      server.close(() => {
        store.close()
        process.exit(0)
      }),
    )
}
