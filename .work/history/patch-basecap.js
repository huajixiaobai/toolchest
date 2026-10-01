/* Bound the one genuinely unbounded group (the subject picker: 150+ chips) so it scrolls inside
   its own box instead of stretching the page. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.css')
let s = fs.readFileSync(F, 'utf8')
const from = `.pick .pickmod{`
const to = `/* the subject picker is the only group with hundreds of entries: scroll it in place */
#content .opt[data-gkey="base"] .chips{max-height:min(48vh,360px);overflow:auto;overscroll-behavior:contain;padding-right:2px}
.pick .pickmod{`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
console.log('ok   base picker scrolls in place')
