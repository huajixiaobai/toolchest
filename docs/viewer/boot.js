// A tolerant Lua-subset parser: enough to turn Balatro's data / localization files
// into plain JS values. Function bodies are skipped, not evaluated.
'use strict'

const KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
  'then', 'true', 'until', 'while',
])

function isDigit (c) { return c >= '0' && c <= '9' }
function isNameStart (c) { return /[A-Za-z_]/.test(c) }
function isNameChar (c) { return /[A-Za-z0-9_]/.test(c) }

function tokenize (src) {
  const toks = []
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (c === '\n' || c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue }
    if (c === '-' && src[i + 1] === '-') {
      i += 2
      // long comment --[[ ... ]] / --[=[ ... ]=]
      const m = /^\[(=*)\[/.exec(src.slice(i))
      if (m) {
        const close = ']' + m[1] + ']'
        const end = src.indexOf(close, i + m[0].length)
        i = end === -1 ? n : end + close.length
      } else {
        while (i < n && src[i] !== '\n') i++
      }
      continue
    }
    // long string
    if (c === '[') {
      const m = /^\[(=*)\[/.exec(src.slice(i))
      if (m) {
        const close = ']' + m[1] + ']'
        const start = i + m[0].length
        const end = src.indexOf(close, start)
        const raw = src.slice(start, end === -1 ? n : end)
        toks.push({ t: 'str', v: raw[0] === '\n' ? raw.slice(1) : raw })
        i = end === -1 ? n : end + close.length
        continue
      }
    }
    if (c === '"' || c === "'") {
      const quote = c
      let j = i + 1
      let out = ''
      while (j < n && src[j] !== quote) {
        if (src[j] === '\\') {
          const e = src[j + 1]
          j += 2
          switch (e) {
            case 'n': out += '\n'; break
            case 't': out += '\t'; break
            case 'r': out += '\r'; break
            case 'a': out += '\x07'; break
            case 'b': out += '\b'; break
            case 'f': out += '\f'; break
            case 'v': out += '\v'; break
            case '\\': out += '\\'; break
            case '"': out += '"'; break
            case "'": out += "'"; break
            case '\n': out += '\n'; break
            case 'x': {
              const hex = src.substr(j, 2)
              out += String.fromCharCode(parseInt(hex, 16) || 0); j += 2; break
            }
            case 'u': {
              const mm = /^\{(.+?)\}/.exec(src.slice(j))
              if (mm) { out += String.fromCodePoint(parseInt(mm[1], 16)); j += mm[0].length }
              break
            }
            default:
              if (isDigit(e)) {
                const ddd = src.substr(j - 1, 3)
                out += String.fromCharCode(parseInt(ddd, 10)); j += 2
              } else out += e
          }
        } else { out += src[j]; j++ }
      }
      toks.push({ t: 'str', v: out })
      i = j + 1
      continue
    }
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      const m = /^(0[xX][0-9a-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?)/.exec(src.slice(i))
      const text = m[0]
      const v = /^0[xX]/.test(text) ? parseInt(text, 16) : parseFloat(text)
      toks.push({ t: 'num', v })
      i += text.length
      continue
    }
    if (isNameStart(c)) {
      let j = i
      while (j < n && isNameChar(src[j])) j++
      const w = src.slice(i, j)
      toks.push({ t: KEYWORDS.has(w) ? 'kw' : 'name', v: w })
      i = j
      continue
    }
    // multi-char symbols
    const three = src.substr(i, 3)
    if (three === '...') { toks.push({ t: 'sym', v: '...', at: i }); i += 3; continue }
    const two = src.substr(i, 2)
    if (['==', '~=', '<=', '>=', '..', '::'].includes(two)) { toks.push({ t: 'sym', v: two, at: i }); i += 2; continue }
    toks.push({ t: 'sym', v: c, at: i })
    i++
  }
  toks.push({ t: 'eof', v: null })
  return toks
}

class Parser {
  constructor (tokens, src) {
    this.toks = tokens
    this.i = 0
    this.src = src
  }

  peek (k = 0) { return this.toks[this.i + k] }
  next () { return this.toks[this.i++] }
  at (type, value) {
    const t = this.peek()
    return t.t === type && (value === undefined || t.v === value)
  }
  eat (type, value) {
    if (this.at(type, value)) return this.next()
    return null
  }
  expect (type, value) {
    const t = this.next()
    if (t.t !== type || (value !== undefined && t.v !== value)) {
      throw new Error(`expected ${type} ${value ?? ''} got ${t.t} ${t.v} at token ${this.i}`)
    }
    return t
  }

  /** Skip a whole `function ... end` construct. Assumes `function` was consumed. */
  skipFunction () {
    // optional name
    if (this.at('name')) this.next()
    // parameter list (may contain nested parens)
    let depth = 0
    let started = false
    while (true) {
      const t = this.next()
      if (t.t === 'eof') throw new Error('unterminated function params')
      if (t.t === 'sym' && t.v === '(') { depth++; started = true; continue }
      if (t.t === 'sym' && t.v === ')') { depth--; if (depth === 0 && started) break; continue }
    }
    let blocks = 1
    let pendingDo = 0
    while (true) {
      const t = this.next()
      if (t.t === 'eof') throw new Error('unterminated function body')
      if (t.t === 'kw') {
        if (t.v === 'function' || t.v === 'if' || t.v === 'repeat') blocks++
        else if (t.v === 'for' || t.v === 'while') { blocks++; pendingDo++ }
        else if (t.v === 'do') { if (pendingDo > 0) pendingDo--; else blocks++ }
        else if (t.v === 'end' || t.v === 'until') {
          blocks--
          if (blocks === 0) return
        }
      }
    }
  }

  /** Collect raw tokens until one of `stops` appears at nesting depth 0. */
  collectExpr (stops) {
    const parts = []
    let depth = 0
    while (true) {
      const t = this.peek()
      if (t.t === 'eof') break
      if (depth === 0 && t.t === 'sym' && stops.includes(t.v)) break
      if (depth === 0 && t.t === 'kw' && stops.includes(t.v)) break
      this.next()
      if (t.t === 'sym' && '([{'.includes(t.v)) depth++
      else if (t.t === 'sym' && ')]}'.includes(t.v)) depth--
      parts.push(t.t === 'str' ? JSON.stringify(t.v) : String(t.v))
    }
    return parts.join(' ')
  }

  /** If the value just read is continued by .. or an operator, keep collecting it. */
  continueExpr (seedText, seedValue) {
    const t = this.peek()
    const cont = t.t === 'sym' && ['..', '+', '-', '*', '/', '%', '^'].includes(t.v)
    if (!cont) return seedValue
    const rest = this.collectExpr([',', ';', '}'])
    return { __expr: rest ? seedText + ' ' + rest : seedText }
  }

  parseValue () {
    const t = this.peek()
    if (t.t === 'sym' && t.v === '{') return this.parseTable()
    if (t.t === 'str') { this.next(); return this.continueExpr(JSON.stringify(t.v), t.v) }
    if (t.t === 'num') { this.next(); return this.continueExpr(String(t.v), t.v) }
    if (t.t === 'sym' && t.v === '-' && this.peek(1).t === 'num') {
      this.next(); const num = this.next(); return this.continueExpr('-' + num.v, -num.v)
    }
    if (t.t === 'kw') {
      if (t.v === 'true') { this.next(); return this.continueExpr('true', true) }
      if (t.v === 'false') { this.next(); return this.continueExpr('false', false) }
      if (t.v === 'nil') { this.next(); return null }
      if (t.v === 'function') { this.next(); this.skipFunction(); return { __fn: true } }
    }
    const raw = this.collectExpr([',', ';', '}'])
    return { __expr: raw }
  }

  parseTable () {
    this.expect('sym', '{')
    const obj = {}
    let arrayLen = 0
    while (true) {
      const t = this.peek()
      if (t.t === 'eof') throw new Error('unterminated table')
      if (t.t === 'sym' && t.v === '}') { this.next(); break }
      if (t.t === 'sym' && (t.v === ',' || t.v === ';')) { this.next(); continue }
      if (t.t === 'sym' && t.v === '[') {
        this.next()
        const key = this.parseValue()
        this.expect('sym', ']')
        this.expect('sym', '=')
        obj[exprToKey(key)] = this.parseValue()
        continue
      }
      if (t.t === 'name' && this.peek(1).t === 'sym' && this.peek(1).v === '=') {
        const key = this.next().v
        this.next()
        obj[key] = this.parseValue()
        continue
      }
      // positional
      const val = this.parseValue()
      obj[String(arrayLen++)] = val
    }
    return obj
  }
}

function exprToKey (v) {
  if (v && typeof v === 'object' && '__expr' in v) return v.__expr.replace(/^["']|["']$/g, '')
  return String(v)
}

/** Parse a Lua source string and return the first top-level table found. */
function parseLua (src) {
  const p = new Parser(tokenize(src), src)
  // walk until we hit the first '{'
  while (!p.at('eof')) {
    if (p.at('sym', '{')) return p.parseTable()
    p.next()
  }
  throw new Error('no table found')
}

/** Extract the balanced `{...}` block that starts at/after `marker`, then parse it. */
function extractAndParse (src, marker) {
  const at = src.indexOf(marker)
  if (at === -1) throw new Error('marker not found: ' + marker)
  let i = src.indexOf('{', at + marker.length - 1)
  if (i === -1) throw new Error('no table after marker: ' + marker)
  const end = matchBrace(src, i)
  return parseLua(src.slice(i, end + 1))
}

/** Lua-aware brace matcher (ignores strings and comments). */
function matchBrace (src, start) {
  let depth = 0
  let i = start
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (c === '-' && src[i + 1] === '-') {
      i += 2
      const m = /^\[(=*)\[/.exec(src.slice(i))
      if (m) {
        const close = ']' + m[1] + ']'
        const e = src.indexOf(close, i)
        i = e === -1 ? n : e + close.length
      } else while (i < n && src[i] !== '\n') i++
      continue
    }
    if (c === '[') {
      const m = /^\[(=*)\[/.exec(src.slice(i))
      if (m) {
        const close = ']' + m[1] + ']'
        const e = src.indexOf(close, i)
        i = e === -1 ? n : e + close.length
        continue
      }
    }
    if (c === '"' || c === "'") {
      const q = c; i++
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++ }
      i++
      continue
    }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return i }
    i++
  }
  throw new Error('unbalanced braces')
}

/** Try to evaluate a raw Lua expression into a plain JS value. */
function evalExpr (raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return parseFloat(s)
  // HEX('xxxxxx')
  const hex = /^HEX\s*\(\s*['"]([0-9a-fA-F]{6,8})['"]\s*\)$/.exec(s)
  if (hex) {
    const h = hex[1]
    return { hex: '#' + h, rgba: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255] }
  }
  // pure arithmetic
  if (/^[\d\s+\-*/().]+$/.test(s)) {
    try {
      // eslint-disable-next-line no-new-func
      const v = Function(`"use strict";return (${s})`)()
      if (typeof v === 'number' && Number.isFinite(v)) return v
    } catch { /* fall through */ }
  }
  return { expr: s }
}

/** Recursively resolve {__expr} wrappers to plain values where possible. */
function resolve (v) {
  if (Array.isArray(v)) return v.map(resolve)
  if (v && typeof v === 'object') {
    if ('__expr' in v) return evalExpr(v.__expr)
    if ('__fn' in v) return '[function]'
    const out = {}
    for (const k of Object.keys(v)) out[k] = resolve(v[k])
    // Lua array tables come back as {0:..,1:..}; normalise contiguous ones to arrays.
    const keys = Object.keys(out)
    if (keys.length > 0 && keys.every((k, i) => String(i) === k)) return keys.map((k) => out[k])
    return out
  }
  return v
}

/**
 * Find every `<NS>.<Type> { ... }` / `<NS>.<Type>({ ... })` declaration in a source file.
 * Both call styles are used in the wild: Steamodded's sugar form, and the parenthesised form
 * that Cryptid and some other mods prefer.
 */
function extractDecls (src) {
  const out = []
  const re = /(?:^|[^\w.])([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\{|\(\s*\{)/g
  let m
  while ((m = re.exec(src))) {
    const braceAt = src.indexOf('{', m.index + m[0].length - 1)
    if (braceAt < 0) break
    let end
    try { end = matchBrace(src, braceAt) } catch { break }
    const raw = src.slice(braceAt, end + 1)
    const line = src.slice(0, m.index).split('\n').length
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
 * Find "item tables": table literals that carry a direct `object_type` string key.
 * That is how Cryptid (and mods following it) declare content — the table is built as a plain
 * Lua value and handed to a loader, so there is no `SMODS.X{...}` call to look for.
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
      const line = src.slice(0, f.at).split('\n').length
      try {
        out.push({ ns: 'item', type: f.ot, table: resolve(parseLua(raw)), raw, line })
      } catch (e) {
        out.push({ ns: 'item', type: f.ot, error: e.message, raw: raw.slice(0, 200), line })
      }
      continue
    }
    // `object_type = "Joker"` at this depth belongs to the table currently being opened
    if (t.v === '=' && frames.length) {
      const prev = toks[i - 1]
      const next = toks[i + 1]
      if (prev && prev.t === 'name' && prev.v === 'object_type' && next && next.t === 'str') {
        frames[frames.length - 1].ot = next.v
      }
    }
  }
  return out
}

// Node (build scripts) and browser <script> both load this file, so guard the CJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseLua, extractAndParse, extractDecls, extractItemTables, resolve, evalExpr, tokenize, matchBrace }
}

// used straight from a browser <script> by the in-page mod importer
if (typeof window !== 'undefined') {
  window.__LUA__ = { parseLua, extractAndParse, extractDecls, extractItemTables, resolve, evalExpr, tokenize, matchBrace }
}

;
/* ============================================================================
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

const gameSrc = read('game.lua')
const globalsSrc = read('globals.lua')
const T = (marker, src = gameSrc) => lua.resolve(lua.extractAndParse(src, marker))

// ---------------------------------------------------------------- game data
const P_CENTERS = T('self.P_CENTERS = {')
const P_BLINDS = T('self.P_BLINDS = {')
const P_TAGS = T('self.P_TAGS = {')
const P_SEALS = T('self.P_SEALS = {')
const P_CARDS = T('self.P_CARDS = {')
const P_STAKES = T('self.P_STAKES = {')
const ASSET_ATLI = T('self.asset_atli = {')
const ANIM_ATLI = T('self.animation_atli = {')
const ASSET_IMAGES = T('self.asset_images = {')
const CHALLENGES = lua.resolve(lua.extractAndParse(read('challenges.lua'), 'G.CHALLENGES = {'))
const COLLABS = T('self.COLLABS = {', globalsSrc)
const HANDS = lua.resolve(lua.extractAndParse(gameSrc, 'hands = {'))

// ---------------------------------------------------------------- atlases
const atlasList = []
/** Atlas paths are built as "resources/textures/"..scaling.."x/Name.png"; rebuild them. */
function resolvePath (p) {
  if (typeof p === 'string') return p
  if (p && typeof p === 'object' && p.expr) {
    const strs = [...p.expr.matchAll(/"([^"]*)"/g)].map((m) => m[1])
    if (strs.length >= 2) return strs[0] + '1' + strs.slice(1).join('')
    return strs.join('')
  }
  return null
}
for (const rec of Object.values(ASSET_ATLI)) atlasList.push({ name: rec.name, path: resolvePath(rec.path), px: rec.px, py: rec.py, kind: 'atlas' })
for (const rec of Object.values(ANIM_ATLI)) atlasList.push({ name: rec.name, path: resolvePath(rec.path), px: rec.px, py: rec.py, frames: rec.frames, kind: 'animation' })
for (const rec of Object.values(ASSET_IMAGES)) atlasList.push({ name: rec.name, path: resolvePath(rec.path), px: rec.px, py: rec.py, kind: 'image' })

const TEX = 'resources/textures/'
const atlases = {}
for (const a of atlasList) {
  const rel = a.path.replace(/^resources\/textures\//, '')
  const x2 = rel.replace(/^1x\//, '2x/') // ship the 2x art: same image, twice the pixels
  const file = exists(TEX + x2) ? x2 : rel
  const full = TEX + file
  if (!exists(full)) { warnings.push('缺少贴图 ' + file); continue }
  const img = pngSize(bytesAt(full))
  const scale = file.startsWith('2x/') ? 2 : 1
  atlases[a.name] = {
    name: a.name, file, px: a.px, py: a.py, w: img.width, h: img.height, scale,
    cols: Math.max(1, Math.round(img.width / (scale * a.px))),
    rows: Math.max(1, Math.round(img.height / (scale * a.py))),
    frames: a.frames || null, kind: a.kind,
  }
}

// game.lua does this at the end of init_item_prototypes:
//   self.ASSET_ATLAS.Planet = self.ASSET_ATLAS.Tarot
//   self.ASSET_ATLAS.Spectral = self.ASSET_ATLAS.Tarot
// without it planet and spectral cards resolve to a missing atlas and render blank.
for (const alias of ['Planet', 'Spectral']) {
  if (!atlases[alias] && atlases.Tarot) atlases[alias] = atlases.Tarot
}

// ---------------------------------------------------------------- locales
const LOCALES = [['en-us', 'English'], ['zh_CN', '简体中文'], ['zh_TW', '繁體中文'], ['ja', '日本語'], ['ko', '한국어']]
const locData = {}
const KEEP_SETS = ['Back', 'Blind', 'Edition', 'Enhanced', 'Joker', 'Other', 'Planet', 'Spectral', 'Stake', 'Tag', 'Tarot', 'Voucher']
const KEEP_MISC = ['poker_hands', 'poker_hand_descriptions', 'labels', 'dictionary', 'v_dictionary', 'suits_singular', 'suits_plural', 'ranks', 'challenge_names', 'collabs', 'blind_states']
for (const [code] of LOCALES) {
  const t = lua.resolve(lua.extractAndParse(read(`localization/${code}.lua`), 'return {'))
  const descriptions = {}
  for (const s of KEEP_SETS) descriptions[s] = t.descriptions?.[s] || {}
  const misc = {}
  for (const m of KEEP_MISC) misc[m] = t.misc?.[m] || {}
  locData[code] = { descriptions, misc }
}
const EN = locData['en-us']

// ---------------------------------------------------------------- text helpers
const SUITS = { Spades: 1, Hearts: 1, Clubs: 1, Diamonds: 1 }

function toArray (text) {
  if (text === undefined || text === null) return []
  if (Array.isArray(text)) return text.slice()
  if (typeof text === 'string') return [text]
  if (typeof text === 'object') return Object.keys(text).sort((a, b) => Number(a) - Number(b)).map((k) => text[k]).filter((x) => typeof x === 'string')
  return []
}

/** Flatten nested config values in declaration order, ignoring boolean flags. */
function flatten (v, out) {
  if (v === null || v === undefined) return out
  if (Array.isArray(v)) { for (const x of v) flatten(x, out); return out }
  if (typeof v === 'object') {
    if ('expr' in v) { out.push({ __exprText: v.expr }); return out }
    if ('hex' in v) { out.push(v.hex); return out }
    for (const k of Object.keys(v)) flatten(v[k], out)
    return out
  }
  if (typeof v === 'boolean' || typeof v === 'function') return out
  out.push(v)
  return out
}

const exprKey = (v) => {
  if (v && typeof v === 'object') {
    const m = /(['"])(.*?)\1/.exec(v.expr || '')
    return m ? m[2] : null
  }
  return String(v)
}

/** The game fills #n# with values it computes at runtime; these mirror that mapping. */
const PROB = 1 // G.GAME.probabilities.normal
const SUIT_POOL = ['Spades', 'Hearts', 'Clubs', 'Diamonds']
const RANK_POOL = ['Ace', 'King', 'Queen', 'Jack', '10', '9']
const SPECIAL_CANDIDATES = {
  j_8_ball: () => [PROB, 4],
  j_space: () => [PROB, 4],
  j_business: () => [PROB, 2],
  j_hallucination: () => [PROB, 2],
  j_reserved_parking: (c) => [c.config.extra.dollars, PROB, c.config.extra.odds],
  j_gros_michel: (c) => [c.config.extra.mult, PROB, c.config.extra.odds],
  j_cavendish: (c) => [c.config.extra.Xmult, PROB, c.config.extra.odds],
  j_bloodstone: (c) => [PROB, c.config.extra.odds, c.config.extra.Xmult],
  m_glass: (c) => [c.config.Xmult, PROB, c.config.extra],
  m_lucky: (c) => [PROB, c.config.mult, 5, c.config.p_dollars, 15],
  j_blackboard: (c) => [c.config.extra, { __suitPlural: 'Spades' }, { __suitPlural: 'Clubs' }],
  j_diet_cola: () => [{ __center: 'tag_double' }],
  j_trousers: (c) => [c.config.extra, { __hand: 'Two Pair' }, { __dynamic: 'mult' }],
  j_ancient: (c) => [c.config.extra, { __suitPlural: 'Spades' }],
  j_idol: (c) => [c.config.extra, { __rank: RANK_POOL[0] }, { __suitPlural: SUIT_POOL[0] }],
  j_mail: (c) => [c.config.extra, { __rank: RANK_POOL[0] }],
  j_castle: (c) => [c.config.extra.chip_mod, { __suitSingular: SUIT_POOL[0] }, c.config.extra.chips],
  j_erosion: (c) => [c.config.extra, { __dynamic: 'mult' }, 52],
  j_yorick: (c) => [c.config.extra.xmult, c.config.extra.discards, { __dynamic: 'countdown' }, { __dynamic: 'xmult' }],
  j_invisible: (c) => [c.config.extra, { __dynamic: 'rounds' }],
  j_drivers_license: (c) => [c.config.extra, { __dynamic: 'count' }],
  j_steel_joker: (c) => [c.config.extra, { __dynamic: 'xmult' }],
  c_base: () => ['Ace', { __suitPlural: 'Spades' }],
  sticker_perishable: () => [5, { __dynamic: 'rounds' }],
  sticker_rental: () => [3],
}
// stickers are keyed both bare and prefixed depending on the call site
SPECIAL_CANDIDATES.perishable = SPECIAL_CANDIDATES.sticker_perishable
SPECIAL_CANDIDATES.rental = SPECIAL_CANDIDATES.sticker_rental

const SYNTH_TEXT = {
  c_base: {
    'en-us': ['Blank card body — every playing card face is drawn on top of this frame.'],
    zh_CN: ['空白卡体 —— 所有扑克牌牌面都绘制在这个底框之上。'],
    zh_TW: ['空白卡體 —— 所有撲克牌牌面都繪製在這個底框之上。'],
    ja: ['空のカード本体 —— すべてのトランプの絵柄はこの上に描画されます。'],
    ko: ['빈 카드 본체 —— 모든 트럼프 카드 그림은 이 위에 그려집니다.'],
  },
}

/** Per-category ordered list of the values the game feeds into #1#, #2#, ... */
function candidatesFor (key, set, c) {
  if (SPECIAL_CANDIDATES[key]) return SPECIAL_CANDIDATES[key](c)
  const cfg = c.config || {}
  switch (set) {
    case 'Tarot': {
      const out = []
      if (cfg.max_highlighted != null) out.push(cfg.max_highlighted)
      if (typeof cfg.mod_conv === 'string' && cfg.mod_conv.startsWith('m_')) out.push({ __enh: cfg.mod_conv })
      if (cfg.suit_conv) out.push({ __suitPlural: cfg.suit_conv })
      if (cfg.extra != null) out.push(cfg.extra)
      if (cfg.planets != null) out.push(cfg.planets)
      if (cfg.tarots != null) out.push(cfg.tarots)
      if (key === 'c_wheel_of_fortune') return [1, cfg.extra]
      if (key === 'c_temperance') return [cfg.extra, { __dynamic: 'sell value' }]
      return out
    }
    case 'Planet': {
      const h = HANDS[cfg.hand_type] || {}
      return [1, { __hand: cfg.hand_type }, h.l_mult, h.l_chips]
    }
    case 'Spectral': {
      if (key === 'c_ectoplasm') return [1]
      return flatten(cfg, [])
    }
    case 'Booster':
      return [cfg.choose, cfg.extra]
    case 'Back': {
      const out = []
      for (const k of Object.keys(cfg)) {
        const v = cfg[k]
        if (typeof v === 'boolean') continue
        if (k === 'voucher') out.push({ __center: v })
        else if (k === 'vouchers' || k === 'consumables') { for (const x of [].concat(v)) out.push({ __center: x }) }
        else if (typeof v === 'number') out.push(Math.abs(v))
        else if (typeof v === 'string') out.push(v)
      }
      if (key === 'b_anaglyph') out.push({ __center: 'tag_double' })
      return out
    }
    case 'Voucher':
      if (cfg.extra_disp != null) return [cfg.extra_disp]
      return flatten(cfg, [])
    case 'Blind': {
      const vars = Array.isArray(c.vars) ? c.vars : []
      return vars.map((v) => ({ __dict: exprKey(v) }))
    }
    case 'Stake':
      return []
    default:
      return flatten(cfg, [])
  }
}

function fillVars (arr, cands, loc, nameOf) {
  return arr.map((line) => String(line).replace(/#(\d+)#/g, (m, n) => {
    const v = cands[Number(n) - 1]
    if (v === undefined || v === null) return m
    if (typeof v === 'object') {
      if (v.__enh) return loc.descriptions.Enhanced?.[v.__enh]?.name || nameOf?.(v.__enh) || v.__enh
      if (v.__suitPlural) return loc.misc.suits_plural?.[v.__suitPlural] || v.__suitPlural
      if (v.__suitSingular) return loc.misc.suits_singular?.[v.__suitSingular] || v.__suitSingular
      if (v.__rank) return loc.misc.ranks?.[v.__rank] || v.__rank
      if (v.__hand) return loc.misc.poker_hands?.[v.__hand] || v.__hand
      if (v.__dict) return loc.misc.dictionary?.[v.__dict] || v.__dict
      if (v.__center) return nameOf?.(v.__center) || v.__center
      if (v.__exprText) return v.__exprText
      return m
    }
    if (typeof v === 'boolean') return v ? 'Yes' : 'No'
    if (typeof v === 'string') {
      if (SUITS[v] && loc.misc.suits_singular?.[v]) return loc.misc.suits_singular[v]
      if (loc.misc.poker_hands?.[v]) return loc.misc.poker_hands[v]
      return v
    }
    return String(Math.round(v * 1000) / 1000)
  }))
}

// ---------------------------------------------------------------- items
const items = []
const nameOf = (k) => EN.descriptions.Joker?.[k]?.name || EN.descriptions.Enhanced?.[k]?.name || EN.descriptions.Tag?.[k]?.name || P_CENTERS[k]?.name || k

function nameI18n (key, set, fallback) {
  const out = {}
  for (const [code] of LOCALES) {
    const d = locData[code].descriptions[set]?.[key]
    if (d && d.name) out[code] = d.name
  }
  if (!Object.keys(out).length && fallback) out['en-us'] = fallback
  return { i18n: out, name: out['en-us'] || fallback || key }
}

/* 少数条目在各语言表里根本没有名字（游戏里也不会显示），这里直接写死。
   c_base 是"所有牌面画在它上面"的空白卡体，只有图鉴里会出现。 */
const MANUAL_NAMES = {
  c_base: { 'en-us': 'Default Base', zh_CN: '默认牌面底框', zh_TW: '預設牌面底框', ja: '既定のカード本体', ko: '기본 카드 본체' },
  soul: { 'en-us': 'Soul Sprite', zh_CN: '灵魂虚影', zh_TW: '靈魂虛影', ja: 'ソウルの亡霊', ko: '소울 유령' },
}

/** 按候选键 / 候选表逐语言找名字。我们用的 id 有时和本地化键不同：
 *  补充包带序号（p_arcana_normal_1 → p_arcana_normal）、蜡封是 gold_seal、
 *  注数贴纸是 stake_white —— 找不到才退回英文名。 */
function nameCand (keys, sets, fallback) {
  const out = {}
  for (const [code] of LOCALES) {
    for (const set of sets) {
      for (const k of keys) {
        const d = locData[code].descriptions[set]?.[k]
        if (d && d.name) { out[code] = d.name; break }
      }
      if (out[code]) break
    }
    if (!out[code]) {
      const man = keys.map((k) => MANUAL_NAMES[k]?.[code]).find(Boolean)
      if (man) out[code] = man
    }
  }
  if (!Object.keys(out).length && fallback) out['en-us'] = fallback
  return { i18n: out, name: out['en-us'] || fallback || keys[0] }
}

/** 扑克牌在游戏里"牌面就是名字"，各语言的名字用"花色 + 点数"拼出来（红桃2 / スペードJ）。 */
const RANK_TXT = {
  1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  Ace: 'A', Jack: 'J', Queen: 'Q', King: 'K',
  Two: '2', Three: '3', Four: '4', Five: '5', Six: '6', Seven: '7', Eight: '8', Nine: '9', Ten: '10',
}
function cardNameI18n (c) {
  const out = {}
  for (const [code] of LOCALES) {
    const m = locData[code].misc
    const suit = m.suits_singular?.[c.suit] || m.suits_plural?.[c.suit] || c.suit
    out[code] = suit + (RANK_TXT[c.value] || c.value)
  }
  return out
}

function textI18n (key, set, c, extra) {
  const i18n = {}
  const textRaw = {}
  const cands = candidatesFor(key, set, c)
  for (const [code] of LOCALES) {
    /* 补充包的名字和说明都挂在没有序号的那个键上（p_arcana_normal_1 → p_arcana_normal），
       而且这版游戏把它放在 Other 里而不是 Booster 里 */
    const bare = key.replace(/_\d+$/, '')
    let src = locData[code].descriptions[set]?.[key]
    if (!src && bare !== key) src = locData[code].descriptions[set]?.[bare] || locData[code].descriptions.Other?.[bare]
    let arr = toArray(src?.text)
    if (extra && extra.getText) {
      const ov = extra.getText(code)
      if (ov) arr = ov
    }
    if (!arr.length) continue
    textRaw[code] = arr
    i18n[code] = fillVars(arr, cands, locData[code], nameOf)
  }
  return { i18n, textRaw }
}

const SEAL_POS = { Gold: { x: 2, y: 0 }, Purple: { x: 4, y: 4 }, Red: { x: 5, y: 4 }, Blue: { x: 6, y: 4 } }
const STICKER_POS = {
  eternal: { x: 0, y: 0 }, perishable: { x: 0, y: 2 }, rental: { x: 1, y: 2 },
  White: { x: 1, y: 0 }, Red: { x: 2, y: 0 }, Green: { x: 3, y: 0 }, Black: { x: 0, y: 1 },
  Blue: { x: 4, y: 0 }, Purple: { x: 1, y: 1 }, Orange: { x: 2, y: 1 }, Gold: { x: 3, y: 1 },
}
const SET_CATEGORY = {
  Joker: 'Joker', Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral', Voucher: 'Voucher',
  Booster: 'Booster', Back: 'Deck', Enhanced: 'Enhancement', Edition: 'Edition', Default: 'Base',
}

/** G.CARD_W / G.CARD_H from globals.lua — the card's size in world units. */
const CARD_W_WORLD = 2.4 * 35 / 41;
const CARD_H_WORLD = 2.4 * 47 / 41;
/**
 * Card:set_ability resizes the card BOX for a few centres, which stretches the
 * (always 71x95) sprite into that box. Values are fractions of the normal card.
 */
const BOX_OVERRIDE = {
  'Half Joker': { w: 1, h: 1 / 1.7 },
  Photograph: { w: 1, h: 1 / 1.2 },
  'Square Joker': { w: 1, h: CARD_W_WORLD / CARD_H_WORLD },
  'Wee Joker': { w: 0.7, h: 0.7 },
}

/** Mirrors Card:set_sprites for choosing the atlas + tile of a P_CENTERS entry. */
function centerSprite (c) {
  if (c.set === 'Joker') return { atlas: 'Joker', pos: c.pos }
  if (c.consumeable) return { atlas: c.set, pos: c.pos }
  if (c.set === 'Voucher') return { atlas: 'Voucher', pos: c.pos }
  if (c.set === 'Booster') return { atlas: 'Booster', pos: c.pos }
  if (c.atlas) return { atlas: c.atlas, pos: c.pos }
  return { atlas: 'centers', pos: c.pos }
}

/**
 * Extra card.lua draw layers keyed by centre set, exactly as Card:draw applies them:
 *   Voucher  -> 'voucher' shader on the centre sprite
 *   Booster  -> 'booster' shader on the centre sprite
 *   Spectral -> 'booster' shader on the centre sprite (+ a floating soul for The Soul)
 */
const SET_SHADER = { Voucher: 'voucher', Booster: 'booster', Spectral: 'booster' }
/** The Soul's floating ghost sprite lives in the centres atlas (P_CENTERS.soul). */
const SOUL_SPRITE = P_CENTERS.soul ? { atlas: 'centers', pos: P_CENTERS.soul.pos } : null

function soulFor (key, c) {
  // soul_pos = a second sprite drawn above the card and animated (legendaries + Hologram)
  if (c.soul_pos) return { atlas: 'Joker', pos: c.soul_pos, kind: 'float' }
  if (key === 'c_soul' && SOUL_SPRITE) return { atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos, kind: 'soul' }
  return null
}

for (const key of Object.keys(P_CENTERS)) {
  const c = P_CENTERS[key]
  const set = c.set || 'Other'
  const tx = textI18n(key, set, c, {
    getText: (code) => {
      if (SYNTH_TEXT[key]) return SYNTH_TEXT[key][code] || SYNTH_TEXT[key]['en-us']
      if (key === 'm_bonus') {
        // Bonus Card has no localised text in any shipped locale; reuse Steel Card's
        // chip line, which is the same sentence shape.
        const src = toArray(locData[code].descriptions.Enhanced?.m_stone?.text)
        return src.length ? [src[0]] : null
      }
      return null
    },
  })
  const nm = nameCand([key, key.replace(/_\d+$/, '')], [set, 'Other'], c.name)
  const sp = centerSprite(c)
  items.push({
    id: key, key, cat: SET_CATEGORY[set] || 'Other', set,
    order: c.order ?? 999, name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: sp.atlas, pos: sp.pos || null,
    sprite: { kind: 'center', atlas: sp.atlas, pos: sp.pos || null },
    // card box, as a fraction of the normal card (see Card:set_ability)
    box: BOX_OVERRIDE[c.name] || (set === 'Booster' ? { w: 1.27, h: 1.27 } : null),
    soul: soulFor(key, c),
    setShader: SET_SHADER[set] || null,
    rarity: c.rarity, cost: c.cost, unlocked: c.unlocked, discovered: c.discovered,
    effect: c.effect, label: c.label, weight: c.weight, kind: c.kind, stake: c.stake,
    blueprint_compat: c.blueprint_compat, eternal_compat: c.eternal_compat, perishable_compat: c.perishable_compat,
    hidden: c.hidden, omit: c.omit, demo: c.demo, wip: c.wip,
    requires: c.requires, unlock_condition: c.unlock_condition, config: c.config || {},
    soul_pos: c.soul_pos || null, raw: c,
  })
}

const BOOSTER_TEXT_KEY = (key, c) => {
  const size = key.includes('_jumbo_') ? 'jumbo' : key.includes('_mega_') ? 'mega' : 'normal'
  return 'p_' + String(c.kind || '').toLowerCase() + '_' + size
}

// Boosters share three generic sentences located under descriptions.Other.
for (const it of items) {
  if (it.cat !== 'Booster') continue
  const otherKey = BOOSTER_TEXT_KEY(it.id, it.raw)
  const i18n = {}
  const raw = {}
  const cands = candidatesFor(it.id, 'Booster', it.raw)
  for (const [code] of LOCALES) {
    const arr = toArray(locData[code].descriptions.Other?.[otherKey]?.text)
    if (!arr.length) continue
    raw[code] = arr
    i18n[code] = fillVars(arr, cands, locData[code], nameOf)
  }
  it.text = i18n
  it.textRaw = raw
}

for (const key of Object.keys(P_SEALS)) {
  const s = P_SEALS[key]
  const nm = nameCand([key.toLowerCase() + '_seal'], ['Other'], key + ' Seal')
  const tx = textI18n(key.toLowerCase() + '_seal', 'Other', {})
  items.push({
    id: 'seal_' + key, key, cat: 'Seal', set: 'Seal', order: s.order ?? 99,
    name: nm.name,
    i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'centers', pos: SEAL_POS[key] || { x: 0, y: 0 },
    sprite: { kind: 'overlay', atlas: 'centers', pos: SEAL_POS[key] || { x: 0, y: 0 } },
    config: {}, raw: s,
  })
}

for (const key of Object.keys(P_TAGS)) {
  const t = P_TAGS[key]
  const nm = nameI18n(key, 'Tag', t.name)
  const tx = textI18n(key, 'Tag', t)
  items.push({
    id: key, key, cat: 'Tag', set: 'Tag', order: t.order ?? 99,
    name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'tags', pos: t.pos, sprite: { kind: 'tag', atlas: 'tags', pos: t.pos },
    min_ante: t.min_ante, requires: t.requires, config: t.config || {}, raw: t,
  })
}

for (const key of Object.keys(P_BLINDS)) {
  const b = P_BLINDS[key]
  const nm = nameI18n(key, 'Blind', b.name)
  const tx = textI18n(key, 'Blind', b)
  items.push({
    id: key, key, cat: 'Blind', set: 'Blind', order: b.order ?? 99,
    name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'blind_chips', pos: b.pos,
    sprite: { kind: 'blind', atlas: 'blind_chips', pos: b.pos, frames: 21 },
    dollars: b.dollars, mult: b.mult, boss: b.boss, debuff: b.debuff, boss_colour: b.boss_colour,
    config: (b.vars && b.vars.length) ? { vars: b.vars } : {}, raw: b,
  })
}

for (const key of Object.keys(P_STAKES)) {
  const s = P_STAKES[key]
  const nm = nameI18n(key, 'Stake', s.name)
  const tx = textI18n(key, 'Stake', s)
  items.push({
    id: key, key, cat: 'Stake', set: 'Stake', order: s.order ?? 99,
    name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'chips', pos: s.pos, sprite: { kind: 'stake', atlas: 'chips', pos: s.pos },
    stake_level: s.stake_level, config: {}, raw: s,
  })
}

for (const key of Object.keys(STICKER_POS)) {
  const isRun = ['eternal', 'perishable', 'rental'].includes(key)
  /* 三个运行期贴纸的名字在 Other 里（eternal/perishable/rental），
     注数贴纸的名字是赌注的名字（sticker_White → descriptions.Stake.stake_white → 白注） */
  const nm = isRun
    ? nameCand([key], ['Other'], key[0].toUpperCase() + key.slice(1))
    : nameCand(['stake_' + key.toLowerCase()], ['Stake'], key + ' Stake')
  const tx = textI18n(key, 'Other', {})
  items.push({
    id: 'sticker_' + key, key, cat: 'Sticker', set: 'Sticker', order: isRun ? 1 : 2,
    name: nm.name,
    i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'stickers', pos: STICKER_POS[key],
    sprite: { kind: 'sticker', atlas: 'stickers', pos: STICKER_POS[key] },
    config: {}, raw: {},
  })
}

for (const key of Object.keys(P_CARDS)) {
  const c = P_CARDS[key]
  items.push({
    id: key, key, cat: 'PlayingCard', set: 'PlayingCard', order: (c.pos.y * 13) + c.pos.x,
    name: c.name, i18n: cardNameI18n(c), text: {}, textRaw: {},
    atlas: 'cards_1', pos: c.pos, sprite: { kind: 'playingcard', atlas: 'cards_1', pos: c.pos },
    value: c.value, suit: c.suit, config: {}, raw: c,
  })
}

/* 联动牌的名字在 misc.collabs[花色][序号] 里，序号就是这张牌在 globals.lua 的
   G.COLLABS.options[花色] 里的下标（1 起算，"1" 是"默认"）。以前按 collabs['TW'] 去找，
   永远找不到，所以界面上一直显示裸 id "collab_TW — Jack of Spades"。 */
const collabNameAt = (code, suit, idx) => locData[code].misc.collabs?.[suit]?.[String(idx)] || null
for (const suit of Object.keys(COLLABS.options || {})) {
  for (const opt of COLLABS.options[suit]) {
    if (opt === 'default') continue
    const idx = COLLABS.options[suit].indexOf(opt) + 1
    for (const rank of ['Jack', 'Queen', 'King']) {
      const i18n = {}
      for (const [code] of LOCALES) {
        const base = collabNameAt(code, suit, idx)
        if (base) i18n[code] = base + ' · ' + (locData[code].misc.suits_plural?.[suit] || suit) + (code === 'en-us' ? ' ' : '') + ({ Jack: 'J', Queen: 'Q', King: 'K' })[rank]
      }
      const cn = collabNameAt('en-us', suit, idx) || opt
      items.push({
        id: `${opt}_${rank}`, key: `${opt}_${rank}`, cat: 'Collab', set: 'Collab', order: 0,
        name: i18n['en-us'] || `${cn} — ${rank} of ${suit}`, i18n, text: {}, textRaw: {},
        atlas: opt + '_1', pos: COLLABS.pos[rank],
        sprite: { kind: 'collab', atlas: opt + '_1', atlas2: opt + '_2', pos: COLLABS.pos[rank] },
        suit, value: rank, config: {}, raw: { suit, rank, collab: opt },
        collab: opt, collabName: cn,
      })
    }
  }
}

// ---------------------------------------------------------------- overlay layers
// Card.lua stacks extra art on top of certain cards; expose those layers as
// first-class, extractable entries so nothing is hidden inside a composite.
const OVERLAY_ITEMS = []
if (SOUL_SPRITE) {
  OVERLAY_ITEMS.push({
    id: 'overlay_soul', key: 'overlay_soul', cat: 'Overlay', set: 'Overlay', order: 1,
    name: '灵魂虚影 Soul', i18n: {}, text: {}, textRaw: {},
    atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos,
    sprite: { kind: 'overlay', atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos },
    note: '叠加层：原版在「灵魂 The Soul」这张幽灵牌上用 G.shared_soul 绘制，带正弦缩放的浮动动画。可单独提取。',
    config: {}, raw: { source: 'G.P_CENTERS.soul', atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos },
  })
}
for (const key of Object.keys(P_CENTERS)) {
  const c = P_CENTERS[key]
  if (!c.soul_pos) continue
  OVERLAY_ITEMS.push({
    id: 'overlay_' + key, key: 'overlay_' + key, cat: 'Overlay', set: 'Overlay',
    order: 2 + (c.order ?? 999), name: (c.name || key) + ' 悬浮立绘', i18n: {}, text: {}, textRaw: {},
    atlas: 'Joker', pos: c.soul_pos,
    sprite: { kind: 'overlay', atlas: 'Joker', pos: c.soul_pos },
    note: `叠加层：原版用 children.floating_sprite 把它画在「${c.name || key}」(${key}) 的卡面之上，并做正弦缩放 / 旋转的浮动动画。可单独提取。`,
    config: {}, raw: { source: `${key}.soul_pos`, atlas: 'Joker', pos: c.soul_pos },
  })
}
for (const o of OVERLAY_ITEMS) items.push(o)

for (const key of Object.keys(CHALLENGES)) {  const c = CHALLENGES[key]
  if (!c || !c.id) continue
  const i18n = {}
  for (const [code] of LOCALES) {
    const v = locData[code].misc.challenge_names?.[c.id]
    if (v) i18n[code] = v
  }
  items.push({
    id: c.id, key: c.id, cat: 'Challenge', set: 'Challenge', order: Number(key) + 1,
    name: i18n['en-us'] || c.name, i18n, text: {}, textRaw: {},
    atlas: null, pos: null, sprite: null,
    unlocked: c.unlocked, rules: c.rules, jokers: c.jokers, deck: c.deck,
    consumables: c.consumables, vouchers: c.vouchers, config: {}, raw: c,
  })
}

// ---------------------------------------------------------------- hands
const handItems = Object.keys(HANDS).map((k) => {
  const h = HANDS[k]
  const i18n = {}
  for (const [code] of LOCALES) if (locData[code].misc.poker_hands?.[k]) i18n[code] = locData[code].misc.poker_hands[k]
  const desc = {}
  for (const [code] of LOCALES) {
    const v = locData[code].misc.poker_hand_descriptions?.[k]
    if (v) desc[code] = toArray(v)
  }
  return {
    key: k, name: i18n['en-us'] || k, i18n, desc,
    order: h.order, visible: h.visible, chips: h.chips, mult: h.mult, level: h.level,
    l_chips: h.l_chips, l_mult: h.l_mult,
    example: (h.example || []).map((e) => (Array.isArray(e) ? e[0] : e)),
  }
}).sort((a, b) => a.order - b.order)

// ---------------------------------------------------------------- textures on disk
const ALL_TEX = listTree('resources/textures')
  .filter((r) => r.toLowerCase().endsWith('.png'))
  .sort()
const atlasIndex = ALL_TEX.map((rel) => {
  const img = pngSize(bytesAt('resources/textures/' + rel))
  return { file: rel, w: img.width, h: img.height }
})

// ---------------------------------------------------------------- colour palette
function rgbaToHex (v) {
  if (!v) return null
  if (typeof v === 'object' && v.hex) return v.hex
  if (Array.isArray(v)) {
    const b = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')
    return '#' + b(v[0]) + b(v[1]) + b(v[2])
  }
  return null
}
const GC = (() => {
  const t = lua.resolve(lua.extractAndParse(globalsSrc, 'self.C = {'))
  return t
})()
/* game.lua:42-46 一启动就把 G.C.SUITS 换成 SO_1（高对比 colourblind_option 打开时换 SO_2），
   button_callbacks.lua:1757-1761 切开关时也做同样的事。所以「按花色上色」的文字（{C:spades} 这类）
   用的是 SO_1，而不是 globals 里 SUITS 的字面值 —— 我们以前取的是字面值，和游戏里的颜色对不上。 */
const SO_1 = GC.SO_1 || {}, SO_2 = GC.SO_2 || {}
const suitAt = (tbl, k) => rgbaToHex((tbl && tbl[k]) || GC.SUITS?.[k])
const SUIT_STD = {}, SUIT_HC = {}
for (const [tag, key] of [['spades', 'Spades'], ['hearts', 'Hearts'], ['clubs', 'Clubs'], ['diamonds', 'Diamonds']]) {
  SUIT_STD[tag] = suitAt(SO_1, key)
  SUIT_HC[tag] = suitAt(SO_2, key)
}
const LOC_COLOURS = {
  red: rgbaToHex(GC.RED), mult: rgbaToHex(GC.MULT), blue: rgbaToHex(GC.BLUE), chips: rgbaToHex(GC.CHIPS),
  green: rgbaToHex(GC.GREEN), money: rgbaToHex(GC.MONEY), gold: rgbaToHex(GC.GOLD),
  attention: rgbaToHex(GC.FILTER), purple: rgbaToHex(GC.PURPLE), white: rgbaToHex(GC.WHITE),
  inactive: rgbaToHex(GC.UI?.TEXT_INACTIVE) || '#8b9298', black: rgbaToHex(GC.BLACK),
  light_black: rgbaToHex(GC.L_BLACK), grey: rgbaToHex(GC.GREY),
  ...SUIT_STD,
  tarot: rgbaToHex(GC.SECONDARY_SET?.Tarot), planet: rgbaToHex(GC.SECONDARY_SET?.Planet),
  spectral: rgbaToHex(GC.SECONDARY_SET?.Spectral), enhanced: rgbaToHex(GC.SECONDARY_SET?.Enhanced),
  edition: rgbaToHex(GC.EDITION), dark_edition: rgbaToHex(GC.DARK_EDITION),
  legendary: rgbaToHex(GC.RARITY?.[4]) || rgbaToHex(GC.RARITY?.[3]),
  voucher: rgbaToHex(GC.VOUCHER), booster: rgbaToHex(GC.BOOSTER), eternal: rgbaToHex(GC.ETERNAL),
}
const PALETTE = {
  mult: rgbaToHex(GC.MULT), chips: rgbaToHex(GC.CHIPS), money: rgbaToHex(GC.MONEY),
  red: rgbaToHex(GC.RED), blue: rgbaToHex(GC.BLUE), green: rgbaToHex(GC.GREEN),
  orange: rgbaToHex(GC.ORANGE), gold: rgbaToHex(GC.GOLD), purple: rgbaToHex(GC.PURPLE),
  black: rgbaToHex(GC.BLACK), white: rgbaToHex(GC.WHITE), dark: rgbaToHex(GC.UI?.TEXT_DARK) || '#0f1114',
  light: rgbaToHex(GC.UI?.TEXT_LIGHT) || '#e9eef2',
  rarity: (GC.RARITY || []).map(rgbaToHex),
  set: Object.fromEntries(Object.entries(GC.SET || {}).map(([k, v]) => [k, rgbaToHex(v)])),
  secondarySet: Object.fromEntries(Object.entries(GC.SECONDARY_SET || {}).map(([k, v]) => [k, rgbaToHex(v)])),
  suits: SUIT_STD, suitsHC: SUIT_HC,
  duel: { Hearts: rgbaToHex(GC.SUITS?.Hearts), Diamonds: rgbaToHex(GC.SUITS?.Diamonds), Spades: rgbaToHex(GC.SUITS?.Spades), Clubs: rgbaToHex(GC.SUITS?.Clubs) },
}

// ---------------------------------------------------------------- shaders
const SHADER_DIR = 'resources/shaders/'
const LIVE_SHADERS = {
  foil: 'e_foil', holo: 'e_holo', polychrome: 'e_polychrome', negative: 'e_negative',
  negative_shine: 'e_negative', booster: 'booster', voucher: 'voucher', hologram: 'hologram',
}
const SHADER_NOTE = {
  foil: '闪箔：金属斜光闪烁（原版版本特效）',
  holo: '镭射：彩虹栅格干涉（原版版本特效）',
  polychrome: '多彩：色相流动（原版版本特效）',
  negative: '负片：反相冷色（原版版本特效）',
  negative_shine: '负片叠加的光泽层（与 negative 一起使用）',
  dissolve: '卡牌出场 / 溶解动画，同时负责描边与阴影',
  debuff: '被 Boss 盲注削弱的卡牌着色',
  played: '已打出的卡牌变灰',
  voucher: '优惠券 / 贴纸的流光边框',
  booster: '补充包 / 幽灵牌的幽蓝流光，同时用于卡牌呼吸高光',
  voucher: '优惠券的流光边框；黄金蜡封与贴纸也用同一个着色器',
  hologram: '全息影像的故障位移 + 辉光（原版只用在全息小丑的悬浮立绘上）',
  gold_seal: '黄金蜡封的金色流动',
  hologram: '全息影像的浮动扫描线',
  flame: '篝火 / 燃烧效果',
  flash: '闪白过渡',
  splash: '开场水花',
  background: '游戏背景的噪点与暗角',
  vortex: '盲注选择界面的漩涡过渡',
  CRT: 'CRT 滤镜（设置里可选开启）',
  skew: '牌面倾斜的顶点扰动',
}
const shaders = listTree('resources/shaders').filter((f) => f.endsWith('.fs') && !f.includes('/')).sort().map((f) => {
  const key = f.replace(/\.fs$/, '')
  const src = read(SHADER_DIR + f)
  return {
    name: key, file: 'resources/shaders/' + f, size: textBytes(src),
    live: LIVE_SHADERS[key] || null, note: SHADER_NOTE[key] || '', source: src,
  }
})

// ---------------------------------------------------------------- composition rules
const composition = {
  cardW: 71, cardH: 95,
  baseCenter: { atlas: 'centers', pos: P_CENTERS.c_base.pos },
  cardFronts: { normal: 'cards_1', highContrast: 'cards_2' },
  enhancementAtlas: 'centers',
  sealPos: SEAL_POS,
  stickerPos: STICKER_POS,
  setShader: SET_SHADER,
  soulSprite: SOUL_SPRITE,
  soulCarriers: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].soul_pos).map((k) => ({ key: k, name: P_CENTERS[k].name, pos: P_CENTERS[k].pos, soul_pos: P_CENTERS[k].soul_pos })),
  cardShaders: {
    edition: { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' },
    set: SET_SHADER,
    goldSeal: 'voucher',
    sticker: 'voucher',
    hologram: 'hologram',
  },
  deckBacks: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].set === 'Back').map((k) => ({ key: k, pos: P_CENTERS[k].pos, name: P_CENTERS[k].name })),
  editions: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].set === 'Edition').map((k) => ({
    key: k, name: P_CENTERS[k].name, config: P_CENTERS[k].config,
    shader: { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' }[k] || null,
  })),
  enhancements: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].set === 'Enhanced').map((k) => ({ key: k, pos: P_CENTERS[k].pos, name: P_CENTERS[k].name })),
  seals: Object.keys(P_SEALS),
}

const data = {
  meta: {
    game: 'Balatro',
    version: (read('version.jkr') || '').split(/\r?\n/)[0].trim(),
    source: env.source || 'Balatro',
    generated: env.now || new Date().toISOString(),
    itemCount: items.length,
    locales: LOCALES.map(([code, label]) => ({ code, label })),
  },
  atlases, atlasIndex, items, hands: handItems, composition, loc: locData, shaders,
  colors: { tags: LOC_COLOURS, tagsHC: Object.assign({}, LOC_COLOURS, SUIT_HC), palette: PALETTE },
  counts: items.reduce((acc, i) => { acc[i.cat] = (acc[i.cat] || 0) + 1; return acc }, {}),
}

// every texture the viewer may ask for, so the caller can pack or serve them
const textures = []
for (const a of Object.values(atlases)) {
  for (const f of [a.file, a.file.replace(/^2x\//, '1x/')]) {
    const b = bytesAt(TEX + f)
    if (b && !textures.some((t) => t.file === f)) textures.push({ file: f, bytes: b })
  }
}
for (const e of atlasIndex) if (!textures.some((t) => t.file === e.file)) {
  const b = bytesAt(TEX + e.file)
  if (b) textures.push({ file: e.file, bytes: b })
}
const leftovers = items.filter((i) => JSON.stringify(i.text).includes('#') && /#\d+#/.test(JSON.stringify(i.text['en-us'] || [])))
/* 游戏自带的字体：站点版会把它注册成 BalatroPixel，界面才和原版一样 */
const fonts = []
for (const f of listTree('resources/fonts')) {
  if (!/\.(ttf|otf)$/i.test(f) || f.includes('/')) continue
  const b = bytesAt('resources/fonts/' + f)
  if (b) fonts.push({ file: f, bytes: b })
}
return {
  data, textures, fonts, warnings,
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
if (typeof window !== 'undefined') window.__DATABUILD__ = { buildData }

;
/* ============================================================================
 * gameparse.js — build the viewer's dataset from the user's own copy of the game,
 * inside the page.
 *
 * Two inputs:
 *   · Balatro.exe (or any zip that holds the LÖVE project)   -> parseGameExe(buf)
 *   · an extracted game folder (game.lua + resources/…)      -> parseGameFiles(list)
 *
 * Nothing is uploaded. Only the files the builder actually needs are read:
 * game.lua / globals.lua / challenges.lua / version.jkr, localization/*.lua,
 * resources/textures/**.png and resources/shaders/*.fs.
 *
 * Exposes window.__GAMEPARSE__ = { parseGameExe, parseGameFiles, zipEntries,
 *                                  pngSize, loveRoot, NEEDED }
 * ==========================================================================*/
(function () {
  'use strict'

  const LUA = (typeof window !== 'undefined' && window.__LUA__) || (typeof require !== 'undefined' ? require('./lua') : null)
  const BUILDER = (typeof window !== 'undefined' && window.__DATABUILD__) || (typeof require !== 'undefined' ? require('./databuild') : null)

  /** Only these are read out of the archive; everything else stays untouched. */
  const NEEDED = [
    /^game\.lua$/,
    /^globals\.lua$/,
    /^challenges\.lua$/,
    /^version\.jkr$/,
    /^localization\/[^/]+\.lua$/,
    /^resources\/textures\/.*\.png$/i,
    /^resources\/shaders\/[^/]+\.fs$/,
    /* 游戏自己的字体：得分计算器等界面用它，才和原版长得一样 */
    /^resources\/fonts\/[^/]+\.(ttf|otf)$/i,
  ]
  const needed = (p) => NEEDED.some((re) => re.test(p))

  /* ------------------------------------------------------------ deflate */
  async function inflateRaw (u8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('这个浏览器不支持 DecompressionStream，无法解压（请用较新的 Chrome / Edge / Safari）')
    }
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  /* ------------------------------------------------------------ zip */
  /**
   * Read a zip that may be appended to something else (the fused Balatro.exe is a LÖVE
   * runtime with the project zip glued on). Every offset in a zip is relative to the zip
   * itself, so the real position is base + offset, with
   *   base = EOCD position − central-directory size − central-directory offset.
   * For a plain zip that base is 0, so this covers both cases.
   */
  const zipEntries = (buf) => {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
    let eocd = -1
    const lowest = Math.max(0, u8.length - 70000)
    for (let i = u8.length - 22; i >= lowest; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
    }
    if (eocd < 0) throw new Error('这不是一个 zip / 融合 exe（找不到 zip 尾部标记）')
    let count = dv.getUint16(eocd + 10, true)
    let cdOff = dv.getUint32(eocd + 16, true)
    let cdSize = dv.getUint32(eocd + 12, true)
    if (cdOff === 0xffffffff || count === 0xffff || cdSize === 0xffffffff) {
      const loc = eocd - 20
      if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
        const z = Number(dv.getBigUint64(loc + 8, true))
        if (dv.getUint32(z, true) === 0x06064b50) {
          count = Number(dv.getBigUint64(z + 32, true))
          cdSize = Number(dv.getBigUint64(z + 40, true))
          cdOff = Number(dv.getBigUint64(z + 48, true))
        }
      }
    }
    const base = eocd - cdSize - cdOff
    const out = new Map()
    let p = base + cdOff
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break
      const method = dv.getUint16(p + 10, true)
      let csize = dv.getUint32(p + 20, true)
      let usize = dv.getUint32(p + 24, true)
      const nameLen = dv.getUint16(p + 28, true)
      const extraLen = dv.getUint16(p + 30, true)
      const cmtLen = dv.getUint16(p + 32, true)
      let lho = dv.getUint32(p + 42, true)
      const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen))
      if (usize === 0xffffffff || csize === 0xffffffff || lho === 0xffffffff) {
        let e = p + 46 + nameLen
        const end = e + extraLen
        while (e + 4 <= end) {
          const id = dv.getUint16(e, true); const sz = dv.getUint16(e + 2, true)
          if (id === 0x0001) {
            let q = e + 4
            if (usize === 0xffffffff) { usize = Number(dv.getBigUint64(q, true)); q += 8 }
            if (csize === 0xffffffff) { csize = Number(dv.getBigUint64(q, true)); q += 8 }
            if (lho === 0xffffffff) { lho = Number(dv.getBigUint64(q, true)); q += 8 }
            break
          }
          e += 4 + sz
        }
      }
      p += 46 + nameLen + extraLen + cmtLen
      if (name.endsWith('/')) continue
      const lnameLen = dv.getUint16(base + lho + 26, true)
      const lextraLen = dv.getUint16(base + lho + 28, true)
      const start = base + lho + 30 + lnameLen + lextraLen
      out.set(name, { method, start, csize, usize, u8 })
    }
    return out
  }

  /** Inflate one entry, lazily and once. */
  async function entryBytes (ent) {
    if (ent._data) return ent._data
    const raw = ent.u8.subarray(ent.start, ent.start + ent.csize)
    ent._data = ent.method === 0 ? new Uint8Array(raw) : await inflateRaw(raw)
    return ent._data
  }

  /* ------------------------------------------------------------ png size (IHDR only) */
  function pngSize (bytes) {
    if (!bytes || bytes.length < 33) return { width: 0, height: 0 }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (dv.getUint32(0) !== 0x89504e47) return { width: 0, height: 0 }
    // IHDR is always the first chunk: length(4) type(4) width(4) height(4) …
    return { width: dv.getUint32(16), height: dv.getUint32(20) }
  }

  /** The LÖVE project root inside a set of paths: the folder holding game.lua. */
  function loveRoot (paths) {
    const hits = [...paths].filter((p) => p === 'game.lua' || p.endsWith('/game.lua'))
    if (!hits.length) return null
    // shallowest wins (a pack may nest Balatro/ or love/)
    hits.sort((a, b) => a.split('/').length - b.split('/').length)
    return hits[0].replace(/game\.lua$/, '').replace(/\/$/, '')
  }

  /* ------------------------------------------------------------ environment */
  /** Wrap a lazy {path -> bytes} source in the interface databuild.js expects. */
  function makeEnv (source, opts) {
    const { getBytes, names, sourceLabel, now } = opts
    const rel = (p) => (source ? source + '/' + p : p)
    return {
      read: (p) => {
        const b = getBytes(rel(p))
        if (!b) throw new Error('缺少文件：' + p)
        return new TextDecoder('utf-8').decode(b)
      },
      bytes: (p) => getBytes(rel(p)) || null,
      exists: (p) => !!getBytes(rel(p)),
      listTree: (dir) => {
        const pre = rel(dir).replace(/\/$/, '') + '/'
        return names()
          .filter((n) => n.startsWith(pre))
          .map((n) => n.slice(pre.length))
      },
      pngSize,
      textBytes: (s) => new TextEncoder().encode(s).length,
      source: sourceLabel,
      now,
    }
  }

  /* ------------------------------------------------------------ public API */
  /**
   * Parse a fused Balatro.exe (or a plain zip of the project).
   * Every entry is inflated on demand, so a 60 MB exe only materialises what is needed.
   */
  async function parseGameExe (buf, label) {
    const entries = zipEntries(buf)
    const all = [...entries.keys()]
    const root = loveRoot(all)
    const wanted = all.filter((n) => (!root || n.startsWith(root + '/')) && needed(root ? n.slice(root.length + 1) : n))
    const byPath = new Map()
    for (const n of wanted) byPath.set(root ? n.slice(root.length + 1) : n, entries.get(n))
    // Inflate the needed entries up front (about 160 files / a few MB, even out of a 60 MB exe);
    // buildData itself is synchronous.
    const map = new Map()
    await Promise.all([...byPath.entries()].map(async ([p, ent]) => { map.set(p, await entryBytes(ent)) }))
    const env = makeEnv(null, {
      getBytes: (p) => map.get(p) || null,
      names: () => [...map.keys()],
      sourceLabel: label || 'Balatro.exe',
      now: new Date().toISOString(),
    })
    const res = BUILDER.buildData(env)
    return { ...res, root, entries: map.size }
  }

  /**
   * Parse an extracted game folder (the tree that contains game.lua / resources/).
   * \`files\` may be a FileList from <input webkitdirectory> or an array of {path, bytes}.
   */
  async function parseGameFiles (files, label) {
    const list = []
    for (const f of files) {
      const p = (f.__rel || f.webkitRelativePath || f.name || f.path || '').replace(/\\/g, '/')
      if (!p) continue
      list.push({
        path: p,
        get: () => (f.bytes
          ? Promise.resolve(f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes))
          : f.arrayBuffer().then((b) => new Uint8Array(b))),
      })
    }
    const root = loveRoot(list.map((x) => x.path))
    if (root === null) throw new Error('这个文件夹里找不到 game.lua —— 请选择 Balatro 的游戏目录（里面有 game.lua 和 resources/）')
    const map = new Map()
    const jobs = []
    for (const x of list) {
      const rel = x.path.startsWith(root + '/') ? x.path.slice(root.length + 1) : x.path
      if (!needed(rel)) continue
      jobs.push((async () => { map.set(rel, await x.get()) })())
    }
    await Promise.all(jobs)
    const env = makeEnv(null, {
      getBytes: (p) => map.get(p) || null,
      names: () => [...map.keys()],
      sourceLabel: label || (root ? root.split('/').pop() : 'Balatro'),
      now: new Date().toISOString(),
    })
    const res = BUILDER.buildData(env)
    return { ...res, root, entries: map.size }
  }

  const api = { parseGameExe, parseGameFiles, zipEntries, pngSize, loveRoot, NEEDED, needed, inflateRaw, entryBytes }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  if (typeof window !== 'undefined') window.__GAMEPARSE__ = api
})();

;
/* ============================================================================
 * boot.js — the "bring your own game" start screen used by the web build.
 *
 * The published site contains no game assets. On first visit this asks for the
 * user's own Balatro files, parses them entirely in the page (gameparse.js), and
 * only then loads the viewer. Nothing is uploaded; everything stays in memory.
 *
 * Requires window.__LUA__, window.__DATABUILD__, window.__GAMEPARSE__.
 * ==========================================================================*/
(function () {
  'use strict'

  const el = (tag, cls, text) => {
    const e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined) e.textContent = text
    return e
  }
  const MB = (n) => (n / 1048576).toFixed(1) + ' MB'

  /** Walk a dropped directory entry, tagging every File with its relative path. */
  function filesFromEntry (entry, out, prefix) {
    return new Promise((resolve) => {
      if (!entry) return resolve()
      if (entry.isFile) {
        entry.file((f) => {
          try { Object.defineProperty(f, '__rel', { value: (prefix || '') + f.name, configurable: true }) } catch (e) { /* ignore */ }
          out.push(f); resolve()
        }, () => resolve())
        return
      }
      if (!entry.isDirectory) return resolve()
      const reader = entry.createReader()
      const acc = []
      const next = () => reader.readEntries((ents) => {
        if (!ents.length) {
          Promise.all(acc.map((en) => filesFromEntry(en, out, (prefix || '') + entry.name + '/'))).then(() => resolve())
          return
        }
        for (const en of ents) acc.push(en)
        next()
      }, () => resolve())
      next()
    })
  }
  async function filesFromDrop (dt) {
    const out = []
    const items = dt && dt.items ? Array.from(dt.items) : []
    const entries = []
    for (const it of items) if (it.kind === 'file' && typeof it.webkitGetAsEntry === 'function') { const en = it.webkitGetAsEntry(); if (en) entries.push(en) }
    if (entries.length) { await Promise.all(entries.map((en) => filesFromEntry(en, out, ''))); if (out.length) return out }
    return Array.from((dt && dt.files) || [])
  }

  /** The status box lives in the start screen; these work before/after it exists. */
  function statusBox () {
    const root = document.getElementById('boot')
    if (!root) return null
    let box = root.querySelector('.bootstatus')
    if (!box) {
      const card = root.querySelector('.bootcard')
      if (!card) return null
      box = el('div', 'bootstatus')
      box.style.display = 'none'
      card.appendChild(box)
    }
    return box
  }
  function setStatus (kind, text) {
    const box = statusBox()
    if (!box) return
    box.style.display = 'block'
    box.className = 'bootstatus ' + kind
    box.textContent = text
  }
  function progress (pct, text) {
    const box = statusBox()
    if (!box) return
    box.style.display = 'block'
    box.className = 'bootstatus busy'
    box.innerHTML = ''
    const t = el('div', null, text)
    const bar = el('div', 'bootbar')
    const fill = el('div', 'bootfill')
    fill.style.width = Math.max(2, Math.min(100, pct)) + '%'
    bar.appendChild(fill)
    box.appendChild(t); box.appendChild(bar)
  }

  const STATUS = {
    read: '正在读取文件…',
    unzip: '正在解压 LÖVE 包…',
    build: '正在解析游戏数据（game.lua / 贴图 / 着色器）…',
    pack: '正在准备贴图…',
    app: '正在启动查看器…',
  }

  /* ------------------------------------------------------------------ 记住上次
   * 访客第一次选完游戏文件后，把解析结果存进**他自己浏览器**的 IndexedDB。下次打开
   * 这个站点就直接进图鉴，不用再选一次 —— 素材始终没离开过他的设备，也不算本站分发。
   * 隐私模式 / 配额不足时所有失败都被吞掉，功能照常（只是不会记得）。 */
  const DB_NAME = 'balatro-local-cache'
  const STORE = 'parsed'
  const KEY = 'last'
  function idbOpen () {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('no indexedDB'))
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => { try { req.result.createObjectStore(STORE) } catch (e) { /* ignore */ } }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error || new Error('indexedDB open failed'))
    })
  }
  async function cachePut (rec) {
    const db = await idbOpen()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(rec, KEY)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  }
  async function cacheGet () {
    const db = await idbOpen()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const g = tx.objectStore(STORE).get(KEY)
      g.onsuccess = () => resolve(g.result || null)
      g.onerror = () => reject(g.error)
    })
  }
  async function cacheDrop () {
    try {
      const db = await idbOpen()
      await new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch (e) { /* ignore */ }
  }

  /** Turn {data, atlas bytes} into the globals the viewer expects. Shared by the
   *  self-hosted pack, the "remembered" cache and (indirectly) the parse path. */
  function applyPack (data, bin) {
    window.__BALATRO_DATA__ = data
    window.__BALATRO_ATLAS__ = {}
    for (const p of data.pack || []) {
      window.__BALATRO_ATLAS__[p.file] = URL.createObjectURL(new Blob([bin.subarray(p.off, p.off + p.len)], { type: 'image/png' }))
    }
  }

  /** A slim bar that says "this came from your own browser", plus a way out. */
  function showCacheBar (meta) {
    const bar = el('div', 'bootcache')
    const txt = el('div', 'bootcachetext')
    txt.appendChild(el('b', null, '已载入上次解析的素材'))
    txt.appendChild(el('span', null, '（' + (meta && meta.version ? meta.version : '?') + ' · ' + (meta && meta.items ? meta.items : '?') + ' 个条目 · 存在你自己的浏览器里，没有上传）'))
    const acts = el('div', 'bootcacheacts')
    const swap = el('button', 'btn', '换一个游戏文件')
    const drop2 = el('button', 'btn', '清除已存素材')
    const close = el('button', 'bootcachex', '✕')
    close.title = '收起这条提示（素材还留着，下次照旧）'
    close.setAttribute('aria-label', '关闭')
    close.style.cssText = 'background:none;border:0;color:#cfd8de;font-size:15px;line-height:1;padding:6px 8px;cursor:pointer;border-radius:6px'
    acts.appendChild(swap); acts.appendChild(drop2); acts.appendChild(close)
    bar.appendChild(txt); bar.appendChild(acts)
    document.body.appendChild(bar)
    swap.onclick = async () => { await cacheDrop(); location.reload() }
    drop2.onclick = async () => { await cacheDrop(); bar.remove(); }
    /* 自己也会收起：20 秒后淡出；鼠标停在上面就先不计时（正在看的时候别抢走） */
    const hide = () => { bar.classList.add('gone'); setTimeout(() => bar.remove(), 260) }
    let hideTimer = setTimeout(hide, 20000)
    bar.addEventListener('mouseenter', () => clearTimeout(hideTimer))
    bar.addEventListener('mouseleave', () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 6000) })
    close.onclick = () => { clearTimeout(hideTimer); hide() }
  }

  /* ------------------------------------------------------------------ 预览区的互动
   * 三件小事，全部不需要任何图片或库：换卡面样式的胶囊、真的下载一张代码画的 PNG、
   * 以及一块 canvas（图集切分 + 逐帧 + 循环点）。 */
  function startDemo () {
    const chips = document.getElementById('dForgeChips')
    const forgeCard = document.getElementById('dForgeCard')
    if (chips && forgeCard) {
      chips.addEventListener('click', (e) => {
        const b = e.target.closest('button')
        if (!b) return
        for (const x of chips.querySelectorAll('button')) x.classList.remove('on')
        b.classList.add('on')
        forgeCard.className = 'dcard' + (b.dataset.v ? ' ' + b.dataset.v : '')
      })
    }

    const dl = document.getElementById('dDlPng')
    const note = document.getElementById('dDlNote')
    if (dl) {
      dl.addEventListener('click', () => {
        const S = 4, W = 71 * S, H = 95 * S
        const cv = document.createElement('canvas')
        cv.width = W; cv.height = H
        const g = cv.getContext('2d')
        const grd = g.createLinearGradient(0, 0, W, H)
        grd.addColorStop(0, '#2a3a48'); grd.addColorStop(1, '#141c24')
        g.fillStyle = grd; g.fillRect(0, 0, W, H)
        g.strokeStyle = '#4bc292'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6)
        g.textAlign = 'center'; g.fillStyle = '#4bc292'
        g.font = 'bold ' + (10 * S) + 'px sans-serif'
        g.fillText('DEMO', W / 2, H / 2 - 6 * S)
        g.font = (7 * S) + 'px sans-serif'; g.fillStyle = '#9fb0c0'
        g.fillText('code-drawn', W / 2, H / 2 + 8 * S)
        g.fillText(W + 'x' + H, W / 2, H / 2 + 20 * S)
        const a = document.createElement('a')
        a.href = cv.toDataURL('image/png')
        a.download = 'toolchest-demo-' + W + 'x' + H + '.png'
        a.click()
        if (note) note.textContent = '已下载一张 ' + W + '×' + H + ' 的示例 PNG（真实导出还有 1x/2x/4x/6x 与透明背景）'
      })
    }

    const c = document.getElementById('dCanvas')
    if (!c || !c.getContext) return
    const ctx = c.getContext('2d')
    const FRAMES = 21, LOOP_AT = 12
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    /* 画布按**实际显示宽度**来画（不是画在 900px 里再被缩小 —— 那样字和线会一起糊掉）。
       三档布局：窄屏（手机）竖排、中屏并排、宽屏完整 21 帧。 */
    let W = 900, H = 240, narrow = false, mid = false
    const fit = () => {
      /* 用 getBoundingClientRect 的**小数**宽度（clientWidth 是取整的，会差出 1px 的缩放） */
      const rect = c.getBoundingClientRect()
      const cssW = Math.max(260, Math.round((rect.width || c.clientWidth || 900) * 100) / 100)
      narrow = cssW < 420
      mid = !narrow && cssW < 700
      W = cssW
      H = narrow ? 352 : 244
      c.width = Math.round(W * DPR)
      c.height = Math.round(H * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    const draw = (now) => {
      const t = (now - t0) / 1000
      ctx.clearRect(0, 0, W, H)
      ctx.textAlign = 'left'

      /* ---- 左：图集，逐格高亮 + 取出这一格 ---- */
      const PAD = narrow ? 12 : 14
      const GAP = narrow ? 6 : 5
      const COLS = narrow ? 3 : 5, ROWS = 4
      const gridW = narrow ? W * 0.46 : Math.min(W * 0.34, 172)
      const CELL = Math.max(18, Math.floor((gridW - (COLS - 1) * GAP) / COLS))
      const gw = COLS * CELL + (COLS - 1) * GAP
      const gh = ROWS * CELL + (ROWS - 1) * GAP
      const ox = PAD, oy = 34
      const idx = Math.floor(t * 1.6) % (COLS * ROWS)

      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#7d8d9d'
      ctx.fillText(narrow ? '图集（贴图按格子切开）' : '图集（贴图）', ox, 20)

      for (let i = 0; i < COLS * ROWS; i++) {
        const cx = ox + (i % COLS) * (CELL + GAP)
        const cy = oy + Math.floor(i / COLS) * (CELL + GAP)
        const hot = i === idx
        ctx.fillStyle = hot ? '#1d3b34' : '#1b242e'
        ctx.strokeStyle = hot ? '#4bc292' : '#2f3d4a'
        ctx.lineWidth = hot ? 2 : 1
        roundRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1, 4); ctx.fill(); ctx.stroke()
      }

      /* ---- 中：把这一格"取出来"放大成一张卡 ---- */
      const cardW = narrow ? 58 : 64, cardH = narrow ? 78 : 86
      const dx = ox + gw + (narrow ? 26 : 34)
      const dy = oy + Math.max(0, (gh - cardH) / 2)
      if (dx + cardW <= W - PAD) {
        ctx.strokeStyle = '#33414f'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(ox + gw + 6, oy + gh / 2)
        ctx.lineTo(dx - 6, oy + gh / 2)
        ctx.stroke()
        ctx.fillStyle = '#1b242e'; ctx.strokeStyle = '#4bc292'; ctx.lineWidth = 2
        roundRect(dx, dy, cardW, cardH, 7); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#4bc292'
        ctx.fillRect(dx + 9, dy + 11, cardW - 18, 3)
        ctx.fillRect(dx + 9, dy + 21, cardW - 26, 3)
        ctx.fillStyle = '#33414f'
        ctx.fillRect(dx + 9, dy + cardH - 18, cardW - 18, 9)
        ctx.fillStyle = '#7d8d9d'
        ctx.font = '10px sans-serif'
        ctx.fillText('取出这一格', dx, dy + cardH + 13)
      }

      /* ---- 右/下：21 帧动画条，播放头 + 循环点按比例摆放（所以永远放得下）---- */
      const stripTop = narrow ? oy + gh + 46 : oy
      const stripLeft = narrow ? PAD : dx + cardW + 30
      const stripW = W - stripLeft - PAD
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#7d8d9d'
      ctx.fillText(narrow ? '盲注动画 21 帧 · 黄线 = 自动找到的循环点' : '盲注动画（21 帧）· 循环点标在接缝最小处', stripLeft, stripTop - 14)

      const fh = narrow ? 52 : 62
      const n = Math.max(6, Math.min(FRAMES, Math.floor((stripW + 3) / (narrow ? 22 : 17))))
      const fw = (stripW - (n - 1) * 3) / n
      const play = Math.floor(t * 9) % FRAMES
      const posOf = (f) => stripLeft + (f / (FRAMES - 1)) * (stripW - fw)
      for (let k = 0; k < n; k++) {
        const f = Math.round(k * (FRAMES - 1) / (n - 1))
        const fx = posOf(f)
        const on = f === play
        const isLoop = f === LOOP_AT
        ctx.fillStyle = on ? '#1d3b34' : '#1b242e'
        ctx.strokeStyle = on ? '#4bc292' : (isLoop ? '#f3b958' : '#2f3d4a')
        ctx.lineWidth = isLoop ? 2 : 1
        roundRect(fx + 0.5, stripTop + 0.5, fw - 1, fh - 1, 3); ctx.fill(); ctx.stroke()
        ctx.fillStyle = on ? '#4bc292' : '#38485a'
        const barH = 6 + ((f * 7) % (fh - 18))
        ctx.fillRect(fx + 3, stripTop + fh - 5 - barH, Math.max(2, fw - 6), barH)
      }
      /* 循环点：黄线钉在那一帧上 */
      const loopX = posOf(LOOP_AT) + fw / 2
      ctx.fillStyle = '#f3b958'
      ctx.fillRect(loopX - fw / 2, stripTop - 6, Math.max(3, fw), 2)
      ctx.font = '10px sans-serif'
      ctx.fillText('循环', Math.min(loopX - 10, W - PAD - 24), stripTop + fh + 14)
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#7d8d9d'
      ctx.fillText('当前帧 ' + (play + 1) + ' / ' + FRAMES, stripLeft + stripW - 78, stripTop + fh + 14)
    }

    fit()
    /* 宽度一变就重算，保证 backing 与显示尺寸的比值恰好等于 DPR（否则字会糊）。
       用 ResizeObserver 而不是 window.resize：卡片宽度是布局决定的，不一定跟窗口同步。 */
    if (window.ResizeObserver) {
      let last = c.getBoundingClientRect().width
      new ResizeObserver(() => {
        const w = c.getBoundingClientRect().width
        if (Math.abs(w - last) < 0.5) return
        last = w
        fit()
        if (still) draw(performance.now())
      }).observe(c)
    }
    if (still) draw(t0 + 1200)
    else {
      const tick = (now) => { draw(now); requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    }
  }

  function build () {
    const root = document.getElementById('boot')
    root.innerHTML = ''

    const card = el('div', 'bootcard')
    card.appendChild(el('h1', null, 'Balatro 素材图鉴'))
    card.appendChild(el('p', 'lead', '这是一个纯代码的浏览器工具：把游戏里的美术素材与数据解出来，做成可检索、可预览、可导出的图鉴。'))
    card.appendChild(el('p', 'lead strong', '网站本身不包含任何游戏素材 —— 请选择你自己电脑上的 Balatro 游戏文件，解析全部在这个页面里完成，不会上传任何东西。'))

    /* 宽屏左右分栏：左＝导入（主操作），右＝预览（它能做什么）。
       DOM 顺序是导入在前，所以窄屏叠成一列时导入自然在上面。 */
    const cols = el('div', 'bootcols')
    const imp = el('div', 'bootimp')
    const prev = el('div', 'bootprev')
    cols.appendChild(imp); cols.appendChild(prev)
    card.appendChild(cols)

    const buttons = el('div', 'bootbtns')
    /* 用 <label for> 包成按钮：手机上是"原生"触发选择器，比 JS 调 .click() 稳得多 */
    const bExe = el('label', 'btn primary', '选择 Balatro.exe')
    bExe.setAttribute('for', 'bootFileExe')
    const bDir = el('label', 'btn', '选择游戏文件夹')
    bDir.setAttribute('for', 'bootFileDir')
    buttons.appendChild(bExe); buttons.appendChild(bDir)
    imp.appendChild(buttons)

    /* 就放在按钮下面：说清"为什么要你自己选文件"，而不是让人以为这站少做了功能 */
    imp.appendChild(el('p', 'bootdisc',
      '为什么要你自己选文件？因为游戏素材的版权不属于本站，这里不能替你分发 —— ' +
      '页面只是把你自己那份游戏里的内容读出来给你看。全程在本地完成，不上传任何数据；' +
      '选过一次之后本站会记住它（存在你自己的浏览器里），下次打开直接就是图鉴。'))

    /* 关键：**不能** display:none —— iOS/Safari 和部分安卓浏览器对不可见的 file input
       调 .click()（或点绑定的 label）时不会打开选择器，表现就是"点了没反应"。
       放到屏幕外但保持可见即可。另外**不要**写 accept：安卓的文件选择器会把不认识的
       .exe 变灰、点不动（这正是"点某个文件夹里的 exe 没反应"的另一个原因）。 */
    const inExe = el('input', 'bootfile'); inExe.type = 'file'; inExe.id = 'bootFileExe'
    const inDir = el('input', 'bootfile'); inDir.type = 'file'; inDir.id = 'bootFileDir'; inDir.multiple = true
    if ('webkitdirectory' in inDir) { inDir.webkitdirectory = true; inDir.setAttribute('webkitdirectory', '') } else { bDir.classList.add('off'); bDir.title = '这个浏览器不支持选文件夹，请用 exe，或先把游戏目录压成 zip' }
    imp.appendChild(inExe); imp.appendChild(inDir)

    const drop = el('div', 'bootdrop')
    drop.appendChild(el('div', 'big', '⬇'))
    drop.appendChild(el('div', null, '也可以把 Balatro.exe / 游戏文件夹 / 已经解好的 .zip 拖到这里'))
    imp.appendChild(drop)

    /* 触屏上没有拖放这回事：手机显示这段能真正照做的提示（CSS 按 hover 能力二选一） */
    const tap = el('div', 'boottap')
    tap.appendChild(el('div', null, '点上面的按钮选择文件。'))
    tap.appendChild(el('div', null, '手机上「选择游戏文件夹」最省事；如果系统不让选文件夹，就把游戏目录压成一个 .zip 再选。'))
    tap.appendChild(el('div', null, '如果点了按钮没反应：把系统文件列表右上角的类型切成「所有文件」—— 安卓默认会把 .exe 当成未知类型藏起来。'))
    imp.appendChild(tap)

    /* 进度/错误提示放在按钮下方，解析时一定看得见 */
    const status = el('div', 'bootstatus')
    status.style.display = 'none'
    imp.appendChild(status)

    /* 先检查这台设备到底能不能解压：不支持就当场说清楚，别等选完文件才失败 */
    if (typeof DecompressionStream === 'undefined' || typeof File === 'undefined' || !File.prototype.arrayBuffer) {
      const warn = el('div', 'bootwarn',
        '⚠️ 这个浏览器缺少解压能力（DecompressionStream），选了游戏文件也解不开。' +
        '请换成较新的 Chrome / Edge / Safari（iOS 16.4+）打开本站，在电脑上则可以用自带的 local/ 版。')
      imp.appendChild(warn)
      bExe.classList.add('off'); bDir.classList.add('off')
    }

    /* ------------------------------------------------------------------ 预览区（右栏）
     * 「它能做什么」属于这个工具自己：桌面分栏时它在导入右侧，窄屏时堆在导入下面。
     * 全部由代码绘制，不含任何游戏素材。 */
    const demo = el('div', 'bootdemo')
    demo.innerHTML =
      '<h2 class="demohead">它能做什么</h2>' +
      '<div class="demo">' +
        '<div class="dcell"><div class="dhead"><span class="dtag">1</span> 图鉴与搜索</div>' +
          '<div class="dscreen"><div class="dsbar"><span class="dsq"></span>' +
          '<span class="dsc">527 个条目 · 27 个分类 · 5 种语言</span></div>' +
          '<div class="dgrid">' +
          Array.from({ length: 18 }, (_, i) => '<div class="dtile' + (i === 7 ? ' hot' : '') + '"></div>').join('') +
          '</div></div>' +
          '<p>按分类浏览，按 ID / 名称 / 描述 / 数值 / 图集坐标搜索；<code>cat:Joker rarity:1 cost&gt;=4</code> 这种字段筛选也能用。</p></div>' +

        '<div class="dcell"><div class="dhead"><span class="dtag">2</span> 卡牌合成台（可以点）</div>' +
          '<div class="dscreen dforge"><div class="dcard" id="dForgeCard"></div>' +
          '<div class="dchips" id="dForgeChips">' +
          '<button data-v="" class="on">不叠加</button><button data-v="foil">闪箔</button>' +
          '<button data-v="holo">镭射</button><button data-v="poly">多彩</button><button data-v="neg">负片</button>' +
          '</div></div>' +
          '<p>选一张牌，叠加强化 / 蜡封 / 贴纸 / 版本。版本特效是<b>游戏自己的 GLSL</b> 在浏览器里跑，不是画的假效果。</p></div>' +

        '<div class="dcell"><div class="dhead"><span class="dtag">3</span> 导出（PNG 可以点）</div>' +
          '<div class="dscreen dexport">' +
          '<button class="live" id="dDlPng">PNG</button><button>SVG</button><button>ZIP</button>' +
          '<button>JSON</button><button>CSV</button><button>GIF / APNG</button>' +
          '<div class="dnote" id="dDlNote">点一下 PNG：会下载一张由代码画出来的示例</div></div>' +
          '<p>单张导出 PNG（1x–6x，透明背景）/ SVG / ZIP / JSON / CSV / Markdown；盲注动画还能导出 GIF、APNG、帧序列。</p></div>' +

        '<div class="dcell wide"><div class="dhead"><span class="dtag">4</span> 图集切分 · 逐帧动画 · 自动找循环点</div>' +
          '<canvas id="dCanvas" width="900" height="230" role="img" aria-label="图集切分与逐帧动画的示意"></canvas>' +
          '<p>左边：一张图集被切成格子，逐格取出（真实数据是 68 张贴图 / 69 个图集）。' +
          '右边：21 帧的盲注动画循环播放，程序会算出「接缝最小」的那一帧当循环点，导出的动图才不会跳。</p></div>' +
      '</div>' +
      '<div class="dfoot">上面全是<b>代码画的示意</b>（这个站里没有任何游戏素材）；真实内容来自你自己电脑上的那份游戏文件。</div>'
    prev.appendChild(demo)

    const notes = el('ul', 'bootnotes')
    for (const t of [
      '支持的输入：Balatro.exe（融合了 LÖVE 工程的那个 exe）、游戏文件夹（里面有 game.lua 与 resources/）、或者它们的 zip。',
      '外层是 .7z 的话浏览器解不了（需要 LZMA），请先解压，或者直接给 Balatro.exe。',
      '想看 mod 内容？启动后在左侧「导入 Mod」里拖入 mod 的文件夹或 zip，同样不上传。',
      '解析结果只存在这个页面里，刷新就没了；想离线长期使用可以下载单文件版。',
      '本站是非官方粉丝工具，与 LocalThunk / Playstack 没有任何关联；游戏素材与数据的版权归原作者所有。',
    ]) notes.appendChild(el('li', null, t))
    imp.appendChild(notes)

    root.appendChild(card)
    /* 预览区的互动必须在卡片**进入文档之后**再接：startDemo 里用 getElementById 找
       胶囊和 canvas，游离的子树里是找不到的（这个坑踩过一次）。 */
    startDemo()

    let busy = false
    async function run (kind, payload) {
      if (busy) return
      busy = true
      bExe.disabled = true; bDir.disabled = true
      try {
        progress(8, STATUS.read)
        let res
        if (kind === 'exe') {
          const f = payload
          if (f.size > 400 * 1048576) throw new Error('文件太大（' + MB(f.size) + '），Balatro.exe 一般不超过 100 MB')
          progress(20, STATUS.read + ' ' + MB(f.size))
          const buf = await f.arrayBuffer()
          progress(45, STATUS.unzip)
          res = await window.__GAMEPARSE__.parseGameExe(buf, f.name)
        } else {
          progress(25, STATUS.read + ' ' + payload.length + ' 个文件')
          res = await window.__GAMEPARSE__.parseGameFiles(payload, kind)
        }
        progress(72, STATUS.build + ' 条目 ' + res.stats.items)
        progress(88, STATUS.pack + ' ' + res.textures.length + ' 张贴图')
        await useGameFonts(res)
        window.__BALATRO_DATA__ = res.data
        window.__BALATRO_ATLAS__ = {}
        for (const t of res.textures) {
          window.__BALATRO_ATLAS__[t.file] = URL.createObjectURL(new Blob([t.bytes], { type: 'image/png' }))
        }
        window.__SOURCE_NOTE__ = { source: res.data.meta.source, version: res.data.meta.version, root: res.root, warnings: res.warnings }
        /* 顺手记下来：下次打开本站就不用再选一次文件了（存在访客自己的浏览器里） */
        try {
          const total = res.textures.reduce((a, t) => a + t.bytes.length, 0)
          const bin = new Uint8Array(total)
          const pack = []
          let off = 0
          for (const t of res.textures) { bin.set(t.bytes, off); pack.push({ file: t.file, off, len: t.bytes.length }); off += t.bytes.length }
          const rec = {
            v: 1,
            data: Object.assign({}, res.data, { pack }),
            bin: bin.buffer,
            meta: { version: res.data.meta.version, source: res.data.meta.source, items: res.stats.items, savedAt: Date.now() },
          }
          await cachePut(rec)
        } catch (e) { /* 隐私模式 / 配额不足：不记就是了，不影响使用 */ }
        progress(96, STATUS.app)
        await loadApp()
        root.style.display = 'none'
      } catch (e) {
        busy = false
        bExe.disabled = false; bDir.disabled = false
        setStatus('bad', '解析失败：' + (e && e.message ? e.message : e))
        console.error(e)
      }
    }

    /* label 已经会原生触发，这里只在"点了没反应"时兜底（有些内嵌浏览器不吃 label） */
    bExe.onclick = (e) => { if (!inExe.files || !inExe.files.length) { /* 交给 label 的原生行为 */ } }
    inExe.onchange = () => {
      const f = inExe.files && inExe.files[0]
      inExe.value = ''
      if (!f) { setStatus('bad', '没有选到文件。如果系统的文件列表里 exe 是灰的，把文件类型切成「所有文件」再试，或者改用手机上的「文件」App 里的 Balatro.exe。'); return }
      setStatus('', '已选：' + f.name + '（' + MB(f.size) + '），正在读取…')
      run('exe', f)
    }
    inDir.onchange = () => {
      const f = Array.from(inDir.files || [])
      inDir.value = ''
      if (!f.length) { setStatus('bad', '没有选到文件。有的手机不让选文件夹，可以先把游戏目录压成一个 .zip 再选。'); return }
      run('dir', f)
    }

    for (const ev of ['dragenter', 'dragover']) window.addEventListener(ev, (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return
      e.preventDefault(); drop.classList.add('over')
    })
    for (const ev of ['dragleave', 'dragend']) window.addEventListener(ev, () => drop.classList.remove('over'))
    window.addEventListener('drop', (e) => {
      if (!e.dataTransfer) return
      e.preventDefault(); drop.classList.remove('over')
      filesFromDrop(e.dataTransfer).then((files) => {
        if (!files.length) return setStatus('bad', '没有读到文件')
        const one = files[0]
        const name = one.__rel || one.name || ''
        if (files.length === 1 && /\.(exe|zip)$/i.test(name)) run('exe', one)
        else run('dir', files)
      })
    })
  }

  /** 把访客游戏文件里的字体注册进来 —— 界面用游戏自己的像素字体才像原版。
   *  公开站不内嵌这个字体（属于游戏素材），所以从访客自己的文件里读。 */
  async function useGameFonts (res) {
    try {
      if (!res || !res.fonts || !res.fonts.length || typeof FontFace === 'undefined') return null
      const want = res.fonts.find((f) => /m6x11/i.test(f.file)) || res.fonts[0]
      if (!want) return null
      const bytes = want.bytes
      /* 和 fontcss.js 里内嵌版的 @font-face 描述符保持一致（weight 700），
         这样「内嵌字体的自用版」和「从访客文件读字体的公开版」排版一模一样。 */
      const face = new FontFace('BalatroPixel',
        bytes.buffer ? bytes.buffer.slice(bytes.byteOffset || 0, (bytes.byteOffset || 0) + bytes.byteLength) : bytes,
        { weight: '700', style: 'normal' })
      await face.load()
      document.fonts.add(face)
      document.documentElement.style.setProperty('--pix', 'BalatroPixel,"Cascadia Mono",Consolas,monospace')
      console.log('[Balatro 素材图鉴] 已启用游戏自带字体：' + want.file)
      return want.file
    } catch (e) { console.warn('字体注册失败（界面退回等宽字体）：', e); return null }
  }

  /** Load the viewer script (once) and let the app boot itself. */
  let appPromise = null
  function loadApp () {
    if (appPromise) return appPromise
    appPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = (window.__APP_SRC__ || 'app.js')
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('无法加载查看器脚本 ' + s.src))
      document.head.appendChild(s)
    })
    return appPromise
  }

  /** A pre-packed copy of the assets on the same server (self-hosted variant). */
  async function tryLocalPack () {
    const base = window.__PACK__ || null
    if (!base) return false
    progress(10, '正在读取本站预置素材…')
    const [dataRes, binRes] = await Promise.all([fetch(base + 'data.json'), fetch(base + 'atlas.bin')])
    if (!dataRes.ok || !binRes.ok) throw new Error('预置素材不可用（HTTP ' + dataRes.status + '/' + binRes.status + '）')
    const data = await dataRes.json()
    const bin = new Uint8Array(await binRes.arrayBuffer())
    // atlas.bin = concatenated PNGs; the index in data.pack says where each one starts
    applyPack(data, bin)
    progress(96, STATUS.app)
    await loadApp()
    const root = document.getElementById('boot')
    if (root) root.style.display = 'none'
    return true
  }

  /** Same thing, but the bytes come from this browser's own IndexedDB. */
  async function tryRemembered () {
    const rec = await cacheGet()
    if (!rec || !rec.data || !rec.bin || !rec.data.pack) return false
    progress(12, '正在读取上次解析的素材…')
    applyPack(rec.data, new Uint8Array(rec.bin))
    window.__SOURCE_NOTE__ = { source: (rec.meta && rec.meta.source) || '上次选择的游戏文件', version: (rec.meta && rec.meta.version) || '', root: '', warnings: [] }
    progress(96, STATUS.app)
    await loadApp()
    const root = document.getElementById('boot')
    if (root) root.style.display = 'none'
    showCacheBar(rec.meta || {})
    return true
  }

  window.addEventListener('DOMContentLoaded', async () => {
    if (window.__BALATRO_DATA__) return   // single-file build: the app boots by itself
    build()
    if (window.__PACK__) {
      tryLocalPack().catch((e) => { console.warn(e); setStatus('bad', String(e.message || e)) })
      return
    }
    /* 上次在这个浏览器里解析过 → 直接进图鉴，不再让你选一次 */
    try {
      if (await tryRemembered()) return
    } catch (e) { console.warn('记住的素材不可用，改为重新选择文件：', e) }
  })

})();
