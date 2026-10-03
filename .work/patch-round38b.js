/* 修一处括号：立绘图集下拉那行的 mkSet(...) / Object.assign(...) 少了半个括号 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const from = "const sa = q('#mkSoulAtlas'); if (sa) sa.onchange = () => mkSet({ soul: Object.assign({}, MK.soul, { atlas: sa.value, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null } }) }";
const to = "const sa = q('#mkSoulAtlas'); if (sa) sa.onchange = () => mkSet({ soul: Object.assign({}, MK.soul, { atlas: sa.value, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null }) }) }";
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点不唯一'); process.exit(1) }
fs.writeFileSync(F, s.replace(from, () => to));
console.log('  ✓ 补上括号');
