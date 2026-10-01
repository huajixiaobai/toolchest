/* The service worker must not pin a stale build: derive the cache name from the build, use
   network-first for page navigations, and let the test start from a clean slate. */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

rep('build-lite.js',
  `fs.writeFileSync(path.join(OUT, 'sw.js'), \`/* Balatro 素材图鉴 — offline cache.
   Only the code is cached; anything the visitor supplies comes from their own disk. */
const CACHE = 'balatro-viewer-v1'
const CORE = ['./', 'index.html', 'boot.js', 'app.js', 'manifest.webmanifest', 'icon.svg']
\${withPack ? "const PACK = ['assets/data.json', 'assets/atlas.bin']\\n" : "const PACK = []\\n"}
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.concat(PACK))).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && e.request.method === 'GET') {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
      }
      return res
    }).catch(() => caches.match('index.html')))
  )
})
\`)`,
  `fs.writeFileSync(path.join(OUT, 'sw.js'), \`/* Balatro 素材图鉴 — offline cache.
   Only the code is cached (and, in the self-hosted variant, the asset pack); anything the
   visitor supplies comes from their own disk. The cache name carries the build id, so a
   rebuilt site never serves a stale page. */
const BUILD = '\${buildId}'
const CACHE = 'balatro-viewer-' + BUILD
const CORE = ['./', 'index.html', 'boot.js', 'app.js', 'manifest.webmanifest', 'icon.svg']
\${withPack ? "const PACK = ['assets/data.json', 'assets/atlas.bin']\\n" : "const PACK = []\\n"}
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
\`)`,
  'sw template')

rep('build-lite.js',
  `/* ---- report --------------------------------------------------------------------- */`,
  `/* ---- build id ------------------------------------------------------------------- */
/* A short fingerprint of what went into this build, so the service worker cache rolls over. */
const buildId = (() => {
  const h = require('crypto').createHash('sha256')
  h.update(bootBundle); h.update(appBundle); h.update(html)
  return h.digest('hex').slice(0, 10)
})()

/* ---- report --------------------------------------------------------------------- */`,
  'build id')

fs.writeFileSync(path.join(__dirname, 'build-lite.js'), fs.readFileSync(path.join(__dirname, 'build-lite.js'), 'utf8'))
console.log(fails ? 'FAILURES' : 'done')
