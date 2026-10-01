// Per-tile alpha coverage report: tells us objectively whether an atlas cell is a
// full card body, a transparent overlay, or empty.
const fs = require('fs')
const path = require('path')
const png = require('./png')

const TEX = path.join(__dirname, 'love/resources/textures')

function report (file, px, py, label) {
  const img = png.decode(fs.readFileSync(path.join(TEX, file)))
  const cols = Math.floor(img.width / px)
  const rows = Math.floor(img.height / py)
  console.log(`\n### ${file} (${img.width}x${img.height}) ${label} grid ${cols}x${rows} tile ${px}x${py}`)
  for (let y = 0; y < rows; y++) {
    const cells = []
    for (let x = 0; x < cols; x++) {
      let opaque = 0; let partial = 0; let total = 0
      for (let j = 0; j < py; j++) {
        for (let i = 0; i < px; i++) {
          const a = img.data[((y * py + j) * img.width + (x * px + i)) * 4 + 3]
          total++
          if (a > 250) opaque++
          else if (a > 8) partial++
        }
      }
      const oc = opaque / total
      let tag
      if (oc > 0.75) tag = 'FULL'
      else if (oc > 0.02 || partial / total > 0.03) tag = 'part'
      else tag = '....'
      cells.push(`${String(x).padStart(2)}:${tag}${oc > 0.02 ? '(' + oc.toFixed(2) + ')' : ''}`)
    }
    console.log(`row${String(y).padStart(2)}  ` + cells.join('  '))
  }
}

report('1x/Enhancers.png', 71, 95, 'centers')
report('1x/8BitDeck.png', 71, 95, 'cards_1')
