/* Adds a headless check that a flattened mod pack still renders: the atlas scale is guessed
   from the declared positions, so tiles must land on real art. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
const SCENARIO = `
  modFlat: \`(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const r = {};
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    // strip every folder: exactly what an odd distribution looks like
    const flat = Object.keys(TM.folder).map((p) => new File([u8(TM.folder[p])], p.split('/').pop()));
    const res = await B.importBatch(flat, 'flat');
    await __V.wait(800);
    r.imported = res && { ok: res.ok, items: res.items, atlases: res.atlases };
    r.stats = res && res.mod.stats;
    r.warnings = res && res.mod.warnings;
    r.modAtlas = B.atlases['mod_jokers'] && { w: B.atlases['mod_jokers'].w, h: B.atlases['mod_jokers'].h, scale: B.atlases['mod_jokers'].scale, cols: B.atlases['mod_jokers'].cols, rows: B.atlases['mod_jokers'].rows };
    const painted = { ok: 0, blank: [], noArt: [] };
    for (const it of B.items.filter((i) => i.source === 'flat')) {
      const sp = B.specForItem(it);
      if (!sp) { painted.noArt.push(it.id); continue }
      if (__V.bbox(B.compose(sp, 2, 0))) painted.ok++; else painted.blank.push(it.id);
    }
    r.painted = painted;
    r.blank = __V.blank();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}
s = s.replace(`    if (name === 'modImport' || name === 'modProbe' || name === 'modView' || name === 'modDrop') {`,
  `    if (name.indexOf('mod') === 0 || name === 'modImport') {`)
console.log('ok   payload hook (all mod* scenarios)')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
