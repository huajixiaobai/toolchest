/* Reading a 21 MB zip straight off the Desktop occasionally fails inside the renderer
   (NotFoundError while the file is busy), so test against a local copy. The driver prefers
   verify/cryptid-test.zip and falls back to the Desktop file. */
'use strict'
const fs = require('fs')
const path = require('path')
const src = path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const dst = path.join(__dirname, 'cryptid-test.zip')
if (fs.existsSync(src)) {
  const a = fs.statSync(src)
  const b = fs.existsSync(dst) ? fs.statSync(dst) : null
  if (!b || b.size !== a.size) { fs.copyFileSync(src, dst); console.log('copied Cryptid.zip ->', dst) }
  else console.log('local copy up to date')
} else console.log('desktop Cryptid.zip missing, keeping existing local copy')

const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `      await c.send('DOM.setFileInputFiles', { files: [path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')], nodeId: found.nodeId })`
const to = `      const local = path.join(__dirname, 'cryptid-test.zip')
      const cryptidPath = fs.existsSync(local) ? local : path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
      await c.send('DOM.setFileInputFiles', { files: [cryptidPath], nodeId: found.nodeId })`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('driver patched, syntax OK')
