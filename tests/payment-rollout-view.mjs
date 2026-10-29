import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer as createHttpServer } from 'node:http'

// Render the actual Vue page, complementing the rules and interactive browser checks.
const server = await createServer({
  server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  appType: 'custom',
})
try {
  const { default: Page } = await server.ssrLoadModule(
    '/src/views/payment/PaymentRolloutDemo.vue',
  )
  const app = createSSRApp(Page)
  app.component('router-link', { props: ['to'], render() { return h('a', { href: this.to }, this.$slots.default?.()) } })
  const html = await renderToString(app)
  const nav = html.match(
    /<nav\b[^>]*class="rollout-tabs"[^>]*>([\s\S]*?)<\/nav>/,
  )?.[1]
  assert(nav, 'Business navigation renders')
  assert.equal(
    (nav.match(/<button\b/g) || []).length,
    2,
    'Only two business tabs',
  )
  assert(nav.includes('功能开关') && nav.includes('支付方式灰度'))
  assert(
    !nav.includes('命中测试') && !nav.includes('发布记录'),
    'Utilities do not become main tabs',
  )
  const table = html.match(
    /<table\b[^>]*class="rules-table"[^>]*>([\s\S]*?)<\/table>/,
  )?.[1]
  assert(table.includes('PayPal 快捷支付') && table.includes('记住卡信息'))
  assert.equal(
    (table.match(/class="name-button"/g) || []).length,
    2,
    'Two primary features',
  )
  assert(
    !table.includes('使用已保存卡'),
    'Historical card reuse is not a primary feature row',
  )
  assert(!html.includes('role="switch"'), 'No duplicate boolean switch')
  assert(
    html.includes('用户 platform'),
    'Preview uses the user platform terminology',
  )
  assert(!html.includes('客户端'), 'Legacy client label is not rendered')
  const platformPicker = html.match(
    /<select\b[^>]*id="rollout-platform"[^>]*>([\s\S]*?)<\/select>/,
  )?.[1]
  assert(platformPicker, 'Preview has an independent user platform picker')
  for (const platform of ['apple', 'google', 'PSN', 'windows'])
    assert(platformPicker.includes(`value="${platform}"`))
  assert(
    !platformPicker.includes('value="web"') &&
      !platformPicker.includes('value="ios"'),
  )
  assert(
    html.includes('支付设备环境（资格样本）'),
    'Device capability remains a separate advanced safety sample',
  )
  assert(
    html.includes('机构已就绪 · 样本'),
    'Readiness is distinguished from the rollout rule',
  )
  assert(
    html.includes('机构状态样本'),
    'Capability tools are available but collapsed',
  )
  assert(!/<details\b[^>]*class="capability-tools"[^>]*\sopen\b/.test(html))
  assert(
    html.includes('Antom · 开通与状态') &&
      html.includes('Antom · Payment Element'),
    'Official Antom evidence remains accessible',
  )
  assert.match(html, /<details\b[^>]*class="advanced-feature"[^>]*>/)
  assert(
    !/<details\b[^>]*class="advanced-feature"[^>]*\sopen\b/.test(html),
    'Advanced reuse starts collapsed',
  )
  assert(
    !/<details\b[^>]*class="utility-menu[^>]*\sopen\b/.test(html),
    'Utility menus start collapsed',
  )
  assert(
    !/<dialog\b[^>]*\sopen\b/.test(html),
    'Auxiliary panels do not obscure initial screen',
  )
  assert(
    html.includes('当前生效 v1') && html.includes('配置草稿'),
    'Draft/live distinction stays visible',
  )
  console.log(
    'Passed: real Vue render; two tabs/two features; unified control; collapsed advanced/utility panels; visible draft/live boundary.',
  )
} finally {
  await server.close()
}
