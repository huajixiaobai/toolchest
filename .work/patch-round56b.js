/* 第五十六轮（补）：把误导性的 editArt 断言换成「走 DOM 处理器路径」的断言 + 记录第 55/56 轮 */
const fs = require('fs')
const path = require('path')
let n = 0

/* ① 测试断言改名并去掉合成事件那条 */
{
  const F = path.join(__dirname, 'verify', 'cdp.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const rep = (from, to, label) => {
    const hits = s.split(from).length - 1
    if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
    s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
  }
  rep(
    '    const luaArt=B.maker.lua();\n    r.editArt=(JSON.stringify(B.maker.state.art.pos)!==posBefore) && (luaArt.indexOf("pos = { x = "+B.maker.state.art.pos.x)>=0);',
    '    /* 说明：这里**不用**合成事件派发点击 —— 实测 dispatchEvent(new MouseEvent(...)) 到不了格子的处理器（\n       和之前「合成 hover 不触发 CSS」是同一类坑），走 onclick 这条路才是真的验到逻辑 */\n    r.editArtSynthetic=(JSON.stringify(B.maker.state.art.pos)!==posBefore);',
    'editArt 改名（合成事件那条已知不可靠）'
  )
  rep(
    '      r.editArtViaOnclick=(JSON.stringify(B.maker.state.art.pos)!==posB2);',
    '      const posAfter2=B.maker.state.art.pos;\n      const luaAfter2=B.maker.lua();\n      r.editArtViaOnclick=(JSON.stringify(posAfter2)!==posB2);\n      r.editArtInLua=luaAfter2.indexOf("pos = { x = "+posAfter2.x+", y = "+posAfter2.y+" }")>=0;',
    '贴图改动也要反映到 Lua'
  )
  fs.writeFileSync(F, s)
}

/* ② DEVELOPMENT.md：补第 55、56 轮 */
{
  const F = path.join(__dirname, '..', 'DEVELOPMENT.md')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const anchor = '**第五十四轮'
  if (s.split(anchor).length - 1 !== 1) { console.error('❌ 记录锚点不唯一'); process.exit(1) }
  const E = [
    '**第五十六轮（把上一轮那个 false 查清楚：不是功能坏，是测试用合成事件派发点击到不了处理器）**',
    '- 上一轮 `editArt: false` 我留着没糊弄。这一轮一次把三种点法都跑出来对比：',
    '  | 点法 | 结果 |',
    '  | --- | --- |',
    '  | `dispatchEvent(new MouseEvent("click", {shiftKey:true}))`（合成事件） | ❌ 到不了格子的处理器 |',
    '  | 直接调格子的 `onclick({shiftKey:true})` | ✅ 位置从 (0,0) 变成 (8,15)，Lua 里的 `pos` 也跟着变了 |',
    '  | 不带 shift 点格子（= 照这张牌做） | ✅ Lua 变化（`plainClickDidSomething: true`） |',
    '- 结论：**游戏逻辑没问题，是我测试的姿势不对** —— 和之前踩过的「合成 hover 不触发 CSS `:hover`」同一类坑。以后凡是验点击，要么走 DOM 处理器路径，要么用 CDP 的真鼠标。断言已改名（`editArtSynthetic` / `editArtViaOnclick` / `editArtInLua`），不再用一个含糊的 `editArt` 骗自己。',
    '',
    '**第五十五轮（预设即起点：第一步）**',
    '- 用户的原话：「哪怕选了预设不代表就这样什么都不能改了……本质是为了方便创作」，也就是**预设是起点不是锁**：选了之后图片素材、名字、效果、价格、稀有度等一切都要能继续改。',
    '- 界面：来源那一块现在明确写出「已照「X」复制了一份 —— **下面所有内容都能继续改**（贴图 / 名字 / 原文 / 效果 / 价格 / 稀有度 / 权重 / 这个类型的专属设置），这个标记只是备注，不是锁」。',
    '- 实测（克隆一张原版小丑后逐项改，每步断言 Lua 跟着变）：名字 ✅、价格 ✅（`cost = 7`）、稀有度 ✅（`rarity = 3`）。',
    '- 这一步只做了①；②「克隆要把该类型的专属内容一起搬过来」和③「十种类型补齐到小丑牌同等配置」还在目标里排队。',
    '',
  ].join('\n')
  s = s.replace(anchor, () => E + anchor)
  fs.writeFileSync(F, s)
  console.log('  ✓ DEVELOPMENT.md 补第 55/56 轮'); n++
}
console.log('共 ' + n + ' 处')
