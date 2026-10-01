/* Fix the repaint check (it hashed one detached canvas) and add a legendary that does have a
   short loop, so the detector's positive case is covered too. */
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
    r.repainting = __V.hash(cv) !== h1;
    if (B.state.anim.on) animBtn.click();`,
  `    // paintPreview() swaps in a fresh canvas each frame, so re-query before hashing
    const h1 = __V.hash(document.querySelector('.preview canvas'));
    await __V.wait(400);
    r.repainting = __V.hash(document.querySelector('.preview canvas')) !== h1;
    if (B.state.anim.on) animBtn.click();
    // a legendary joker animates its floating art with a real short period
    B.state.forge.baseType = 'Joker'; B.state.forge.base = 'j_caino';
    B.state.forge.stickers = { eternal: false, perishable: false, rental: false, color: '' };
    B.render();
    await __V.wait(2600);
    r.legendaryReadout = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.legendaryPeriod = B.animOpts ? null : null;
    r.detected = (() => {
      const sp = B.specForItem(B.byId['j_caino']);
      return typeof B.detectPeriod === 'function' ? B.detectPeriod(sp) : 'not exposed';
    })();`,
  'repaint + legendary')

rep(`    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey,`,
  `    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts,`,
  'expose detectPeriod')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
