/* ============================================================================
 * gen-state.js — 把「原版计分到底读了哪些状态」逆出来。
 *
 * 目的：得分计算器里有两类东西以前只能手填或干脆不算：
 *   ① 小丑牌自己的累计值（记录型）：self.ability.mult / self.ability.x_mult /
 *      self.ability.extra.chips …（每用一张塔罗牌 +1 倍率那种）
 *   ② 局面状态：剩余出牌次数、弃牌次数、牌堆剩几张、已用塔罗牌张数、
 *      某个牌型打过几次、手里还有多少钱 …
 * 这个脚本把两类的字段名从游戏源码里挖出来，写成 .work/out/joker-state.json，
 * 供 app.js 生成对应的输入框（.work/gen-rules.js 负责规则，这个负责状态）。
 *
 * 用法： node .work/gen-state.js
 * ==========================================================================*/
'use strict'
const fs = require('fs')
const path = require('path')

const LOVE = path.join(__dirname, 'love')
const OUT = path.join(__dirname, 'out', 'joker-state.json')

/** 递归收集所有 .lua（游戏源码本身不大，全扫一遍最稳） */
function luaFiles (dir, acc) {
  acc = acc || []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) luaFiles(p, acc)
    else if (/\.lua$/i.test(e.name)) acc.push(p)
  }
  return acc
}

/* 只看跟计分/状态有关的文件，别的（本地化、着色器）没必要扫 */
const SKIP = /localization[\\/]|resources[\\/]/
const files = luaFiles(LOVE).filter((f) => !SKIP.test(f))

const MUTABLE = /self\.ability\.([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*(?:=[^=]|\+=|-=)/g
const READ_SELF = /self\.ability\.([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)/g
const READ_EXT = /(?:#\s*)?(G\.GAME(?:\.[A-Za-z_][\w]*(?:\[[^\]]+\])?)+|#?\s*G\.(?:deck|playing_cards|consumeables|hand|jokers)\b|G\.GAME\.hands\[[^\]]+\]\.\w+)/g

const out = {}
let blocks = 0

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split(/\r?\n/)
  const rel = path.relative(LOVE, file).replace(/\\/g, '/')
  lines.forEach((line, i) => {
    const m = /self\.ability\.name\s*==\s*['"]([^'"]+)['"]/.exec(line)
    if (!m) return
    const name = m[1]
    blocks++
    const rec = out[name] || (out[name] = { fields: [], mutable: [], external: [], files: {} })
    rec.files[rel] = (rec.files[rel] || 0) + 1
    /* 这一块的范围：到下一个 self.ability.name == 或者最多 45 行（规则块都很短） */
    let end = Math.min(lines.length, i + 45)
    for (let k = i + 1; k < end; k++) {
      if (/self\.ability\.name\s*==/.test(lines[k])) { end = k; break }
    }
    const chunk = lines.slice(i, end).join('\n')
    for (const mm of chunk.matchAll(MUTABLE)) {
      const f = mm[1]
      if (!rec.mutable.includes(f)) rec.mutable.push(f)
    }
    for (const mm of chunk.matchAll(READ_SELF)) {
      const f = mm[1]
      if (!rec.fields.includes(f)) rec.fields.push(f)
    }
    for (const mm of chunk.matchAll(READ_EXT)) {
      const f = mm[1].replace(/\s+/g, '')
      if (!rec.external.includes(f)) rec.external.push(f)
    }
  })
}

/* 只留下「有可变字段」或「读外部状态」的小丑牌 —— 其余不需要输入 */

/* 这些不是"记录值"，是贴纸/兼容性标记，别做成输入框 */
const NOT_A_COUNTER = new Set([
  'eternal', 'perishable', 'rental', 'blueprint_compat', 'blueprint_compat_check', 'blueprint_compat_ui',
  'queue_negative_removal', 'vampired', 'debuff', 'h_size', 'wheel_flipped',
])

const interesting = {}
for (const [name, rec] of Object.entries(out)) {
  const mut = rec.mutable.filter((f) => !NOT_A_COUNTER.has(f))
  const ext = rec.external.filter((f) => !/probabilities|dollar_buffer|consumeable_buffer|joker_buffer/.test(f))
  if (!mut.length && !ext.length) continue
  interesting[name] = {
    mutable: mut.slice().sort(),
    external: [...new Set(ext)].sort(),
    files: rec.files,
  }
}

/* 所有小丑牌用到的可变字段（合起来给引擎做"没填过按 0"的兜底） */
const allMutable = [...new Set(Object.values(interesting).flatMap((r) => r.mutable))].sort()
/* 所有外部状态（给局面面板用） */
const allExternal = [...new Set(Object.values(interesting).flatMap((r) => r.external))].sort()

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify({ source: 'card.lua 等（.work/gen-state.js 生成，勿手改）', jokers: interesting }, null, 1))

console.log('扫了', files.length, '个 lua 文件，命中', blocks, '个 self.ability.name == 的块')
console.log('有状态输入的小丑牌:', Object.keys(interesting).length, '/', Object.keys(out).length)
console.log('\n写入', OUT)
console.log('\n—— 可变字段（记录型，逐个列一下）——')
for (const [name, rec] of Object.entries(interesting)) {
  if (rec.mutable.length) console.log('  ' + name.padEnd(22) + rec.mutable.join(', '))
}
console.log('\n—— 读外部状态的（局面要能改）——')
const ext = {}
for (const [name, rec] of Object.entries(interesting)) {
  for (const e of rec.external) (ext[e] = ext[e] || []).push(name)
}
for (const [e, list] of Object.entries(ext).sort((a, b) => b[1].length - a[1].length)) {
  console.log('  ' + e.padEnd(44) + list.length + ' 张：' + list.slice(0, 4).join('、') + (list.length > 4 ? ' …' : ''))
}

/* ---- 把状态表注进 app.js 的标记块（单文件版与站点版都拿得到） ---- */
const APP = path.join(__dirname, 'app.js')
const BEGIN = '/* __JOKER_STATE_BEGIN__ */'
const END = '/* __JOKER_STATE_END__ */'
const payload = {
  source: 'card.lua 等（.work/gen-state.js 生成，勿手改）',
  jokers: interesting,
  mutable: allMutable,
  external: allExternal,
}
const block = BEGIN + '\n' +
  '/* 每个小丑牌自己的"记录值"字段（每用一张塔罗牌 +1 倍率那种）与它读到的局面状态；\n' +
  '   由 .work/gen-state.js 从游戏源码里扫出来，界面据此生成输入框。 */\n' +
  'const JOKER_STATE = ' + JSON.stringify(payload) + ';\n' +
  'const MUTABLE_FIELDS = new Set(JOKER_STATE.mutable);\n' + END

let app = fs.readFileSync(APP, 'utf8')
const b = app.indexOf(BEGIN)
const e = app.indexOf(END)
if (b >= 0 && e > b) {
  app = app.slice(0, b) + block + app.slice(e + END.length)
} else {
  const m = /^(\(function \(\) \{\n)/m.exec(app)
  if (!m) { console.error('❌ 找不到 app.js 的插入点'); process.exit(1) }
  app = app.replace(m[1], m[1] + block + '\n')
}
fs.writeFileSync(APP, app)
console.log('\n注入 app.js：' + Object.keys(interesting).length + ' 张有记录值的小丑牌 / ' +
  allMutable.length + ' 个可变字段 / ' + allExternal.length + ' 个局面字段，块大小 ' +
  (block.length / 1024).toFixed(1) + ' KB')
