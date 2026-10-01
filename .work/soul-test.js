// Verify the "floating overlay" mechanism: legendary jokers (soul_pos) and The Soul
// spectral card both draw a SECOND sprite on top of the card.
'use strict'
const fs = require('fs')
const path = require('path')
const png = require('./png')

const TEX = path.join(__dirname, 'love/resources/textures/2x')
const OUT = path.join(__dirname, 'debug')
fs.mkdirSync(OUT, { recursive: true })
const S = 2
const PX = 71, PY = 95

function tile (file, x, y) {
  const img = png.decode(fs.readFileSync(path.join(TEX, file)))
  return png.crop(img, x * PX * S, y * PY * S, PX * S, PY * S)
}
function over (base, top) {
  const out = Buffer.from(base.data)
  for (let i = 0; i < out.length; i += 4) {
    const a = top.data[i + 3] / 255
    if (a <= 0) continue
    out[i] = Math.round(top.data[i] * a + out[i] * (1 - a))
    out[i + 1] = Math.round(top.data[i + 1] * a + out[i + 1] * (1 - a))
    out[i + 2] = Math.round(top.data[i + 2] * a + out[i + 2] * (1 - a))
    out[i + 3] = Math.round(Math.min(255, top.data[i + 3] + out[i + 3] * (1 - a)))
  }
  return { width: base.width, height: base.height, data: out }
}
function scaled (img, k) {
  const w = Math.round(img.width * k), h = Math.round(img.height * k)
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(img.width - 1, Math.floor(x / k)), sy = Math.min(img.height - 1, Math.floor(y / k))
    const s = (sy * img.width + sx) * 4, d = (y * w + x) * 4
    out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3]
  }
  return { width: w, height: h, data: out }
}
function sheet (tiles, cols, gap = 8) {
  const w = tiles[0].width, h = tiles[0].height
  const rows = Math.ceil(tiles.length / cols)
  const W = cols * w + (cols + 1) * gap, H = rows * h + (rows + 1) * gap
  const data = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) { data[i * 4] = 55; data[i * 4 + 1] = 55; data[i * 4 + 2] = 65; data[i * 4 + 3] = 255 }
  tiles.forEach((t, i) => {
    const cx = gap + (i % cols) * (w + gap), cy = gap + Math.floor(i / cols) * (h + gap)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = ((cy + y) * W + (cx + x)) * 4
      const a = t.data[s + 3] / 255
      data[d] = Math.round(t.data[s] * a + data[d] * (1 - a))
      data[d + 1] = Math.round(t.data[s + 1] * a + data[d + 1] * (1 - a))
      data[d + 2] = Math.round(t.data[s + 2] * a + data[d + 2] * (1 - a))
      data[d + 3] = 255
    }
  })
  return { width: W, height: H, data }
}

// --- legendary jokers: base (y=8) vs floating layer (y=9) ------------------
const legends = [['j_caino', 3], ['j_triboulet', 4], ['j_yorick', 5], ['j_chicot', 6], ['j_perkeo', 7]]
const cmpSheet = []
for (const [, x] of legends) {
  cmpSheet.push(tile('Jokers.png', x, 8))          // 1. base card
  cmpSheet.push(tile('Jokers.png', x, 9))          // 2. floating layer alone
  cmpSheet.push(over(tile('Jokers.png', x, 8), tile('Jokers.png', x, 9))) // 3. composited
}
fs.writeFileSync(path.join(OUT, 'legends-base-soul-composed.png'), png.encode(sheet(cmpSheet, 3)))

// --- The Soul spectral card + the shared "soul" sprite from Enhancers {0,1} -
const soul = []
soul.push(tile('Tarots.png', 2, 2))                          // The Soul card body
soul.push(tile('Enhancers.png', 0, 1))                       // shared_soul overlay
soul.push(over(tile('Tarots.png', 2, 2), tile('Enhancers.png', 0, 1))) // composited
soul.push(tile('Tarots.png', 9, 3))                          // Black Hole (other hidden spectral)
fs.writeFileSync(path.join(OUT, 'the-soul-composed.png'), png.encode(sheet(soul, 4)))

// --- entire Jokers row 9 (where the floating art lives) --------------------
const row9 = []
for (let x = 0; x < 10; x++) row9.push(tile('Jokers.png', x, 9))
fs.writeFileSync(path.join(OUT, 'jokers-row9.png'), png.encode(sheet(row9, 10)))

console.log('wrote debug composites: legends-base-soul-composed.png, the-soul-composed.png, jokers-row9.png')
