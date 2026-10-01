/* ============================================================================
 * home.js — the toolbox site: homepage + the root-level PWA/search files.
 *
 *   node .work/site.js            → docs/   (homepage at /, viewer at /viewer/)
 *
 * Everything is generated from TOOLS below, so adding another tool later is one
 * object literal + a folder. No game artwork anywhere: the only images are the
 * code-drawn icon.svg and og.png.
 * ==========================================================================*/
'use strict'

/** The site itself. Rename here (or pass --site-name / --site-url) and rebuild. */
function home ({ siteName, tagline, siteUrl, repoUrl, og, buildId, viewerMeta }) {
  const tools = [
    {
      id: 'balatro',
      href: 'viewer/',
      icon: '♣',
      accent: '#4bc292',
      name: 'Balatro 素材图鉴',
      desc: '把 Balatro 的美术素材与游戏数据解析成可检索、可预览、可导出的图鉴：小丑牌、塔罗、星球、幽灵、优惠券、补充包、盲注逐帧动画、强化 / 蜡封 / 版本特效，以及全部游戏数据。',
      tags: ['527 个条目', '69 个图集', '原版着色器', 'Mod 导入', 'PNG / SVG / 动图导出', '手机可用'],
      status: 'ready',
      note: viewerMeta,
    },
    {
      id: 'next',
      href: null,
      icon: '＋',
      accent: '#6d7d8d',
      name: '下一个工具',
      desc: '这里以后可以再放别的东西 —— 目录结构、首页卡片、离线缓存都是按「多个工具」设计的：加一个文件夹 + 在 TOOLS 里加一条就够了。',
      tags: ['规划中'],
      status: 'planned',
    },
  ]

  const card = (t) => {
    const tags = t.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')
    const badge = t.status === 'ready'
      ? '<span class="badge ok">可用</span>'
      : '<span class="badge soon">规划中</span>'
    const inner = `
      <div class="ticon" style="--acc:${t.accent}"><span>${t.icon}</span></div>
      <div class="tbody">
        <div class="thead"><h3>${esc(t.name)}</h3>${badge}</div>
        <p>${esc(t.desc)}</p>
        <div class="tags">${tags}</div>
        ${t.note ? `<div class="tnote">${esc(t.note)}</div>` : ''}
      </div>`
    return t.href
      ? `<a class="tool" href="${t.href}">${inner}<span class="go">打开 →</span></a>`
      : `<div class="tool planned">${inner}<span class="go dim">敬请期待</span></div>`
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(siteName)}</title>
<meta name="description" content="${esc(tagline)}">
<meta name="theme-color" content="#10161c">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon.svg">
${siteUrl ? `<link rel="canonical" href="${siteUrl}">
` : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:title" content="${esc(siteName)}">
<meta property="og:description" content="${esc(tagline)}">
${siteUrl ? `<meta property="og:url" content="${siteUrl}">
<meta property="og:image" content="${siteUrl}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${siteUrl}og.png">
` : ''}<meta name="twitter:title" content="${esc(siteName)}">
<meta name="twitter:description" content="${esc(tagline)}">
<meta name="copyright" content="非官方粉丝工具；Balatro 游戏素材与数据版权归 LocalThunk / Playstack 所有">
<style>
:root{
  --bg:#10161c; --bg2:#151d25; --bg3:#1b242e; --line:#26313d; --line2:#33414f;
  --fg:#dfe7ee; --fg2:#9fb0c0; --fg3:#6d7d8d;
  --green:#4bc292; --blue:#009dff; --gold:#f3b958; --red:#fe5f55; --purple:#a782d1;
  --mono:"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  --sans:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
}
*{box-sizing:border-box}
html,body{margin:0}
body{
  background:
    radial-gradient(1200px 600px at 12% -8%, #1d3040 0%, transparent 58%),
    radial-gradient(900px 520px at 100% 0%, #241c33 0%, transparent 55%),
    var(--bg);
  color:var(--fg); font-family:var(--sans); font-size:15px; line-height:1.65;
  min-height:100vh; display:flex; flex-direction:column;
}
a{color:inherit;text-decoration:none}
.wrap{width:min(1060px,100%); margin:0 auto; padding:0 20px}
header.top{position:sticky; top:0; z-index:5; backdrop-filter:blur(8px);
  background:rgba(16,22,28,.72); border-bottom:1px solid var(--line)}
header.top .wrap{display:flex; align-items:center; gap:12px; height:58px}
.brand{display:flex; align-items:center; gap:10px; font-weight:600; letter-spacing:.3px}
.brand svg{width:26px; height:26px; border-radius:6px; display:block}
.spacer{flex:1}
.top a.link{color:var(--fg2); font-size:13.5px; padding:6px 10px; border-radius:8px; border:1px solid transparent}
.top a.link:hover{color:var(--fg); border-color:var(--line2)}
main{flex:1; padding:52px 0 40px}
h1{font-size:clamp(28px,5vw,44px); margin:0 0 14px; letter-spacing:.5px; line-height:1.25}
h1 .accent{color:var(--green)}
.hero p.lead{font-size:clamp(14.5px,2.2vw,17px); color:var(--fg2); margin:0 0 22px; max-width:46em}
.chips{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px}
.chip{font-size:12.5px; color:var(--fg2); border:1px solid var(--line); background:rgba(27,36,46,.6);
  padding:5px 11px; border-radius:999px}
.chip b{color:var(--green); font-weight:600}
h2{font-size:14px; text-transform:uppercase; letter-spacing:1.6px; color:var(--fg3);
  margin:46px 0 16px; font-weight:600}
.grid{display:grid; gap:16px}
.tool{display:flex; align-items:flex-start; gap:16px; position:relative;
  background:linear-gradient(180deg, rgba(27,36,46,.92), rgba(21,29,37,.92));
  border:1px solid var(--line); border-radius:14px; padding:18px 18px 18px 16px;
  transition:border-color .15s, transform .15s, box-shadow .15s}
a.tool:hover{border-color:var(--line2); transform:translateY(-2px); box-shadow:0 10px 30px rgba(0,0,0,.35)}
.tool.planned{opacity:.62}
.ticon{flex:0 0 auto; width:54px; height:54px; border-radius:12px; display:grid; place-items:center;
  background:color-mix(in srgb, var(--acc) 16%, #10161c); border:1px solid color-mix(in srgb, var(--acc) 42%, transparent)}
.ticon span{font-size:26px; color:var(--acc); line-height:1}
.tbody{flex:1; min-width:0}
.thead{display:flex; align-items:center; gap:10px; flex-wrap:wrap}
.thead h3{margin:0; font-size:18px; letter-spacing:.2px}
.badge{font-size:11.5px; padding:2px 9px; border-radius:999px; border:1px solid var(--line2); color:var(--fg2)}
.badge.ok{color:var(--green); border-color:color-mix(in srgb, var(--green) 45%, transparent);
  background:color-mix(in srgb, var(--green) 12%, transparent)}
.badge.soon{color:var(--fg3)}
.tool p{margin:8px 0 10px; color:var(--fg2); font-size:14px}
.tags{display:flex; flex-wrap:wrap; gap:6px}
.tag{font-size:11.5px; color:var(--fg2); border:1px solid var(--line); padding:3px 9px; border-radius:6px;
  background:rgba(16,22,28,.5)}
.tnote{margin-top:10px; font-size:11.5px; color:var(--fg3); font-family:var(--mono)}
.go{position:absolute; right:16px; bottom:14px; font-size:13px; color:var(--green); white-space:nowrap}
.go.dim{color:var(--fg3)}
.about{margin-top:44px; border-top:1px solid var(--line); padding-top:22px; color:var(--fg2); font-size:13.5px}
.about h4{margin:0 0 8px; color:var(--fg); font-size:14px}
.about ul{margin:8px 0 0; padding-left:20px}
.about li{margin:5px 0}
.about code{font-family:var(--mono); font-size:12.5px; background:rgba(0,0,0,.35); padding:1px 6px; border-radius:5px}
.mono{font-family:var(--mono); font-size:11.5px}
footer{border-top:1px solid var(--line); color:var(--fg3); font-size:12.5px; padding:18px 0 26px}
footer .wrap{display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center}
footer a{color:var(--fg2); border-bottom:1px dotted var(--line2)}
footer a:hover{color:var(--green)}
@media (max-width:600px){
  main{padding:34px 0 26px}
  .tool{flex-direction:column; gap:12px}
  .go{position:static; align-self:flex-start; margin-top:2px}
  .ticon{width:46px; height:46px}
  .ticon span{font-size:22px}
}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="./">
    <svg viewBox="0 0 192 192" aria-hidden="true"><rect width="192" height="192" rx="34" fill="#10161c"/><rect x="34" y="26" width="124" height="140" rx="12" fill="#18222c" stroke="#4bc292" stroke-width="5"/><text x="96" y="118" font-size="72" text-anchor="middle" font-family="sans-serif" fill="#4bc292">♣</text></svg>
    <span>${esc(siteName)}</span>
  </a>
  <div class="spacer"></div>
  ${repoUrl ? `<a class="link" href="${repoUrl}" rel="noopener">源码</a>` : ''}
</div></header>

<main><div class="wrap">
  <section class="hero">
    <h1>把游戏文件<wbr>变成<span class="accent">看得见的素材</span></h1>
    <p class="lead">${esc(tagline)}</p>
    <div class="chips">
      <span class="chip"><b>零依赖</b> 纯前端</span>
      <span class="chip"><b>不上传</b> 解析全在浏览器里</span>
      <span class="chip"><b>可离线</b> 装到主屏幕也能用</span>
      <span class="chip"><b>开源</b> 代码可查可改</span>
    </div>
  </section>

  <h2>工具</h2>
  <div class="grid">
${tools.map(card).join('\n')}
  </div>

  <section class="about">
    <h4>这个站在做什么</h4>
    <p>这里放的都是「本地工具」：它们不托管任何游戏素材，而是把<strong>你自己电脑上那份游戏</strong>里的美术与数据读出来，变成能搜索、能预览、能导出的东西。</p>
    <ul>
      <li>素材<strong>不会上传</strong>：解析在浏览器内完成，结果只留在内存里，关掉页面就没了。</li>
      <li>站点本身<strong>不含任何游戏素材或游戏数据</strong>，只含代码。</li>
      <li>带素材的「单文件离线版」<strong>不提供公开下载</strong>（那等于分发游戏资源）；需要的话可以照仓库里的说明自己构建。</li>
      <li>本站是<strong>非官方粉丝作品</strong>，与 LocalThunk / Playstack 没有任何关联；游戏素材与数据的版权归原作者所有。</li>
    </ul>
  </section>
</div></main>

<footer><div class="wrap">
  <span>${esc(siteName)}</span>
  ${repoUrl ? `<a href="${repoUrl}" rel="noopener">GitHub</a>` : ''}
  <span>代码开源（MIT）；游戏素材版权归 LocalThunk / Playstack</span>
  <span style="margin-left:auto" class="mono">build ${buildId}</span>
</div></footer>

<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(function () {})
}
</script>
</body>
</html>
`
}

/** The root service worker: caches the homepage *and* the viewer, so the whole
 *  toolbox opens offline after one visit. */
function serviceWorker ({ buildId, paths }) {
  return `/* ${'素材工具箱'} — offline cache for the whole site (homepage + every tool page).
   The cache name carries the build id, so a rebuilt site never serves a stale page. */
const BUILD = '${buildId}'
const CACHE = 'toolbox-' + BUILD
const CORE = ${JSON.stringify(paths, null, 2)}
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (url.origin !== location.origin || req.method !== 'GET') return
  // Navigations: network first (so a rebuilt page shows up), cache as the offline fallback.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
      return res
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))))
    return
  }
  // Everything else is cache-first: the files only change when the build id changes.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
    return res
  })))
})
`
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

module.exports = { home, serviceWorker }
