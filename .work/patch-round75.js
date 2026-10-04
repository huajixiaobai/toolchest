/* 第七十五轮（设计清理 ②）：删掉克隆下拉处理器里的死代码
   那段是第五十四轮抽函数时留下的旧实现（`return;` 之后、被 `eslint-disable no-unreachable` 标记），
   已经造成过一次补丁锚点撞车。用「行范围删除」而不是多行锚点：从 eslint 注释那行删到该 handler 的收尾 `  };` 之前。
   删完必须确认克隆下拉还能用（mkProject 场景里有真的给下拉派发 change 并断言名字变化）。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const lines = s.split('\n')
const i0 = lines.findIndex((l) => l.indexOf('eslint-disable no-unreachable') >= 0)
if (i0 < 0) { console.error('❌ 找不到死代码标记'); process.exit(1) }
let i1 = -1
for (let i = i0 + 1; i < lines.length; i++) { if (lines[i] === '  };') { i1 = i; break } }
if (i1 < 0) { console.error('❌ 找不到该 handler 的收尾'); process.exit(1) }
const removed = i1 - i0
console.log('  死代码范围：第 ' + (i0 + 1) + ' 行 → 第 ' + i1 + ' 行（删 ' + removed + ' 行，保留收尾）')
console.log('  首行：' + lines[i0].trim().slice(0, 60))
console.log('  末行：' + lines[i1 - 1].trim().slice(0, 60))
lines.splice(i0, removed)
s = lines.join('\n')
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const checks = {
  '标记已消失': b.indexOf('eslint-disable no-unreachable') < 0,
  '旧实现已消失': b.indexOf('const SUIT_CN = { Diamonds') < 0,
  '新实现还在': b.indexOf('function mkApplyCloneFrom (id)') >= 0,
  '下拉仍调用新实现': b.indexOf('mkApplyCloneFrom(cs.value)') >= 0,
}
const bad = Object.keys(checks).filter((k) => !checks[k])
console.log(bad.length ? '  ❌ 检查未过：' + bad.join(' | ') : '  ✓ 四项检查全过（标记没了、旧实现没了、新实现和下拉接线都在）')
