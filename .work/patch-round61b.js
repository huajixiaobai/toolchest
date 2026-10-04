/* 第六十一轮（补账）：把第 52–61 轮记进 DEVELOPMENT.md（之前一直欠着） */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, '..', 'DEVELOPMENT.md')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const anchor = '**第五十一轮（工程版收尾：抓出并修掉三个真 bug，桌面 / 手机 / 平板三个视口都过）**'
if (s.split(anchor).length - 1 !== 1) { console.error('❌ 记录锚点命中 ' + (s.split(anchor).length - 1)); process.exit(1) }
const E = [
  '**第六十一轮（补账 + ②的验证跑通：八种类型都带上专属内容了）**',
  '- 前几轮一直在赶功能没记账，这里把第 52–61 轮一次性补上（下面几条）。',
  '- 这一轮给场景加了两个**一行汇总**字段，省得每轮都去截 JSON 猜（之前好几轮我就是这么浪费时间的）：',
  '  - `cloneSummary`（按类型克隆的结果）实测：',
  '    ```',
  '    Joker→Joker      专属2 {mult:4, effect:"Mult"}                     cost进Lua:是',
  '    Tarot→Consumable 专属1 {effect:"Disable Blind Effect"}            cost进Lua:是   ← 上一轮欠的复验，已修好',
  '    Planet→Consumable 专属2 {hand_type:"Pair", effect:"Hand Upgrade"}  cost进Lua:是',
  '    Booster→Booster  专属3 {kind:"Arcana", choose:1, extra:3}         cost进Lua:是',
  '    Deck→Back        专属1 {discards:1}                              cost进Lua:是',
  '    Blind→Blind      专属2 {blind_mult:1, blind_dollars:3}           cost进Lua:是   ← 按 raw 真实形状取值后生效',
  '    Tag→Tag          专属1 {type:"store_joker_create"}               cost进Lua:是',
  '    Voucher→Voucher  专属0 {}                                       cost进Lua:是',
  '    ```',
  '  - `perTypeEditSummary`（改一个专属字段，Lua 跟不跟）：盲注 `blind_mult` ✅、补充包 `choose` ✅、牌组 `hand_size` ✅、**优惠券 `voucher_val` ✗（改了没进 Lua）** —— 这是下一轮要修的具体缺口。',
  '',
  '**第六十轮（盲注按真实数据形状取值 + 用上原版给的效果名）**',
  '- 上一轮说「盲注没抓到」，其实是我**找错了层级**：真实形状是 `raw.mult` / `raw.dollars` / `raw.debuff`（我找的是 `config` 那层）。改对后 `tKeys` 从 0 变 2（`blind_mult:1, blind_dollars:3`）。',
  '- **小盲注本来就没有 boss 区间**（只有 BOSS 盲注才有），读不到就留默认、**不编**。',
  '- 用上原版给的 `raw.effect`（`Mult` / `Disable Blind Effect` / `store_joker_create`…）并在提示里如实说明：「原版的效果名是「X」，但它的具体逻辑在游戏源码里是代码，这里只能给你名字和数值」。',
  '',
  '**第五十九轮（修「塔罗/星球/幽灵的类型落空」）**',
  '- 实测证据：克隆 `c_fool` 后 `typeAfter: "Tarot"`。**图鉴里这三种牌的 `cat` 就是 `Tarot`/`Planet`/`Spectral`**，而制作器的类型只有 `Consumable` —— 我原来直接把 `cat` 当类型用，于是类型落成一个不存在的值，`mkItemLua` 的 if/else 链**整条落空**：专属设置不显示、**连 `cost` 都不写进 Lua**（这才是上轮 `luaHasCost: false` 的真因，不是漏了一行）。',
  '- 映射补齐：`Deck→Back`、`Tarot/Planet/Spectral→Consumable`，实测 `typeAfter: "Consumable"`。',
  '- 加 `itemData` 探针查原版数据真实形状（由此发现 `raw.effect` 这些东西）。',
  '',
  '**第五十八轮（接通暴露管道，按类型的克隆验证终于跑起来）**',
  '- 上一轮的 `ReferenceError` 原因：`mkApplyCloneFrom` 定义在 `viewMaker` **内部**，模块级暴露取不到（我先写成 `MKEL` 也取不到）→ 改用**我自己在模块级加过的变量**当中转（`mkApplyCloneImpl`），不再猜作用域。',
  '- 验证一跑起来就连着抓到两个真 bug：① **跨类型残留** —— 克隆塔罗后专属袋里还留着上一张小丑的 `mult/chips/chip_mod`（改成从空开始）；② **牌组会变成不存在的类型** —— 图鉴里牌组的 `cat` 是 `Deck` 而制作器叫 `Back`。',
  '',
  '**第五十七轮（②开工：克隆把专属内容搬进 `MK.t`）**',
  '- 现状是：`MK_TYPE_FIELDS` 每种类型**都已经有字段组**、UI 从 `MK.t[key]` 取值 —— 缺的是**克隆时根本不往 `t` 里写**。',
  '- 现在按类型搬（盲注 boss 区间/mult/dollars/debuff、补充包 kind/choose/extra、牌组参数、消耗品 set、`config` 里的数字字符串兜底），**读不到不编**。',
  '',
  '**第五十五 / 五十六轮（预设即起点 + 查清那个 false）**',
  '- 用户的原话：「哪怕选了预设不代表就这样什么都不能改了……本质是为了方便创作」→ 界面明说「已照「X」复制了一份 —— **下面所有内容都能继续改**……这个标记只是备注，不是锁」。实测克隆后改名字/价格/稀有度都反映到 Lua。',
  '- `editArt: false` 查清：**不是功能坏，是我测试用 `dispatchEvent(new MouseEvent(...))` 派发点击到不了格子的处理器**（同「合成 hover 不触发 CSS」一类坑）。走 DOM 处理器路径实测位置 (0,0)→(8,15) 且 Lua 的 `pos` 跟着变。',
  '- 顺带抓出真 bug：**各类型 Lua 里的 `pos` 是写死的 `{x=0,y=0}`** —— 玩家点别的格子时预览变了、导出没变，游戏里永远显示图集第一格。9 处写死全改成按 `MK.art.pos` 输出。',
  '',
  '**第五十二 / 五十三 / 五十四轮（manifest 修错 + 前置说明 + 三处反馈）**',
  '- **manifest 的 `author` 必须是字符串数组**（Steamodded 的 `json_spec` 里 `type = \'table\'`）—— 原来写成字符串会被判不合法、整包加载失败。这条是真机验证的：修好后游戏日志里出现 `Loader :: Valid JSON file found`。',
  '- 制作器里写明前置要求：**Lovely（注入器）+ Steamodded（框架）缺一不可**，附可核实的链接、正确安装步骤（**解压成文件夹**再放 `%AppData%\\Balatro\\Mods`，重启游戏）、以及 `Mods\\lovely\\log` 排错。同时修掉我之前那句错话「zip 直接丢进去就行」（Steamodded 不读 zip）。',
  '- 按反馈改三处：前置说明块挪到最后一个功能段之后；**「照现成的牌做一个」和「选素材图」合成一件事**（图格子上标出这张图对应哪张牌，点它 = 照这张牌做，Shift 点 = 只换图）；导入动图默认 **2× 慢放** + 播放速度控件。',
  '',
].join('\n')
s = s.replace(anchor, () => E + anchor)
fs.writeFileSync(F, s)
console.log('  ✓ DEVELOPMENT.md 补了第 52–61 轮')
