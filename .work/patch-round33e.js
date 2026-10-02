/* 第三十三轮 D：
   ① 局面网格的两列规则放宽到 ≤900px（平板 834 也该用上，现在它只有 1 列，18 个字段拉太长）
   ② lastRowHit 的测法修正：先把账目滚进视野再命中测试 */
const fs = require('fs');
const path = require('path');
let n = 0;
const patch = (file, pairs) => {
  const F = path.join(__dirname, file);
  let s = fs.readFileSync(F, 'utf8');
  for (const [from, to, label] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) { console.error('❌ ' + file + ' :: ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
    s = s.replace(from, to);
    console.log('  ✓ ' + file + ' :: ' + label);
    n++;
  }
  fs.writeFileSync(F, s);
};
const L = (...a) => a.join('\n');

patch('app.css', [
  [
    L('  /* 局面那一堆数字：手机上两列就够，别一个个占满整行 */',
      '  .scenv{grid-template-columns:repeat(auto-fill,minmax(132px,1fr))}',
      '  .scblindpick,.scblindclear{flex:1 1 46%}',
      '}'),
    L('  .scblindpick,.scblindclear{flex:1 1 46%}',
      '}',
      '/* 局面那一堆数字：窄屏与平板都用密一点的网格（手机两列、平板四五行） */',
      '@media (max-width:900px){',
      '  .scenv{grid-template-columns:repeat(auto-fill,minmax(132px,1fr))}',
      '}'),
    '局面网格放宽到平板'
  ],
]);

patch('verify/cdp.js', [
  [
    L("      const lr=qa('.scline'); const lastRow=lr[lr.length-1];",
      "      if (lastRow) { lastRow.scrollIntoView({block:'center'}); await __V.wait(450);",
      "        const rb=lastRow.getBoundingClientRect(); const hit=document.elementFromPoint(rb.left+18, rb.top+rb.height/2);",
      '        r.layout.lastRowHit = hit===lastRow || !!(hit && lastRow.contains(hit)); }'),
    L("      const lr=qa('.scline'); const lastRow=lr[lr.length-1];",
      "      if (lastRow) {",
      "        log.scrollIntoView({block:'center'}); await __V.wait(350);",
      "        lastRow.scrollIntoView({block:'nearest'}); await __V.wait(350);",
      "        const rb=lastRow.getBoundingClientRect();",
      "        r.layout.lastRowBox={t:Math.round(rb.top),b:Math.round(rb.bottom)};",
      "        r.layout.lastRowVisible = rb.top>=0 && rb.bottom<=innerHeight+2;",
      "        const hit=document.elementFromPoint(Math.round(rb.left+18), Math.round(rb.top+rb.height/2));",
      '        r.layout.lastRowHit = hit===lastRow || !!(hit && lastRow.contains(hit));',
      '        r.layout.lastRowHitWhat = hit ? (hit.className||hit.tagName) : null; }'),
    '末行命中测法修正'
  ],
]);

console.log('共 ' + n + ' 处改动');
