const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `    if (name === 'localSite' || name === 'localOffline') {
      const port = process.env.SITE_PORT || 8137
      await c.send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' })
      await sleep(1500)
      await c.eval(HELPERS)
    }`
const to = `    if (name === 'localSite' || name === 'localOffline') {
      const port = process.env.SITE_PORT || 8137
      // a preview server must never serve a stale page to the test
      await c.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {})
      await c.send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' })
      await sleep(1800)
      try { await c.eval('location.reload()') } catch { /* ignore */ }
      await sleep(1200)
      await c.eval(HELPERS)
    }`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
