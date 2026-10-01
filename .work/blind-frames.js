// How many of the 21 BlindChips animation frames are actually unique?
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const png = require('./png')

const TEX = path.join(__dirname, 'love/resources/textures/2x/BlindChips.png')
const img = png.decode(fs.readFileSync(TEX))
const PX = 34 * 2, PY = 34 * 2
const cols = Math.floor(img.width / PX)

function hashTile (x, y) {
  const h = crypto.createHash('md5')
  for (let j = 0; j < PY; j++) {
    const row = (y * PY + j) * img.width * 4
    h.update(Buffer.from(img.data.buffer, img.data.byteOffset + row + x * PX * 4, PX * 4))
  }
  return h.digest('hex').slice(0, 10)
}

for (const [label, row] of [['bl_small (row 0)', 0], ['bl_big (row 1)', 1], ['bl_ox (row 2)', 2]]) {
  const hashes = []
  for (let x = 0; x < 21; x++) hashes.push(hashTile(x, row))
  const uniq = new Set(hashes)
  console.log(`${label}: ${uniq.size} unique / 21 frames`)
  console.log('   ' + hashes.map((h, i) => `${i}:${h}`).join(' '))
}
