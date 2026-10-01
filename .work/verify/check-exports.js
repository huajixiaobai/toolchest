// Validates the blobs captured from the in-page export functions.
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const rep = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp-report.json'), 'utf8'))
const blobs = (rep.export && rep.export.rep && rep.export.rep.blobs) || []
console.log('captured exports:', blobs.length)

const OUT = path.join(__dirname, 'export-check')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

function pngInfo (u8) {
  if (u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4e || u8[3] !== 0x47) return null
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  return { w: dv.getUint32(16), h: dv.getUint32(20), bitDepth: u8[24], colorType: u8[25] }
}

/** Parse a store-method zip and return its entries. */
function unzip (u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  let eocd = -1
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 70000; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break } }
  if (eocd < 0) throw new Error('no EOCD')
  const count = dv.getUint16(eocd + 10, true)
  const cdSize = dv.getUint32(eocd + 12, true)
  const cdOff = dv.getUint32(eocd + 16, true)
  const files = []
  let p = cdOff
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad central header at ' + i)
    const method = dv.getUint16(p + 10, true)
    const crc = dv.getUint32(p + 16, true)
    const csize = dv.getUint32(p + 20, true)
    const usize = dv.getUint32(p + 24, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const cmtLen = dv.getUint16(p + 32, true)
    const lho = dv.getUint32(p + 42, true)
    const name = Buffer.from(u8.subarray(p + 46, p + 46 + nameLen)).toString('utf8')
    const nameLen2 = dv.getUint16(lho + 26, true)
    const extraLen2 = dv.getUint16(lho + 28, true)
    const start = lho + 30 + nameLen2 + extraLen2
    const raw = u8.subarray(start, start + csize)
    const data = method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw)
    const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
    let c2 = 0xffffffff
    for (let k = 0; k < data.length; k++) c2 = CRC[(c2 ^ data[k]) & 0xff] ^ (c2 >>> 8)
    c2 = (c2 ^ 0xffffffff) >>> 0
    files.push({ name, method, usize, csize, crcOk: c2 === crc, data })
    p += 46 + nameLen + extraLen + cmtLen
  }
  return files
}

let pass = 0; let fail = 0
const ok = (m) => { console.log('  ✅ ' + m); pass++ }
const no = (m) => { console.log('  ❌ ' + m); fail++ }

for (const b of blobs) {
  const u8 = b.b64 ? new Uint8Array(Buffer.from(b.b64, 'base64')) : null
  const label = `${b.name} (${(b.size / 1024).toFixed(1)} KB)`
  console.log('\n· ' + label)
  if (!u8) { console.log('  (too large to inspect inline)'); continue }
  const sig = b.magic.map((x) => x.toString(16).padStart(2, '0')).join(' ')
  if (sig.startsWith('89 50 4e 47')) {
    const info = pngInfo(u8)
    fs.writeFileSync(path.join(OUT, b.name || 'out.png'), Buffer.from(u8))
    if (info && info.w > 0) ok(`PNG ${info.w}x${info.h} colorType=${info.colorType} (alpha=${info.colorType === 6})`); else no('bad PNG header')
  } else if (sig.startsWith('50 4b 03 04')) {
    try {
      const files = unzip(u8)
      const names = files.map((f) => f.name)
      const pngs = files.filter((f) => f.name.endsWith('.png'))
      const badCrc = files.filter((f) => !f.crcOk)
      const badPng = pngs.filter((f) => { const i = pngInfo(new Uint8Array(f.data)); return !i || !i.w })
      const manifest = files.find((f) => f.name === 'manifest.json')
      const csv = files.find((f) => f.name === 'data.csv')
      const readme = files.find((f) => f.name === 'README.txt')
      fs.writeFileSync(path.join(OUT, b.name || 'bundle.zip'), Buffer.from(u8))
      ok(`ZIP with ${files.length} entries; eocd=${b.tail.map((x) => x.toString(16)).join(' ')}`)
      ok(`  entries: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ', …' : ''}`)
      if (!files.length) no('empty zip')
      if (badCrc.length) no('CRC mismatch: ' + badCrc.map((f) => f.name).join(',')); else ok(`all ${files.length} CRCs verified`)
      if (pngs.length && badPng.length) no('bad png inside zip: ' + badPng.map((f) => f.name).join(',')); else ok(`${pngs.length} PNGs parsed from the zip (${pngs.map((f) => pngInfo(new Uint8Array(f.data)).w + 'x' + pngInfo(new Uint8Array(f.data)).h).slice(0, 3).join(', ')})`)
      if (manifest) { const j = JSON.parse(manifest.data.toString('utf8')); ok(`manifest.json: ${j.count} items, first=${j.items[0].id}, keys=${Object.keys(j.items[0]).length}`) } else if (files.some((f) => f.name.endsWith('.json'))) ok('single-item bundle (png + json, no manifest — by design)'); else no('manifest.json missing')
      if (csv) ok('data.csv: ' + csv.data.toString('utf8').split(/\r?\n/).length + ' lines') ; if (readme) ok('README.txt present')
    } catch (e) { no('zip parse failed: ' + e.message) }
  } else if (b.name.endsWith('.csv')) {
    const txt = Buffer.from(u8).toString('utf8').replace(/^\ufeff/, '')
    const lines = txt.split(/\r?\n/)
    const cols = lines[0].split(',')
    fs.writeFileSync(path.join(OUT, b.name), txt)
    if (cols.length >= 15 && lines.length >= 2 && lines[0].startsWith('id,')) ok(`CSV: ${lines.length - 1} rows x ${cols.length} cols`); else no('CSV looks wrong: ' + lines[0].slice(0, 120))
  } else if (b.name.endsWith('.json')) {
    const txt = Buffer.from(u8).toString('utf8').replace(/^\ufeff/, '')
    try { const j = JSON.parse(txt); fs.writeFileSync(path.join(OUT, b.name), txt); ok(`JSON: ${j.items.length} items, meta.version=${j.meta.version}`) } catch (e) { no('JSON parse failed') }
  } else if (b.name.endsWith('.md')) {
    const txt = Buffer.from(u8).toString('utf8').replace(/^\ufeff/, '')
    fs.writeFileSync(path.join(OUT, b.name), txt)
    ok('Markdown: ' + txt.split('\r\n').length + ' lines, header=' + txt.split('\r\n')[2].slice(0, 60))
  } else if (b.name.endsWith('.svg')) {
    const txt = Buffer.from(u8).toString('utf8')
    fs.writeFileSync(path.join(OUT, b.name), txt)
    if (txt.startsWith('<svg') && txt.includes('data:image/png;base64,')) ok('SVG wraps a ' + Math.round((txt.length - 200) / 1024) + ' KB base64 PNG'); else no('SVG malformed')
  } else {
    console.log('  ?', sig, b.name)
  }
}
console.log(`\n==== ${pass} passed, ${fail} failed ====`)
console.log('artifacts in', OUT)
process.exit(fail ? 1 : 0)
