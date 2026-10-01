const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`    B.state.forge.stickers = { eternal: false, perishable: false, rental: false, color: '' };
    B.render();
    await __V.wait(2600);
    r.legendaryReadout = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.legendaryPeriod = B.animOpts ? null : null;
    r.detected = (() => {
      const sp = B.specForItem(B.byId['j_caino']);
      return typeof B.detectPeriod === 'function' ? B.detectPeriod(sp) : 'not exposed';
    })();`,
  `    B.state.forge.stickers = { eternal: false, perishable: false, rental: false, color: '' };
    const t0 = performance.now();
    B.render();
    r.forgeRenderMs = Math.round(performance.now() - t0);
    await __V.wait(5000);
    r.legendaryReadout = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.detected = (() => {
      const sp = B.specForItem(B.byId['j_caino']);
      return typeof B.detectPeriod === 'function' ? B.detectPeriod(sp) : 'not exposed';
    })();
    // repeat renders must be cheap: the period is cached, and the forge re-render should not
    // re-run the whole search
    const t1 = performance.now();
    B.render();
    r.secondRenderMs = Math.round(performance.now() - t1);
    await __V.wait(2500);
    r.legendaryReadout2 = (document.querySelector('.preview .hint.mono') || {}).textContent || '';`,
  'timing + second render')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
