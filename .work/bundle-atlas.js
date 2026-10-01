// Inlines every 2x texture as a data URI so the viewer works offline from file://
// and can export PNGs from canvas without tainting it.
'use strict'
const fs = require('fs')
const path = require('path')

const TEX = path.join(__dirname, 'love/resources/textures/2x')
const OUT = path.join(__dirname, 'out')

const entries = {}
let bytes = 0
function walk (dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name
    if (e.isDirectory()) walk(path.join(dir, e.name), r)
    else if (e.name.toLowerCase().endsWith('.png')) {
      const buf = fs.readFileSync(path.join(dir, e.name))
      bytes += buf.length
      entries['2x/' + r] = 'data:image/png;base64,' + buf.toString('base64')
    }
  }
}
walk(TEX, '')

const js = 'window.__BALATRO_ATLAS__=' + JSON.stringify(entries) + ';\n'
fs.writeFileSync(path.join(OUT, 'atlas.js'), js)
console.log('textures:', Object.keys(entries).length)
console.log('source bytes:', (bytes / 1048576).toFixed(2), 'MB')
console.log('bundle bytes:', (js.length / 1048576).toFixed(2), 'MB')
