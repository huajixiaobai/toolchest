/* 场景断言修正：抖动类现在挂在 HUD 上；盲注名字有 1 个字的（「鱼」）。
   顺带在 blindPick 里补两张局部截图（盲注块 + 选择列表）。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
const pairs = [
  ["if (document.querySelector('.scstage.jiggle')) seen.jiggle++;", "if (document.querySelector('.schud.jiggle, .scstage.jiggle')) seen.jiggle++;", '抖动断言'],
  ['      everyRowHasName:rows.slice(1).every(function(x){ var b=x.querySelector("b"); return b && b.textContent.trim().length>1 }),',
   '      everyRowHasName:rows.slice(1).every(function(x){ var b=x.querySelector("b"); return b && b.textContent.trim().length>=1 }),',
   '名字长度断言'],
  ["    r.errors=window.__V.errors.length;\n    return r })()`,\n  /* 结算动画三档",
   L("    /* 两张局部截图：当前盲注那一块 + 选择列表（数字看不出好不好看） */",
     "    const SUF2 = innerWidth < 600 ? '-ph' : (innerWidth < 1000 ? '-tab' : '');",
     "    q('.scblindpick').click(); await __V.wait(700);",
     "    r.__hover=[",
     "      { at:'#scBlindList .scblindrow:nth-child(4)', name:'rowHover', ms:500, shot:'ui-blind-list'+SUF2, clip:'#scBlindPick' },",
     "      { at:'#scBlindDone', name:'closePick', click:true, ms:500, shot:'ui-blind-box'+SUF2, clip:'.scblindbox' },",
     "    ];",
     "    r.errors=window.__V.errors.length;",
     "    return r })()`,",
     "  /* 结算动画三档"),
   '补截图步骤'],
];
let n = 0;
for (const [from, to, label] of pairs) {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, to);
  console.log('  ✓ ' + label);
  n++;
}
fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
