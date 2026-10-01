'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')
const buf = fs.readFileSync(path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip'))
const zlib = require('zlib')
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
const dec = (p) => files.get(p).toString('utf8')
const loc = LUA.resolve(LUA.parseLua(dec('Cryptid-main/localization/en-us.lua')))

console.log('=== loc.descriptions.Challenge keys ===')
console.log(Object.keys(loc.descriptions.Challenge || {}).join('\n'))

console.log('\n=== items/challenge.lua first item ===')
const ch = dec('Cryptid-main/items/challenge.lua')
console.log(ch.slice(0, 1400))

console.log('\n=== how does Cryptid build gameset variant keys? ===')
const gs = dec('Cryptid-main/lib/gameset.lua')
for (const probe of ['extra_gamesets', 'gameset_config']) {
  let i = -1; let n = 0
  while ((i = gs.indexOf(probe, i + 1)) >= 0 && n < 3) {
    n++
    console.log('--- ' + probe + ' @line ' + gs.slice(0, i).split('\n').length)
    console.log(gs.slice(Math.max(0, i - 500), i + 500))
    console.log()
  }
}
console.log('\n=== search whole mod for key.._..gameset patterns ===')
const all = [...files.keys()].filter((k) => k.endsWith('.lua')).map((k) => files.get(k).toString('utf8')).join('\n')
for (const re of [/key\s*\.\.\s*"_"\s*\.\.\s*[\w.]+/g, /\.key\s*=\s*[\w.]+\.key\s*\.\./g, /gameset.*\.key/g, /G\.GAME\.gameset/g]) {
  const m = all.match(re) || []
  console.log(re.source, '→', m.length, JSON.stringify([...new Set(m)].slice(0, 6)))
}
