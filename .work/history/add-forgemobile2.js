/* Extend the mobile scenario with forge checks (the anchor text differed from my guess). */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
const anchor = `     r.canvas=__V.blank();
     r.errors=window.__V.errors;
     return r })()\`,\n  soulArt:`
if (!s.includes(anchor)) { console.log('FAIL anchor'); process.exit(1) }
const extra = `     // --- forge on a phone: the preview must stay in view and the groups must be collapsible
     A.state.tab='forge'; A.state.forge.open=null; A.render(); await __V.wait(2600);
     const fc=document.querySelector('#content');
     const opts=()=>[].slice.call(document.querySelectorAll('#content .opt[data-gkey]'));
     r.forge={ sticky:getComputedStyle(document.querySelector('.forge .preview')).position,
               navSticky:getComputedStyle(document.querySelector('.forgenav')).position,
               collapsedAtStart:opts().filter(e=>e.classList.contains('collapsed')).map(e=>e.dataset.gkey),
               groups:opts().length, heightStart:fc.scrollHeight, cols:getComputedStyle(document.querySelector('.forge')).gridTemplateColumns,
               canvasW:Math.round((document.querySelector('.preview canvas')||{getBoundingClientRect:()=>({width:0})}).getBoundingClientRect().width) };
     __V.byText('.forgenav .nv','全部展开').click(); await __V.wait(900);
     r.forge.heightExpanded=fc.scrollHeight;
     __V.byText('.forgenav .nv','收起').click(); await __V.wait(700);
     r.forge.heightCollapsed=fc.scrollHeight;
     __V.byText('.forgenav .nv','牌型').click(); await __V.wait(700);
     r.forge.afterNavClick=opts().filter(e=>!e.classList.contains('collapsed')).map(e=>e.dataset.gkey);
     r.forge.oversized=fc.scrollWidth>innerWidth+2;
     r.canvas=__V.blank();
     r.errors=window.__V.errors;
     return r })()\`,\n  soulArt:`
s = s.replace(anchor, extra)
fs.writeFileSync(F, s)
new Function(s)
console.log('extended, syntax OK')
