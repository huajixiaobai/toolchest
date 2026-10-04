/* 第五十八轮（补）：修「克隆牌组会设成不存在的类型 Deck」+ 让按类型验证真的覆盖牌组
   实测数据：Booster→kind/choose/extra ✅、Planet→hand_type ✅、Tag→type ✅；
   但牌组那一行是空的 —— 因为图鉴里牌组的 cat 是 'Deck'，而制作器的类型叫 'Back'。 */
const fs = require('fs')
const path = require('path')
let n = 0

/* ① app.js：Deck → Back */
{
  const F = path.join(__dirname, 'app.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const a = "  const typeOut = it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat);"
  const b = "  /* 图鉴里牌组的 cat 是 Deck，制作器里这个类型叫 Back —— 不映射的话会设成一个不存在的类型，专属设置整块不显示 */\n  const typeOut = it.cat === 'Deck' ? 'Back' : (it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat));"
  if (s.split(a).length - 1 !== 1) { console.error('❌ typeOut 锚点'); process.exit(1) }
  s = s.replace(a, () => b)
  fs.writeFileSync(F, s)
  console.log(s.indexOf("it.cat === 'Deck' ? 'Back'") >= 0 ? '  ✓ Deck→Back 映射' : '  ❌ 没写进去'); n++
}

/* ② cdp.js：牌组那一对用 Deck 去取，并检查类型真的落到 Back */
{
  const F = path.join(__dirname, 'verify', 'cdp.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const a = '["Back","Back"]'
  if (s.split(a).length - 1 !== 1) { console.error('❌ 场景锚点'); process.exit(1) }
  s = s.replace(a, () => '["Back","Deck"]')
  const a2 = '      r.cloneByType.push({ type:ty, cat:cat, id:ids[0], effects:res?res.effects:null, tKeys:res?res.tKeys:null,'
  if (s.split(a2).length - 1 !== 1) { console.error('❌ 场景锚点 2'); process.exit(1) }
  s = s.replace(a2, () => a2 + '\n        typeAfter:st.type,')
  fs.writeFileSync(F, s)
  console.log('  ✓ 场景：牌组改用 Deck 取、并记录克隆后的类型'); n++
}
console.log('共 ' + n + ' 处')
