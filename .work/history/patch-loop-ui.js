/* 3-way loop mode UI (auto / ping-pong / forward) plus the detected loop point in the readouts. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

/* a shared helper so the forge and the detail panel stay in sync */
rep(`/** Current animation settings, shared by the forge and the detail panel. */`,
  `const LOOP_MODES = [
  ['auto', '🔁 循环：自动找循环点'],
  ['pingpong', '↔ 循环：来回（无接缝）'],
  ['forward', '→ 循环：单向'],
];
const loopLabel = () => (LOOP_MODES.find((m) => m[0] === (S.anim.loop || 'auto')) || LOOP_MODES[0])[1];
const cycleLoop = () => {
  const i = LOOP_MODES.findIndex((m) => m[0] === (S.anim.loop || 'auto'));
  S.anim.loop = LOOP_MODES[(i + 1) % LOOP_MODES.length][0];
  S.anim.pingpong = S.anim.loop !== 'forward';
  return S.anim.loop;
};

/** Current animation settings, shared by the forge and the detail panel. */`,
  'loop helpers')

rep(`    const loopBtn = document.createElement('button');
    loopBtn.className = 'btn' + (S.anim.pingpong ? ' primary' : '');
    loopBtn.textContent = S.anim.pingpong ? '↔ 来回循环（无接缝）' : '→ 单向循环';
    loopBtn.onclick = () => {
      S.anim.pingpong = !S.anim.pingpong;
      loopBtn.textContent = S.anim.pingpong ? '↔ 来回循环（无接缝）' : '→ 单向循环';
      loopBtn.classList.toggle('primary', S.anim.pingpong);
      refreshAnimInfo();
    };
    row2.appendChild(loopBtn);`,
  `    const loopBtn = document.createElement('button');
    loopBtn.className = 'btn primary';
    loopBtn.textContent = loopLabel();
    loopBtn.title = '自动 = 用着色器源码里的频率去找真正的循环点；来回 = 正放再倒放（永远不会跳变）；单向 = 直接重复';
    loopBtn.onclick = () => { loopBtn.textContent = cycleLoop(); refreshAnimInfo() };
    row2.appendChild(loopBtn);`,
  'forge loop button')

rep(`      seam.textContent = m
        ? \`\${f.frames.length} 帧 · \${f.delay}ms（≈\${Math.round(1000 / f.delay)}fps）· 全长 \${secs}s · 接缝比 \${m.ratio.toFixed(2)}（1 = 最顺）\`
        : '';`,
  `      const o = animOpts(spec);
      const loopNote = o.autoPeriod
        ? \` · 检测到循环点 \${o.autoPeriod.toFixed(2)}s\`
        : ((S.anim.loop || 'auto') === 'auto' ? ' · 未找到短循环，已按来回循环' : '');
      seam.textContent = m
        ? \`\${f.frames.length} 帧 · \${f.delay}ms（≈\${Math.round(1000 / f.delay)}fps）· 全长 \${secs}s · 接缝比 \${m.ratio.toFixed(2)}（1 = 最顺）\${loopNote}\`
        : '';`,
  'forge anim readout')

rep(`    if (m) seamInfo.textContent = \`循环接缝 \${(m.seam * 100).toFixed(2)}% ／ 平均帧差 \${(m.avg * 100).toFixed(2)}% → 接缝比 \${m.ratio.toFixed(2)}（越接近 1 越顺）\`;`,
  `    const o = animOpts(specForItem(it));
    if (m) {
      seamInfo.textContent = \`循环接缝 \${(m.seam * 100).toFixed(2)}% ／ 平均帧差 \${(m.avg * 100).toFixed(2)}% → 接缝比 \${m.ratio.toFixed(2)}（越接近 1 越顺）\`
        + (o.autoPeriod ? \` · 已按检测到的循环点 \${o.autoPeriod.toFixed(2)}s 导出\` : '');
    }`,
  'detail seam readout')

rep(`    '<b>循环</b>：来回循环是「正放一遍再倒放一遍」，接缝处与普通帧间隔完全一致，因此看不出跳变；单向循环在接缝处会有明显跳变。' +`,
  `    \`<b>循环</b>：\${loopLabel().replace('🔁 循环：', '')}。游戏里的特效是若干正弦项相加，每一项都有自己的周期，所以只要找到它们的公共循环点，单向重复也能完全看不出跳变；找不到短循环时才退回「来回循环」（正放再倒放，接缝天然无跳变）。' +\n    '循环点是从着色器源码里的频率算出来、再逐帧渲染验证的，合成台的读数里会写明检测结果。<br>' +`,
  'forge help text')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES ' + fails : 'done, syntax OK')
