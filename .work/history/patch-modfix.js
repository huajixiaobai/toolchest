/* Aligns the mod importer with what SMODS actually does (verified against src/game_object.lua
   + src/game_objects/*.lua): key prefix order, class defaults, atlas prefixing, pos defaults. */
const fs = require('fs');
const path = require('path');
const W = __dirname;
const rd = (f) => fs.readFileSync(path.join(W, f), 'utf8');
let fails = 0;
function rep (file, from, to, label) {
  let s = rd(file);
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log('FAIL [' + label + '] occurrences=' + n); fails++; return }
  fs.writeFileSync(path.join(W, file), s.replace(from, to));
  console.log('ok   ' + label);
}

/* ------------------------------------------------------------- key order */
/* add_prefixes() applies the MOD prefix first, then the CLASS prefix, so the real key is
   class_prefix .. '_' .. mod_prefix .. '_' .. key  (e.g. j_tm_alpha). */
rep('modimport.js',
  `function keyCandidates (key, prefix, classPrefix) {
  const out = [key];
  if (prefix) {
    out.push(prefix + '_' + key);
    if (classPrefix) out.push(classPrefix + '_' + prefix + '_' + key);
    if (classPrefix) out.push(classPrefix + '_' + key);
  }
  return [...new Set(out)];
}`,
  `function keyCandidates (key, prefix, classPrefix) {
  // order matters: the LAST entry is the key the game really ends up with
  const out = [key];
  if (prefix) {
    out.push(prefix + '_' + key);
    if (classPrefix) { out.push(classPrefix + '_' + key); out.push(classPrefix + '_' + prefix + '_' + key) }
  }
  return [...new Set(out)];
}`,
  'keyCandidates order');

/* ------------------------------------------------------------- defaults */
rep('modimport.js',
  `const SET_OF = {
  Joker: 'Joker', Consumable: null, Voucher: 'Voucher', Back: 'Back', Booster: 'Booster',
  Enhancement: 'Enhanced', Edition: 'Edition', Seal: 'Seal', Tag: 'Tag', Blind: 'Blind',
  Stake: 'Stake', Challenge: 'Challenge', PokerHand: 'PokerHand', DeckSkin: 'DeckSkin',
  UndiscoveredSprite: 'Undiscovered', Rarity: 'Rarity', Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral',
};
const CLASS_PREFIX = { Joker: 'j', Consumable: 'c', Tarot: 'c', Planet: 'c', Spectral: 'c', Voucher: 'v', Booster: 'p', Back: 'b', Tag: 'tag', Blind: 'bl', Edition: 'e', Enhancement: 'm', Seal: 's' };
const DEFAULT_ATLAS = { Joker: 'Joker', Consumable: 'Tarot', Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral', Voucher: 'Voucher', Booster: 'Booster', Back: 'centers', Enhancement: 'centers', Edition: 'Joker' };`,
  `/* SMODS class -> the category this viewer files it under (matches the vanilla cats) */
const SET_OF = {
  Joker: 'Joker', Consumable: null, Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral',
  Voucher: 'Voucher', Back: 'Deck', Booster: 'Booster',
  Enhancement: 'Enhancement', Edition: 'Edition', Seal: 'Seal', Sticker: 'Sticker',
  Tag: 'Tag', Blind: 'Blind', Stake: 'Stake', Challenge: 'Challenge',
  PokerHand: 'PokerHand', DeckSkin: 'DeckSkin', UndiscoveredSprite: 'Undiscovered', Rarity: 'Rarity',
};
/* class_prefix exactly as declared on each SMODS class (no prefix where SMODS has none) */
const CLASS_PREFIX = {
  Joker: 'j', Consumable: 'c', Tarot: 'c', Planet: 'c', Spectral: 'c', Voucher: 'v',
  Booster: 'p', Back: 'b', Tag: 'tag', Stake: 'stake', Enhancement: 'm', Edition: 'e',
  Challenge: 'c', Blind: 'bl',
};
/* atlas a class falls back to when the object declares none */
const DEFAULT_ATLAS = {
  Joker: 'Joker', Consumable: 'Tarot', Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral',
  Voucher: 'Voucher', Booster: 'Booster', Back: 'centers', Enhancement: 'centers',
  Edition: 'Joker', Seal: 'centers', Sticker: 'stickers', Tag: 'tags', Stake: 'chips', Blind: 'blind_chips',
};
/* classes whose SMODS definition ships pos = {x=0,y=0} */
const POS_DEFAULT = new Set([
  'Joker', 'Consumable', 'Tarot', 'Planet', 'Spectral', 'Voucher', 'Back', 'Booster',
  'Tag', 'Sticker', 'Enhancement', 'Edition', 'Seal', 'Stake', 'Blind', 'Achievement',
]);`,
  'SMODS default tables');

/* --------------------------------------------------- no bogus type alias */
rep('modimport.js',
  `    types.set(prefix + '_' + k, types.get(k));`,
  `    // ConsumableType / ObjectType carry prefix_config.key = false: their keys are never prefixed`,
  'drop bogus type alias');

/* ------------------------------------------------------------ pos default */
rep('modimport.js',
  `    const pos = (t.pos && typeof t.pos === 'object' && typeof t.pos.x === 'number') ? { x: t.pos.x, y: t.pos.y } : null;`,
  `    const pos = (t.pos && typeof t.pos === 'object' && (typeof t.pos.x === 'number' || typeof t.pos.y === 'number'))
      ? { x: Number(t.pos.x) || 0, y: Number(t.pos.y) || 0 }
      : (POS_DEFAULT.has(d.type) ? (implicitPos.push(fullKey), { x: 0, y: 0 }) : null);`,
  'pos default');

rep('modimport.js',
  `  // ---- entries
  const items = [];`,
  `  // ---- entries
  const items = [];
  const implicitPos = [];   // objects that fall back to SMODS' pos = {x=0,y=0}
  const implicitAtlas = []; // objects that fall back to their class atlas`,
  'entry counters');

/* --------------------------------------------------------- atlas fallback */
rep('modimport.js',
  `    let atlasKey = typeof t.atlas === 'string' ? t.atlas : (DEFAULT_ATLAS[d.type] || 'centers');
    const atlasCands = keyCandidates(atlasKey, prefix, null);
    let atlas = atlasCands.find((a) => atlases.has(a)) || atlases.get(atlasKey) || null;
    let atlasName = atlas ? atlas.key : atlasKey;`,
  `    const declaredAtlas = typeof t.atlas === 'string' ? t.atlas : null;
    const atlasKey = declaredAtlas || (DEFAULT_ATLAS[d.type] || 'centers');
    // the mod prefix is applied to \`atlas\` too, so try every spelling before giving up
    const atlasCands = keyCandidates(atlasKey, prefix, null);
    let atlas = atlasCands.map((a) => atlases.get(a)).find((a) => a && !a.aliasOf) || atlases.get(atlasKey) || null;
    if (atlas && atlas.aliasOf) atlas = atlases.get(atlas.aliasOf) || atlas;
    let atlasName = atlas ? atlas.key : atlasKey;
    if (!declaredAtlas && !atlas && !D.atlases[atlasKey]) { implicitAtlas.push(fullKey); atlasName = null }`,
  'atlas fallback');

/* ------------------------------------------------- artifact: missing atlas */
rep('modimport.js',
  `      atlas: atlasName, pos,
      sprite: { kind: 'center', atlas: atlasName, pos },`,
  `      atlas: atlasName, pos,
      sprite: atlasName ? { kind: 'center', atlas: atlasName, pos } : null,`,
  'sprite null when no atlas');

/* --------------------------------------------------------- summary warnings */
rep('modimport.js',
  `  stats.items = items.length;`,
  `  if (implicitAtlas.length) warnings.push(\`\${implicitAtlas.length} 个条目没有声明 atlas，且对应的默认图集不存在（游戏中同样无法显示）：\${implicitAtlas.slice(0, 4).join(', ')}\${implicitAtlas.length > 4 ? ' …' : ''}\`);
  if (implicitPos.length) warnings.push(\`\${implicitPos.length} 个条目没有写 pos，已按 SMODS 默认的 (0,0) 处理，会与同图集第 0 格重叠\`);
  stats.implicitPos = implicitPos.length;
  stats.implicitAtlas = implicitAtlas.length;
  stats.items = items.length;`,
  'summary warnings');

/* ------------------------------------------------------------------ app.js */
/* register every atlas key spelling (SMODS prefixes obj.atlas, the Atlas' own key stays bare) */
rep('app.js',
  `  const addedAtlas = [];
  for (const a of parsed.atlases) {
    const file = 'mod/' + modId + '/' + a.file;
    const url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/png' }));
    ATLAS[file] = url;
    delete IMG[file]; delete IMG_READY[file];
    const im = new Image();
    const dims = await new Promise((res) => { im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = url });
    const w = dims[0]; const h = dims[1];
    if (!w || !h) { parsed.warnings.push('图集 ' + a.key + ' 的图片无法解码'); continue }
    D.atlases[a.key] = {
      name: a.key, file, px: a.px, py: a.py, w, h, scale: a.scale,
      cols: Math.max(1, Math.round(w / (a.scale * a.px))),
      rows: Math.max(1, Math.round(h / (a.scale * a.py))),
      frames: null, kind: 'mod',
    };
    addedAtlas.push(a.key);
  }`,
  `  const addedAtlas = [];
  const byFile = new Map();   // mod path -> {url, w, h, error}
  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    if (!byFile.has(file)) {
      const url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/png' }));
      ATLAS[file] = url;
      delete IMG[file]; delete IMG_READY[file];
      const im = new Image();
      const dims = await new Promise((res) => { im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = url });
      byFile.set(file, { url, w: dims[0], h: dims[1], error: null });
    }
    const rec = byFile.get(file);
    if (!rec.w || !rec.h) {
      if (!rec.error) { rec.error = '图集 ' + a.key + ' 的图片无法解码'; parsed.warnings.push(rec.error) }
      continue;
    }
    D.atlases[a.key] = {
      name: a.key, file, px: a.px, py: a.py, w: rec.w, h: rec.h, scale: a.scale,
      cols: Math.max(1, Math.round(rec.w / (a.scale * a.px))),
      rows: Math.max(1, Math.round(rec.h / (a.scale * a.py))),
      frames: null, kind: 'mod', aliasOf: a.aliasOf || null,
    };
    addedAtlas.push(a.key);
  }`,
  'registerMod registers every atlas spelling');

/* bounds-check mod positions against the real sheet size */
rep('app.js',
  `  for (const it of parsed.items) {
    if (BY_ID[it.id]) it.id = it.id + '@' + modId;
    it.source = modId;`,
  `  const oob = [];
  for (const it of parsed.items) {
    // a pos outside the sheet would simply draw nothing — say so instead of showing a blank card
    const a = it.atlas ? D.atlases[it.atlas] : null;
    if (a && a.kind === 'mod' && it.pos && (it.pos.x >= a.cols || it.pos.y >= a.rows)) {
      oob.push(it.id + ' (pos ' + it.pos.x + ',' + it.pos.y + ' / ' + a.cols + '×' + a.rows + ')');
      it.pos = null; it.sprite = null;
    }
    if (BY_ID[it.id]) it.id = it.id + '@' + modId;
    it.source = modId;`,
  'bounds-check mod pos');

rep('app.js',
  `  MODS.push({
    id: modId, name: parsed.name, version: parsed.version, author: parsed.author,`,
  `  if (oob.length) parsed.warnings.push('以下条目的 pos 超出图集范围，已标为无贴图：' + oob.slice(0, 4).join('、') + (oob.length > 4 ? ' …' : ''));
  MODS.push({
    id: modId, name: parsed.name, version: parsed.version, author: parsed.author,`,
  'oob warning');

/* mod decks use their own atlas, not the vanilla \`centers\` sheet */
rep('app.js',
  `    case 'Deck': return { back: { atlas: 'centers', pos: it.pos } };`,
  `    case 'Deck': return { back: { atlas: it.atlas || 'centers', pos: it.pos } };`,
  'specForItem Deck atlas');

/* show the implicit-pos / implicit-atlas counters in the import card */
rep('app.js',
  `        \${m.stats ? \`<span>声明 <b>\${m.stats.decls || 0}</b></span><span>文件 <b>\${m.stats.files || 0}</b></span>\` : ''}`,
  `        \${m.stats ? \`<span>声明 <b>\${m.stats.decls || 0}</b></span><span>文件 <b>\${m.stats.files || 0}</b></span>\` : ''}
        \${m.stats && m.stats.implicitPos ? \`<span>隐含 pos <b>\${m.stats.implicitPos}</b></span>\` : ''}`,
  'import card stats');

console.log(fails ? '\nPATCH FAILURES: ' + fails : '\nall fidelity patches applied');
