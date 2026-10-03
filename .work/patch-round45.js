/* 第四十五轮：让 APNG 也真的能动（用户要的是 GIF/APNG/WebP 三种都能动）
   背景：APNG 原来和 GIF 一样指望内核的 ImageDecoder，而实测这台机器的 Chrome 根本没有这个接口，
   所以上传 APNG 只拿到第一帧。现在用自己写的解码器（.work/apngdec.js，Node 回归测试已通过）
   + 浏览器的 DecompressionStream('deflate') 解 zlib。动图 WebP 仍然只能靠内核，拆不了就在界面上说实话。 */
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

/* ---------- ① 搬进 APNG 解析器 + 浏览器端解 zlib 的两个包装 ---------- */
const dec = fs.readFileSync(path.join(__dirname, 'apngdec.js'), 'utf8').replace(/\r\n/g, '\n').replace(/\s*$/, '');
const WRAP = L(
  '',
  '/** 浏览器端解 zlib（APNG 每一帧的数据都是一条独立的 zlib 流） */',
  'async function mkInflateZlib (u8) {',
  '  if (typeof DecompressionStream === "undefined") throw new Error("这个浏览器没有 DecompressionStream，拆不了 APNG");',
  '  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate"));',
  '  return new Uint8Array(await new Response(stream).arrayBuffer());',
  '}',
  '/** APNG 字节 → { frames: [canvas], delay }；静态 PNG / 解不出来返回 null */',
  'async function mkApngFrames (bytes, max) {',
  '  try {',
  '    const g = await apngDecodeFrames(bytes, max || 24, mkInflateZlib);',
  '    if (!g || !g.length) return null;',
  '    return { frames: mkFramesToCanvases(g), delay: g[0].delay, total: g.length };',
  '  } catch (e) { return null }',
  '}',
  ''
);
rep('async function mkReadImage (file) {', dec + '\n' + WRAP + 'async function mkReadImage (file) {', 'APNG 解析器搬进 app.js');

/* ---------- ② mkReadImage：PNG 走自己的 APNG 解析；WebP 仍交给内核 ---------- */
rep(
  L('    /* ② APNG / 动图 WebP：这两种得靠内核的 ImageDecoder，有就用 */',
    "    if (typeof ImageDecoder !== 'undefined' && /webp|apng|png$/i.test(file.type)) {"),
  L('    /* ② APNG：也自己解（acTL / fcTL / fdAT + 帧合成）；普通 PNG 会返回 null，照旧走静态那条路 */',
    "    const isPng = /png/i.test(file.type || '') || /\\.png$/i.test(file.name || '');",
    '    if (isPng) {',
    '      const a = await mkApngFrames(new Uint8Array(await file.arrayBuffer()), 24);',
    '      if (a && a.frames.length > 1) { URL.revokeObjectURL(url); return { frames: a.frames, cover: a.frames[0], delay: a.delay, apng: true } }',
    '      if (a && a.frames.length === 1) { URL.revokeObjectURL(url); return { frames: a.frames, cover: a.frames[0], delay: a.delay, apng: true, single: true } }',
    '    }',
    '    /* ③ 动图 WebP：这个只能靠内核的 ImageDecoder（没有它就只能按第一帧用，界面上会说实话） */',
    "    if (typeof ImageDecoder !== 'undefined' && /webp$/i.test(file.type)) {"),
  'mkReadImage 先走 APNG 解析器'
);

/* ---------- ③ 单帧时的话要说准（三种格式三种说法） ---------- */
rep(
  L("    } else if (info.gif) status('已使用「' + f.name + '」：这是一个只有 1 帧的 GIF，按静态图用。');",
    "    else status('已使用「' + f.name + '」（单帧）。GIF 一定能拆帧；APNG / 动图 WebP 要看这个浏览器给不给拆。');"),
  L("    } else if (info.gif) status('已使用「' + f.name + '」：这是一个只有 1 帧的 GIF，按静态图用。');",
    "    else if (info.apng) status('已使用「' + f.name + '」：这个 PNG 里只有 1 帧，按静态图用。');",
    "    else if (/webp/i.test(f.type || '') || /\\.webp$/i.test(f.name || '')) status('已使用「' + f.name + '」（单帧）。动图 WebP 拆帧要靠浏览器内核，这个环境给不了 —— GIF 和 APNG 都能拆。');",
    "    else status('已使用「' + f.name + '」（单帧，按静态图用）。');"),
  '单帧提示分格式说实话'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['function apngDecodeFrames (bytes, maxFrames, inflate)', 'async function mkInflateZlib (u8)', 'async function mkApngFrames (bytes, max)', 'const isPng = /png/i.test(file.type', 'if (typeof ImageDecoder !== \'undefined\' && /webp$/i.test(file.type))', '这个 PNG 里只有 1 帧'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
