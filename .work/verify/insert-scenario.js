'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
console.log('crlf:', s.includes('\r\n'), '| lf-only:', /(^|[^\r])\n/.test(s))
const m = /`,\s*\}\s*\r?\n\r?\nasync function main \(\) \{/.exec(s)
if (!m) { console.log('FAIL: no terminator found'); process.exit(1) }
console.log('terminator at', m.index, JSON.stringify(m[0]))
const SCENARIO = fs.readFileSync(path.join(__dirname, 'scenario-modcryptid.txt'), 'utf8').replace(/\r?\n/g, s.includes('\r\n') ? '\r\n' : '\n')
const at = m.index + 2   // right after "`,"  -> insert before "}"
s = s.slice(0, at) + SCENARIO + s.slice(at)
fs.writeFileSync(F, s)
new Function(s)
console.log('inserted, syntax OK')
