/* Extract the portable core of build.js into databuild.js so the browser can build the same
   dataset from a user's own game files. build.js becomes a thin Node wrapper.
   Verified by diffing out/data.json before/after. */
'use strict'
const fs = require('fs')
const path = require('path')
const W = __dirname
let src = fs.readFileSync(path.join(W, 'build.js'), 'utf8')
const NL = src.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = src.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  src = src.replace(from, to); console.log('ok   ' + label)
}

/* ---- header: become a function taking an environment ---- */
rep(`// Builds the viewer dataset from the extracted Balatro resources.
'use strict'
const fs = require('fs')
const path = require('path')
const lua = require('./lua')
const png = require('./png')

const LOVE = path.join(__dirname, 'love')
const TEX = path.join(LOVE, 'resources/textures')
const OUT = path.join(__dirname, 'out')
fs.mkdirSync(OUT, { recursive: true })

const read = (p) => fs.readFileSync(path.join(LOVE, p), 'utf8')
const gameSrc = read('game.lua')`,
  `/* ============================================================================
 * Portable dataset builder.
 *
 * Turns an extracted Balatro LÖVE tree into the viewer's data object. It is used
 * twice: by the Node build (build.js) and, in a browser, by gameparse.js — so a
 * website visitor can build the very same dataset out of their own copy of the
 * game, without the assets ever leaving the page.
 *
 * env = {
 *   read(path)        -> string   utf-8 text, relative to the LÖVE root
 *   bytes(path)       -> Uint8Array | null
 *   exists(path)      -> boolean  true for a readable file
 *   listTree(dir)     -> string[] every file under dir, relative to the LÖVE root
 *   pngSize(bytes)    -> { width, height }
 *   textBytes(str)    -> number   (defaults to str.length)
 *   source            -> string   label for meta.source
 *   now               -> string   ISO timestamp
 * }
 * returns { data, textures, warnings, stats }
 * ==========================================================================*/
'use strict'
const lua = (typeof require !== 'undefined' && typeof module !== 'undefined')
  ? require('./lua')
  : window.__LUA__

function buildData (env) {
const read = env.read
const pngSize = env.pngSize
const textBytes = env.textBytes || ((s) => s.length)
const exists = env.exists
const bytesAt = env.bytes
const listTree = env.listTree
const warnings = []

const gameSrc = read('game.lua')`,
  'header')

/* ---- atlas decoding ---- */
rep(`  const rel = a.path.replace(/^resources\\/textures\\//, '')
  const x2 = rel.replace(/^1x\\//, '2x/') // ship the 2x art: same image, twice the pixels
  const file = fs.existsSync(path.join(TEX, x2)) ? x2 : rel
  const full = path.join(TEX, file)
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { console.warn('missing texture', file); continue }
  const img = png.decode(fs.readFileSync(full))`,
  `  const rel = a.path.replace(/^resources\\/textures\\//, '')
  const x2 = rel.replace(/^1x\\//, '2x/') // ship the 2x art: same image, twice the pixels
  const file = exists(TEX + x2) ? x2 : rel
  const full = TEX + file
  if (!exists(full)) { warnings.push('缺少贴图 ' + file); continue }
  const img = pngSize(bytesAt(full))`,
  'atlas decode')

rep(`const atlases = {}
for (const a of atlasList) {`,
  `const TEX = 'resources/textures/'
const atlases = {}
for (const a of atlasList) {`,
  'TEX constant')

/* ---- texture listing ---- */
rep(`const ALL_TEX = []
function walk (dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name
    if (e.isDirectory()) walk(path.join(dir, e.name), r)
    else if (e.name.toLowerCase().endsWith('.png')) ALL_TEX.push(r)
  }
}
walk(TEX, '')
ALL_TEX.sort()
const atlasIndex = ALL_TEX.map((rel) => {
  const img = png.decode(fs.readFileSync(path.join(TEX, rel)))
  return { file: rel, w: img.width, h: img.height }
})`,
  `const ALL_TEX = listTree('resources/textures')
  .filter((r) => r.toLowerCase().endsWith('.png'))
  .sort()
const atlasIndex = ALL_TEX.map((rel) => {
  const img = pngSize(bytesAt('resources/textures/' + rel))
  return { file: rel, w: img.width, h: img.height }
})`,
  'texture listing')

/* ---- shaders ---- */
rep(`const SHADER_DIR = path.join(LOVE, 'resources/shaders')`,
  `const SHADER_DIR = 'resources/shaders/'`,
  'shader dir')

rep(`const shaders = fs.readdirSync(SHADER_DIR).filter((f) => f.endsWith('.fs')).sort().map((f) => {
  const key = f.replace(/\\.fs$/, '')
  const src = fs.readFileSync(path.join(SHADER_DIR, f), 'utf8')
  return {
    name: key, file: 'resources/shaders/' + f, size: Buffer.byteLength(src),`,
  `const shaders = listTree('resources/shaders').filter((f) => f.endsWith('.fs') && !f.includes('/')).sort().map((f) => {
  const key = f.replace(/\\.fs$/, '')
  const src = read(SHADER_DIR + f)
  return {
    name: key, file: 'resources/shaders/' + f, size: textBytes(src),`,
  'shader listing')

/* ---- meta + output ---- */
rep(`    version: (fs.readFileSync(path.join(LOVE, 'version.jkr'), 'utf8') || '').split(/\\r?\\n/)[0].trim(),
    source: 'Balatro.v1.0.1o.7z',
    generated: new Date().toISOString(),`,
  `    version: (read('version.jkr') || '').split(/\\r?\\n/)[0].trim(),
    source: env.source || 'Balatro',
    generated: env.now || new Date().toISOString(),`,
  'meta')

rep(`fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(data))
console.log('items:', items.length)
console.log('counts:', JSON.stringify(data.counts))
console.log('atlases:', Object.keys(atlases).length, '| textures on disk:', ALL_TEX.length)
console.log('size:', (fs.statSync(path.join(OUT, 'data.json')).size / 1048576).toFixed(2), 'MB')
const leftovers = items.filter((i) => JSON.stringify(i.text).includes('#') && /#\\d+#/.test(JSON.stringify(i.text['en-us'] || [])))
console.log('items still holding #n# placeholders:', leftovers.length, leftovers.slice(0, 12).map((i) => i.id).join(', '))`,
  `// every texture the viewer may ask for, so the caller can pack or serve them
const textures = []
for (const a of Object.values(atlases)) {
  for (const f of [a.file, a.file.replace(/^2x\\//, '1x/')]) {
    const b = bytesAt(TEX + f)
    if (b && !textures.some((t) => t.file === f)) textures.push({ file: f, bytes: b })
  }
}
for (const e of atlasIndex) if (!textures.some((t) => t.file === e.file)) {
  const b = bytesAt(TEX + e.file)
  if (b) textures.push({ file: e.file, bytes: b })
}
const leftovers = items.filter((i) => JSON.stringify(i.text).includes('#') && /#\\d+#/.test(JSON.stringify(i.text['en-us'] || [])))
return {
  data, textures, warnings,
  stats: {
    items: items.length,
    atlases: Object.keys(atlases).length,
    textures: ALL_TEX.length,
    packed: textures.length,
    placeholders: leftovers.length,
    counts: data.counts,
  },
}
}

/* Node (build.js) and the browser bundle both load this file */
if (typeof module !== 'undefined' && module.exports) module.exports = { buildData }
if (typeof window !== 'undefined') window.__DATABUILD__ = { buildData }`,
  'tail')

fs.writeFileSync(path.join(W, 'databuild.js'), src)
console.log(fails ? 'FAILURES ' + fails : 'databuild.js written')
new Function(src)
console.log('syntax OK')
