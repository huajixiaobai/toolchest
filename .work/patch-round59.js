/* 第五十九轮：修「塔罗/星球/幽灵的类型被设成不存在的类型」+ dump 盲注真实数据形状
   实测证据：克隆 c_fool 后 typeAfter = "Tarot"、luaHasCost = false —— 图鉴里这三种牌（塔罗/星球/幽灵）
   的 cat 就是 Tarot / Planet / Spectral，不是 Consumable。制作器的类型只有 Consumable，
   于是 mkItemLua 的 if/else 链落空：专属设置不显示、cost 也不写。 */
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
  "  const typeOut = it.cat === 'Deck' ? 'Back' : (it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat));",
  "  /* 图鉴里的 cat 和制作器的类型名不是一套：Deck→Back、Tarot/Planet/Spectral→Consumable。\n     不映射的话类型会落空，专属设置不显示、连 cost 都不会写进 Lua（实测过）。 */\n  const typeOut = it.cat === 'Deck' ? 'Back' : (it.cat === 'Joker' ? 'Joker' : ((['Tarot', 'Planet', 'Spectral', 'Consumable'].indexOf(it.cat) >= 0) ? 'Consumable' : it.cat));",
  '类型映射补齐（塔罗/星球/幽灵 → Consumable）'
)
rep(
  'applyClone: (id) => (mkApplyCloneImpl ? mkApplyCloneImpl(id) : null),',
  'applyClone: (id) => (mkApplyCloneImpl ? mkApplyCloneImpl(id) : null),\n      itemData: (id) => { const it = BY_ID[id]; if (!it) return null; return { cat: it.cat, set: it.set, keys: Object.keys(it), configKeys: Object.keys(it.config || {}), rawKeys: Object.keys(it.raw || {}), config: JSON.stringify(it.config || {}).slice(0, 300), raw: JSON.stringify(it.raw || {}).slice(0, 300) } },',
  '暴露 itemData（查真实数据形状）'
)
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const must = ["['Tarot', 'Planet', 'Spectral', 'Consumable'].indexOf(it.cat)", 'itemData: (id) =>']
const miss = must.filter((m) => b.indexOf(m) < 0)
console.log(miss.length ? '  ❌ 写回后找不到：' + miss.join(' | ') : '  ✓ 写回校验：' + must.length + ' 个标识都在')

/* 场景：记下每种类型克隆后的真实数据形状 */
const G = path.join(__dirname, 'verify', 'cdp.js')
let t = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n')
const a2 = '        typeAfter:st.type,'
if (t.split(a2).length - 1 !== 1) { console.error('❌ 场景锚点'); process.exit(1) }
t = t.replace(a2, () => a2 + '\n        data: B.maker.itemData(ids[0]),')
fs.writeFileSync(G, t)
console.log('  ✓ 场景：记录每种类型的真实数据形状')
