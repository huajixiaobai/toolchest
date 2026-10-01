/* Adds `modView`: leaves the viewer on the codex filtered to the imported mod, so the
   harness captures a screenshot of mod content, and checks the panel survives a narrow width. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

const SCENARIO = `
  modView: \`(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    const r = {};
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(700);

    // narrow-width sanity for the import panel (the mobile media query only trims padding)
    B.state.tab = 'mods'; B.render();
    await __V.wait(400);
    const content = document.getElementById('content');
    const keep = content.style.maxWidth;
    content.style.maxWidth = '340px';
    await __V.wait(250);
    const v = document.querySelector('.modsview');
    r.narrow = v ? { view: v.scrollWidth, box: v.clientWidth, overflow: v.scrollWidth - v.clientWidth } : null;
    const btns = document.querySelector('.dropbtns');
    r.narrow.btnsWrapped = btns ? (btns.scrollWidth <= btns.clientWidth + 2) : null;
    content.style.maxWidth = keep;
    await __V.wait(250);

    // land on the codex filtered to the mod, so the final screenshot shows mod entries
    B.state.tab = 'codex'; B.state.source = 'testmod'; B.state.cat = 'Joker'; B.state.q = ''; B.state.sel = null;
    B.render();
    await __V.wait(1600);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.badges = document.querySelectorAll('#content .cell .modtag').length;
    r.catBadges = [].slice.call(document.querySelectorAll('#content .cell .badge')).map((e) => e.textContent);
    r.crumbs = (document.querySelector('.listhead h2')||{}).textContent;
    r.sidebar = [].slice.call(document.querySelectorAll('#sidebar .catgroup')).map((e) => e.textContent);
    r.blank = __V.blank();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}
s = s.replace(`    if (name === 'modImport' || name === 'modProbe') {`, `    if (name === 'modImport' || name === 'modProbe' || name === 'modView') {`)
console.log('ok   payload hook')
s = s.replace(`'soulCompare', 'boxCompare', 'modImport']`, `'soulCompare', 'boxCompare', 'modImport', 'modView']`)
console.log('ok   screenshot list')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
