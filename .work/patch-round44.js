/* 第四十四轮：让「上传动图」真的能用
   背景：mkReadImage 原来依赖内核的 ImageDecoder，而实测这台机器上的 Chrome
   typeof ImageDecoder === 'undefined'（无头环境根本没有），于是上传 GIF 只拿到 1 帧、
   预览不动、导出也不是帧序列 —— 整个动图功能等于没有。
   改法：把 .work/gifdec.js（自己写的 GIF89a 解析，纯计算，Node 里已跑过回归测试）搬进 app.js，
   GIF 先走它；APNG / 动图 WebP 仍优先用 ImageDecoder（有就用，没有就按第一帧用，并在界面上说清）。
   顺带把预览的换帧节奏改成按图片自己的帧延时走（原来是写死 160ms），立绘也能一起动。 */
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

/* ---------- ① 搬进 GIF 解析器 + 两个小包装 ---------- */
const dec = fs.readFileSync(path.join(__dirname, 'gifdec.js'), 'utf8').replace(/\r\n/g, '\n').replace(/\s*$/, '');
const WRAP = L(
  '',
  '/** 解出来的 RGBA 变成 canvas（导出、预览都直接用 canvas） */',
  'function mkFramesToCanvases (list) {',
  '  return list.map((f) => {',
  '    const cv = newCanvas(f.width, f.height);',
  '    const ctx = cv.getContext("2d");',
  '    const img = ctx.createImageData(f.width, f.height);',
  '    img.data.set(f.rgba);',
  '    ctx.putImageData(img, 0, 0);',
  '    return cv;',
  '  });',
  '}',
  '/** GIF 字节 → { frames: [canvas], delay }；不是 GIF / 解不出来返回 null */',
  'function mkGifFrames (bytes, max) {',
  '  try {',
  '    const g = gifDecodeFrames(bytes, max || 24);',
  '    if (!g || !g.length) return null;',
  '    return { frames: mkFramesToCanvases(g), delay: g[0].delay, total: g.length };',
  '  } catch (e) { return null }',
  '}',
  ''
);
rep('async function mkReadImage (file) {', dec + '\n' + WRAP + 'async function mkReadImage (file) {', 'GIF 解析器搬进 app.js');

/* ---------- ② mkReadImage：GIF 先走自己的解析器 ---------- */
rep(
  L('    if (typeof ImageDecoder !== \'undefined\' && /gif|webp|apng|png$/i.test(file.type)) {'),
  L('    /* ① GIF：先用自己的解析器 —— 不挑内核，ImageDecoder 没有/拆不出多帧时也能拆 */',
    "    const isGif = /gif/i.test(file.type || '') || /\\.gif$/i.test(file.name || '');",
    '    if (isGif) {',
    '      const g = mkGifFrames(new Uint8Array(await file.arrayBuffer()), 24);',
    '      if (g && g.frames.length > 1) { URL.revokeObjectURL(url); return { frames: g.frames, cover: g.frames[0], delay: g.delay, gif: true } }',
    '      if (g && g.frames.length === 1) { URL.revokeObjectURL(url); return { frames: g.frames, cover: g.frames[0], delay: g.delay, gif: true, single: true } }',
    '    }',
    '    /* ② APNG / 动图 WebP：这两种得靠内核的 ImageDecoder，有就用 */',
    "    if (typeof ImageDecoder !== 'undefined' && /webp|apng|png$/i.test(file.type)) {"),
  'mkReadImage 先走 GIF 解析器'
);

/* ---------- ③ 预览换帧按图片自己的延时走，立绘也能一起动 ---------- */
rep(
  L('let mkFrame = 0;',
    'let mkAnimTimer = null;',
    '/** 预览里的动图：6fps 换帧（只在有帧序列时跑，开销就是一次 drawImage） */',
    'function mkStartAnim () {',
    '  if (mkAnimTimer) return;',
    '  mkAnimTimer = setInterval(() => {',
    '    const box = document.querySelector(\'.mkpvbox\');',
    '    if (!box || !box.isConnected) { clearInterval(mkAnimTimer); mkAnimTimer = null; return }',
    '    const total = (MK.art.frames && MK.art.frames.length) || 1;',
    '    if (total < 2) return;',
    '    mkFrame = (mkFrame + 1) % total;',
    '    const old = box.querySelector("canvas");',
    '    const cv = mkPreviewCanvas();',
    '    cv.style.width = \'142px\'; cv.style.height = \'190px\';',
    '    if (old) box.replaceChild(cv, old); else box.appendChild(cv);',
    '  }, 160);',
    '}'),
  L('let mkFrame = 0;',
    'let mkAnimTimer = null;',
    'let mkAnimDelay = 160;',
    '/** 预览里的动图：按图片自己的帧延时换帧（GIF 里写多少就多少，限制在 40–500ms）',
    ' *  —— 立绘有帧序列或者开着浮动时也靠这个计时器，所以两种情况都要让它跑起来。 */',
    'function mkStartAnim (delay) {',
    '  mkAnimDelay = Math.min(500, Math.max(40, Math.round(delay) || 160));',
    '  if (mkAnimTimer) { clearInterval(mkAnimTimer); mkAnimTimer = null }   /* 换图就按新延时重建 */',
    '  const tick = () => {',
    '    const box = document.querySelector(\'.mkpvbox\');',
    '    if (!box || !box.isConnected) { clearInterval(mkAnimTimer); mkAnimTimer = null; return }',
    '    const aN = (MK.art.frames && MK.art.frames.length) || 1;',
    '    const soulAlive = MK.type === \'Joker\' && MK.soul.on && !!(MK.soul.upload || (MK.soul.frames && MK.soul.frames.length));',
    '    const sN = soulAlive && MK.soul.frames ? MK.soul.frames.length : 1;',
    '    const total = Math.max(aN, sN);',
    '    mkFrame = (mkFrame + 1) % (total * 60);      /* 前 60 步给立绘浮动留相位，同时保证帧序走满一圈 */',
    '    if (total < 2 && !soulAlive) return;',
    '    const old = box.querySelector("canvas");',
    '    const cv = mkPreviewCanvas();',
    '    cv.style.width = \'142px\'; cv.style.height = \'190px\';',
    '    if (old) box.replaceChild(cv, old); else box.appendChild(cv);',
    '  };',
    '  mkAnimTimer = setInterval(tick, mkAnimDelay);',
    '  tick();',
    '}'),
  '预览换帧节奏'
);

/* ---------- ④ 上传时把帧延时带上 ---------- */
rep(
  '    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, uploadName: f.name }) });\n    if (multi) { status(\'已使用「\' + f.name + \'」：动图拆出 \' + info.frames.length + \' 帧，预览会逐帧播放，导出会铺成横向帧序列。\', \'ok\'); mkStartAnim() }\n    else status(\'已使用「\' + f.name + \'」（单帧）。动图拆帧需要浏览器支持；拆不出多帧时这里会说明。\');',
  '    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, delay: info.delay || 0, uploadName: f.name }) });\n    if (multi) {\n      status(\'已使用「\' + f.name + \'」：动图拆出 \' + info.frames.length + \' 帧（每帧 \' + (info.delay || \'?\') + \'ms），预览按这个节奏逐帧播放，导出会铺成横向帧序列、Lua 里写 frames = \' + info.frames.length + \'。\', \'ok\');\n      mkStartAnim(info.delay);\n    } else if (info.gif) status(\'已使用「\' + f.name + \'」：这是一个只有 1 帧的 GIF，按静态图用。\');\n    else status(\'已使用「\' + f.name + \'」（单帧）。GIF 一定能拆帧；APNG / 动图 WebP 要看这个浏览器给不给拆。\');',
  '上传主图：带上帧延时'
);
rep(
  "    mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, uploadName: f.name }) });\n    status('立绘已换成「' + f.name + '」' + (multi ? '（动图 ' + info.frames.length + ' 帧，预览里会飘着动）' : '') + '，预览里现在就能看到。', 'ok');\n    if (multi) mkStartAnim();",
  "    mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, delay: info.delay || 0, uploadName: f.name }) });\n    status('立绘已换成「' + f.name + '」' + (multi ? '（动图 ' + info.frames.length + ' 帧，每帧 ' + (info.delay || '?') + 'ms，预览里会飘着动）' : '') + '，预览里现在就能看到。', 'ok');\n    mkStartAnim(multi ? info.delay : 0);",
  '上传立绘：带上帧延时'
);

/* ---------- ⑤ 进视图时按已有延时恢复动画 ---------- */
rep(
  "  if ((MK.art.frames && MK.art.frames.length > 1) || (MK.soul.frames && MK.soul.frames.length > 1)) mkStartAnim();",
  "  if ((MK.art.frames && MK.art.frames.length > 1) || (MK.soul.frames && MK.soul.frames.length > 1)) mkStartAnim(MK.art.delay || 0);",
  '进视图恢复动画'
);

fs.writeFileSync(F, s);
/* 写回校验（之前吃过“补丁没写进去却以为成功”的亏） */
const back = fs.readFileSync(F, 'utf8');
const must = ['function gifDecodeFrames (bytes, maxFrames)', 'function mkGifFrames (bytes, max)', 'const isGif = /gif/i.test(file.type', 'let mkAnimDelay = 160;', 'mkFrame = (mkFrame + 1) % (total * 60);', 'mkStartAnim(info.delay);', 'mkStartAnim(multi ? info.delay : 0);'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
