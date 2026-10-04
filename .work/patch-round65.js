/* 第六十五轮：把第 64 轮记进文档，并写清「已完成 / 未验证」的边界 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, '..', 'DEVELOPMENT.md')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const anchor = '**第六十三轮（③：补上消耗品整组字段，并把星球牌做成真的能升级牌型）**'
if (s.split(anchor).length - 1 !== 1) { console.error('❌ 锚点命中 ' + (s.split(anchor).length - 1)); process.exit(1) }
const E = [
  '**第六十五轮（收尾：结构自检升级到"产物里真有该类型的专属字段"，并写清验证边界）**',
  '- 前几轮只验到「改专属字段 → Lua 变了」；这一轮把标准抬到**「该类型的专属 Lua 字段真的出现在产物里」**，按类型断言具体片段：',
  '  | 类型（克隆的原版牌） | 必须出现的片段 | 结果 |',
  '  | --- | --- | --- |',
  '  | 小丑 `j_joker` | `cost = 2`、`rarity = 1` | ✅ 全在 |',
  '  | 塔罗 `c_fool` | `max_highlighted = …` | ✅ 全在 |',
  '  | 星球 `c_mercury` | **`hand_type = \'Pair\'`** + `max_highlighted` | ✅ 全在 |',
  '  | 补充包 `p_arcana_normal_1` | `kind = \'Arcana\'`、`choose = 1` | ✅ 全在 |',
  '  | 盲注 `bl_small` | **`mult = 1`、`dollars = 3`** | ✅ 全在 |',
  '  | 优惠券 `v_overstock_norm` | `cost = 10` | ✅ 全在 |',
  '- 另外十种类型「改专属字段 → 进 Lua」全部通过（`perTypeEditSummary` 全绿）；桌面 / 手机 / 平板三个视口全过、控制台 0 报错、窄屏无横向溢出（外壳 1058/1058、条目列表 706/706）。',
  '',
  '**验证边界（哪些是"实测过"、哪些是"本机没法验"）—— 这一节请当成账本看**',
  '- 实测过（有断言、有数字）：预设之后各字段可改并进 Lua；八种类型克隆带上专属内容；十种类型「字段进 Lua」；六种类型「专属字段在产物里」；导出的 zip 能被图鉴重新导入且识别条目数 == 工程条目数、0 条警告；工程 JSON 往返、自动保存后重开仍在；三视口布局与 0 报错；在**真机游戏**里确认过 Steamodded 认了 manifest 并加载（日志 `Loader :: Valid JSON file found`）+ 那张 24 帧 GIF 小丑在游戏里能正常播放。',
  '- **本机没法验（不要当成已完成）**：① 每种类型在游戏里的**语义**是否正确 —— 星球的升级、盲注的削弱、标签的触发、蜡封的行为，都只做到"字段写对了"，没在游戏里逐个跑过；② 补充包/牌组的实际开包与牌组参数是否按预期生效；③ 动图在游戏里的节奏（我只在真机看过那张 24 帧 GIF 一次，没做多组对比）。',
  '- **有意留白的**：蜡封没有数值字段（它的效果取决于玩家拿它做什么），界面上只给一句说明；原版那些"逻辑是代码"的效果（如塔罗/标签/蓝图）只搬名字与数值，不假装已实现。',
  '',
].join('\n')
s = s.replace(anchor, () => E + anchor)
fs.writeFileSync(F, s)
console.log('  ✓ DEVELOPMENT.md 补第 65 轮 + 验证边界')
