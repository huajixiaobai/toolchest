// Replace the placeholder mod-design section with findings from reading Steamodded's source.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, '..', '..', 'README.md')
let s = fs.readFileSync(f, 'utf8')
const i = s.indexOf('## 八、关于导入 Mod 素材')
if (i < 0) { console.log('section not found'); process.exit(1) }
s = s.slice(0, i)

const section = `## 八、关于导入 Mod 素材（前置源码调研结论，尚未实现）

### 先说清楚前置是什么

Balatro **没有创意工坊**。社区 mod 散落在 **GitHub / Thunderstore / Nexus（N 网）**，通用前置是自己得手动装的两层：

1. **Lovely Injector** —— 一个 DLL 注入器，负责让游戏加载 Lua
2. **Steamodded（smods）** —— Lua 框架，向游戏注入 \`SMODS.*\` API

所以「导入 mod」面对的不是统一格式，而是各家自行打包的目录/zip。

### 一个 mod 长什么样

Steamodded 自己的仓库就是最标准的参考 mod：

\`\`\`
<Mod>/
├── manifest.json          { name, version_number, website_url, description,
│                            dependencies: ["Thunderstore-lovely-0.9.0"], ... }
├── config.lua
├── <id>.lua               ← 入口文件，就是一个普通 Lua chunk
├── assets/
│   ├── 1x/*.png           ← 和原版完全一样的目录约定
│   ├── 2x/*.png
│   └── sounds/
└── localization/
    └── zh_CN.lua          ← 和原版完全一样的格式
\`\`\`

加载器实际做的事情就是一行：

\`\`\`lua
assert(load(NFS.read(mod.path .. mod.main_file)))()
\`\`\`

也就是说 **mod 的数据是"跑"出来的**，不是声明式的。

### 注册对象的方式

\`\`\`lua
SMODS.Atlas { key = 'foo', path = 'foo.png', px = 71, py = 95 }   -- px/py/path 必填
SMODS.Joker {
    key = 'bar', atlas = 'foo', pos = {x=0,y=0},
    rarity = 2, cost = 6, config = { extra = 3 },
    loc_txt = { name = 'Bar', text = { '每次打出对子时 +3 倍率' } },
}
\`\`\`

- 对象就是**普通 Lua 表**；\`SMODS.X{...}\` 调用即注册
- 每个对象自带 \`o.mod = SMODS.current_mod\` → **来源信息现成**
- key 会自动加前缀，默认取 mod id 前 4 个小写字母（\`cry_\`、\`jape_\`…）
- 图集进入 \`G.ASSET_ATLAS\`，\`columns = w/px, rows = h/py\` —— **和原版完全同一套模型**，现有的切图逻辑可以直接用
- mod 也能用 \`soul_pos\` / \`soul_atlas\`，所以悬浮立绘那套也适用

### 你提到的「独立类型 + 自己的栏」——确认存在

\`SMODS.ConsumableType\`：

\`\`\`lua
SMODS.ConsumableType { key = 'mytype', primary_colour = G.C.RED, secondary_colour = G.C.GOLD }
SMODS.Consumable { set = 'mytype', key = 'thing', atlas = 'foo', pos = {x=0,y=0} }
\`\`\`

它会注册 \`G.C.SET[key]\`、\`G.localization.descriptions[key]\`，带自己的 \`collection_rows\`，并进入 \`SMODS.ConsumableType.visible_buffer\` —— **收藏界面里就是一个独立页签**，既不在小丑栏也不在塔罗/星球/幽灵栏。\`SMODS.ObjectType\` 同理，可以做任意新的分类池。

**这意味着图鉴的分类必须是动态的**：分类 = 条目自己的 \`set\`，而不是我硬编码的那十几个。否则 mod 的新类型会被塞进错误的分类。

### \`SMODS.*\` 的规模

公开字段共 **200 个**（含工具函数）。其中会产出素材/条目的注册类：

| 类别 | 类型 |
|---|---|
| 图集与图像 | \`Atlas\` \`Sprite\` \`CanvasSprite\` \`DrawStep\` \`Font\` \`Gradient\` \`ScreenShader\` \`Shader\` \`Sound\` |
| 牌与条目 | \`Joker\` \`Consumable\` \`Voucher\` \`Back\` \`Booster\` \`Enhancement\` \`Edition\` \`Seal\` \`Tag\` \`Blind\` \`Stake\` \`Challenge\` \`PokerHand\` \`DeckSkin\` \`UndiscoveredSprite\` \`Rarity\` |
| **分类** | \`ObjectType\` \`ConsumableType\` ← 新牌型/新页签 |
| 其它 | \`Achievement\` \`Keybind\` \`JimboQuip\` \`SpriteParticle\` \`Scoring_*\` \`RunSelect*\` |

### 落地路线（结论）

**仍然不需要装前置。** 但比上一版判断更靠后一点：

- **路线 A（纯静态解析）**：只对"一张图 + 一条 \`SMODS.Joker{}\`"这类简单 mod 有效。因为入口是 \`load()\` 一整段 Lua，遇到循环生成、\`loc_vars\` 函数、按语言分支的 \`path\` 表就会漏读。
- **路线 B（构建期跑 Lua VM + 自带 SMODS 桩）**：把上面那 200 个字段里**注册类**的实现成"只记录、不执行"的空壳（\`SMODS.X{...}\` 把表存进数组就返回），然后照 Steamodded 的做法 \`load()\` mod 入口。这样**动态类型、动态 key、动态图集也能读全**，而且照样不用安装 Lovely / Steamodded —— API 面由我们自己提供。代价仅是**构建管线**多一个纯 JS Lua 5.3 依赖，产出的 HTML 依然零依赖。

考虑到 \`ConsumableType\` 这种动态类型很常见，**我倾向直接做 B**，A 作为兜底。

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

> 这一节是源码调研结论，导入功能还没有实现。
`

s = s.trimEnd() + '\n\n---\n\n' + section
fs.writeFileSync(f, s)
console.log('✅ README section 八 rewritten from source findings')
