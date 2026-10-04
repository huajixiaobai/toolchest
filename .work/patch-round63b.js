/* 第六十三轮（补）：纠正扫描里两条"没有输入框" —— 它们不是缺口
   · 蜡封：字段组里本来就只有一句说明（"蜡封没有数值字段，效果取决于玩家拿它做什么"），本来就该没有数值框
   · 小丑：它的 权重/价格/稀有度 在 ④ 数值与兼容性 那一区，用的是 data-mk 命名（上一轮已单独验过 cost/rarity）
   改成：这两条用各自正确的键去验，别把"设计如此"当成"缺功能"。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const a = '      ["Enhanced","chips","33",null],["Edition","xmult","2.5",null],["Seal","seal_val","5",null],\n      ["Consumable","max_highlighted","3",null],["Joker","weight","2",null]];'
if (s.split(a).length - 1 !== 1) { console.error('❌ 锚点'); process.exit(1) }
s = s.replace(a, () => [
  '      ["Enhanced","chips","33",null],["Edition","xmult","2.5",null],',
  '      ["Consumable","max_highlighted","3",null]];',
].join('\n'))
/* 小丑那一行改用 data-mk 的键去验（它本来就在别处） */
const b = '    r.perTypeEditSummary=(r.perTypeEdit||[]).map(function(x){ return x.type+"."+x.key+(x.noInput?"(没有这个输入框)":(x.changed?" 改了":" 没变")+(x.inLua?" 进Lua":" 没进Lua")) }).join("  ||  ");'
if (s.split(b).length - 1 !== 1) { console.error('❌ 锚点 2'); process.exit(1) }
s = s.replace(b, () => [
  '    /* 补充：小丑的权重走的是 data-mk（在 ④ 数值区），单独按它自己的键验一次 */',
  '    B.maker.select(0); B.maker.typeChip("Joker"); await __V.wait(250);',
  '    const wEl=q(\'[data-mk="weight"]\');',
  '    if (wEl) { const before2=B.maker.lua(); wEl.value="2"; fire(wEl,"input"); await __V.wait(400);',
  '      r.perTypeEdit.push({ type:"Joker", key:"weight(data-mk)", changed:B.maker.lua()!==before2, inLua:B.maker.lua().indexOf("weight = 2")>=0 }); }',
  '    r.perTypeEditSummary=(r.perTypeEdit||[]).map(function(x){ return x.type+"."+x.key+(x.noInput?"(没有这个输入框)":(x.changed?" 改了":" 没变")+(x.inLua?" 进Lua":" 没进Lua")) }).join("  ||  ");',
  '    r.sealFieldIsText=(function(){ B.maker.typeChip("Seal"); const el=q(\'[data-mkt="seal_note"]\'); return !!el })();',
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 扫描纠正：去掉本就不该有的蜡封数值框，小丑改用 data-mk 的键')
