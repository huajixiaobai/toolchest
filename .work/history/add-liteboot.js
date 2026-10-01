/* Verify the Lite build end-to-end in a real browser: open it, hand it a game exe, and check
   the viewer comes up with the full catalogue. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
if (s.includes('liteBoot: `')) { console.log('already present'); process.exit(0) }
const SCENARIO = `
  liteBoot: \`(async()=>{
    const r = { view: 'liteBoot' };
    // 1) the start screen must be there and the page must have NO game data
    for (let i = 0; i < 40 && !document.querySelector('#boot .bootcard'); i++) await __V.wait(200);
    r.hasBootScreen = !!document.querySelector('#boot .bootcard');
    r.buttons = [].slice.call(document.querySelectorAll('#boot .btn')).map((b) => b.textContent);
    r.hasInlineData = typeof window.__BALATRO_DATA__ !== 'undefined';
    r.hasAppHandle = typeof window.__BALATRO__ !== 'undefined';
    r.hiddenShell = getComputedStyle(document.getElementById('shell')).display !== 'none';
    r.bootVisible = (() => { const b = document.getElementById('boot'); return b && getComputedStyle(b).display !== 'none' })();
    r.statusAtStart = (document.querySelector('#boot .bootstatus') || {}).textContent || '';

    // 2) the driver has put a game exe on the input by now; wait for the parse + app boot
    for (let i = 0; i < 300 && typeof window.__BALATRO__ === 'undefined'; i++) await __V.wait(300);
    r.appBooted = typeof window.__BALATRO__ !== 'undefined';
    if (!r.appBooted) {
      r.status = (document.querySelector('#boot .bootstatus') || {}).textContent || '(none)';
      r.pageErrors = window.__V.errors.slice();
      return r;
    }
    const B = window.__BALATRO__;
    r.items = B.items.length;
    r.atlases = Object.keys(B.atlases).length;
    r.textureUrls = Object.keys(window.__BALATRO_ATLAS__).length;
    r.blobUrls = Object.keys(window.__BALATRO_ATLAS__).filter((k) => String(window.__BALATRO_ATLAS__[k]).startsWith('blob:')).length;
    r.meta = { version: B.data.meta.version, source: B.data.meta.source, generated: !!B.data.meta.generated };
    r.bootHidden = getComputedStyle(document.getElementById('boot')).display === 'none';

    // 3) the catalogue must actually render
    B.state.tab = 'codex'; B.state.cat = 'all'; B.render();
    await __V.wait(2500);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.blank = __V.blank();
    r.firstCell = (document.querySelector('#content .cell .nm') || {}).textContent || '';

    // 4) a category with a shader-heavy card, and the atlas page
    B.state.cat = 'Joker'; B.render(); await __V.wait(1800);
    const holo = document.querySelector('#content .cell[data-id="j_hologram"]');
    r.hasHologram = !!holo;
    if (holo) { holo.click(); await __V.wait(1200) }
    r.detailTitle = (document.querySelector('#detail .dhead h3') || {}).textContent || '';
    r.detailHasSprite = !!document.querySelector('#detail .dhead canvas');
    r.shaders = B.shaderPrograms.length;

    // 5) one export, to be sure canvas → bytes still works with blob-backed textures
    try {
      const cv = B.compose(B.specForItem(B.byId['j_joker']), 2, 0);
      const png = await B.canvasBytes(cv);
      r.exported = { bytes: png.length, ok: png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47 };
    } catch (e) { r.exportError = e.message }

    r.pageErrors = window.__V.errors.slice();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')

/* driver hook: open the Lite build and put the synthetic exe on its file input */
s = s.replace(`    if (name === 'modCryptid' || name === 'cryptidEditions') {`,
  `    if (name === 'liteBoot') {
      const liteDir = path.join(ROOT, 'dist', 'lite')
      const exe = path.join(__dirname, 'fake-balatro.exe')
      if (!fs.existsSync(exe)) { console.log('❌ fake-balatro.exe missing — run verify/test-gameparse.js first') }
      await c.send('Page.navigate', { url: 'file:///' + path.join(liteDir, 'index.html').replace(/\\\\/g, '/') })
      await sleep(1500)
      await c.eval(HELPERS)
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const inp = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#boot input[type=file]' })
      if (inp && inp.nodeId) {
        await c.send('DOM.setFileInputFiles', { files: [exe], nodeId: inp.nodeId })
        console.log('             handed fake-balatro.exe to the Lite start screen')
      } else console.log('❌ no file input on the start screen')
    }
    if (name === 'modCryptid' || name === 'cryptidEditions') {`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
