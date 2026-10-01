/* Adds `modDrop`: exercises the real drag-and-drop path (DataTransfer + DragEvent) and the
   folder-picker path (webkitRelativePath) rather than calling importBatch directly. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

const SCENARIO = `
  modDrop: \`(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const r = {};
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mk = (p, b64) => new File([u8(b64)], p.split('/').pop());

    // ---- 1) folder-picker path: webkitRelativePath is what <input webkitdirectory> provides
    const rel = Object.keys(TM.folder).map((p) => {
      const f = mk(p, TM.folder[p]);
      Object.defineProperty(f, 'webkitRelativePath', { value: p, configurable: true });
      return f;
    });
    const res = await B.importBatch(rel, 'picker');
    r.picker = res && { ok: res.ok, items: res.items, root: res.mod.root, id: res.mod.id };
    await __V.wait(400);
    B.removeMod('testmod');
    await __V.wait(300);

    // ---- 2) real drop on the import panel's drop zone
    B.state.tab = 'mods'; B.render();
    await __V.wait(400);
    let dt = null;
    try { dt = new DataTransfer() } catch (e) { r.noDataTransfer = String(e.message) }
    if (dt) {
      for (const p of Object.keys(TM.folder)) dt.items.add(mk(p, TM.folder[p]));
      r.dtItems = dt.items.length;
      r.dtFiles = dt.files.length;
      let entry = null;
      try { entry = dt.items[0].webkitGetAsEntry() } catch (e) { entry = null }
      r.syntheticEntry = entry ? (entry.isDirectory ? 'dir' : 'file') : 'null';
      const zone = document.querySelector('#modDrop');
      r.zoneFound = !!zone;
      zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      await __V.wait(2200);
      r.afterPanelDrop = { mods: B.mods.map((m) => m.id + ':' + m.items), items: B.items.length };
      r.overlayGone = !document.body.classList.contains('dropping');
    }

    // ---- 3) drop somewhere else entirely: must import, not navigate away
    if (dt) {
      const zipFile = mk('TestMod.zip', TM.zip);
      try { zipFile.__rel = 'TestMod.zip' } catch (e) { Object.defineProperty(zipFile, '__rel', { value: 'TestMod.zip' }) }
      const dt2 = new DataTransfer();
      dt2.items.add(zipFile);
      const before = B.mods.length;
      document.getElementById('content').dispatchEvent(new DragEvent('drop', { dataTransfer: dt2, bubbles: true, cancelable: true }));
      await __V.wait(2200);
      r.globalDrop = { modsBefore: before, modsAfter: B.mods.map((m) => m.id + ':' + m.items), tab: B.state.tab, duplicateRefused: B.mods.length === before };
    }

    // ---- 4) dragover shows the full-page hint and never leaves the page
    const dt3 = new DataTransfer(); dt3.items.add(mk('manifest.json', TM.folder['TestMod/manifest.json']));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt3, bubbles: true, cancelable: true }));
    await __V.wait(150);
    r.hintOn = document.body.classList.contains('dropping');
    window.dispatchEvent(new DragEvent('dragleave', { dataTransfer: dt3, bubbles: true, cancelable: true }));
    await __V.wait(150);
    r.hintOff = !document.body.classList.contains('dropping');

    r.log = (document.getElementById('modLogBox') || {}).textContent || '';
    r.logHasPanel = r.log.indexOf('已导入') >= 0;
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}
s = s.replace(`    if (name === 'modImport' || name === 'modProbe' || name === 'modView') {`,
  `    if (name === 'modImport' || name === 'modProbe' || name === 'modView' || name === 'modDrop') {`)
console.log('ok   payload hook')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
