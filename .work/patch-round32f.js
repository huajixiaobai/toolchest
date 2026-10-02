/* 给 blindPick 补两张局部截图（盲注块 + 选择列表），三档机型各一份 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
const from = L(
  "    r.afterClear={ blind:B.score.state.blind, bossBlind:B.score.state.env.bossBlind, name:(q('.scblindname')||{}).textContent };",
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);
const to = L(
  "    r.afterClear={ blind:B.score.state.blind, bossBlind:B.score.state.env.bossBlind, name:(q('.scblindname')||{}).textContent };",
  '    /* 两张局部截图：选中后的盲注块 + 选择列表（数字看不出好不好看） */',
  "    const SUF2 = innerWidth < 600 ? '-ph' : (innerWidth < 1000 ? '-tab' : '');",
  "    setBlind('bl_club'); await __V.wait(700);",
  "    q('.scblindpick').click(); await __V.wait(700);",
  '    r.__hover=[',
  "      { at:'#scBlindList .scblindrow:nth-child(5)', name:'rowHover', ms:500, shot:'ui-blind-list'+SUF2, clip:'#scBlindPick' },",
  "      { at:'#scBlindDone', name:'closePick', click:true, ms:600, shot:'ui-blind-box'+SUF2, clip:'.scblindbox' },",
  '    ];',
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点命中 ' + (s.split(from).length - 1) + ' 次'); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to));
console.log('  ✓ blindPick 补截图步骤');
