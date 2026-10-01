/* Two fixes:
   - in cdp.js the scenarios are template literals, so `\s` written there collapses to `s`; the
     text-normalising regexes in my new scenarios ended up as /s+/g (that is why "Musical" printed
     as "Mu ical"). Restore the real escape.
   - extend modCryptid to prove Cryptid entries can actually be used in the forge. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

const from = 'replace(/s+/g,'
const to = 'replace(/\\s+/g,'
const n = s.split(from).length - 1
if (n < 1) { console.log('FAIL escape fix (' + n + ')'); fails++ } else {
  s = s.split(from).join(to); console.log('ok   restored ' + n + ' escaped \\s')
}

const anchor = `    // leave the page on Cryptid's jokers so the screenshot shows mod content`
if (!s.includes(anchor)) { console.log('FAIL anchor'); fails++ } else {
  const block = `    // can Cryptid entries actually be used in the forge?
    B.state.tab = 'forge'; B.state.forge.open = null; B.render();
    await __V.wait(2600);
    const ftypes = [].slice.call(document.querySelectorAll('#content .opt[data-gkey="basetype"] option')).map((o) => o.value);
    r.forge = { types: ftypes.slice(0, 20), hasCode: ftypes.indexOf('Code') >= 0, hasSleeve: ftypes.indexOf('Sleeve') >= 0 };
    const fsel = document.querySelector('#content .opt[data-gkey="basetype"] select');
    fsel.value = 'Code'; fsel.dispatchEvent(new Event('change'));
    await __V.wait(1600);
    const picks = document.querySelectorAll('#content .opt[data-gkey="base"] .pick');
    r.forge.picks = picks.length;
    r.forge.modBadges = document.querySelectorAll('#content .opt[data-gkey="base"] .pickmod').length;
    if (picks.length) { picks[0].click(); await __V.wait(1400) }
    const pcv = document.querySelector('.preview canvas');
    r.forge.previewBox = pcv ? __V.bbox(pcv) : null;
    r.forge.nowLine = (document.querySelector('.pvnow') || {}).textContent || '';
    r.forge.header = (document.querySelector('#content .opt[data-gkey="base"] h4') || {}).textContent || '';
    r.forge.height = document.querySelector('#content').scrollHeight;
    r.forge.blank = __V.blank();

` + anchor
  s = s.replace(anchor, block); console.log('ok   cryptid forge check')
}
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
