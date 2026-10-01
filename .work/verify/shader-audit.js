'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')
const D = JSON.parse(fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8'))

const all = D.shaders.map((s) => ({ name: s.name, src: s.source }))
console.log('vanilla shaders:', all.length)
for (const s of all) {
  const flags = []
  if (/screen_coords/.test(s.src)) flags.push('screen_coords')
  if (/#include|#pragma/.test(s.src)) flags.push('include/pragma')
  const loops = [...s.src.matchAll(/for\s*\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ' '))
  if (loops.length) flags.push('loops: ' + loops.join(' | '))
  if (/\bifdef VERTEX\b/.test(s.src)) flags.push('has-vertex-block')
  if (/\bdiscard\b/.test(s.src)) flags.push('discard')
  if (/\bint\s+\w+\s*=/.test(s.src)) flags.push('int-var')
  console.log(' ', s.name.padEnd(16), flags.join(' ; ') || '-')
}
/* Cryptid's shaders */
const zlib = require('zlib')
const buf = fs.readFileSync(path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip'))
let eocd = -1
for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
const cdSize = buf.readUInt32LE(eocd + 12); const cdOffset = buf.readUInt32LE(eocd + 16)
const base = eocd - cdSize - cdOffset
console.log('\nCryptid shaders:')
let p = eocd - cdSize
while (p < eocd - 4 && buf.readUInt32LE(p) === 0x02014b50) {
  const method = buf.readUInt16LE(p + 10); const csize = buf.readUInt32LE(p + 20)
  const nlen = buf.readUInt16LE(p + 28); const elen = buf.readUInt16LE(p + 30); const clen = buf.readUInt16LE(p + 32)
  const lho = buf.readUInt32LE(p + 42)
  const name = buf.toString('utf8', p + 46, p + 46 + nlen)
  p += 46 + nlen + elen + clen
  if (!name.endsWith('.fs')) continue
  const lnlen = buf.readUInt16LE(base + lho + 26); const lelen = buf.readUInt16LE(base + lho + 28)
  const start = base + lho + 30 + lnlen + lelen
  const raw = buf.subarray(start, start + csize)
  const src = (method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw)).toString('utf8')
  const flags = []
  const exts = [...src.matchAll(/extern\s+(?:MY_HIGHP_OR_MEDIUMP\s+)?(\w+)\s+(\w+)\s*;/g)].map((m) => m[2]).filter((n) => !/^(dissolve|time|texture_details|image_details|shadow|burn_colour_1|burn_colour_2|mouse_screen_pos|hovering|screen_scale)$/.test(n))
  if (exts.length) flags.push('extra uniforms: ' + exts.join(','))
  const loops = [...src.matchAll(/for\s*\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ' '))
  if (loops.length) flags.push('loops: ' + loops.join(' | '))
  if (/\bint\s+\w+\s*=/.test(src)) flags.push('int-var')
  if (/\bdiscard\b/.test(src)) flags.push('discard')
  if (/screen_coords/.test(src)) flags.push('screen_coords')
  console.log(' ', name.split('/').pop().padEnd(16), flags.join(' ; ') || '-')
}
