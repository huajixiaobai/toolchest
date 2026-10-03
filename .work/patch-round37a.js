/* 第三十七轮：
   ① render() 不再把页面滚回顶部（所有工具都受益：点选项不再"跳变"）
   ② 「做什么」和「长什么样」合并成一段（都影响预览）
   ③ 类型专属字段：盲注/补充包/牌组/优惠券/标签/强化/版本/蜡封 都能做出成品
   ④ 「它做什么」里加"游戏里会显示成"的原版形式描述预览，并指出和哪张原版牌效果相同
   ⑤ 动图预览修好：render 之后要重新启动逐帧播放（之前定时器在旧 DOM 上自杀了） */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

/* ---------- ① 保住滚动位置 ---------- */
rep(
  L("function render () {",
    "  SUIT_HC = !!(S.forge && S.forge.variants);   /* 高对比开关同时决定花色文字用 SO_1 还是 SO_2 */",
    "  if (detailTimer) { clearInterval(detailTimer); detailTimer = null; }"),
  L("function render () {",
    "  SUIT_HC = !!(S.forge && S.forge.variants);   /* 高对比开关同时决定花色文字用 SO_1 还是 SO_2 */",
    "  /* 重建 DOM 会让滚动条跳回顶部 —— 记下来再还原，点选项时就不会「跳变」了 */",
    "  const keepScroll = (sel) => { const el = document.querySelector(sel); return el ? el.scrollTop : 0 };",
    "  const prevScroll = { content: keepScroll('#content'), sidebar: keepScroll('#sidebar'), page: window.scrollY || 0 };",
    "  const restoreScroll = () => {",
    "    const c = document.querySelector('#content'); if (c) c.scrollTop = prevScroll.content;",
    "    const sb = document.querySelector('#sidebar'); if (sb) sb.scrollTop = prevScroll.sidebar;",
    "    if (prevScroll.page && !document.querySelector('#content')) window.scrollTo(0, prevScroll.page);",
    "  };",
    "  requestAnimationFrame(restoreScroll);   /* 下一帧还原：不用管 render() 在哪一行结束 */",
    "  if (detailTimer) { clearInterval(detailTimer); detailTimer = null; }"),
  '记住滚动位置');
/* 还原放在下一帧：不用去猜 render() 在哪一行结束 */

/* ---------- ③ 类型专属字段表 + 状态 ---------- */
rep(
  "const MK = {",
  L('/* 每种类型"专属"要填的东西（都在界面上，不用猜）：键 / 标签 / 类型 / 选项 / 默认值 */',
    'const MK_TYPE_FIELDS = {',
    "  Blind: [['boss_min', '起始底注', 'num', 1], ['boss_max', '结束底注', 'num', 10], ['blind_mult', '盲注需求倍数', 'num', 2],",
    "    ['blind_dollars', '奖励金钱', 'num', 5], ['debuff_suit', '削弱哪个花色', 'sel', [['', '不削弱'], ['Spades', '黑桃'], ['Hearts', '红桃'], ['Clubs', '梅花'], ['Diamonds', '方片']]],",
    "    ['debuff_face', '削弱人头牌', 'bool', false]],",
    "  Booster: [['kind', '包的类型', 'sel', [['Arcana', '秘术（塔罗）'], ['Celestial', '天界（星球）'], ['Standard', '标准（扑克）'], ['Buffoon', '小丑'], ['Spectral', '幽灵']]],",
    "    ['choose', '可选几张', 'num', 1], ['extra', '给几张牌', 'num', 3], ['cost', '价格', 'num', 4]],",
    "  Back: [['hand_size', '手牌上限', 'num', 8], ['hands', '出牌次数', 'num', 4], ['discards', '弃牌次数', 'num', 3],",
    "    ['dollars', '起始金钱', 'num', 4], ['joker_slot', '小丑栏位', 'num', 5], ['consumable_slot', '消耗品栏位', 'num', 2]],",
    "  Voucher: [['voucher_kind', '效果', 'sel', [['none', '占位（自己在高级里补）'], ['dollars', '立刻给钱'], ['handsize', '手牌上限 +1'], ['discards', '弃牌次数 +1'], ['slot', '小丑栏位 +1']]], ['voucher_val', '数值', 'num', 10]],",
    "  Tag: [['tag_kind', '触发时', 'sel', [['dollars', '给一笔钱'], ['tarot', '给一张塔罗'], ['planet', '给一张星球'], ['reroll', '免费重掷']]], ['tag_val', '数值', 'num', 5]],",
    "  Enhanced: [['chips', '固定 +筹码', 'num', 30], ['mult', '固定 +倍率', 'num', 4]],",
    "  Edition: [['chips', '固定 +筹码', 'num', 0], ['mult', '固定 +倍率', 'num', 0], ['xmult', '×倍率', 'num', 1.5]],",
    "  Seal: [['seal_note', '蜡封没有数值字段 —— 它的效果由玩家拿它做什么决定', 'text', '']],",
    '};',
    'const MK = {'),
  '类型字段表');
rep(
  "  advanced: false, lua: null, luaDirty: false, config: '',",
  "  advanced: false, lua: null, luaDirty: false, config: '', t: {},",
  '状态加 t');

/* ---------- ④ 描述预览 + 和原版对照 ---------- */
rep(
  "/** 顶部那一行实时摘要 */",
  L('/** 和哪张原版牌的效果一样（只有一条效果时给个参照，用户一眼知道自己在做什么） */',
    'function mkClosestVanilla () {',
    '  if (MK.effects.length !== 1) return null;',
    '  const e = MK.effects[0];',
    '  const want = e.eff === "chips" ? /chip/ : e.eff === "mult" ? /mult$/ : e.eff === "xmult" ? /xmult/i : null;',
    '  if (!want) return null;',
    '  const val = Number(e.val) || 0;',
    '  const rules = (typeof JOKER_RULES !== "undefined" && JOKER_RULES.rules) || [];',
    '  for (const it of ITEMS) {',
    '    if (it.cat !== "Joker") continue;',
    '    const r = rules.filter((x) => x.n === it.name)[0];',
    '    if (!r || !r.e || r.k === "manual") continue;',
    '    const hit = r.e.some((ex) => want.test(ex.split("=")[0]));',
    '    if (!hit) continue;',
    '    const cfg = it.config || {};',
    '    const nums = [cfg.extra && cfg.extra.chips, cfg.extra && cfg.extra.mult, cfg.extra && cfg.extra.x_mult, cfg.chip_mod, cfg.mult_mod, cfg.Xmult_mod, typeof cfg.extra === "number" ? cfg.extra : null];',
    '    if (nums.some((v) => typeof v === "number" && Math.abs(v - val) < 1e-6)) return { name: nm(it, "zh_CN"), id: it.id };',
    '  }',
    '  return null;',
    '}',
    '/** 「游戏里会显示成」：一行一条效果，数字按效果分色（和游戏里那套配色一致） */',
    'function mkDescHtml () {',
    '  if (!MK.effects.length) return "<span class=\\"mkdim\\">（还没有效果）</span>";',
    '  const colour = { chips: "#009dff", mult: "#fe5f55", xmult: "#f3b958", dollars: "#4bc292", reps: "#a782d1" };',
    '  const lines = MK.effects.map((e) => {',
    '    const c = mkCondText(e);',
    '    let head = "";',
    '    if (e.when === "card") head = "每张" + (c || "打出的") + "牌";',
    '    else if (e.when === "hand") head = "打出这一手" + (c ? "（" + c + "）" : "");',
    '    else if (e.when === "held") head = "留在手里的" + (c || "每张") + "牌";',
    '    else if (e.when === "repetition") head = (c || "打出的牌") + "再结算一次";',
    '    else if (e.when === "discard") head = "每次弃牌";',
    '    else if (e.when === "independent") head = "每张牌独立结算时";',
    '    else if (e.when === "sell") head = "这张牌被卖掉时";',
    '    return head + " " + "<b style=\\"color:" + (colour[e.eff] || "#fff") + "\\">" + esc(mkEffText(e)) + "</b>";',
    '  });',
    '  const twin = mkClosestVanilla();',
    '  return lines.join("<br>") + (twin ? "<br><span class=\\"mkdim\\">（和原版「" + esc(twin.name) + "」的效果相同）</span>" : "");',
    '}',
    '/** 顶部那一行实时摘要 */'),
  '描述预览');

/* ---------- ⑤ 动图：render 之后要重新开始播放 ---------- */
rep(
  "  { const sum = document.querySelector('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml() }",
  L("  { const sum = document.querySelector('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml() }",
    "  /* 重建 DOM 会把之前的定时器挂空（它挂在旧节点上会自杀），所以每渲染一次都要重新起 */",
    "  if (MK.art.frames && MK.art.frames.length > 1) { if (mkAnimTimer) { clearInterval(mkAnimTimer); mkAnimTimer = null } mkStartAnim() }"),
  '动图重新播放');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动（第一批）');
