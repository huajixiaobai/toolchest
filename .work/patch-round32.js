/* 第三十二轮：
   ① 盲注选择重做：点开是「名字 + 效果」列表（不用先选了才知道效果），按钮/行按手指尺寸放大
   ② 去掉旧的那个没用的「BOSS 盲注」勾选（改由盲注下拉推导）
   ③ 结算动画按源码重做（moveable.lua 的 juice_up + common_events.lua 的浮字），并加模式切换按键 */
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
/* 多行字符串用这个拼，避免手写 "+" 时漏行 */
const L = (...lines) => lines.join('\n');

/* ---------------- 盲注：效果文本 + 大块当前盲注 + 选择弹窗 ---------------- */
const BLIND_UI = L(
  '/** 盲注的效果文本（不依赖当前选择：列表里每一行也要用它） */',
  'function scBlindEffectText (it) {',
  "  if (!it) return '';",
  '  const rule = scBlindRule(it);',
  '  const spec = (it.raw && it.raw.debuff) || {};',
  "  const desc = ((it.text && (it.text[S.lang] || it.text['en-us'])) || []).join(' ');",
  '  const bits = [];',
  '  if (desc) bits.push(desc);',
  "  if (!desc && spec.suit) bits.push('所有' + scSuitName(spec.suit) + '牌被削弱');",
  "  if (!desc && spec.is_face === 'face') bits.push('所有人头牌（J/Q/K）被削弱');",
  "  if (!desc && spec.value) bits.push('点数 ' + spec.value + ' 的牌被削弱');",
  "  if (!desc && spec.nominal) bits.push('点数 ' + spec.nominal + ' 的牌被削弱');",
  "  if (spec.h_size_ge) bits.push('必须打出至少 ' + spec.h_size_ge + ' 张牌');",
  "  if (spec.h_size_le) bits.push('最多打出 ' + spec.h_size_le + ' 张牌');",
  '  if (rule && rule.note) bits.push(rule.note);',
  "  if (!rule && !Object.keys(spec).length) bits.push('本页不认识它的效果（多半来自 mod）—— 用卡牌的「被削弱」和小丑牌的「被禁用」手动补');",
  "  return bits.join('　·　');",
  '}',
  '/** 当前盲注那一块：名字大、效果直接写出来（不用先选了才知道） */',
  'function scBlindBoxHtml () {',
  '  const it = scBlindItem();',
  '  const auto = SC.played.filter((c) => scCardDebuffed(c)).length;',
  '  if (!it) {',
  '    return \'<div class="scblindcur none"><div class="scblindrowmain"><div class="scblindname">不算盲注</div>\' +',
  '      \'<div class="scblindfx">这一手按普通回合算。点「选择盲注」挑一个 BOSS，它的效果（谁被削弱、等级变化…）会自动算进去。</div></div>\' +',
  '      \'<button class="btn primary scblindpick" type="button">选择盲注</button></div>\';',
  '  }',
  '  return \'<div class="scblindcur"><div class="scblindrowmain"><div class="scblindname">\' + esc(nm(it)) + (it.source ? \' <i class="mod">MOD</i>\' : \'\') + \'</div>\' +',
  '    \'<div class="scblindfx">\' + scBlindEffectText(it) + (auto ? \'<span class="scblinda">这手里 \' + auto + \' 张牌被削弱</span>\' : \'\') + \'</div></div>\' +',
  '    \'<button class="btn scblindpick" type="button">换一个</button>\' +',
  '    \'<button class="btn scblindclear" type="button">取消</button></div>\';',
  '}',
  '/** 选择弹窗：一行一个盲注，名字与效果都写出来（列表来自图鉴条目，mod 的盲注自动在里面） */',
  'function scBlindPicker () {',
  "  const old = document.getElementById('scBlindPick');",
  '  if (old) old.remove();',
  "  const root = document.createElement('div');",
  "  root.id = 'scBlindPick'; root.className = 'scpick scmodal';",
  "  const list = ITEMS.filter((i) => i.cat === 'Blind' && i.raw && i.raw.boss);",
  '  root.innerHTML = \'<div class="scpickpanel"><div class="scpicktop"><b>选择 BOSS 盲注</b>\' +',
  '    \'<span class="dim">\' + list.length + \' 个（含 mod）</span>\' +',
  '    \'<input id="scBlindQ" placeholder="搜索名字或效果…" autocomplete="off">\' +',
  '    \'<button class="btn" id="scBlindDone" type="button">关闭</button></div>\' +',
  '    \'<div class="scpanelscroll scblindlist" id="scBlindList"></div></div>\';',
  '  document.body.appendChild(root);',
  '  const q = (s) => root.querySelector(s);',
  '  const rowHtml = (it) => {',
  '    if (!it) return \'<button class="scblindrow none" data-blind=""><b>不算盲注</b><span>这一手按普通回合算</span></button>\';',
  "    const cur = SC.blind === it.id ? ' on' : '';",
  '    return \'<button class="scblindrow\' + cur + \'" data-blind="\' + it.id + \'"><b>\' + esc(nm(it)) +',
  '      (it.source ? \' <i class="mod">MOD</i>\' : \'\') + (cur ? \' <i class="cur">当前</i>\' : \'\') + \'</b>\' +',
  '      \'<span>\' + scBlindEffectText(it) + \'</span></button>\';',
  '  };',
  '  const paint = (query) => {',
  "    const s = (query || '').toLowerCase();",
  "    const hit = list.filter((i) => !s || (nm(i) + ' ' + scBlindEffectText(i) + ' ' + i.id).toLowerCase().includes(s));",
  "    q('#scBlindList').innerHTML = rowHtml(null) + (hit.length ? hit.map(rowHtml).join('')",
  '      : \'<div class="hint" style="padding:14px">没有匹配的盲注</div>\');',
  '  };',
  "  paint('');",
  "  q('#scBlindQ').oninput = (e) => paint(e.target.value);",
  "  q('#scBlindDone').onclick = () => root.remove();",
  '  root.onclick = (e) => {',
  '    if (e.target === root) { root.remove(); return }',
  "    const row = e.target.closest('[data-blind]');",
  '    if (!row) return;',
  "    scStopPlay(); SC.blind = row.dataset.blind || ''; SC_UI.step = -1; render();",
  '  };',
  "  document.addEventListener('keydown', function esc (e) {",
  "    if (e.key !== 'Escape') return;",
  "    document.removeEventListener('keydown', esc);",
  '    root.remove();',
  '  });',
  '}'
);

/* ---------------- 结算动画：照源码 ---------------- */
const ANIM = L(
  '/* ================================================================ 结算动画',
  ' * 全部照原版源码：',
  ' *  · 数字框抖动：engine/moveable.lua:juice_up —— 0.4s 阻尼正弦，',
  ' *      scale = (1-0.6*amt) + amt*sin(50.8*t)*max(0,(1-t/0.4)^3)',
  ' *      rot   = r_amt*sin(40.8*t)*max(0,(1-t/0.4)^2)      （amt 默认 0.4，HUD 上用 0.3）',
  ' *  · 飘字：common_events.lua:779 card_eval_status_text —— 筹码 a_chips「+#1#」配筹码蓝、',
  ' *      倍率 a_mult「+#1#倍率」配倍率红、倍数 a_xmult「X#1#倍率」，被削弱就是「被削弱」；',
  ' *      文字带同色底框，从牌上方浮起淡出（默认 0.65s×1.25）。',
  ' *  · 结算到某张牌时原版会 card:juice_up(0.6, 0.1) 并把 G.ROOM.jiggle 加 0.7（整屏轻抖）。',
  ' * 模式由「结算动画」按键切换：原版 / 简洁（只有数字变，就是这一轮之前的样子）/ 关闭（不逐步播放）。 */',
  'function scJuice (el, amt, rot, ms) {',
  "  if (!el || SC_UI.anim === 'plain' || SC_UI.anim === 'off') return;",
  '  const a = amt == null ? 0.4 : amt;',
  '  const r0 = rot || 0;',
  '  const dur = (ms == null ? 400 : ms) / 1000;',
  '  const t0 = performance.now();',
  '  const loop = (now) => {',
  '    const t = (now - t0) / 1000;',
  "    if (t >= dur) { el.style.transform = ''; return }",
  '    const dec = Math.max(0, 1 - t / dur);',
  '    const s = (1 - 0.6 * a) + a * Math.sin(50.8 * t) * Math.pow(dec, 3);',
  '    const r = r0 * Math.sin(40.8 * t) * Math.pow(dec, 2) * 57.2958;',
  "    el.style.transform = 'scale(' + s.toFixed(4) + ') rotate(' + r.toFixed(2) + 'deg)';",
  '    requestAnimationFrame(loop);',
  '  };',
  '  requestAnimationFrame(loop);',
  '}',
  '/** 飘字（原版 attention_text）：带同色底框，从锚点上方浮起并淡出 */',
  'function scFloatText (anchor, text, colour, scale) {',
  "  if (!anchor || !text || SC_UI.anim !== 'game') return;",
  '  const r = anchor.getBoundingClientRect();',
  "  const el = document.createElement('span');",
  "  el.className = 'scfloat';",
  '  el.textContent = text;',
  "  el.style.background = colour;",
  "  el.style.fontSize = ((scale || 0.7) * 15).toFixed(1) + 'px';",
  "  el.style.left = Math.round(r.left + r.width / 2) + 'px';",
  "  el.style.top = Math.round(r.top - 4) + 'px';",
  '  document.body.appendChild(el);',
  "  requestAnimationFrame(() => { el.classList.add('rise') });",
  '  setTimeout(() => el.remove(), 900);',
  '}',
  '/** 结算到某张牌：牌自己抖一下（原版 0.6 / 0.1）+ 牌桌轻抖（G.ROOM.jiggle） */',
  'function scJuiceCard (tile, host) {',
  "  if (!tile || SC_UI.anim !== 'game') return;",
  '  scJuice(tile, 0.6, 0.1);',
  "  const stage = host.querySelector('.scstage');",
  "  if (stage) { stage.classList.remove('jiggle'); void stage.offsetWidth; stage.classList.add('jiggle') }",
  '}',
  '/** 每一步的动画：数字直接变（原版如此），抖的是框；飘字按这一步的效果类型选文案与颜色。',
  ' *  简洁模式走回旧的缓动滚动，关闭模式什么都不做。 */',
  'function scJuiceStep (host, prev, now, row) {',
  "  const chipsEl = host.querySelector('.scchips b'), multEl = host.querySelector('.scmult b');",
  "  const scoreEl = host.querySelector('.scscore b');",
  "  if (SC_UI.anim === 'plain') {",
  '    scTweenNum(chipsEl, prev.chips, now.chips, 200, (v) => String(Math.round(v)));',
  '    scTweenNum(multEl, prev.mult, now.mult, 200, (v) => String(Math.round(v * 100) / 100));',
  '    scTweenNum(scoreEl, prev.score, now.score, 300, (v) => Math.floor(v).toLocaleString());',
  '    return;',
  '  }',
  "  if (SC_UI.anim === 'off') return;",
  '  const dChips = now.chips - prev.chips, dMult = now.mult - prev.mult;',
  "  if (dChips) scJuice(host.querySelector('.scchips'), 0.3, 0);",
  "  if (dMult) scJuice(host.querySelector('.scmult'), 0.3, 0);",
  '  scJuice(scoreEl, 0.25, 0);',
  "  const tile = host.querySelector('.sctile.on');",
  "  const op = row && row.op;",
  "  if (op === 'debuff') scFloatText(tile, '被削弱', '#fe5f55', 0.6);",
  "  else if (op === 'x' && prev.mult) scFloatText(tile, 'X' + (Math.round((now.mult / prev.mult) * 100) / 100) + '倍率', '#fe5f55', 0.7);",
  "  else if (dMult) scFloatText(tile, '+' + (Math.round(dMult * 100) / 100) + '倍率', '#fe5f55', 0.7);",
  "  else if (dChips) scFloatText(tile, '+' + Math.round(dChips), '#009dff', 0.7);",
  '  scJuiceCard(tile, host);',
  '}'
);

/* ---------------- CSS ---------------- */
const CSS = L(
  '/* ---- BOSS 盲注：当前那一块（名字 + 效果直接写出来）+ 选择弹窗 ---- */',
  '.scblindbox{background:#313b3d;border-radius:var(--g-r);padding:10px 12px;margin-bottom:8px}',
  '.scblindcur{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
  '.scblindcur.none .scblindname{color:var(--c-jgrey)}',
  '.scblindrowmain{flex:1 1 260px;min-width:0}',
  '.scblindname{font-size:16px;font-weight:700;color:#fff;text-shadow:var(--g-txt)}',
  '.scblindname .mod{font-style:normal;font-size:10px;letter-spacing:.5px;background:var(--c-purple);color:#fff;border-radius:4px;padding:1px 5px;vertical-align:2px}',
  '.scblindfx{font-size:12.5px;line-height:1.6;color:#cfd8de;margin-top:3px}',
  '.scblinda{display:inline-block;margin-left:8px;color:#ffb4ad;font-weight:700}',
  '.scblindpick,.scblindclear{flex:0 0 auto;min-height:38px}',
  '.scblindlist{display:flex;flex-direction:column;gap:6px;padding:10px}',
  '.scblindrow{display:flex;flex-direction:column;gap:3px;text-align:left;width:100%;min-height:56px;',
  '  background:#18232d;border:1px solid var(--line2);border-radius:8px;padding:9px 12px;cursor:pointer;transition:.12s}',
  '.scblindrow:hover{border-color:var(--accent);background:#1d2a35}',
  '.scblindrow.on{border-color:var(--accent);background:#12352b}',
  '.scblindrow b{font-size:14px;color:#fff;font-weight:700}',
  '.scblindrow b .mod{font-style:normal;font-size:10px;background:var(--c-purple);color:#fff;border-radius:4px;padding:1px 5px;vertical-align:2px}',
  '.scblindrow b .cur{font-style:normal;font-size:10px;background:var(--c-green,#4bc292);color:#0d2118;border-radius:4px;padding:1px 5px;vertical-align:2px}',
  '.scblindrow span{font-size:12px;line-height:1.5;color:#b9c6cf}',
  '.scblindrow.none b{color:var(--c-jgrey)}',
  '/* 结算飘字（原版 card_eval_status_text / attention_text）：带同色底框，向上浮起淡出 */',
  '.scfloat{position:fixed;transform:translate(-50%,0);color:#fff;font-weight:700;padding:2px 7px;border-radius:6px;',
  '  pointer-events:none;z-index:900;white-space:nowrap;box-shadow:0 3px 0 rgba(0,0,0,.35);text-shadow:0 1px 0 rgba(0,0,0,.35);',
  '  opacity:.96;transition:transform .7s cubic-bezier(.2,.7,.3,1),opacity .7s ease-out}',
  '.scfloat.rise{transform:translate(-50%,-42px);opacity:0}',
  '/* 整屏轻抖（G.ROOM.jiggle += 0.7） */',
  '@keyframes scjiggle{0%{transform:translate(0,0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}',
  '  60%{transform:translate(-1px,2px)}80%{transform:translate(1px,-1px)}100%{transform:translate(0,0)}}',
  '.scstage.jiggle{animation:scjiggle .26s linear}',
  '/* 触屏 / 平板：行与按钮按手指尺寸放大 */',
  '@media (hover:none){',
  '  .scblindrow{min-height:68px;padding:12px 14px}',
  '  .scblindrow b{font-size:15px}',
  '  .scblindrow span{font-size:12.5px}',
  '  .scblindpick,.scblindclear{min-height:46px;font-size:14px}',
  '}',
  '@media (prefers-reduced-motion: reduce){',
  '  .scfloat{transition:none}',
  '  .scstage.jiggle{animation:none}',
  '}'
);

patch('app.js', [
  ['/** 盲注下拉：列表直接来自图鉴条目，所以 mod 的盲注自动在里面 */', BLIND_UI + '\n/** 盲注下拉：列表直接来自图鉴条目，所以 mod 的盲注自动在里面 */', '盲注选择 UI'],
  [
    L('        <div class="scblindbox">',
      '          <label class="scev scsel2" title="选一个 BOSS 盲注，它在这一手里的效果会自动算进去；列表里连 mod 的盲注一起有">',
      '            <span>BOSS 盲注</span><select id="scBlind">${scBlindOptions()}</select></label>',
      '          <div class="scblindnote" id="scBlindNote">${scBlindNoteHtml()}</div>',
      '        </div>'),
    '        <div class="scblindbox">${scBlindBoxHtml()}</div>',
    '盲注块换成大块'
  ],
  [
    "  q('#scBlind').onchange = (e) => { scStopPlay(); SC.blind = e.target.value; SC_UI.step = -1; render() };",
    L("  q('.scblindpick').onclick = () => scBlindPicker();",
      "  { const cx = q('.scblindclear'); if (cx) cx.onclick = () => { scStopPlay(); SC.blind = ''; SC_UI.step = -1; render() } }"),
    '盲注按钮事件'
  ],
  [
    '          <label class="scevc"><input type="checkbox" data-envflag="bossBlind"${SC.env.bossBlind ? \' checked\' : \'\'}><span>BOSS 盲注</span></label>\n',
    '',
    '删掉旧的没用的勾选'
  ],
  [
    '  const bRule = blindIt ? scBlindRule(blindIt) : null;',
    L('  const bRule = blindIt ? scBlindRule(blindIt) : null;',
      '  /* 「BOSS 盲注」这个局面开关以前要手勾，现在由盲注选择推导：',
      '     选了盲注 = 这一手就是 BOSS 盲注（依赖 G.GAME.blind.boss 的牌才判得对） */',
      '  SC.env.bossBlind = !!(blindIt && blindIt.raw && blindIt.raw.boss);'),
    'bossBlind 由盲注推导'
  ],
  [
    L('/** 原版那种「数字跳一下」的手感：数字从旧值滚到新值，框再 pop 一下。',
      ' *  只写 textContent 与 class —— 不重画任何卡图，所以对性能没有影响。 */',
      'function scTweenNum (el, from, to, ms, fmt) {'),
    '/** 缓动滚动（「简洁」模式用）：只写 textContent，不重画卡图。 */\nfunction scTweenNum (el, from, to, ms, fmt) {',
    '旧的滚动注释'
  ],
  [
    L('function scJuiceStep (host, prev, now) {',
      '  const pop = (el, from, to, ms, fmt) => {',
      '    if (!el) return;',
      "    if (from !== to) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); scTweenNum(el, from, to, ms, fmt) }",
      '  };',
      "  pop(host.querySelector('.scchips b'), prev.chips, now.chips, 200, (v) => String(Math.round(v)));",
      "  pop(host.querySelector('.scmult b'), prev.mult, now.mult, 200, (v) => String(Math.round(v * 100) / 100));",
      "  pop(host.querySelector('.scscore b'), prev.score, now.score, 300, (v) => Math.floor(v).toLocaleString());",
      "  const on = host.querySelector('.sctile.on');",
      "  if (on) { on.classList.remove('pulse'); void on.offsetWidth; on.classList.add('pulse') }",
      '}'),
    ANIM,
    '结算动画按源码重做'
  ],
  [
    '      const shown = scShownAt(rr, SC_UI.step);\n      SC_UI.shown = shown;\n      scJuiceStep(host, before, shown);',
    '      const shown = scShownAt(rr, SC_UI.step);\n      SC_UI.shown = shown;\n      scJuiceStep(host, before, shown, rr.rows[SC_UI.step]);',
    '播放传 row'
  ],
  [
    '    SC_UI.playing = true;\n    SC_UI.step = -1;\n    render();',
    L('    SC_UI.playing = true;',
      '    SC_UI.step = -1;',
      "    if (SC_UI.anim === 'off') { SC_UI.step = scoreCompute().rows.length - 1; SC_UI.playing = false; render(); return }",
      '    render();'),
    '关闭模式直接出结果'
  ],
  [
    '    <button class="btn" id="scLast" title="直接看结果">⏭</button>',
    L('    <button class="btn" id="scLast" title="直接看结果">⏭</button>',
      '    <button class="btn" id="scAnim" title="结算动画：原版 = 照引擎的 juice 与飘字；简洁 = 只有数字变化；关闭 = 直接出结果">结算动画：${({ game: \'原版\', plain: \'简洁\', off: \'关闭\' })[SC_UI.anim || \'game\']}</button>'),
    '播放条加动画切换'
  ],
  [
    "  q('#scFirst').onclick = () => { scStopPlay(); stepTo(-1) };",
    L("  q('#scAnim').onclick = () => {",
      "    const order = ['game', 'plain', 'off'];",
      "    SC_UI.anim = order[(order.indexOf(SC_UI.anim || 'game') + 1) % order.length];",
      '    scStopPlay(); SC_UI.step = -1; render();',
      '  };',
      "  q('#scFirst').onclick = () => { scStopPlay(); stepTo(-1) };"),
    '动画切换事件'
  ],
  ["const SC_UI = { edit: null, step: -1, playing: false, timer: null, order: [], focus: null, joker: null };",
    "const SC_UI = { edit: null, step: -1, playing: false, timer: null, order: [], focus: null, joker: null,\n" +
    "  /* 结算动画模式：game = 照原版（juice + 飘字 + 轻抖）/ plain = 只有数字变化 / off = 直接出结果 */\n" +
    "  anim: 'game' };",
    '状态默认原版动画'],
]);

patch('app.css', [
  ['.scblindbox{background:#313b3d;border-radius:var(--g-r);padding:8px 10px;margin-bottom:8px}\n.scblindbox select{max-width:100%}\n.scblindnote{font-size:11.5px;line-height:1.6;color:#cfd8de;margin-top:6px}\n.scblindnote b{color:var(--c-red)}', CSS, '盲注块与飘字样式'],
]);

console.log('共 ' + n + ' 处改动');
