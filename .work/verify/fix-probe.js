/* The reachability probe mixed coordinate spaces (content is offset ~90px by the topbar).
   Scroll relative to the scroll container itself. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `      const barH = document.querySelector('.pvtop').getBoundingClientRect().height;
      const top = g.getBoundingClientRect().top + content.scrollTop - barH - 8;
      content.scrollTop = Math.max(0, top);`
const to = `      const barH = document.querySelector('.pvtop').getBoundingClientRect().height;
      const cTop = content.getBoundingClientRect().top;
      const top = g.getBoundingClientRect().top - cTop + content.scrollTop - barH - 8;
      content.scrollTop = Math.max(0, top);`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
fs.writeFileSync(F, s)
new Function(s)
console.log('probe fixed, syntax OK')
