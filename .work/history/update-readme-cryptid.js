/* README: document the GitHub-source / Cryptid-style packaging support and the two bugs the
   real mod exposed. */
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

/* ---- feature section 10: extend with the two supported packaging styles */
rep(`> 前缀规则按 Steamodded 源码实现：key 先加 mod 前缀再加类前缀，所以 \`SMODS.Joker{key='alpha'}\` 在 \`prefix='tm'\` 的 mod 里最终是 \`j_tm_alpha\`；\`Atlas\` / \`ConsumableType\` 的 key **不加**前缀（它们带 \`prefix_config.key = false\`），但对象里的 \`atlas\` 字段会加，所以两种写法都能认出来。`,
  `> 前缀规则按 Steamodded 源码实现：key 先加 mod 前缀再加类前缀，所以 \`SMODS.Joker{key='alpha'}\` 在 \`prefix='tm'\` 的 mod 里最终是 \`j_tm_alpha\`；\`Atlas\` / \`ConsumableType\` 的 key **不加**前缀（它们带 \`prefix_config.key = false\`），但对象里的 \`atlas\` 字段会加，所以两种写法都能认出来。对象自己写了 \`prefix_config.key = false\` 时也会照办（不加前缀）。

**已经实测通过的三种打包/写法**（都能直接拖进来）：

| 形态 | 例子 | 说明 |
|---|---|---|
| 标准 Steamodded 包 | 普通 mod 文件夹 / zip | \`manifest.json\` + \`<id>.lua\` + \`assets/{1x,2x}\` + \`localization\` |
| **GitHub 源码包** | \`Cryptid.zip\`（GitHub Download ZIP） | 外面套一层 \`Cryptid-main/\`，元数据文件叫 \`Cryptid.json\` 而不是 \`manifest.json\`——**这个现在也能认** |
| **Cryptid 式 item 表** | Cryptid、以及跟着它写的 mod | 内容不是 \`SMODS.Joker{...}\` 调用，而是 \`local x = { object_type = "Joker", key = ..., atlas = ..., pos = ... }\` 这样的普通表；图集用 \`SMODS.Atlas({...})\`（**带括号**）声明 |

> 实测：\`Cryptid.zip\`（v0.5.11，20 MB / 194 个文件）导入后得到 **502 个条目**（小丑 224、幽灵 17、星球 14、塔罗 5、优惠券 29、代码牌 34、盲注 32、标签 31、底注 24、牌组 23、牌套 17、挑战 11、补充包 9、贴纸 8、牌型 8、强化 3、蜡封 2），**0 张空白卡**，30 张图集全部命中，导出 PNG / ZIP 正常。`,
  'feature 10 packaging styles')

/* ---- change log: a new round */
rep(`## 八、更新记录

**第七轮（本轮：Mod 导入已实现）**`,
  `## 八、更新记录

**第八轮（根据 Cryptid.zip 反馈修复）**
- 修：**选文件导入一直失败**。真正的原因是 \`input.files\` 是**活的** FileList，而我在处理函数里先 \`input.value = ''\`（为了能重复选同一个文件）再去读它——读到的已经是空列表，所以只报「没有读到文件」。先快照成数组再清空就好了。**文件夹按钮和 zip 按钮都中招**，也就是说在这之前只有拖拽能用，手机上必然失败。
- 修：**GitHub 源码包读不了**。Cryptid.zip 其实是 GitHub 的 Download ZIP：外面套一层 \`Cryptid-main/\`，而且元数据文件叫 \`Cryptid.json\` 而不是 \`manifest.json\`。旧代码只认 \`manifest.json\`，于是找不到入口 lua，报「没有找到 manifest.json / 没有找到入口 Lua 文件」，一个条目都读不出来。现在会找「根目录下任何长得像 manifest 的 .json」，并据此定位 mod 根目录。
- 新：**支持 Cryptid 式的 item 表**。Cryptid 不用 \`SMODS.Joker{...}\`，而是写 \`local x = { object_type = "Joker", key = ..., atlas = ..., pos = ... }\` 再由自己的加载器注册；图集声明还写成 \`SMODS.Atlas({...})\`（**带括号**）。解析器现在两种调用写法都认，并且会扫描所有「直接带 \`object_type\` 字段的表」。
- 新：**牌套（Sleeve）等自定义类型**。\`CardSleeves.Sleeve({...})\` 这类第三方类的调用现在也能识别，Cryptid 的 17 个牌套会归到「Mod 新增类型 → Sleeve」。
- 修：**mod 条目会错误地套用原版贴图**。原版专属的分类（牌组 / 强化牌 / 蜡封 / 盲注）以前硬编码用 \`centers\`、\`blind_chips\` 这些原版图集，mod 条目一旦没声明 atlas 就会画出一张**毫不相干的原版图**。现在 mod 条目只用它自己声明的图集，没有就老实显示「无贴图」。
- 修：**刚导入时可能有卡片是空白的**。导入时探测图集尺寸用的 \`<img>\` 被丢掉了，绘制时又新建了一个同 URL 的 \`Image\`，它可能还没解码完，于是静默画了张空卡（而且不会重绘）。现在直接复用那个已经解码好的元素。Cryptid 60 张图集全量验证：0 张空白。
- 修：**同一个 key 声明多次**（Cryptid 的占位牌就这么干）以前会变成 \`id@Cryptid@Cryptid\`，现在按「后声明覆盖」合并成一条。
- 新：导入报告的措辞改得更有用——「N 个条目本身没有卡图（Challenge×11、Deck×5、Edition×10）」而不是列一堆 id；mod 自带但没移植的自定义着色器会写清楚。
- 手机：浏览器没有文件夹选择器时，「选择 Mod 文件夹」按钮会置灰并说明原因，不再点了没反应。

**第七轮（Mod 导入已实现）**`,
  'change log 第八轮')

/* ---- section 九: the rules table gets the new findings */
rep(`| \`Atlas\` / \`ConsumableType\` / \`ObjectType\` | 带 \`prefix_config.key = false\`，**key 不加前缀**；但对象里的 \`atlas\` 字段会被加前缀，所以两种写法都试 |`,
  `| \`Atlas\` / \`ConsumableType\` / \`ObjectType\` | 带 \`prefix_config.key = false\`，**key 不加前缀**；但对象里的 \`atlas\` 字段会被加前缀，所以两种写法都试 |
| 对象自带 \`prefix_config.key = false\` | 该对象保持原样的 key（Cryptid 的「已带前缀」条目就是这样） |
| 两种调用写法 | \`SMODS.Joker{...}\` 与 \`SMODS.Atlas({...})\` 都认，\`CardSleeves.Sleeve({...})\` 这类第三方类也认 |
| item 表（\`object_type\`） | 表里直接写 \`object_type = "Joker"\` 的声明也当条目处理，\`object_type\` 就是分类；\`Atlas\` / \`ConsumableType\` / \`ObjectType\` 走各自的注册路径 |`,
  'rules table')

rep(`- ⚠️ **运行时才生成的条目读不到**：例如 \`for k,v in pairs(tbl) do SMODS.Joker{key=k} end\`、或用变量拼 key / atlas 的写法。这类会出现在导入警告里（"跳过 N 条声明"）`,
  `- ✅ **GitHub 源码包**（\`<repo>-main/\` + \`<id>.json\`）与**拍平的目录**都能导入
- ✅ **Cryptid 式 item 表**、\`SMODS.X({...})\` 括号写法、\`CardSleeves.Sleeve\` 等第三方类
- ⚠️ **运行时才生成的条目读不到**：例如 \`for k,v in pairs(tbl) do SMODS.Joker{key=k} end\`、或用变量拼 key / atlas 的写法。这类会出现在导入警告里（"跳过 N 条声明"）`,
  'covered list 1')

rep(`- ⚠️ \`SMODS.Sprite\` / \`CanvasSprite\` 这类新式精灵 API 暂不支持`,
  `- ⚠️ \`SMODS.Sprite\` / \`CanvasSprite\` 这类新式精灵 API 暂不支持
- ⚠️ **mod 自定义着色器没有移植**：Cryptid 有 11 个 \`.fs\`（它的 10 个自定义「版本」靠这些渲染）。这些条目会正常显示牌面，并在详情里写明用的是哪个自定义着色器。想看到真正的效果需要把这套 LÖVE 方言的 \`.fs\` 也接进本页的 WebGL 管线。`,
  'covered list 2')

/* ---- console API + tree */
rep(`A.removeMod('testmod')                           // 卸载`,
  `A.removeMod('testmod')                           // 卸载
A.mods[0].stats                                  // 扫描了多少声明、跳过多少、命中多少图集`,
  'console api')

rep(`├── modimport.js             页面内的 Mod 解析器（zip 解压 / lua 扫描 / 图集与本地化）`,
  `├── modimport.js             页面内的 Mod 解析器（zip 解压 / lua 扫描 / 图集与本地化）
│                            支持 SMODS 两种调用写法、Cryptid 式 object_type 表、GitHub 源码包`,
  'tree modimport')

rep(`└── verify/                 无头 Chrome CDP 自动化验证（39 个场景 + 导出/GIF/APNG 字节校验）`,
  `└── verify/                 无头 Chrome CDP 自动化验证（41 个场景 + 导出/GIF/APNG 字节校验）`,
  'verify count')

rep(`    ├── make-test-mod.js      合成一个测试 mod（含自定义牌型、1x/2x 图集、中英本地化、坏坐标）`,
  `    ├── inspect-zip.js / validate-cryptid.js  直接用真 mod（Cryptid.zip）对账本解析器
    ├── make-test-mod.js      合成一个测试 mod（含自定义牌型、1x/2x 图集、中英本地化、坏坐标）`,
  'tree verify')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
