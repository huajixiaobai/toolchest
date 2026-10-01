/* Rough dead-code + duplication report for the viewer sources. */
'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')
const files = ['app.js', 'lua.js', 'modimport.js', 'glshaders.js']
const src = {}
for (const f of files) src[f] = fs.readFileSync(path.join(W, f), 'utf8')
const all = Object.values(src).join('\n')

console.log('=== sizes ===')
let total = 0
for (const f of files) {
  const lines = src[f].split(/\r?\n/).length
  total += src[f].length
  console.log(' ', f.padEnd(16), String((src[f].length / 1024).toFixed(1) + ' KB').padStart(9), String(lines).padStart(6), 'lines')
}
console.log('  total'.padEnd(18), String((total / 1024).toFixed(1) + ' KB').padStart(9))

console.log('\n=== top-level declarations that are never referenced elsewhere ===')
const decls = []
for (const f of files) {
  const lines = src[f].split(/\r?\n/)
  lines.forEach((l, i) => {
    let m = /^(?:async )?function ([A-Za-z_$][\w$]*)/.exec(l)
    if (m) decls.push({ f, name: m[1], line: i + 1, kind: 'function' })
    m = /^const ([A-Za-z_$][\w$]*)\s*=/.exec(l)
    if (m) decls.push({ f, name: m[1], line: i + 1, kind: 'const' })
    m = /^let ([A-Za-z_$][\w$]*)\s*=/.exec(l)
    if (m) decls.push({ f, name: m[1], line: i + 1, kind: 'let' })
  })
}
const dead = []
for (const d of decls) {
  const re = new RegExp('\\b' + d.name.replace(/\$/g, '\\$') + '\\b', 'g')
  const count = (all.match(re) || []).length
  if (count <= 1) dead.push(d)
}
for (const d of dead) console.log(' ', (d.f + ':' + d.line).padEnd(18), d.kind.padEnd(9), d.name)
console.log('  total:', dead.length)

console.log('\n=== duplicated 5-line blocks (possible consolidation) ===')
const seen = new Map()
for (const f of files) {
  const lines = src[f].split(/\r?\n/)
  for (let i = 0; i + 5 <= lines.length; i++) {
    const block = lines.slice(i, i + 5).map((x) => x.trim()).filter((x) => x && !/^[})]+;?$/.test(x)).join('\n')
    if (block.split('\n').length < 4) continue
    const key = block
    if (seen.has(key)) seen.get(key).push(f + ':' + (i + 1))
    else seen.set(key, [f + ':' + (i + 1)])
  }
}
let dupCount = 0
for (const [block, places] of seen) {
  if (places.length < 2) continue
  dupCount++
  if (dupCount > 12) continue
  console.log('  x' + places.length, places.join(' , '))
  console.log('     ' + block.split('\n')[0].slice(0, 100))
}
console.log('  duplicated blocks:', dupCount)
