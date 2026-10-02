/* ============================================================================
 * netrelay.js — 给 github.com 做 DNS 兜底用的本地 CONNECT 隧道。
 *
 * 症状：`git push` 报「Failed to connect to github.com:443 after 21s」，但
 * `https://api.github.com` 正常。查下来是 DNS 只给出一个连不通的 IP
 * （国内常见：github.com → 20.205.243.166 黑洞），而 140.82.112.x 那几个是通的。
 * 改 hosts 需要管理员权限，所以改成给 git 一个本地代理。
 *
 * 用法：
 *   node .work/netrelay.js --port 8443 --via 140.82.112.3
 *   git -c http.proxy=http://127.0.0.1:8443 push origin main
 *
 * 走的是标准 HTTP CONNECT：隧道里仍然是 curl 与 GitHub 之间的原始 TLS，
 * 证书照常校验（SNI 还是 github.com），不降级任何安全设置。
 * 只监听 127.0.0.1，只转发白名单里的主机。
 * ==========================================================================*/
'use strict'
const net = require('net')

const args = process.argv.slice(2)
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d }
const PORT = Number(val('--port', 8443))
/* 候选 IP：GitHub 的 DNS 常常只给出一个连不通的（20.205.243.166 黑洞），
   所以给一串候选，连不上的自动跳下一个；连上的会被记住，后面优先用。 */
const POOL = (val('--via', '20.27.177.113,140.82.114.3,140.82.116.4,140.82.121.3,4.237.22.38,140.82.112.3') || '')
  .split(',').map((s) => s.trim()).filter(Boolean)
let best = POOL[0]
const CONNECT_MS = Number(val('--timeout', 6000))
/* 形如 --map github.com=140.82.112.3,codeload.github.com=140.82.113.3；没写就用 IP 池兜底 */
const MAP = new Map((val('--map', '') || '').split(',').filter(Boolean)
  .map((s) => s.split('=').map((x) => x.trim().toLowerCase())))
const ALLOW = new Set([...MAP.keys(), 'github.com', 'codeload.github.com', 'objects.githubusercontent.com', 'api.github.com'])

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

/** 按候选顺序连一次上游，跳过连不通的 IP；成功就把 best 换成它 */
function dial (port, order) {
  return new Promise((resolve, reject) => {
    let i = 0
    const tryNext = () => {
      if (i >= order.length) return reject(new Error('所有候选 IP 都连不上：' + order.join(', ')))
      const ip = order[i++]
      const s = net.connect({ port, host: ip })
      let settled = false
      const fail = (why) => {
        if (settled) return
        settled = true
        s.destroy()
        log('  upstream', ip, why, '——试下一个')
        tryNext()
      }
      s.setTimeout(CONNECT_MS, () => fail('超时'))
      s.once('connect', () => { if (settled) return; settled = true; s.setTimeout(0); best = ip; resolve(s) })
      s.once('error', (e) => fail('ERR ' + e.code))
    }
    tryNext()
  })
}

const server = net.createServer((client) => {
  let acc = Buffer.alloc(0)
  let done = false
  const onData = (buf) => {
    acc = Buffer.concat([acc, buf])
    const idx = acc.indexOf('\r\n\r\n')
    if (idx < 0) { if (acc.length > 16384) client.destroy(); return }
    done = true
    client.removeListener('data', onData)

    const head = acc.subarray(0, idx).toString('latin1')
    const rest = acc.subarray(idx + 4)
    const m = /^CONNECT\s+([^\s:]+):(\d+)/i.exec(head)
    if (!m) { client.end('HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n'); return }
    const host = m[1].toLowerCase()
    const port = Number(m[2])
    if (!ALLOW.has(host)) { log('refused (not in allow-list):', host); client.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'); return }
    const pinned = MAP.get(host)
    /* 刚成功的那个 IP 排最前面；其余按候选顺序兜底 */
    const order = pinned ? [pinned] : [best, ...POOL.filter((ip) => ip !== best)]
    log('CONNECT', host + ':' + port, '| 候选', order[0] + (order.length > 1 ? ' (+' + (order.length - 1) + ')' : ''))

    dial(port, order).then((up) => {
      log('  upstream 已连上', best)
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      if (rest.length) up.write(rest)   // TLS ClientHello 常常和 CONNECT 同一个包
      up.pipe(client)
      client.pipe(up)
      up.on('error', (e) => { log('upstream error:', host, e.message); client.destroy() })
      up.on('close', () => client.destroy())
      client.on('error', () => up.destroy())
      client.on('close', () => up.destroy())
    }).catch((e) => {
      log('CONNECT 失败：', host, e.message)
      client.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n')
    })
  }
  client.on('data', onData)
  client.on('error', () => {})
  client.on('close', () => { if (!done) acc = Buffer.alloc(0) })
})

server.on('error', (e) => { console.error('relay 起不来：', e.message); process.exit(1) })
server.listen(PORT, '127.0.0.1', () => {
  log('relay listening on 127.0.0.1:' + PORT, '| IP 池', POOL.join(', '),
    '| maps', [...MAP].map(([h, i]) => h + '=' + i).join(',') || '(none)')
  log('用法： git -c http.proxy=http://127.0.0.1:' + PORT + ' push origin main')
})
