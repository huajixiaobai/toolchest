/* README update: the mod importer is implemented now, so section 九 becomes a description of
   what actually shipped (and what it deliberately does not do). */
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

/* -------- 功能: new section 10, right after the mobile section -------- */
rep(`已用 390×844 的手机视口自动化验证：抽屉开关、遮罩、关闭按钮、页面无横向溢出、合成台单列、无超宽控件、99 个画布全部正常渲染。

---`,
  `已用 390×844 的手机视口自动化验证：抽屉开关、遮罩、关闭按钮、页面无横向溢出、合成台单列、无超宽控件、99 个画布全部正常渲染。

### 10. 导入 Mod 素材 ⊕
左侧「**导入 Mod**」可以把 **Steamodded（SMODS）格式**的 mod 直接读进图鉴——**整个 mod 文件夹拖进去**，或者选它的 **zip**，也可以点按钮挑文件夹。

- **完全离线**：解析全在本页做，不联网、不上传任何文件，也不需要在游戏里装 Lovely / Steamodded
- 读取 mod 的 \`manifest.json\`、入口 lua（其实包里每个 \`.lua\` 都会扫）、\`assets/{1x,2x}/*.png\`、\`localization/*.lua\`
- 小丑牌 / 塔罗 / 星球 / 幽灵 / 优惠券 / 补充包 / 牌组 / 标签 / 盲注 / 强化 / 蜡封 / 贴纸 都能读，**包括 mod 用 \`SMODS.ConsumableType\` 自己造的新牌型**
- mod 的新牌型会在侧栏多出一个「**Mod 新增类型**」分组；同时多出一个「**来源**」分组，可以在「全部 / 原版 / 某个 mod」之间切换
- mod 条目在图鉴里带 **MOD** 角标，详情页有「来源」区块（mod 名、mod id、声明在哪个文件的第几行）
- 导入后一切照旧可用：搜索（含 \`source:\`）、排序、合成台、PNG / GIF / APNG / ZIP 导出
- 导入面板给出**统计与警告**：扫到多少条声明、跳过多少、多少条没写 \`atlas\`/\`pos\`、哪些 \`pos\` 超出了图集范围、哪些图集没找到
- mod 的图集用 \`URL.createObjectURL\` 载入，不写进 HTML；「卸载」会把条目、图集、计数一起清干净

> 前缀规则按 Steamodded 源码实现：key 先加 mod 前缀再加类前缀，所以 \`SMODS.Joker{key='alpha'}\` 在 \`prefix='tm'\` 的 mod 里最终是 \`j_tm_alpha\`；\`Atlas\` / \`ConsumableType\` 的 key **不加**前缀（它们带 \`prefix_config.key = false\`），但对象里的 \`atlas\` 字段会加，所以两种写法都能认出来。

---`,
  '功能 10 导入 Mod')

/* -------- search: source: operator -------- */
rep(`effect:Mult              按效果
cat:Joker rarity:1 cost>=4     可自由混用`,
  `effect:Mult              按效果
source:testmod           只看某个 mod 的内容（source:vanilla 看原版）
cat:Joker rarity:1 cost>=4     可自由混用`,
  'search source filter')

/* -------- console API -------- */
rep(`A.save(await A.canvasBytes(canvas), 'x.png')     // 触发下载
\`\`\``,
  `A.save(await A.canvasBytes(canvas), 'x.png')     // 触发下载

// 导入 mod（与界面走同一条路径）
await A.importBatch(await pickFiles());          // 传入 File[]（文件夹选择/拖拽的结果）
await A.importZipBuffer(buf, 'MyMod');           // 直接给一个 zip 的 ArrayBuffer
A.mods                                           // 已导入的 mod 列表
A.sourceItems().length                           // 当前来源筛选下的条目数
A.removeMod('testmod')                           // 卸载
\`\`\``,
  'console API')

/* -------- 目录结构 -------- */
rep(`├── app.css / app.js / shell.html   页面本体
├── bundle.js               拼装成单文件 HTML`,
  `├── app.css / app.js / shell.html   页面本体
├── modimport.js             页面内的 Mod 解析器（zip 解压 / lua 扫描 / 图集与本地化）
├── bundle.js               拼装成单文件 HTML`,
  '目录结构 modimport')

rep(`└── verify/                 无头 Chrome CDP 自动化验证（21 个场景 + 导出/APNG 字节校验）`,
  `└── verify/                 无头 Chrome CDP 自动化验证（38 个场景 + 导出/GIF/APNG 字节校验）
    ├── make-test-mod.js      合成一个测试 mod（含自定义牌型、1x/2x 图集、中英本地化、坏坐标）
    ├── test-import-node.js   不开浏览器直接跑解析器，20 项断言
    ├── testmod/ & testmod.zip  测试 mod 本体
    └── shots/                各场景截图`,
  '目录结构 verify')

/* -------- 更新记录 -------- */
rep(`## 八、更新记录

**第六轮（根据反馈修复）**`,
  `## 八、更新记录

**第七轮（本轮：Mod 导入已实现）**
- 新：**导入 Mod 素材**。左侧新增「导入 Mod」页：拖入整个 mod 文件夹或 zip、或点按钮选择；解析 \`manifest.json\` / 入口 lua / \`assets/{1x,2x}\` / \`localization\`，**全程离线、不需要装前置**。
- 新：**图鉴分类改成动态的**。分类来自条目自己的 \`set\`，mod 用 \`SMODS.ConsumableType\` 造的新牌型会自动出现一个「Mod 新增类型」分组（显示名取类型 key），不再被硬编码的分类表塞错地方。
- 新：**「来源」筛选**（全部 / 原版 / 每个 mod 一行），mod 条目带 **MOD** 角标，详情页有来源区块（mod 名 / id / 声明文件与行号）；搜索支持 \`source:\`。
- 新：**导入报告**。面板列出已导入的 mod（版本、作者、条目数、图集数、警告）与完整日志：没写 \`atlas\`、没写 \`pos\`、\`pos\` 超出图集范围、图集找不到、本地化解析失败等都会写清楚。
- 前缀规则**按 Steamodded 源码实现**（\`src/game_object.lua\` 的 \`add_prefixes\`）：key 先加 mod 前缀、再加类前缀（\`j_tm_alpha\`）；\`Atlas\` / \`ConsumableType\` 的 key 不加前缀，但对象里的 \`atlas\` 会加。各类的默认图集、默认 \`pos\`、\`class_prefix\`、\`set\` 名字都照抄源码里的定义。
- 验证：自造了一个测试 mod（2x 与 1x 图集、\`ConsumableType\`、\`soul_pos\` 立绘、中英双语、故意写坏的坐标、故意不写 atlas 的条目），走**文件夹导入**和**zip 导入**两条路径，共 38 个 CDP 场景 + 20 项解析断言 + 导出校验，全部通过；mod 贴图与着色器叠加（闪箔/多彩/负片）实测与原版贴图表现一致。

**第六轮（根据反馈修复）**`,
  '更新记录 第七轮')

/* -------- section 九: implementation summary -------- */
rep(`## 九、关于导入 Mod 素材（前置源码调研结论，尚未实现）`,
  `## 九、导入 Mod 素材的实现说明`,
  'section 九 title')

rep(`### 落地路线（结论）`,
  `### 实际做法：路线 A，但把 SMODS 的规则抄全了`,
  '落地路线 title')

rep(`考虑到 \`ConsumableType\` 这种动态类型很常见，**我倾向直接做 B**，A 作为兜底。

### 需要处理的细节清单

- 分类动态化：分类来自 \`set\`，\`ConsumableType\` 提供显示名与配色
- 每个条目带 \`source\`（\`vanilla\` / mod id），侧栏加「来源」筛选，批量导出按来源分目录
- **覆盖原版的 mod**（替换已有贴图）单独标记，绝不混进原版分类
- 图集的 \`px/py\` 由 mod 自己定义，不一定 71×95（消耗品牌组常见别的尺寸）
- 多语言：\`loc_txt\` 内联 / \`localization/<locale>.lua\` / \`SMODS.Language\`，格式与原版一致，解析器可复用
- \`loc_vars\` 是函数时 \`#1#\` 占位符无法静态求得 —— 要么跑 B，要么原样显示
- \`DeckSkin\` 会带来整套新的牌面/牌背素材
- mod 之间的依赖（\`manifest.json\` 的 \`dependencies\`，Thunderstore 用 \`Author-Package-Version\` 格式）与冲突（前缀冲突会被改名成 \`$pc1\`）
- 分发形态：文件夹或 zip 都有；Thunderstore 的 \`manifest.json\` + API 是最适合机器读取的入口

> 这一节是源码调研结论，导入功能还没有实现。`,
  `最后**先做了 A**（纯静态解析），理由是：静态扫描已经能覆盖"一张图 + 一条 \`SMODS.Joker{}\`"这种绝对主流的写法，而**路线 B 要往单文件 HTML 里塞一个 Lua 5.3 解释器**，体积和风险都不划算。为了不牺牲准确率，A 不是"只认最朴素的写法"，而是把 Steamodded 的解析规则完整抄了下来（见下），并且**读不准的地方会明说**，不会假装读到了。

### 抄进解析器的 Steamodded 规则（对照 \`src/game_object.lua\` / \`src/game_objects/*.lua\`）

| 规则 | 实现 |
|---|---|
| key 前缀顺序 | \`add_prefixes\` 先加 mod 前缀、再加类前缀 → 最终 key 是 \`j_tm_alpha\`（小丑）、\`c_tm_x\`（消耗品）、\`v_tm_x\`（优惠券）、\`p_tm_x\`（补充包）、\`b_tm_x\`（牌组）、\`tag_tm_x\`、\`bl_tm_x\`（盲注） |
| \`Atlas\` / \`ConsumableType\` / \`ObjectType\` | 带 \`prefix_config.key = false\`，**key 不加前缀**；但对象里的 \`atlas\` 字段会被加前缀，所以两种写法都试 |
| 各类默认值 | 默认 \`atlas\`（Joker→Joker、Consumable→Tarot、Back→centers、Tag→tags…）、默认 \`pos = {x=0,y=0}\`、\`class_prefix\`、\`set\` 名字全部照抄源码 |
| \`set\` 与分类的关系 | \`set\` 是游戏/本地化的名字（Back、Enhanced），图鉴分类是另一套显示名（牌组、强化牌），两者分开映射 |
| 本地化查找顺序 | 先按条目的 \`set\` 找 \`descriptions[set][最终key]\`，再退回 \`Joker\`、\`Other\`（贴纸就放在 \`Other\` 里） |
| 图集别名 | mod 的 \`SMODS.Atlas\` 会同时以原名和带前缀的名注册，所以 \`atlas='foo'\` 和 \`atlas='tm_foo'\` 都能命中同一张图 |
| 内联文本优先 | \`loc_txt\` 里的 \`name\` 优先于本地化文件 |
| 位置越界 | \`pos\` 超出图集行列的条目**标为无贴图**并写进警告，而不是画一张空白卡 |

### 已经覆盖 / 有意不覆盖

- ✅ 一个 mod 包里**所有** \`.lua\` 都会被扫描（不只是入口文件）
- ✅ \`SMODS.ConsumableType\` 造的新牌型 → 侧栏「Mod 新增类型」分组 + 独立分类
- ✅ \`soul_pos\` 悬浮立绘、\`config\`、\`rarity\`、\`cost\`、\`effect\`、\`order\`、\`weight\`、\`box\` 之外的字段原样保留（详情页可看原始表）
- ✅ 1x 与 2x 图集都支持，\`px/py\` 用 mod 自己声明的值
- ✅ mod 的 zip 和文件夹两种分发形态都支持；zip 里多套一层目录也能自动识别
- ⚠️ **运行时才生成的条目读不到**：例如 \`for k,v in pairs(tbl) do SMODS.Joker{key=k} end\`、或用变量拼 key / atlas 的写法。这类会出现在导入警告里（"跳过 N 条声明"）
- ⚠️ \`loc_vars\` 是函数时，\`#1#\` 这类占位符按原样显示（和原版图鉴里对原版牌的处理一致）
- ⚠️ **覆盖原版**的 mod（\`take_ownership\` 改原版贴图）目前按"新增条目"处理，不会替换已有条目
- ⚠️ \`SMODS.Sprite\` / \`CanvasSprite\` 这类新式精灵 API 暂不支持

> 用法：打开 HTML → 左侧「导入 Mod」→ 把 mod 文件夹或 zip 拖进去。解析结果、跳过项与警告都会写在下方的日志里。`,
  'section 九 body')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
