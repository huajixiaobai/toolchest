/* Facts needed to support Cryptid's packaging: object_type values, how items are collected,
   how atlases are declared, and how localization keys look. */
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
const all = lua.map((k) => files.get(k).toString('utf8')).join('\n')

const count = (re) => (all.match(re) || []).length
console.log('=== object_type values (Cryptid item discriminant) ===')
const ots = {}
for (const m of all.matchAll(/object_type\s*=\s*"([^"]+)"/g)) ots[m[1]] = (ots[m[1]] || 0) + 1
console.log(JSON.stringify(ots, null, 1))

console.log('\n=== wrapper calls seen anywhere ===')
const wrappers = {}
for (const m of all.matchAll(/([A-Za-z_][\w.]*)\s*[({]/g)) {
  const n = m[1]
  if (!/[.:]/.test(n)) continue
  const last = n.split(/[.:]/).pop()
  if (!/^(Joker|Consumable|Voucher|Booster|Back|Enhancement|Edition|Seal|Tag|Blind|Stake|Sleeve|Pointer|Code|Deck|Blind|Boss|Challenge|ObjectType|ConsumableType|Atlas|Sound|PokerHand)$/.test(last)) continue
  wrappers[n] = (wrappers[n] || 0) + 1
}
for (const [k, v] of Object.entries(wrappers).sort((a, b) => b[1] - a[1])) console.log('  ', String(v).padStart(4), k)

console.log('\n=== SMODS.Atlas hits ===', count(/SMODS\s*\.\s*Atlas/g))
console.log('=== SMODS.<anything>{ hits ===', count(/SMODS\s*\.\s*[A-Za-z_]\w*\s*\{/g))
console.log('=== CardSleeves.Sleeve hits ===', count(/CardSleeves\s*\.\s*Sleeve\s*[({]/g))
console.log('=== "local x = {" count ===', count(/^\s*local\s+[A-Za-z_]\w*\s*=\s*\{/gm))

console.log('\n=== how item files end (last 3 lines each, first 6 item files) ===')
for (const k of lua.filter((x) => /items\//.test(x)).slice(0, 6)) {
  const src = files.get(k).toString('utf8').trimEnd()
  const tail = src.split('\n').slice(-4).join(' ⏎ ')
  console.log('  ', k, '→', tail.slice(0, 200))
}

console.log('\n=== Cryptid.lua tail (how items are collected) ===')
const main = lua.find((k) => k.endsWith('Cryptid.lua'))
const src = files.get(main).toString('utf8')
console.log(src.slice(-2600))

console.log('\n=== localization: does j_cry_dropshot exist? ===')
const loc = files.get(lua.find((k) => k.endsWith('localization/en-us.lua'))).toString('utf8')
for (const probe of ['j_cry_dropshot', 'cry_atlasone', 'Joker = {', 'Sleeve']) {
  const i = loc.indexOf(probe)
  console.log('  ', probe, '→', i < 0 ? 'NOT FOUND' : JSON.stringify(loc.slice(Math.max(0, i - 60), i + 140)))
}
