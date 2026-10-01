/* Adds a `modProbe` scenario: is the shader overlay actually landing on imported atlas art? */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

const SCENARIO = `
  modProbe: \`(async()=>{
    const r = {};
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(600);

    const probe = (it, mut, phase) => {
      const sp = B.specForItem(it);
      const a = B.compose(sp, 2, phase || 0);
      const sp2 = B.specForItem(it);
      mut(sp2);
      const b = B.compose(sp2, 2, phase || 0);
      return { diff: __V.diff(a, b), aBox: __V.bbox(a), bBox: __V.bbox(b) };
    };
    const modIt = B.byId['j_tm_beta'];
    const vanIt = B.byId['j_joker'];
    r.modBase = __V.bbox(B.compose(B.specForItem(modIt), 2, 0));
    r.vanBase = __V.bbox(B.compose(B.specForItem(vanIt), 2, 0));

    for (const ph of [0, 6, 30]) {
      r['mod_poly_' + ph] = probe(modIt, (sp) => { sp.edition = 'e_polychrome' }, ph);
      r['van_poly_' + ph] = probe(vanIt, (sp) => { sp.edition = 'e_polychrome' }, ph);
    }
    r.mod_foil = probe(modIt, (sp) => { sp.edition = 'e_foil' }, 6);
    r.van_foil = probe(vanIt, (sp) => { sp.edition = 'e_foil' }, 6);
    r.mod_set = probe(modIt, (sp) => { sp.setShader = 'voucher' }, 6);

    // is the raw shade() pass itself producing pixels for this tile?
    const cv = B.compose(B.specForItem(modIt), 2, 0);
    const sh = B.shade(cv, 'polychrome', 6);
    r.shade = sh ? { w: sh.width, h: sh.height, box: __V.bbox(sh) } : null;
    r.gl = { webgl: B.webgl, programs: B.shaderPrograms };
    return r })()\`,
`

const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}
s = s.replace(`    if (name === 'modImport') {`, `    if (name === 'modImport' || name === 'modProbe') {`)
console.log('ok   payload hook')
fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES' : 'done')
new Function(s)
console.log('syntax OK')
