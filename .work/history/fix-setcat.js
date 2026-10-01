/* `set` is what the game (and localization files) call the group; `cat` is how this viewer
   groups it. They differ for Backs (set=Back, cat=Deck) and Enhancements (set=Enhanced). */
const fs = require('fs');
const F = 'modimport.js';
let s = fs.readFileSync(F, 'utf8');
let fails = 0;
function rep (from, to, label) {
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label);
}

rep('/* SMODS class -> the category this viewer files it under (matches the vanilla cats) */',
  '/* SMODS class -> the `set` value the game uses (this is also the localization table name) */',
  'comment');

rep(`  Joker: 'Joker', Consumable: null, Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral',
  Voucher: 'Voucher', Back: 'Deck', Booster: 'Booster',
  Enhancement: 'Enhancement', Edition: 'Edition', Seal: 'Seal', Sticker: 'Sticker',`,
  `  Joker: 'Joker', Consumable: null, Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral',
  Voucher: 'Voucher', Back: 'Back', Booster: 'Booster',
  Enhancement: 'Enhanced', Edition: 'Edition', Seal: 'Seal', Sticker: 'Sticker',`,
  'SET_OF uses the real set names');

rep(`/* class_prefix exactly as declared on each SMODS class (no prefix where SMODS has none) */`,
  `/* where the viewer's category differs from the game's set name */
const CAT_OF = { Back: 'Deck', Enhanced: 'Enhancement' };
/* class_prefix exactly as declared on each SMODS class (no prefix where SMODS has none) */`,
  'CAT_OF');

rep(`      : setBase;
    // atlas: the one the mod ships,`,
  `      : setBase;
    const cat = CAT_OF[set] || set;
    // atlas: the one the mod ships,`,
  'cat derivation');

rep(`      id: fullKey, key: fullKey, cat: set, set,`,
  `      id: fullKey, key: fullKey, cat, set,`,
  'item cat/set');

fs.writeFileSync(F, s);
console.log(fails ? 'FAILURES ' + fails : 'done');
new Function(s);
console.log('syntax OK');
