const fs = require('fs');
const F = 'modimport.js';
let s = fs.readFileSync(F, 'utf8');
let fails = 0;
function rep (from, to, label) {
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label);
}
const OLD = '  if (implicitAtlas.length) warnings.push(`${implicitAtlas.length} 个条目没有声明 atlas，且对应的默认图集不存在（游戏中同样无法显示）：${implicitAtlas.slice(0, 4).join(\', \')}${implicitAtlas.length > 4 ? \' …\' : \'\'}`);';
const NEW = '  if (missingAtlas.length) warnings.push(`${missingAtlas.length} 个条目指向的图集不存在（mod 里没有，原版也没有），已标为无贴图：${missingAtlas.slice(0, 4).join(\'、\')}${missingAtlas.length > 4 ? \' …\' : \'\'}`);\n' +
  '  if (implicitAtlas.length) warnings.push(`${implicitAtlas.length} 个条目没有声明 atlas，已标为无贴图：${implicitAtlas.slice(0, 4).join(\'、\')}${implicitAtlas.length > 4 ? \' …\' : \'\'}`);';
rep(OLD, NEW, 'missing atlas warning');
fs.writeFileSync(F, s);
console.log(fails ? 'FAILURES ' + fails : 'done');
new Function(s);
console.log('syntax OK');
