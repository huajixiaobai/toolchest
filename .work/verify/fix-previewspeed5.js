const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `    r.specs = {
      item: JSON.stringify(B.specForItem(B.byId['j_caino'])),
      forge: JSON.stringify(B.forgeSpec()),
    };`
const to = `    // with the leftover foil edition the card really has no short loop — that is the honest
    // answer; clear it to see the detector's positive case
    r.withFoil = B.detectPeriod(B.forgeSpec());
    B.state.forge.edition = '';
    B.render();
    await __V.wait(2600);
    r.legendaryReadoutNoEd = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.specs = {
      item: JSON.stringify(B.specForItem(B.byId['j_caino'])),
      forge: JSON.stringify(B.forgeSpec()),
    };`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
