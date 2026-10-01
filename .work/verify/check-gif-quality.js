/* Decode the GIFs from gifQuality and report two error metrics:
     · per-pixel  — fine detail accuracy (dithering trades this away on purpose)
     · 4x4 block  — local average, i.e. what the eye actually integrates (this is where
                    dithering wins, by removing the visible bands) */
'use strict'
const fs = require('fs')
const path = require('path')
const { GifReader } = require(path.join(__dirname, '..', 'node_modules', 'omggif'))
const PNG = require(path.join(__dirname, '..', 'png.js'))
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp-report.json'), 'utf8'))
const rep = (R.gifQuality || {}).rep || {}
if (!rep.src) { console.log('no gifQuality report — run `node cdp.js gifQuality` first'); process.exit(0) }

const src = rep.src.map((d) => PNG.decode(Buffer.from(d.split(',')[1], 'base64')))
const decode = (buf, i) => {
  const gr = new GifReader(buf)
  const rgba = new Uint8Array(gr.width * gr.height * 4)
  gr.decodeAndBlitFrameRGBA(i, rgba)
  return { width: gr.width, height: gr.height, data: rgba }
}
const numFrames = (buf) => new GifReader(buf).numFrames()

function perPixel (a, b) {
  let sum = 0; let n = 0
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] < 128) continue
    sum += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
    n += 3
  }
  return n ? sum / n : 0
}
/** Average each 4x4 block, then compare — the eye's own low-pass filter. */
function blocked (a, b, k) {
  let sum = 0; let n = 0
  for (let y = 0; y + k <= a.height; y += k) {
    for (let x = 0; x + k <= a.width; x += k) {
      let ar = 0; let ag = 0; let ab = 0; let br = 0; let bg = 0; let bb = 0; let cnt = 0
      let opaque = false
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) {
          const i = ((y + dy) * a.width + (x + dx)) * 4
          if (a.data[i + 3] < 128) continue
          opaque = true
          ar += a.data[i]; ag += a.data[i + 1]; ab += a.data[i + 2]
          br += b.data[i]; bg += b.data[i + 1]; bb += b.data[i + 2]
          cnt++
        }
      }
      if (!opaque || !cnt) continue
      sum += Math.abs(ar / cnt - br / cnt) + Math.abs(ag / cnt - bg / cnt) + Math.abs(ab / cnt - bb / cnt)
      n += 3
    }
  }
  return n ? sum / n : 0
}

const rows = []
for (const [name, key, size] of [['256 色 + 抖动（默认）', 'dither', 256], ['256 色无抖动', 'plain', 256], ['128 色 + 抖动', 'c128', 128], ['64 色 + 抖动', 'c64', 64]]) {
  const rec = rep[key]
  if (!rec) continue
  const buf = Buffer.from(rec.b64, 'base64')
  const nf = numFrames(buf)
  let pp = 0; let bk = 0; let cnt = 0
  for (let i = 0; i < Math.min(nf, src.length); i++) {
    const f = decode(buf, i)
    pp += perPixel(src[i], f); bk += blocked(src[i], f, 4); cnt++
  }
  rows.push({ name, kb: +(rec.size / 1024).toFixed(1), frames: nf, pp: +(pp / cnt).toFixed(2), bk: +(bk / cnt).toFixed(2) })
}
console.log('timing (ms):', JSON.stringify(rep.times))
console.log('setting                     size     frames   per-pixel   4x4 block (越低越接近原图)')
for (const r of rows) console.log('  ' + r.name.padEnd(24) + String(r.kb + ' KB').padStart(9) + String(r.frames).padStart(8) + String(r.pp).padStart(11) + String(r.bk).padStart(13))
const p = rows.find((r) => r.name === '256 色无抖动')
const d = rows.find((r) => r.name.startsWith('256 色 + 抖动'))
if (p && d) {
  console.log('\n抖动 vs 不抖动：')
  console.log('  逐像素误差   ', p.pp, '→', d.pp, '（抖动本来就会牺牲逐像素精度）')
  console.log('  4x4 局部平均 ', p.bk, '→', d.bk, '=', (100 * (1 - d.bk / p.bk)).toFixed(1) + '% 更接近原图')
  console.log('  体积         ', p.kb, 'KB →', d.kb, 'KB')
}
const c64 = rows.find((r) => r.name.startsWith('64'))
if (c64 && p) console.log('\n64 色 + 抖动 的 4x4 误差', c64.bk, 'vs 256 色无抖动', p.bk, '→', (100 * (1 - c64.bk / p.bk)).toFixed(1) + '%')
