/* Validate the Cryptid parse against ground truth: the localization key list. */
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
  const t0 = Date.now()
  const files = await window.__MODIMPORT__.readZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const P = window.__MODIMPORT__.parseMod(files, 'Cryptid')
  console.log('parse time :', Date.now() - t0, 'ms')
  console.log('id/prefix  :', P.id, '/', P.prefix, '| root:', P.root, '| stats:', JSON.stringify(P.stats))

  /* ---- ground truth: every localization key Cryptid ships (en-us) */
  const dec = (p) => new TextDecoder().decode(files.get(p))
  const en = dec('Cryptid-main/localization/en-us.lua')
  const LUA = window.__LUA__
  const loc = LUA.resolve(LUA.parseLua(en))
  const truth = new Map()   // key -> set
  for (const [set, table] of Object.entries(loc.descriptions || {})) {
    if (!table || typeof table !== 'object') continue
    for (const k of Object.keys(table)) truth.set(k, set)
  }
  console.log('\nlocalization keys:', truth.size)

  const mine = new Map(P.items.map((i) => [i.id, i]))
  const missing = [...truth.keys()].filter((k) => !mine.has(k))
  const extra = [...mine.keys()].filter((k) => !truth.has(k))
  console.log('parsed items     :', mine.size)
  console.log('in loc but NOT parsed:', missing.length)
  const missBySet = {}
  for (const k of missing) { const s = truth.get(k); missBySet[s] = (missBySet[s] || 0) + 1 }
  console.log('  by set:', JSON.stringify(missBySet))
  console.log('  sample:', missing.slice(0, 12).join(', '))
  console.log('parsed but NOT in loc:', extra.length, extra.slice(0, 12).join(', '))

  /* ---- items with no art, and why */
  const noArt = P.items.filter((i) => !i.atlas)
  console.log('\nitems with no atlas:', noArt.length)
  const noArtBy = {}
  for (const i of noArt) { const k = i.cat + ' | type=' + (i.raw.object_type || '?'); noArtBy[k] = (noArtBy[k] || 0) + 1 }
  console.log(JSON.stringify(noArtBy, null, 1))

  const noPos = P.items.filter((i) => i.atlas && !i.pos)
  console.log('\nitems with atlas but no pos:', noPos.length, noPos.slice(0, 10).map((i) => i.id).join(', '))

  /* ---- atlases */
  console.log('\natlases:', P.atlases.length)
  for (const a of P.atlases) console.log('  ', a.key.padEnd(22), a.path.padEnd(24), a.px + 'x' + a.py, '@' + a.scale + 'x', a.inferred ? '(inferred)' : '')

  /* ---- which atlas values do items use, and do they resolve? */
  const used = {}
  for (const i of P.items) used[i.atlas] = (used[i.atlas] || 0) + 1
  console.log('\natlas values used by items:')
  for (const [k, v] of Object.entries(used).sort((a, b) => b[1] - a[1])) {
    const known = P.atlasIndex.has(k) || window.__BALATRO_DATA__.atlases[k]
    console.log('  ', String(v).padStart(4), String(k).padEnd(24), known ? 'ok' : '❌ UNKNOWN')
  }

  /* ---- what are the non-item object_type tables? */
  console.log('\nnon-item object_type samples:')
  const L = require(path.join(W, 'lua.js'))
  for (const key of ['get_highlighted_cards', 'calculate_context', 'intro_info', 'ContentSet', 'PokerHandPart', 'enhanced_deck_info', 'add_card']) {
    for (const p of [...files.keys()].filter((x) => x.endsWith('.lua'))) {
      const src = dec(p)
      const i = src.indexOf('object_type = "' + key + '"')
      if (i < 0) continue
      console.log('  [' + key + '] ' + p.replace('Cryptid-main/', '') + ':' + src.slice(0, i).split('\n').length)
      console.log('     ' + src.slice(Math.max(0, i - 260), i + 160).replace(/\n/g, ' ⏎ ').slice(-380))
      break
    }
  }
  void L
})()
