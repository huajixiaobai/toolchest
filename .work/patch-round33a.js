/* 第三十三轮 A：把动画整块删掉（用户：不像就删），播放回到最朴素的逐步播放。
   app.js 里 3941-4032 这一段（scTweenNum / 结算动画 / scShownAt）整段切掉，
   播放循环、按钮、状态里的 anim 一并还原。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
let n = 0;
const once = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, to); console.log('  ✓ ' + label); n++;
};

/* ① 整段删掉：从「缓动滚动」注释到「一条规则 → 应用到账目上」之前 */
const startMark = '/** 缓动滚动（「简洁」模式用）：只写 textContent，不重画卡图。 */';
const endMark = '/** 一条规则 → 应用到账目上（ref 让界面知道这一步是谁贡献的） */';
const i0 = s.indexOf(startMark), i1 = s.indexOf(endMark);
if (i0 < 0 || i1 < 0 || i1 < i0) { console.error('❌ 找不到删除区间'); process.exit(1) }
s = s.slice(0, i0) + s.slice(i1);
console.log('  ✓ 删掉动画函数段（' + (i1 - i0) + ' 字节）'); n++;

/* ② 播放循环还原成最朴素的逐步播放（520ms 一步，和加动画之前一样） */
once(
  L("    /* 原版的节奏：每一步 0.2~0.3s，最后结算那一行稍长；数字是滚上去的，不是硬跳。 */",
    '    let stepDelay = 300;',
    '    SC_UI.shown = { chips: 0, mult: 0, score: 0 };',
    '    const tick = () => {',
    '      const rr = scoreCompute();',
    '      if (SC_UI.step >= rr.rows.length - 1) { scStopPlay(); render(); return }',
    '      const before = SC_UI.shown || { chips: 0, mult: 0, score: 0 };',
    '      SC_UI.step += 1;',
    '      render();',
    '      const shown = scShownAt(rr, SC_UI.step);',
    '      SC_UI.shown = shown;',
    '      scJuiceStep(host, before, shown, rr.rows[SC_UI.step]);',
    '      stepDelay = (SC_UI.step >= rr.rows.length - 2) ? 460 : 300;',
    '      SC_UI.timer = setTimeout(tick, stepDelay);',
    '    };',
    '    SC_UI.timer = setTimeout(tick, 260);'),
  L('    SC_UI.timer = setInterval(() => {',
    '      const rr = scoreCompute();',
    '      if (SC_UI.step >= rr.rows.length - 1) { scStopPlay(); render(); return }',
    '      SC_UI.step += 1;',
    '      render();',
    '    }, 520);'),
  '播放循环还原'
);

/* ③ 播放按钮：去掉「关闭模式直接出结果」那一支 */
once(
  L('    SC_UI.playing = true;',
    '    SC_UI.step = -1;',
    "    if (SC_UI.anim === 'off') { SC_UI.step = scoreCompute().rows.length - 1; SC_UI.playing = false; render(); return }",
    '    render();'),
  L('    SC_UI.playing = true;', '    SC_UI.step = -1;', '    render();'),
  '播放按钮还原'
);

/* ④ 去掉播放条上的动画切换按钮及其事件 */
once(
  L('    <button class="btn" id="scLast" title="直接看结果">⏭</button>',
    '    <button class="btn" id="scAnim" title="结算动画：原版 = 照引擎的 juice 与飘字；简洁 = 只有数字变化；关闭 = 直接出结果">结算动画：${({ game: \'原版\', plain: \'简洁\', off: \'关闭\' })[SC_UI.anim || \'game\']}</button>'),
  '    <button class="btn" id="scLast" title="直接看结果">⏭</button>',
  '删掉动画切换按钮'
);
once(
  L("  q('#scAnim').onclick = () => {",
    "    const order = ['game', 'plain', 'off'];",
    "    SC_UI.anim = order[(order.indexOf(SC_UI.anim || 'game') + 1) % order.length];",
    '    scStopPlay(); SC_UI.step = -1; render();',
    '  };'),
  '',
  '删掉动画切换事件'
);

/* ⑤ 状态里的 anim 也去掉 */
once(
  L('const SC_UI = { edit: null, step: -1, playing: false, timer: null, order: [], focus: null, joker: null,',
    "  /* 结算动画模式：game = 照原版（juice + 飘字 + 轻抖）/ plain = 只有数字变化 / off = 直接出结果 */",
    "  anim: 'game' };"),
  'const SC_UI = { edit: null, step: -1, playing: false, timer: null, order: [], focus: null, joker: null };',
  '状态里的 anim 去掉'
);

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');

/* ⑥ CSS：删掉飘字 / 轻抖 / pop 相关 */
const C = path.join(__dirname, 'app.css');
let c = fs.readFileSync(C, 'utf8');
const css = [
  '/* 结算飘字（原版 card_eval_status_text / attention_text）：带同色底框，向上浮起淡出 */',
  '.scfloat{position:fixed;transform:translate(-50%,0);color:#fff;font-weight:700;padding:2px 7px;border-radius:6px;',
  '  pointer-events:none;z-index:900;white-space:nowrap;box-shadow:0 3px 0 rgba(0,0,0,.35);text-shadow:0 1px 0 rgba(0,0,0,.35);',
  '  opacity:.96;transition:transform .7s cubic-bezier(.2,.7,.3,1),opacity .7s ease-out}',
  '.scfloat.rise{transform:translate(-50%,-42px);opacity:0}',
  '/* pop（「简洁」模式仍会用到的老样式） */',
  '.scchips b,.scmult b,.scscore b{display:inline-block}',
  '@keyframes scpop{0%{transform:scale(1)}35%{transform:scale(1.16)}100%{transform:scale(1)}}',
  '.scchips b.pop,.scmult b.pop,.scscore b.pop{animation:scpop .24s ease-out}',
  '/* 整屏轻抖（原版 G.ROOM.jiggle += 0.7） */',
  '@keyframes scjiggle{0%{transform:translate(0,0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}',
  '  60%{transform:translate(-1px,2px)}80%{transform:translate(1px,-1px)}100%{transform:translate(0,0)}}',
  '.scstage.jiggle{animation:scjiggle .26s linear;will-change:transform}',
].join('\n');
if (c.split(css).length - 1 !== 1) { console.error('❌ CSS 动画段匹配失败'); process.exit(1) }
c = c.replace(css, '');
c = c.replace(L('@media (prefers-reduced-motion: reduce){',
  '  .scfloat{transition:none}',
  '  .scstage.jiggle{animation:none}',
  '  .scchips b.pop,.scmult b.pop,.scscore b.pop{animation:none}',
  '}'),
  L('@media (prefers-reduced-motion: reduce){', '  .scblindrow,.scblindpick{transition:none}', '}'));
fs.writeFileSync(C, c);
console.log('  ✓ CSS 动画段删掉');
