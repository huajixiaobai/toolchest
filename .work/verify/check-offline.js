/* Offline audit: nothing in any delivered artifact may reference the network.
   Any http(s) URL that the page would load (script/link/img/font/fetch) is a failure. */
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..', '..')

const targets = []
const walk = (dir, rel) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    const r = rel ? rel + '/' + e.name : e.name
    if (e.isDirectory()) walk(p, r)
    else targets.push({ rel: r, full: p })
  }
}
targets.push({ rel: 'Balatro素材图鉴.html', full: path.join(ROOT, 'Balatro素材图鉴.html') })
for (const d of ['dist/lite', 'dist/web', 'docs']) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d), d)

/* things the browser would actually fetch */
const LOADERS = [
  [/<script[^>]+src\s*=\s*["'](https?:)?\/\//gi, 'external script'],
  [/<link[^>]+href\s*=\s*["'](https?:)?\/\//gi, 'external stylesheet/font'],
  [/<img[^>]+src\s*=\s*["'](https?:)?\/\//gi, 'external image'],
  [/@import\s+url\(\s*["']?(https?:)?\/\//gi, 'css @import'],
  [/url\(\s*["']?(https?:)?\/\//gi, 'css url()'],
  [/fetch\(\s*["'`](https?:)?\/\//gi, 'fetch()'],
  [/new\s+Worker\(\s*["'`](https?:)?\/\//gi, 'Worker()'],
  [/importScripts\(\s*["'`](https?:)?\/\//gi, 'importScripts()'],
  [/navigator\.serviceWorker\.register\(\s*["'`](https?:)?\/\//gi, 'SW registration'],
  [/@font-face/gi, '@font-face (possible remote font)'],
]
let bad = 0
for (const t of targets) {
  const text = fs.readFileSync(t.full, 'utf8')
  const hits = []
  for (const [re, label] of LOADERS) {
    const m = text.match(re)
    if (!m) continue
    // @font-face alone is only a warning; report it separately
    if (label.startsWith('@font-face')) { hits.push(label + ' ×' + m.length + '（仅当内部有远程 url 才算问题）'); continue }
    hits.push(label + ' ×' + m.length + ' → ' + String(m[0]).slice(0, 80))
  }
  // every absolute URL mentioned anywhere (as text, e.g. in docs) is informational
  const urls = [...new Set((text.match(/https?:\/\/[^\s"'`)]+/g) || []))].filter((u) => !/^https?:\/\/(www\.)?(w3\.org|schemas\.|purl\.org)/i.test(u))
  if (hits.length) { bad++; console.log('❌ ' + t.rel); for (const h of hits) console.log('     ' + h) }
  else console.log('✅ ' + t.rel + (urls.length ? '  （正文里提到 ' + urls.length + ' 个链接，但都不会被加载：' + urls.slice(0, 3).join(', ').slice(0, 110) + '）' : '  无任何外部引用'))
}
console.log(bad ? '\n❌ ' + bad + ' 个产物存在外部加载' : '\n✅ 所有产物都不从网络加载任何东西（断网可用）')
process.exit(bad ? 1 : 0)
