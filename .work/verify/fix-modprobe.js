/* Point the edition-overlay probe at a mod joker that has no soul art (soul art covers the
   whole card, which would hide the gloss), and assert the soul overlay is visible on the
   legendary one. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`    // does compose() put the gloss on a mod item when a vanilla front is involved?
    const modIt = B.byId['j_tm_beta'];`,
  `    // the gloss must land on mod art too — use the artless-soul joker, because a full-card
    // soul sprite legitimately covers the edition layer (checked separately below)
    const modIt = B.byId['j_tm_alpha'];`,
  'edition probe uses alpha')

rep(`    r.specs = { mod: JSON.stringify(B.specForItem(modIt)), van: JSON.stringify(B.specForItem(vanIt)) };
    return r })()\`,`,
  `    r.specs = { mod: JSON.stringify(B.specForItem(modIt)), van: JSON.stringify(B.specForItem(vanIt)) };

    // the legendary's floating art is an overlay on top of the card
    const beta = B.byId['j_tm_beta'];
    const withSoul = B.compose(B.specForItem(beta), 2, 0);
    const noSoulSp = B.specForItem(beta); noSoulSp.soul = null;
    const noSoul = B.compose(noSoulSp, 2, 0);
    r.soulOverlay = { diff: __V.diff(noSoul, withSoul), box: __V.bbox(withSoul) };
    return r })()\`,`,
  'soul overlay check')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
