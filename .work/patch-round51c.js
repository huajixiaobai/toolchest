/* 第五十一轮（补 2）：打开制作器时就把摘要/描述/预览那句/Lua 框填上
   （refresh 只定义没在渲染时调用过，所以 Lua 框一开始是空的 —— 场景里 luaBoxHasAllItems:0 露出来的） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const from = '  MKEL.refresh = refresh;';
const hits = s.split(from).length - 1;
if (hits !== 1) { console.error('❌ 锚点命中 ' + hits); process.exit(1) }
s = s.replace(from, () => '  MKEL.refresh = refresh;\n  refresh();   /* 渲染完先把摘要 / 描述 / 预览那句 / Lua 框填上（以前只定义没调用，Lua 框一开始是空的） */');
fs.writeFileSync(F, s);
const b = fs.readFileSync(F, 'utf8');
console.log(b.indexOf('refresh();   /* 渲染完先把摘要') >= 0 ? '  ✓ 写回校验通过' : '  ❌ 没写进去');
