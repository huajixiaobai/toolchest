/* Debug: why does the Hologram overlay contribute nothing? */
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

rep(`    compose, specForItem, tileLayer, shade, glApply, uvRectOf, phaseNow, hasAnim, shaderPreview,`,
  `    compose, specForItem, tileLayer, shade, shadeTile, glApply, uvRectOf, phaseNow, hasAnim, shaderPreview,`,
  'export shadeTile')

const SCENARIO = `
  holoDebug: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    const holo = B.byId['j_hologram'];
    const sp = B.specForItem(holo);
    r.spec = { center: sp.center, soul: sp.soul, soulHologram: sp.soulHologram, box: sp.box || null };
    const opaque = (cv) => { if (!cv) return -1; const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let n = 0; for (let i=3;i<d.length;i+=4) if (d[i]>8) n++; return n };
    const t = B.shadeTile(sp.soul, 142, 190, 'hologram', 0);
    r.shaded = t ? { w: t.width, h: t.height, opaque: opaque(t) } : null;
    r.tile = { opaque: opaque(B.tileLayer(sp.soul, 142, 190)) };
    const withSoul = B.compose(sp, 2, 0);
    const sp2 = B.specForItem(holo); sp2.soul = null;
    const noSoul = B.compose(sp2, 2, 0);
    r.composite = { withSoul: opaque(withSoul), withoutSoul: opaque(noSoul), diff: __V.diff(noSoul, withSoul), urlSame: withSoul.toDataURL() === noSoul.toDataURL() };
    // does the legendary path work?
    const caino = B.byId['j_caino'];
    const c1 = B.compose(B.specForItem(caino), 2, 0);
    const c2s = B.specForItem(caino); c2s.soul = null;
    const c2 = B.compose(c2s, 2, 0);
    r.caino = { diff: __V.diff(c2, c1), box: __V.bbox(c1) };
    // and the dissolve shadow for the legendaries
    const sil = B.shadeTile(B.byId['j_caino'].soul, 142, 190, 'dissolve', 0, { shadow: true });
    r.shadow = sil ? { opaque: opaque(sil) } : null;
    r.programs = B.shaderPrograms;
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
