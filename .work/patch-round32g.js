/* 盲注效果文本去重：游戏自己的描述与我们的注解经常是同一句话
   （「本回合只能打出一种牌型」说两遍）。这里按"汉字集合重合度"判断，重合就别再说一遍。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
const from = L(
  "  if (rule && rule.note) bits.push(rule.note);",
  "  if (!rule && !Object.keys(spec).length) bits.push('本页不认识它的效果（多半来自 mod）—— 用卡牌的「被削弱」和小丑牌的「被禁用」手动补');",
  "  return bits.join('　·　');"
);
const to = L(
  "  /* 注解与游戏描述常常是同一句话：汉字重合度高的就不重复说了 */",
  "  if (rule && rule.note && !scSameMeaning(desc, rule.note)) bits.push(rule.note);",
  "  if (!rule && !Object.keys(spec).length) bits.push('本页不认识它的效果（多半来自 mod）—— 用卡牌的「被削弱」和小丑牌的「被禁用」手动补');",
  "  return bits.join('　·　');"
);
const helper = L(
  '/** 两句话是不是一个意思（够用的近似：汉字集合重合度 ≥ 0.7 就算） */',
  'function scSameMeaning (a, b) {',
  "  const set = (t) => new Set(String(t || '').replace(/[^\\u4e00-\\u9fa5]/g, '').split(''));",
  '  const A = set(a), B = set(b);',
  '  if (!A.size || !B.size) return false;',
  '  let hit = 0;',
  '  for (const ch of B) if (A.has(ch)) hit++;',
  '  return hit / B.size >= 0.7;',
  '}',
  ''
);
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点 1 命中 ' + (s.split(from).length - 1) + ' 次'); process.exit(1) }
s = s.replace(from, to);
const anchor2 = '/** 盲注的效果文本（不依赖当前选择：列表里每一行也要用它） */';
if (s.split(anchor2).length - 1 !== 1) { console.error('❌ 锚点 2 不唯一'); process.exit(1) }
s = s.replace(anchor2, helper + anchor2);
fs.writeFileSync(F, s);
console.log('  ✓ 效果文本去重');
