const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const from = 'detectPeriod, animOpts, refreshForgeLists,'
const to = 'detectPeriod, animOpts, refreshForgeLists, forgeSpec,'
const n = s.split(from).length - 1
console.log('occurrences', n)
if (n !== 1) { console.log('context:', JSON.stringify(s.slice(s.indexOf('detectPeriod, animOpts') - 80, s.indexOf('detectPeriod, animOpts') + 80))); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
