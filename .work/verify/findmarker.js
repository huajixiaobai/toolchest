const fs = require('fs')
const s = fs.readFileSync('cdp.js', 'utf8')
const i = s.indexOf('async function main () {')
console.log('main at', i)
const before = s.slice(Math.max(0, i - 120), i + 30)
console.log('before main:', JSON.stringify(before))
const marker = 'async function main () {'
const idx = s.indexOf(marker)
// find the scenario terminator: the last backtick-comma-brace-comma before main
const tail = s.slice(0, idx)
const lastTick = tail.lastIndexOf('`,')
console.log('last "`," at', lastTick, JSON.stringify(tail.slice(lastTick - 20, lastTick + 30)))
