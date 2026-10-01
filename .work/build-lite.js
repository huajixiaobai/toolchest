/* ============================================================================
 * build-lite.js — the web build.
 *
 *   dist/lite/   index.html + boot.js + app.js + manifest + service worker
 *                (no game assets at all: the visitor supplies their own files)
 *   dist/web/    the same, plus assets/data.json + assets/atlas.bin, so a
 *                self-hosted copy can serve everything itself
 *
 * The single-file offline build (bundle.js) is unaffected.
 * ==========================================================================*/
'use strict'
const fs = require('fs')
const path = require('path')

const HERE = __dirname
const OUTROOT = path.join(HERE, '..', 'dist')
const read = (p) => fs.readFileSync(path.join(HERE, p), 'utf8')
/* declared up here on purpose: reused by the og.png step, which runs before the report */
const size = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1) + ' KB'

const withPack = process.argv.includes('--pack')
/* --out <dir>  : write somewhere else (used by site.js, which mounts this at /viewer/)
   --no-sw      : this copy lives *inside* a bigger site whose own service worker at the
                  root already caches it — so skip the nested sw.js and its registration. */
const argVal = (flag) => { const i = process.argv.indexOf(flag); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null }
const NO_SW = process.argv.includes('--no-sw')
const OUTDIR = argVal('--out')
const OUT = OUTDIR ? path.resolve(HERE, '..', OUTDIR) : path.join(OUTROOT, withPack ? 'web' : 'lite')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
if (withPack) fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true })

/* ---- where will this be published? ------------------------------------------------
 *   node build-lite.js --site-url https://balatro.example.com/     (or SITE_URL=…)
 * Only used for canonical / og:url / sitemap / robots — the page itself is fully
 * relative, so it also works from a sub-path or from file:// with no site url at all. */
const siteUrl = (() => {
  const i = process.argv.indexOf('--site-url')
  const raw = (i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : process.env.SITE_URL || '').trim()
  if (!raw) return ''
  return raw.endsWith('/') ? raw : raw + '/'
})()

const SITE_NAME = 'Balatro 素材图鉴'
const SITE_DESC = 'Balatro 全美术素材在线查看 / 预览 / 提取器：小丑牌、塔罗、星球、幽灵、优惠券、补充包、盲注、强化、蜡封、版本特效与全部游戏数据。素材由你自己电脑上的游戏文件在浏览器里解析，不上传任何数据。'

/* ---- scripts ------------------------------------------------------------------ */
/* boot.js needs lua + databuild + gameparse before the visitor picks a file; the
   viewer itself (glshaders + modimport + app) is loaded afterwards, so the start
   screen shows up immediately and the big bundle is not fetched until it is needed. */
const bootBundle = [
  read('lua.js'),
  read('databuild.js'),
  read('gameparse.js'),
  read('boot.js'),
].join('\n;\n')

let appBundle = [
  read('glshaders.js'),
  read('modimport.js'),
  read('app.js'),
].join('\n;\n')

/* A short stamp over the viewer bundle, shown in the status bar. It changes whenever any
   of those three files changes — the only reliable way to tell a cached page from a fresh
   one, since the service worker caches app.js aggressively (hard refresh is not obvious
   on a phone). */
const appStamp = require('crypto').createHash('sha256').update(appBundle).digest('hex').slice(0, 8)
appBundle = 'window.__APP_BUILD__ = "' + appStamp + '";\n' + appBundle

/* gate: the bundles are served as external <script src>, so a syntax error would break
   the viewer silently (no inline error, just an empty page). Fail the build instead. */
for (const [name, src] of [['boot.js', bootBundle], ['app.js', appBundle]]) {
  try { new Function(src) } catch (e) { throw new Error('syntax error in ' + name + ': ' + e.message) }
}
console.log('gate ✓  boot.js / app.js 语法通过  (viewer build ' + appStamp + ')')

fs.writeFileSync(path.join(OUT, 'boot.js'), bootBundle)
fs.writeFileSync(path.join(OUT, 'app.js'), appBundle)

/* ---- index.html ---------------------------------------------------------------- */
const shell = read('shell.html')
const css = read('app.css') + '\n' + read('boot.css')
/* The public repo must never contain game data, so the site build can fall back to a tiny
   committed `site-meta.json` (version + counts only) when out/data.json is absent — that is
   what lets CI build the site without owning the game. */
const META_SRC = fs.existsSync(path.join(HERE, 'out', 'data.json')) ? 'out/data.json' : 'site-meta.json'
const META_RAW = JSON.parse(read(META_SRC))
const meta = META_RAW.meta || META_RAW

let html = shell
  .replace('/*__CSS__*/', () => css)
  .replace('<title>Balatro 素材图鉴 · 全美术资源查看与提取器</title>',
    '<title>Balatro 素材图鉴 · 全美术资源查看与提取器（在线版）</title>')
  // the viewer script is loaded on demand by boot.js, so drop its inline block
  .replace(/\n<script>\s*\/\*__DATA__\*\/\s*<\/script>/, '')
  .replace(/\n<script>\s*\/\*__ATLAS__\*\/\s*<\/script>/, '')
  .replace(/\n<script>\s*\/\*__LUA__\*\/\s*<\/script>/, '')
  .replace(/\n<script>\s*\/\*__GLSHADERS__\*\/\s*<\/script>/, '')
  .replace(/\n<script>\s*\/\*__MODIMPORT__\*\/\s*<\/script>/, '')
  .replace(/\n<script>\s*\/\*__APP__\*\/\s*<\/script>/, '')
  .replace('<div id="backdrop"></div>',
    `<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon.svg">
<meta name="theme-color" content="#0f3d2e">
<meta name="description" content="${SITE_DESC}">
${siteUrl ? `<link rel="canonical" href="${siteUrl}">\n` : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${SITE_NAME} · 全美术资源查看与提取器">
<meta property="og:description" content="${SITE_DESC}">
${siteUrl ? `<meta property="og:image" content="${siteUrl}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
` : ''}<meta property="og:locale" content="zh_CN">
${siteUrl ? `<meta property="og:url" content="${siteUrl}">\n` : ''}<meta name="twitter:card" content="${siteUrl ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${SITE_NAME} · 全美术资源查看与提取器">
<meta name="twitter:description" content="${SITE_DESC}">
${siteUrl ? `<meta name="twitter:image" content="${siteUrl}og.png">\n` : ''}<meta name="robots" content="index,follow">
<meta name="copyright" content="非官方粉丝工具；Balatro 游戏素材与数据版权归 LocalThunk / Playstack 所有">
<div id="boot"></div>
<div id="backdrop"></div>`)
  .replace('</body>', `<script>window.__PACK__ = ${withPack ? "'assets/'" : 'null'};</script>
<script src="boot.js"></script>
</body>`)

if (/\/\*__(CSS|DATA|ATLAS|APP|LUA|MODIMPORT|GLSHADERS)__\*\//.test(html)) {
  throw new Error('index.html still has placeholders')
}
fs.writeFileSync(path.join(OUT, 'index.html'), html)

/* ---- build id ------------------------------------------------------------------- */
/* A short fingerprint of what went into this build, so the service worker cache rolls over. */
const buildId = (() => {
  const h = require('crypto').createHash('sha256')
  h.update(bootBundle); h.update(appBundle); h.update(html)
  return h.digest('hex').slice(0, 10)
})()

/* ---- PWA ------------------------------------------------------------------------ */
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'Balatro 素材图鉴',
  short_name: '素材图鉴',
  description: 'Balatro 全美术素材查看 / 预览 / 提取器（素材由用户自己的游戏文件在本地解析）',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#10161c',
  theme_color: '#10161c',
  lang: 'zh-CN',
  icons: [
    { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
  ],
}, null, 2))

fs.writeFileSync(path.join(OUT, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
<rect width="192" height="192" rx="34" fill="#10161c"/>
<rect x="34" y="26" width="124" height="140" rx="12" fill="#18222c" stroke="#4bc292" stroke-width="5"/>
<text x="96" y="118" font-size="72" text-anchor="middle" font-family="sans-serif" fill="#4bc292">♣</text>
</svg>`)

/* ---- assets (self-hosted variant only) -------------------------------------------- */
if (withPack) {
  const atlasSrc = read('out/atlas.js')
  const A = JSON.parse(atlasSrc.slice(atlasSrc.indexOf('{'), atlasSrc.lastIndexOf('}') + 1))
  const chunks = []
  const pack = []
  let off = 0
  for (const [file, uri] of Object.entries(A)) {
    const b = Buffer.from(uri.split(',')[1], 'base64')
    chunks.push(b)
    pack.push({ file, off, len: b.length })
    off += b.length
  }
  fs.writeFileSync(path.join(OUT, 'assets', 'atlas.bin'), Buffer.concat(chunks))
  const data = JSON.parse(read('out/data.json'))
  data.pack = pack
  fs.writeFileSync(path.join(OUT, 'assets', 'data.json'), JSON.stringify(data))
  console.log('packed ' + pack.length + ' textures ->', (off / 1048576).toFixed(2), 'MB')
}

/* ---- service worker --------------------------------------------------------------- */
if (!NO_SW) fs.writeFileSync(path.join(OUT, 'sw.js'), `/* Balatro 素材图鉴 — offline cache.
   Only the code is cached (and, in the self-hosted variant, the asset pack); anything the
   visitor supplies comes from their own disk. The cache name carries the build id, so a
   rebuilt site never serves a stale page. */
const BUILD = '${buildId}'
const CACHE = 'balatro-viewer-' + BUILD
const CORE = ['./', 'index.html', 'boot.js', 'app.js', 'manifest.webmanifest', 'icon.svg']
${withPack ? "const PACK = ['assets/data.json', 'assets/atlas.bin']\n" : "const PACK = []\n"}
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.concat(PACK))).then(() => self.skipWaiting()))
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
  // Navigations go to the network first so a rebuilt site is picked up immediately; the cache
  // is the offline fallback. Everything else is cache-first (the assets never change).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put('index.html', copy))
        return res
      }).catch(() => caches.match('index.html'))
    )
    return
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
      return res
    }))
  )
})
`)

/* register the worker from the page (only over http(s): file:// has no service workers).
   Skipped with --no-sw: the parent site's root worker covers this copy too. */
if (!NO_SW) {
  let html2 = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
  html2 = html2.replace('</body>', `<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
</script>
</body>`)
  fs.writeFileSync(path.join(OUT, 'index.html'), html2)
}

/* ---- the small stuff a real site needs -------------------------------------------- */
/* In --no-sw mode these belong to the parent site (site.js writes them at the root),
   so a copy mounted under /viewer/ must not ship its own robots/sitemap/404. */
if (!NO_SW) {
/* robots + sitemap only make sense once a public address is known */
fs.writeFileSync(path.join(OUT, 'robots.txt'), siteUrl
  ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`
  : 'User-agent: *\nAllow: /\n')
if (siteUrl) {
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
`)
}
/* GitHub Pages runs Jekyll by default and would ignore files it does not like */
fs.writeFileSync(path.join(OUT, '.nojekyll'), '')
/* Cloudflare Pages / Netlify read this: content-hashed assets may be cached hard, the
   shell must revalidate so a rebuilt site shows up immediately. */
fs.writeFileSync(path.join(OUT, '_headers'), `/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=300, must-revalidate

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/og.png
  Cache-Control: public, max-age=86400
`)
/* a 404 that looks like the site instead of the host's default */
fs.writeFileSync(path.join(OUT, '404.html'), `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>页面不存在 · ${SITE_NAME}</title>
<style>
html,body{margin:0;height:100%;background:#10161c;color:#dfe7ee;
  font-family:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif}
.wrap{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px}
h1{font-size:52px;margin:0;color:#4bc292;letter-spacing:2px}
p{margin:0;color:#9fb0c0;line-height:1.7;max-width:34em}
a{color:#4bc292;text-decoration:none;border:1px solid #2c3844;padding:9px 18px;border-radius:8px;margin-top:8px}
a:hover{border-color:#4bc292}
</style></head><body><div class="wrap">
<h1>404</h1>
<p>这里没有东西。<br>${SITE_NAME}是一个纯前端工具，所有页面都在首页里。</p>
<a href="./">回到首页</a>
</div></body></html>
`)
}   /* end of the site-level files that only exist in standalone mode */

/* ---- share card (drawn from code — contains no game artwork) ---------------------- */
try {
  fs.writeFileSync(path.join(OUT, 'og.png'), require('./ogimage.js').png)
  console.log('  og.png    ', size('og.png'), '(1200×630 share card)')
} catch (e) {
  console.log('  og.png    跳过（' + e.message + '）')
}

/* ---- a zip of the lite build, ready to drag into a static host -------------------- */
const zipStore = require('./makezip.js')
if (!withPack && !NO_SW) {
  const walk = (dir, base, acc) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? base + '/' + e.name : e.name
      if (e.isDirectory()) walk(path.join(dir, e.name), rel, acc)
      else acc.push([rel, fs.readFileSync(path.join(dir, e.name))])
    }
    return acc
  }
  const entries = walk(OUT, '', []).filter(([n]) => n !== '_headers')   // host-specific
  const zip = zipStore(entries)
  fs.writeFileSync(path.join(OUTROOT, 'balatro-site.zip'), zip)
  console.log('  → ' + path.join('dist', 'balatro-site.zip') + '  ' + (zip.length / 1024).toFixed(1) + ' KB / ' + entries.length + ' 个文件（可直接拖进静态托管）')
}

/* ---- report --------------------------------------------------------------------- */
console.log('build  :', withPack ? 'web (with a local asset pack)' : 'lite (no game assets)')
console.log('output :', OUT)
console.log('  index.html', size('index.html'))
console.log('  boot.js   ', size('boot.js'))
console.log('  app.js    ', size('app.js'))
console.log('  sw.js     ', NO_SW ? '（无——由上层站点的根 service worker 负责）' : size('sw.js'))
if (withPack) console.log('  assets/   ', size('assets/data.json'), '+', size('assets/atlas.bin'))
console.log('game data inside this build:', withPack ? 'yes (self-hosted variant)' : 'no — the visitor supplies it')
console.log('meta   :', meta.game, meta.version, '| items', meta.itemCount)
