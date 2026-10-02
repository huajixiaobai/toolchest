/* 抽 loc_vars：每个小丑牌的描述里 #1# #2# … 各对应哪个值（原版写在 card.lua 的 loc_vars 里）。
 *  输出 JOKER_LOCVARS = { 'Ancient Joker': ['self.ability.extra', 'G.GAME.current_round.ancient_card.suit'], … }
 *  有了它，界面就能把描述原文里的占位符换成对应的控件。
 * 用法： node .work/gen-locvars.js
 */
'use strict'
const fs = require('fs')
const path = require('path')
const CARD = path.join(__dirname, 'love', 'card.lua')
const APP = path.join(__dirname, 'app.js')
const OUT = path.join(__dirname, 'out', 'joker-locvars.json')

const src = fs.readFileSync(CARD, 'utf8')
const lines = src.split(/\r?\n/)
const map = {}
let hits = 0

/** 从 i 行开始找 loc_vars = { … }（括号配平），返回里面的表达式数组 */
function grabLocVars (i) {
  let depth = 0
  let started = false
  let buf = ''
  for (let k = i; k < Math.min(lines.length, i + 14); k++) {
    const s = lines[k]
    for (let c = 0; c < s.length; c++) {
      const ch = s[c]
      if (ch === '{') { depth++; started = true }
      else if (ch === '}') { depth-- }
      if (started) buf += ch
      if (started && depth === 0) return buf
    }
    buf += '\n'
  }
  return null
}

/** 顶层逗号切分（忽略括号内的逗号） */
function splitTop (s) {
  const body = s.replace(/^\{/, '').replace(/\}$/, '')
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of body) {
    if (ch === '{' || ch === '(') depth++
    else if (ch === '}' || ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter(Boolean)
}

for (let i = 0; i < lines.length; i++) {
  const m = /self\.ability\.name\s*==\s*['"]([^'"]+)['"]/.exec(lines[i])
  if (!m) continue
  const next = lines.slice(i, i + 3).join(' ')
  if (!/loc_vars\s*=/.test(next)) continue
  const idx = lines.findIndex((l, k) => k >= i && k < i + 3 && /loc_vars\s*=/.test(l))
  if (idx < 0) continue
  const afterEq = lines[idx].slice(lines[idx].indexOf('loc_vars'))
  const braceAt = afterEq.indexOf('{')
  if (braceAt < 0) continue
  const grab = grabLocVars(idx)
  if (!grab) continue
  const parts = splitTop(grab)
  if (!parts.length) continue
  /* 只保留"来源表达式"（去掉 localize(...) 之类包一层名字的写法，取里面的第一个参数） */
  /* localize(a, cat) 只取第一个参数；带 = 的是具名字段（colours=…），不是 #N# 的值，丢掉 */
  const exprs = parts.filter((s) => !/^[A-Za-z_]+\s*=/.test(s)).map((s) => {
    const loc = /^localize\(([^)]*)\)/.exec(s)
    if (loc) return loc[1].trim()
    return s
  })
  if (!map[m[1]] || exprs.length > map[m[1]].length) { map[m[1]] = exprs; hits++ }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify({ source: 'card.lua loc_vars（.work/gen-locvars.js 生成）', jokers: map }, null, 1))
console.log('抽到', Object.keys(map).length, '张牌的 loc_vars（命中', hits, '处）')
for (const k of ['Ancient Joker', 'The Idol', 'Castle', 'Steel Joker', 'Stone Joker', 'Ride the Bus', 'Hologram']) {
  if (map[k]) console.log('  ' + k.padEnd(16) + JSON.stringify(map[k]))
}

/* 注入 app.js */
const BEGIN = '/* __JOKER_LOCVARS_BEGIN__ */'
const END = '/* __JOKER_LOCVARS_END__ */'
const block = BEGIN + '\nconst JOKER_LOCVARS = ' + JSON.stringify(map) + ';\n' + END
let app = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n')
if (app.includes(BEGIN)) {
  app = app.replace(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), function () { return block })
} else {
  const anchor = '/* __JOKER_STATE_END__ */'
  app = app.replace(anchor, anchor + '\n\n' + block)
}
fs.writeFileSync(APP, app)
console.log('注入 app.js 完成；块大小', (block.length / 1024).toFixed(1) + ' KB')
