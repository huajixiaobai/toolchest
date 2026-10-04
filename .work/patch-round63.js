/* 第六十三轮：③ 补消耗品字段组（唯一真缺的一组）+ 接进 Lua
   现状核对：Seal 那条**不是缺口**（它本来就是一句说明「蜡封没有数值字段，效果取决于玩家拿它做什么」），
   Consumable 才是整组缺失 —— 所以星球/塔罗只有 set/效果/数值三个控件，没法表达"要选几张牌""升级哪个牌型"。
   这一轮加上并接进 SMODS.Consumable 的生成（含星球真正升级牌型）。 */
const fs = require('fs')
const path = require('path')
let n = 0
const L = (...a) => a.join('\n')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}

/* ① 字段组 */
rep(
  "  Seal: [['seal_note', '蜡封没有数值字段 —— 它的效果由玩家拿它做什么决定', 'text', '']],",
  L("  Consumable: [['max_highlighted', '最多选几张牌', 'num', 1], ['min_highlighted', '至少选几张牌', 'num', 0],",
    "    ['hand_type', '升级哪个牌型（星球牌用）', 'sel', [['', '不升级'], ['High Card', '高牌'], ['Pair', '对子'], ['Two Pair', '两对'],",
    "      ['Three of a Kind', '三条'], ['Straight', '顺子'], ['Flush', '同花'], ['Full House', '葫芦'], ['Four of a Kind', '四条'],",
    "      ['Straight Flush', '同花顺'], ['Five of a Kind', '五条'], ['Flush House', '同花葫芦'], ['Flush Five', '同花五条']]]],",
    "  Seal: [['seal_note', '蜡封没有数值字段 —— 它的效果由玩家拿它做什么决定', 'text', '']],"),
  '消耗品字段组'
)

/* ② 接进 Lua：config 带上选牌数/牌型；can_use 按范围；use 里星球真的升级牌型 */
rep(
  "    L.push('    config = { extra = { value = ' + (Number(MK.useVal) || 0) + ' } },');",
  L('    const mh2 = Number(MK.t.max_highlighted || 1) || 1;',
    '    const nh2 = Number(MK.t.min_highlighted || 0) || 0;',
    '    const planetHand = (MK.set === \'Planet\' && MK.t.hand_type) ? MK.t.hand_type : \'\';',
    "    const cfgBits = [];",
    "    if (mh2 > 0) cfgBits.push('max_highlighted = ' + mh2);",
    "    if (nh2 > 0) cfgBits.push('min_highlighted = ' + nh2);",
    "    if (planetHand) cfgBits.push(\"hand_type = '\" + planetHand + \"'\");",
    "    cfgBits.push('extra = { value = ' + (Number(MK.useVal) || 0) + ' }');",
    "    L.push('    config = { ' + cfgBits.join(', ') + ' },');"),
  'config 带上选牌数与牌型'
)
rep(
  "    L.push('    can_use = function(self, card) return true end,');",
  "    L.push('    can_use = function(self, card) return #G.hand.highlighted >= ' + nh2 + ' and #G.hand.highlighted <= ' + mh2 + ' end,');",
  'can_use 按选牌范围'
)
rep(
  "    if (MK.useKind === 'dollars') L.push('        ease_dollars(' + (Number(MK.useVal) || 0) + ')');",
  L("    if (planetHand) L.push(\"        local h = G.GAME.hands['\" + planetHand + \"']; if h then h.level = h.level + 1; update_hand_text({ immediate = true }, { level = h.level, mult = h.mult, chips = h.chips }) end\");",
    "    else if (MK.useKind === 'dollars') L.push('        ease_dollars(' + (Number(MK.useVal) || 0) + ')');"),
  '星球真的升级牌型'
)
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const must = ['Consumable: [[\'max_highlighted\'', 'planetHand', 'cfgBits', 'can_use = function(self, card) return #G.hand.highlighted >=']
const miss = must.filter((m) => b.indexOf(m) < 0)
console.log(miss.length ? '  ❌ 写回后找不到：' + miss.join(' | ') : '  ✓ 写回校验：' + must.length + ' 个标识都在')
