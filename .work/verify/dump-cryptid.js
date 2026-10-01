/* Dump a Cryptid item file so its declaration shape is visible. */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const FILE = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const buf = fs.readFileSync(FILE)
function readZip (buffer) {
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0; i--) if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  const cdSize = buffer.readUInt32LE(eocd + 12); const cdOffset = buffer.readUInt32LE(eocd + 16)
  const base = eocd - cdSize - cdOffset
  const out = new Map(); let p = eocd - cdSize
  while (p < eocd - 4 && buffer.readUInt32LE(p) === 0x02014b50) {
    const method = buffer.readUInt16LE(p + 10); const csize = buffer.readUInt32LE(p + 20)
    const nlen = buffer.readUInt16LE(p + 28); const elen = buffer.readUInt16LE(p + 30); const clen = buffer.readUInt16LE(p + 32)
    const lho = buffer.readUInt32LE(p + 42)
    const name = buffer.toString('utf8', p + 46, p + 46 + nlen)
    p += 46 + nlen + elen + clen
    if (name.endsWith('/')) continue
    const lnlen = buffer.readUInt16LE(base + lho + 26); const lelen = buffer.readUInt16LE(base + lho + 28)
    const start = base + lho + 30 + lnlen + lelen
    const raw = buffer.subarray(start, start + csize)
    out.set(name, method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw))
  }
  return out
}
const files = readZip(buf)
const want = process.argv.slice(3)
for (const w of want) {
  const key = [...files.keys()].find((k) => k.endsWith(w))
  if (!key) { console.log('MISSING ' + w); continue }
  const src = files.get(key).toString('utf8')
  const from = Number(process.env.FROM || 0)
  const to = Number(process.env.TO || 3000)
  console.log('\n================ ' + key + '  (' + src.length + ' chars, ' + src.split('\n').length + ' lines)')
  console.log(src.slice(from, to))
}
