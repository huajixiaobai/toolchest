/* 调试：maker 样式段的切片锚点为什么找不到 */
const fs = require('fs');
const s = fs.readFileSync('.work/app.css', 'utf8').replace(/\r\n/g, '\n');
const START = '/* ================================================================ Mod 制作器 */';
const END = '.scrowhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}';
console.log('START 出现:', s.split(START).length - 1, '| 首个位置:', s.indexOf(START));
console.log('END 出现:', s.split(END).length - 1);
let i = -1; const all = [];
while ((i = s.indexOf(END, i + 1)) >= 0) all.push(i);
console.log('END 位置列表:', all.join(', '));
const mk = s.indexOf('.maker{display:grid');
console.log('.maker 位置:', mk);
console.log('片段:', JSON.stringify(s.slice(Math.max(0, (mk < 0 ? 0 : mk) - 120), (mk < 0 ? 0 : mk) + 60)));
