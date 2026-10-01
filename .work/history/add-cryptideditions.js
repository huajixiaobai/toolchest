/* Do Cryptid's custom editions actually render with their own shaders? */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const SCENARIO = `
  cryptidEditions: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.wait(2000);
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    if (!B.mods.length) return { skipped: 'Cryptid.zip not available' };
    const gl = window.__GLSHADERS__;
    void gl;
    const eds = B.items.filter((i) => i.cat === 'Edition' && i.source);
    r.count = eds.length;
    r.list = eds.map((it) => {
      const key = B.editionShaderOf(it);
      const prog = B.shaderPrograms.indexOf(key) >= 0;
      const base = { center: { atlas: 'centers', pos: B.data.composition.baseCenter.pos }, front: { atlas: 'cards_1', pos: B.byId['S_A'].pos } };
      const a = B.compose(base, 2, 0);
      const c = B.compose(Object.assign({}, base, { edition: key }), 2, 0);
      return it.id + ' shader=' + it.shader + ' → ' + key + (prog ? ' [compiled]' : ' [MISSING]') + ' diff=' + __V.diff(a, c) + ' note=' + (it.note ? 'yes' : 'no');
    });
    r.missing = r.list.filter((x) => x.indexOf('MISSING') >= 0);
    r.allDiff = r.list.every((x) => !/diff=0( |$)/.test(x));
    r.canvas = __V.blank();
    // a sample render of one Cryptid edition, for a visual check
    const one = eds[0];
    if (one) {
      const base = { center: { atlas: 'centers', pos: B.data.composition.baseCenter.pos }, front: { atlas: 'cards_1', pos: B.byId['S_A'].pos } };
      r.samplePng = B.compose(Object.assign({}, base, { edition: B.editionShaderOf(one) }), 4, 6).toDataURL('image/png');
      r.plainPng = B.compose(base, 4, 6).toDataURL('image/png');
      r.sampleId = one.id;
    }
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
s = s.replace(`      if (!fs.existsSync(srcZip)) {`, `      if (!fs.existsSync(srcZip)) {`)
/* reuse the cryptid driver hook for this scenario too */
s = s.replace(`    if (name === 'modCryptid') {`, `    if (name === 'modCryptid' || name === 'cryptidEditions') {`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
