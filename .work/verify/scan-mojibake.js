/* Scan cdp.js for GBK-mojibake damage: rare CJK characters that only appear when UTF-8
   bytes were decoded as GBK. Prints the line and a hex dump so the original can be restored. */
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
const src = fs.readFileSync(f, 'utf8')
const lines = src.split(/\r?\n/)
/* Characters that are essentially never used in normal Chinese prose but are the classic
   results of reading UTF-8 as GBK. */
const BAD = /[\u9200-\u9fff\u7e00-\u8fff]/
const suspicious = []
lines.forEach((l, i) => {
  // only care about string literals inside scenario code
  if (BAD.test(l)) suspicious.push([i + 1, l])
})
console.log('可疑行数:', suspicious.length)
for (const [n, l] of suspicious) {
  const hits = [...l].filter((c) => BAD.test(c)).join('')
  console.log(String(n).padStart(5), '|', hits, '|', l.trim().slice(0, 120))
}
