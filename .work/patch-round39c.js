/* 第三十九轮（只保留能验证的部分）：
   「照现成的牌做一个」并进「来源与贴图」那一块（同一个函数作用域，直接挂变量，不再跨块塞 DOM）。
   GIF 解码器先不进产物：我的自研解析器能读出 24 帧与 40ms 延时，但像素解出来是空的，
   放进主路径会让预览变空白 —— 宁可不发，等修好再上。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const L = (...a) => a.join('\n');
let n = 0;
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

rep(
  L("      box.innerHTML = '<div class=\"mklabel\">贴图（点格子换图，或上传自己的图）</div>';",
    "      box.appendChild(b);"),
  L("      box.innerHTML = '<div class=\"mklabel\">来源与贴图 —— 照现成的牌做，或从图集里取一格，或上传自己的图（三条路都在这一块）</div>';",
    "      box.appendChild(clone);   /* 克隆下拉和取图本来就是同一件事，放一起 */",
    "      box.appendChild(b);"),
  '克隆并进来源块');
rep(
  "    b.appendChild(clone);\n    const secType = sec('① 做什么（也决定预览长什么样）', b, 'type');",
  "    /* clone 在下面的「来源与贴图」里挂上去 */\n    const secType = sec('① 做什么（也决定预览长什么样）', b, 'type');",
  '克隆挪出①');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
