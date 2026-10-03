/* 修：mkReadImage 之前被插在 viewMaker 里面了（作用域不对，顶层引用会报 is not defined）。
   把它整段搬到顶层（放到 mkSoulCanvas 之前）。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const start = '/** 读一张图：静态返回 1 帧，GIF / APNG / 动图 WebP 用 ImageDecoder 拆帧（最多 24 帧） */';
const endMark = "  const sz = q('#mkSize');";
const i0 = s.indexOf(start);
let i1 = -1;
if (i0 >= 0) i1 = s.indexOf(endMark, i0);
if (i0 < 0 || i1 < 0) { console.error('❌ 找不到 mkReadImage 段落'); process.exit(1) }
const fn = s.slice(i0, i1).replace(/\s+$/, '');
s = s.slice(0, i0) + s.slice(i1);                       /* 先从 viewMaker 里拿出来 */
const anchor = "/** 悬浮立绘的图：和主体用同一套取图方式，只是图集/坐标换成 soul 那一份 */";
if (s.split(anchor).length - 1 !== 1) { console.error('❌ 顶层锚点不唯一'); process.exit(1) }
s = s.replace(anchor, () => fn + '\n' + anchor);          /* 放到顶层 */
fs.writeFileSync(F, s);
console.log('  ✓ mkReadImage 搬到顶层（' + fn.length + ' 字节）');
