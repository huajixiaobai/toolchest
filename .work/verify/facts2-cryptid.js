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
const lua = [...files.keys()].filter((k) => k.endsWith('.lua'))

console.log('=== per-file object_type usage ===')
for (const k of lua.filter((x) => /items\//.test(x))) {
  const src = files.get(k).toString('utf8')
  const ots = {}
  for (const m of src.matchAll(/object_type\s*=\s*"([^"]+)"/g)) ots[m[1]] = (ots[m[1]] || 0) + 1
  const wrappers = {}
  for (const m of src.matchAll(/([A-Za-z_][\w.]*)\s*[({]/g)) {
    const last = m[1].split(/[.:]/).pop()
    if (!/^(Joker|Consumable|Voucher|Booster|Back|Enhancement|Edition|Seal|Tag|Blind|Stake|Sleeve|Pointer|Code|Deck|Challenge|ObjectType|ConsumableType|Atlas)$/.test(last)) continue
    wrappers[m[1]] = (wrappers[m[1]] || 0) + 1
  }
  console.log(' ', k.replace('Cryptid-main/items/', '').padEnd(18), JSON.stringify(ots), JSON.stringify(wrappers))
}

/* find every toml */
console.log('\n=== toml files ===')
console.log([...files.keys()].filter((k) => k.endsWith('.toml')).slice(0, 6).join('\n'))
const t = [...files.keys()].find((k) => k.endsWith('.toml'))
if (t) { console.log('\n--- ' + t); console.log(files.get(t).toString('utf8').slice(0, 700)) }

/* how are Pointer / Code items declared? */
console.log('\n=== pointer.lua head ===')
const pl = lua.find((k) => k.endsWith('items/pointer.lua'))
console.log(files.get(pl).toString('utf8').slice(0, 1500))

console.log('\n=== code.lua head ===')
const cl = lua.find((k) => k.endsWith('items/code.lua'))
console.log(files.get(cl).toString('utf8').slice(0, 1500))
