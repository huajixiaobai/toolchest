// Decode the exported APNG with an INDEPENDENT library (upng-js) to prove it really
// carries multiple, differing frames — my own chunk walker cannot prove that.
'use strict'
const fs = require('fs')
const path = require('path')
const UPNG = require('upng-js')

const files = process.argv.slice(2)
let pass = 0; let fail = 0
for (const f of files) {
  const name = path.basename(f)
  if (!fs.existsSync(f)) { console.log(`❌ ${name}: missing`); fail++; continue }
  const buf = fs.readFileSync(f)
  let img
  try { img = UPNG.decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)) } catch (e) { console.log(`❌ ${name}: decode failed — ${e.message}`); fail++; continue }
  const frames = UPNG.toRGBA8(img)
  console.log(`\n· ${name}  ${img.width}x${img.height}  frames=${frames.length}  ${img.frames ? img.frames.map((x) => x.delay).join(',') + ' ms' : ''}`)
  if (frames.length < 2) { console.log('  ❌ only one frame -> static'); fail++; continue }
  // hash each decoded frame and count distinct ones
  const crypto = require('crypto')
  const hs = frames.map((fr) => crypto.createHash('md5').update(Buffer.from(fr)).digest('hex').slice(0, 10))
  const distinct = new Set(hs).size
  console.log(`  decoded frame hashes: ${hs.slice(0, 6).join(' ')}${hs.length > 6 ? ' …' : ''}`)
  if (distinct > 1) { console.log(`  ✅ ${frames.length} frames, ${distinct} distinct -> real animation`); pass++ } else { console.log('  ❌ all frames identical'); fail++ }
  // sanity: non-transparent pixel count of frame 0
  const f0 = new Uint8Array(frames[0])
  let nz = 0
  for (let i = 3; i < f0.length; i += 4) if (f0[i] > 8) nz++
  console.log(`  frame 0 opaque coverage: ${(nz / (img.width * img.height) * 100).toFixed(1)}%`)
}
console.log(`\n==== upng-js decode: ${pass} animated, ${fail} static/broken ====`)
process.exit(fail ? 1 : 0)
