/* 第五十四轮（补 2）：黄框插到「最后一个功能段」之后 —— 光用 ⓪ 段的父容器不够，
   后面的段落（Lua / 导出）在另一个容器里，所以它没落到真正的最底部。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const from = '  if (mkNeedBoxEl && mkSectionParent) mkSectionParent.appendChild(mkNeedBoxEl);'
const hits = s.split(from).length - 1
if (hits !== 1) { console.error('❌ 锚点命中 ' + hits); process.exit(1) }
s = s.replace(from, () => [
  '  if (mkNeedBoxEl) {',
  '    /* 插到最后一个功能段后面（后面的段落可能在别的容器里，所以按 DOM 里最后一个 .opt 定位） */',
  "    const opts2 = document.querySelectorAll('.mkright .opt');",
  '    const last2 = opts2.length ? opts2[opts2.length - 1] : null;',
  '    if (last2 && last2.parentElement) last2.parentElement.insertBefore(mkNeedBoxEl, last2.nextSibling);',
  '    else if (mkSectionParent) mkSectionParent.appendChild(mkNeedBoxEl);',
  '  }',
].join('\n'))
fs.writeFileSync(F, s)
console.log(fs.readFileSync(F, 'utf8').indexOf("insertBefore(mkNeedBoxEl, last2.nextSibling)") >= 0 ? '  ✓ 黄框改成插在最后一个段落之后' : '  ❌ 没写进去')
