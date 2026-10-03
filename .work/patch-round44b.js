/* 第四十四轮 b：修两处「动图才能踩到」的硬伤（都是实测抓到的）
   ① mkSheetCanvas 里把 frames 数组当成了帧数用：只有 1 帧时数组是 null 所以看不出问题，
      一旦上传 24 帧的 GIF，Math.round(CARD_W * scale * 数组) = NaN → 画布宽度 0。
   ② 宽度 0 的画布上 toBlob 的回调根本不会被调用（实测：其它尺寸都是 1~2ms 回来），
      而 canvasBytes 只在回调里 resolve —— 于是「导出」按钮点下去永远转圈、什么都不发生。
   现在：帧数取 length；canvasBytes 加尺寸检查 + 超时 + 明确的失败原因；导出前再自检一次尺寸。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

/* ① 帧数要用 length（原来把数组当数用了） */
rep(
  "  const frames = (src.frames && src.frames.length) ? src.frames : 1;\n  const cv = newCanvas(Math.round(CARD_W * scale * frames), Math.round(CARD_H * scale));",
  "  const frames = (src.frames && src.frames.length) ? src.frames.length : 1;   /* 这里要的是帧数，不是帧数组 */\n  const cv = newCanvas(Math.round(CARD_W * scale * frames), Math.round(CARD_H * scale));",
  'mkSheetCanvas 帧数'
);

/* ② canvasBytes：尺寸为空 / 回调不来 / 编码失败，都要给出原因，不能永远挂着 */
rep(
  'function canvasBytes (cv) {\n  return new Promise((res) => cv.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), \'image/png\'));\n}',
  L('function canvasBytes (cv) {',
    '  return new Promise((res, rej) => {',
    '    if (!cv || !cv.width || !cv.height) { rej(new Error(\'画布尺寸是空的（\' + (cv ? cv.width + \'×\' + cv.height : \'没有画布\') + \'），导不出图\')); return }',
    '    let done = false;',
    '    /* 宽度或高度为 0 的画布上，toBlob 的回调根本不会被调用（实测过），所以必须有兜底 */',
    '    const timer = setTimeout(() => { if (!done) { done = true; rej(new Error(\'浏览器没能在 8 秒内把画布编码成 PNG\')) } }, 8000);',
    '    const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); fn(v) };',
    '    cv.toBlob((b) => {',
    '      if (!b) { finish(rej, new Error(\'画布编码失败（浏览器返回了空结果）\')); return }',
    '      b.arrayBuffer().then((a) => finish(res, new Uint8Array(a)), (e) => finish(rej, e));',
    '    }, \'image/png\');',
    '  });',
    '}'),
  'canvasBytes 兜底'
);

/* ③ 导出前自检帧条尺寸：算错了就直接报错，不再交给 toBlob 去挂死 */
rep(
  L('  const one = await canvasBytes(mkSheetCanvas(1, \'art\'));',
    '  const two = await canvasBytes(mkSheetCanvas(2, \'art\'));',
    '  files.push({ name: \'assets/1x/sheet.png\', data: one });',
    '  files.push({ name: \'assets/2x/sheet.png\', data: two });',
    '  if (MK.type === \'Joker\' && MK.soul.on) {',
    '    files.push({ name: \'assets/1x/soul.png\', data: await canvasBytes(mkSheetCanvas(1, \'soul\')) });',
    '    files.push({ name: \'assets/2x/soul.png\', data: await canvasBytes(mkSheetCanvas(2, \'soul\')) });',
    '  }'),
  L('  /* 尺寸自检：动图是横向帧条，宽度必须正好是 帧数×格宽 —— 算错的话后面 toBlob 会直接挂住 */',
    '  const nArt = (MK.art.frames && MK.art.frames.length) || 1;',
    '  const s1 = mkSheetCanvas(1, \'art\'); const s2 = mkSheetCanvas(2, \'art\');',
    '  if (s1.width !== CARD_W * nArt || s2.width !== CARD_W * 2 * nArt) {',
    '    throw new Error(\'帧条宽度不对（1x \' + s1.width + \'、2x \' + s2.width + \'，按 \' + nArt + \' 帧应该是 \' + (CARD_W * nArt) + \' 和 \' + (CARD_W * 2 * nArt) + \'）\');',
    '  }',
    '  const one = await canvasBytes(s1);',
    '  const two = await canvasBytes(s2);',
    '  files.push({ name: \'assets/1x/sheet.png\', data: one });',
    '  files.push({ name: \'assets/2x/sheet.png\', data: two });',
    '  if (MK.type === \'Joker\' && MK.soul.on) {',
    '    const nSoul = (MK.soul.frames && MK.soul.frames.length) || 1;',
    '    const q1 = mkSheetCanvas(1, \'soul\'); const q2 = mkSheetCanvas(2, \'soul\');',
    '    if (q1.width !== CARD_W * nSoul || q2.width !== CARD_W * 2 * nSoul) {',
    '      throw new Error(\'立绘帧条宽度不对（1x \' + q1.width + \'、2x \' + q2.width + \'，按 \' + nSoul + \' 帧应该是 \' + (CARD_W * nSoul) + \' 和 \' + (CARD_W * 2 * nSoul) + \'）\');',
    '    }',
    '    files.push({ name: \'assets/1x/soul.png\', data: await canvasBytes(q1) });',
    '    files.push({ name: \'assets/2x/soul.png\', data: await canvasBytes(q2) });',
    '  }'),
  '导出尺寸自检'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['? src.frames.length : 1;\n  const cv = newCanvas', '画布尺寸是空的', '浏览器没能在 8 秒内把画布编码成 PNG', '帧条宽度不对', '立绘帧条宽度不对'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
