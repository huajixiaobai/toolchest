/* 第三十三轮 H：平板排版（真问题）
   实测：平板 834px 时 #content 只有 282px —— 因为侧栏 212 + 详情面板 340 都还钉着，
   而「抽屉模式」的断点是 820px，834 的平板正好卡在外面。
   修法：把外壳的抽屉断点从 820 提到 900（CSS 与 JS 的 isNarrow 一起改），
   让平板也走「侧栏/详情都变成覆盖层」的布局，内容区拿回整宽。 */
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

patch('app.css', [
  [
    '/* ---------- phones / small tablets ---------- */\n@media(max-width:820px){',
    '/* ---------- phones / small tablets（平板也走这一套：834px 的 iPad 上，侧栏与详情如果还钉着，\n' +
    '   内容只剩 282px） ---------- */\n@media(max-width:900px){',
    '外壳断点 820 → 900'
  ],
  [
    '@media(max-width:820px){\n  #content{padding:10px 10px 84px}',
    '@media(max-width:900px){\n  #content{padding:10px 10px 84px}',
    '第二处 820 → 900'
  ],
], );

patch('app.js', [
  [
    "const isNarrow = () => window.matchMedia('(max-width: 820px)').matches;",
    "/* 与 app.css 里外壳的断点保持一致：≤900px 时侧栏 / 详情面板都变成覆盖层（平板也适用） */\nconst isNarrow = () => window.matchMedia('(max-width: 900px)').matches;",
    'isNarrow 断点同步'
  ],
]);

console.log('共 ' + n + ' 处改动');
