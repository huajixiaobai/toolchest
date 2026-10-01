/* Test-side updates: the summary heading moved into the collapsible section header, and the
   mobile scenario should also cover the new forge layout. */
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

rep(`     r.hasHeader=!!document.querySelector(".pvsummary h4");`,
  `     r.hasHeader=!!document.querySelector('#content .opt[data-gkey="summary"] h4');`,
  'hasHeader')

/* find the tail of the mobile scenario to extend it */
const anchor = `     r.noHScroll=document.documentElement.scrollWidth<=window.innerWidth+1;`
if (!s.includes(anchor)) { console.log('FAIL mobile anchor'); fails++ } else {
  s = s.replace(anchor, `     r.noHScroll=document.documentElement.scrollWidth<=window.innerWidth+1;
     // --- forge on a phone: the preview must stay in view and the groups must be collapsible
     document.querySelector('.cat').click();
     window.__BALATRO__.state.tab='forge'; window.__BALATRO__.state.forge.open=null; window.__BALATRO__.render();
     await __V.wait(2600);
     const fc=document.querySelector('#content');
     const opts=()=>[].slice.call(document.querySelectorAll('#content .opt[data-gkey]'));
     r.forge={ sticky:getComputedStyle(document.querySelector('.forge .preview')).position,
               collapsedAtStart:opts().filter(e=>e.classList.contains('collapsed')).map(e=>e.dataset.gkey),
               groups:opts().length, height_start:fc.scrollHeight, cols:getComputedStyle(document.querySelector('.forge')).gridTemplateColumns,
               navScrollable:(()=>{const n=document.querySelector('.forgenav');return n.scrollWidth>n.clientWidth})(),
               canvasW:Math.round((document.querySelector('.preview canvas')||{getBoundingClientRect:()=>({width:0})}).getBoundingClientRect().width) };
     __V.byText('.forgenav .nv','全部展开').click(); await __V.wait(900);
     r.forge.height_expanded=fc.scrollHeight;
     __V.byText('.forgenav .nv','收起').click(); await __V.wait(700);
     r.forge.height_collapsed=fc.scrollHeight;
     __V.byText('.forgenav .nv','牌型').click(); await __V.wait(700);
     r.forge.afterNavClick=[].slice.call(document.querySelectorAll('#content .opt[data-gkey]')).filter(e=>!e.classList.contains('collapsed')).map(e=>e.dataset.gkey);
     r.forge.oversized=fc.scrollWidth>window.innerWidth+1;
     r.forge.canvas=__V.blank();`)
  console.log('ok   mobile forge checks')
}
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
