/* ============================================================================
 * site.js — build the whole toolbox site into docs/ (ready for GitHub Pages).
 *
 *   node .work/site.js
 *   node .work/site.js --site-url https://user.github.io/repo/ --repo-url https://github.com/user/repo
 *
 * Layout it produces:
 *
 *   docs/index.html                homepage (the toolbox)
 *   docs/viewer/**                 the Balatro viewer, mounted at /viewer/
 *   docs/sw.js                     root service worker: caches the homepage AND the viewer,
 *                                  so the whole site opens offline after one visit
 *   docs/manifest.webmanifest      PWA: "add to home screen"
 *   docs/icon.svg  docs/og.png     code-drawn branding (no game artwork)
 *   docs/robots.txt sitemap.xml 404.html _headers .nojekyll
 *
 * GitHub Pages: Settings → Pages → Source = "Deploy from a branch", branch = main,
 * folder = /docs. Nothing else to configure — no build step, no secrets.
 * ==========================================================================*/
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const home = require('./home.js')

const HERE = __dirname
const ROOT = path.join(HERE, '..')
const argVal = (flag, def) => {
  const i = process.argv.indexOf(flag)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def
}
const norm = (u) => (u && !u.endsWith('/') ? u + '/' : u || '')

/* The site's identity lives in site.config.json (UTF-8, committed), so the .cmd helpers can
   stay pure ASCII — a Chinese argument inside a .bat/.cmd gets mangled by the console code
   page, and that is exactly how a build ends up with a garbled title. */
const CFG = (() => {
  const p = path.join(ROOT, 'site.config.json')
  if (!fs.existsSync(p)) return {}
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { console.log('⚠️  site.config.json 读不了：' + e.message); return {} }
})()

const OUTREL = argVal('--out', 'docs')
const OUT = path.resolve(ROOT, OUTREL)
const siteUrl = norm((argVal('--site-url', process.env.SITE_URL || CFG.siteUrl || '')).trim())
const repoUrl = argVal('--repo-url', process.env.REPO_URL || CFG.repoUrl || '').trim()
const siteName = argVal('--site-name', CFG.siteName || '百宝箱')
const tagline = argVal('--tagline', CFG.tagline || '一堆在浏览器里跑的小工具：把你自己电脑上那份游戏里的美术与数据解出来，看清、检索、拿走想要的素材。全程离线，什么都不上传。')
const ownerName = argVal('--owner-name', CFG.ownerName || '')
const ownerUrl = argVal('--owner-url', CFG.ownerUrl || '')
/* --with-assets 把素材包也打进 /viewer/：站点打开即用，不用选游戏文件。
   代价是公开域名上会出现游戏贴图 —— 版权上属于分发游戏素材，自己权衡。
   --also-local 额外构建一份「自己用」的 local/：带素材包、给局域网和手机用，
   不进仓库（.gitignore 里挡着），公开站仍是纯代码。 */
const WITH_ASSETS = process.argv.includes('--with-assets')
const ALSO_LOCAL = process.argv.includes('--also-local')
/* The share card is drawn with a built-in 5×7 pixel font, so its two lines must be ASCII.
   They are parameters so the card can follow a rename without touching the drawing code. */
const ogLine1 = argVal('--og-line1', CFG.ogLine1 || 'TOOLCHEST')
const ogLine2 = argVal('--og-line2', CFG.ogLine2 || 'LOCAL TOOLS NO UPLOAD')

/* ---- 1) the viewer, mounted at /viewer/ --------------------------------------- */
/* --no-sw 的理由：上层站点的根 service worker 会连查看器一起缓存，避免嵌套 scope 打架。
   --with-assets 时一并打包素材（viewer/assets/），页面启动就直接用，跳过选择游戏文件那一步。 */
const viewerArgs = [path.join(HERE, 'build-lite.js'), '--out', path.posix.join(OUTREL, 'viewer'), '--no-sw']
if (WITH_ASSETS) viewerArgs.push('--pack')
if (siteUrl) viewerArgs.push('--site-url', siteUrl + 'viewer/')
console.log('▶ 构建查看器 →', path.join(OUTREL, 'viewer') + '/' + (WITH_ASSETS ? '（含素材包：打开即用）' : '（纯代码：访客自带游戏文件）'))
execFileSync(process.execPath, viewerArgs, { stdio: 'inherit', cwd: ROOT })

/* 构建完整性闸门。曾经发生过一次：构建进程被外部中途掐掉（PowerShell 的
   `| Select-Object -First 1` 会杀掉上游进程），viewer/ 只写了一半，
   而下一步 git add 就把"删掉 index.html"当成正常改动推了上去 —— 线上 /viewer/ 直接 404。
   所以在写任何报告之前，先确认该在的文件都在。 */
function verifyBuild (dir, label) {
  const need = [
    'index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'og.png',
    path.posix.join('viewer', 'index.html'), path.posix.join('viewer', 'boot.js'), path.posix.join('viewer', 'app.js'),
  ]
  const missing = need.filter((f) => !fs.existsSync(path.join(dir, f)))
  if (missing.length) {
    console.error('\n❌ ' + label + ' 构建不完整，缺少：' + missing.join('、'))
    console.error('   （多半是构建过程被中断了 —— 不要提交这次的结果，重跑一次）')
    process.exit(1)
  }
  if (!WITH_ASSETS && fs.existsSync(path.join(dir, 'viewer', 'assets'))) {
    console.error('\n❌ ' + label + ' 是公开构建，却出现了 viewer/assets/（游戏素材）—— 拒绝产出')
    process.exit(1)
  }
}

/* ---- 2) what to say about it on the card -------------------------------------- */
const META_SRC = fs.existsSync(path.join(HERE, 'out', 'data.json')) ? 'out/data.json' : 'site-meta.json'
const M = (() => { const r = JSON.parse(fs.readFileSync(path.join(HERE, META_SRC), 'utf8')); return r.meta || r })()
const viewerMeta = `${M.game} ${M.version} · ${M.itemCount} 个条目 · ${M.atlasCount} 个图集 · ${M.locales ? M.locales.length : 5} 种语言`

/* ---- 3) the site itself -------------------------------------------------------- */
const buildId = (() => {
  const h = require('crypto').createHash('sha256')
  for (const f of ['index.html', 'boot.js', 'app.js', 'icon.svg']) {
    const p = path.join(OUT, 'viewer', f)
    if (fs.existsSync(p)) h.update(fs.readFileSync(p))
  }
  h.update(siteName)
  return h.digest('hex').slice(0, 10)
})()

/* the share card: same drawing code as the viewer's, different wording */
const og = execFileSync(process.execPath,
  [path.join(HERE, 'ogimage.js'), ogLine1, ogLine2, OUTREL], { cwd: ROOT })
  .toString().trim()
const ogPng = fs.readFileSync(path.join(OUT, 'og.png'))

fs.writeFileSync(path.join(OUT, 'index.html'), home.home({ siteName, tagline, siteUrl, repoUrl, ownerName, ownerUrl, og: ogPng, buildId, viewerMeta }))

/* Files the service worker must pre-cache. Only paths that really exist, otherwise
   Cache.addAll rejects and the worker never installs. */
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'viewer/index.html', 'viewer/boot.js', 'viewer/app.js']
fs.writeFileSync(path.join(OUT, 'sw.js'), home.serviceWorker({ buildId, paths: CORE }))

fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: siteName,
  short_name: '工具箱',
  description: tagline,
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#10161c',
  theme_color: '#10161c',
  lang: 'zh-CN',
  icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
}, null, 2))

/* same logo as the viewer's (a card with a club) — drawn with code, not game art */
fs.copyFileSync(path.join(OUT, 'viewer', 'icon.svg'), path.join(OUT, 'icon.svg'))

fs.writeFileSync(path.join(OUT, 'robots.txt'), siteUrl
  ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`
  : 'User-agent: *\nAllow: /\n')
if (siteUrl) {
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${siteUrl}viewer/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
</urlset>
`)
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '')
fs.writeFileSync(path.join(OUT, '_headers'), `/viewer/app.js
  Cache-Control: public, max-age=300, must-revalidate

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/og.png
  Cache-Control: public, max-age=86400
`)
fs.writeFileSync(path.join(OUT, '404.html'), `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>页面不存在 · ${siteName}</title>
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
<p>这里没有东西。回首页看看有哪些工具吧。</p>
<a href="./">回到首页</a>
</div></body></html>
`)

/* ---- 4) a drag-and-drop zip of the finished site ------------------------------- */
const zipStore = require('./makezip.js')
const walk = (dir, base, acc) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name
    if (e.isDirectory()) walk(path.join(dir, e.name), rel, acc)
    else if (e.name !== '_headers') acc.push([rel, fs.readFileSync(path.join(dir, e.name))])
  }
  return acc
}
const entries = walk(OUT, '', [])
verifyBuild(OUT, OUTREL + '/')   // 缺文件 / 混进素材 → 直接失败，绝不产出可推送的结果
const zip = zipStore(entries)
/* 只有「纯代码」那一份才打包成可托管的 zip；带素材的那份是给自己局域网用的，
   绝不能变成"可以拖到公开托管上去"的文件。 */
const zipPath = path.join(ROOT, 'dist', WITH_ASSETS ? 'site-with-assets.zip' : 'site.zip')
fs.mkdirSync(path.dirname(zipPath), { recursive: true })
fs.writeFileSync(zipPath, zip)
if (WITH_ASSETS) console.log('\n⚠️  这是含素材的版本（' + path.relative(ROOT, zipPath) + '）：只给自己/局域网用，不要传到公开托管。')

/* ---- 4b) the "just for me" build: same site, but with the asset pack so it opens
        straight into the atlas. Lives in local/ (gitignored) and is what the LAN
        server hands to this machine and to a phone on the same Wi-Fi. --------------- */
if (ALSO_LOCAL) {
  console.log('\n▶ 另外构建一份「自己用」的 local/（含素材包，打开即用）')
  const args = [__filename, '--out', 'local', '--with-assets']
  if (siteUrl) args.push('--site-url', siteUrl)
  if (repoUrl) args.push('--repo-url', repoUrl)
  if (ownerUrl) args.push('--owner-url', ownerUrl, '--owner-name', ownerName)
  execFileSync(process.execPath, args, { stdio: 'inherit', cwd: ROOT })
}

/* ---- 5) report ----------------------------------------------------------------- */
const size = (p) => (fs.statSync(p).size / 1024).toFixed(1) + ' KB'
const total = entries.reduce((a, [, d]) => a + d.length, 0)
console.log('')
console.log('✅ 工具箱站点已构建 →', OUTREL + '/')
console.log('   首页      ', size(path.join(OUT, 'index.html')))
console.log('   查看器    ', size(path.join(OUT, 'viewer', 'index.html')), '+ boot.js', size(path.join(OUT, 'viewer', 'boot.js')), '+ app.js', size(path.join(OUT, 'viewer', 'app.js')))
console.log('   分享卡片  ', size(path.join(OUT, 'og.png')))
console.log('   合计      ', (total / 1024).toFixed(1) + ' KB /', entries.length, '个文件')
console.log('   打包      ', path.relative(ROOT, zipPath), (zip.length / 1024).toFixed(1) + ' KB')
console.log('   ' + og)
console.log('')
console.log('下一步：把这个 ' + OUTREL + '/ 目录推到 GitHub，然后 Settings → Pages → Deploy from a branch → main / ' + OUTREL)
if (!siteUrl) console.log('提示：加上 --site-url https://用户名.github.io/仓库名/ 后重建，分享卡片与 sitemap 才会带绝对地址。')
