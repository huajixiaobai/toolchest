/* Node-side check of the mod parser (no browser): builds the same Map the page builds and
   prints what parseMod() found. Fast feedback before the CDP run. */
'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')

global.window = { __BALATRO_DATA__: JSON.parse(fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8')) }
global.TextDecoder = global.TextDecoder || require('util').TextDecoder

new Function(fs.readFileSync(path.join(W, 'lua.js'), 'utf8'))()
new Function(fs.readFileSync(path.join(W, 'modimport.js'), 'utf8'))()

const ROOT = path.join(__dirname, 'testmod')
const files = new Map()
;(function walk (dir, prefix) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, prefix + e.name + '/')
    else files.set(prefix + e.name, new Uint8Array(fs.readFileSync(p)))
  }
})(ROOT, '')

const P = window.__MODIMPORT__.parseMod(files, 'TestMod')
console.log('id        :', P.id, '| prefix:', P.prefix, '| name:', P.name, '| author:', P.author)
console.log('root      :', JSON.stringify(P.root), '| version:', P.version)
console.log('atlases   :', P.atlases.map((a) => a.key + ' (' + a.file + ', ' + a.px + 'x' + a.py + ' @' + a.scale + 'x)').join(', '))
console.log('atlasIndex:', [...P.atlasIndex.keys()].join(', '))
console.log('types     :', P.types.map((t) => t.key).join(', '))
console.log('stats     :', JSON.stringify(P.stats))
console.log('locales   :', Object.keys(P.localization).join(', '))
console.log('items     :', P.items.length)
const cols = ['id', 'cat', 'set', 'atlas', 'pos', 'name', 'i18n(en-us)', 'i18n(zh_CN)']
console.log('\n' + cols.map((c) => c.padEnd(12)).join(''))
for (const it of P.items) {
  console.log([
    it.id, it.cat, it.set, String(it.atlas), it.pos ? it.pos.x + ',' + it.pos.y : '-',
    it.name, it.i18n['en-us'] || '-', it.i18n['zh_CN'] || '-',
  ].map((v) => String(v).padEnd(12)).join(''))
}
console.log('\nwarnings:')
for (const w of P.warnings) console.log('  · ' + w)
if (!P.warnings.length) console.log('  (none)')

/* the invalids we intentionally planted */
const byId = new Map(P.items.map((i) => [i.id, i]))
const checks = [
  ['joker key is class+mod prefixed', !!byId.get('j_tm_alpha')],
  ['second lua file was scanned', !!byId.get('j_tm_delta')],
  ['inline loc_txt name wins', byId.get('j_tm_alpha').name === 'Alpha Joker'],
  ['localization name', byId.get('j_tm_beta').name === 'Beta Joker'],
  ['zh_CN text', (byId.get('j_tm_beta').text['zh_CN'] || [])[0] === '第五张传说测试卡'],
  ['legendary soul_pos', !!byId.get('j_tm_beta').soul],
  ['no-atlas joker is artless', byId.get('j_tm_gamma').atlas === null && byId.get('j_tm_gamma').sprite === null],
  ['custom consumable type', byId.get('c_tm_note_a').cat === 'Musical'],
  ['prefixed atlas spelling resolves', byId.get('c_tm_note_b').atlas === 'mod_notes'],
  ['1x atlas scale', P.atlases.find((a) => a.key === 'mod_notes').scale === 1],
  ['2x atlas scale', P.atlases.find((a) => a.key === 'mod_jokers').scale === 2],
  ['offscreen pos flagged', P.warnings.some((w) => /pos|图集|无贴图/.test(w))],
  ['voucher set', byId.get('v_tm_ticket').cat === 'Voucher'],
  ['booster set', byId.get('p_tm_note_pack').cat === 'Booster'],
  ['back maps to Deck', byId.get('b_tm_musical_deck').cat === 'Deck' && byId.get('b_tm_musical_deck').set === 'Back'],
  ['enhancement maps to Enhancement', byId.get('m_tm_sharp').cat === 'Enhancement' && byId.get('m_tm_sharp').set === 'Enhanced'],
  ['blind kept row pos', byId.get('bl_tm_encore').pos.y === 2],
  ['tag resolves vanilla atlas', byId.get('tag_tm_refrain').atlas === 'tags'],
  ['sticker keeps its mod key (no class prefix)', !!byId.get('tm_tuned') && byId.get('tm_tuned').cat === 'Sticker'],
  ['sticker loc found under Other', byId.get('tm_tuned').name === 'Tuned'],
]
let bad = 0
console.log('\nchecks:')
for (const [label, ok] of checks) { if (!ok) bad++; console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + label) }

/* ---------------------------------------------------------------- flat pack */
/* some distributions lose the folder structure entirely; the atlas lookup then has to fall
   back to matching the declared file name anywhere in the pack. */
const flat = new Map()
for (const [k, v] of files) flat.set(k.split('/').pop(), v)
const F = window.__MODIMPORT__.parseMod(flat, 'flat')
console.log('\nflat pack (no folders):')
console.log('  root      :', JSON.stringify(F.root), '| entry:', 'TestMod.lua')
console.log('  atlases   :', F.atlases.map((a) => a.key + ' @' + a.scale + 'x ← ' + a.file).join(', '))
console.log('  stats     :', JSON.stringify({ atlases: F.stats.atlases, inferred: F.stats.inferredAtlas, items: F.stats.items }))
console.log('  warnings  :')
for (const w of F.warnings) console.log('    · ' + w)
const flatChecks = [
  ['flat pack still finds both atlases', F.atlases.length === 2],
  ['flat pack reports the inferred paths', F.stats.inferredAtlas === 2],
  ['flat pack still parses every entry', F.items.length === P.items.length],
  ['flat pack keeps the atlas spelling aliases', [...F.atlasIndex.keys()].length === 4],
]
for (const [label, ok] of flatChecks) { if (!ok) bad++; console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + label) }

console.log(bad ? '\n' + bad + ' FAILED' : '\nall ' + (checks.length + flatChecks.length) + ' checks passed')
process.exit(bad ? 1 : 0)
