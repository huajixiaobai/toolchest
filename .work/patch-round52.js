/* 第五十二轮：修 manifest 的 author 类型 —— Steamodded 的 json_spec 要求 author 是「字符串数组」
   （.work/third-party/smods/smods-26.829.0/src/preflight/loader.lua: author = { type = 'table', required = true, ... }）
   我们原来写的是字符串，会被判为不合法 → 整个 mod 加载失败。顺带把 priority 也写上（可选，默认 0）。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const from = '    author: MKR.author,';
const hits = s.split(from).length - 1;
if (hits !== 1) { console.error('❌ 锚点命中 ' + hits); process.exit(1) }
s = s.replace(from, () => [
  '    /* 注意：Steamodded 的 manifest 校验里 author 必须是**字符串数组**（loader.lua: type = \'table\'），',
  '       写成一个字符串会被判为不合法、整包加载失败。 */',
  '    author: [MKR.author || \'unknown\'],',
  '    priority: 0,',
].join('\n'));
fs.writeFileSync(F, s);
const b = fs.readFileSync(F, 'utf8');
console.log(b.indexOf('author: [MKR.author') >= 0 ? '  ✓ manifest 的 author 改成数组' : '  ❌ 没写进去');
