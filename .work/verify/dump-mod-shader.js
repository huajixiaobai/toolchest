/* Dump a mod's shader + its edition definition straight out of the zip, no browser needed.
   Usage: node dump-mod-shader.js [zipPath] [nameFilter] */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const FILE = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const FILTER = (process.argv[3] || 'astral').toLowerCase()
const buf = fs.readFileSync(FILE)

/* ---- zip: EOCD → central directory (handles the "payload base offset" case) ---- */
let eocd = -1
for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
}
if (eocd < 0) { console.error('❌ not a zip'); process.exit(1) }
const count = buf.readUInt16LE(eocd + 10)
const cdSize = buf.readUInt32LE(eocd + 12)
const cdOff = buf.readUInt32LE(eocd + 16)
const base = eocd - cdSize - cdOff

const entries = []
let p = cdOff + base
for (let i = 0; i < count; i++) {
  if (buf.readUInt32LE(p) !== 0x02014b50) break
  const method = buf.readUInt16LE(p + 10)
  const csize = buf.readUInt32LE(p + 20)
  const usize = buf.readUInt32LE(p + 24)
  const nlen = buf.readUInt16LE(p + 28)
  const elen = buf.readUInt16LE(p + 30)
  const clen = buf.readUInt16LE(p + 32)
  const lho = buf.readUInt32LE(p + 42)
  const name = buf.toString('utf8', p + 46, p + 46 + nlen)
  entries.push({ name, method, csize, usize, lho })
  p += 46 + nlen + elen + clen
}
console.log(`zip: ${path.basename(FILE)}  ${entries.length} 个条目`)

const read = (e) => {
  const lnlen = buf.readUInt16LE(e.lho + 26)
  const lelen = buf.readUInt16LE(e.lho + 28)
  const start = e.lho + 30 + lnlen + lelen + base
  const raw = buf.subarray(start, start + e.csize)
  return e.method === 0 ? raw : zlib.inflateRawSync(raw)
}

/* ---- 1) 所有 shader 文件 ---- */
const shaders = entries.filter((e) => /\.(fs|vs|glsl)$/i.test(e.name) || /shader/i.test(e.name))
console.log('\n=== 着色器文件 ===')
for (const e of shaders) console.log('  ' + e.name + '   ' + e.usize + ' B')

/* ---- 2) 命中 filter 的那个：完整源码 ---- */
const hit = shaders.find((e) => e.name.toLowerCase().includes(FILTER))
if (hit) {
  console.log('\n=== ' + hit.name + ' ===')
  console.log(read(hit).toString('utf8'))
} else {
  console.log('\n❌ 没找到名字里含 "' + FILTER + '" 的着色器')
}

/* ---- 3) lua 里跟这个版本有关的定义 ---- */
const luas = entries.filter((e) => /\.lua$/i.test(e.name) && e.usize < 400000)
console.log('\n=== lua 里提到 "' + FILTER + '" 的地方 ===')
let shown = 0
for (const e of luas) {
  let txt
  try { txt = read(e).toString('utf8') } catch { continue }
  const lines = txt.split(/\r?\n/)
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes(FILTER) && shown < 25) {
      const from = Math.max(0, i - 2), to = Math.min(lines.length, i + 6)
      console.log('  --- ' + e.name + ':' + (i + 1) + ' ---')
      for (let k = from; k < to; k++) console.log('    ' + lines[k])
      shown++
    }
  })
}
if (!shown) console.log('  （没有匹配）')
