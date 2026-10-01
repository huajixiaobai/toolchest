/* README: correct the mobile forge description (only a short bar is pinned now, and the heavy
   sections sit below the pickers) and log the fix. */
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

rep(`- 手机上左栏压缩成小图（约 116px 宽）钉在顶部，右栏单列；实测把手机端的页面高度从 **4627px（全展开）压到 1790px（默认）/ 1285px（全收起）**`,
  `- **手机上只钉一条 146px 的窄条**（约屏高的 17%）：左边一张 88px 的小牌图，右边一行「主体 · 强化 · 版本 · 蜡封」摘要；点这条窄条可以把牌图放大到 190px 再看一眼
- 手机端的「当前组合详情 / 导出图片数据 / 动图与动画」三块**排在选项下面**，永远不会盖住选牌的区域；跳转条在手机上不再吸顶（避免和预览条抢位置）
- 实测手机端（390×844）：8 个选项分组**每一个都能滚到并且点得到**，页面高度 **3559px（全展开）→ 1709px（默认）→ 1204px（全收起）**`,
  'mobile forge description')

rep(`## 八、更新记录

**第九轮（根据合成台 / 手机端 / 来源筛选的反馈）**`,
  `## 八、更新记录

**第十轮（手机端合成台布局修复）**
- 修：**手机端合成台被三块内容占满、其他选项全被挡住**。原因是我把整个左栏（预览 + 摘要 + 导出 + 动图）都设成了 \`position:sticky\`，在手机上它高达 **436px**，钉在顶部后选项分组从下面滚过去就被完全遮住——实测 8 个分组里有 **6 个点不到**。
- 改：手机上**只钉一条 146px 的窄条**（小牌图 88px + 一行摘要，占屏高约 17%），并且把「当前组合详情 / 导出图片数据 / 动图与动画」三块**挪到选项下面**；跳转条在手机上改为不吸顶，避免和预览条抢同一个位置。
- 验证：新增 \`forgePhone\` 场景，在 390×844 视口下逐个把 8 个选项分组滚到窄条下方并做命中测试 —— **8/8 全部可点**，最后一块（显示选项）也在屏幕内；窄条点一下能把牌图放大到 190px。

**第九轮（根据合成台 / 手机端 / 来源筛选的反馈）**`,
  'change log 第十轮')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
