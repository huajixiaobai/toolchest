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
