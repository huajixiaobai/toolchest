/* Remove the old summary div (the summary now lives in its own collapsible section) and move the
   long explanation text into that section too, so the sticky preview stays short. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`    left.appendChild(hint);
    const summary = document.createElement('div'); summary.className = 'opt pvsummary';
    summary.style.cssText = 'margin-top:12px;text-align:left;width:100%';
    left.appendChild(summary);
  }`,
  `    hint.style.cssText = 'text-align:left;margin:8px 0 2px;font-size:11px;line-height:1.6';
    anSec.body.appendChild(hint);
  }`,
  'fold the hint into the animation section')

rep(`    const nowLine = document.createElement('div'); nowLine.className = 'pvnow';`,
  `    /* nowLine lives in the outer scope: paintPreview() updates it on every repaint */
    nowLine = document.createElement('div'); nowLine.className = 'pvnow';`,
  'comment')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
