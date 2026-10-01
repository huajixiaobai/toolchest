/* Mod entries must never silently fall back to a vanilla sheet:
   - Deck:  a mod back with no atlas was drawn with the vanilla `centers` tile at the mod's pos
   - Enhancement: same, but on the centre layer
   - Seal: mod seals were ignored entirely (only vanilla seal positions were known)
   Also, a Mod Blind with no atlas must not be drawn from the vanilla blind animation. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`  // 6) seal (gold seals get the voucher shimmer, per card.lua)
  if (spec.seal && COM.sealPos[spec.seal]) {
    const tile = tileLayer({ atlas: 'centers', pos: COM.sealPos[spec.seal] }, W, H, spec.highContrast);
    if (spec.seal === 'Gold') drawShaded(ctx, tile, 'voucher', phase);
    else ctx.drawImage(tile, 0, 0);
  }`,
  `  // 6) seal (gold seals get the voucher shimmer, per card.lua). A mod seal carries its own
  //    sprite, exactly like a mod sticker.
  const sealRef = (spec.seal && typeof spec.seal === 'object') ? spec.seal
    : (COM.sealPos[spec.seal] ? { atlas: 'centers', pos: COM.sealPos[spec.seal] } : null);
  if (sealRef && atlas(sealRef.atlas)) {
    const tile = tileLayer(sealRef, W, H, spec.highContrast);
    if (tile) {
      if (spec.seal === 'Gold') drawShaded(ctx, tile, 'voucher', phase);
      else ctx.drawImage(tile, 0, 0);
    }
  }`,
  'seal sprite support')

rep(`    case 'Enhancement':
      return { center: { atlas: 'centers', pos: it.pos, stoneNoFront: it.id === 'm_stone' }, front: sampleFront };`,
  `    case 'Enhancement':
      // a mod enhancement brings its own sheet; vanilla ones live in \`centers\`
      return it.pos
        ? { center: { atlas: (it.source && it.atlas) ? it.atlas : 'centers', pos: it.pos, stoneNoFront: it.id === 'm_stone' }, front: sampleFront }
        : { center: baseCenter, front: sampleFront };`,
  'mod enhancement atlas')

rep(`    case 'Seal': return { center: baseCenter, front: sampleFront, seal: it.key };`,
  `    case 'Seal':
      // vanilla seals are stamped from \`centers\`; a mod seal declares its own atlas/pos
      return { center: baseCenter, front: sampleFront, seal: (it.source && it.sprite && it.pos) ? { atlas: it.atlas, pos: it.pos } : it.key };`,
  'mod seal sprite')

rep(`    case 'Deck': return it.pos ? { back: { atlas: it.atlas || 'centers', pos: it.pos } } : null;`,
  `    case 'Deck': {
      // never fall back to the vanilla back for a mod deck that declared no atlas: that would
      // show an unrelated vanilla tile
      const backAtlas = it.atlas || (it.source ? null : 'centers');
      return (backAtlas && it.pos) ? { back: { atlas: backAtlas, pos: it.pos } } : null;
    }`,
  'mod deck atlas')

rep(`      if (it.source && it.atlas && it.atlas !== 'blind_chips') return { standalone: { atlas: it.atlas, pos: it.pos } };`,
  `      if (it.source && it.atlas && it.atlas !== 'blind_chips') return { standalone: { atlas: it.atlas, pos: it.pos } };
      if (it.source && !it.atlas) return null;   // a mod blind with no art is not a vanilla blind`,
  'mod blind without atlas')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
