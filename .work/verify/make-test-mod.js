/* Builds a synthetic Steamodded-style mod used to test the in-page importer.
   Art is sliced out of the real 2x atlases so rendered tiles are actual game pixels.
   Writes verify/testmod/ (folder tree) + verify/testmod.json ({folder:{path:b64}, zip:b64}). */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const png = require(path.join(__dirname, '..', 'png.js'))

const W = path.join(__dirname, '..')
const OUT = path.join(__dirname, 'testmod')
fs.rmSync(OUT, { recursive: true, force: true })

/* ---------------------------------------------------------------- atlas src */
const atlasSrc = fs.readFileSync(path.join(W, 'out', 'atlas.js'), 'utf8')
const ATLAS = JSON.parse(atlasSrc.replace(/^window\.__BALATRO_ATLAS__=/, '').replace(/;\s*$/, ''))
const decodeSheet = (key) => png.decode(Buffer.from(ATLAS[key].replace(/^data:image\/png;base64,/, ''), 'base64'))
const jokers = decodeSheet('2x/Jokers.png')
const tarots = decodeSheet('2x/Tarots.png')

/** Compose a sheet of 2x tiles (142x190) from `cells` = [[sx,sy], ...] row-major. */
function sheet2x (src, cells, cols) {
  const TW = 142; const TH = 190
  const rows = Math.ceil(cells.length / cols)
  const out = { width: cols * TW, height: rows * TH, data: Buffer.alloc(cols * TW * rows * TH * 4) }
  cells.forEach(([sx, sy], i) => {
    const tile = png.crop(src, sx * TW, sy * TH, TW, TH)
    const dx = (i % cols) * TW; const dy = Math.floor(i / cols) * TH
    for (let y = 0; y < TH; y++) tile.data.copy(out.data, ((dy + y) * out.width + dx) * 4, y * TW * 4, (y + 1) * TW * 4)
  })
  return out
}
/** Nearest-neighbour halve, so a 1x sheet is exactly half the 2x pixels. */
function half (img) {
  const w = img.width >> 1; const h = img.height >> 1
  const out = { width: w, height: h, data: Buffer.alloc(w * h * 4) }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y * 2) * img.width + x * 2) * 4; const di = (y * w + x) * 4
      img.data.copy(out.data, di, si, si + 4)
    }
  }
  return out
}

const jokerSheet = sheet2x(jokers, [[0, 0], [1, 0], [2, 0], [3, 0]], 2)          // 2x2
const noteSheet = half(sheet2x(tarots, [[0, 0], [1, 0], [0, 1], [1, 1]], 2))     // 1x, 2x2

/* cell (0,1) of the joker sheet is the "soul" art a legendary floats above the card:
   real soul_pos art is a partially transparent sprite, not a second full card. */
{
  const TW = 142; const TH = 190
  const sheet = jokerSheet
  // wipe cell (0,1) first: the soul tile must be transparent where the sprite is not
  for (let y = 0; y < TH; y++) sheet.data.fill(0, ((1 * TH + y) * sheet.width) * 4, ((1 * TH + y) * sheet.width + TW) * 4)
  const soul = png.crop(jokers, 30, 24, TW - 60, TH - 48)
  const dx = 30; const dy = 24
  for (let y = 0; y < soul.height; y++) {
    soul.data.copy(sheet.data, (((1 * TH + dy + y) * sheet.width) + dx) * 4, y * soul.width * 4, (y + 1) * soul.width * 4)
  }
}

/* ------------------------------------------------------------------- files */
const files = {}
const put = (p, data) => { files[p] = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8') }

put('TestMod/manifest.json', JSON.stringify({
  id: 'testmod',
  name: 'TestMod',
  display_name: '测试 Mod',
  author: 'Mocha',
  description: 'importer smoke test',
  prefix: 'tm',
  main_file: 'TestMod.lua',
  version: '1.2.3',
  version_number: '1.2.3',
  priority: 0,
}, null, 2))

put('TestMod/assets/2x/ModJokers.png', png.encode(jokerSheet))
put('TestMod/assets/1x/ModNotes.png', png.encode(noteSheet))
put('TestMod/assets/2x/Unused.png', png.encode(half(jokerSheet)))  // never referenced

put('TestMod/TestMod.lua', `-- TestMod: exercises every declaration kind the importer understands
SMODS.Atlas {
    key = 'mod_jokers',
    path = 'ModJokers.png',
    px = 71,
    py = 95,
}

SMODS.Atlas {
    key = 'mod_notes',
    path = 'ModNotes.png',
    px = 71,
    py = 95,
}

-- a whole new card type with its own collection tab
SMODS.ConsumableType {
    key = 'Musical',
    primary_colour = HEX('ff5f55'),
    secondary_colour = HEX('4bc292'),
    collection_rows = { 5, 5 },
}

SMODS.Joker {
    key = 'alpha',
    atlas = 'mod_jokers',
    pos = { x = 0, y = 0 },
    rarity = 2,
    cost = 5,
    config = { extra = { mult = 10 } },
    effect = 'Gains Mult',
    loc_txt = { name = 'Alpha Joker', text = { 'inline loc_txt works' } },
}

SMODS.Joker {
    key = 'beta',
    atlas = 'mod_jokers',
    pos = { x = 1, y = 0 },
    soul_pos = { x = 0, y = 1 },
    rarity = 4,
    cost = 20,
}

SMODS.Joker {
    key = 'gamma',
    rarity = 1,
    cost = 4,
}

SMODS.Consumable {
    key = 'note_a',
    set = 'Musical',
    atlas = 'mod_notes',
    pos = { x = 0, y = 0 },
    cost = 3,
}

SMODS.Consumable {
    key = 'note_b',
    set = 'Musical',
    atlas = 'tm_mod_notes',
    pos = { x = 1, y = 0 },
    cost = 4,
}

SMODS.Consumable {
    key = 'note_bad',
    set = 'Musical',
    atlas = 'mod_notes',
    pos = { x = 9, y = 9 },
    cost = 4,
}

SMODS.Voucher {
    key = 'ticket',
    atlas = 'mod_notes',
    pos = { x = 0, y = 1 },
    cost = 10,
}

SMODS.Booster {
    key = 'note_pack',
    atlas = 'mod_notes',
    pos = { x = 1, y = 1 },
    cost = 4,
    weight = 1,
    kind = 'musical_pack',
}

SMODS.Back {
    key = 'musical_deck',
    atlas = 'mod_notes',
    pos = { x = 0, y = 1 },
}

SMODS.Blind {
    key = 'encore',
    atlas = 'blind_chips',
    pos = { x = 0, y = 2 },
    boss = { min_ante = 3 },
    dollars = 5,
    mult = 2,
}

SMODS.Tag {
    key = 'refrain',
    atlas = 'tags',
    pos = { x = 1, y = 1 },
}

SMODS.Enhancement {
    key = 'sharp',
    atlas = 'centers',
    pos = { x = 6, y = 4 },
}

SMODS.Sticker {
    key = 'tuned',
    atlas = 'stickers',
    pos = { x = 2, y = 1 },
    badge_colour = HEX('4bc292'),
}
`)

// a second file, to prove every .lua in the pack is scanned
put('TestMod/src/extra.lua', `SMODS.Joker {
    key = 'delta',
    atlas = 'mod_jokers',
    pos = { x = 1, y = 1 },
    rarity = 1,
    cost = 6,
}
`)

put('TestMod/localization/en-us.lua', `return {
    descriptions = {
        Joker = {
            j_tm_alpha = { name = 'Alpha Joker', text = { 'Gains {C:mult}+#1#{} Mult', '{C:inactive}(currently {C:mult}#2#{C:inactive})' } },
            j_tm_beta = { name = 'Beta Joker', text = { 'The fifth legendary test card' } },
            j_tm_gamma = { name = 'Gamma Joker', text = { 'Declares no atlas at all' } },
            j_tm_delta = { name = 'Delta Joker', text = { 'Declared in src/extra.lua' } },
        },
        Musical = {
            c_tm_note_a = { name = 'Note A', text = { 'Creates a {C:attention}Note{}' } },
            c_tm_note_b = { name = 'Note B', text = { 'Creates two {C:attention}Notes{}' } },
            c_tm_note_bad = { name = 'Note Bad', text = { 'Its pos is off the sheet' } },
        },
        Voucher = { v_tm_ticket = { name = 'Ticket', text = { '+1 hand per round' } } },
        Booster = { p_tm_note_pack = { name = 'Note Pack', text = { 'Choose {C:attention}1{} of {C:attention}3{}' } } },
        Back = { b_tm_musical_deck = { name = 'Musical Deck', text = { 'Start with a Note' } } },
        Blind = { bl_tm_encore = { name = 'Encore', text = { 'Boss blind: notes repeat' } } },
        Tag = { tag_tm_refrain = { name = 'Refrain', text = { 'Free reroll' } } },
        Enhanced = { m_tm_sharp = { name = 'Sharp Card', text = { '+30 Chips' } } },
        Other = { tm_tuned = { name = 'Tuned', text = { 'Sticker test' } } },
    },
}
`)

put('TestMod/localization/zh_CN.lua', `return {
    descriptions = {
        Joker = {
            j_tm_alpha = { name = '阿尔法小丑', text = { '获得 {C:mult}+#1#{} 倍率' } },
            j_tm_beta = { name = '贝塔小丑', text = { '第五张传说测试卡' } },
            j_tm_gamma = { name = '伽马小丑', text = { '完全没有声明图集' } },
            j_tm_delta = { name = '德尔塔小丑', text = { '在 src/extra.lua 里声明' } },
        },
        Musical = {
            c_tm_note_a = { name = '音符 A', text = { '创造一张{C:attention}音符{}' } },
            c_tm_note_b = { name = '音符 B', text = { '创造两张{C:attention}音符{}' } },
            c_tm_note_bad = { name = '坏音符', text = { '它的 pos 超出了图集' } },
        },
        Voucher = { v_tm_ticket = { name = '门票', text = { '每回合 +1 出牌次数' } } },
        Booster = { p_tm_note_pack = { name = '音符包', text = { '三选{C:attention}一{}' } } },
        Back = { b_tm_musical_deck = { name = '乐章牌组', text = { '开局带一张音符' } } },
        Blind = { bl_tm_encore = { name = '安可', text = { 'Boss 盲注：音符会重复' } } },
        Tag = { tag_tm_refrain = { name = '副歌', text = { '免费重掷' } } },
        Enhanced = { m_tm_sharp = { name = '锋利牌', text = { '+30 筹码' } } },
        Other = { tm_tuned = { name = '调音', text = { '贴纸测试' } } },
    },
}
`)

put('TestMod/README.md', 'A synthetic mod used to test Balatro 素材图鉴\'s importer.\n')
put('TestMod/notes.txt', 'not lua, not json, should be ignored\n')

/* --------------------------------------------------------------- to disk */
for (const p of Object.keys(files)) {
  const full = path.join(OUT, p)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, files[p])
}

/* -------------------------------------------------------------- zip (store) */
function crc32 (buf) {
  let c; const T = []
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0 }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = T[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function zipStore (entries) {
  const locals = []; const centrals = []; let off = 0
  for (const [name, data] of entries) {
    const nb = Buffer.from(name, 'utf8'); const crc = crc32(data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8)
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26)
    locals.push(lh, nb, data)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8)
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28)
    ch.writeUInt32LE(off, 42)
    centrals.push(ch, nb)
    off += 30 + nb.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16)
  return Buffer.concat([...locals, cd, eocd])
}
const zip = zipStore(Object.keys(files).map((p) => [p, files[p]]))
fs.writeFileSync(path.join(__dirname, 'testmod.zip'), zip)

/* ------------------------------------------------------------- test payload */
const folder = {}
for (const p of Object.keys(files)) folder[p] = files[p].toString('base64')
fs.writeFileSync(path.join(__dirname, 'testmod.json'), JSON.stringify({ folder, zip: zip.toString('base64') }))

console.log('files      :', Object.keys(files).length)
console.log('folder     :', OUT)
console.log('zip        :', path.join(__dirname, 'testmod.zip'), (zip.length / 1024).toFixed(1) + ' KB')
console.log('joker sheet:', jokerSheet.width + 'x' + jokerSheet.height, '| note sheet:', noteSheet.width + 'x' + noteSheet.height)
console.log('payload    :', ((fs.statSync(path.join(__dirname, 'testmod.json')).size) / 1024).toFixed(1) + ' KB')
