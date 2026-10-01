/* ============================================================================
 * ogimage.js — draw the site's share card (1200×630 PNG) from pure code.
 *
 * Deliberately contains NO game artwork: it is shapes + a 5×7 pixel font in the
 * viewer's own palette, so the card can be published with the public build.
 *
 *   node .work/ogimage.js            → writes dist/lite/og.png (and dist/web/)
 * ==========================================================================*/
'use strict'
const fs = require('fs')
const path = require('path')
const { encode, decode } = require('./png.js')

const W = 1200, H = 630, SS = 2                     // supersample factor
const BW = W * SS, BH = H * SS
const buf = Buffer.alloc(BW * BH * 4)

/* The two text lines are parameters, so the same drawing serves the viewer card
   ("BALATRO" / "ASSET VIEWER") and the toolbox card ("ASSET TOOLKIT" / …). */
const args = process.argv.slice(2)
const L1 = args[0] || 'BALATRO'
const L2 = args[1] || 'ASSET VIEWER'

/* ---- palette (same tokens as app.css) ------------------------------------------ */
const C = {
  bg: [0x10, 0x16, 0x1c], bg2: [0x15, 0x1d, 0x25], bg3: [0x1b, 0x24, 0x2e],
  line: [0x26, 0x31, 0x3d], fg: [0xdf, 0xe7, 0xee], fg2: [0x9f, 0xb0, 0xc0],
  green: [0x4b, 0xc2, 0x92], blue: [0x00, 0x9d, 0xff], red: [0xfe, 0x5f, 0x55],
  gold: [0xf3, 0xb9, 0x58], purple: [0xa7, 0x82, 0xd1], dark: [0x0a, 0x0f, 0x13],
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function put (x, y, col, a) {
  if (a <= 0 || x < 0 || y < 0 || x >= BW || y >= BH) return
  const i = (y * BW + x) * 4
  const ia = 1 - a
  buf[i] = col[0] * a + buf[i] * ia
  buf[i + 1] = col[1] * a + buf[i + 1] * ia
  buf[i + 2] = col[2] * a + buf[i + 2] * ia
  buf[i + 3] = 255
}

/** Signed distance to a rounded rectangle centred at (cx,cy), optionally rotated. */
function sdRoundRect (px, py, cx, cy, hw, hh, r, rot) {
  let x = px - cx, y = py - cy
  if (rot) {
    const c = Math.cos(-rot), s = Math.sin(-rot)
    const x2 = x * c - y * s, y2 = x * s + y * c
    x = x2; y = y2
  }
  const qx = Math.abs(x) - (hw - r), qy = Math.abs(y) - (hh - r)
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

const rect = (cx, cy, hw, hh, r, col, rot, alpha) => {
  const x0 = Math.max(0, Math.floor((cx - hw - hh) * SS) - 2), x1 = Math.min(BW - 1, Math.ceil((cx + hw + hh) * SS) + 2)
  const y0 = Math.max(0, Math.floor((cy - hw - hh) * SS) - 2), y1 = Math.min(BH - 1, Math.ceil((cy + hw + hh) * SS) + 2)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = sdRoundRect(x / SS, y / SS, cx, cy, hw, hh, r, rot || 0)
      put(x, y, col, clamp01(0.5 - d) * (alpha === undefined ? 1 : alpha))
    }
  }
}

/* ---- background: vertical gradient + two soft glows + a faint dot grid --------- */
for (let y = 0; y < BH; y++) {
  const t = y / BH
  const col = t < 0.55 ? mix(C.bg2, C.bg, t / 0.55) : mix(C.bg, C.dark, (t - 0.55) / 0.45)
  for (let x = 0; x < BW; x++) put(x, y, col, 1)
}
const glow = (gx, gy, gr, col, strength) => {
  const x0 = Math.max(0, Math.floor((gx - gr) * SS)), x1 = Math.min(BW - 1, Math.ceil((gx + gr) * SS))
  const y0 = Math.max(0, Math.floor((gy - gr) * SS)), y1 = Math.min(BH - 1, Math.ceil((gy + gr) * SS))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x / SS - gx, y / SS - gy) / gr
      if (d < 1) put(x, y, col, (1 - d) * (1 - d) * strength)
    }
  }
}
glow(250, 90, 620, C.blue, 0.20)
glow(1010, 70, 520, C.purple, 0.16)
glow(600, 700, 700, C.green, 0.10)
for (let y = 0; y < BH; y += 34 * SS) {
  for (let x = 0; x < BW; x += 34 * SS) put(x, y, C.fg2, 0.05)
}

/* ---- three cards: two rotated behind, one upright with the green frame -------- */
rect(430, 315, 150, 205, 18, C.line, -0.12)
rect(390, 320, 150, 205, 18, mix(C.bg3, C.fg2, 0.12), 0.10)
// front card
rect(330, 315, 150, 205, 18, C.dark, 0)
rect(330, 315, 143, 198, 15, C.green, 0)
rect(330, 315, 131, 186, 11, C.bg3, 0)
// inner "art" panel + three chip bars, so it reads as a card and not a blank slab
rect(330, 262, 112, 120, 8, mix(C.bg, C.green, 0.10), 0)
rect(330, 262, 112, 120, 8, C.green, 0, 0, 0.35)
const chips = [[C.red, 0.30], [C.gold, 0.55], [C.blue, 0.80]]
chips.forEach(([col, r], i) => {
  const cx = 330 + (i - 1) * 78
  rect(cx, 262, 33, 33, 33, col, 0, 0.95)
  rect(cx, 262, 24, 24, 24, mix(col, C.dark, 0.45), 0, 0.9)
  void r
})
rect(330, 398, 96, 10, 5, mix(C.bg2, C.fg2, 0.25))
rect(330, 428, 66, 10, 5, mix(C.bg2, C.fg2, 0.16))

/* ---- 5×7 pixel font — A–Z minus the letters nobody needs yet ------------------ */
const F = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}
const textWidth = (s, sc) => s.length * 6 * sc - sc
function text (s, x, y, sc, col) {
  let cx = x
  for (const ch of s.toUpperCase()) {
    const g = F[ch]
    if (g) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r][c] === '1') rect(cx + c * sc + sc / 2, y + r * sc + sc / 2, sc / 2, sc / 2, 0, col)
        }
      }
    }
    cx += 6 * sc
  }
  return cx
}

const TX = 620
const t1 = 13, t2 = 6
text(L1, TX, 196, t1, C.fg)
const w2 = textWidth(L2, t2)
text(L2, TX, 196 + 7 * t1 + 26, t2, C.green)
/* an underline the width of the second line, then a row of accent dots */
rect(TX + w2 / 2, 196 + 7 * t1 + 26 + 7 * t2 + 34, w2 / 2, 2, 2, C.green, 0, 0.5)
const dots = [C.green, C.blue, C.gold, C.red, C.purple]
dots.forEach((col, i) => rect(TX + 14 + i * 46, 196 + 7 * t1 + 26 + 7 * t2 + 96, 11, 11, 11, col, 0, 0.9))
rect(TX + 14 + 5 * 46 + 6, 196 + 7 * t1 + 26 + 7 * t2 + 96, 74, 9, 4.5, mix(C.bg2, C.fg2, 0.3))

/* ---- downsample SS×SS → 1× with a box filter ---------------------------------- */
const out = Buffer.alloc(W * H * 4)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const i = ((y * SS + dy) * BW + (x * SS + dx)) * 4
        r += buf[i]; g += buf[i + 1]; b += buf[i + 2]
      }
    }
    const n = SS * SS, o = (y * W + x) * 4
    out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n); out[o + 3] = 255
  }
}

const png = encode({ width: W, height: H, data: out })

if (require.main === module) {
  /* No directory argument → refresh the two standalone builds. site.js imports `png`
     instead (it draws its own card with the toolbox wording). */
  const dirs = args.filter((a) => !/^--/.test(a)).slice(2)
  for (const d of (dirs.length ? dirs : ['dist/lite', 'dist/web'])) {
    const dir = path.join(__dirname, '..', d)
    if (!fs.existsSync(dir)) continue
    fs.writeFileSync(path.join(dir, 'og.png'), png)
    console.log('wrote', path.join(d, 'og.png'), (png.length / 1024).toFixed(1) + ' KB', W + '×' + H, '“' + L1 + '”')
  }
  // self-check: decode it back and make sure it is a real, non-blank image
  const back = decode(png)
  let sum = 0
  for (let i = 0; i < back.data.length; i += 4) sum += back.data[i] + back.data[i + 1] + back.data[i + 2]
  console.log('校验:', back.width + '×' + back.height, '平均亮度', (sum / (back.data.length / 4) / 3).toFixed(1))
}

module.exports = { png, draw: () => png }
