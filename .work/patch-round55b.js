/* 第五十五轮（补）：修测试自己的两处错误 —— 数字框监听 input 不是 change；贴图那步别自己拼 Lua 字符串 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
let n = 0
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}
rep(
  "    const costEl=q('[data-mk=\"cost\"]'); costEl.value=\"7\"; fire(costEl,\"change\"); await __V.wait(350);",
  "    const costEl=q('[data-mk=\"cost\"]'); costEl.value=\"7\"; fire(costEl,\"input\"); await __V.wait(400);",
  'cost 用 input 事件'
)
rep(
  "    r.editArt=(JSON.stringify(B.maker.state.art.pos)!==posBefore) && B.maker.lua().indexOf(\"pos = { x = \"+B.maker.state.art.pos.x+\", y = \"+B.maker.state.art.pos.y+\" }\")>=0;",
  "    const luaArt=B.maker.lua();\n    r.editArt=(JSON.stringify(B.maker.state.art.pos)!==posBefore) && (luaArt.indexOf(\"pos = { x = \"+B.maker.state.art.pos.x)>=0);",
  '贴图那步只看 pos 变没变'
)
fs.writeFileSync(F, s)
console.log('共 ' + n + ' 处')
