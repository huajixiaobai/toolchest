/* 第五十一轮（补）：修 Blind / Tag 两个块漏掉的唯 key（它们写的是单引号形式，上一轮只改了双引号那 8 处）
   + 场景断言改成「切换条目要看预览和 Lua 框」（工程 Lua 本来就不该因为选中项变化而变化） */
const fs = require('fs');
const path = require('path');
let n = 0;
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const cnt = s.split("    atlas = \\'sheet\\',").length - 1;
console.log('  单引号形式的 atlas 行还有 ' + cnt + ' 处');
if (cnt) {
  s = s.split("L.push('    atlas = \\'sheet\\',');").join("L.push('    atlas = \\'sheet_' + slug + '\\',');");
  fs.writeFileSync(F, s);
  const b = fs.readFileSync(F, 'utf8');
  console.log(b.indexOf("'    atlas = \\'sheet_' + slug + '\\','") >= 0 ? '  ✓ 写回校验通过' : '  ❌ 没写进去');
  n++;
}

/* 场景断言 */
const G = path.join(__dirname, 'verify', 'cdp.js');
let t = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = t.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1); }
  t = t.replace(from, () => to); console.log('  ✓ ' + label); n++;
};
rep(
  '    r.reimportItems=reimp&&reimp.mod&&reimp.mod.items!=null?reimp.mod.items:null;',
  '    r.reimportCount=reimp&&reimp.mod&&reimp.mod.items?reimp.mod.items.length:null;\n    r.reimportMatches=r.reimportCount===4;',
  '重导入条目数'
);
rep(
  '    const luaBefore=B.maker.lua();\n    const nameBefore=(q(\'[data-mk="nameZh"]\')||{}).value;',
  '    const luaBefore=B.maker.lua();\n    const nameBefore=(q(\'[data-mk="nameZh"]\')||{}).value;\n    const pvBefore=(q(".mkpvline")||{}).innerText||"";\n    r.luaBoxHasAllItems=(q("#mkLua")?((q("#mkLua").value||"").split("SMODS.").length-1):-1);',
  '切换前快照'
);
rep(
  '      nameNow:(q(\'[data-mk="nameZh"]\')||{}).value, pvLine:(q(".mkpvline")||{}).innerText||"" };',
  '      nameNow:(q(\'[data-mk="nameZh"]\')||{}).value, pvLine:(q(".mkpvline")||{}).innerText||"", pvChanged:((q(".mkpvline")||{}).innerText||"")!==pvBefore };',
  '切换后比较预览'
);
fs.writeFileSync(G, t);
console.log('  ✓ cdp.js 已更新（共 ' + n + ' 处）');
