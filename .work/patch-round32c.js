/* 两个小修复：
   ① 选完一行要关掉选择弹窗（弹窗挂在 body 上，render() 带不走它）
   ② 轻抖改成抖 HUD 那一块 —— 整块牌桌抖动会让所有卡图重绘（实测 54→38fps） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
const pairs = [
  [
    "    scStopPlay(); SC.blind = row.dataset.blind || ''; SC_UI.step = -1; render();",
    L("    root.remove();", "    scStopPlay(); SC.blind = row.dataset.blind || ''; SC_UI.step = -1; render();"),
    '选中后关掉弹窗'
  ],
  [
    "  const stage = host.querySelector('.scstage');",
    L('  /* 原版抖的是整个房间（G.ROOM.jiggle），但那在浏览器里等于让所有卡图重绘',
      '     （实测 54fps → 38fps）。这里改成抖 HUD 那一块：看得见的抖动照旧，代价小得多。 */',
      "  const stage = host.querySelector('.schud');"),
    '抖动改成 HUD'
  ],
];
let n = 0;
for (const [from, to, label] of pairs) {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, to);
  console.log('  ✓ ' + label);
  n++;
}
fs.writeFileSync(F, s);

const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'data.json'), 'utf8'));
const names = d.items.filter((i) => i.cat === 'Blind' && i.raw && i.raw.boss).map((i) => i.i18n.zh_CN || i.name);
names.sort((a, b) => a.length - b.length);
console.log('  盲注中文名：最短「' + names[0] + '」(' + names[0].length + ' 字)  最长「' + names[names.length - 1] + '」');
console.log('共 ' + n + ' 处改动');
