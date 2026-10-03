/* 收尾：把克隆下拉真正挂进「来源与贴图」那块（用函数级变量 mkCloneRow，已在 39d 里建好） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};
rep("      box.innerHTML = '<div class=\"mklabel\">贴图（点格子换图，或上传自己的图）</div>';\n      box.appendChild(b);",
  "      box.innerHTML = '<div class=\"mklabel\">来源与贴图 —— 照现成的牌做，或从图集里取一格，或上传自己的图（三条路都在这一块）</div>';\n" +
  "      if (mkCloneRow) box.appendChild(mkCloneRow);   /* 克隆下拉与取图本来就是同一件事 */\n" +
  "      box.appendChild(b);",
  '克隆挂进来源块');
rep("    b.appendChild(clone);\n", '', '① 里不再挂克隆');
fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
