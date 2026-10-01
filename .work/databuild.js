/* ============================================================================
 * Portable dataset builder.
 *
 * Turns an extracted Balatro LÖVE tree into the viewer's data object. It is used
 * twice: by the Node build (build.js) and, in a browser, by gameparse.js — so a
 * website visitor can build the very same dataset out of their own copy of the
 * game, without the assets ever leaving the page.
 *
 * env = {
 *   read(path)        -> string   utf-8 text, relative to the LÖVE root
 *   bytes(path)       -> Uint8Array | null
 *   exists(path)      -> boolean  true for a readable file
 *   listTree(dir)     -> string[] every file under dir, relative to the LÖVE root
 *   pngSize(bytes)    -> { width, height }
 *   textBytes(str)    -> number   (defaults to str.length)
 *   source            -> string   label for meta.source
 *   now               -> string   ISO timestamp
 * }
 * returns { data, textures, warnings, stats }
 * ==========================================================================*/
'use strict'
const lua = (typeof require !== 'undefined' && typeof module !== 'undefined')
  ? require('./lua')
  : window.__LUA__

function buildData (env) {
const read = env.read
const pngSize = env.pngSize
const textBytes = env.textBytes || ((s) => s.length)
const exists = env.exists
const bytesAt = env.bytes
const listTree = env.listTree
const warnings = []

const gameSrc = read('game.lua')
const globalsSrc = read('globals.lua')
const T = (marker, src = gameSrc) => lua.resolve(lua.extractAndParse(src, marker))

// ---------------------------------------------------------------- game data
const P_CENTERS = T('self.P_CENTERS = {')
const P_BLINDS = T('self.P_BLINDS = {')
const P_TAGS = T('self.P_TAGS = {')
const P_SEALS = T('self.P_SEALS = {')
const P_CARDS = T('self.P_CARDS = {')
const P_STAKES = T('self.P_STAKES = {')
const ASSET_ATLI = T('self.asset_atli = {')
const ANIM_ATLI = T('self.animation_atli = {')
const ASSET_IMAGES = T('self.asset_images = {')
const CHALLENGES = lua.resolve(lua.extractAndParse(read('challenges.lua'), 'G.CHALLENGES = {'))
const COLLABS = T('self.COLLABS = {', globalsSrc)
const HANDS = lua.resolve(lua.extractAndParse(gameSrc, 'hands = {'))

// ---------------------------------------------------------------- atlases
const atlasList = []
/** Atlas paths are built as "resources/textures/"..scaling.."x/Name.png"; rebuild them. */
function resolvePath (p) {
  if (typeof p === 'string') return p
  if (p && typeof p === 'object' && p.expr) {
    const strs = [...p.expr.matchAll(/"([^"]*)"/g)].map((m) => m[1])
    if (strs.length >= 2) return strs[0] + '1' + strs.slice(1).join('')
    return strs.join('')
  }
  return null
}
for (const rec of Object.values(ASSET_ATLI)) atlasList.push({ name: rec.name, path: resolvePath(rec.path), px: rec.px, py: rec.py, kind: 'atlas' })
for (const rec of Object.values(ANIM_ATLI)) atlasList.push({ name: rec.name, path: resolvePath(rec.path), px: rec.px, py: rec.py, frames: rec.frames, kind: 'animation' })
for (const rec of Object.values(ASSET_IMAGES)) atlasList.push({ name: rec.name, path: resolvePath(rec.path), px: rec.px, py: rec.py, kind: 'image' })

const TEX = 'resources/textures/'
const atlases = {}
for (const a of atlasList) {
  const rel = a.path.replace(/^resources\/textures\//, '')
  const x2 = rel.replace(/^1x\//, '2x/') // ship the 2x art: same image, twice the pixels
  const file = exists(TEX + x2) ? x2 : rel
  const full = TEX + file
  if (!exists(full)) { warnings.push('缺少贴图 ' + file); continue }
  const img = pngSize(bytesAt(full))
  const scale = file.startsWith('2x/') ? 2 : 1
  atlases[a.name] = {
    name: a.name, file, px: a.px, py: a.py, w: img.width, h: img.height, scale,
    cols: Math.max(1, Math.round(img.width / (scale * a.px))),
    rows: Math.max(1, Math.round(img.height / (scale * a.py))),
    frames: a.frames || null, kind: a.kind,
  }
}

// game.lua does this at the end of init_item_prototypes:
//   self.ASSET_ATLAS.Planet = self.ASSET_ATLAS.Tarot
//   self.ASSET_ATLAS.Spectral = self.ASSET_ATLAS.Tarot
// without it planet and spectral cards resolve to a missing atlas and render blank.
for (const alias of ['Planet', 'Spectral']) {
  if (!atlases[alias] && atlases.Tarot) atlases[alias] = atlases.Tarot
}

// ---------------------------------------------------------------- locales
const LOCALES = [['en-us', 'English'], ['zh_CN', '简体中文'], ['zh_TW', '繁體中文'], ['ja', '日本語'], ['ko', '한국어']]
const locData = {}
const KEEP_SETS = ['Back', 'Blind', 'Edition', 'Enhanced', 'Joker', 'Other', 'Planet', 'Spectral', 'Stake', 'Tag', 'Tarot', 'Voucher']
const KEEP_MISC = ['poker_hands', 'poker_hand_descriptions', 'labels', 'dictionary', 'v_dictionary', 'suits_singular', 'suits_plural', 'ranks', 'challenge_names', 'collabs', 'blind_states']
for (const [code] of LOCALES) {
  const t = lua.resolve(lua.extractAndParse(read(`localization/${code}.lua`), 'return {'))
  const descriptions = {}
  for (const s of KEEP_SETS) descriptions[s] = t.descriptions?.[s] || {}
  const misc = {}
  for (const m of KEEP_MISC) misc[m] = t.misc?.[m] || {}
  locData[code] = { descriptions, misc }
}
const EN = locData['en-us']

// ---------------------------------------------------------------- text helpers
const SUITS = { Spades: 1, Hearts: 1, Clubs: 1, Diamonds: 1 }

function toArray (text) {
  if (text === undefined || text === null) return []
  if (Array.isArray(text)) return text.slice()
  if (typeof text === 'string') return [text]
  if (typeof text === 'object') return Object.keys(text).sort((a, b) => Number(a) - Number(b)).map((k) => text[k]).filter((x) => typeof x === 'string')
  return []
}

/** Flatten nested config values in declaration order, ignoring boolean flags. */
function flatten (v, out) {
  if (v === null || v === undefined) return out
  if (Array.isArray(v)) { for (const x of v) flatten(x, out); return out }
  if (typeof v === 'object') {
    if ('expr' in v) { out.push({ __exprText: v.expr }); return out }
    if ('hex' in v) { out.push(v.hex); return out }
    for (const k of Object.keys(v)) flatten(v[k], out)
    return out
  }
  if (typeof v === 'boolean' || typeof v === 'function') return out
  out.push(v)
  return out
}

const exprKey = (v) => {
  if (v && typeof v === 'object') {
    const m = /(['"])(.*?)\1/.exec(v.expr || '')
    return m ? m[2] : null
  }
  return String(v)
}

/** The game fills #n# with values it computes at runtime; these mirror that mapping. */
const PROB = 1 // G.GAME.probabilities.normal
const SUIT_POOL = ['Spades', 'Hearts', 'Clubs', 'Diamonds']
const RANK_POOL = ['Ace', 'King', 'Queen', 'Jack', '10', '9']
const SPECIAL_CANDIDATES = {
  j_8_ball: () => [PROB, 4],
  j_space: () => [PROB, 4],
  j_business: () => [PROB, 2],
  j_hallucination: () => [PROB, 2],
  j_reserved_parking: (c) => [c.config.extra.dollars, PROB, c.config.extra.odds],
  j_gros_michel: (c) => [c.config.extra.mult, PROB, c.config.extra.odds],
  j_cavendish: (c) => [c.config.extra.Xmult, PROB, c.config.extra.odds],
  j_bloodstone: (c) => [PROB, c.config.extra.odds, c.config.extra.Xmult],
  m_glass: (c) => [c.config.Xmult, PROB, c.config.extra],
  m_lucky: (c) => [PROB, c.config.mult, 5, c.config.p_dollars, 15],
  j_blackboard: (c) => [c.config.extra, { __suitPlural: 'Spades' }, { __suitPlural: 'Clubs' }],
  j_diet_cola: () => [{ __center: 'tag_double' }],
  j_trousers: (c) => [c.config.extra, { __hand: 'Two Pair' }, { __dynamic: 'mult' }],
  j_ancient: (c) => [c.config.extra, { __suitPlural: 'Spades' }],
  j_idol: (c) => [c.config.extra, { __rank: RANK_POOL[0] }, { __suitPlural: SUIT_POOL[0] }],
  j_mail: (c) => [c.config.extra, { __rank: RANK_POOL[0] }],
  j_castle: (c) => [c.config.extra.chip_mod, { __suitSingular: SUIT_POOL[0] }, c.config.extra.chips],
  j_erosion: (c) => [c.config.extra, { __dynamic: 'mult' }, 52],
  j_yorick: (c) => [c.config.extra.xmult, c.config.extra.discards, { __dynamic: 'countdown' }, { __dynamic: 'xmult' }],
  j_invisible: (c) => [c.config.extra, { __dynamic: 'rounds' }],
  j_drivers_license: (c) => [c.config.extra, { __dynamic: 'count' }],
  j_steel_joker: (c) => [c.config.extra, { __dynamic: 'xmult' }],
  c_base: () => ['Ace', { __suitPlural: 'Spades' }],
  sticker_perishable: () => [5, { __dynamic: 'rounds' }],
  sticker_rental: () => [3],
}
// stickers are keyed both bare and prefixed depending on the call site
SPECIAL_CANDIDATES.perishable = SPECIAL_CANDIDATES.sticker_perishable
SPECIAL_CANDIDATES.rental = SPECIAL_CANDIDATES.sticker_rental

const SYNTH_TEXT = {
  c_base: {
    'en-us': ['Blank card body — every playing card face is drawn on top of this frame.'],
    zh_CN: ['空白卡体 —— 所有扑克牌牌面都绘制在这个底框之上。'],
    zh_TW: ['空白卡體 —— 所有撲克牌牌面都繪製在這個底框之上。'],
    ja: ['空のカード本体 —— すべてのトランプの絵柄はこの上に描画されます。'],
    ko: ['빈 카드 본체 —— 모든 트럼프 카드 그림은 이 위에 그려집니다.'],
  },
}

/** Per-category ordered list of the values the game feeds into #1#, #2#, ... */
function candidatesFor (key, set, c) {
  if (SPECIAL_CANDIDATES[key]) return SPECIAL_CANDIDATES[key](c)
  const cfg = c.config || {}
  switch (set) {
    case 'Tarot': {
      const out = []
      if (cfg.max_highlighted != null) out.push(cfg.max_highlighted)
      if (typeof cfg.mod_conv === 'string' && cfg.mod_conv.startsWith('m_')) out.push({ __enh: cfg.mod_conv })
      if (cfg.suit_conv) out.push({ __suitPlural: cfg.suit_conv })
      if (cfg.extra != null) out.push(cfg.extra)
      if (cfg.planets != null) out.push(cfg.planets)
      if (cfg.tarots != null) out.push(cfg.tarots)
      if (key === 'c_wheel_of_fortune') return [1, cfg.extra]
      if (key === 'c_temperance') return [cfg.extra, { __dynamic: 'sell value' }]
      return out
    }
    case 'Planet': {
      const h = HANDS[cfg.hand_type] || {}
      return [1, { __hand: cfg.hand_type }, h.l_mult, h.l_chips]
    }
    case 'Spectral': {
      if (key === 'c_ectoplasm') return [1]
      return flatten(cfg, [])
    }
    case 'Booster':
      return [cfg.choose, cfg.extra]
    case 'Back': {
      const out = []
      for (const k of Object.keys(cfg)) {
        const v = cfg[k]
        if (typeof v === 'boolean') continue
        if (k === 'voucher') out.push({ __center: v })
        else if (k === 'vouchers' || k === 'consumables') { for (const x of [].concat(v)) out.push({ __center: x }) }
        else if (typeof v === 'number') out.push(Math.abs(v))
        else if (typeof v === 'string') out.push(v)
      }
      if (key === 'b_anaglyph') out.push({ __center: 'tag_double' })
      return out
    }
    case 'Voucher':
      if (cfg.extra_disp != null) return [cfg.extra_disp]
      return flatten(cfg, [])
    case 'Blind': {
      const vars = Array.isArray(c.vars) ? c.vars : []
      return vars.map((v) => ({ __dict: exprKey(v) }))
    }
    case 'Stake':
      return []
    default:
      return flatten(cfg, [])
  }
}

function fillVars (arr, cands, loc, nameOf) {
  return arr.map((line) => String(line).replace(/#(\d+)#/g, (m, n) => {
    const v = cands[Number(n) - 1]
    if (v === undefined || v === null) return m
    if (typeof v === 'object') {
      if (v.__enh) return loc.descriptions.Enhanced?.[v.__enh]?.name || nameOf?.(v.__enh) || v.__enh
      if (v.__suitPlural) return loc.misc.suits_plural?.[v.__suitPlural] || v.__suitPlural
      if (v.__suitSingular) return loc.misc.suits_singular?.[v.__suitSingular] || v.__suitSingular
      if (v.__rank) return loc.misc.ranks?.[v.__rank] || v.__rank
      if (v.__hand) return loc.misc.poker_hands?.[v.__hand] || v.__hand
      if (v.__dict) return loc.misc.dictionary?.[v.__dict] || v.__dict
      if (v.__center) return nameOf?.(v.__center) || v.__center
      if (v.__exprText) return v.__exprText
      return m
    }
    if (typeof v === 'boolean') return v ? 'Yes' : 'No'
    if (typeof v === 'string') {
      if (SUITS[v] && loc.misc.suits_singular?.[v]) return loc.misc.suits_singular[v]
      if (loc.misc.poker_hands?.[v]) return loc.misc.poker_hands[v]
      return v
    }
    return String(Math.round(v * 1000) / 1000)
  }))
}

// ---------------------------------------------------------------- items
const items = []
const nameOf = (k) => EN.descriptions.Joker?.[k]?.name || EN.descriptions.Enhanced?.[k]?.name || EN.descriptions.Tag?.[k]?.name || P_CENTERS[k]?.name || k

function nameI18n (key, set, fallback) {
  const out = {}
  for (const [code] of LOCALES) {
    const d = locData[code].descriptions[set]?.[key]
    if (d && d.name) out[code] = d.name
  }
  if (!Object.keys(out).length && fallback) out['en-us'] = fallback
  return { i18n: out, name: out['en-us'] || fallback || key }
}

function textI18n (key, set, c, extra) {
  const i18n = {}
  const textRaw = {}
  const cands = candidatesFor(key, set, c)
  for (const [code] of LOCALES) {
    let arr = toArray(locData[code].descriptions[set]?.[key]?.text)
    if (extra && extra.getText) {
      const ov = extra.getText(code)
      if (ov) arr = ov
    }
    if (!arr.length) continue
    textRaw[code] = arr
    i18n[code] = fillVars(arr, cands, locData[code], nameOf)
  }
  return { i18n, textRaw }
}

const SEAL_POS = { Gold: { x: 2, y: 0 }, Purple: { x: 4, y: 4 }, Red: { x: 5, y: 4 }, Blue: { x: 6, y: 4 } }
const STICKER_POS = {
  eternal: { x: 0, y: 0 }, perishable: { x: 0, y: 2 }, rental: { x: 1, y: 2 },
  White: { x: 1, y: 0 }, Red: { x: 2, y: 0 }, Green: { x: 3, y: 0 }, Black: { x: 0, y: 1 },
  Blue: { x: 4, y: 0 }, Purple: { x: 1, y: 1 }, Orange: { x: 2, y: 1 }, Gold: { x: 3, y: 1 },
}
const SET_CATEGORY = {
  Joker: 'Joker', Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral', Voucher: 'Voucher',
  Booster: 'Booster', Back: 'Deck', Enhanced: 'Enhancement', Edition: 'Edition', Default: 'Base',
}

/** G.CARD_W / G.CARD_H from globals.lua — the card's size in world units. */
const CARD_W_WORLD = 2.4 * 35 / 41;
const CARD_H_WORLD = 2.4 * 47 / 41;
/**
 * Card:set_ability resizes the card BOX for a few centres, which stretches the
 * (always 71x95) sprite into that box. Values are fractions of the normal card.
 */
const BOX_OVERRIDE = {
  'Half Joker': { w: 1, h: 1 / 1.7 },
  Photograph: { w: 1, h: 1 / 1.2 },
  'Square Joker': { w: 1, h: CARD_W_WORLD / CARD_H_WORLD },
  'Wee Joker': { w: 0.7, h: 0.7 },
}

/** Mirrors Card:set_sprites for choosing the atlas + tile of a P_CENTERS entry. */
function centerSprite (c) {
  if (c.set === 'Joker') return { atlas: 'Joker', pos: c.pos }
  if (c.consumeable) return { atlas: c.set, pos: c.pos }
  if (c.set === 'Voucher') return { atlas: 'Voucher', pos: c.pos }
  if (c.set === 'Booster') return { atlas: 'Booster', pos: c.pos }
  if (c.atlas) return { atlas: c.atlas, pos: c.pos }
  return { atlas: 'centers', pos: c.pos }
}

/**
 * Extra card.lua draw layers keyed by centre set, exactly as Card:draw applies them:
 *   Voucher  -> 'voucher' shader on the centre sprite
 *   Booster  -> 'booster' shader on the centre sprite
 *   Spectral -> 'booster' shader on the centre sprite (+ a floating soul for The Soul)
 */
const SET_SHADER = { Voucher: 'voucher', Booster: 'booster', Spectral: 'booster' }
/** The Soul's floating ghost sprite lives in the centres atlas (P_CENTERS.soul). */
const SOUL_SPRITE = P_CENTERS.soul ? { atlas: 'centers', pos: P_CENTERS.soul.pos } : null

function soulFor (key, c) {
  // soul_pos = a second sprite drawn above the card and animated (legendaries + Hologram)
  if (c.soul_pos) return { atlas: 'Joker', pos: c.soul_pos, kind: 'float' }
  if (key === 'c_soul' && SOUL_SPRITE) return { atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos, kind: 'soul' }
  return null
}

for (const key of Object.keys(P_CENTERS)) {
  const c = P_CENTERS[key]
  const set = c.set || 'Other'
  const tx = textI18n(key, set, c, {
    getText: (code) => {
      if (SYNTH_TEXT[key]) return SYNTH_TEXT[key][code] || SYNTH_TEXT[key]['en-us']
      if (key === 'm_bonus') {
        // Bonus Card has no localised text in any shipped locale; reuse Steel Card's
        // chip line, which is the same sentence shape.
        const src = toArray(locData[code].descriptions.Enhanced?.m_stone?.text)
        return src.length ? [src[0]] : null
      }
      return null
    },
  })
  const nm = nameI18n(key, set, c.name)
  const sp = centerSprite(c)
  items.push({
    id: key, key, cat: SET_CATEGORY[set] || 'Other', set,
    order: c.order ?? 999, name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: sp.atlas, pos: sp.pos || null,
    sprite: { kind: 'center', atlas: sp.atlas, pos: sp.pos || null },
    // card box, as a fraction of the normal card (see Card:set_ability)
    box: BOX_OVERRIDE[c.name] || (set === 'Booster' ? { w: 1.27, h: 1.27 } : null),
    soul: soulFor(key, c),
    setShader: SET_SHADER[set] || null,
    rarity: c.rarity, cost: c.cost, unlocked: c.unlocked, discovered: c.discovered,
    effect: c.effect, label: c.label, weight: c.weight, kind: c.kind, stake: c.stake,
    blueprint_compat: c.blueprint_compat, eternal_compat: c.eternal_compat, perishable_compat: c.perishable_compat,
    hidden: c.hidden, omit: c.omit, demo: c.demo, wip: c.wip,
    requires: c.requires, unlock_condition: c.unlock_condition, config: c.config || {},
    soul_pos: c.soul_pos || null, raw: c,
  })
}

const BOOSTER_TEXT_KEY = (key, c) => {
  const size = key.includes('_jumbo_') ? 'jumbo' : key.includes('_mega_') ? 'mega' : 'normal'
  return 'p_' + String(c.kind || '').toLowerCase() + '_' + size
}

// Boosters share three generic sentences located under descriptions.Other.
for (const it of items) {
  if (it.cat !== 'Booster') continue
  const otherKey = BOOSTER_TEXT_KEY(it.id, it.raw)
  const i18n = {}
  const raw = {}
  const cands = candidatesFor(it.id, 'Booster', it.raw)
  for (const [code] of LOCALES) {
    const arr = toArray(locData[code].descriptions.Other?.[otherKey]?.text)
    if (!arr.length) continue
    raw[code] = arr
    i18n[code] = fillVars(arr, cands, locData[code], nameOf)
  }
  it.text = i18n
  it.textRaw = raw
}

for (const key of Object.keys(P_SEALS)) {
  const s = P_SEALS[key]
  const nm = nameI18n(key, 'Other', key + ' Seal')
  const tx = textI18n(key.toLowerCase() + '_seal', 'Other', {})
  items.push({
    id: 'seal_' + key, key, cat: 'Seal', set: 'Seal', order: s.order ?? 99,
    name: EN.misc.labels?.[key.toLowerCase() + '_seal'] || key + ' Seal',
    i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'centers', pos: SEAL_POS[key] || { x: 0, y: 0 },
    sprite: { kind: 'overlay', atlas: 'centers', pos: SEAL_POS[key] || { x: 0, y: 0 } },
    config: {}, raw: s,
  })
}

for (const key of Object.keys(P_TAGS)) {
  const t = P_TAGS[key]
  const nm = nameI18n(key, 'Tag', t.name)
  const tx = textI18n(key, 'Tag', t)
  items.push({
    id: key, key, cat: 'Tag', set: 'Tag', order: t.order ?? 99,
    name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'tags', pos: t.pos, sprite: { kind: 'tag', atlas: 'tags', pos: t.pos },
    min_ante: t.min_ante, requires: t.requires, config: t.config || {}, raw: t,
  })
}

for (const key of Object.keys(P_BLINDS)) {
  const b = P_BLINDS[key]
  const nm = nameI18n(key, 'Blind', b.name)
  const tx = textI18n(key, 'Blind', b)
  items.push({
    id: key, key, cat: 'Blind', set: 'Blind', order: b.order ?? 99,
    name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'blind_chips', pos: b.pos,
    sprite: { kind: 'blind', atlas: 'blind_chips', pos: b.pos, frames: 21 },
    dollars: b.dollars, mult: b.mult, boss: b.boss, debuff: b.debuff, boss_colour: b.boss_colour,
    config: (b.vars && b.vars.length) ? { vars: b.vars } : {}, raw: b,
  })
}

for (const key of Object.keys(P_STAKES)) {
  const s = P_STAKES[key]
  const nm = nameI18n(key, 'Stake', s.name)
  const tx = textI18n(key, 'Stake', s)
  items.push({
    id: key, key, cat: 'Stake', set: 'Stake', order: s.order ?? 99,
    name: nm.name, i18n: nm.i18n, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'chips', pos: s.pos, sprite: { kind: 'stake', atlas: 'chips', pos: s.pos },
    stake_level: s.stake_level, config: {}, raw: s,
  })
}

for (const key of Object.keys(STICKER_POS)) {
  const isRun = ['eternal', 'perishable', 'rental'].includes(key)
  const tx = textI18n(key, 'Other', {})
  items.push({
    id: 'sticker_' + key, key, cat: 'Sticker', set: 'Sticker', order: isRun ? 1 : 2,
    name: EN.misc.labels?.[key] || key[0].toUpperCase() + key.slice(1),
    i18n: {}, text: tx.i18n, textRaw: tx.textRaw,
    atlas: 'stickers', pos: STICKER_POS[key],
    sprite: { kind: 'sticker', atlas: 'stickers', pos: STICKER_POS[key] },
    config: {}, raw: {},
  })
}

for (const key of Object.keys(P_CARDS)) {
  const c = P_CARDS[key]
  items.push({
    id: key, key, cat: 'PlayingCard', set: 'PlayingCard', order: (c.pos.y * 13) + c.pos.x,
    name: c.name, i18n: {}, text: {}, textRaw: {},
    atlas: 'cards_1', pos: c.pos, sprite: { kind: 'playingcard', atlas: 'cards_1', pos: c.pos },
    value: c.value, suit: c.suit, config: {}, raw: c,
  })
}

const collabNames = EN.misc.collabs || {}
for (const suit of Object.keys(COLLABS.options || {})) {
  for (const opt of COLLABS.options[suit]) {
    if (opt === 'default') continue
    for (const rank of ['Jack', 'Queen', 'King']) {
      const cn = collabNames[opt.replace('collab_', '')] || opt
      items.push({
        id: `${opt}_${rank}`, key: `${opt}_${rank}`, cat: 'Collab', set: 'Collab', order: 0,
        name: `${cn} — ${rank} of ${suit}`, i18n: {}, text: {}, textRaw: {},
        atlas: opt + '_1', pos: COLLABS.pos[rank],
        sprite: { kind: 'collab', atlas: opt + '_1', atlas2: opt + '_2', pos: COLLABS.pos[rank] },
        suit, value: rank, config: {}, raw: { suit, rank, collab: opt },
        collab: opt, collabName: cn,
      })
    }
  }
}

// ---------------------------------------------------------------- overlay layers
// Card.lua stacks extra art on top of certain cards; expose those layers as
// first-class, extractable entries so nothing is hidden inside a composite.
const OVERLAY_ITEMS = []
if (SOUL_SPRITE) {
  OVERLAY_ITEMS.push({
    id: 'overlay_soul', key: 'overlay_soul', cat: 'Overlay', set: 'Overlay', order: 1,
    name: '灵魂虚影 Soul', i18n: {}, text: {}, textRaw: {},
    atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos,
    sprite: { kind: 'overlay', atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos },
    note: '叠加层：原版在「灵魂 The Soul」这张幽灵牌上用 G.shared_soul 绘制，带正弦缩放的浮动动画。可单独提取。',
    config: {}, raw: { source: 'G.P_CENTERS.soul', atlas: SOUL_SPRITE.atlas, pos: SOUL_SPRITE.pos },
  })
}
for (const key of Object.keys(P_CENTERS)) {
  const c = P_CENTERS[key]
  if (!c.soul_pos) continue
  OVERLAY_ITEMS.push({
    id: 'overlay_' + key, key: 'overlay_' + key, cat: 'Overlay', set: 'Overlay',
    order: 2 + (c.order ?? 999), name: (c.name || key) + ' 悬浮立绘', i18n: {}, text: {}, textRaw: {},
    atlas: 'Joker', pos: c.soul_pos,
    sprite: { kind: 'overlay', atlas: 'Joker', pos: c.soul_pos },
    note: `叠加层：原版用 children.floating_sprite 把它画在「${c.name || key}」(${key}) 的卡面之上，并做正弦缩放 / 旋转的浮动动画。可单独提取。`,
    config: {}, raw: { source: `${key}.soul_pos`, atlas: 'Joker', pos: c.soul_pos },
  })
}
for (const o of OVERLAY_ITEMS) items.push(o)

for (const key of Object.keys(CHALLENGES)) {  const c = CHALLENGES[key]
  if (!c || !c.id) continue
  const i18n = {}
  for (const [code] of LOCALES) {
    const v = locData[code].misc.challenge_names?.[c.id]
    if (v) i18n[code] = v
  }
  items.push({
    id: c.id, key: c.id, cat: 'Challenge', set: 'Challenge', order: Number(key) + 1,
    name: i18n['en-us'] || c.name, i18n, text: {}, textRaw: {},
    atlas: null, pos: null, sprite: null,
    unlocked: c.unlocked, rules: c.rules, jokers: c.jokers, deck: c.deck,
    consumables: c.consumables, vouchers: c.vouchers, config: {}, raw: c,
  })
}

// ---------------------------------------------------------------- hands
const handItems = Object.keys(HANDS).map((k) => {
  const h = HANDS[k]
  const i18n = {}
  for (const [code] of LOCALES) if (locData[code].misc.poker_hands?.[k]) i18n[code] = locData[code].misc.poker_hands[k]
  const desc = {}
  for (const [code] of LOCALES) {
    const v = locData[code].misc.poker_hand_descriptions?.[k]
    if (v) desc[code] = toArray(v)
  }
  return {
    key: k, name: i18n['en-us'] || k, i18n, desc,
    order: h.order, visible: h.visible, chips: h.chips, mult: h.mult, level: h.level,
    l_chips: h.l_chips, l_mult: h.l_mult,
    example: (h.example || []).map((e) => (Array.isArray(e) ? e[0] : e)),
  }
}).sort((a, b) => a.order - b.order)

// ---------------------------------------------------------------- textures on disk
const ALL_TEX = listTree('resources/textures')
  .filter((r) => r.toLowerCase().endsWith('.png'))
  .sort()
const atlasIndex = ALL_TEX.map((rel) => {
  const img = pngSize(bytesAt('resources/textures/' + rel))
  return { file: rel, w: img.width, h: img.height }
})

// ---------------------------------------------------------------- colour palette
function rgbaToHex (v) {
  if (!v) return null
  if (typeof v === 'object' && v.hex) return v.hex
  if (Array.isArray(v)) {
    const b = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')
    return '#' + b(v[0]) + b(v[1]) + b(v[2])
  }
  return null
}
const GC = (() => {
  const t = lua.resolve(lua.extractAndParse(globalsSrc, 'self.C = {'))
  return t
})()
const LOC_COLOURS = {
  red: rgbaToHex(GC.RED), mult: rgbaToHex(GC.MULT), blue: rgbaToHex(GC.BLUE), chips: rgbaToHex(GC.CHIPS),
  green: rgbaToHex(GC.GREEN), money: rgbaToHex(GC.MONEY), gold: rgbaToHex(GC.GOLD),
  attention: rgbaToHex(GC.FILTER), purple: rgbaToHex(GC.PURPLE), white: rgbaToHex(GC.WHITE),
  inactive: rgbaToHex(GC.UI?.TEXT_INACTIVE) || '#8b9298', black: rgbaToHex(GC.BLACK),
  light_black: rgbaToHex(GC.L_BLACK), grey: rgbaToHex(GC.GREY),
  spades: rgbaToHex(GC.SUITS?.Spades), hearts: rgbaToHex(GC.SUITS?.Hearts),
  clubs: rgbaToHex(GC.SUITS?.Clubs), diamonds: rgbaToHex(GC.SUITS?.Diamonds),
  tarot: rgbaToHex(GC.SECONDARY_SET?.Tarot), planet: rgbaToHex(GC.SECONDARY_SET?.Planet),
  spectral: rgbaToHex(GC.SECONDARY_SET?.Spectral), enhanced: rgbaToHex(GC.SECONDARY_SET?.Enhanced),
  edition: rgbaToHex(GC.EDITION), dark_edition: rgbaToHex(GC.DARK_EDITION),
  legendary: rgbaToHex(GC.RARITY?.[4]) || rgbaToHex(GC.RARITY?.[3]),
  voucher: rgbaToHex(GC.VOUCHER), booster: rgbaToHex(GC.BOOSTER), eternal: rgbaToHex(GC.ETERNAL),
}
const PALETTE = {
  mult: rgbaToHex(GC.MULT), chips: rgbaToHex(GC.CHIPS), money: rgbaToHex(GC.MONEY),
  red: rgbaToHex(GC.RED), blue: rgbaToHex(GC.BLUE), green: rgbaToHex(GC.GREEN),
  orange: rgbaToHex(GC.ORANGE), gold: rgbaToHex(GC.GOLD), purple: rgbaToHex(GC.PURPLE),
  black: rgbaToHex(GC.BLACK), white: rgbaToHex(GC.WHITE), dark: rgbaToHex(GC.UI?.TEXT_DARK) || '#0f1114',
  light: rgbaToHex(GC.UI?.TEXT_LIGHT) || '#e9eef2',
  rarity: (GC.RARITY || []).map(rgbaToHex),
  set: Object.fromEntries(Object.entries(GC.SET || {}).map(([k, v]) => [k, rgbaToHex(v)])),
  secondarySet: Object.fromEntries(Object.entries(GC.SECONDARY_SET || {}).map(([k, v]) => [k, rgbaToHex(v)])),
  suits: Object.fromEntries(Object.entries(GC.SUITS || {}).map(([k, v]) => [k, rgbaToHex(v)])),
  duel: { Hearts: rgbaToHex(GC.SUITS?.Hearts), Diamonds: rgbaToHex(GC.SUITS?.Diamonds), Spades: rgbaToHex(GC.SUITS?.Spades), Clubs: rgbaToHex(GC.SUITS?.Clubs) },
}

// ---------------------------------------------------------------- shaders
const SHADER_DIR = 'resources/shaders/'
const LIVE_SHADERS = {
  foil: 'e_foil', holo: 'e_holo', polychrome: 'e_polychrome', negative: 'e_negative',
  negative_shine: 'e_negative', booster: 'booster', voucher: 'voucher', hologram: 'hologram',
}
const SHADER_NOTE = {
  foil: '闪箔：金属斜光闪烁（原版版本特效）',
  holo: '镭射：彩虹栅格干涉（原版版本特效）',
  polychrome: '多彩：色相流动（原版版本特效）',
  negative: '负片：反相冷色（原版版本特效）',
  negative_shine: '负片叠加的光泽层（与 negative 一起使用）',
  dissolve: '卡牌出场 / 溶解动画，同时负责描边与阴影',
  debuff: '被 Boss 盲注削弱的卡牌着色',
  played: '已打出的卡牌变灰',
  voucher: '优惠券 / 贴纸的流光边框',
  booster: '补充包 / 幽灵牌的幽蓝流光，同时用于卡牌呼吸高光',
  voucher: '优惠券的流光边框；黄金蜡封与贴纸也用同一个着色器',
  hologram: '全息影像的故障位移 + 辉光（原版只用在全息小丑的悬浮立绘上）',
  gold_seal: '黄金蜡封的金色流动',
  hologram: '全息影像的浮动扫描线',
  flame: '篝火 / 燃烧效果',
  flash: '闪白过渡',
  splash: '开场水花',
  background: '游戏背景的噪点与暗角',
  vortex: '盲注选择界面的漩涡过渡',
  CRT: 'CRT 滤镜（设置里可选开启）',
  skew: '牌面倾斜的顶点扰动',
}
const shaders = listTree('resources/shaders').filter((f) => f.endsWith('.fs') && !f.includes('/')).sort().map((f) => {
  const key = f.replace(/\.fs$/, '')
  const src = read(SHADER_DIR + f)
  return {
    name: key, file: 'resources/shaders/' + f, size: textBytes(src),
    live: LIVE_SHADERS[key] || null, note: SHADER_NOTE[key] || '', source: src,
  }
})

// ---------------------------------------------------------------- composition rules
const composition = {
  cardW: 71, cardH: 95,
  baseCenter: { atlas: 'centers', pos: P_CENTERS.c_base.pos },
  cardFronts: { normal: 'cards_1', highContrast: 'cards_2' },
  enhancementAtlas: 'centers',
  sealPos: SEAL_POS,
  stickerPos: STICKER_POS,
  setShader: SET_SHADER,
  soulSprite: SOUL_SPRITE,
  soulCarriers: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].soul_pos).map((k) => ({ key: k, name: P_CENTERS[k].name, pos: P_CENTERS[k].pos, soul_pos: P_CENTERS[k].soul_pos })),
  cardShaders: {
    edition: { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' },
    set: SET_SHADER,
    goldSeal: 'voucher',
    sticker: 'voucher',
    hologram: 'hologram',
  },
  deckBacks: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].set === 'Back').map((k) => ({ key: k, pos: P_CENTERS[k].pos, name: P_CENTERS[k].name })),
  editions: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].set === 'Edition').map((k) => ({
    key: k, name: P_CENTERS[k].name, config: P_CENTERS[k].config,
    shader: { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' }[k] || null,
  })),
  enhancements: Object.keys(P_CENTERS).filter((k) => P_CENTERS[k].set === 'Enhanced').map((k) => ({ key: k, pos: P_CENTERS[k].pos, name: P_CENTERS[k].name })),
  seals: Object.keys(P_SEALS),
}

const data = {
  meta: {
    game: 'Balatro',
    version: (read('version.jkr') || '').split(/\r?\n/)[0].trim(),
    source: env.source || 'Balatro',
    generated: env.now || new Date().toISOString(),
    itemCount: items.length,
    locales: LOCALES.map(([code, label]) => ({ code, label })),
  },
  atlases, atlasIndex, items, hands: handItems, composition, loc: locData, shaders,
  colors: { tags: LOC_COLOURS, palette: PALETTE },
  counts: items.reduce((acc, i) => { acc[i.cat] = (acc[i.cat] || 0) + 1; return acc }, {}),
}

// every texture the viewer may ask for, so the caller can pack or serve them
const textures = []
for (const a of Object.values(atlases)) {
  for (const f of [a.file, a.file.replace(/^2x\//, '1x/')]) {
    const b = bytesAt(TEX + f)
    if (b && !textures.some((t) => t.file === f)) textures.push({ file: f, bytes: b })
  }
}
for (const e of atlasIndex) if (!textures.some((t) => t.file === e.file)) {
  const b = bytesAt(TEX + e.file)
  if (b) textures.push({ file: e.file, bytes: b })
}
const leftovers = items.filter((i) => JSON.stringify(i.text).includes('#') && /#\d+#/.test(JSON.stringify(i.text['en-us'] || [])))
return {
  data, textures, warnings,
  stats: {
    items: items.length,
    atlases: Object.keys(atlases).length,
    textures: ALL_TEX.length,
    packed: textures.length,
    placeholders: leftovers.length,
    counts: data.counts,
  },
}
}

/* Node (build.js) and the browser bundle both load this file */
if (typeof module !== 'undefined' && module.exports) module.exports = { buildData }
if (typeof window !== 'undefined') window.__DATABUILD__ = { buildData }
