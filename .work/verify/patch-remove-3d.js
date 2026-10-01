// One-off patch: 3D preview was removed, so drop its assertions from the gif scenario
// and add the mobile screenshot to the capture list.
'use strict'
const fs = require('fs')
const path = require('path')

const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')
const start = s.indexOf('     // ---- 3D tilt ----')
const end = s.indexOf('  export: `(async()=>{')
if (start < 0) { console.log('3D block not found'); process.exit(1) }
const tail = "     // ---- the 3D preview was removed: the original game has no multi-angle view ----\n     r.hasTilt = typeof A.tiltRender;\n     return r })()\n"
s = s.slice(0, start) + tail + s.slice(end)
s = s.replace("await __V.wait(6000) }\n     r.blobs=await window.__GRAB__();", "await __V.wait(6000) }\n     r.blobs=await window.__GRAB__();")
s = s.replace("'cards', 'data', 'showcase'].includes(name)", "'cards', 'data', 'showcase', 'mobile'].includes(name)")
fs.writeFileSync(f, s)
console.log('patched cdp.js')
console.log('mobile screenshot enabled:', s.includes("'showcase', 'mobile'"))
console.log('3D block removed:', !s.includes('---- 3D tilt ----'))
