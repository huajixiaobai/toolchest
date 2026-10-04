/* 第六十轮：按原版数据的真实形状修盲注映射 + 用上 raw.effect
   上轮 dump 到的真实形状（小盲注 bl_small）：
     raw = { name:"Small Blind", defeated:false, order:1, dollars:3, mult:1, vars:{}, debuff_text:"", debuff:{}, pos:{...} }
   —— 数字在 raw.dollars / raw.mult，削弱内容在 raw.debuff；小盲注本来就没有 boss 区间（只有 BOSS 盲注有），
   所以读不到就不写（留默认），并在提示里说明。另外原版 raw.effect 是"效果名"（如 Mult、Disable Blind Effect），
   拿来做诚实的说明，而不是假装我们知道它的逻辑。 */
const fs = require('fs')
const path = require('path')
let n = 0
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}
rep(
  "    if (typeof cfgx.mult === 'number') t2.blind_mult = cfgx.mult;\n    if (typeof cfgx.dollars === 'number') t2.blind_dollars = cfgx.dollars;\n    const db = (it.config && it.config.debuff) || rawx.debuff || {};",
  "    /* 实测：数字在 raw.mult / raw.dollars（不是 config），削弱在 raw.debuff；BOSS 盲注才可能有 boss 区间 */\n    if (typeof rawx.mult === 'number') t2.blind_mult = rawx.mult;\n    else if (typeof cfgx.mult === 'number') t2.blind_mult = cfgx.mult;\n    if (typeof rawx.dollars === 'number') t2.blind_dollars = rawx.dollars;\n    else if (typeof cfgx.dollars === 'number') t2.blind_dollars = cfgx.dollars;\n    const db = rawx.debuff || (it.config && it.config.debuff) || {};",
  '盲注按真实形状取值'
)
rep(
  "      if (typeof v === 'number') t2[(k === 'joker_slots' ? 'joker_slot' : k)] = v;",
  "      if (typeof v === 'number') t2[(k === 'joker_slots' ? 'joker_slot' : k)] = v;",
  '（牌组映射保持不变）'
)
rep(
  '  const tCount = Object.keys(t2).length;',
  "  /* 原版给的「效果名」（Mult / Disable Blind Effect…）：它的逻辑在游戏源码里是代码，这里只把名字带上，\n     界面上如实说明，不假装我们已经实现了它 */\n  if (rawx.effect && typeof rawx.effect === 'string') t2.effect = rawx.effect;\n  const tCount = Object.keys(t2).length;",
  '带上原版效果名'
)
rep(
  "  return { effects: effects.length, tKeys: tCount };",
  "  return { effects: effects.length, tKeys: tCount, effectName: (rawx.effect && typeof rawx.effect === 'string') ? rawx.effect : '' };",
  '返回里带上效果名'
)
rep(
  "status('已照「' + nm(mate, 'zh_CN') + '」做了一份：图、名字、原文、数值都进来了（' + rr2.effects + ' 条效果 / ' + rr2.tKeys + ' 项专属设置）' + (rr2.effects ? '' : '，这张牌的效果没法自动拆成数值，请在「它做什么」里挑一条') + ' —— 想只换图就按住 Shift 点同一格。', 'ok');",
  "status('已照「' + nm(mate, 'zh_CN') + '」做了一份：图、名字、原文、数值都进来了（' + rr2.effects + ' 条效果 / ' + rr2.tKeys + ' 项专属设置）' + (rr2.effectName ? '；原版的效果名是「' + rr2.effectName + '」，但它的具体逻辑在游戏源码里是代码，这里只能给你名字和数值，剩下的在「它做什么」里自己配' : '') + (rr2.effects ? '' : '（另外这张牌没有可拆的数值，请在「它做什么」里挑一条效果）') + ' —— 想只换图就按住 Shift 点同一格。', 'ok');",
  '格子提示如实说明效果名'
)
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const must = ['rawx.mult', 'rawx.dollars', 'rawx.debuff', "t2.effect = rawx.effect", 'effectName:']
const miss = must.filter((m) => b.indexOf(m) < 0)
console.log(miss.length ? '  ❌ 写回后找不到：' + miss.join(' | ') : '  ✓ 写回校验：' + must.length + ' 个标识都在')
