/* 1/3 — the forge must see imported mods, so its lists are rebuilt instead of frozen at load. */
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

rep('app.js',
  `/* ---------------------------------------------------------------- forge */
const FORGE_CARDS = ITEMS.filter((i) => i.cat === 'PlayingCard');
const FORGE_ENH = ITEMS.filter((i) => i.cat === 'Enhancement');
const FORGE_EDITIONS = ITEMS.filter((i) => i.cat === 'Edition');
const FORGE_SEALS = ITEMS.filter((i) => i.cat === 'Seal');
const FORGE_BACKS = ITEMS.filter((i) => i.cat === 'Deck');
const FORGE_FRONTS = [
  { v: 'cards_1', label: '标准牌面 (cards_1 / 8BitDeck)' },
  { v: 'cards_2', label: '高对比牌面 (cards_2 / 8BitDeck_opt2)' },
];

/**
 * Which extra layers the game can legally attach to each kind of centre.
 * Seals only exist on playing cards; eternal/perishable/rental stickers only on jokers.
 */
const FORGE_TYPES = [
  { id: 'PlayingCard', label: '扑克牌 (52)', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: true } },
  { id: 'Joker', label: '小丑牌 (150)', allows: { enhancement: false, seal: false, sticker: true, edition: true, back: false } },
  { id: 'Collab', label: '联动牌面 (72)', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: false } },
  { id: 'Tarot', label: '塔罗牌 (22)', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Planet', label: '星球牌 (12)', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Spectral', label: '幽灵牌 (18)', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Voucher', label: '优惠券 (32)', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Booster', label: '补充包 (32)', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
];
const forgeType = (id) => FORGE_TYPES.find((t) => t.id === id) || FORGE_TYPES[0];`,
  `/* ---------------------------------------------------------------- forge */
/* The forge is rebuilt from ITEMS on every render, because importing a mod can add whole
   categories (Cryptid alone brings 224 jokers, 34 code cards, 17 sleeves, …). */
let FORGE_CARDS = [];
let FORGE_ENH = [];
let FORGE_EDITIONS = [];
let FORGE_SEALS = [];
let FORGE_BACKS = [];
let FORGE_TYPES = [];
const FORGE_FRONTS = [
  { v: 'cards_1', label: '标准牌面 (cards_1 / 8BitDeck)' },
  { v: 'cards_2', label: '高对比牌面 (cards_2 / 8BitDeck_opt2)' },
];

/**
 * Which extra layers the game can legally attach to each kind of centre.
 * Seals only exist on playing cards; eternal/perishable/rental stickers only on jokers.
 * A category a mod invented allows the edition layer only — we cannot know its rules.
 */
const FORGE_TYPES_BASE = [
  { id: 'PlayingCard', name: '扑克牌', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: true } },
  { id: 'Joker', name: '小丑牌', allows: { enhancement: false, seal: false, sticker: true, edition: true, back: false } },
  { id: 'Collab', name: '联动牌面', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: false } },
  { id: 'Tarot', name: '塔罗牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Planet', name: '星球牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Spectral', name: '幽灵牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Voucher', name: '优惠券', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Booster', name: '补充包', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
];
const MOD_ALLOWS = { enhancement: false, seal: false, sticker: false, edition: true, back: false };

function refreshForgeLists () {
  FORGE_CARDS = ITEMS.filter((i) => i.cat === 'PlayingCard');
  FORGE_ENH = ITEMS.filter((i) => i.cat === 'Enhancement');
  FORGE_EDITIONS = ITEMS.filter((i) => i.cat === 'Edition');
  FORGE_SEALS = ITEMS.filter((i) => i.cat === 'Seal');
  FORGE_BACKS = ITEMS.filter((i) => i.cat === 'Deck');
  const count = (id) => ITEMS.filter((i) => i.cat === id).length;
  FORGE_TYPES = FORGE_TYPES_BASE
    .filter((t) => count(t.id) > 0)
    .map((t) => ({ id: t.id, name: t.name, label: t.name + ' (' + count(t.id) + ')', allows: t.allows }));
  const known = new Set(FORGE_TYPES_BASE.map((t) => t.id));
  const extra = [...new Set(ITEMS.map((i) => i.cat))].filter((c) => !known.has(c) && count(c) > 0);
  const vanillaCats = new Set(['all', 'Base', 'Other', 'Atlas', 'Shader', 'Hand', 'Overlay', 'Challenge', 'Stake', 'Tag', 'Blind', 'DeckSkin', 'PokerHand']);
  for (const c of extra) {
    if (vanillaCats.has(c)) continue;
    FORGE_TYPES.push({ id: c, name: categoryLabel(c), label: categoryLabel(c) + ' (' + count(c) + ')', allows: MOD_ALLOWS, mod: true });
  }
  // the currently selected subject may have come from a mod that was just unloaded
  if (!FORGE_TYPES.some((t) => t.id === S.forge.baseType)) S.forge.baseType = FORGE_TYPES[0].id;
  const cur = BY_ID[S.forge.base];
  if (!cur || cur.cat !== S.forge.baseType) {
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    S.forge.base = first ? first.id : S.forge.base;
  }
}
const forgeType = (id) => FORGE_TYPES.find((t) => t.id === id) || FORGE_TYPES[0];`,
  'live forge lists')

/* state: collapse bookkeeping */
rep('app.js',
  `    edition: 'e_foil',
    variants: false,
    showFront: true,
  },`,
  `    edition: 'e_foil',
    variants: false,
    showFront: true,
    open: null,        // which groups are expanded; null = decide from the viewport on first use
  },`,
  'forge.open state')

rep('app.js',
  `function viewForge (root) {
  const wrap = document.createElement('div'); wrap.className = 'forge';`,
  `function viewForge (root) {
  refreshForgeLists();
  const wrap = document.createElement('div'); wrap.className = 'forge';`,
  'refresh on view')

console.log(fails ? 'FAILURES' : 'done')
