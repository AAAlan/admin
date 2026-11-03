# 收银台模版与子渠道功能灰度后端

2026-11-03 · v1.6 · 本地可运行服务，不是生产支付服务。

## 启动

需要 Node.js >= 22.13（建议使用受支持的 LTS）。使用内置 `node:sqlite`，无新增 npm 后端依赖；部分 Node 版本会输出 SQLite 实验性警告。

```bash
npm install
npm run dev:full
```

- 前端：http://127.0.0.1:3001/payment/sort
- 子渠道功能：http://127.0.0.1:3001/payment/channels → 展开渠道 → 编辑子渠道
- API：http://127.0.0.1:3002/api/rollout/health
- SQLite：`.data/rollouts.sqlite`（含 WAL，已加入 gitignore）。
- 首次启动创建 `demo_usd_main`、`demo_usd_backup`，已有记录不会被种子覆盖。
- 模版底部可切换运营、独立审批、应急和只读身份，仅限本地模拟。

`npm run dev` 保留旧 Mock；`npm run dev:api` 单独启动本地演示 API。两种存储不自动迁移、不合并、不互相回退。后端不可用时显示错误，不悄悄写 localStorage。`npm run preview` 本身不启动 API。

## 操作与颗粒度

模版编辑 → 方式开放范围 → 应用到表单 → 保存服务端草稿 → 填原因提交审核 → 切独立审批人 → 审核通过并发布。

免密 / 卡功能入口：支付渠道配置 → 展开 PayPal / CARD 渠道 → 编辑子渠道 → 功能开关与灰度 → 保存功能草稿 → 提交审核 → 独立审批发布。与子渠道基础信息分别保存，基础信息仍是 Mock。

子渠道功能归属为 `environment × region × appId × channelId × subchannelId`，内部按 `featureKey` 独立规则；PayPal 为 `paypal_quick`，CARD 为 `card_save` / `card_reuse`。引用同一子渠道的模版共用功能规则，模版不能覆盖；不同账户、子渠道隔离，初始全关闭。关闭免密仅回到标准支付，不关闭方式、不撤销授权。旧场景功能 cohort 不自动迁移。

子渠道功能桶使用 `JSON.stringify(["subchannel-feature-v1", environment, region, appId, channelId, subchannelId, featureKey, "user:" + userId])` 的 UTF-8 FNV1a32 % 10000。模版、订单、比例、版本不入种子；游客不开放保存 / 复用功能。旧独立功能组件不再被正式路由引用；灰度首页只是两个入口的导航。

配置归属为 `environment × region × appId × templateId`，规则为 `rules[businessMethodId]`。同一 CARD 的 Adyen / Stripe 共享规则与用户桶；渠道启用、渠道资格仍分别过滤，服务不做 PSP 权重路由。返回一个业务方式及其中合资格渠道，排序/路由由下游处理。

业务方式必须有注册 ID；兼容适配器仅接受显式品牌别名，不按任意展示文字生成 ID。同一方式的旧渠道规则冲突时拒绝保存，需运营统一，不能静默取更宽范围。新增未注册方式应先扩充服务端注册与资格适配器。

后端编辑器新增业务方式默认关闭；向已有业务方式增加渠道继承其规则，不因新增 PSP 意外扩量。渠道/方式选择器目前仍来自原 Mock 清单，并非已连接机构主数据。

```text
seed = JSON.stringify(["template-business-v2", environment, region, appId,
                       templateId, businessMethodId, "user:" + userId])
bucket = FNV1a32(UTF8(seed)) % 10000
hit = bucket < round(percentage * 100)
```

无登录账号时使用可信稳定 `session:` 标识。PSP、订单号、比例、版本、国家和用户 platform 不进入种子。原 Mock 的 `template-method-v1` cohort 不变，不将本次规则当作已有线上 cohort 的无损迁移。FNV 不是鉴权算法；真实身份不能让客户端任意挑选。

## 状态与一致性

- `draftRevision`：保存递增，必须带 `baseDraftRevision`；过期/并发保存返回 409。
- `revision`：独立审批后原子递增；草稿保存不影响 `published`。
- `pending`：冻结提交者、原因、快照、基准版本与应急代次。待审时禁止编辑，不得自审，重复/过期审批被拒绝。
- 提交、发布、回滚复验 schema 和机构准入。未就绪时禁止新增/扩量，关闭或可证明的收窄仍可止损。
- 回滚复制历史整包为新版本并同步草稿，不倒退版本号、不清除 `kills`。
- `kills[businessMethodId]`：独立覆盖，`emergencyEpoch` CAS；停用/恢复均撤销待审快照，恢复不代替机构资格。
- 模版/版本/审计在 SQLite `BEGIN IMMEDIATE` 中原子写入。审计不含名单明文，配置快照含名单，须受控保管。
- 子渠道复用同一状态机与表结构，scope 增加 `subchannel-features` 命名空间；资源 ID 为渠道 / 子渠道的确定性哈希。内部兼容字段 `template_id` 只是通用发布资源键，不指向收银台模版，不可跨命名空间读取。
- 子渠道版本与应急独立；正式模版决策按合资格渠道组合 `subchannelFeatures`。保存 `featureSnapshot` 哈希并在 revalidate 重算，功能变化同样会使旧决策失效，不必修改模版版本。

当前为单节点 SQLite，不承诺分布式传播、灾备或性能 SLA。审计接口返回最近 100 条，数据库保留完整流水；生产仍需防篡改、留存策略及决策记录清理机制。

## HTTP API

前缀 `/api/rollout`。成功 `{code:200,data:...}`；错误采用相应 HTTP 状态，带 `code / message / requestId`；响应 `no-store`。

| 方法与路径 | 权限 / 请求 |
| --- | --- |
| `GET /health` | 健康、适配器状态，不含配置 |
| `GET /session` | 当前授权身份 |
| `POST /session` | 仅 local-demo、受信 Origin + loopback，`{role}` |
| `GET /templates?currency=USD&page=1&page_size=10` | 管理角色，当前作用域列表 |
| `POST /templates` | editor，`{document}`，返回 201 |
| `GET /templates/:id` | 管理角色，草稿/生效/待审/应急状态 |
| `POST /templates/:id/draft` | editor，`{document,baseDraftRevision}` |
| `POST /templates/:id/submit` | editor，`{draftRevision,baseRevision,reason}` |
| `POST /templates/:id/approve`、`reject` | reviewer，`{pendingId,reason}`，不得自审 |
| `POST /templates/:id/withdraw` | 原提交者，`{pendingId,reason}` |
| `POST /templates/:id/rollback` | reviewer，`{targetRevision,baseRevision,baseDraftRevision,reason}` |
| `POST /templates/:id/kill`、`resume` | emergency，`{methodIds,emergencyEpoch,reason}` |
| `GET /templates/:id/versions`、`audit` | 管理角色，历史与审计 |
| `POST /templates/:id/preview` | 管理角色，`{source:'published'或'preview',document?,profile,eligibleSample}` |
| `POST /decisions` | service，只接受 `{orderId,templateId}` |
| `POST /decisions/:decisionId/revalidate` | service，`{methodId,channelId}` |

原因必填 2–500 字。JSON 上限 256 KB，Host 白名单、演示 cookie 写请求 Origin 校验。作用域取凭证，不信任 body 自报 scope。service 不能读取管理快照和名单；preview 标记 simulation，不能作为支付授权。

子渠道管理资源前缀为 `/channels/:channelId/subchannels/:subId/features`：

| 方法与子路径 | 权限 / 请求 |
| --- | --- |
| `GET` 根路径 | 管理角色；未保存返回 r0 / v0 全关闭，不在 GET 时写入 |
| `POST /draft` | editor；`{document,baseDraftRevision}`，首次基准为 0 |
| `POST /submit`、`approve`、`reject`、`withdraw`、`rollback` | 与模版同角色 / CAS / 原因字段；只影响当前子渠道 |
| `POST /kill`、`resume` | emergency；`methodIds` 为该资源的 featureKey 列表 |
| `GET /versions`、`audit` | 管理角色；当前资源历史 |
| `POST /preview` | 管理角色；`{source,document?,profile,eligibleSample,authorizationSample}` |

功能 document 为 `{channel_id,subchannel_id,rules:{paypal_quick:{mode,percentage,countries,platforms,allow,deny}}}`，CARD 则必须同时包含 `card_save` / `card_reuse`。URL 身份覆盖 body 自报身份；归属 / businessMethodId 来自可信注册，不允许伪造。service 凭证不能操作此管理接口，应通过 decisions 获取组合结果。

## 非演示服务与可信适配器

`npm run api` 不开放演示登录。必须显式提供 `ROLLOUT_PRINCIPALS` JSON 数组，每项形如：

```json
{
  "id": "your-stable-actor-id",
  "role": "editor",
  "token": "REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS",
  "scope": {"environment":"sandbox","region":"overseas","appId":"your-app"}
}
```

角色 editor / reviewer / emergency / viewer / service。使用 `Authorization: Bearer ...`，不要将 token 放 URL、仓库或前端包。生产须由网关/SSO 接管签发、撤销、速率限制；固定 token 是服务接入边界，不是组织账号系统。前端只自动建立 local-demo 会话，尚未实现正式 SSO。

环境变量：`ROLLOUT_PORT`（3002）、`ROLLOUT_HOST`（127.0.0.1）、`ROLLOUT_DB`、`ROLLOUT_ORIGINS`（逗号分隔）、`ROLLOUT_ALLOWED_HOSTS`（不含端口）、`ROLLOUT_PRINCIPALS`、`ROLLOUT_ADAPTER_MODULE`。演示仅绑定 loopback；正式服务应放在 TLS 和受控网关后。

`ROLLOUT_ADAPTER_MODULE` 为部署者配置的**本地 ES module 路径**，导出以下函数；也可直接给 `startApi` / `createRolloutServer` 注入。不是 HTTP 参数，不加载请求者指定代码。

```js
// 同步读取已校验时效的机构能力快照，严格 true 才通过。
export function capabilityReader(scope, entry) {
  return false // 接入可信缓存前拒绝，不伪造机构开通。
}
// 异步读取可信订单/用户/风控/机构服务，严禁透传浏览器 profile。
export async function contextReader(scope, orderId) {
  return null // 未接入时 /decisions 返回 503 CONTEXT_UNAVAILABLE。
}
// 可选：同步读取可信渠道账户、子渠道归属和当前启用状态。
export function subchannelReader(scope, channelId, subchannelId) {
  return null // 或 {channel_id,subchannel_id,business_method_id,name,channel_enabled,enabled}
}
// 可选：严格按功能产品准入；普通 PayPal / 卡开通不代表复用 / 保存产品获批。
export function featureCapabilityReader(scope, resource, featureKey) {
  return false
}
```

上下文结构（字段须由真实系统生成，不能照抄演示资格上线）：

```js
{
  orderId, templateId, appId, environment, region,
  userId, sessionId, country: 'US', platform: 'apple',
  currency: 'USD', amountMinor: 4999, riskAllowed: true,
  paymentState: 'idle', expiresAt: /* epoch ms，可信查询有效期 */,
  eligibility: { 'card::your_channel_account_id': true },
  subchannels: {
    'card::your_channel_account_id': {
      id: 'your-trusted-selected-subchannel-id',
      channelEnabled: true, subchannelEnabled: true,
      eligibility: {card_save: true, card_reuse: true},
      tokenValid: true, consentValid: true
    }
  }
}
```

适配器负责可信选模版、订单归属/金额/币种、稳定身份、用户 platform、机构交易资格和原笔支付状态。资格缓存过期必须返回 false/未知；`capabilityReader` 不接受 Promise，异步查询须先更新受控快照。未知/超时不得默认放行。

`subchannels` 必须由可信系统按本单实际渠道 / 子渠道绑定，不按浏览器名称或卡品牌猜测。PayPal `eligibility` 对应 `paypal_quick`；授权和 token 必须已验证 user / merchant / environment / 用途及撤销状态；`card_save` 仅允许保存邀请，不要求已有 token，仍须在实际保存时取得用户明确同意。缺少注册适配器或可信绑定时不开放功能，合资格标准支付不被误隐藏。新增两个适配器均为同步快照读取，缺失 / 未知 fail closed，不从通用方式资格推导产品资格。

决策只用 published，可信查询 2.5 秒未返回则 503 拒绝；返回后重读版本/应急状态，TTL 最多 60 秒。适配器还须自行取消超时的上游工作。复核检查原展示方式/渠道、TTL、当前版本/安全代次及用户/订单/资格事实。仅刷新查询有效期不算事实变化。发生变化返回 409，不静默换方式。

**`revalidate` 不是支付提交接口，没有实现支付事务锁。** 正式支付服务必须在订单锁/幂等控制下复核最新安全状态并原子创建支付尝试，随后验签、回调、查单；不能先复核，任意等待后无锁扣款。

## 存储与范围边界

数据库权限 0600，新目录 0700。包含运营名单与决策订单标识，须配置加密磁盘、备份、最小权限和留存期限。备份可停服复制，或用 SQLite 一致性在线备份；运行中不得只复制主库而忽略 WAL。没有删除/覆盖旧 Mock 的重置命令。

未接入真实 Stripe / Adyen / Antom / PayPal、SSO、支付创建/扣款/token/查单、生产监控与高可用、跨服务原子锁或统一 `/config-release`。本轮后端覆盖海外模版方式与注册子渠道功能；国内模版、场景、渠道主数据仍为 Mock。演示注册仅覆盖 Adyen 子渠道 1 / 2、Stripe 3 / 4、PayPal 5、Antom 6，均为 `demo / overseas / saki` 静态样本。Mock 增删 / 启停不会自动更新后端注册；正式接入必须统一可信渠道主数据，不能将样本视为真实开通。

## 验证

```bash
npm run test:rollout-api
npm run test:subchannel-rollout
node tests/subchannel-rollout-flow.mjs
node --test tests/payment-rollout.mjs tests/template-payment-rollout.mjs tests/payment-availability.mjs tests/cashier-decision.mjs
node tests/template-payment-rollout-flow.mjs
node tests/cashier-template-flow.mjs
npm run build
```

HTTP 测试使用隔离临时数据库和随机 loopback 端口，不改 Demo 数据。覆盖角色/作用域、并发 CAS、非法规则、自审/重复审批、共享桶与单调扩量、资格/止损、应急/回滚、可信上下文、旧决策失效、重启持久化及请求安全边界。
