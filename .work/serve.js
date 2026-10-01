/* ============================================================================
 * serve.js — a zero-dependency static server for the online build.
 *
 *   node .work/serve.js                 serve dist/web  (has the asset pack: opens instantly)
 *   node .work/serve.js --lite          serve dist/lite (no assets: the visitor picks their exe)
 *   node .work/serve.js --lan           also listen on the LAN, so a phone can open the URL
 *   node .work/serve.js --dir <path> --port 8137 --open
 *
 * Binds to 127.0.0.1 by default, so it keeps working with the network cable pulled. No
 * packages, no telemetry, nothing fetched from the internet.
 * ==========================================================================*/
'use strict'
const http = require('http')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d }

const ROOT = path.join(__dirname, '..')
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.zip': 'application/zip',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function pickDir () {
  const explicit = val('--dir', null)
  if (explicit) return path.resolve(ROOT, explicit)
  const site = path.join(ROOT, 'docs')
  const web = path.join(ROOT, 'dist', 'web')
  const lite = path.join(ROOT, 'dist', 'lite')
  if (has('--site')) return site
  if (has('--lite')) return lite
  if (fs.existsSync(path.join(web, 'index.html'))) return web
  if (fs.existsSync(path.join(site, 'index.html'))) {
    console.log('（dist/web 还没构建，改用 docs/ —— 工具箱站点，需要选择你自己的 Balatro.exe）')
    return site
  }
  if (fs.existsSync(path.join(lite, 'index.html'))) {
    console.log('（dist/web 还没构建，改用 dist/lite —— 打开后需要选择你自己的 Balatro.exe）')
    return lite
  }
  console.error('找不到构建产物。请先运行：node .work/build-lite.js --pack   或   node .work/site.js')
  process.exit(1)
}

const DIR = pickDir()
const PORT = Number(val('--port', process.env.PORT || 8137))
const LAN = has('--lan') || has('--host')
/* Refuse to serve the source tree by accident: only the two built variants are worth exposing. */
if (!fs.existsSync(path.join(DIR, 'index.html'))) {
  console.error('目录里没有 index.html：' + DIR)
  process.exit(1)
}

/** Every non-internal IPv4, best candidate first — what a phone on the same Wi-Fi must type.
 *  Virtual adapters are everywhere (VMware / VirtualBox / Radmin VPN / Hyper-V / WSL), and they
 *  all look like ordinary private addresses, so drop them by adapter name before ranking. */
const VIRTUAL = /virtual|vmware|vmnet|vbox|hyper-?v|radmin|tailscale|zerotier|docker|wsl|loopback|bluetooth|tap|tun\d|npcap|npf|hamachi/i
function lanAddresses () {
  const real = []; const virtual = []
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue
      const ip = a.address
      const rank = ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3
      ;(VIRTUAL.test(name) ? virtual : real).push({ ip, rank })
    }
  }
  const byRank = (a, b) => a.rank - b.rank
  return [...real.sort(byRank), ...virtual.sort(byRank)].map((x) => x.ip)
}

const server = http.createServer((req, res) => {
  let rel
  try { rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname) } catch { rel = '/' }
  if (rel === '/' || rel.endsWith('/')) rel += 'index.html'
  if (rel === '/favicon.ico') rel = '/icon.svg'   // some browsers ask for it regardless of <link rel=icon>
  const full = path.join(DIR, path.normalize(rel).replace(/^([/\\])+/, ''))
  if (!full.startsWith(DIR)) { res.writeHead(403).end('forbidden'); return }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('404 ' + rel)
      console.log('404 ' + rel)
      return
    }
    const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream'
    res.writeHead(200, {
      'content-type': type,
      'content-length': st.size,
      // always revalidate the code (this is a preview server, so a rebuilt page must show
      // up immediately); the big asset files may be cached
      'cache-control': /\.(bin|png|jpg|webp|gif|woff2)$/i.test(full) ? 'public, max-age=3600' : 'no-cache',
    })
    const stream = fs.createReadStream(full)
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  })
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('端口 ' + PORT + ' 已被占用。换一个：node .work/serve.js --port 8138')
    process.exit(1)
  }
  throw e
})

const HOST = LAN ? '0.0.0.0' : '127.0.0.1'

function start (lan) {
  const host = lan ? '0.0.0.0' : '127.0.0.1'
  server.listen(PORT, host, () => {
    const url = 'http://127.0.0.1:' + PORT + '/'
    console.log('')
    console.log('  Balatro 素材图鉴 · 本地站点')
    console.log('  ───────────────────────────────────────────')
    console.log('  地址  : ' + url + '   ← 浏览器里打开这个')
    if (lan) {
      const ips = lanAddresses()
      if (!ips.length) console.log('  手机  : 没找到局域网地址，本机浏览器仍可用上面的地址')
      else {
        console.log('  手机  : http://' + ips[0] + ':' + PORT + '/   （手机要和电脑连同一个 Wi-Fi）')
        for (const ip of ips.slice(1, 4)) console.log('          备用 http://' + ip + ':' + PORT + '/')
      }
    } else {
      console.log('  手机  : 未开启（想用手机看就重开一次、回答 y）')
    }
    console.log('  目录  : ' + DIR)
    console.log('  模式  : ' + (fs.existsSync(path.join(DIR, 'assets', 'atlas.bin'))
      ? '已打包素材（打开即用，不需要选文件）'
      : /[\\/]docs$/.test(DIR) ? '工具箱站点（首页 → 查看器，需要选择你自己的 Balatro.exe）'
        : '纯代码（打开后选择你自己的 Balatro.exe）'))
    console.log('  离线  : 全程不访问外网；本窗口关掉站点就停止 (Ctrl+C)')
    console.log('')
    if (has('--open')) execFile('cmd', ['/c', 'start', '', url], () => {})
  })
}

/* ---- optional prompt: ask about LAN access before binding ---------------------- */
if (has('--ask') && !LAN && process.stdin.isTTY) {
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout })
  rl.question('  手机也要打开吗？(y/N) ', (ans) => {
    rl.close()
    start(/^y/i.test(String(ans).trim()))
  })
} else {
  start(LAN)
}
