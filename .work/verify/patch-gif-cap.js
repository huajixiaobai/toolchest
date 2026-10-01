// Raise the GIF frame cap so higher-fps exports stay smooth.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, '..', 'app.js')
let s = fs.readFileSync(f, 'utf8')
const a = '  while (f.length > 24) { f = f.filter((_, i) => i % 2 === 0); d *= 2 }'
const b = '  while (f.length > 40) { f = f.filter((_, i) => i % 2 === 0); d *= 2 }'
let n = 0
if (s.includes(a)) { s = s.replace(a, b); n++ }
const o = s.indexOf('save(bytes, filename, \'image/gif\')')
if (o > 0) {
  const lineStart = s.lastIndexOf('\n', o)
  const lineEnd = s.indexOf('\n', o)
  const line = s.slice(lineStart + 1, lineEnd)
  const newLine = "  toast(`已导出 GIF：${f.length} 帧 · ${Math.round(1000 / d)}fps / ${(bytes.length / 1024).toFixed(0)} KB`);"
  if (line.includes('已导出 GIF')) { s = s.slice(0, lineStart + 1) + newLine + s.slice(lineEnd); n++ }
}
fs.writeFileSync(f, s)
console.log('patched', n, 'spot(s)')
try { new Function(s); console.log('syntax OK') } catch (e) { console.log('syntax ERROR:', e.message) }
