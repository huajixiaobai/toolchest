const fs = require('fs')
let s = fs.readFileSync('cdp.js', 'utf8')
const from = "r.csv = csv.split('\\n').length;"
const to = "r.csv = csv.split('\\\\n').length;"
const n = s.split(from).length - 1
console.log('occurrences', n)
if (n !== 1) { console.log('context:', JSON.stringify(s.slice(s.indexOf('r.csv = csv'), s.indexOf('r.csv = csv') + 60))); process.exit(1) }
fs.writeFileSync('cdp.js', s.replace(from, to))
new Function(fs.readFileSync('cdp.js', 'utf8'))
console.log('escape fixed, syntax OK')
