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

四个页签演示商品试算、决策策略、适用规则、多商品对比。支持同模板逐单适用性、固定 / 成功历史偏好 / 数据驱动三种排序、评分异常回退、兼容备用模板、独立标签和默认选择。可查看六步决策、快照与模板尝试；手动选择后普通数据更新不跳动，失效或切换模板则重新确认。

含税实付、合并订单、五类状态、资格补全、单渠道故障、查询超时 / 过期 / 旧订单结果及原笔支付状态保护继续保留。业务和策略草稿隔离，非法草稿不影响生效版本，显式应用仅作用于本地演示。没有用户主动设置偏好或运营活动置顶。

机构查询、历史、评分为本地虚构样本，查询 / 评分默认有效期 120 秒，到期可重试；未接入 Stripe / Adyen / Antom 或真实模型，不读取或保存现有配置、不发起真实支付，全部改动仅在页面内存生效。

产品需求见 `docs/cashier-payment-availability-prd.md`。独立规则测试：

```bash
node --test tests/payment-availability.mjs tests/cashier-decision.mjs
node tests/payment-availability-flow.mjs
```

## 预览

```bash
npm run preview
```


