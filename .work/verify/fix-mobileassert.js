/* The mobile scenario reported gridTemplateColumns, which no longer drives the phone layout
   (it is a flex column now). Report the real layout mode instead. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `     r.forgeCols=getComputedStyle(document.querySelector(".forge")).gridTemplateColumns.split(" ").length;`
const to = `     r.forgeCols=getComputedStyle(document.querySelector(".forge")).gridTemplateColumns.split(" ").length;
     r.forgeLayout=getComputedStyle(document.querySelector(".forge")).display;
     r.forgeBar=(()=>{const b=document.querySelector(".pvtop");if(!b)return null;const r0=b.getBoundingClientRect();return {h:Math.round(r0.height),pos:getComputedStyle(b).position,share:+(r0.height/innerHeight).toFixed(2)}})();
     r.forgeHeavyBelowOpts=(()=>{const o=document.querySelector(".forge .opts").getBoundingClientRect().top;return ["summary","export","anim"].every(k=>document.querySelector('#content .opt[data-gkey="'+k+'"]').getBoundingClientRect().top>=o-2)})();`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
