/* The live preview must run at the selected speed (that was the complaint: changing the speed
   did nothing on screen). Measure how fast the clock advances at 1x vs 8x. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
if (s.includes('previewSpeed: `')) { console.log('already present'); process.exit(0) }
const SCENARIO = `
  previewSpeed: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.click('.cat', '卡牌合成台', 2600);
    // open the animation section and start the live preview
    __V.byText('.forgenav .nv', '全部展开').click();
    await __V.wait(600);
    const animBtn = __V.byText('.btn', '实时动画预览');
    r.hasAnimBtn = !!animBtn;
    if (!animBtn) return r;
    const measure = async (speed) => {
      B.state.anim.speed = speed;
      if (!B.state.anim.on) animBtn.click();
      await __V.wait(300);
      const t0 = B.state.anim.t;
      await __V.wait(1200);
      const dt = B.state.anim.t - t0;
      return +dt.toFixed(2);
    };
    r.dt1 = await measure(1);
    r.dt4 = await measure(4);
    r.dt8 = await measure(8);
    r.ratio8 = +(r.dt8 / Math.max(0.001, r.dt1)).toFixed(2);
    r.ratio4 = +(r.dt4 / Math.max(0.001, r.dt1)).toFixed(2);
    // and the preview canvas must actually be repainting
    const cv = document.querySelector('.preview canvas');
    const h1 = __V.hash(cv);
    await __V.wait(400);
    r.repainting = __V.hash(cv) !== h1;
    if (B.state.anim.on) animBtn.click();
    // the loop readout should mention the detected loop point when there is one
    r.readout = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.loopLabel = ([].slice.call(document.querySelectorAll('.btn')).filter((b) => /循环/.test(b.textContent))[0] || {}).textContent || '';
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
