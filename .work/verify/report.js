// Extracts the injected <pre id="__report"> JSON from a --dump-dom capture.
'use strict'
const fs = require('fs')
const path = require('path')
const state = process.argv[2]
const f = path.join(__dirname, `dom-${state}.html`)
if (!fs.existsSync(f)) { console.log(`[${state}] no dom capture`); process.exit(0) }
const html = fs.readFileSync(f, 'utf8')
const m = /<pre id="__report">([\s\S]*?)<\/pre>/.exec(html)
if (!m) {
  console.log(`[${state}] ❌ no report (page likely did not finish; title=${(/<title>([\s\S]*?)<\/title>/.exec(html) || [, ''])[1]})`)
  process.exit(0)
}
let rep
try { rep = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) } catch (e) { console.log(`[${state}] raw report:`, m[1].slice(0, 1500)); process.exit(0) }
const bad = []
if (rep.errors && rep.errors.length) bad.push('errors: ' + JSON.stringify(rep.errors))
if (rep.canvas && rep.canvas.blankCount) bad.push(`blank canvases: ${rep.canvas.blankCount} ${JSON.stringify(rep.canvas.blank)}`)
if (rep.stepError) bad.push('step error: ' + rep.stepError)
console.log(`[${state}] ${bad.length ? '❌ ' + bad.join(' | ') : '✅ ok'}`)
console.log('   ' + JSON.stringify({
  cells: rep.cells, rows: rep.rows, canvas: rep.canvas,
  editionChips: rep.editionChips, forgeChips: rep.forgeChips, forgePreview: rep.forgePreview,
  detailCanvases: rep.detailCanvases, detailButtons: rep.detailButtons && rep.detailButtons.length,
  handCanvas: rep.handCanvas,
}))
if (rep.detailText) console.log('   detail: ' + rep.detailText.slice(0, 300))
