// Decode the exported GIF with an INDEPENDENT library (omggif) and check the frames differ.
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { GifReader } = require('omggif')

const rep = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp-report.json'), 'utf8'))
const p = (rep.gif3d && rep.gif3d.rep) || {}
let pass = 0; let fail = 0
const ok = (m) => { console.log('  ✅ ' + m); pass++ }
const no = (m) => { console.log('  ❌ ' + m); fail++ }

const OUT = path.join(__dirname, 'gif-check')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

function check (b64, label, expectTransparent) {
  if (!b64) { no(`${label}: no data captured`); return }
  const u8 = new Uint8Array(Buffer.from(b64, 'base64'))
  const r = new GifReader(Buffer.from(u8))
  const w = r.width; const h = r.height; const n = r.numFrames()
  const rgba = new Uint8Array(w * h * 4)
  const hashes = []
  let transparentPixels = 0
  for (let i = 0; i < n; i++) {
    r.decodeAndBlitFrameRGBA(i, rgba)
    hashes.push(crypto.createHash('md5').update(Buffer.from(rgba)).digest('hex').slice(0, 10))
    let t = 0
    for (let k = 3; k < rgba.length; k += 4) if (rgba[k] < 8) t++
    transparentPixels = Math.max(transparentPixels, t)
  }
  const distinct = new Set(hashes).size
  console.log(`\n· ${label}: ${w}x${h}, ${n} frames, ${(u8.length / 1024).toFixed(1)} KB`)
  if (n < 2) no('fewer than 2 frames'); else ok(`${n} frames decoded by omggif`)
  if (distinct > 1) ok(`${distinct} distinct frames -> real animation`); else no('all frames identical')
  if (expectTransparent) {
    if (transparentPixels > 0) ok(`${(transparentPixels / (w * h) * 100).toFixed(1)}% transparent pixels preserved`)
    else no('expected a transparent index but every pixel is opaque')
  }
  const frame = (i) => { r.decodeAndBlitFrameRGBA(i, rgba); return Uint8Array.from(rgba) }
  if (frame(0).length !== frame(1).length) no('frame size mismatch')
  fs.writeFileSync(path.join(OUT, label.replace(/[^\w]/g, '_') + '.gif'), Buffer.from(u8))
}

console.log('frames rendered distinctly in the page:', p.frameDistinct, '/ 16')
check(p.gifTransparentB64, 'GIF transparent', true)
check(p.gifDarkB64, 'GIF dark background', false)
check(p.gifFoilB64, 'GIF foil (gradient heavy)', true)

// 3D preview was removed on request — the original game has no multi-angle view.
console.log('\n· 3D preview')
if (p.hasTilt === 'undefined') ok('removed from the build (tiltRender is undefined)')
else no('tiltRender is still exposed: ' + p.hasTilt)
console.log(`\n==== ${pass} passed, ${fail} failed ====`)
process.exit(fail ? 1 : 0)
