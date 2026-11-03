<template>
  <div class="page-container rollout-home">
    <h1 class="page-title">功能开关与灰度发布</h1>
    <p>按配置对象进入所属页面，不维护第二套独立规则。</p>
    <div class="entry-grid">
      <section>
        <span class="entry-type">渠道能力</span>
        <h2>免密支付与卡保存体验</h2>
        <p>支付渠道配置 → 展开渠道 → 编辑子渠道 → 功能开关与灰度。</p>
        <p>
          PayPal
          免密支付控制有效授权钱包的快捷复用；卡信息仅一个开关，统一控制保存与复用。关闭功能不关闭普通支付方式。
        </p>
        <router-link class="btn btn-primary" to="/payment/channels"
          >前往子渠道配置</router-link
        >
      </section>
      <section>
        <span class="entry-type">收银台展示</span>
        <h2>支付方式开关与灰度</h2>
        <p>收银台模版 → 编辑具体模版 → 对应支付方式设置开放范围。</p>
        <p>
          模版之间独立；同一业务支付方式的多个 PSP
          渠道共享模版内用户灰度。模版不会覆盖子渠道的免密规则。
        </p>
        <router-link class="btn btn-primary" to="/payment/sort"
          >前往收银台模版</router-link
        >
      </section>
    </div>
    <p class="boundary">
      最终体验需同时满足：模版展示支付方式、渠道与子渠道可用、子渠道功能已发布且命中灰度、机构产品资格与有效授权。用户
      platform 是人群条件，不是客户端。
    </p>
  </div>
</template>
<style scoped>
.rollout-home > p {
  color: #667085;
  line-height: 1.8;
}
.entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 24px 0;
}
.entry-grid section {
  background: white;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  padding: 24px;
}
.entry-type {
  color: #315bea;
  font-size: 12px;
}
h2 {
  font-size: 18px;
  margin: 12px 0;
}
section p {
  color: #667085;
  line-height: 1.8;
  font-size: 14px;
}
.entry-grid .btn {
  margin-top: 12px;
}
.boundary {
  background: #f4f7ff;
  padding: 16px;
  border-radius: 6px;
}
@media (max-width: 720px) {
  .entry-grid {
    grid-template-columns: 1fr;
  }
}
</style>
