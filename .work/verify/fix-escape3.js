/* cdp.js scenarios are template literals: a single `\s` in the source collapses to `s` at
   runtime, so the text-normalising regexes must be written `\\s`. Fix the ones I added. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const one = 'replace(/\\s+/g,'      // what the file has now (source-level backslash-s)
const two = 'replace(/\\\\s+/g,'    // what it needs so the runtime sees \s
const n = s.split(one).length - 1
if (!n) { console.log('nothing to fix'); process.exit(0) }
s = s.split(one).join(two)
fs.writeFileSync(F, s)
new Function(s)
console.log('fixed ' + n + ' regexes, syntax OK')
