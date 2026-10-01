/* nowLine / sumSec were declared inside build(), but paintPreview() (outer scope) uses them. */
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

rep(`  let previewCanvas = null;`,
  `  let previewCanvas = null;
  let nowLine = null;   // the always-visible one-line summary under the preview
  let sumSec = null;    // its collapsible "full detail" section`,
  'hoist nowLine / sumSec')

rep(`  function build () {
    left.innerHTML = '';
    const t = document.createElement('div'); t.className = 'pvhead';`,
  `  function build () {
    left.innerHTML = '';
    const t = document.createElement('div'); t.className = 'pvhead';
    t.dataset.role = 'pvhead';`,
  'preview head marker')

rep(`    const nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    left.appendChild(nowLine);
    const sumSec = section('summary', '当前组合详情');`,
  `    nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    left.appendChild(nowLine);
    sumSec = section('summary', '当前组合详情');`,
  'assign nowLine / sumSec')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
