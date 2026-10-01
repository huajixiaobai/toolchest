/* lua.js — support the second call style (`NS.Class({...})`), and find Cryptid-style item
   tables (a table literal carrying a direct `object_type` string key). */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

/* symbols need their offset so item tables can be sliced out of the source */
rep('lua.js',
  `    const three = src.substr(i, 3)
    if (three === '...') { toks.push({ t: 'sym', v: '...' }); i += 3; continue }
    const two = src.substr(i, 2)
    if (['==', '~=', '<=', '>=', '..', '::'].includes(two)) { toks.push({ t: 'sym', v: two }); i += 2; continue }
    toks.push({ t: 'sym', v: c })
    i++`,
  `    const three = src.substr(i, 3)
    if (three === '...') { toks.push({ t: 'sym', v: '...', at: i }); i += 3; continue }
    const two = src.substr(i, 2)
    if (['==', '~=', '<=', '>=', '..', '::'].includes(two)) { toks.push({ t: 'sym', v: two, at: i }); i += 2; continue }
    toks.push({ t: 'sym', v: c, at: i })
    i++`,
  'token offsets')

rep('lua.js',
  `/** Find every \`SMODS.<Type> { ... }\` (and \`<Name>.<Type> { ... }\`) declaration in a source file. */
function extractDecls (src) {
  const out = []
  const re = /(?:^|[^\\w.])SMODS\\s*\\.\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\{/g
  let m
  while ((m = re.exec(src))) {
    const braceAt = src.indexOf('{', m.index + m[0].length - 1)
    if (braceAt < 0) break
    let end
    try { end = matchBrace(src, braceAt) } catch { break }
    const raw = src.slice(braceAt, end + 1)
    try {
      out.push({ type: m[1], table: resolve(parseLua(raw)), raw, line: src.slice(0, m.index).split('\\n').length })
    } catch (e) {
      out.push({ type: m[1], error: e.message, raw: raw.slice(0, 200), line: src.slice(0, m.index).split('\\n').length })
    }
    re.lastIndex = end + 1
  }
  return out
}`,
  `/**
 * Find every \`<NS>.<Type> { ... }\` / \`<NS>.<Type>({ ... })\` declaration in a source file.
 * Both call styles are used in the wild: Steamodded's sugar form, and the parenthesised form
 * that Cryptid and some other mods prefer.
 */
function extractDecls (src) {
  const out = []
  const re = /(?:^|[^\\w.])([A-Za-z_][A-Za-z0-9_]*)\\s*\\.\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*(?:\\{|\\\\(\\s*\\{)/g
  let m
  while ((m = re.exec(src))) {
    const braceAt = src.indexOf('{', m.index + m[0].length - 1)
    if (braceAt < 0) break
    let end
    try { end = matchBrace(src, braceAt) } catch { break }
    const raw = src.slice(braceAt, end + 1)
    const line = src.slice(0, m.index).split('\\n').length
    try {
      out.push({ ns: m[1], type: m[2], table: resolve(parseLua(raw)), raw, line })
    } catch (e) {
      out.push({ ns: m[1], type: m[2], error: e.message, raw: raw.slice(0, 200), line })
    }
    re.lastIndex = end + 1
  }
  return out
}

/**
 * Find "item tables": table literals that carry a direct \`object_type\` string key.
 * That is how Cryptid (and mods following it) declare content — the table is built as a plain
 * Lua value and handed to a loader, so there is no \`SMODS.X{...}\` call to look for.
 */
function extractItemTables (src) {
  const out = []
  const toks = tokenize(src)
  const frames = []
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.t !== 'sym') continue
    if (t.v === '{') { frames.push({ at: t.at, ot: null }); continue }
    if (t.v === '}') {
      const f = frames.pop()
      if (!f || !f.ot) continue
      const raw = src.slice(f.at, t.at + 1)
      const line = src.slice(0, f.at).split('\\n').length
      try {
        out.push({ ns: 'item', type: f.ot, table: resolve(parseLua(raw)), raw, line })
      } catch (e) {
        out.push({ ns: 'item', type: f.ot, error: e.message, raw: raw.slice(0, 200), line })
      }
      continue
    }
    // \`object_type = "Joker"\` at this depth belongs to the table currently being opened
    if (t.v === '=' && frames.length) {
      const prev = toks[i - 1]
      const next = toks[i + 1]
      if (prev && prev.t === 'name' && prev.v === 'object_type' && next && next.t === 'str') {
        frames[frames.length - 1].ot = next.v
      }
    }
  }
  return out
}`,
  'extractDecls + extractItemTables')

rep('lua.js',
  `  module.exports = { parseLua, extractAndParse, extractDecls, resolve, evalExpr, tokenize, matchBrace }`,
  `  module.exports = { parseLua, extractAndParse, extractDecls, extractItemTables, resolve, evalExpr, tokenize, matchBrace }`,
  'cjs export')

rep('lua.js',
  `  window.__LUA__ = { parseLua, extractAndParse, extractDecls, resolve, evalExpr, tokenize, matchBrace }`,
  `  window.__LUA__ = { parseLua, extractAndParse, extractDecls, extractItemTables, resolve, evalExpr, tokenize, matchBrace }`,
  'browser export')

console.log(fails ? 'FAILURES' : 'done')
