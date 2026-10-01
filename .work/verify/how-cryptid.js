/* How does Cryptid actually register its content? */
'use strict'
const fs = require('fs')
const path = require('path')
const FILE = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const buf = fs.readFileSync(FILE)
const zlib = require('zlib')

/* minimal stored/deflate zip reader (no DecompressionStream needed) */
function readZip (buffer) {
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0; i--) if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  const cdSize = buffer.readUInt32LE(eocd + 12)
  const cdOffset = buffer.readUInt32LE(eocd + 16)
  const base = eocd - cdSize - cdOffset
  const out = new Map()
  let p = eocd - cdSize
  while (p < eocd - 4 && buffer.readUInt32LE(p) === 0x02014b50) {
    const method = buffer.readUInt16LE(p + 10)
    const csize = buffer.readUInt32LE(p + 20)
    const nlen = buffer.readUInt16LE(p + 28)
    const elen = buffer.readUInt16LE(p + 30)
    const clen = buffer.readUInt16LE(p + 32)
    const lho = buffer.readUInt32LE(p + 42)
    const name = buffer.toString('utf8', p + 46, p + 46 + nlen)
    p += 46 + nlen + elen + clen
    if (name.endsWith('/')) continue
    const lnlen = buffer.readUInt16LE(base + lho + 26)
    const lelen = buffer.readUInt16LE(base + lho + 28)
    const start = base + lho + 30 + lnlen + lelen
    const raw = buffer.subarray(start, start + csize)
    out.set(name, method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw))
    void csize
  }
  return out
}

const files = readZip(buf)
const dec = (k) => files.get(k).toString('utf8')

const targets = process.argv.slice(3)
const list = targets.length ? targets : [
  'Cryptid-main/Cryptid.lua',
  'Cryptid-main/items/misc_joker.lua',
  'Cryptid-main/items/sleeve.lua',
  'Cryptid-main/config.lua',
]
for (const t of list) {
  const key = [...files.keys()].find((k) => k.endsWith(t)) || t
  if (!files.has(key)) { console.log('MISSING', t); continue }
  const src = dec(key)
  console.log('\n============================ ' + key + ' (' + src.length + ' chars)')
  console.log(src.slice(0, Number(process.env.HEAD || 2600)))
  const pats = {
    'SMODS.X{': /SMODS\s*\.\s*[A-Za-z_]\w*\s*\{/g,
    'Cryptid.joker': /Cryptid\s*\.\s*joker/g,
    'SMODS.Joker(': /SMODS\s*\.\s*Joker\s*\(/g,
    'Cryptid.X{': /Cryptid\s*\.\s*[A-Za-z_]\w*\s*[({\[]/g,
  }
  for (const [label, re] of Object.entries(pats)) {
    const m = src.match(re) || []
    console.log('  >> ' + label + ': ' + m.length + ' ' + JSON.stringify([...new Set(m)].slice(0, 10)))
  }
}
