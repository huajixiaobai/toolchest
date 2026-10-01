/* Rebuild testmod.zip + testmod.json from the current testmod/ folder (so hand-added files
   like assets/shaders/tint.fs are included). */
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, 'testmod')
const files = new Map()
;(function walk (dir, prefix) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, prefix + e.name + '/')
    else files.set(prefix + e.name, fs.readFileSync(p))
  }
})(ROOT, '')

function crc32 (buf) {
  const T = []
  let c
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0 }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = T[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function zipStore (entries) {
  const locals = []; const centrals = []; let off = 0
  for (const [name, data] of entries) {
    const nb = Buffer.from(name, 'utf8'); const crc = crc32(data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6)
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26)
    locals.push(lh, nb, data)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8)
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28)
    ch.writeUInt32LE(off, 42)
    centrals.push(ch, nb)
    off += 30 + nb.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16)
  return Buffer.concat([...locals, cd, eocd])
}
const zip = zipStore([...files.entries()])
fs.writeFileSync(path.join(__dirname, 'testmod.zip'), zip)
const folder = {}
for (const [k, v] of files) folder[k] = v.toString('base64')
fs.writeFileSync(path.join(__dirname, 'testmod.json'), JSON.stringify({ folder, zip: zip.toString('base64') }))
console.log('repacked', files.size, 'files; zip', (zip.length / 1024).toFixed(1), 'KB')
