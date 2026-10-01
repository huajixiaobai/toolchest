// Inspect every sticker tile so we know if a position is empty or duplicated.
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const png = require('./png')

const img = png.decode(fs.readFileSync(path.join(__dirname, 'love/resources/textures/2x/stickers.png')))
const PX = 71 * 2, PY = 95 * 2
const cols = Math.floor(img.width / PX), rows = Math.floor(img.height / PY)
console.log(`stickers.png ${img.width}x${img.height} -> ${cols}x${rows} tiles of ${PX}x${PY}`)

const POS = {
  eternal: [0, 0], perishable: [0, 2], rental: [1, 2],
  White: [1, 0], Red: [2, 0], Green: [3, 0], Black: [0, 1],
  Blue: [4, 0], Purple: [1, 1], Orange: [2, 1], Gold: [3, 1],
}
const byPos = {}
const hashes = {}
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const h = crypto.createHash('md5')
    let opaque = 0
    for (let j = 0; j < PY; j++) {
      const off = ((y * PY + j) * img.width + x * PX) * 4
      h.update(Buffer.from(img.data.buffer, img.data.byteOffset + off, PX * 4))
      for (let i = 0; i < PX; i++) if (img.data[off + i * 4 + 3] > 200) opaque++
    }
    const d = h.digest('hex').slice(0, 8)
    byPos[`${x},${y}`] = { d, pct: +(opaque / (PX * PY) * 100).toFixed(2) }
    ;(hashes[d] = hashes[d] || []).push(`${x},${y}`)
  }
}
for (const [name, [x, y]] of Object.entries(POS)) {
  const t = byPos[`${x},${y}`] || { d: '?', pct: -1 }
  const dup = hashes[t.d] || []
  console.log(`  ${name.padEnd(11)} (${x},${y})  hash=${t.d}  不透明=${String(t.pct).padStart(5)}%  同图: ${dup.join(' / ')}`)
}
