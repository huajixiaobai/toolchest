// Repair the missing template-literal terminator left by patch-remove-3d.js.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')
const before = s
// the gif3d scenario now ends with "return r })()" but lost its closing backtick + comma
s = s.replace('     r.hasTilt = typeof A.tiltRender;\n     return r })()\n  export: `(async()=>{',
  '     r.hasTilt = typeof A.tiltRender;\n     return r })()`,\n  export: `(async()=>{')
if (s === before) { console.log('marker not found'); process.exit(1) }
fs.writeFileSync(f, s)
try { new Function(s); console.log('✅ cdp.js syntax OK') } catch (e) { console.log('❌ syntax:', e.message) }
