/* Order the left column for reading: head -> preview -> one-line summary -> details -> export. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
const from = `    nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    left.appendChild(nowLine);
    sumSec = section('summary', '当前组合详情');
    const summaryBox = document.createElement('div'); summaryBox.className = 'pvsummary';
    sumSec.body.appendChild(summaryBox);
    left.appendChild(sumSec.box);
    const holder = document.createElement('div'); holder.className = 'pvbox';
    holder.style.cssText = 'display:inline-block;padding:18px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    left.appendChild(holder);`.split('\n').join(NL)
const to = `    const holder = document.createElement('div'); holder.className = 'pvbox';
    holder.style.cssText = 'display:inline-block;padding:18px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    left.appendChild(holder);
    nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    left.appendChild(nowLine);
    sumSec = section('summary', '当前组合详情');
    const summaryBox = document.createElement('div'); summaryBox.className = 'pvsummary';
    sumSec.body.appendChild(summaryBox);
    left.appendChild(sumSec.box);`.split('\n').join(NL)
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
fs.writeFileSync(F, s)
new Function(s)
console.log('reordered, syntax OK')
