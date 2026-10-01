/* Polish from the Cryptid validation:
   - the "skipped" report should not list types that are handled elsewhere (Atlas/ConsumableType/...)
   - Rarity / UndiscoveredSprite carry no art, so they should not become catalogue entries
   - item.name should prefer en-us, not whichever localization file happened to come first in the zip
   - the same key declared several times (Cryptid does this for tier placeholders) must merge, not
     turn into id@mod@mod
   - mod blinds ship their own 34x34 sheet: they are not the vanilla 21-frame blind animation  */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

/* ---------------------------------------------------------- no-art classes */
rep('modimport.js',
  `  PokerHand: 'PokerHand', DeckSkin: 'DeckSkin', UndiscoveredSprite: 'Undiscovered', Rarity: 'Rarity',
  Sleeve: 'Sleeve',   // Cryptid / CardSleeves: a deck sleeve, its own collection tab
};`,
  `  PokerHand: 'PokerHand', DeckSkin: 'DeckSkin',
  Sleeve: 'Sleeve',   // Cryptid / CardSleeves: a deck sleeve, its own collection tab
};`,
  'drop Rarity / UndiscoveredSprite')

/* -------------------------------------------------------- skipped report */
rep('modimport.js',
  `  const unknownList = Object.keys(unknownTypes);
  if (unknownList.length) warnings.push('另有 ' + unknownList.length + ' 种声明不属于卡牌素材，已跳过：' + unknownList.map((k) => k + '×' + unknownTypes[k]).join('、'));`,
  `  // Atlas / ConsumableType / ObjectType are handled elsewhere, so they are not "skipped"
  const handled = new Set(['Atlas', 'ConsumableType', 'ObjectType']);
  const unknownList = Object.keys(unknownTypes).filter((k) => !handled.has(k)).sort((a, b) => unknownTypes[b] - unknownTypes[a]);
  const unknownTotal = unknownList.reduce((a, k) => a + unknownTypes[k], 0);
  if (unknownTotal) {
    warnings.push('另有 ' + unknownTotal + ' 条声明不含卡牌素材（' + unknownList.slice(0, 5).map((k) => k + '×' + unknownTypes[k]).join('、') + (unknownList.length > 5 ? ' 等' : '') + '），已跳过');
  }`,
  'skipped report')

/* -------------------------------------------------------------- locale order */
rep('modimport.js',
  `  const locLookup = (setName, key, localeList) => {`,
  `  // en-us first: it is the reference locale, and the parsed \`name\` is only a fallback anyway
  const locOrder = Object.keys(loc).sort((a, b) => {
    const rank = (c) => (c === 'en-us' ? 0 : c === 'zh_CN' ? 1 : 2);
    return rank(a) - rank(b)
  });

  const locLookup = (setName, key, localeList) => {`,
  'locOrder')

rep('modimport.js',
  `    const locEntry = locLookup(set, cands, Object.keys(loc)) || locLookup('Joker', cands, Object.keys(loc)) || locLookup('Other', cands, Object.keys(loc));`,
  `    const locEntry = locLookup(set, cands, locOrder) || locLookup('Joker', cands, locOrder) || locLookup('Other', cands, locOrder);`,
  'locLookup order 1')

rep('modimport.js',
  `    for (const locale of Object.keys(loc)) {`,
  `    for (const locale of locOrder) {`,
  'locLookup order 2')

/* ------------------------------------------------------------ duplicate keys */
rep('app.js',
  `  const oob = [];
  for (const it of parsed.items) {`,
  `  const oob = [];
  const dupes = [];
  for (const it of parsed.items) {
    // the same key declared twice (Cryptid does this for tier placeholders) is one card in game
    const prev = BY_ID[it.id];
    if (prev && prev.source === modId) { dupes.push(it.id); continue }`,
  'merge duplicate keys')

rep('app.js',
  `    if (BY_ID[it.id]) it.id = it.id + '@' + modId;
    it.source = modId;`,
  `    if (BY_ID[it.id]) it.id = it.id + '@' + modId;   // shadowing a vanilla entry keeps both
    it.source = modId;`,
  'shadow comment')

rep('app.js',
  `  if (oob.length) parsed.warnings.push('以下条目的 pos 超出图集范围，已标为无贴图：' + oob.slice(0, 4).join('、') + (oob.length > 4 ? ' …' : ''));`,
  `  if (oob.length) parsed.warnings.push('以下条目的 pos 超出图集范围，已标为无贴图：' + oob.slice(0, 4).join('、') + (oob.length > 4 ? ' …' : ''));
  if (dupes.length) parsed.warnings.push('有 ' + dupes.length + ' 条声明用了同一个 key（游戏中后声明的会覆盖前面的），已合并：' + dupes.slice(0, 4).join('、') + (dupes.length > 4 ? ' …' : ''));`,
  'dupe warning')

/* --------------------------------------------------------------- mod blinds */
rep('app.js',
  `    case 'Blind': {
      // blind_chips is a 21-frame animation atlas: one row per blind, x = frame
      const frames = (atlas('blind_chips') || {}).frames || 21;
      const f = ((S.blindFrame % frames) + frames) % frames;
      return { standalone: { atlas: 'blind_chips', pos: { x: f, y: it.pos.y } } };
    }`,
  `    case 'Blind': {
      // a mod blind ships its own static sheet; only vanilla's blind_chips is the 21-frame
      // animation (one row per blind, x = frame)
      if (it.source && it.atlas && it.atlas !== 'blind_chips') return { standalone: { atlas: it.atlas, pos: it.pos } };
      const frames = (atlas('blind_chips') || {}).frames || 21;
      const f = ((S.blindFrame % frames) + frames) % frames;
      return { standalone: { atlas: 'blind_chips', pos: { x: f, y: it.pos.y } } };
    }`,
  'mod blind sprite')

console.log(fails ? 'FAILURES ' + fails : 'done')
