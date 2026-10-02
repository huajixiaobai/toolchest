/* 第三十一轮：
   ① BOSS 盲注 + 被削弱的牌 / 小丑牌（声明式规则照 blind.lua 写，mod 的盲注同样走这条路）
   ② 「已载入上次解析的素材」提示条加关闭按钮 + 自动收起
   ③ 算分播放更接近原版（数字滚动 + pop + 卡图轻弹），只改 textContent/class，不动卡图 */
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

const BLIND = [
  "/* ================================================================ BOSS 盲注",
  " * 原版里「影响这一手怎么算」的盲注效果分两类：",
  " *  ① 声明式的削弱规则（blind.lua:625-645 与 debuff_hand）：`debuff = { suit=… }` /",
  " *     `{ is_face='face' }` / `{ value=… }` / `{ nominal=… }`，以及 `{ hand=… }` / `{ h_size_ge=… }` /",
  " *     `{ h_size_le=… }`。我们照源码写成通用判定 —— mod 的盲注只要按同一格式声明 debuff，",
  " *     就自动生效，不需要为每个 mod 单独适配。",
  " *  ② 写在代码里的那几个（The Arm 降等级 / The Flint 数值减半 / Verdant Leaf 全削弱 /",
  " *     Crimson Heart 禁小丑）：按盲注 key 列一张小表；mod 想接自己的盲注，往",
  " *     `B.score.blindRules['bl_xxx']` 塞一条即可（见 DEVELOPMENT.md）。",
  " * 被削弱的牌整张跳过（state_events.lua:655）—— 不算筹码/倍率，强化·版本·蜡封也不触发。 */",
  "const SC_BLIND_RULES = {",
  "  bl_arm: { handLevel: -1, note: '打出的牌型等级 −1（本手按降级后的数值结算）' },",
  "  bl_flint: { halfBase: true, note: '本手的基础筹码与倍率减半' },",
  "  bl_final_leaf: { debuffAll: true, note: '所有牌都被削弱（卖掉一张小丑牌之前）' },",
  "  bl_final_heart: { note: '每手随机禁用一张小丑牌 —— 在小丑牌弹窗里勾「被禁用」' },",
  "  bl_final_acorn: { note: '会打乱小丑牌顺序（顺序可以直接拖）' },",
  "  bl_final_bell: { note: '总有一张牌处于选中状态（不影响算分）' },",
  "  bl_psychic: { needCards: 5, note: '必须打出 5 张牌' },",
  "  bl_eye: { note: '本回合不能重复打出同一种牌型' },",
  "  bl_mouth: { note: '本回合只能打出一种牌型' },",
  "  bl_needle: { env: { handsLeft: 1 }, note: '本回合只有 1 次出牌' },",
  "  bl_water: { env: { discardsLeft: 0 }, note: '本回合没有弃牌次数' },",
  "  bl_hook: { env: { discardsLeft: 2 }, note: '每打一手弃 2 张牌' },",
  "  bl_wall: { note: '只是盲注需求更大（不影响这一手的分）' },",
  "  bl_final_vessel: { note: '只是盲注需求更大' },",
  "  bl_ox: { note: '只影响金钱' }, bl_tooth: { note: '只影响金钱' },",
  "  bl_house: { note: '只影响起手发牌（面朝下）' }, bl_fish: { note: '只影响抽牌（面朝下）' },",
  "  bl_wheel: { note: '只影响抽牌（面朝下）' }, bl_serpent: { note: '只影响抽牌与弃牌' },",
  "  bl_manacle: { note: '只影响手牌上限' }, bl_mark: { note: '只影响起手发牌（面朝下）' },",
  "};",
  "/* 控制台 / mod 都能往这里加：B.score.blindRules['bl_myboss'] = { halfBase: true, note: '…' } */",
  "const SC_BLIND_RULES_EXTRA = {};",
  "function scBlindItem () { return SC.blind ? BY_ID[SC.blind] : null }",
  "function scBlindRule (it) {",
  "  if (!it) return null;",
  "  const key = it.key || it.id || '';",
  "  return SC_BLIND_RULES_EXTRA[key] || SC_BLIND_RULES[key] || null;",
  "}",
  "function scSuitName (en) {",
  "  const m = D.loc && D.loc[S.lang] && D.loc[S.lang].misc;",
  "  return (m && m.suits_plural && m.suits_plural[en]) || en;",
  "}",
  "/** 声明式削弱：与 blind.lua:625-645 一一对应（mod 的盲注同样走这里） */",
  "function scSpecDebuffs (card, spec) {",
  "  if (!spec) return false;",
  "  if (spec.all) return true;",
  "  if (spec.suit && SUIT_EN[card.suit] === spec.suit) return true;",
  "  if (spec.is_face === 'face' && ['J', 'Q', 'K'].indexOf(card.rank) >= 0) return true;",
  "  if (spec.value && String(spec.value) === String(card.rank)) return true;",
  "  if (spec.nominal && String(spec.nominal) === String(RANK_ID[card.rank])) return true;",
  "  return false;",
  "}",
  "/** 这张牌现在算不算被削弱（手动勾的 + 盲注自动判定的） */",
  "function scCardDebuffed (card) {",
  "  if (card.debuff) return true;",
  "  const it = scBlindItem();",
  "  if (!it) return false;",
  "  const rule = scBlindRule(it);",
  "  if (rule && rule.debuffAll) return true;",
  "  return !!(it.raw && it.raw.debuff && scSpecDebuffs(card, it.raw.debuff));",
  "}",
  "/** 盲注下拉：列表直接来自图鉴条目，所以 mod 的盲注自动在里面 */",
  "function scBlindOptions () {",
  "  const list = ITEMS.filter((i) => i.cat === 'Blind' && i.raw && i.raw.boss);",
  "  return '<option value=\"\">（不算盲注）</option>' + list.map((b) =>",
  "    '<option value=\"' + b.id + '\"' + (SC.blind === b.id ? ' selected' : '') + '>' + esc(nm(b)) + (b.source ? ' · MOD' : '') + '</option>').join('');",
  "}",
  "/** 盲注说明：它自己的本地化描述 + 我们的注解 + 自动削弱了几张 + 认不出来时明说 */",
  "function scBlindNoteHtml () {",
  "  const it = scBlindItem();",
  "  if (!it) return '没选盲注：这一手按普通回合算。';",
  "  const rule = scBlindRule(it);",
  "  const spec = (it.raw && it.raw.debuff) || {};",
  "  const desc = ((it.text && (it.text[S.lang] || it.text['en-us'])) || []).join(' ');",
  "  const bits = [];",
  "  if (desc) bits.push(desc);",
  "  if (spec.suit) bits.push('所有' + scSuitName(spec.suit) + '牌被削弱');",
  "  if (spec.is_face === 'face') bits.push('所有人头牌（J/Q/K）被削弱');",
  "  if (spec.value) bits.push('点数 ' + spec.value + ' 的牌被削弱');",
  "  if (spec.nominal) bits.push('点数 ' + spec.nominal + ' 的牌被削弱');",
  "  if (spec.h_size_ge) bits.push('必须打出至少 ' + spec.h_size_ge + ' 张牌');",
  "  if (spec.h_size_le) bits.push('最多打出 ' + spec.h_size_le + ' 张牌');",
  "  if (rule && rule.note) bits.push(rule.note);",
  "  const auto = SC.played.filter((c) => scCardDebuffed(c)).length;",
  "  if (auto) bits.push('<b>这手里有 ' + auto + ' 张牌被削弱、不参与算分</b>');",
  "  if (!rule && !Object.keys(spec).length) bits.push('这个盲注的效果本页不认识（多半来自 mod）—— 用卡牌弹窗里的「被削弱」和小丑牌弹窗里的「被禁用」手动补，也可以在控制台往 score.blindRules 里加一条');",
  "  return bits.join('　·　');",
  "}",
  "",
  "function scoreCompute () {"
].join('\n');

patch('app.js', [
  ["  played: [], held: [], jokers: [],", "  played: [], held: [], jokers: [], blind: '',", '状态里加盲注'],
  ["function scoreCompute () {", BLIND, '盲注规则与判定'],
  [
    "  const lvl = Math.max(1, Math.min(99, SC.level | 0));",
    "  const lvl0 = Math.max(1, Math.min(99, SC.level | 0));\n" +
    "  const blindIt = scBlindItem();\n" +
    "  const bRule = blindIt ? scBlindRule(blindIt) : null;\n" +
    "  /* The Arm：本手按降级后的等级结算 */\n" +
    "  const lvl = (bRule && bRule.handLevel) ? Math.max(1, lvl0 + bRule.handLevel) : lvl0;",
    '等级受 The Arm 影响'
  ],
  [
    "  rows.push({ label: `牌型「${hand.name}」Lv.${lvl}`, chips, mult, op: 'base', ref: { kind: 'hand' } });",
    "  rows.push({ label: `牌型「${hand.name}」Lv.${lvl}`, chips, mult, op: 'base', ref: { kind: 'hand' } });\n" +
    "  if (blindIt) {\n" +
    "    rows.push({ label: `BOSS 盲注「${blindIt.name}」` + (bRule && bRule.note ? '：' + bRule.note : ''), chips, mult, op: 'blind', ref: { kind: 'blind' } });\n" +
    "    if (bRule && bRule.halfBase) {   /* The Flint：blind.lua:511-514，先减半再进逐牌 / 小丑 */\n" +
    "      chips = Math.max(0, Math.floor(chips * 0.5 + 0.5));\n" +
    "      mult = Math.max(1, Math.floor(mult * 0.5 + 0.5));\n" +
    "      rows.push({ label: 'The Flint：基础筹码与倍率减半', chips, mult, op: 'x', ref: { kind: 'blind' } });\n" +
    "    }\n" +
    "  }",
    '盲注账目行 + The Flint'
  ],
  [
    "    const c = SC.played[ci];\n    const cref = { kind: 'played', i: ci };\n    let reps = 1;",
    "    const c = SC.played[ci];\n    const cref = { kind: 'played', i: ci };\n" +
    "    if (scCardDebuffed(c)) {\n" +
    "      /* state_events.lua:655：被削弱的牌整张跳过 */\n" +
    "      rows.push({ label: `${c.rank}${SUIT_SYM[c.suit]} 被削弱 → 不参与算分`, chips, mult, op: 'debuff', ref: cref });\n" +
    "      continue;\n" +
    "    }\n" +
    "    let reps = 1;",
    '被削弱的牌整张跳过'
  ],
  [
    "      const rule = jokerRule(j);\n      if (rule && rule.k === 'repeat' && condMatchesCard(rule.c || '', c)) {",
    "      if (j.debuff) continue;   /* 被禁用的小丑牌不参与（也不复制） */\n" +
    "      const rule = jokerRule(j);\n      if (rule && rule.k === 'repeat' && condMatchesCard(rule.c || '', c)) {",
    '被禁用的重复小丑不参与'
  ],
  [
    "        if (cfg.effect === 'Suit Mult' && cfg.extra && SUIT_EN[c.suit] === cfg.extra.suit) {",
    "        if (!j.debuff && cfg.effect === 'Suit Mult' && cfg.extra && SUIT_EN[c.suit] === cfg.extra.suit) {",
    '被禁用的花色小丑不参与'
  ],
  [
    "  for (let ji = 0; ji < SC.jokers.length; ji++) {\n    const j = SC.jokers[ji];\n    const jref = { kind: 'joker', i: ji };",
    "  for (let ji = 0; ji < SC.jokers.length; ji++) {\n    const j = SC.jokers[ji];\n    const jref = { kind: 'joker', i: ji };\n" +
    "    if (j.debuff) { rows.push({ label: `${scJokerName(j)} 被禁用 → 不参与算分`, chips, mult, op: 'debuff', ref: jref }); continue }",
    '被禁用的小丑整张跳过'
  ],
  [
    "        <div class=\"scrowhead\"><span>整体修改</span>",
    "        <div class=\"scblindbox\">\n" +
    "          <label class=\"scev scsel2\" title=\"选一个 BOSS 盲注，它在这一手里的效果会自动算进去；列表里连 mod 的盲注一起有\">\n" +
    "            <span>BOSS 盲注</span><select id=\"scBlind\">${scBlindOptions()}</select></label>\n" +
    "          <div class=\"scblindnote\" id=\"scBlindNote\">${scBlindNoteHtml()}</div>\n" +
    "        </div>\n" +
    "        <div class=\"scrowhead\"><span>整体修改</span>",
    '盲注选择器'
  ],
  [
    "  q('#scHandType').onchange = (e) => {",
    "  q('#scBlind').onchange = (e) => { scStopPlay(); SC.blind = e.target.value; SC_UI.step = -1; render() };\n" +
    "  q('#scHandType').onchange = (e) => {",
    '盲注下拉事件'
  ],
  [
    "      scPillGrid('点数', ranks, c.rank, 'rank') + scPillGrid('花色', suits, c.suit, 'suit') +",
    "      scPillGrid('点数', ranks, c.rank, 'rank') + scPillGrid('花色', suits, c.suit, 'suit') +\n" +
    "      scPillGrid('削弱', [['', '正常'], ['1', '被削弱（不参与算分）']], c.debuff ? '1' : '', 'debuff') +",
    '卡牌弹窗加「被削弱」'
  ],
  [
    "      '<div class=\"scgrowbox\"><div class=\"scgrowtitle\">版本（影响这张牌的结算：闪箔 +50 筹码 / 镭射 +10 倍率 / 多彩 ×1.5 / 负片）</div>' +",
    "      '<div class=\"scgrowbox\"><div class=\"scgrowtitle\">这张牌是否被禁用（被禁用的小丑牌完全不参与算分 —— BOSS 盲注点名禁用时用这个）</div>' +\n" +
    "      scPillGrid('禁用', [['', '正常'], ['1', '被禁用']], j.debuff ? '1' : '', 'debuff') +\n" +
    "      '</div>' +\n" +
    "      '<div class=\"scgrowbox\"><div class=\"scgrowtitle\">版本（影响这张牌的结算：闪箔 +50 筹码 / 镭射 +10 倍率 / 多彩 ×1.5 / 负片）</div>' +",
    '小丑弹窗加「被禁用」'
  ],
  [
    "/** 一条规则 → 应用到账目上（ref 让界面知道这一步是谁贡献的） */",
    "/** 原版那种「数字跳一下」的手感：数字从旧值滚到新值，框再 pop 一下。\n" +
    " *  只写 textContent 与 class —— 不重画任何卡图，所以对性能没有影响。 */\n" +
    "function scTweenNum (el, from, to, ms, fmt) {\n" +
    "  if (!el || !isFinite(from) || !isFinite(to)) return;\n" +
    "  const t0 = performance.now();\n" +
    "  const step = (now) => {\n" +
    "    const k = Math.min(1, (now - t0) / ms);\n" +
    "    el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));\n" +
    "    if (k < 1) requestAnimationFrame(step);\n" +
    "  };\n" +
    "  requestAnimationFrame(step);\n" +
    "}\n" +
    "function scJuiceStep (host, prev, now) {\n" +
    "  const pop = (el, from, to, ms, fmt) => {\n" +
    "    if (!el) return;\n" +
    "    if (from !== to) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); scTweenNum(el, from, to, ms, fmt) }\n" +
    "  };\n" +
    "  pop(host.querySelector('.scchips b'), prev.chips, now.chips, 200, (v) => String(Math.round(v)));\n" +
    "  pop(host.querySelector('.scmult b'), prev.mult, now.mult, 200, (v) => String(Math.round(v * 100) / 100));\n" +
    "  pop(host.querySelector('.scscore b'), prev.score, now.score, 300, (v) => Math.floor(v).toLocaleString());\n" +
    "  const on = host.querySelector('.sctile.on');\n" +
    "  if (on) { on.classList.remove('pulse'); void on.offsetWidth; on.classList.add('pulse') }\n" +
    "}\n" +
    "/** 第 i 步时面板上该显示的数字（播放动画拿它当滚动起点 / 终点） */\n" +
    "function scShownAt (r, i) {\n" +
    "  const row = (i >= 0 && i < r.rows.length) ? r.rows[i] : null;\n" +
    "  return row ? { chips: row.chips, mult: row.mult, score: Math.floor(row.chips * row.mult) } : { chips: 0, mult: 0, score: 0 };\n" +
    "}\n\n" +
    "/** 一条规则 → 应用到账目上（ref 让界面知道这一步是谁贡献的） */",
    '数字滚动与 pop'
  ],
  [
    "    SC_UI.timer = setInterval(() => {\n" +
    "      const rr = scoreCompute();\n" +
    "      if (SC_UI.step >= rr.rows.length - 1) { scStopPlay(); render(); return }\n" +
    "      SC_UI.step += 1;\n" +
    "      render();\n" +
    "    }, 520);",
    "    /* 原版的节奏：每一步 0.2~0.3s，最后结算那一行稍长；数字是滚上去的，不是硬跳。 */\n" +
    "    let stepDelay = 300;\n" +
    "    SC_UI.shown = { chips: 0, mult: 0, score: 0 };\n" +
    "    const tick = () => {\n" +
    "      const rr = scoreCompute();\n" +
    "      if (SC_UI.step >= rr.rows.length - 1) { scStopPlay(); render(); return }\n" +
    "      const before = SC_UI.shown || { chips: 0, mult: 0, score: 0 };\n" +
    "      SC_UI.step += 1;\n" +
    "      render();\n" +
    "      const shown = scShownAt(rr, SC_UI.step);\n" +
    "      SC_UI.shown = shown;\n" +
    "      scJuiceStep(host, before, shown);\n" +
    "      stepDelay = (SC_UI.step >= rr.rows.length - 2) ? 460 : 300;\n" +
    "      SC_UI.timer = setTimeout(tick, stepDelay);\n" +
    "    };\n" +
    "    SC_UI.timer = setTimeout(tick, 260);",
    '播放节奏 + 数字滚动'
  ],
]);

patch('boot.js', [
  [
    "    const acts = el('div', 'bootcacheacts')\n" +
    "    const swap = el('button', 'btn', '换一个游戏文件')\n" +
    "    const drop2 = el('button', 'btn', '清除已存素材')\n" +
    "    acts.appendChild(swap); acts.appendChild(drop2)\n" +
    "    bar.appendChild(txt); bar.appendChild(acts)\n" +
    "    document.body.appendChild(bar)\n" +
    "    swap.onclick = async () => { await cacheDrop(); location.reload() }\n" +
    "    drop2.onclick = async () => { await cacheDrop(); bar.remove() }",
    "    const acts = el('div', 'bootcacheacts')\n" +
    "    const swap = el('button', 'btn', '换一个游戏文件')\n" +
    "    const drop2 = el('button', 'btn', '清除已存素材')\n" +
    "    const close = el('button', 'bootcachex', '✕')\n" +
    "    close.title = '收起这条提示（素材还留着，下次照旧）'\n" +
    "    close.setAttribute('aria-label', '关闭')\n" +
    "    close.style.cssText = 'background:none;border:0;color:#cfd8de;font-size:15px;line-height:1;padding:6px 8px;cursor:pointer;border-radius:6px'\n" +
    "    acts.appendChild(swap); acts.appendChild(drop2); acts.appendChild(close)\n" +
    "    bar.appendChild(txt); bar.appendChild(acts)\n" +
    "    document.body.appendChild(bar)\n" +
    "    swap.onclick = async () => { await cacheDrop(); location.reload() }\n" +
    "    drop2.onclick = async () => { await cacheDrop(); bar.remove() }\n" +
    "    /* 自己也会收起：20 秒后淡出；鼠标停在上面就暂停计时（正在看的时候别抢走） */\n" +
    "    const hide = () => { bar.classList.add('gone'); setTimeout(() => bar.remove(), 260) }\n" +
    "    let hideTimer = setTimeout(hide, 20000)\n" +
    "    bar.addEventListener('mouseenter', () => clearTimeout(hideTimer))\n" +
    "    bar.addEventListener('mouseleave', () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 6000) })\n" +
    "    close.onclick = () => { clearTimeout(hideTimer); hide() }",
    '提示条加关闭按钮与自动收起'
  ],
]);

patch('app.css', [
  [
    ".scrowhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}",
    "/* ---- BOSS 盲注：下拉 + 说明 ---- */\n" +
    ".scblindbox{background:#313b3d;border-radius:var(--g-r);padding:8px 10px;margin-bottom:8px}\n" +
    ".scblindbox select{max-width:100%}\n" +
    ".scblindnote{font-size:11.5px;line-height:1.6;color:#cfd8de;margin-top:6px}\n" +
    ".scblindnote b{color:var(--c-red)}\n" +
    "/* 被削弱 / 被禁用那几行账目：红色调，一眼看出这一手为什么少分 */\n" +
    ".scline.debuff,.scline.blind{color:#ffb4ad}\n" +
    "/* 播放时的数字跳动（原版那种 juice）：只动 transform，交给合成器 */\n" +
    ".scchips b,.scmult b,.scscore b{display:inline-block}\n" +
    "@keyframes scpop{0%{transform:scale(1)}35%{transform:scale(1.16)}100%{transform:scale(1)}}\n" +
    ".scchips b.pop,.scmult b.pop,.scscore b.pop{animation:scpop .24s ease-out}\n" +
    "@keyframes scpulse{0%{transform:translateY(calc(var(--ay,0px) - 19px)) rotate(var(--ar,0deg)) scale(1)}\n" +
    "  45%{transform:translateY(calc(var(--ay,0px) - 23px)) rotate(var(--ar,0deg)) scale(1.07)}\n" +
    "  100%{transform:translateY(calc(var(--ay,0px) - 19px)) rotate(var(--ar,0deg)) scale(1)}}\n" +
    ".sctile.on.pulse{animation:scpulse .26s ease-out}\n" +
    "@media (prefers-reduced-motion: reduce){\n" +
    "  .scchips b.pop,.scmult b.pop,.scscore b.pop,.sctile.on.pulse{animation:none}\n" +
    "}\n" +
    ".scrowhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}",
    '盲注块样式 + 播放动画'
  ],
]);

console.log('共 ' + n + ' 处改动');
