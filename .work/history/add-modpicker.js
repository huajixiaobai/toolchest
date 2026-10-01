/* Adds `modPicker`: drives BOTH real file inputs (the path that used to lose the FileList). */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

const SCENARIO = `
  modPicker: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};

    // ---- the zip input (this is the path that reported "没有读到文件")
    for (let i = 0; i < 40 && !B.mods.length; i++) await __V.wait(400);
    r.afterZip = { mods: B.mods.map((m) => m.id + ':' + m.items), items: B.items.length };
    r.zipToast = (document.getElementById('toast') || {}).textContent || '';

    B.removeMod('testmod');
    await __V.wait(500);

    // ---- the folder input
    const dir = document.getElementById('modDirInput');
    r.dirInputExists = !!dir;
    dir.click();                       // opens nothing in headless, but proves the handler is wired
    await __V.wait(200);
    for (let i = 0; i < 40 && !B.mods.length; i++) await __V.wait(400);
    r.afterDir = { mods: B.mods.map((m) => m.id + ':' + m.items), items: B.items.length };
    const m = B.mods[0];
    r.dirStats = m && m.stats;
    r.dirWarnings = m && m.warnings;
    r.dirLog = (document.getElementById('modLogBox') || {}).textContent.split('\\n').slice(-6).join(' | ');
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   scenario')
}
s = s.replace(`    if (name === 'modCryptid') {`,
  `    if (name === 'modPicker') {
      // a real file, delivered the same way the browser delivers a picked one
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")
      await sleep(600)
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const zi = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#modZipInput' })
      await c.send('DOM.setFileInputFiles', { files: [path.join(__dirname, 'testmod.zip')], nodeId: zi.nodeId })
      console.log('             injected testmod.zip into #modZipInput')
      await sleep(2500)
      const di = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#modDirInput' })
      await c.send('DOM.setFileInputFiles', { files: [path.join(__dirname, 'testmod')], nodeId: di.nodeId })
      console.log('             injected the testmod folder into #modDirInput')
    }
    if (name === 'modCryptid') {`)
console.log('ok   driver hook')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
