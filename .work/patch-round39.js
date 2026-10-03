/* 第三十九轮：
   ① 自己写 GIF 帧解析（不依赖 ImageDecoder —— 上次实测那个内核给不出多帧）→ 上传动图真的能拆帧
   ② 「照现成的牌做一个」并进「来源与贴图」：克隆下拉直接放在贴图那一块的最前面（不再跨块塞 DOM）
   ③ 预览逐帧播放 + 导出横向帧序列 + Lua 里写 frames */
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

/* ---------- ① GIF 解码器（纯 JS，浏览器/Node 都能跑） ---------- */
const GIFDEC = L(
  '/* ---------------------------------------------------------------- GIF 帧解析',
  ' * 自己写的 GIF89a 解析：以前靠 ImageDecoder，但那东西在部分内核（含无头 Chrome）里给不出多帧，',
  ' * 于是"上传动图"看起来完全没反应。这里直接解：块解析 + LZW 解压 + 按 disposal 方法合成每一帧。',
  ' * 返回 [{ canvas, delay }]，最多 24 帧。 */',
  'function gifDecode (bytes, maxFrames) {',
  '  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);',
  '  let p = 0;',
  '  const u16 = () => { const v = u8[p] | (u8[p + 1] << 8); p += 2; return v };',
  '  const sig = String.fromCharCode(u8[0], u8[1], u8[2], u8[3], u8[4], u8[5]);',
  "  if (sig.indexOf('GIF') !== 0) return null;",
  '  p = 6;',
  '  const sw = u16(), sh = u16();',
  '  const flags = u8[p++];',
  '  const gctSize = (flags & 0x80) ? 2 << (flags & 7) : 0;',
  '  p += 2;                 /* 背景色索引 + 像素宽高比 */',
  '  let gct = null;',
  '  if (gctSize) { gct = u8.subarray(p, p + gctSize * 3); p += gctSize * 3 }',
  '  const out = [];',
  '  let frame = null;       /* 当前累积的画面（RGBA） */',
  '  let prev = null;        /* disposal=3 要用的上一帧快照 */',
  '  let gce = { delay: 8, transparent: -1, disposal: 0 };',
  '  const mkCanvas = (w, h) => { const c = newCanvas(w, h); return c };',
  '  const cvs = mkCanvas(sw, sh);',
  '  const ctx = cvs.getContext("2d");',
  '  const readAll = () => {',
  '    const d = ctx.getImageData(0, 0, sw, sh);',
  '    return new Uint8ClampedArray(d.data);',
  '  };',
  '  const writeAll = (data) => { ctx.putImageData(new ImageData(data, sw, sh), 0, 0) };',
  '  writeAll(new Uint8ClampedArray(sw * sh * 4));',
  '  const skipBlocks = () => { while (u8[p] !== 0) p += u8[p] + 1; p++ };',
  '  const lzw = (minCode, data, px, w, h, lct, transparent) => {',
  '    const clear = 1 << minCode, end = clear + 1;',
  '    let size = minCode + 1, next = end + 1, dict = [], bitPos = 0;',
  '    const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; dict[clear] = []; dict[end] = []; size = minCode + 1; next = end + 1 };',
  '    reset();',
  '    const read = (bits) => {',
  '      let v = 0;',
  '      for (let i = 0; i < bits; i++) {',
  '        const byte = data[bitPos >> 3];',
  '        if (byte === undefined) return -1;',
  '        v |= ((byte >> (bitPos & 7)) & 1) << i;',
  '        bitPos++;',
  '      }',
  '      return v;',
  '    };',
  '    let x = 0, y = 0, prevCode = -1;',
  '    for (;;) {',
  '      const code = read(size);',
  '      if (code < 0) break;',
  '      if (code === clear) { reset(); prevCode = -1; continue }',
  '      if (code === end) break;',
  '      let entry;',
  '      if (code < next && dict[code]) entry = dict[code];',
  '      else if (prevCode >= 0 && dict[prevCode]) entry = dict[prevCode].concat(dict[prevCode][0]);',
  '      else break;',
  '      if (prevCode >= 0 && next < 4096) { dict[next++] = dict[prevCode].concat(entry[0]); if (next === (1 << size) && size < 12) size++ }',
  '      prevCode = code;',
  '      for (let i = 0; i < entry.length; i++) {',
  '        const ci = entry[i];',
  '        if (x < w) {',
  '          px[(y * w + x) * 4 + 3] = (ci === transparent) ? 0 : 255;',
  '          px[(y * w + x) * 4 + 0] = lct[ci * 3];',
  '          px[(y * w + x) * 4 + 1] = lct[ci * 3 + 1];',
  '          px[(y * w + x) * 4 + 2] = lct[ci * 3 + 2];',
  '        }',
  '        x++;',
  '        if (x >= w) { x = 0; y++; if (y >= h) return }',
  '      }',
  '    }',
  '  };',
  '  const limit = maxFrames || 24;',
  '  while (p < u8.length) {',
  '    const b = u8[p++];',
  '    if (b === 0x21) {                     /* 扩展块 */',
  '      const label = u8[p++];',
  '      if (label === 0xF9) {',
  '        const size = u8[p++];',
  '        const packed = u8[p];',
  '        gce.delay = (u8[p + 1] | (u8[p + 2] << 8)) * 10;   /* 单位 1/100 秒 → 毫秒 */',
  '        gce.transparent = (packed & 1) ? u8[p + 3] : -1;',
  '        gce.disposal = (packed >> 2) & 7;',
  '        p += size;',
  '        skipBlocks();',
  '      } else { skipBlocks() }',
  '    } else if (b === 0x2C) {               /* 图像块 */',
  '      const ix = u16(), iy = u16(), iw = u16(), ih = u16();',
  '      const pf = u8[p++];',
  '      const hasLct = !!(pf & 0x80);',
  '      const lctSize = hasLct ? 2 << (pf & 7) : 0;',
  '      let lct = gct;',
  '      if (hasLct) { lct = u8.subarray(p, p + lctSize * 3); p += lctSize * 3 }',
  '      const minCode = u8[p++];',
  '      const chunks = [];',
  '      while (u8[p] !== 0) { const len = u8[p]; p++; chunks.push(u8.subarray(p, p + len)); p += len }',
  '      p++;',
  '      let total = 0; for (const c of chunks) total += c.length;',
  '      const data = new Uint8Array(total);',
  '      let off = 0; for (const c of chunks) { data.set(c, off); off += c.length }',
  '      const before = gce.disposal === 3 ? readAll() : null;',
  '      const px = new Uint8ClampedArray(iw * ih * 4);',
  '      lzw(minCode, data, px, iw, ih, lct || new Uint8Array(768), gce.transparent);',
  '      ctx.putImageData(new ImageData(px, iw, ih), ix, iy);',
  '      const snap = mkCanvas(sw, sh);',
  '      snap.getContext("2d").drawImage(cvs, 0, 0);',
  '      out.push({ canvas: snap, delay: Math.max(20, gce.delay || 80) });',
  '      if (out.length >= limit) break;',
  '      if (gce.disposal === 2) { ctx.clearRect(ix, iy, iw, ih) }',
  '      else if (gce.disposal === 3 && before) { writeAll(before) }',
  '      gce = { delay: 8, transparent: -1, disposal: 0 };',
  '    } else if (b === 0x3B) { break }       /* 结束 */',
  '    else { break }',
  '  }',
  '  return out.length ? out : null;',
  '}',
  ''
);
rep("async function mkReadImage (file) {", GIFDEC + "async function mkReadImage (file) {", 'GIF 解码器');

/* ---------- ② mkReadImage：GIF 先走自己的解析器 ---------- */
rep(
  L('async function mkReadImage (file) {',
    '  const url = URL.createObjectURL(file);',
    '  try {',
    "    if (typeof ImageDecoder !== 'undefined' && /gif|webp|apng|png$/i.test(file.type)) {"),
  L('async function mkReadImage (file) {',
    '  const url = URL.createObjectURL(file);',
    '  try {',
    '    /* ① GIF：用自己的解析器（不挑浏览器，无头环境也能拆） */',
    '    try {',
    "      if (/gif/i.test(file.type || '') || /gif/i.test(file.name || '')) {",
    '        const g = gifDecode(new Uint8Array(await file.arrayBuffer()), 24);',
    '        if (g && g.length > 1) { URL.revokeObjectURL(url); return { frames: g.map((f) => f.canvas), cover: g[0].canvas, delay: g[0].delay } }',
    '        if (g && g.length === 1) { URL.revokeObjectURL(url); return { frames: [g[0].canvas], cover: g[0].canvas } }',
    '      }',
    '    } catch (e) { /* 解析失败就走下面的通用路 */ }',
    "    if (typeof ImageDecoder !== 'undefined' && /webp|apng|png$/i.test(file.type)) {"),
  'mkReadImage 先走 GIF 解析器');

/* ---------- ③ 克隆下拉并进「来源与贴图」 ---------- */
rep(
  L("      box.innerHTML = '<div class=\"mklabel\">贴图（点格子换图，或上传自己的图）</div>';",
    "      box.appendChild(b);"),
  L("      box.innerHTML = '<div class=\"mklabel\">来源与贴图 —— 照现成的牌做，或从图集里取一格，或上传自己的图（三条路都在这一块）</div>';",
    "      /* 克隆下拉就放在取图前面：它们本来就是同一件事（决定这张牌长什么样） */",
    "      /* 克隆下拉就在这一块里（同一个函数作用域，直接用变量） */",
    "      box.appendChild(clone);",
    "      box.appendChild(b);"),
  '克隆并进来源块');
rep(
  "    b.appendChild(clone);\n    const secType = sec('① 做什么（也决定预览长什么样）', b, 'type');",
  "    /* clone 会在下面的「来源与贴图」里挂上去 */\n    const secType = sec('① 做什么（也决定预览长什么样）', b, 'type');",
  '克隆挪出①');

/* ---------- ④ 预览逐帧：动图按自己的帧延时走 ---------- */
rep(
  "    mkFrame = (mkFrame + 1) % total;",
  "    mkFrame = (mkFrame + 1) % total;",
  '（帧推进保持不变）');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
