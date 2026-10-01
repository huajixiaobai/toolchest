/* README: forge overhaul, mobile forge, mod-aware forge, and the source-filter way back. */
'use strict'
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

/* ---- forge documentation: the section that describes the forge tool ---- */
rep(`### 3. 卡牌合成台 ⚒
先选 **牌型**（扑克牌 / 小丑牌 / 联动牌面 / 塔罗 / 星球 / 幽灵 / 优惠券 / 补充包），再选具体主体（带筛选框），然后叠加 **强化 / 版本 / 蜡封 / 贴纸 / 牌背**，实时预览外观变化。`,
  `### 3. 卡牌合成台 ⚒
先选 **牌型**（扑克牌 / 小丑牌 / 联动牌面 / 塔罗 / 星球 / 幽灵 / 优惠券 / 补充包，**导入 mod 后还会多出 mod 自己的分类**），再选具体主体（带筛选框），然后叠加 **强化 / 版本 / 蜡封 / 贴纸 / 牌背**，实时预览外观变化。

**为了不用上下翻找，合成台做成了「可折叠 + 能跳转」的结构**：

- 每一块（牌型 / 主体 / 强化 / 版本 / 蜡封 / 贴纸 / 牌背 / 显示 / 详情 / 导出 / 动图）都是**可折叠**的，**标题右侧直接写着当前选了什么**（例如「强化 Enhancement… 玻璃牌」），不用展开就知道现在的组合
- 右栏顶部有一条**跳转条**：点「强化」就展开并滚到那一块；还有 **全部展开 / 收起 / 🎲 随机搭配 / ↺ 重置**
- 折叠状态会记住；首次进入桌面端只展开常用的几块，手机端默认只留「牌型 + 主体」
- **主体列表在框内滚动**（150+ 张牌不再把页面撑长），筛选框支持名称 / id / \`source:名字\`
- 左栏的预览是 **sticky** 的：往下翻的时候画面一直在，改一层立刻能看到效果；下面还有一行**当前组合**的摘要，要完整表格再展开「当前组合详情」
- 手机上左栏压缩成小图（约 116px 宽）钉在顶部，右栏单列；实测把手机端的页面高度从 **4627px（全展开）压到 1790px（默认）/ 1285px（全收起）**`,
  'forge feature section')

/* ---- change log ---- */
rep(`## 八、更新记录

**第八轮（根据 Cryptid.zip 反馈修复）**`,
  `## 八、更新记录

**第九轮（根据合成台 / 手机端 / 来源筛选的反馈）**
- 新：**合成台认识 mod 了**。以前合成台的主体的列表是页面加载时算好的固定数组，导进来的 mod 条目根本进不去。现在每次进合成台都会重建：牌型下拉里会多出 mod 自己造的分类（Cryptid 的「Code 代码牌」「Sleeve 牌套」等），数量也是实时算的（导入测试 mod 后「小丑牌」从 150 变成 154）。
- 新：**合成台布局重构（可折叠 + 跳转条 + 快捷操作）**。功能一个没少，但每一块都能折叠、标题右侧显示当前选中的值、顶部有跳转条与「全部展开 / 收起 / 🎲 随机搭配 / ↺ 重置」；主体列表改成框内滚动，不再把页面撑到几千像素。
- 新：**预览 sticky + 一行摘要**。滚动时牌面一直可见，左栏顶部/底部显示「主体 X · 强化 Y · 版本 Z · 蜡封 W」，完整表格收进「当前组合详情」。
- 新：**手机端合成台重做**。预览压缩成小图钉在顶部（约 116px），右栏单列，跳转条可横向滑动；默认只展开「牌型 + 主体」，实测页面高度 4627px → 1790px（全收起 1285px）。
- 新：**来源筛选有了回头路**。列表标题栏会出现「来源：Cryptid ✕」的胶囊，点一下就是「全部来源」；详情页那个按钮也改成双向开关（在只看某 mod 的状态下显示「← 显示全部来源」）。
- 修：合成台里 mod 的「版本」如果用的是 mod 自定义着色器，摘要里会注明「自定义着色器 X（未移植）」，不再让人以为特效坏了。

**第八轮（根据 Cryptid.zip 反馈修复）**`,
  'change log 第九轮')

rep(`| 合成台 | PNG 1x / 2x / 4x、SVG | 含全部叠加层与特效 |`,
  `| 合成台 | PNG 1x / 2x / 4x、SVG | 含全部叠加层与特效（原版与导入的 mod 条目都可以） |`,
  'export table')

/* ---- covered list: forge is mod aware now ---- */
rep(`- ✅ **路径丢失也能救**：如果包里的目录结构没了（文件被拍平），图集会退回按文件名匹配，并根据条目声明的坐标反推是 1x 还是 2x；\`en-us.lua\` 这种被拍平的本地化文件也能认出来（前提是它真的是 \`{ descriptions = ... }\`）`,
  `- ✅ **路径丢失也能救**：如果包里的目录结构没了（文件被拍平），图集会退回按文件名匹配，并根据条目声明的坐标反推是 1x 还是 2x；\`en-us.lua\` 这种被拍平的本地化文件也能认出来（前提是它真的是 \`{ descriptions = ... }\`）
- ✅ **合成台里可以直接拿 mod 条目当主体**：mod 自造的分类会出现在牌型下拉里，条目上带 MOD 角标`,
  'covered list forge')

/* ---- verify list ---- */
rep(`└── verify/                 无头 Chrome CDP 自动化验证（41 个场景 + 导出/GIF/APNG 字节校验）`,
  `└── verify/                 无头 Chrome CDP 自动化验证（44 个场景 + 导出/GIF/APNG 字节校验）`,
  'verify count')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
