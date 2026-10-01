/* Inspect a zip the way the in-page importer sees it: central directory, then a full parse. */
'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')

const FILE = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const buf = fs.readFileSync(FILE)
console.log('file      :', FILE)
console.log('size      :', (buf.length / 1048576).toFixed(2), 'MB')

/* ---- locate the end-of-central-directory record */
let eocd = -1
for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
}
if (eocd < 0) { console.log('❌ no EOCD found — not a plain zip'); process.exit(1) }
const cdCount = buf.readUInt16LE(eocd + 10)
const cdSize = buf.readUInt32LE(eocd + 12)
const cdOffset = buf.readUInt32LE(eocd + 16)
const commentLen = buf.readUInt16LE(eocd + 20)
console.log('eocd at   :', eocd, '| comment', commentLen, '| entries', cdCount)
console.log('cd size   :', cdSize, '| cd offset', cdOffset)
const zip64Loc = buf.readUInt32LE(eocd - 20) === 0x07064b50
console.log('zip64     :', zip64Loc || cdOffset === 0xffffffff ? 'YES (EOCD64)' : 'no')

const base = eocd - cdSize - cdOffset
console.log('payload base offset:', base, '(entries must add this)')

/* ---- walk the central directory */
let p = eocd - cdSize
if (base < 0) { console.log('❌ negative base — weird layout'); }
const entries = []
while (p < eocd - 4 && buf.readUInt32LE(p) === 0x02014b50) {
  const method = buf.readUInt16LE(p + 10)
  const flags = buf.readUInt16LE(p + 8)
  const crc = buf.readUInt32LE(p + 16)
  const csize = buf.readUInt32LE(p + 20)
  const usize = buf.readUInt32LE(p + 24)
  const nlen = buf.readUInt16LE(p + 28)
  const elen = buf.readUInt16LE(p + 30)
  const clen = buf.readUInt16LE(p + 32)
  const lho = buf.readUInt32LE(p + 42)
  const name = buf.toString('utf8', p + 46, p + 46 + nlen)
  entries.push({ name, method, flags, crc, csize, usize, lho })
  p += 46 + nlen + elen + clen
}
console.log('walked    :', entries.length, 'entries')
console.log('methods   :', [...new Set(entries.map((e) => e.method))].join(', '), '(0=store, 8=deflate)')
console.log('flags     :', [...new Set(entries.map((e) => e.flags))].join(', '), '(bit0 = encrypted)')
console.log('total raw :', (entries.reduce((a, e) => a + e.usize, 0) / 1048576).toFixed(2), 'MB uncompressed')

const byExt = {}
for (const e of entries) {
  const ext = (e.name.match(/\.[^.]+$/) || ['(none)'])[0].toLowerCase()
  byExt[ext] = (byExt[ext] || 0) + 1
}
console.log('by ext    :', JSON.stringify(byExt))

console.log('\nfirst 25 entries:')
for (const e of entries.slice(0, 25)) console.log('  ', e.method, String(e.usize).padStart(9), e.name)
console.log('\nroots:')
const roots = [...new Set(entries.map((e) => e.name.split('/')[0]))]
for (const r of roots.slice(0, 20)) {
  const n = entries.filter((e) => e.name === r || e.name.startsWith(r + '/')).length
  const isDir = !entries.some((e) => e.name === r)
  console.log('  ', isDir ? '[dir] ' : '[file]', r, '(' + n + ' entries)')
}
console.log('total roots:', roots.length)
const manifests = entries.filter((e) => /(^|\/)manifest\.json$/i.test(e.name))
console.log('\nmanifest.json found at:', manifests.map((m) => m.name).join(', ') || 'NONE')

/* ---- now run the real importer against it */
global.window = { __BALATRO_DATA__: JSON.parse(fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8')) }
new Function(fs.readFileSync(path.join(W, 'lua.js'), 'utf8'))()
new Function(fs.readFileSync(path.join(W, 'modimport.js'), 'utf8'))()

;(async () => {
  const t0 = Date.now()
  let files
  try {
    files = await window.__MODIMPORT__.readZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  } catch (e) {
    console.log('\n❌ readZip threw:', e.message)
    return
  }
  console.log('\nreadZip   :', files.size, 'files in', Date.now() - t0, 'ms')
  const P = window.__MODIMPORT__.parseMod(files, 'Cryptid')
  console.log('id        :', P.id, '| prefix:', P.prefix, '| name:', P.name, '| root:', JSON.stringify(P.root))
  console.log('stats     :', JSON.stringify(P.stats))
  console.log('types     :', P.types.map((t) => t.key).join(', ') || '(none)')
  console.log('atlases   :', P.atlases.length, P.atlases.slice(0, 8).map((a) => a.key).join(', '))
  console.log('items     :', P.items.length)
  const byCat = {}
  for (const it of P.items) byCat[it.cat] = (byCat[it.cat] || 0) + 1
  console.log('by cat    :', JSON.stringify(byCat))
  console.log('sample    :')
  for (const it of P.items.slice(0, 12)) console.log('   ', it.id, '|', it.cat, '|', it.atlas, '|', it.pos ? it.pos.x + ',' + it.pos.y : '-', '|', it.name)
  console.log('\nwarnings (' + P.warnings.length + '):')
  for (const w of P.warnings.slice(0, 30)) console.log('  · ' + w)
  console.log('\ntotal time:', Date.now() - t0, 'ms')
})()
