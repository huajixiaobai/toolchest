/* Start the local-site test from a clean slate: an earlier visit may have left a service worker
   and caches behind, which would serve a stale build to the test. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `      await c.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {})`
const to = `      await c.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {})
      // a previous visit may have installed a service worker that would serve the old build
      await c.send('Storage.clearDataForOrigin', { origin: 'http://127.0.0.1:' + port, storageTypes: 'all' }).catch(() => {})`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
