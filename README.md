# 支付配置管理后台

这是一个独立的支付配置管理后台项目，从主项目中拆分出来。

## 功能模块

### 支付配置
- 支付渠道管理
- 支付方式管理
- 收银台管理
- 支付通道路由管理
- 收银台支付要素信息配置

## 技术栈

- Vue 3
- Vue Router 4
- Vite
- Axios

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 收银台支付方式决策 Demo

启动本地开发服务器后访问 `/domestic/payment/availability-demo`（CNY）或 `/payment/availability-demo`（USD）。

三个入口：支付方式（列表与详情侧栏）、展示策略、测试预览（单笔 / 多商品对比）。配置统一查看变更、校验并应用；日常配置与高级故障测试分离，决策原因、六步过程和版本信息按需展开。交互结构参考 Stripe 和 Adyen 官方文档，并非其认证商户后台的复刻。

支持同模板逐单适用性、固定 / 成功历史偏好 / 数据驱动三种排序、评分异常回退、兼容备用模板、独立标签和默认选择。手动选择后普通数据更新不跳动，失效或切换模板则重新确认。

含税实付、合并订单、五类状态、资格补全、单渠道故障、查询超时 / 过期 / 旧订单结果及原笔支付状态保护继续保留。业务和策略草稿隔离，任一校验错误阻止整体应用，显式应用仅作用于本地演示且不恢复模拟故障。没有用户主动设置偏好或运营活动置顶。

机构查询、历史、评分为本地虚构样本，查询 / 评分默认有效期 120 秒，到期可重试；未接入 Stripe / Adyen / Antom 或真实模型，不读取或保存现有配置、不发起真实支付，全部改动仅在页面内存生效。

产品需求见 `docs/cashier-payment-availability-prd.md`。独立规则测试：

```bash
node --test tests/payment-availability.mjs tests/cashier-decision.mjs
node tests/payment-availability-flow.mjs
```

## 功能开关与灰度发布 PRD / Demo

v1.9：模版支付方式和子渠道均已移除效果试算界面，保留规则、高级设置、保存与独立发布；底层决策及校验不变，preview API 仅用于接口测试和联调。CARD 子渠道只保留「记住卡信息」一个开关，统一管理新保存与历史卡复用，共用灰度范围和用户桶；保存仍需主动同意，复用仍需有效授权及 token。关闭同时停止两种体验，不删卡、不影响普通卡支付。旧双规则须显式保存、审核发布后才合并，旧应急覆盖保留。

两类归属不变：免密 / 卡信息在 `/payment/channels` 的「展开渠道 → 编辑子渠道」中配置；支付方式开关与灰度在 `/payment/sort` 的具体收银台模版中配置。`/payment/rollout-demo` 只提供导航，不维护第二套规则。关闭免密不关闭标准 PayPal；同一子渠道被多个模版引用时共用功能规则，模版不能覆盖它。

`npm run dev:full` 启动前端（3001）与 Node + SQLite API（3002），需要 Node >= 22.13。两类资源的草稿 / 审核 / 原子发布 / 回滚 / 应急均已独立持久化；模版内同一业务方式多渠道共享用户灰度，子渠道功能分别控制。新增功能默认关闭。数据与本机 Mock 隔离，不自动迁移。

真实订单决策与支付前复核提供服务端 API，须接入可信用户、订单、子渠道注册 / 绑定和机构产品资格适配器；缺失时不放行。身份仅本地模拟，不是正式 SSO，不发起真实支付。渠道基础信息仍是 Mock，增删 / 启停不会自动同步后端注册样本。启动、接口、适配器及边界见 [后端接入说明](docs/payment-rollout-backend.md)。运行 `npm run test:rollout-api`、`npm run test:subchannel-rollout` 及 `node tests/subchannel-rollout-flow.mjs` 验证。以下说明 `npm run dev` 的独立 Mock 模式。

入口：`/payment/rollout-demo`，或「收银台（海外）→ 功能开关与灰度发布」。

v1.4 旧 Mock 模式的支付方式灰度在 `/payment/sort` 的具体海外收银台模版中配置：编辑模版 → 支付方式行「设置开放范围」→ 关闭 / 灰度 / 全量 → 应用 → 保存模版。支持国家、用户 platform 和名单；动态条目按模版 / 渠道条目隔离，重排不换桶，效果试算已在 v1.9 移除。规则随模版写入本机 localStorage，刷新保留；此 Mock 模式未接入真实前台、审批发布或模版版本回滚。原灰度页的方式页签仅导航，不再提供场景级总表。

Mock 子渠道功能也在子渠道详情内，保存至独立 localStorage，刷新保留，不代表线上发布。原独立功能组件仅保留为未路由的历史样本 / 回归测试；不是正式入口。两种模式均不接入真实机构、不保存卡资料，尚未接入统一发布中心。

完整需求、官方调研来源、接口建议、验收与上线边界：[PRD](docs/cashier-payment-rollout-prd.md)。PayPal 不承诺免验证，签约流程需按最新机构指南另行核实。

v1.3 参考 Antom 官方公开文档，增加独立的机构准入样本（默认 Klarna 开通处理中）、指定用户验证快捷入口（0% + 白名单）和发布前检查。未就绪时可以规划草稿，但新增 / 扩量在提交、审批与回滚时阻断；关闭和可证明的收窄可继续。机构状态不随版本回滚或应急恢复改变。Antom 渠道路由分配不等同用户灰度；未宣称复刻其私有后台或接入真实机构。

v1.3.1 高级条件改为用户 platform（apple / google / PSN / windows），复用海外场景枚举；移除客户端筛选，规则使用 `platforms[]`，预览使用独立的 `profile.platform`。实际设备仅用于支付机构资格校验，不与用户 platform 混用。

```bash
node --test tests/payment-rollout.mjs
node --test tests/template-payment-rollout.mjs
node tests/template-payment-rollout-flow.mjs
node tests/payment-rollout-view.mjs
```

## 预览构建产物

```bash
npm run preview
```


