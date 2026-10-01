// One-off: drop the impossible eternal+perishable combo from the sticker test and
// replace it with a same-slot assertion instead.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')
const before = s
s = s.replace("all_three:['eternal','perishable','rental'],", '')
const oldLine = '     r.allThreeVsPerishableRental=__V.diff(canvases.all_three,canvases.perishable_rental);'
const newLines = [
  '     // eternal and perishable are painted into the SAME slot on the card, which is',
  '     // exactly why the game forbids them from coexisting — assert that here.',
  '     const be=__V.bbox(canvases.eternal), bp=__V.bbox(canvases.perishable), br=__V.bbox(canvases.rental), bg=__V.bbox(canvases.eternal_rental_gold);',
  '     r.slots={ sameSlotEternalPerishable: !!(be&&bp&&be.x0===bp.x0&&be.y0===bp.y0&&be.x1===bp.x1&&be.y1===bp.y1),',
  '                rentalIsSeparate: !!(br&&be&&(br.y0!==be.y0||br.x0!==be.x0)),',
  '                colouredIsSeparate: !!(bg&&be&&(bg.x1!==be.x1||bg.y1!==be.y1)),',
  '                eternalBox:be, perishableBox:bp, rentalBox:br };',
]
if (!s.includes(oldLine)) { console.log('marker not found'); process.exit(1) }
s = s.replace(oldLine, newLines.join('\n'))
fs.writeFileSync(f, s)
console.log('patched:', before !== s)
