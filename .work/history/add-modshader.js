/* Scenario: a mod that ships its own .fs shader and an Edition that uses it. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const SCENARIO = `
  modShader: \`(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const r = {};
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p, configurable: true });
      return f;
    });
    const res = await B.importBatch(mkFiles(TM.folder));
    await __V.wait(900);
    r.imported = res && { ok: res.ok, items: res.items, atlases: res.atlases };
    r.shaderFiles = res && res.mod.stats.shaders;
    r.shaders = res && res.mod.shaders ? res.mod.shaders.map((x) => x.key) : [];
    r.modShaders = Object.keys(B.modShaders);
    r.programs = B.shaderPrograms.filter((n) => /tint/.test(n));
    r.warnings = res && res.mod.warnings.filter((w) => /着色器/.test(w));

    // the edition must resolve to the mod shader and change the card
    const ed = B.byId['e_tm_tinted'] || B.items.filter((i) => i.cat === 'Edition' && i.source === 'testmod')[0];
    r.editionItem = ed ? { id: ed.id, shader: ed.shader, resolved: B.editionShaderOf(ed) } : null;
    if (ed) {
      const plain = B.byId['S_A'];
      const specPlain = { center: { atlas: 'centers', pos: B.data.composition.baseCenter.pos }, front: { atlas: 'cards_1', pos: plain.pos } };
      const withEd = Object.assign({}, specPlain, { edition: B.editionShaderOf(ed) });
      const a = B.compose(specPlain, 2, 0);
      const c = B.compose(withEd, 2, 0);
      r.editionDiff = __V.diff(a, c);
      r.editionHash = __V.hash(c);
      r.editionOpaque = (() => { const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8)n++; return n })();
    }
    // and it must be usable in the forge
    B.state.tab = 'forge'; B.state.forge.open = null; B.render();
    await __V.wait(1800);
    const sel = document.querySelector('#content .opt[data-gkey="basetype"] select');
    sel.value = 'Edition'; sel.dispatchEvent(new Event('change'));
    await __V.wait(1400);
    const picks = [].slice.call(document.querySelectorAll('#content .opt[data-gkey="ed"] .pick'));
    r.forgeEditions = picks.map((b) => b.textContent.replace(/\\s+/g, ' ').trim()).slice(0, 8);
    const modPick = picks.filter((b) => /Tinted|染色/.test(b.textContent))[0];
    r.forgeHasModEdition = !!modPick;
    if (modPick) {
      const before = __V.hash(document.querySelector('.preview canvas'));
      modPick.click(); await __V.wait(900);
      r.forgePreviewChanged = __V.hash(document.querySelector('.preview canvas')) !== before;
    }
    r.canvas = __V.blank();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
s = s.replace(`    if (name.indexOf('mod') === 0 || name === 'modImport') {`,
  `    if (name === 'modShader' || name.indexOf('mod') === 0 || name === 'modImport') {`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
