/* 修：viewMaker 里每一段都包在各自的 {} 里，clone 是块级作用域 —— 贴图那块根本看不见它。
   改成函数级变量（mkCloneRow），两段共用。 */
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

/* ① 函数级变量 */
rep("  /* ① 做什么 */", "  let mkCloneRow = null;   /* 克隆下拉：在 ① 里建，挂到「来源与贴图」那块（两段都要用，所以放函数级） */\n  /* ① 做什么 */", '函数级变量');
/* ② 建好后记下来 */
rep("    const clone = document.createElement('div'); clone.className = 'mkrow';",
  "    const clone = document.createElement('div'); clone.className = 'mkrow';\n    mkCloneRow = clone;",
  '记下 clone');
/* ③ 贴图块里挂函数级变量 */
rep("      box.appendChild(clone);   /* 克隆下拉和取图本来就是同一件事，放一起 */",
  "      if (mkCloneRow) box.appendChild(mkCloneRow);   /* 克隆下拉和取图本来就是同一件事，放一起 */",
  '挂函数级变量');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
