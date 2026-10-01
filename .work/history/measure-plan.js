/* What would each artifact weigh? (read-only measurement for the hosting plan) */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const W = path.join(__dirname, '..')

const atlasSrc = fs.readFileSync(path.join(W, 'out', 'atlas.js'), 'utf8')
const json = atlasSrc.slice(atlasSrc.indexOf('{'), atlasSrc.lastIndexOf('}') + 1)
const A = JSON.parse(json)
let bin = 0
const rows = []
for (const [k, v] of Object.entries(A)) {
  const b = Buffer.from(v.split(',')[1], 'base64')
  bin += b.length
  rows.push([k, b.length])
}
const dataSrc = fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8')
const code = ['app.js', 'lua.js', 'modimport.js', 'glshaders.js', 'app.css']
  .map((f) => fs.readFileSync(path.join(W, f), 'utf8')).join('')
const kb = (n) => (n / 1024).toFixed(0) + ' KB'
console.log('base64 贴图（现在的做法）  ', kb(Buffer.byteLength(atlasSrc)))
console.log('二进制贴图（改成 .bin）    ', kb(bin), ' 节省', kb(Buffer.byteLength(atlasSrc) - bin))
console.log('贴图二进制 gzip            ', kb(zlib.gzipSync(Buffer.alloc(1), { level: 1 }).length ? 0 : 0), '(PNG 已压缩，gzip 基本无效)')
console.log('data.json                  ', kb(Buffer.byteLength(dataSrc)), '→ gzip', kb(zlib.gzipSync(dataSrc).length))
console.log('代码（js+css 未压缩）      ', kb(Buffer.byteLength(code)), '→ gzip', kb(zlib.gzipSync(code).length))
const whole = fs.readFileSync(path.join(W, '..', 'Balatro素材图鉴.html'))
console.log('现在这个单文件              ', kb(whole.length))
rows.sort((a, b) => b[1] - a[1])
console.log('\n前 8 大贴图:')
for (const [k, n] of rows.slice(0, 8)) console.log('  ' + k.padEnd(26) + kb(n).padStart(9))
const logos = rows.filter(([k]) => /logo/i.test(k))
console.log('登录画面用的 logo: ' + logos.map(([k, n]) => k + ' ' + kb(n)).join(', '), '合计', kb(logos.reduce((s, r) => s + r[1], 0)))
