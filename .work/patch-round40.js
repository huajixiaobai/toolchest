/* 推倒重做：整段替换 viewMaker（从 function viewMaker (root) { 到文件末尾的启动行之前）
   + 预览叠加悬浮立绘（mkPreviewCanvas 加一层 soul）+ 场景断言（克隆下拉必须在「来源与贴图」那块里）。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const NEWVIEW = fs.readFileSync(path.join(__dirname, 'maker-view2.js'), 'utf8').replace(/\r\n/g, '\n');

/* ① 整段换掉 viewMaker */
const a0 = s.indexOf('function viewMaker (root) {');
const tail = "\nif (document.readyState === 'loading')";
const a1 = s.indexOf(tail, a0);
if (a0 < 0 || a1 < 0 || a1 < a0) { console.error('❌ 找不到 viewMaker 的区间'); process.exit(1) }
s = s.slice(0, a0) + NEWVIEW.trimEnd() + s.slice(a1);
console.log('  ✓ viewMaker 整段替换（旧 ' + (a1 - a0) + ' 字节 → 新 ' + NEWVIEW.length + ' 字节）'); n++;

/* ② 预览：把悬浮立绘叠上去（会飘） */
const pvFrom = L(
  "  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };",
  "  try { return compose(spec, 2) } catch (e) { return mkArtCanvas(2) }",
  '}');
const pvTo = L(
  "  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };",
  "  let base = null;",
  "  try { base = compose(spec, 2) } catch (e) { base = mkArtCanvas(2) }",
  "  if (MK.type === 'Joker' && MK.soul.on) {",
  "    const cv = newCanvas(CARD_W * 2, CARD_H * 2);",
  "    const ctx = cv.getContext('2d');",
  "    ctx.imageSmoothingEnabled = false;",
  "    ctx.drawImage(base, 0, 0);",
  "    const soulSrc = (MK.soul.frames && MK.soul.frames.length)",
  "      ? MK.soul.frames[mkFrame % MK.soul.frames.length]",
  "      : MK.soul.upload;",
  "    const bob = Math.sin((mkFrame % 60) / 60 * Math.PI * 2) * 4;",
  "    const w = CARD_W * 2 * 0.86, h = CARD_H * 2 * 0.86;",
  "    const layer = newCanvas(Math.round(w), Math.round(h));",
  "    mkDrawSource(layer.getContext('2d'), w / CARD_W, 0, 0, { atlas: MK.soul.atlas, pos: MK.soul.pos, upload: soulSrc || null });",
  "    ctx.drawImage(layer, (CARD_W * 2 - w) / 2, (CARD_H * 2 - h) / 2 - 6 + bob, w, h);",
  "    return cv;",
  "  }",
  "  return base;",
  '}');
const hits = s.split(pvFrom).length - 1;
if (hits !== 1) { console.error('❌ 预览锚点命中 ' + hits + ' 次'); process.exit(1) }
s = s.replace(pvFrom, () => pvTo);
console.log('  ✓ 预览叠加悬浮立绘'); n++;

fs.writeFileSync(F, s);

/* ③ 场景断言：克隆下拉必须和取图在同一段里 */
const CDP = path.join(__dirname, 'verify', 'cdp.js');
let cdp = fs.readFileSync(CDP, 'utf8').replace(/\r\n/g, '\n');
const from = "    r.thumbs={ cells:qa('#mkArtGrid .mkcell').length, painted:qa('#mkArtGrid .mkcell canvas').length,";
const to = L(
  "    /* 合并检查：克隆下拉与「从哪个图集取图」必须在同一段里（同一个 .opt 内） */",
  "    r.merged=(function(){ const c=q('#mkClone'), a3=q('#mkAtlas'); if(!c||!a3) return false;",
  "      const sec=(el)=>{ let p=el; while(p && !p.classList.contains('opt')) p=p.parentElement; return p };",
  "      return sec(c)===sec(a3) })(),",
  "    r.soulControls={ on:!!q('#mkSoulOn'), atlas:!!q('#mkSoulAtlas'), up:!!q('#mkSoulUp'), pick:!!q('#mkSoulPick') },",
  "    r.thumbs={ cells:qa('#mkArtGrid .mkcell').length, painted:qa('#mkArtGrid .mkcell canvas').length,");
if (cdp.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
fs.writeFileSync(CDP, cdp.replace(from, () => to));
console.log('  ✓ 场景加合并/立绘断言'); n++;
console.log('共 ' + n + ' 处改动');
