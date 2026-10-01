/* Print one sample table for each object_type Cryptid uses, so the field names are known. */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const W = path.join(__dirname, '..')
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
const LUA = require(path.join(W, 'lua.js'))
const { matchBrace, parseLua, resolve } = LUA

/** innermost table literal containing `pos` (brute force over '{' positions) */
function enclosing (src, pos) {
  let best = null
  for (let i = 0; i < pos; i++) {
    if (src[i] !== '{') continue
    let end
    try { end = matchBrace(src, i) } catch { continue }
    if (end < pos) { i = end; continue }
    if (!best || (end - i) < (best.end - best.start)) best = { start: i, end }
  }
  return best
}

const wanted = ['Atlas', 'ObjectType', 'ConsumableType', 'Achievement', 'Stake', 'Blind', 'Sleeve', 'Sticker', 'Seal', 'Enhancement', 'Edition', 'Tag', 'Booster', 'Voucher', 'Back', 'Consumable', 'Joker']
const seen = new Set()
for (const k of [...files.keys()].filter((x) => x.endsWith('.lua'))) {
  const src = files.get(k).toString('utf8')
  for (const m of src.matchAll(/object_type\s*=\s*"([^"]+)"/g)) {
    const type = m[1]
    if (!wanted.includes(type) || seen.has(type)) continue
    const box = enclosing(src, m.index)
    if (!box) continue
    seen.add(type)
    const raw = src.slice(box.start, box.end + 1)
    let parsed
    try { parsed = JSON.stringify(resolve(parseLua(raw))).slice(0, 400) } catch (e) { parsed = 'PARSE FAIL ' + e.message }
    console.log('=== object_type = ' + type + '   (' + k.replace('Cryptid-main/', '') + ')')
    console.log(parsed)
    console.log()
  }
}
console.log('types sampled:', [...seen].join(', '))
console.log('missing:', wanted.filter((w) => !seen.has(w)).join(', ') || '(none)')

/* one CardSleeves.Sleeve sample */
const sl = files.get([...files.keys()].find((k) => k.endsWith('items/sleeve.lua'))).toString('utf8')
const i = sl.indexOf('CardSleeves.Sleeve(')
const box = enclosing(sl, i + 30)
console.log('\n=== CardSleeves.Sleeve sample ===')
console.log(sl.slice(box.start, box.start + 420))
