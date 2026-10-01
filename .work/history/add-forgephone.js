/* Reproduce the reported mobile forge bug: after scrolling, what is actually visible? */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const SCENARIO = `
  forgePhone: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.wait(1600);
    B.state.tab='forge'; B.state.forge.open=null; B.render();
    await __V.wait(2600);
    const content = document.getElementById('content');
    const pv = document.querySelector('.forge .preview');
    const opts = document.querySelector('.forge .opts');
    const rect = (e) => { const b = e.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), h: Math.round(b.height), w: Math.round(b.width) } };
    r.viewport = { w: innerWidth, h: innerHeight };
    r.gridCols = getComputedStyle(document.querySelector('.forge')).gridTemplateColumns;
    r.preview = Object.assign(rect(pv), { pos: getComputedStyle(pv).position, z: getComputedStyle(pv).zIndex });
    r.opts = rect(opts);
    r.scrollHeight = content.scrollHeight;

    const probe = (label) => {
      const out = [];
      for (const y of [80, 200, 320, 460, 620]) {
        const el = document.elementFromPoint(Math.round(innerWidth / 2), y);
        const sec = el && el.closest && el.closest('.opt');
        out.push(y + ':' + (sec ? (sec.dataset.gkey || sec.className) : (el ? (el.className || el.tagName) : 'null')));
      }
      return { label, scrollTop: Math.round(content.scrollTop), at: out };
    };
    r.atTop = probe('top');
    content.scrollTop = 400; await __V.wait(500);
    r.at400 = probe('400');
    content.scrollTop = 900; await __V.wait(500);
    r.at900 = probe('900');
    content.scrollTop = 1400; await __V.wait(500);
    r.at1400 = probe('1400');

    // how many of the option headers can be reached while the preview stays pinned?
    r.pinned = Object.assign(rect(pv), { pos: getComputedStyle(pv).position });
    r.optionHeaders = [].slice.call(document.querySelectorAll('#content .opts .opt h4')).map((h) => {
      const b = h.getBoundingClientRect();
      return (h.closest('.opt').dataset.gkey || '?') + '@' + Math.round(b.top);
    });
    r.hiddenBehind = [].slice.call(document.querySelectorAll('#content .opts .opt h4')).filter((h) => {
      const b = h.getBoundingClientRect();
      const mid = document.elementFromPoint(Math.round(b.left + 20), Math.round(b.top + b.height / 2));
      return !mid || !h.closest('.opt').contains(mid);
    }).map((h) => h.closest('.opt').dataset.gkey);
    content.scrollTop = 0;
    await __V.wait(300);
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
s = s.replace(`    if (name === 'mobile') {`, `    if (name === 'forgePhone' || name === 'mobile') {`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
