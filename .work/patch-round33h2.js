/* 第三十三轮 H2：外壳断点 820 → 900（CSS 两处 + JS 的 isNarrow） */
const fs = require('fs');
const path = require('path');
let n = 0;
const F = path.join(__dirname, 'app.css');
let s = fs.readFileSync(F, 'utf8');
const before = s.split('@media(max-width:820px){').length - 1;
if (before < 1) { console.error('❌ app.css 里没找到 820 断点'); process.exit(1) }
s = s.split('@media(max-width:820px){').join('@media(max-width:900px){');
fs.writeFileSync(F, s);
console.log('  ✓ app.css: ' + before + ' 处 820 断点改成 900');
n += before;

const A = path.join(__dirname, 'app.js');
let a = fs.readFileSync(A, 'utf8');
const from = "const isNarrow = () => window.matchMedia('(max-width: 820px)').matches;";
if (a.split(from).length - 1 !== 1) { console.error('❌ isNarrow 锚点不唯一'); process.exit(1) }
a = a.replace(from, "/* 与 app.css 的外壳断点保持一致：≤900px 时侧栏与详情面板都变成覆盖层（平板也算窄屏） */\n" +
  "const isNarrow = () => window.matchMedia('(max-width: 900px)').matches;");
fs.writeFileSync(A, a);
console.log('  ✓ app.js: isNarrow → 900');
n++;
console.log('共 ' + n + ' 处改动');
