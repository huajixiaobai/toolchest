const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `      try { await c.eval('location.reload()') } catch { /* ignore */ }
      await sleep(1200)
      await c.eval(HELPERS)
    }`
const to = `      try { await c.eval('location.reload()') } catch { /* ignore */ }
      await sleep(1200)
      // the site boots the viewer itself (pack mode), so wait for it before running the scenario
      for (let i = 0; i < 80; i++) {
        await sleep(250)
        try { if (await c.eval('window.__BALATRO_READY__ === true')) break } catch (e) { /* navigating */ }
      }
      await c.eval(HELPERS)
    }`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
