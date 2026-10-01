/* modCryptid needs the user's own Cryptid.zip. Skip it cleanly (instead of reporting a fatal)
   when neither the local copy nor the Desktop file is present. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `    if (name === 'modCryptid') {
      // drive the real <input type=file>, the same way picking the zip in the browser does
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")`
const to = `    if (name === 'modCryptid') {
      const localZip = path.join(__dirname, 'cryptid-test.zip')
      const srcZip = fs.existsSync(localZip) ? localZip : path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
      if (!fs.existsSync(srcZip)) {
        results[name] = { rep: { skipped: 'Cryptid.zip 不在（' + srcZip + '）——把 mod 的 zip 放到桌面或 verify/cryptid-test.zip 就能跑这一项' }, errors: [] }
        console.log(name.padEnd(12), '⚠️  skipped — Cryptid.zip not found')
        c.events.length = 0
        continue
      }
      // drive the real <input type=file>, the same way picking the zip in the browser does
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
/* the injection below already resolves the same path; reuse the local copy first */
s = s.replace(`      const local = path.join(__dirname, 'cryptid-test.zip')
      const cryptidPath = fs.existsSync(local) ? local : path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
      await c.send('DOM.setFileInputFiles', { files: [cryptidPath], nodeId: found.nodeId })`,
  `      await c.send('DOM.setFileInputFiles', { files: [srcZip], nodeId: found.nodeId })`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
