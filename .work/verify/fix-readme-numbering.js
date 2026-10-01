// Fix section numbering after the card-box section was inserted.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, '..', '..', 'README.md')
let s = fs.readFileSync(f, 'utf8')
const pairs = [
  ['### 9. 原版改过卡框尺寸的牌 📐', '### 5. 原版改过卡框尺寸的牌 📐'],
  ['### 5. 着色器 ✦', '### 6. 着色器 ✦'],
  ['### 6. 盲注逐帧动画', '### 7. 盲注逐帧动画'],
  ['### 7. 动态效果预览与动图导出 🎞', '### 8. 动态效果预览与动图导出 🎞'],
  ['### 8. 手机 / 平板适配 📱', '### 9. 手机 / 平板适配 📱'],
  ['## 五、目录结构', '## 五、目录结构'],
  ['## 五、重新构建', '## 六、重新构建'],
  ['## 六、实现要点', '## 七、实现要点'],
  ['## 七、更新记录', '## 八、更新记录'],
  ['## 八、关于导入 Mod 素材（前置源码调研结论，尚未实现）', '## 九、关于导入 Mod 素材（前置源码调研结论，尚未实现）'],
]
let n = 0
for (const [a, b] of pairs) {
  if (a === b) continue
  if (s.includes(a)) { s = s.replace(a, b); n++ }
}
fs.writeFileSync(f, s)
console.log('renumbered', n, 'headings')
s.split(/\r?\n/).forEach((l, i) => { if (/^#{2,3} /.test(l)) console.log(String(i + 1).padStart(4) + ': ' + l) })
