/* The driver waited a fixed 2.2 s after reload; a 4.2 MB single-file page is not always parsed
   by then under load, which made a few scenarios fail with a null DOM. Wait for the app handle
   instead (except for scenarios that boot the app themselves). */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `    await c.eval('location.reload()').catch(() => {})
    await sleep(2200)
    await c.eval(HELPERS)`
const to = `    await c.eval('location.reload()').catch(() => {})
    await sleep(1200)
    // a 4.2 MB self-contained page is not guaranteed to be parsed in a fixed sleep; wait for the
    // viewer handle (the Lite scenario boots the app from a start screen instead)
    if (name !== 'liteBoot') {
      for (let i = 0; i < 80; i++) {
        await sleep(250)
        try { if (await c.eval("typeof window.__BALATRO__ !== 'undefined'")) break } catch (e) { /* still navigating */ }
      }
    } else {
      await sleep(1000)
    }
    await c.eval(HELPERS)`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
