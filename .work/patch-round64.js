/* 第六十四轮：结构自检升级 —— 断言「该类型的专属 Lua 字段真的出现在产物里」
   之前只验到"改字段 → Lua 变了"，现在按类型断言具体片段（对着各类型 Lua 块的字段名写）
   + 补第 62、63 轮的记账。 */
const fs = require('fs')
const path = require('path')
let n = 0

/* ① cdp.js：按类型断言具体 Lua 片段 */
{
  const F = path.join(__dirname, 'verify', 'cdp.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const a = '    r.perTypeEditSummary=(r.perTypeEdit||[]).map(function(x){ return x.type+"."+x.key+(x.noInput?"(没有这个输入框)":(x.changed?" 改了":" 没变")+(x.inLua?" 进Lua":" 没进Lua")) }).join("  ||  ");'
  if (s.split(a).length - 1 !== 1) { console.error('❌ 锚点'); process.exit(1) }
  s = s.replace(a, () => [
    a,
    '    /* 按类型断言：克隆之后，该类型的专属字段真的出现在产物 Lua 里 */',
    '    r.typeLuaChecks=[];',
    '    const TLUA=[',
    '      ["Joker","Joker",["cost = 2","rarity = 1"]],',
    '      ["Consumable","Tarot",["max_highlighted = "] ],',
    '      ["Consumable","Planet",["hand_type = \'Pair\'","max_highlighted = "] ],',
    '      ["Booster","Booster",["kind = \'Arcana\'","choose = 1"]],',
    '      ["Blind","Blind",["mult = 1","dollars = 3"]],',
    '      ["Voucher","Voucher",["cost = 10"]]',
    '    ];',
    '    for (const c of TLUA) {',
    '      const ids=B.maker.itemsByCat(c[1]);',
    '      if(!ids.length){ r.typeLuaChecks.push({type:c[0],cat:c[1],noItems:true}); continue }',
    '      B.maker.select(0); B.maker.typeChip(c[0]); await __V.wait(220);',
    '      B.maker.applyClone(ids[0]); await __V.wait(400);',
    '      const lua=B.maker.lua();',
    '      const miss=c[2].filter(function(frag){ return lua.indexOf(frag)<0 });',
    '      r.typeLuaChecks.push({ type:c[0], cat:c[1], want:c[2].length, missing:miss });',
    '    }',
    '    r.typeLuaChecksSummary=(r.typeLuaChecks||[]).map(function(x){ return x.type+"/"+x.cat+(x.noItems?"(没有原版条目)":(x.missing.length?(" 缺:"+x.missing.join("+")):" 全在")) }).join("  ||  ");',
  ].join('\n'))
  fs.writeFileSync(F, s)
  console.log('  ✓ 场景加了 typeLuaChecks'); n++
}

/* ② DEVELOPMENT.md：第 62、63 轮 */
{
  const F = path.join(__dirname, '..', 'DEVELOPMENT.md')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const anchor = '**第六十一轮（补账 + ②的验证跑通：八种类型都带上专属内容了）**'
  if (s.split(anchor).length - 1 !== 1) { console.error('❌ 记录锚点'); process.exit(1) }
  const E = [
    '**第六十三轮（③：补上消耗品整组字段，并把星球牌做成真的能升级牌型）**',
    '- 核对后确认：**蜡封那条不是缺口**（它本来就写着「蜡封没有数值字段 —— 它的效果由玩家拿它做什么决定」），**消耗品才是整组缺失**。',
    '- 新增消耗品字段组：**最多/至少选几张牌**（写进 `config = { max_highlighted, min_highlighted }`，`can_use` 也按这个范围判定）、**升级哪个牌型**（13 种牌型下拉，写进 `config.hand_type`）。',
    '- 星球牌现在**真的会升级牌型**：`use` 里 `G.GAME.hands[牌型].level = level + 1` 并刷新界面上的数值 —— 之前只是"给一张星球牌"，语义完全不同。',
    '- 实测：`perTypeEditSummary` 里消耗品由「没有这个输入框」变成「改了 进Lua」，十种类型全绿；`mkTypes` 的 `allOk/jokerOk` 无回归。',
    '- 同时纠正了一条我自己的误判：蜡封字段是 `text` 类型、渲染成 `<span>` 而不是 `[data-mkt]` 输入框，所以断言 `sealFieldIsText` 是 false —— **又是我的断言写错，不是功能缺**。',
    '',
    '**第六十二轮（纠正一个错误结论：优惠券不是缺口）**',
    '- 上一轮我说「优惠券 `voucher_val` 改了没进 Lua」，是**错的**：它一直会写，只是要先把「效果」(`voucher_kind`) 选成用得上数值的那种（如"立刻给钱"）。我上轮只填了数字没选效果 —— **测试没走完整路径**。',
    '- 修正后把"改专属字段 → Lua 跟不跟"的扫描扩到全部十种类型，结论：盲注/补充包/牌组/优惠券/标签/强化/版本/消耗品 **全部通过**；蜡封（设计如此）与小丑（另一套 `data-mk` 命名，单独验）不算缺口。',
    '',
  ].join('\n')
  s = s.replace(anchor, () => E + anchor)
  fs.writeFileSync(F, s)
  console.log('  ✓ DEVELOPMENT.md 补第 62、63 轮'); n++
}
console.log('共 ' + n + ' 处')
