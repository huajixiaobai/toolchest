// Fix the boxCompare scenario (the throwaway third column passed a null canvas).
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')
const bad = [
  '       col.appendChild(mk(it.name+" 原尺寸开关", null, ""));',
  '       col.removeChild(col.lastChild);',
].join('\n')
if (!s.includes(bad)) { console.log('marker missing'); process.exit(1) }
s = s.replace(bad, '')
fs.writeFileSync(f, s)
try { new Function(s); console.log('✅ fixed, syntax OK') } catch (e) { console.log('❌ syntax:', e.message) }
