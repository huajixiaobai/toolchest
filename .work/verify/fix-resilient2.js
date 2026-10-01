/* Put the whole driver-side hook region (including modPicker) inside the guard. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `    if (name === 'modPicker') {
      // a real file, delivered the same way the browser delivers a picked one
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")`
const to = `    try {
    if (name === 'modPicker') {
      // a real file, delivered the same way the browser delivers a picked one
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
// remove the now-duplicated inner `try {`
const dup = `    }
    try {
    if (name === 'modCryptid') {`
if (s.split(dup).length - 1 !== 1) { console.log('FAIL dup'); process.exit(1) }
s = s.replace(dup, `    }
    if (name === 'modCryptid') {`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
