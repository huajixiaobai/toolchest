// Compose a card the way the game does (center sprite + front sprite) and dump it,
// so the visual result can be verified independently.
const fs = require('fs')
const path = require('path')
const png = require('./png')

const TEX = path.join(__dirname, 'love/resources/textures/2x')
const OUT = path.join(__dirname, 'debug')
fs.mkdirSync(OUT, { recursive: true })

const PX = 71; const PY = 95; const S = 2 // 2x textures

function tile (atlasFile, x, y) {
  const img = png.decode(fs.readFileSync(path.join(TEX, atlasFile)))
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

function sheet (tiles, cols, gap = 6) {
  const w = tiles[0].width; const h = tiles[0].height
  const rows = Math.ceil(tiles.length / cols)
  const W = cols * w + (cols + 1) * gap
  const H = rows * h + (rows + 1) * gap
  const data = Buffer.alloc(W * H * 4)
  // mid grey background so transparency is visible
  for (let i = 0; i < W * H; i++) { data[i * 4] = 60; data[i * 4 + 1] = 60; data[i * 4 + 2] = 70; data[i * 4 + 3] = 255 }
  tiles.forEach((t, i) => {
    const cx = gap + (i % cols) * (w + gap)
    const cy = gap + Math.floor(i / cols) * (h + gap)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4
        const d = ((cy + y) * W + (cx + x)) * 4
        const a = t.data[s + 3] / 255
        data[d] = Math.round(t.data[s] * a + data[d] * (1 - a))
        data[d + 1] = Math.round(t.data[s + 1] * a + data[d + 1] * (1 - a))
        data[d + 2] = Math.round(t.data[s + 2] * a + data[d + 2] * (1 - a))
        data[d + 3] = 255
      }
    }
  })
  return { width: W, height: H, data }
}

const ACE_SPADES = [12, 3]   // P_CARDS S_A
const THREE_HEART = [1, 0]   // P_CARDS H_3

// Enhancement centers (Enhancers.png / 'centers' atlas) per game.lua P_CENTERS
const enh = [
  ['c_base', 1, 0], ['m_bonus', 1, 1], ['m_mult', 2, 1], ['m_wild', 3, 1],
  ['m_lucky', 4, 1], ['m_glass', 5, 1], ['m_steel', 6, 1], ['m_stone', 5, 0],
  ['m_gold', 6, 0], ['unknown_0_1', 0, 1],
]

const out = []
for (const [, x, y] of enh) {
  const center = tile('Enhancers.png', x, y)
  const front = tile('8BitDeck.png', ACE_SPADES[0], ACE_SPADES[1])
  out.push(over(center, front))
}
fs.writeFileSync(path.join(OUT, 'compose-enh-acespades.png'), png.encode(sheet(out, 5)))

// plain card body + seal + sticker stack
const sealed = []
for (const [sx, sy] of [[2, 0], [4, 4], [5, 4], [6, 4]]) {
  const center = over(tile('Enhancers.png', 6, 1), tile('Enhancers.png', sx, sy)) // steel card + seal
  sealed.push(over(center, tile('8BitDeck.png', 12, 3)))
}
fs.writeFileSync(path.join(OUT, 'compose-seals.png'), png.encode(sheet(sealed, 4)))

// plain card, no enhancement
fs.writeFileSync(path.join(OUT, 'compose-base.png'),
  png.encode(sheet([over(tile('Enhancers.png', 1, 0), tile('8BitDeck.png', 12, 3))], 1)))
fs.writeFileSync(path.join(OUT, 'compose-base-h3.png'),
  png.encode(sheet([over(tile('Enhancers.png', 1, 0), tile('8BitDeck.png', THREE_HEART[0], THREE_HEART[1]))], 1)))

console.log('written debug composites')
