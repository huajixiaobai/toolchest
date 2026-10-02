/* 第三十三轮 F：账目要打开才能量（details 关着时行高是 0）；顺便量 .scenv 的父容器宽度，查平板为什么只有 1 列 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
const from = L(
  "    const bar=q('.scplay'); const log=q('.sclog');",
  '    if (bar && log) {',
  '      const b=bar.getBoundingClientRect(), lg=log.getBoundingClientRect();'
);
const to = L(
  "    const bar=q('.scplay'); const log=q('.sclog');",
  '    if (log) { log.open = true; await __V.wait(250) }',
  '    if (bar && log) {',
  '      const b=bar.getBoundingClientRect(), lg=log.getBoundingClientRect();'
);
const from2 = "    r.layout.envCols=(q('.scenv')?getComputedStyle(q('.scenv')).gridTemplateColumns.split(' ').length:null);";
const to2 = L(
  "    r.layout.envCols=(q('.scenv')?getComputedStyle(q('.scenv')).gridTemplateColumns.split(' ').length:null);",
  "    r.layout.envWidth=(function(){ var e=q('.scenv'); if(!e) return null; var p=e.parentElement;",
  "      return { env:Math.round(e.getBoundingClientRect().width), parent:Math.round(p.getBoundingClientRect().width),",
  "        parentCls:p.className||p.tagName, parentOverflow:getComputedStyle(p).overflowX } })();"
);
let n = 0;
for (const [a, b, label] of [[from, to, '账目先展开'], [from2, to2, '量 .scenv 父容器']]) {
  const hits = s.split(a).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1) }
  s = s.replace(a, b); console.log('  ✓ ' + label); n++;
}
fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
