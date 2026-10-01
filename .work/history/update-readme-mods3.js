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

rep(`└── verify/                 无头 Chrome CDP 自动化验证（38 个场景 + 导出/GIF/APNG 字节校验）`,
  `└── verify/                 无头 Chrome CDP 自动化验证（39 个场景 + 导出/GIF/APNG 字节校验）`,
  'verify count')

rep(`- 验证：自造了一个测试 mod（2x 与 1x 图集、\`ConsumableType\`、\`soul_pos\` 立绘、中英双语、故意写坏的坐标、故意不写 atlas 的条目），走**文件夹导入**和**zip 导入**两条路径，共 38 个 CDP 场景 + 20 项解析断言 + 导出校验，全部通过；mod 贴图与着色器叠加（闪箔/多彩/负片）实测与原版贴图表现一致。`,
  `- 验证：自造了一个测试 mod（2x 与 1x 图集、\`ConsumableType\`、\`soul_pos\` 立绘、中英双语、故意写坏的坐标、故意不写 atlas 的条目），走**文件夹选择 / 面板拖拽 / 页面任意位置拖拽 / zip / 被拍平的目录**五条路径，共 39 个 CDP 场景 + 24 项解析断言 + 导出校验，全部通过；mod 贴图上的着色器叠加（闪箔 / 多彩 / 负片）实测与原版贴图表现完全一致（差值都是 0.043）。`,
  'update log counts')

rep(`- ⚠️ **运行时才生成的条目读不到**`,
  `- ✅ **路径丢失也能救**：如果包里的目录结构没了（文件被拍平），图集会退回按文件名匹配，并根据条目声明的坐标反推是 1x 还是 2x；\`en-us.lua\` 这种被拍平的本地化文件也能认出来（前提是它真的是 \`{ descriptions = ... }\`）
- ⚠️ **运行时才生成的条目读不到**`,
  'flat pack note')

rep(`> 用法：打开 HTML → 左侧「导入 Mod」→ 把 mod 文件夹或 zip 拖进去。解析结果、跳过项与警告都会写在下方的日志里。`,
  `> 用法：打开 HTML → 左侧「导入 Mod」→ 把 mod 文件夹或 zip 拖进去。
> 也可以**直接把文件夹 / zip 拖到页面任意位置**（会出现整页提示，不会把浏览器导航走）。
> 解析结果、跳过项与警告都会写在下方的日志里；每个 mod 卡片上有「在图鉴中查看 / 卸载」。`,
  'usage note')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
