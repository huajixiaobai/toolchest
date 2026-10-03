/* 第四十八轮补：逐帧时长那一排输入框的样式（插在 .mkcell 那一组后面，跟着制作者现有配色走） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.css');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const anchor = '.mkcell.on{border-color:#4bc292;background:#12352b;box-shadow:0 0 0 2px #4bc29266,0 0 12px #4bc29255}';
const hits = s.split(anchor).length - 1;
if (hits !== 1) { console.error('❌ 锚点命中 ' + hits + ' 次'); process.exit(1); }
const CSS = [
  anchor,
  '/* 逐帧时长：一排小倍数输入框 */',
  '.mkweights{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 4px;background:#18232d;border:1px solid var(--line2);border-radius:8px;padding:8px 10px}',
  '.mkweights>.mklabel{flex-basis:100%;margin:0 0 2px}',
  '.mkweight{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#9fb0bf}',
  '.mkweight>span{min-width:14px;text-align:right;opacity:.75}',
  '.mkweight input{width:46px;min-height:28px;text-align:center;background:#101820;color:#e8eef5;border:1px solid var(--line2);border-radius:6px;padding:2px 4px;font:inherit}',
  '.mkweight input:focus{outline:none;border-color:var(--accent2,#009dff)}',
  '.mkweights .hint{flex-basis:100%;margin:0}',
].join('\n');
s = s.replace(anchor, () => CSS);
fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['.mkweights{', '.mkweight input{', '.mkweights .hint{'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：3 个样式规则全部在文件里');
