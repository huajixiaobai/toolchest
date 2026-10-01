/* Replaces the modCryptid scenario with a faithful one: put the real Cryptid.zip onto the
   page's <input type=file> through CDP, exactly like picking it in the browser. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

/* 1) drop the old scenario + its payload hook */
const start = s.indexOf('\n  modCryptid: `')
const endMarker = '\n}\n\nasync function main () {'
const end = s.indexOf(endMarker, start)
if (start < 0 || end < 0) { console.log('FAIL locate old scenario', start, end); process.exit(1) }
s = s.slice(0, start) + s.slice(end + 1)
console.log('ok   removed old scenario')

/* 2) insert the assertion-only scenario */
const SCENARIO = `
  modCryptid: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.wait(2500);   // the file input's change handler started the import

    const mod = B.mods[0];
    r.mod = mod && { id: mod.id, name: mod.name, version: mod.version, author: mod.author, items: mod.items, atlases: mod.atlasKeys.length, warnings: mod.warnings.length, stats: mod.stats };
    r.warnings = mod && mod.warnings;

    const mine = B.items.filter((i) => i.source === (mod && mod.id));
    r.total = mine.length;
    const byCat = {};
    for (const i of mine) byCat[i.cat] = (byCat[i.cat] || 0) + 1;
    r.byCat = byCat;

    const painted = { ok: 0, blank: [], noArt: [] };
    for (const it of mine) {
      const sp = B.specForItem(it);
      if (!sp) { painted.noArt.push(it.id + '(' + it.cat + ')'); continue }
      const cv = B.compose(sp, 2, 0);
      if (__V.bbox(cv)) painted.ok++; else painted.blank.push(it.id + '(' + it.cat + ')');
    }
    r.painted = { ok: painted.ok, blank: painted.blank.length, blankList: painted.blank.slice(0, 8), noArt: painted.noArt.length, noArtList: painted.noArt.slice(0, 8) };

    const sample = ['j_cry_dropshot', 'j_cry_CodeJoker', 'bl_cry_oldox', 'v_cry_copies', 'p_cry_code_normal_1', 'sleeve_cry_very_fair_sleeve', 'b_cry_encoded', 'tag_cry_console', 'c_cry_crash', 'stake_cry_pink'];
    r.sampleHashes = sample.map((id) => {
      const it = B.byId[id];
      if (!it) return id + ':MISSING';
      return id + ':' + __V.hash(B.compose(B.specForItem(it), 2, 0));
    });
    r.distinctSamples = new Set(r.sampleHashes.map((x) => x.split(':')[1])).size;

    // does a Cryptid atlas actually decode at the size its declaration promised?
    const a = B.atlases['atlasone'];
    r.atlas = a && { w: a.w, h: a.h, px: a.px, py: a.py, scale: a.scale, cols: a.cols, rows: a.rows };

    // the codex filtered to Cryptid
    B.state.tab = 'codex'; B.state.source = mod.id; B.state.cat = 'Joker'; B.state.q = ''; B.state.sel = null;
    B.render();
    await __V.wait(2200);
    r.codex = { cells: document.querySelectorAll('#content .cell').length, badges: document.querySelectorAll('#content .cell .modtag').length };
    r.sidebar = [].slice.call(document.querySelectorAll('#sidebar .cat')).map((e) => e.textContent.replace(/\\s+/g, ' ').trim()).filter((t) => /Cryptid|Code|Sleeve|Tier|Meme|Food|Unique|新增/.test(t));

    const cell = document.querySelector('#content .cell[data-id="j_cry_dropshot"]');
    if (cell) { cell.click(); await __V.wait(1000) }
    const dt = document.getElementById('detail').textContent;
    r.detail = { title: (document.querySelector('#detail .dhead h3') || {}).textContent, hasMod: dt.indexOf('Cryptid') >= 0, hasFile: dt.indexOf('misc_joker.lua') >= 0 };

    // one export, to be sure Cryptid art survives the whole pipeline
    B.state.cat = 'Blind'; B.render();
    await __V.wait(1200);
    const btn = document.getElementById('btnZip');
    if (btn) { btn.click(); await __V.wait(3000) }
    const blobs = await window.__GRAB__();
    r.exported = blobs.map((b) => ({ name: b.name, size: b.size, magic: b.magic })).slice(-3);

    r.blank = __V.blank();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}

/* 3) drop the JSON payload hook, add the file-input driver step */
s = s.replace(`    if (name === 'modCryptid') {
      await c.eval('window.__CRYPTID__ = ' + fs.readFileSync(path.join(__dirname, 'cryptid.json'), 'utf8') + ';')
    }
`, '')
s = s.replace(`    if (name.indexOf('mod') === 0 || name === 'modImport') {`,
  `    if (name === 'modCryptid') {
      // drive the real <input type=file>, the same way picking the zip in the browser does
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")
      await sleep(600)
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const found = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#modZipInput' })
      if (!found || !found.nodeId) { console.log('❌ #modZipInput not found'); results[name] = { rep: { fatal: 'no input' }, errors: [] }; continue }
      await c.send('DOM.setFileInputFiles', { files: [path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')], nodeId: found.nodeId })
      console.log('             injected Cryptid.zip into #modZipInput')
    }
    if (name.indexOf('mod') === 0 || name === 'modImport') {`)
console.log('ok   driver hook')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
