/* Site audit for docs/ — the "did the rename / URLs actually land" check.
   Run: node .work/verify/check-site.js */
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..', '..')
const DOCS = path.join(ROOT, 'docs')
const rd = (p) => fs.readFileSync(path.join(DOCS, p), 'utf8')
const pick = (src, re) => { const m = re.exec(src); return m ? m[1] : '（无）' }

let fail = 0
const ok = (c, label, extra) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + label + (extra ? '  ' + extra : '')); if (!c) fail++ }

const home = rd('index.html')
console.log('站点首页')
const title = pick(home, /<title>([^<]*)</)
console.log('  title        ' + title)
console.log('  og:title     ' + pick(home, /property="og:title" content="([^"]*)"/))
console.log('  og:image     ' + pick(home, /property="og:image" content="([^"]*)"/))
console.log('  og:url       ' + pick(home, /property="og:url" content="([^"]*)"/))
console.log('  canonical    ' + pick(home, /rel="canonical" href="([^"]*)"/))
console.log('  源码链接     ' + pick(home, /class="link" href="([^"]*)"/))
console.log('  h1           ' + pick(home, /<h1>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, ''))

const canon = pick(home, /rel="canonical" href="([^"]*)"/)
const ogImg = pick(home, /property="og:image" content="([^"]*)"/)
ok(/^https?:\/\//.test(canon), 'canonical 是绝对地址（分享/收录需要）')
ok(/^https?:\/\//.test(ogImg), 'og:image 是绝对地址（缩略图需要绝对地址才显示）')

console.log('\n清单文件')
const mani = JSON.parse(rd('manifest.webmanifest'))
console.log('  manifest name  ' + mani.name + '    start_url ' + mani.start_url)
ok(mani.start_url === './' && mani.scope === './', 'manifest 是相对 scope（放子路径也不坏）')
for (const f of ['sw.js', 'icon.svg', 'og.png', 'robots.txt', '404.html', '.nojekyll', 'viewer/index.html', 'viewer/boot.js', 'viewer/app.js']) {
  ok(fs.existsSync(path.join(DOCS, f)), '存在 ' + f)
}
ok(fs.existsSync(path.join(DOCS, 'sitemap.xml')), '存在 sitemap.xml（有 --site-url 时才会生成）')
if (fs.existsSync(path.join(DOCS, 'sitemap.xml'))) {
  const locs = (rd('sitemap.xml').match(/<loc>(.*?)<\/loc>/g) || []).map((s) => s.replace(/<\/?loc>/g, ''))
  console.log('  sitemap urls   ' + locs.join('  '))
  ok(locs.every((u) => /^https?:\/\//.test(u)), 'sitemap 里都是绝对地址')
}

console.log('\nServices Worker 预缓存列表')
const sw = rd('sw.js')
const coreLine = /const CORE = (\[[\s\S]*?\])/.exec(sw)
if (coreLine) {
  const core = JSON.parse(coreLine[1])
  console.log('  ' + core.join('  '))
  const missing = core.filter((p) => {
    if (p === './') return !fs.existsSync(path.join(DOCS, 'index.html'))
    if (p.endsWith('/')) return !fs.existsSync(path.join(DOCS, p, 'index.html'))
    return !fs.existsSync(path.join(DOCS, p))
  })
  ok(!missing.length, 'CORE 里每个路径都真实存在（否则 SW 装不上）', missing.length ? '缺: ' + missing.join(', ') : '')
}

console.log('\n内容边界')
const all = []
const walk = (d, base) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); const r = base ? base + '/' + e.name : e.name; if (e.isDirectory()) walk(p, r); else all.push({ r, size: fs.statSync(p).size, p }) } }
walk(DOCS, '')
const total = all.reduce((a, x) => a + x.size, 0)
console.log('  ' + all.length + ' 个文件 / ' + (total / 1024).toFixed(1) + ' KB')
ok(!all.some((x) => x.size > 300 * 1024 && !/app\.js$/.test(x.r)), '没有异常大的文件（游戏数据会露出来）')
ok(!fs.existsSync(path.join(DOCS, 'assets')), '没有 assets/ 素材目录')
ok(!/__BALATRO_DATA__\s*=/.test(rd('viewer/index.html')), '查看器首页没有内嵌游戏数据')
const external = []
/* Only things the browser actually *loads* count as external dependencies.
   `<link rel=canonical>`, `og:*` and `<a href>` are metadata / hyperlinks — a link to
   GitHub is the point of the site, not a dependency. */
const LOADERS = [
  [/<script[^>]+src\s*=\s*["']([^"']+)["']/gi, 'script src'],
  [/<link[^>]+rel\s*=\s*["'](?:stylesheet|icon|apple-touch-icon|manifest|preload|prefetch)[^>]*href\s*=\s*["']([^"']+)["']/gi, 'link load'],
  [/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'](?:stylesheet|icon|apple-touch-icon|manifest|preload|prefetch)/gi, 'link load'],
  [/<img[^>]+src\s*=\s*["']([^"']+)["']/gi, 'img src'],
  [/@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/gi, 'css @import'],
  [/url\(\s*["']?([^"')]+)["']?\s*\)/gi, 'css url()'],
  [/fetch\(\s*["'`]([^"'`]+)["'`]/gi, 'fetch()'],
  [/new\s+Worker\(\s*["'`]([^"'`]+)["'`]/gi, 'new Worker()'],
  [/importScripts\(\s*["'`]([^"'`]+)["'`]/gi, 'importScripts()'],
  [/serviceWorker\.register\(\s*["'`]([^"'`]+)["'`]/gi, 'SW register'],
]
const DATA_URL = /^(data:|blob:|#)/
for (const f of all) {
  if (!/\.(html|js|webmanifest|xml|txt|svg|css)$/.test(f.r)) continue
  const src = fs.readFileSync(f.p, 'utf8')
  for (const [re, kind] of LOADERS) {
    for (const m of src.matchAll(re)) {
      const u = m[1].trim()
      if (DATA_URL.test(u)) continue                 // inline data / blob is local
      if (/^https?:\/\//i.test(u) || /^\/\//.test(u)) external.push(f.r + ' → ' + kind + ' ' + u)
    }
  }
}
ok(!external.length, '没有任何对外部地址的加载（断网可用）', external.slice(0, 3).join(' | '))

console.log('\n分享卡片')
const png = fs.readFileSync(path.join(DOCS, 'og.png'))
const w = png.readUInt32BE(16), h = png.readUInt32BE(20)
ok(png.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && w === 1200 && h === 630, 'og.png 是合法 PNG 且为 1200×630', w + '×' + h)

console.log('\n' + (fail ? '❌ ' + fail + ' 项不通过' : '✅ 全部通过（' + (all.length + 12) + ' 项检查）'))
process.exit(fail ? 1 : 0)
