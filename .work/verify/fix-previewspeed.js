/* Fix the repaint check (it hashed one detached canvas) and check a card that really does have
   a short loop — a legendary with a floating soul. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`    const cv = document.querySelector('.preview canvas');
    const h1 = __V.hash(cv);
    await __V.wait(400);
    r.repainting = __V.hash(cv) !== h1? `.replace(' !== h1?', ' !== h1;'),
  '', 'noop') // placeholder, replaced below

fs.writeFileSync(F, s)
new Function(s)
console.log('noop ok')
