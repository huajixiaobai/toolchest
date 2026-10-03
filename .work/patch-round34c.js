/* 修描述文案里「红桃牌牌」这类重复：花色不再自带"牌"字（外面统一加） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const pairs = [
  ["  if (e.cond === 'suit') return (MK_SUITS.filter((s) => s[0] === v)[0] || [v, v])[1] + '牌';",
    "  if (e.cond === 'suit') return (MK_SUITS.filter((s) => s[0] === v)[0] || [v, v])[1];"],
  ["  if (e.cond === 'rank') return (MK_RANKS.filter((r) => r[0] === v)[0] || [v, v])[1] + '点';",
    "  if (e.cond === 'rank') return (MK_RANKS.filter((r) => r[0] === v)[0] || [v, v])[1] + ' 点';"],
];
let n = 0;
for (const [a, b] of pairs) {
  const hits = s.split(a).length - 1;
  if (hits !== 1) { console.error('❌ 锚点 ' + hits + ' 次: ' + a.slice(0, 40)); process.exit(1) }
  s = s.replace(a, () => b); n++;
}
fs.writeFileSync(F, s);
console.log('  ✓ 描述文案 ' + n + ' 处');
