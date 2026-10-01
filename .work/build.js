/* build.js — the Node side of the pipeline: read the extracted LÖVE tree from disk, hand it to
   the portable builder, write out/data.json. */
'use strict'
const fs = require('fs')
const path = require('path')
const png = require('./png')
const { buildData } = require('./databuild')

const LOVE = path.join(__dirname, 'love')
const OUT = path.join(__dirname, 'out')
fs.mkdirSync(OUT, { recursive: true })

const abs = (p) => path.join(LOVE, p)
const listTree = (dir) => {
  const out = []
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name
      if (e.isDirectory()) walk(path.join(d, e.name), r)
      else out.push(r)
    }
  }
  const start = abs(dir)
  if (fs.existsSync(start)) walk(start, '')
  return out
}

const { data, stats, warnings, textures } = buildData({
  read: (p) => fs.readFileSync(abs(p), 'utf8'),
  bytes: (p) => (fs.existsSync(abs(p)) ? new Uint8Array(fs.readFileSync(abs(p))) : null),
  exists: (p) => fs.existsSync(abs(p)) && fs.statSync(abs(p)).isFile(),
  listTree,
  pngSize: (b) => { const i = png.decode(Buffer.from(b)); return { width: i.width, height: i.height } },
  source: 'Balatro.v1.0.1o.7z',
  now: new Date().toISOString(),
})

for (const w of warnings) console.warn(w)
const json = JSON.stringify(data)
fs.writeFileSync(path.join(OUT, 'data.json'), json)
console.log('items:', stats.items)
console.log('counts:', JSON.stringify(stats.counts))
console.log('atlases:', stats.atlases, '| textures on disk:', stats.textures, '| packed:', textures.length)
console.log('size:', (Buffer.byteLength(json) / 1048576).toFixed(2), 'MB')
console.log('items still holding #n# placeholders:', stats.placeholders)
