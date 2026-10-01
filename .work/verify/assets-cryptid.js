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
const keys = [...files.keys()]
console.log('=== all png ===')
for (const k of keys.filter((x) => x.endsWith('.png'))) console.log('  ', k.replace('Cryptid-main/', ''), files.get(k).length)
console.log('\n=== all fs (shaders) ===')
for (const k of keys.filter((x) => x.endsWith('.fs'))) console.log('  ', k.replace('Cryptid-main/', ''))
console.log('\n=== all json ===')
for (const k of keys.filter((x) => x.endsWith('.json'))) console.log('  ', k)
console.log('\n=== atlas declarations ===')
const all = keys.filter((x) => x.endsWith('.lua')).map((k) => files.get(k).toString('utf8')).join('\n')
const re = /(?:SMODS\.Atlas\s*\(\s*\{|object_type\s*=\s*"Atlas"[^}]*?)/g
let m
let n = 0
for (const k of keys.filter((x) => x.endsWith('.lua'))) {
  const src = files.get(k).toString('utf8')
  for (const mm of src.matchAll(/SMODS\.Atlas\s*\(\s*\{([\s\S]{0,240}?)\}\)/g)) {
    console.log('  [SMODS.Atlas]', k.replace('Cryptid-main/', ''), '→', mm[1].replace(/\s+/g, ' ').slice(0, 160)); n++
  }
}
for (const k of keys.filter((x) => x.endsWith('.lua'))) {
  const src = files.get(k).toString('utf8')
  for (const mm of src.matchAll(/object_type\s*=\s*"Atlas"[\s\S]{0,400}?\}/g)) {
    console.log('  [item Atlas] ', k.replace('Cryptid-main/', ''), '→', mm[0].replace(/\s+/g, ' ').slice(0, 200)); n++
  }
}
console.log('atlas decls found by this crude scrape:', n)
void re; void all; void m
