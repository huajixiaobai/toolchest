// Append the mod-import design note to the README.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, '..', '..', 'README.md')
let s = fs.readFileSync(f, 'utf8')
if (s.includes('关于导入 Mod 素材')) { console.log('already present'); process.exit(0) }

const section = `
---

## 八、关于导入 Mod 素材（设计预案，尚未实现）

目标：把 mod 的素材也纳入图鉴，但**与原版严格分开** —— 每个条目带 \`source\` 字段（\`vanilla\` 或某个 mod 的 id），侧栏多一级「来源」筛选，批量导出的 ZIP 也按来源分目录。

**不需要用户安装任何前置。** 素材提取只需要 mod 文件本身，既不用跑起游戏，也不需要 Steamodded：

1. **贴图**直接读 mod 目录里的 PNG，零依赖。
2. **数据**写在 mod 的 Lua 里，长这样：

   \`\`\`lua
   SMODS.Atlas { key = 'foo', path = 'foo.png', px = 71, py = 95 }
   SMODS.Joker { key = 'bar', atlas = 'foo', pos = {x=0,y=0}, rarity = 2, cost = 6,
                 config = { extra = 3 },
                 loc_txt = { name = 'Bar', text = { '每次打出 {C:attention}对子{} 时 +3 倍率' } } }
   \`\`\`

   都是普通 Lua 表 —— 现有的解析器（跳过函数体、只取值）就能读，**不需要 \`SMODS\` 这个库存在**。

**两条实现路线，按 mod 复杂度选：**

- **A. 纯静态解析**（无新依赖）：适合"一张贴图 + 一条 \`SMODS.Joker{}\`"的简单 mod。构建管线不引入任何依赖；缺点是遇到循环生成、字符串拼接、helper 函数的 mod 就读不全。
- **B. 构建期跑一个真 Lua 虚拟机 + 自带一套 SMODS 桩函数**：把 \`SMODS.Atlas / Joker / Consumable / Back / Voucher / Booster / Tag / Blind / Edition / Enhancement\` 全部实现成"只记录、不执行"的空壳，跑一遍 mod 的 \`main.lua\`，把登记结果 dump 成 JSON。这样**有依赖的 mod 也能解析**，而且同样不需要真的装 Steamodded —— API 面由我们自己提供。代价是构建管线多一个依赖（纯 JS 的 Lua 5.3 实现），但**产出的 HTML 依然是零依赖单文件**。

计划先用 A 覆盖大部分常见 mod，遇到读不动的再上 B。

**还要处理的细节：**

- 从 \`mod.json\` 读 mod 名称 / 作者 / 版本，作为分类标题
- 贴图的 \`px/py\` 不一定是 71×95（消耗品牌组常常是别的尺寸），要按 mod 自己的定义切图
- 多语言：mod 可能内联 \`loc_txt\`，也可能另外挂语言文件
- **覆盖原版的 mod**（替换已有贴图）必须单独标记，绝不能混进原版分类
- mod 之间的依赖关系；有的 mod 是 zip，有的是文件夹
`

s = s.trimEnd() + '\n' + section
fs.writeFileSync(f, s)
console.log('✅ appended mod-import design note')
