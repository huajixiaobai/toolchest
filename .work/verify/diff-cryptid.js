'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')
const FILE = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const buf = fs.readFileSync(FILE)
global.window = { __BALATRO_DATA__: JSON.parse(fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8')) }
new Function(fs.readFileSync(path.join(W, 'lua.js'), 'utf8'))()
new Function(fs.readFileSync(path.join(W, 'modimport.js'), 'utf8'))()

;(async () => {
  const files = await window.__MODIMPORT__.readZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const P = window.__MODIMPORT__.parseMod(files, 'Cryptid')
  const LUA = window.__LUA__
  const dec = (p) => new TextDecoder().decode(files.get(p))
  const loc = LUA.resolve(LUA.parseLua(dec('Cryptid-main/localization/en-us.lua')))
  const truth = new Map()
  for (const [set, table] of Object.entries(loc.descriptions || {})) {
    if (!table || typeof table !== 'object') continue
    for (const k of Object.keys(table)) truth.set(k, set)
  }
  const mine = new Map(P.items.map((i) => [i.id, i]))
  const missing = [...truth.keys()].filter((k) => !mine.has(k) && truth.get(k) === 'Joker')
  console.log('=== Jokers in localization but not parsed (' + missing.length + ') ===')
  for (const k of missing) console.log('  ', k, '→', (loc.descriptions.Joker[k] || {}).name)
  console.log('\n=== sleeves ===')
  for (const k of [...truth.keys()].filter((k) => truth.get(k) === 'Sleeve' && !mine.has(k))) console.log('  ', k, (loc.descriptions.Sleeve[k] || {}).name)
  console.log('\n=== other missing (Back/Blind/Spectral/Other headline) ===')
  for (const k of [...truth.keys()].filter((k) => ['Back', 'Blind', 'Spectral', 'Enhanced', 'Tag', 'Voucher', 'Sticker', 'Seal'].includes(truth.get(k)) && !mine.has(k))) {
    console.log('  ', k, '(' + truth.get(k) + ')', (loc.descriptions[truth.get(k)][k] || {}).name)
  }
  console.log('\n=== parsed but not localized (' + P.items.filter((i) => !truth.has(i.id)).length + ') ===')
  for (const i of P.items.filter((x) => !truth.has(x.id))) console.log('  ', i.id, '|', i.cat, '|', i.atlas, '|', i.pos ? i.pos.x + ',' + i.pos.y : '-', '|', i.name)

  console.log('\n=== the 2 artless jokers ===')
  for (const i of P.items.filter((x) => x.cat === 'Joker' && !x.atlas)) console.log('  ', i.id, JSON.stringify(i.raw).slice(0, 300))

  console.log('\n=== artless Backs ===')
  for (const i of P.items.filter((x) => x.cat === 'Deck' && !x.atlas)) console.log('  ', i.id, 'pos=' + JSON.stringify(i.pos), JSON.stringify(i.raw).slice(0, 240))

  console.log('\n=== why is a sticker/no_collection item missing from loc? grep ===')
  for (const probe of ['sticker_sheet', 'ballin', 'rush_hour', 'green']) {
    const i = dec('Cryptid-main/localization/en-us.lua').indexOf(probe)
    console.log('  ', probe, i < 0 ? 'not in loc at all' : JSON.stringify(dec('Cryptid-main/localization/en-us.lua').slice(Math.max(0, i - 90), i + 90)))
  }
})()
