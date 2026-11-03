import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual, randomUUID } from 'node:crypto'
import { RolloutService, ServiceError, scopeKey, fail } from './service.mjs'
import { demoScope, demoChannels, demoSubchannelReader } from './demo-seed.mjs'
import {
  SubchannelRolloutService,
  featureResourceId,
} from './subchannel-service.mjs'

const equalToken = (a, b) => {
  const left = Buffer.from(a),
    right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
const loopback = (address) =>
  ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)
async function jsonBody(req) {
  if (!String(req.headers['content-type']).startsWith('application/json'))
    fail(415, 'JSON_REQUIRED', '请求须使用 application/json')
  let length = 0
  const chunks = []
  for await (const chunk of req) {
    length += chunk.length
    if (length > 262144) fail(413, 'BODY_TOO_LARGE', '请求体超过 256 KB')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error()
    return value
  } catch {
    fail(400, 'INVALID_JSON', 'JSON 请求格式无效')
  }
}

export function createRolloutServer({
  store,
  demo = false,
  principals = [],
  origins = ['http://127.0.0.1:3001'],
  allowedHosts = ['127.0.0.1', 'localhost', '[::1]'],
  capabilityReader,
  contextReader,
  subchannelReader,
  featureCapabilityReader,
  now,
} = {}) {
  if (
    !demo &&
    (!principals.length ||
      principals.some(
        (p) =>
          typeof p.token !== 'string' ||
          p.token.length < 32 ||
          !p.id ||
          !['editor', 'reviewer', 'viewer', 'emergency', 'service'].includes(
            p.role,
          ) ||
          !p.scope?.appId ||
          !p.scope?.environment ||
          !p.scope?.region,
      ))
  )
    throw new Error(
      '正式服务需要显式配置身份、至少 32 位 token、角色与授权作用域',
    )
  const features = new SubchannelRolloutService(store, {
    subchannelReader:
      subchannelReader || (demo ? demoSubchannelReader : undefined),
    featureCapabilityReader:
      featureCapabilityReader ||
      (demo
        ? (scope, resource, key) =>
            !!demoSubchannelReader(
              scope,
              resource.channel_id,
              resource.subchannel_id,
            ) &&
            (resource.business_method_id === 'paypal'
              ? key === 'paypal_quick'
              : ['card_save', 'card_reuse'].includes(key))
        : undefined),
    now,
  })
  const service = new RolloutService(store, {
    capabilityReader:
      capabilityReader ||
      (demo
        ? (scope, entry) =>
            scope.environment === 'demo' && demoChannels.has(entry.channel_id)
        : undefined),
    contextReader,
    now,
    featureEvaluator: (actor, entry, trusted) =>
      features.evaluateRoute(actor, entry, trusted),
  })
  const sessions = new Map()
  const server = createServer(async (req, res) => {
    const requestId = randomUUID()
    const send = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': requestId,
      })
      res.end(JSON.stringify(data))
    }
    try {
      const host = String(req.headers.host || '').replace(/:\d+$/, '')
      if (!allowedHosts.includes(host))
        fail(403, 'HOST_FORBIDDEN', 'Host 不在允许列表')
      const url = new URL(req.url, 'http://localhost')
      if (!url.pathname.startsWith('/api/rollout/'))
        fail(404, 'NOT_FOUND', '接口不存在')
      const path = url.pathname.replace(/^\/api\/rollout/, '')
      if (path === '/health' && req.method === 'GET')
        return send(200, {
          code: 200,
          data: {
            status: 'ok',
            storage: 'sqlite',
            mode: demo ? 'local-demo' : 'authenticated-service',
            runtimeContext: contextReader
              ? 'adapter-configured'
              : 'not-configured',
          },
        })
      const origin = req.headers.origin
      if (path === '/session' && req.method === 'POST') {
        if (
          !demo ||
          !loopback(req.socket.remoteAddress) ||
          !origins.includes(origin)
        )
          fail(
            403,
            'DEMO_LOGIN_DISABLED',
            '身份模拟只允许显式本地 Demo 和受信任来源',
          )
        const input = await jsonBody(req)
        if (!['editor', 'reviewer', 'emergency', 'viewer'].includes(input.role))
          fail(422, 'INVALID_ROLE', '演示身份无效')
        const token = randomBytes(32).toString('hex')
        // Replacing a demo session revokes the old token, not just its browser cookie.
        const previous = req.headers.cookie?.match(
          /(?:^|;\s*)rollout_session=([a-f0-9]+)/,
        )?.[1]
        if (previous) sessions.delete(previous)
        const actor = {
          id: `local-demo-${input.role}`,
          role: input.role,
          scope: demoScope,
          expiresAt: Date.now() + 3600000,
        }
        sessions.set(token, actor)
        res.setHeader(
          'Set-Cookie',
          `rollout_session=${token}; HttpOnly; SameSite=Strict; Path=/api/rollout; Max-Age=3600`,
        )
        return send(200, {
          code: 200,
          data: {
            id: actor.id,
            role: actor.role,
            scope: actor.scope,
            demo: true,
          },
        })
      }
      let actor
      const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
      if (bearer) actor = principals.find((p) => equalToken(p.token, bearer))
      else {
        const cookie = req.headers.cookie?.match(
          /(?:^|;\s*)rollout_session=([a-f0-9]+)/,
        )?.[1]
        actor = cookie ? sessions.get(cookie) : null
        if (actor?.expiresAt <= Date.now()) {
          sessions.delete(cookie)
          actor = null
        }
        if (actor && req.method !== 'GET' && !origins.includes(origin))
          fail(403, 'ORIGIN_FORBIDDEN', '操作来源不在允许列表')
      }
      if (!actor) fail(401, 'UNAUTHENTICATED', '需要有效服务凭证或本地演示会话')
      if (path === '/session' && req.method === 'GET')
        return send(200, {
          code: 200,
          data: { id: actor.id, role: actor.role, scope: actor.scope, demo },
        })
      const featureMatch = path.match(
        /^\/channels\/([A-Za-z0-9_-]{1,160})\/subchannels\/([A-Za-z0-9_-]{1,100})\/features(?:\/(draft|submit|approve|reject|withdraw|rollback|kill|resume|preview|versions|audit))?$/,
      )
      if (featureMatch) {
        const [, channelId, subchannelId, action] = featureMatch
        const current = features.read(actor, channelId, subchannelId),
          id = featureResourceId(channelId, subchannelId)
        if (req.method === 'GET' && !action)
          return send(200, { code: 200, data: current })
        if (req.method === 'GET' && ['versions', 'audit'].includes(action))
          return send(200, {
            code: 200,
            data:
              action === 'versions'
                ? store.versions(features.key(actor), id)
                : store.audits(features.key(actor), id),
          })
        if (req.method === 'POST') {
          const input = await jsonBody(req)
          if (action === 'draft') {
            features.compare(current.draftRevision, input.baseDraftRevision)
            const document = {
              ...input.document,
              channel_id: channelId,
              subchannel_id: subchannelId,
            }
            return send(200, {
              code: 200,
              data: features.save(
                actor,
                null,
                { ...input, document },
                requestId,
              ),
            })
          }
          return send(200, {
            code: 200,
            data:
              action === 'preview'
                ? features.preview(actor, id, input)
                : features.transition(actor, id, action, input, requestId),
          })
        }
      }
      if (path === '/templates' && req.method === 'GET') {
        service.requireRole(actor, [
          'editor',
          'reviewer',
          'viewer',
          'emergency',
        ])
        let list = store.list(scopeKey(actor.scope))
        if (url.searchParams.get('currency'))
          list = list.filter(
            (s) => s.draft.currency === url.searchParams.get('currency'),
          )
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1),
          size = Math.min(
            100,
            Math.max(1, Number(url.searchParams.get('page_size')) || 10),
          )
        return send(200, {
          code: 200,
          data: {
            list: list.slice((page - 1) * size, page * size),
            total: list.length,
          },
        })
      }
      if (path === '/templates' && req.method === 'POST')
        return send(201, {
          code: 200,
          data: service.save(actor, null, await jsonBody(req), requestId),
        })
      const match = path.match(
        /^\/templates\/([A-Za-z0-9_-]{1,100})(?:\/(draft|submit|approve|reject|withdraw|rollback|kill|resume|preview|versions|audit))?$/,
      )
      if (match) {
        const [, id, action] = match
        if (!action && req.method === 'GET') {
          service.requireRole(actor, [
            'editor',
            'reviewer',
            'viewer',
            'emergency',
          ])
          return send(200, { code: 200, data: service.state(actor, id) })
        }
        if (['versions', 'audit'].includes(action) && req.method === 'GET') {
          service.requireRole(actor, [
            'editor',
            'reviewer',
            'viewer',
            'emergency',
          ])
          service.state(actor, id)
          return send(200, {
            code: 200,
            data:
              action === 'versions'
                ? store.versions(scopeKey(actor.scope), id)
                : store.audits(scopeKey(actor.scope), id),
          })
        }
        if (req.method === 'POST') {
          const input = await jsonBody(req)
          const data =
            action === 'draft'
              ? service.save(actor, id, input, requestId)
              : action === 'preview'
                ? service.preview(actor, id, input)
                : service.transition(actor, id, action, input, requestId)
          return send(200, { code: 200, data })
        }
      }
      if (path === '/decisions' && req.method === 'POST')
        return send(200, {
          code: 200,
          data: await service.decide(actor, await jsonBody(req)),
        })
      const recheck = path.match(/^\/decisions\/([a-f0-9-]{36})\/revalidate$/)
      if (recheck && req.method === 'POST')
        return send(200, {
          code: 200,
          data: await service.revalidate(
            actor,
            recheck[1],
            await jsonBody(req),
          ),
        })
      fail(404, 'NOT_FOUND', '接口不存在')
    } catch (e) {
      if (!(e instanceof ServiceError))
        console.error(`[rollout:${requestId}] internal error`, e.name)
      send(e instanceof ServiceError ? e.status : 500, {
        code: e instanceof ServiceError ? e.code : 'INTERNAL_ERROR',
        message: e instanceof ServiceError ? e.message : '服务暂不可用',
        requestId,
      })
    }
  })
  server.requestTimeout = 10000
  server.headersTimeout = 10000
  return { server, service, features }
}
