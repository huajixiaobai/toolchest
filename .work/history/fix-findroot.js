/* Replace findRoot() by line range (the exact-string form failed on subtle whitespace). */
'use strict'
const fs = require('fs')
let s = fs.readFileSync('modimport.js', 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
const lines = s.split(/\r?\n/)
const start = lines.findIndex((l) => /^function findRoot \(files\) \{/.test(l))
if (start < 0) { console.log('FAIL find findRoot'); process.exit(1) }
let end = start
while (!/^\}/.test(lines[end])) end++
console.log('replacing lines', start + 1, '-', end + 1)
const NEW = `const dirOf = (p) => p.replace(/[^/]*$/, '').replace(/\\/$/, '')

/** A file may serve as this mod's manifest if it is manifest.json or a root-level .json. */
function isManifestPath (p) {
  if (!/\\.json$/i.test(p)) return false
  if (/(^|\\/)manifest\\.json$/i.test(p)) return true
  return p.split('/').length <= 2
}

function looksLikeManifest (text) {
  try {
    const j = JSON.parse(text)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return false
    // a Steamodded manifest always names itself and points at an entry file
    return !!(j.id || j.name) && !!(j.main_file || j.version_number || j.version || j.prefix)
  } catch { return false }
}

/**
 * Some packs wrap everything in one top folder. GitHub's "Download ZIP" is one of those, and it
 * names the manifest after the mod (Cryptid.json), so any plausible manifest is accepted.
 */
function findRoot (files) {
  let best = null
  for (const p of files.keys()) {
    if (!isManifestPath(p)) continue
    if (!looksLikeManifest(dec(files.get(p)))) continue
    const dir = dirOf(p)
    if (best === null || dir.length < best.length) best = dir
  }
  if (best !== null) return best
  // no manifest at all: the shallowest folder that directly holds lua files is the mod root
  let pick = ''
  let pickDepth = Infinity
  for (const p of files.keys()) {
    if (!/\\.lua$/i.test(p)) continue
    const dir = dirOf(p)
    const d = dir === '' ? 0 : dir.split('/').length
    if (d < pickDepth) { pickDepth = d; pick = dir }
  }
  return pick
}`.split(/\r?\n/)
lines.splice(start, end - start + 1, ...NEW)
fs.writeFileSync('modimport.js', lines.join(NL))
new Function(fs.readFileSync('modimport.js', 'utf8'))
console.log('done, syntax OK')
