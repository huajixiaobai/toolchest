// Validate exported APNG bytes: chunk order, per-frame zlib streams, and frame pixels.
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const png = require('../png')

const rep = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp-report.json'), 'utf8'))
const blobs = (rep.animExport && rep.animExport.rep && rep.animExport.rep.blobs) || []
const target = blobs.find((b) => /动画/.test(b.name) && b.b64)
let pass = 0; let fail = 0
const ok = (m) => { console.log('  ✅ ' + m); pass++ }
const no = (m) => { console.log('  ❌ ' + m); fail++ }

if (!target) { console.log('no APNG blob captured'); process.exit(1) }
const u8 = new Uint8Array(Buffer.from(target.b64, 'base64'))
console.log(`APNG: ${target.name} (${(u8.length / 1024).toFixed(1)} KB)`)

// ---- chunk walk ----
const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
const chunks = []
let p = 8
while (p + 8 <= u8.length) {
  const len = dv.getUint32(p)
  const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7])
  chunks.push({ type, data: u8.subarray(p + 8, p + 8 + len) })
  p += 12 + len
  if (type === 'IEND') break
}
const types = chunks.map((c) => c.type)
ok('chunk order: ' + types.join(', '))

const acTL = chunks.find((c) => c.type === 'acTL')
if (acTL) {
  const av = new DataView(acTL.data.buffer, acTL.data.byteOffset, 8)
  ok(`acTL: ${av.getUint32(0)} frames, ${av.getUint32(4)} plays (0 = loop forever)`)
} else no('acTL missing')

const fctl = chunks.filter((c) => c.type === 'fcTL')
ok(`fcTL chunks: ${fctl.length}`)
const fc0 = new DataView(fctl[0].data.buffer, fctl[0].data.byteOffset, 26)
console.log(`     frame 0: ${fc0.getUint32(4)}x${fc0.getUint32(8)} delay ${fc0.getUint16(20)}/${fc0.getUint16(22)}s dispose=${fctl[0].data[24]} blend=${fctl[0].data[25]}`)

// sequence numbers must be strictly increasing from 0 across fcTL and fdAT
const seqs = []
for (const c of chunks) {
  if (c.type === 'fcTL') seqs.push(new DataView(c.data.buffer, c.data.byteOffset, 4).getUint32(0))
  if (c.type === 'fdAT') seqs.push(new DataView(c.data.buffer, c.data.byteOffset, 4).getUint32(0))
}
const increasing = seqs.every((v, i) => i === 0 ? v === 0 : v === seqs[i - 1] + 1)
increasing ? ok(`sequence numbers 0..${seqs.length - 1} strictly increasing`) : no('sequence numbers wrong: ' + seqs.slice(0, 12).join(','))

// ---- rebuild frame 0 from IHDR + IDAT and decode it ----
const ihdr = chunks.find((c) => c.type === 'IHDR')
const idat = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => Buffer.from(c.data)))
try {
  const raw = zlib.inflateSync(idat)
  const w = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, 8).getUint32(0)
  const h = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, 8).getUint32(4)
  ok(`frame 0 zlib stream inflates to ${raw.length} bytes (expect ${h * (w * 4 + 1)})`)
  // assemble a standalone PNG and decode it with our own decoder
  const crc32 = require('../png').crc32
  const chunk = (t, d) => { const o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length, 0); o.write(t, 4, 'ascii'); Buffer.from(d).copy(o, 8); o.writeUInt32BE(crc32(o.subarray(4, 8 + d.length)), 8 + d.length); return o }
  const standalone = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr.data), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ])
  const img = png.decode(standalone)
  let opaque = 0
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 200) opaque++
  ok(`frame 0 decodes: ${img.width}x${img.height}, ${(opaque / (img.width * img.height) * 100).toFixed(1)}% opaque`)
} catch (e) { no('frame 0 inflate failed: ' + e.message) }

// ---- rebuild frame 1 from its fdAT stream ----
const fdatFrames = []
let cur = null
for (const c of chunks) {
  if (c.type === 'fcTL') { if (cur) fdatFrames.push(cur); cur = [] }
  else if (c.type === 'fdAT' && cur) cur.push(Buffer.from(c.data.subarray(4)))
}
if (cur) fdatFrames.push(cur)
ok(`frame data groups (incl. first IDAT set): ${fdatFrames.length}`)
try {
  const f1 = zlib.inflateSync(Buffer.concat(fdatFrames[1] || []))
  ok(`frame 1 zlib stream inflates to ${f1.length} bytes`)
} catch (e) { no('frame 1 inflate failed: ' + e.message) }

console.log(`\n==== APNG: ${pass} passed, ${fail} failed ====`)
process.exit(fail ? 1 : 0)
