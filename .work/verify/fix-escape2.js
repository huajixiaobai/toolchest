const fs = require('fs')
let s = fs.readFileSync('cdp.js', 'utf8')
const from = ".textContent.split('\\n').slice(-6)"
const to = ".textContent.split('\\\\n').slice(-6)"
const n = s.split(from).length - 1
console.log('occurrences', n)
if (n !== 1) process.exit(0)
s = s.replace(from, to)
fs.writeFileSync('cdp.js', s)
new Function(s)
console.log('syntax OK')
