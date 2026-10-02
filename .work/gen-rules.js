/* ============================================================================
 * gen-rules.js — 从游戏自己的 card.lua 里抽出「小丑牌在计分时做什么」。
 *
 *   node gen-rules.js      → .work/out/joker-rules.json
 *
 * Card:calculate_joker 是一条大的 if/elseif 上下文链，和计分有关的是四段：
 *   individual   每张被打出的牌结算时（贪吃鬼、斐波那契、学者…）
 *   repetition   重复触发（悬挂的乍得、袜子与巴金斯、哑剧、黄昏…）
 *   other_joker  影响别的小丑（蓝图、头脑风暴）
 *   main         主结算（最后那个 else：+mult/+chips/×mult 类）
 * 这里把四段里能结构化的规则抽出来，剩下的交给计算器标注"需手动"。
 * ==========================================================================*/
'use strict'
const fs = require('fs')
const path = require('path')
const HERE = __dirname
const SRC = path.join(HERE, 'love', 'card.lua')
const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/)

const indentOf = (s) => (s.match(/^\s*/) || [''])[0].length

/** 找一段区间：从匹配 anchorRe 的行开始，到同缩进的 end 或下一个同缩进的 elseif 为止 */
function regionOf (anchorRe, minLine) {
  const anchor = lines.findIndex((l, i) => i > minLine && anchorRe.test(l))
  if (anchor < 0) return null
  const indent = indentOf(lines[anchor])
  let end = -1
  for (let i = anchor + 1; i < lines.length; i++) {
    if (indentOf(lines[i]) === indent && /^\s*end\s*$/.test(lines[i])) { end = i; break }
    if (indentOf(lines[i]) === indent && /^\s*elseif\s/.test(lines[i])) { end = i - 1; break }
  }
  return end < 0 ? null : { start: anchor, end, lines: lines.slice(anchor, end + 1) }
}

/** 从一段里抽通用配置规则 + 具名分支 */
function scan (region, label) {
  const generic = []
  const named = []

  for (let i = 0; i < region.lines.length; i++) {
    const l = region.lines[i]
    const at = region.start + i + 1
    if (/self\.ability\.x_mult > 1/.test(l)) generic.push({ kind: 'x_mult', expr: 'x_mult', line: at, region: label })
    else if (/self\.ability\.t_mult > 0/.test(l)) generic.push({ kind: 't_mult', expr: 't_mult', line: at, region: label })
    else if (/self\.ability\.t_chips > 0/.test(l)) generic.push({ kind: 't_chips', expr: 't_chips', line: at, region: label })

    /* 具名分支：条件经常跨行（`if ... and` 换行写 `then`），所以先收集到 then 为止 */
    const m = /^(\s*)if self\.ability\.name == '([^']+)'/.exec(l)
    if (!m) continue
    const indent = m[1].length
    const names = [m[2]]
    let condText = ''
    let k = i
    let guard = 0
    while (guard++ < 12) {
      condText += ' ' + region.lines[k]
      if (/\bthen\b/.test(region.lines[k])) break
      k++
      if (k >= region.lines.length) break
    }
    /* 同一行里的其他候选名字：or self.ability.name == 'X' */
    for (const mm of condText.matchAll(/self\.ability\.name == '([^']+)'/g)) if (!names.includes(mm[1])) names.push(mm[1])
    const condTail = condText
      .replace(/^[\s\S]*?'[^']*'/, '')      // 去掉到第一个名字为止
      .replace(/\bthen\b[\s\S]*$/, '')      // 去掉 then 之后
      .replace(/^\s*and\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()

    /* 正文：从 then 那一行的下一行开始，到同缩进的 end */
    let bodyStart = k + 1
    let bodyEnd = -1
    for (let j = bodyStart; j < region.lines.length; j++) {
      if (indentOf(region.lines[j]) === indent && /^\s*end\s*$/.test(region.lines[j])) { bodyEnd = j; break }
    }
    const body = region.lines.slice(bodyStart, bodyEnd < 0 ? Math.min(bodyStart + 45, region.lines.length) : bodyEnd)

    const effects = []
    const reps = []
    for (const b of body) {
      /* main 区用 mult_mod/chip_mod/Xmult_mod；individual 区用 chips/mult/x_mult */
      const eff = /(mult_mod|chip_mod|Xmult_mod|chips|mult|x_mult)\s*[=:]\s*([^,}]+)/.exec(b)
      if (eff) effects.push({ field: eff[1], expr: eff[2].trim() })
      const rp = /repetitions\s*=\s*([^,}]+)/.exec(b)
      if (rp) reps.push(rp[1].trim())
    }
    const uses = (re) => body.filter((b) => re.test(b)).length
    const n = {
      name: names[0],
      alsoNames: names.slice(1),
      region: label,
      line: at,
      cond: condTail,
      effects: effects.slice(0, 4),
      reps,
      loops: uses(/\bfor\b|\bwhile\b/),
      ggame: uses(/G\.GAME\./),
      cards: uses(/other_card|is_suit|get_id|is_face/) + (/other_card|is_suit|get_id|is_face/.test(condTail) ? 1 : 0),
      cfg: uses(/self\.ability\.(extra|mult|chips|x_mult|type|t_mult|t_chips|stone_tally|steel_tally)/),
    }
    if (reps.length) n.auto = 'repeat'
    else if (!effects.length) n.auto = 'no-effect'
    else if (n.loops || n.ggame) n.auto = 'manual'
    else if (n.cards) n.auto = 'by-card'
    else n.auto = 'yes'
    named.push(n)
  }
  return { generic, named }
}

const REGIONS = {
  individual: regionOf(/elseif context\.individual then/, 2900),
  repetition: regionOf(/elseif context\.repetition then/, 3000),
  other_joker: regionOf(/elseif context\.other_joker then/, 3300),
  main: regionOf(/^\s{16}else\s*$/, 3400),
}

const out = { source: 'card.lua Card:calculate_joker', regions: {}, generic: [], named: [] }
for (const [k, v] of Object.entries(REGIONS)) {
  if (!v) { console.log((k + ':').padEnd(13) + '没找到'); continue }
  console.log((k + ':').padEnd(13) + '行 ' + (v.start + 1) + ' ~ ' + (v.end + 1) + '（' + (v.end - v.start + 1) + ' 行）')
  out.regions[k] = [v.start + 1, v.end + 1]
  const s = scan(v, k)
  out.generic.push(...s.generic)
  out.named.push(...s.named)
}

const byAuto = {}
for (const n of out.named) byAuto[n.auto] = (byAuto[n.auto] || 0) + 1
console.log('\n通用配置规则 ' + out.generic.length + ' 条：' + out.generic.map((g) => g.kind + '@' + g.region).join(', '))
console.log('具名分支 ' + out.named.length + ' 条：' + JSON.stringify(byAuto))
for (const a of ['repeat', 'by-card', 'yes', 'manual', 'no-effect']) {
  console.log('\n== ' + a + ' ==')
  out.named.filter((n) => n.auto === a).forEach((n) => {
    console.log('  [' + n.region + '] ' + n.name.padEnd(20) +
      (n.reps.length ? ' reps=' + n.reps.join('|') : '') +
      '  ' + n.effects.map((e) => e.field + '=' + e.expr).join(', ') +
      (n.cond ? '   cond=' + n.cond.slice(0, 48) : ''))
  })
}

const OUT = path.join(HERE, 'out', 'joker-rules.json')
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
console.log('\n写出 ' + path.relative(path.join(HERE, '..'), OUT) + '  ' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB')

/* ---- 把规则注进 app.js 的标记块，所有构建（单文件/站点）都能拿到 ---- */
const APP = path.join(HERE, 'app.js')
const BEGIN = '/* __JOKER_RULES_BEGIN__ */'
const END = '/* __JOKER_RULES_END__ */'
/* 只保留会影响 chips/mult 的规则，并按名字去重（同一张牌在多个上下文里出现只留一份主结算的） */
const keep = new Map()
for (const n of out.named) {
  if (!n.effects.length && !n.reps.length) continue   // 重复触发类只有 reps、没有 effects
  const prev = keep.get(n.name)
  const better = !prev || (prev.region !== 'main' && n.region === 'main')
  if (better) keep.set(n.name, n)
}
/* 通用配置规则：能力字段驱动，不依赖名字 */
const generic = [
  { id: 'type_x_mult', when: 'x_mult>1', effect: 'x_mult' },
  { id: 'type_add_mult', when: 't_mult>0', effect: 't_mult' },
  { id: 'type_add_chips', when: 't_chips>0', effect: 't_chips' },
  { id: 'suit_add_mult', when: "effect=='Suit Mult'", effect: 'suit.s_mult', suit: 'suit.suit' },
]
const payload = {
  source: 'card.lua Card:calculate_joker（由 .work/gen-rules.js 生成，勿手改）',
  regions: out.regions,
  generic,
  rules: [...keep.values()].map((n) => ({
    n: n.name, k: n.auto, r: n.region, c: n.cond,
    e: n.effects.map((x) => x.field + '=' + x.expr),
    ...(n.reps.length ? { reps: n.reps[0] } : {}),
    ...(n.alsoNames && n.alsoNames.length ? { alias: n.alsoNames } : {}),
  })),
}
const block = BEGIN + '\n' +
  '/* 小丑牌在计分时的规则，从游戏自己的 card.lua 抽出来（.work/gen-rules.js）。\n' +
  '   k：yes=条件简单可自动 / by-card=按打出的每张牌判定 / repeat=增加重复次数 / manual=依赖运行时状态，需手填\n' +
  '   e：效果字段，chip_mod/mult_mod/Xmult_mod 是主结算，chips/mult/x_mult 是逐牌结算 */\n' +
  'const JOKER_RULES = ' + JSON.stringify(payload) + ';\n' + END
let app = fs.readFileSync(APP, 'utf8')
const b = app.indexOf(BEGIN)
const e = app.indexOf(END)
if (b >= 0 && e > b) {
  app = app.slice(0, b) + block + app.slice(e + END.length)
} else {
  /* 第一次：插到 IIFE 开头之后（app.js 的结构是 'use strict'; (function () { … */
  const m = /'use strict';\s*\n\(function\s*\(\)\s*\{\s*\n/.exec(app)
  if (!m) { console.error('❌ 找不到 app.js 的插入点'); process.exit(1) }
  const at = m.index + m[0].length
  app = app.slice(0, at) + '\n' + block + '\n' + app.slice(at)
}
fs.writeFileSync(APP, app)
console.log('注入 app.js：' + keep.size + ' 条具名规则 + ' + generic.length + ' 条通用规则，块大小 ' +
  (Buffer.byteLength(block) / 1024).toFixed(1) + ' KB')
