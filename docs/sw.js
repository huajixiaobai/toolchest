/* 素材工具箱 — offline cache for the whole site (homepage + every tool page).
   The cache name carries the build id, so a rebuilt site never serves a stale page. */
const BUILD = 'dba6b71272'
const CACHE = 'toolbox-' + BUILD
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon.svg",
  "viewer/index.html",
  "viewer/boot.js",
  "viewer/app.js"
]
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
