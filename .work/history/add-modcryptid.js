/* Adds `modCryptid`: imports the real Cryptid.zip through the page UI and reports what the
   viewer made of it. Requires verify/cryptid.json (base64 of the zip). */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

const SCENARIO = `
  modCryptid: \`(async()=>{
    const B = window.__BALATRO__;
    const C = window.__CRYPTID__;
    const r = {};
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const zip = new File([u8(C.zip)], 'Cryptid.zip', { type: 'application/zip' });
    Object.defineProperty(zip, '__rel', { value: 'Cryptid.zip' });

    const t0 = performance.now();
    const res = await B.importBatch([zip]);
    r.ms = Math.round(performance.now() - t0);
    r.res = res && { ok: res.ok, items: res.items, atlases: res.atlases, id: res.mod.id, prefix: res.mod.prefix, root: res.mod.root, stats: res.mod.stats };
    r.warnings = res && res.mod.warnings;
    await __V.wait(1500);

    const mine = B.items.filter((i) => i.source === 'cryptid');
    r.total = mine.length;
    const byCat = {};
    for (const i of mine) byCat[i.cat] = (byCat[i.cat] || 0) + 1;
    r.byCat = byCat;
    r.types = B.mods[0].id;

    // every entry must paint, or be one of the known art-less kinds
    const painted = { ok: 0, blank: [], noArt: [] };
    for (const it of mine) {
      const sp = B.specForItem(it);
      if (!sp) { painted.noArt.push(it.id + '(' + it.cat + ')'); continue }
      const cv = B.compose(sp, 2, 0);
      if (__V.bbox(cv)) painted.ok++; else painted.blank.push(it.id + '(' + it.cat + ')');
    }
    r.painted = { ok: painted.ok, blank: painted.blank.length, blankList: painted.blank.slice(0, 10), noArt: painted.noArt.length, noArtList: painted.noArt.slice(0, 10) };

    // art actually differs between entries (i.e. the atlas maths is right)
    const sample = ['j_cry_dropshot', 'j_cry_CodeJoker', 'bl_cry_oldox', 'v_cry_copies', 'p_cry_code_normal_1', 'sleeve_cry_very_fair_sleeve', 'b_cry_encoded', 'tag_cry_console'];
    r.sampleHashes = sample.map((id) => {
      const it = B.byId[id];
      if (!it) return id + ':MISSING';
      const cv = B.compose(B.specForItem(it), 2, 0);
      return id + ':' + __V.hash(cv) + ':' + JSON.stringify(__V.bbox(cv));
    });
    r.distinct = new Set(r.sampleHashes.map((x) => x.split(':')[1])).size;

    // categories + source filter reached the sidebar
    B.state.source = 'cryptid'; B.state.cat = 'Joker'; B.state.tab = 'codex'; B.render();
    await __V.wait(2000);
    r.codex = { cells: document.querySelectorAll('#content .cell').length, badges: document.querySelectorAll('#content .cell .modtag').length };
    r.sidebar = [].slice.call(document.querySelectorAll('#sidebar .cat')).map((e) => e.textContent).filter((t) => /Cryptid|Code|Sleeve|Music|唯一|Mod/.test(t)).slice(0, 12);

    // detail panel of a Cryptid joker
    const cell = document.querySelector('#content .cell[data-id="j_cry_dropshot"]');
    if (cell) { cell.click(); await __V.wait(900) }
    const dt = document.getElementById('detail').textContent;
    r.detail = { title: (document.querySelector('#detail .dhead h3')||{}).textContent, hasCryptid: dt.indexOf('Cryptid') >= 0, hasFile: dt.indexOf('misc_joker.lua') >= 0, len: dt.length };

    r.blank = __V.blank();
    r.errors = window.__V.errors.slice();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}
s = s.replace(`    if (name.indexOf('mod') === 0 || name === 'modImport') {`,
  `    if (name === 'modCryptid') {
      await c.eval('window.__CRYPTID__ = ' + fs.readFileSync(path.join(__dirname, 'cryptid.json'), 'utf8') + ';')
    }
    if (name.indexOf('mod') === 0 || name === 'modImport') {`)
console.log('ok   payload hook')
s = s.replace(`'soulCompare', 'boxCompare', 'modImport', 'modView']`, `'soulCompare', 'boxCompare', 'modImport', 'modView', 'modCryptid']`)
console.log('ok   screenshot list')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
