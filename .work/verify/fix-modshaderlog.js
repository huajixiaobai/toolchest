const fs = require('fs')
let s = fs.readFileSync('cdp.js', 'utf8')
const from = `    const res = await B.importBatch(mkFiles(TM.folder));
    await __V.wait(900);
    r.logText = (document.getElementById("modLogBox") || {}).textContent || "";`
const to = `    B.state.tab = 'mods'; B.render(); await __V.wait(400);
    const res = await B.importBatch(mkFiles(TM.folder));
    await __V.wait(900);
    r.logText = (document.getElementById("modLogBox") || {}).textContent || "";`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync('cdp.js', s.replace(from, to))
new Function(fs.readFileSync('cdp.js', 'utf8'))
console.log('ok, syntax OK')
