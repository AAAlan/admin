import { startApi } from '../server/index.mjs'

// Explicit opt-in; plain `npm run dev` still uses the existing isolated Mock.
process.env.VITE_ROLLOUT_BACKEND = 'true'
const api = await startApi({ demo: true })
try {
  const { createServer } = await import('vite')
  const web = await createServer({
    server: { host: '127.0.0.1', port: 3001, strictPort: true, open: false },
  })
  await web.listen()
  web.printUrls()
  let closing = false
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, async () => {
      if (closing) return
      closing = true
      await web.close()
      api.server.close(() => {
        api.store.close()
        process.exit(0)
      })
    })
} catch (e) {
  api.server.close(() => api.store.close())
  throw e
}
