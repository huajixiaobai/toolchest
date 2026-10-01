const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, '..', '..', 'README.md')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`> **双击打开** \`Balatro素材图鉴.html\` 即可。
> 已内嵌全部贴图与数据（4.08 MB），不需要联网、不需要服务器、不需要装任何东西。`,
  `> **双击打开** \`Balatro素材图鉴.html\` 即可。
> 已内嵌全部贴图与数据（4.17 MB），不需要联网、不需要服务器、不需要装任何东西。
> 想连自己装的 mod 一起看？打开后点左侧「**导入 Mod**」，把 mod 文件夹或 zip 拖进去就行（同样离线）。`,
  'intro size + mod hint')

rep(`描述文本带 **5 种语言**：简体中文、繁體中文、English、日本語、한국어。`,
  `描述文本带 **5 种语言**：简体中文、繁體中文、English、日本語、한국어。

以上是原版数量。导入 mod 后，mod 的条目会**追加**进来并单独标记来源，原版数字不会被改写。`,
  'vanilla counts note')

rep(`Balatro素材图鉴.html      ← 成品，双击打开（4.08 MB，自包含）`,
  `Balatro素材图鉴.html      ← 成品，双击打开（4.17 MB，自包含）`,
  'tree size')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
