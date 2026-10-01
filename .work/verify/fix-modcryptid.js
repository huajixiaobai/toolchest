'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

/* a 21 MB zip with 30 atlases takes a while: poll instead of assuming */
rep(`    await __V.wait(2500);   // the file input's change handler started the import

    const mod = B.mods[0];`,
  `    // the input's change handler started the import; wait for it to land (or fail)
    for (let i = 0; i < 60 && !B.mods.length; i++) await __V.wait(400);
    r.logText = (document.getElementById('modLogBox') || {}).textContent || '';
    r.toast = (document.getElementById('toast') || {}).textContent || '';
    const mod = B.mods[0];`,
  'poll for the import')

rep(`    r.mod = mod && { id: mod.id,`,
  `    if (!mod) return { fatal: 'no mod registered', logText: r.logText, toast: r.toast };
    r.mod = { id: mod.id,`,
  'early return when nothing landed')

rep(`    const mine = B.items.filter((i) => i.source === (mod && mod.id));`,
  `    const mine = B.items.filter((i) => i.source === mod.id);`,
  'match on the real id')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
