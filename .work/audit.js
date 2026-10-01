// Completeness audit: compare the 1x / 2x texture sets and report what the viewer covers.
'use strict'
const fs = require('fs')
const path = require('path')

const LOVE = path.join(__dirname, 'love')
const TEX = path.join(LOVE, 'resources/textures')

const walk = (d, r) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name), r ? r + '/' + e.name : e.name) : [r ? r + '/' + e.name : e.name])

const one = walk(path.join(TEX, '1x'), '').filter((f) => f.endsWith('.png')).sort()
const two = walk(path.join(TEX, '2x'), '').filter((f) => f.endsWith('.png')).sort()
console.log('1x files:', one.length, '| 2x files:', two.length)
console.log('only in 1x:', JSON.stringify(one.filter((f) => !two.includes(f))))
console.log('only in 2x:', JSON.stringify(two.filter((f) => !one.includes(f))))

// dimension ratio check
const png = require('./png')
let mismatch = []
for (const f of one) {
  if (!two.includes(f)) continue
  const a = png.decode(fs.readFileSync(path.join(TEX, '1x', f)))
  const b = png.decode(fs.readFileSync(path.join(TEX, '2x', f)))
  if (b.width !== a.width * 2 || b.height !== a.height * 2) mismatch.push(`${f}: ${a.width}x${a.height} -> ${b.width}x${b.height}`)
}
console.log('1x/2x size mismatches:', mismatch.length ? JSON.stringify(mismatch) : 'none (all exactly 2x)')

// what the built data actually references
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/data.json'), 'utf8'))
const refFiles = new Set(Object.values(D.atlases).map((a) => a.file))
const bundle = fs.readFileSync(path.join(__dirname, 'out/atlas.js'), 'utf8')
const embedded = new Set(Object.keys(JSON.parse(bundle.replace(/^window\.__BALATRO_ATLAS__=/, '').replace(/;\s*$/, ''))))
console.log('atlases referenced by data:', refFiles.size, '| embedded in bundle:', embedded.size)
console.log('referenced but NOT embedded:', JSON.stringify([...refFiles].filter((f) => !embedded.has(f))))
console.log('2x on disk but NOT embedded:', JSON.stringify(two.map((f) => '2x/' + f).filter((f) => !embedded.has(f))))

// non-texture resources still present for catalogue purposes
const shaders = fs.readdirSync(path.join(LOVE, 'resources/shaders')).filter((f) => f.endsWith('.fs')).sort()
console.log('\nshaders:', shaders.length, shaders.join(', '))
console.log('items in data:', D.items.length, '| categories:', Object.keys(D.counts).length)
console.log('hands:', D.hands.length, '| locales:', D.meta.locales.map((l) => l.code).join(','))
