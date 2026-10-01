/* Adds the `modImport` CDP scenario: drives the in-page importer with the synthetic test mod
   (folder import, zip import, UI, filters, export) and screenshots the panel. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

const SCENARIO = `
  modImport: \`(async()=>{
    const r = {};
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    r.baseline = { items: B.items.length, atlases: Object.keys(B.atlases).length };

    // ---- the panel exists and is reachable from the sidebar
    B.state.tab = 'mods'; B.render();
    await __V.wait(300);
    r.panel = { drop: !!document.querySelector('#modDrop'), pickDir: !!document.querySelector('#modPickDir'), log: !!document.querySelector('#modLogBox') };
    r.panelShot = true;

    // ---- 1) folder import
    const folder = await B.importBatch(mkFiles(TM.folder), 'TestMod');
    r.folder = folder && { ok: folder.ok, items: folder.items, atlases: folder.atlases, id: folder.mod.id, prefix: folder.mod.prefix, warnings: folder.mod.warnings.length, stats: folder.mod.stats };
    await __V.wait(400);
    r.afterFolder = { items: B.items.length, mods: B.mods.length, atlases: Object.keys(B.atlases).length };
    r.modItems = B.items.filter((i) => i.source === 'testmod').length;

    // ---- 2) every mod entry must paint something (or be a knowingly artless one)
    const painted = { ok: 0, blank: [], noArt: [] };
    for (const it of B.items.filter((i) => i.source === 'testmod')) {
      const sp = B.specForItem(it);
      if (!sp) { painted.noArt.push(it.id); continue }
      const cv = B.compose(sp, 2, 0);
      const box = __V.bbox(cv);
      if (box) painted.ok++; else painted.blank.push(it.id);
    }
    r.painted = painted;

    // ---- 3) sidebar shows the mod source + the new category
    const sbText = document.getElementById('sidebar').textContent;
    r.sidebar = { hasSource: sbText.indexOf('测试 Mod') >= 0, hasType: sbText.indexOf('Mod 新增类型') >= 0, hasMusical: sbText.indexOf('Musical') >= 0, hasTool: sbText.indexOf('导入 Mod') >= 0 };

    // ---- 4) filtering by source
    const srcBtn = __V.byText('#sidebar .cat', '测试 Mod');
    if (srcBtn) { srcBtn.click(); await __V.wait(500) }
    r.sourceView = { state: B.state.source, cells: document.querySelectorAll('#content .cell').length, head: (document.querySelector('.listhead h2')||{}).textContent };
    r.sourceBadges = document.querySelectorAll('#content .cell .modtag').length;

    // ---- 5) switching to the mod's own category
    const catBtn = __V.byText('#sidebar .cat', 'Musical');
    if (catBtn) { catBtn.click(); await __V.wait(500) }
    r.typeView = { cat: B.state.cat, cells: document.querySelectorAll('#content .cell').length, names: [].slice.call(document.querySelectorAll('#content .cell .nm')).map((e) => e.textContent) };

    // ---- 6) detail panel of a mod card
    B.state.tab = 'codex'; B.state.cat = 'all'; B.state.source = 'testmod'; B.render();
    await __V.wait(400);
    const alpha = document.querySelector('#content .cell[data-id="j_tm_alpha"]');
    if (alpha) { alpha.click(); await __V.wait(600) }
    const dt = document.getElementById('detail').textContent;
    r.detail = { open: B.state.sel, hasMod: dt.indexOf('MOD') >= 0, hasSource: dt.indexOf('测试 Mod') >= 0, hasFile: dt.indexOf('TestMod.lua') >= 0, title: (document.querySelector('#detail .dhead h3')||{}).textContent };

    // ---- 7) search operators see mod entries
    B.state.q = 'source:testmod'; B.state.source = 'all'; B.render();
    await __V.wait(400);
    r.search = { hits: document.querySelectorAll('#content .cell').length };
    B.state.q = 'cat:Musical'; B.render();
    await __V.wait(400);
    r.searchType = { hits: document.querySelectorAll('#content .cell').length };
    B.state.q = ''; B.state.cat = 'all'; B.render();
    await __V.wait(300);

    // ---- 8) categories that only exist because of the mod
    B.state.tab = 'mods'; B.render();
    await __V.wait(300);
    r.blankAfterAll = __V.blank();

    // ---- 9) remove, then re-import through the zip path
    B.removeMod('testmod');
    await __V.wait(500);
    r.afterRemove = { items: B.items.length, mods: B.mods.length, atlases: Object.keys(B.atlases).length };
    const zipFile = new File([u8(TM.zip)], 'TestMod.zip');
    Object.defineProperty(zipFile, '__rel', { value: 'TestMod.zip' });
    const zres = await B.importBatch([zipFile]);
    await __V.wait(500);
    r.zip = zres && { ok: zres.ok, items: zres.items, atlases: zres.atlases, root: zres.mod.root, id: zres.mod.id };
    r.afterZip = { items: B.items.length, mods: B.mods.length, atlases: Object.keys(B.atlases).length };

    // ---- 10) the mod atlas actually decodes to the pixels we put in it
    const a = B.atlases['mod_jokers'];
    r.modAtlas = a && { file: a.file, w: a.w, h: a.h, px: a.px, py: a.py, scale: a.scale, cols: a.cols, rows: a.rows, kind: a.kind };
    const noteAtlas = B.atlases['mod_notes'];
    r.noteAtlas = noteAtlas && { w: noteAtlas.w, h: noteAtlas.h, scale: noteAtlas.scale, cols: noteAtlas.cols, rows: noteAtlas.rows };

    // ---- 11) export a mod category as a ZIP (every blob is captured by the harness)
    B.state.tab = 'codex'; B.state.source = 'testmod'; B.state.cat = 'Joker'; B.render();
    await __V.wait(400);
    const zipBtn = document.getElementById('btnZip');
    if (zipBtn) { zipBtn.click(); await __V.wait(2500) }
    r.exported = (await window.__GRAB__()).map((b) => ({ name: b.name, size: b.size, magic: b.magic }));

    // ---- 12) the mod card renders through the shader path too (edition overlay)
    const beta = B.byId['j_tm_beta'];
    const sp = B.specForItem(beta); sp.edition = 'e_polychrome';
    const cv1 = B.compose(sp, 2, 0);
    sp.edition = null;
    const cv0 = B.compose(sp, 2, 0);
    r.editionDiff = __V.diff(cv0, cv1);

    // ---- 13) soul art of a mod legendary
    r.soul = !!beta.soul && beta.soul.pos.x === 0 && beta.soul.pos.y === 1;

    // final screenshot of the panel with a mod loaded
    B.state.tab = 'mods'; B.render();
    await __V.wait(300);
    r.final = { mods: B.mods.map((m) => m.id + ':' + m.items), logLines: (document.getElementById('modLogBox')||{}).textContent.split('\\n').length };
    r.blank = __V.blank();
    return r })()\`,
`

// insert the scenario right before the closing brace of the SCENARIOS object
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
  console.log('ok   scenario inserted')
}

// feed the test-mod payload in before evaluating the scenario
const hook = `    if (name === 'modImport') {
      const payload = fs.readFileSync(path.join(__dirname, 'testmod.json'), 'utf8')
      await c.eval('window.__TESTMOD__ = ' + payload + ';')
    }
    if (name === 'editions') {`
if (!s.includes('if (name === \'editions\') {')) { console.log('FAIL editions hook'); fails++ } else {
  s = s.replace(`    if (name === 'editions') {`, hook)
  console.log('ok   payload hook')
}

// screenshot the mod panel too
if (s.includes(`['codex', 'jokers', 'forge', 'atlas', 'hands', 'tarot', 'shaders', 'blind', 'cards', 'data', 'showcase', 'mobile', 'soulCompare', 'boxCompare']`)) {
  s = s.replace(`'soulCompare', 'boxCompare']`, `'soulCompare', 'boxCompare', 'modImport']`)
  console.log('ok   screenshot list')
} else { console.log('FAIL screenshot list'); fails++ }

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
