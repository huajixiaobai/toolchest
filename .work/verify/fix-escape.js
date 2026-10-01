const fs = require('fs')
let s = fs.readFileSync('cdp.js', 'utf8')
const from = ".textContent.split('\\n').length"
const to = ".textContent.split('\\\\n').length"
const n = s.split(from).length - 1
console.log('occurrences', n)
if (n !== 1) { console.log('nothing to do'); process.exit(0) }
s = s.replace(from, to)
fs.writeFileSync('cdp.js', s)
const i = s.indexOf('logLines')
console.log('now:', JSON.stringify(s.slice(i, i + 70)))
new Function(s)
console.log('syntax OK')
