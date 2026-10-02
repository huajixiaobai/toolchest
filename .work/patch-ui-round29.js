/* 本轮五个问题的修复补丁。每个锚点都断言唯一命中，找不到就退出（不猜）。
   1) 合成台「牌型」栏收起只收内容不收栏位 —— 网格行把卡片拉齐到最高那一张
   2) 弹窗下拉白底白字 + 去掉不相干的「剩余次数」
   3) 卡图上的小按钮重做（悬停/按下/聚焦反馈 + 只有按钮吃指针）
   4) 主体格子排版规范化（固定格子宽 + 名字两行定高）
   5) 花色配色：游戏运行时用 SO_1 / 高对比用 SO_2，我们以前用的是 globals 里的字面值 */
const fs = require('fs');
const path = require('path');
let n = 0;
const patch = (file, pairs) => {
  const F = path.join(__dirname, file);
  let s = fs.readFileSync(F, 'utf8');
  for (const [from, to, label] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) { console.error('❌ ' + file + ' :: ' + label + ' 命中 ' + hits + ' 次，放弃'); process.exit(1); }
    s = s.replace(from, to);
    console.log('  ✓ ' + file + ' :: ' + label);
    n++;
  }
  fs.writeFileSync(F, s);
};

patch('databuild.js', [
  [
    "const LOC_COLOURS = {",
    "/* game.lua:42-46 一启动就把 G.C.SUITS 换成 SO_1（高对比 colourblind_option 打开时换 SO_2），\n" +
    "   button_callbacks.lua:1757-1761 切开关时也做同样的事。所以「按花色上色」的文字（{C:spades} 这类）\n" +
    "   用的是 SO_1，而不是 globals 里 SUITS 的字面值 —— 我们以前取的是字面值，和游戏里的颜色对不上。 */\n" +
    "const SO_1 = GC.SO_1 || {}, SO_2 = GC.SO_2 || {}\n" +
    "const suitAt = (tbl, k) => rgbaToHex((tbl && tbl[k]) || GC.SUITS?.[k])\n" +
    "const SUIT_STD = {}, SUIT_HC = {}\n" +
    "for (const [tag, key] of [['spades', 'Spades'], ['hearts', 'Hearts'], ['clubs', 'Clubs'], ['diamonds', 'Diamonds']]) {\n" +
    "  SUIT_STD[tag] = suitAt(SO_1, key)\n" +
    "  SUIT_HC[tag] = suitAt(SO_2, key)\n" +
    "}\n" +
    "const LOC_COLOURS = {",
    '花色配色：引入 SO_1 / SO_2'
  ],
  [
    "  spades: rgbaToHex(GC.SUITS?.Spades), hearts: rgbaToHex(GC.SUITS?.Hearts),\n" +
    "  clubs: rgbaToHex(GC.SUITS?.Clubs), diamonds: rgbaToHex(GC.SUITS?.Diamonds),",
    "  ...SUIT_STD,",
    '花色用运行时那一套'
  ],
  [
    "  suits: Object.fromEntries(Object.entries(GC.SUITS || {}).map(([k, v]) => [k, rgbaToHex(v)])),",
    "  suits: SUIT_STD, suitsHC: SUIT_HC,",
    '调色板里同时给出两套花色'
  ],
  [
    "  colors: { tags: LOC_COLOURS, palette: PALETTE },",
    "  colors: { tags: LOC_COLOURS, tagsHC: Object.assign({}, LOC_COLOURS, SUIT_HC), palette: PALETTE },",
    '颜色数据带上高对比一套'
  ],
]);

patch('app.js', [
  [
    "const TAGCOL = D.colors.tags;",
    "const TAGCOL = D.colors.tags;\n" +
    "/* 花色文字的颜色：游戏里 G.C.SUITS 有两套（SO_1 标准 / SO_2 高对比），\n" +
    "   合成台的「高对比牌面」开关决定用哪一套。 */\n" +
    "const TAGCOL_HC = D.colors.tagsHC || TAGCOL;\n" +
    "let SUIT_HC = false;\n" +
    "const tagCol = (k) => ((SUIT_HC ? TAGCOL_HC[k] : null) || TAGCOL[k] || null);",
    '花色配色取两套'
  ],
  ["        if (k === 'C') { color = TAGCOL[v] || null; }", "        if (k === 'C') { color = tagCol(v); }", 'markup 用 tagCol'],
  ["        else if (k === 'X') { color = TAGCOL[v] || color; xStyle = true; }", "        else if (k === 'X') { color = tagCol(v) || color; xStyle = true; }", 'markup 用 tagCol(X)'],
  [
    "function render () {\n  if (detailTimer) { clearInterval(detailTimer); detailTimer = null; }",
    "function render () {\n  SUIT_HC = !!(S.forge && S.forge.variants);   /* 高对比开关同时决定花色文字用 SO_1 还是 SO_2 */\n  if (detailTimer) { clearInterval(detailTimer); detailTimer = null; }",
    'render 同步高对比开关'
  ],
  [
    "  mv.className = 'scmv';",
    "  /* 第一张 / 最后一张的按钮条贴边，免得伸出栏外看不见 */\n  mv.className = 'scmv' + (i === 0 ? ' atstart' : '') + (i === arr.length - 1 ? ' atend' : '');",
    '按钮条贴边'
  ],
  [
    "    (i > 0 ? btn('-1', '◀', '往前挪') : '') +\n    (i < arr.length - 1 ? btn('1', '▶', '往后挪') : '') +\n    btn('dup', '⧉', '复制一张') +\n    btn('del', '✕', '移除');",
    "    (i > 0 ? btn('-1', '◀', '往前挪（左）') : '') +\n    (i < arr.length - 1 ? btn('1', '▶', '往后挪（右）') : '') +\n    btn('dup', '⧉', '复制一张') +\n    btn('del', '✕', '移除这张');",
    '按钮提示语'
  ],
  [
    "/** 改一张小丑牌：记录值（原版里它自己累计的数）+ 手填修正 */",
    "/** 「记录值」只列游戏源码里真的会累加 / 递减的字段。\n" +
    " *  从规则表达式猜出来的那些（古老小丑的 extra 之类）其实是配置参数：描述里已经给了就地控件，\n" +
    " *  再在弹窗里列一行「剩余次数」只会让人看不懂。 */\n" +
    "function scIsRecordField (j, f) {\n" +
    "  const scanned = ((JOKER_STATE.jokers || {})[j.name] || {}).mutable || [];\n" +
    "  if (scanned.indexOf(f) >= 0) return true;\n" +
    "  if (scanned.length) return false;                       /* 源码扫到过这张牌：只信扫出来的 */\n" +
    "  const top = String(f).split('.')[0];\n" +
    "  return typeof (j.cfg || {})[top] !== 'number';           /* mod 的牌：配置里写死的参数不算记录值 */\n" +
    "}\n\n" +
    "/** 改一张小丑牌：记录值（原版里它自己累计的数）+ 手填修正 */",
    '记录值字段的判定'
  ],
  [
    "  const fields = j.fields || [];",
    "  const fields = (j.fields || []).filter((f) => scIsRecordField(j, f));",
    '弹窗只列真记录值'
  ],
]);

patch('app.css', [
  [
    ".forge .opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:14px;align-content:start}",
    "/* align-items:start 很关键：网格默认把同一行的卡片拉到一样高，于是「牌型」栏收起了内容\n" +
    "   却还留着一个 400px 高的空框（实测收起后 box 仍是 416px）—— 看起来就像没收起。 */\n" +
    ".forge .opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:14px;align-content:start;align-items:start}",
    '网格不再拉齐高度'
  ],
  [
    "#content .opt[data-gkey=\"base\"] .chips{max-height:min(48vh,360px);overflow:auto;overscroll-behavior:contain;padding-right:2px}",
    "#content .opt[data-gkey=\"base\"] .chips{max-height:min(48vh,360px);overflow:auto;overscroll-behavior:contain;padding-right:2px}\n" +
    "/* 主体格子：固定格宽 + 名字两行定高。以前是 flex 自适应宽度，名字长短不同（红桃2 vs 红桃Queen）\n" +
    "   就把格子撑成 72~94px 各种宽度，行与行、列与列全对不齐。 */\n" +
    "#content .opt[data-gkey=\"base\"] .chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}\n" +
    "#content .opt[data-gkey=\"base\"] .pick{width:100%;min-width:0;height:56px;overflow:hidden;align-items:center}\n" +
    "#content .opt[data-gkey=\"base\"] .pick canvas{flex:0 0 auto}\n" +
    "#content .opt[data-gkey=\"base\"] .pick>span{\n" +
    "  flex:1 1 auto;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;\n" +
    "  overflow:hidden;line-height:1.3;word-break:break-word}\n" +
    "#content .opt[data-gkey=\"base\"] .pick .pickmod{\n" +
    "  position:absolute;top:-6px;right:-4px;margin:0;box-shadow:0 0 0 1px #131c24}",
    '主体格子规范化'
  ],
  [
    ".scgrowf select{width:110px}",
    "/* 原生下拉在 Windows 上是白底：深色主题里必须显式给 option 上色，\n" +
    "   否则选项列表白底白字，鼠标没指上去之前根本看不清。 */\n" +
    "select{color-scheme:dark}\n" +
    "select option{background:#374244;color:#f2f6f8}\n" +
    ".scgrowf select{width:110px}",
    '下拉选项配色'
  ],
  [
    "/* 小按钮：抬到牌上方 30px，下面用 padding 撑出一条透明桥接到牌顶。\n" +
    "   从牌面往上一路移过去都在命中区里，不会再出现\"鼠标看着像能点、其实还差一截\"。 */\n" +
    ".sctile .scmv{position:absolute;top:-30px;left:50%;transform:translateX(-50%);display:none;gap:3px;z-index:210;\n" +
    "  padding:2px 3px 24px;background:#1b2225cc;border-radius:8px 8px 0 0}\n" +
    ".sctile:hover .scmv{display:flex}\n" +
    ".sctile .scmv button{font-size:10px;line-height:1;padding:3px 6px;border:0;border-radius:4px;background:var(--c-lblack);color:#fff;cursor:pointer;box-shadow:var(--g-emboss)}",
    "/* 卡图上的小按钮（重做）：\n" +
    "   以前是 top:-30px 再加 24px 的 padding 当\"透明桥\"，那条深色桥看着像按钮其实点不到、\n" +
    "   还盖住牌顶 14px —— 指针判定就是这么被误导的。现在：条只有按钮那么高、不吃指针（只有按钮吃），\n" +
    "   按钮自己做悬停 / 按下 / 聚焦反馈。 */\n" +
    ".sctile .scmv{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:5px;display:none;gap:4px;z-index:260;pointer-events:none}\n" +
    ".sctile:hover .scmv,.sctile:focus-within .scmv,.sctile.sel .scmv,.sctile.on .scmv{display:flex}\n" +
    ".sctile .scmv.atstart{left:0;transform:none}\n" +
    ".sctile .scmv.atend{left:auto;right:0;transform:none}\n" +
    ".sctile .scmv button{\n" +
    "  pointer-events:auto;min-width:24px;min-height:22px;padding:0 5px;font-size:12px;line-height:1;\n" +
    "  border:1px solid #6d8188;border-radius:5px;background:#232c2f;color:#fff;cursor:pointer;\n" +
    "  box-shadow:0 2px 0 rgba(0,0,0,.35);transition:background .1s,transform .1s,border-color .1s,color .1s}\n" +
    ".sctile .scmv button:hover{background:var(--c-red);border-color:#ffffff66;transform:translateY(-1px)}\n" +
    ".sctile .scmv button:active{background:#c94a42;transform:translateY(1px)}\n" +
    ".sctile .scmv button:focus-visible{outline:2px solid var(--c-money);outline-offset:1px}\n" +
    "/* 角标不吃指针：命中判定永远落在牌本身，不会再出现\"看着在牌上、其实点在角标上\" */\n" +
    ".sctile .scbadge,.sctile .scred{pointer-events:none}",
    '卡图按钮重做'
  ],
]);

console.log('共 ' + n + ' 处改动');
