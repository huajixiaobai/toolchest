/* 第五十六轮（补 2）：修一个真 bug —— 各类型的 Lua 里 pos 是写死的 {x=0,y=0}
   也就是说：在图集里点别的格子（或照别张牌做）时，**预览变了、导出却没变** —— 游戏里永远是图集第一格。
   这是断言 editArtInLua=false 抓出来的。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const targets = [
  "  L.push('    pos = { x = 0, y = 0 },');",
  '  L.push(\'    pos = { x = 0, y = 0 },\');'.replace(/\\'/g, "'"),
  "    L.push('    pos = { x = 0, y = 0 },');",
  "  L.push('    pos = { x = 0, y = 0 }');",
]
let total = 0
for (const t of targets) {
  const hits = s.split(t).length - 1
  if (!hits) continue
  const ind = t.startsWith('    ') ? '    ' : '  '
  s = s.split(t).join(ind + "L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');")
  console.log('  ✓ 替换写死的 pos（' + hits + ' 处，缩进 ' + ind.length + '）')
  total += hits
}
if (!total) { console.error('❌ 一处都没替换到'); process.exit(1) }
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const left = (b.match(/pos = \{ x = 0, y = 0 \}/g) || []).length
console.log('  ✓ 共替换 ' + total + ' 处，文件里还剩写死的 pos: ' + left + ' 处')
console.log(b.indexOf("(MK.art.pos.x || 0)") >= 0 ? '  ✓ 写回校验通过' : '  ❌ 没写进去')
