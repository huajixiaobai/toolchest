/* GIF quality: refine the median-cut palette with a few Lloyd iterations, and dither when
   mapping pixels to it (that is what makes a 256-colour GIF show smooth gradients).
   Both are switchable; the palette size becomes a user choice too. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`/** Build a palette (list of rgb triplets) plus a nearest-colour cache. */
function buildGifPalette (frames, bg, maxColors) {`,
  `/**
 * A few Lloyd (k-means) iterations on top of the median-cut result: every palette entry moves
 * to the weighted mean of the colours that map to it. Cheap on a capped histogram, and it
 * noticeably cleans up the smooth gradients the shader effects produce.
 */
function refinePalette (colors, palette, iterations) {
  let cur = palette.map((c) => c.slice());
  const sample = colors.length > 4096
    ? colors.filter((_, i) => i % Math.ceil(colors.length / 4096) === 0)
    : colors;
  for (let it = 0; it < iterations; it++) {
    const acc = cur.map(() => [0, 0, 0, 0]);
    for (const c of sample) {
      let bi = 0; let bd = Infinity;
      for (let i = 0; i < cur.length; i++) {
        const p = cur[i];
        const dr = c.rgb[0] - p[0]; const dg = c.rgb[1] - p[1]; const db = c.rgb[2] - p[2];
        const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
        if (d < bd) { bd = d; bi = i }
      }
      const a = acc[bi];
      a[0] += c.rgb[0] * c.n; a[1] += c.rgb[1] * c.n; a[2] += c.rgb[2] * c.n; a[3] += c.n;
    }
    cur = acc.map((a, i) => (a[3] > 0
      ? [Math.round(a[0] / a[3]), Math.round(a[1] / a[3]), Math.round(a[2] / a[3])]
      : cur[i]));
  }
  return cur;
}

/**
 * Floyd–Steinberg error diffusion. Without it 256 colours band badly on these gradients;
 * with it the eye blends neighbouring pixels into the colours that were lost.
 */
function ditherFrame (data, W, H, palette, nearest, colorBase, transparentIndex, bg) {
  const out = new Uint8Array(W * H);
  const e0 = new Float32Array((W + 2) * 3);
  const e1 = new Float32Array((W + 2) * 3);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < H; y++) {
    e1.fill(0);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const alpha = data[i + 3];
      if (bg === null && alpha < 128) { out[y * W + x] = transparentIndex; continue }
      let r = data[i]; let g = data[i + 1]; let b = data[i + 2];
      if (bg !== null) {
        const af = alpha / 255;
        r = r * af + bg[0] * (1 - af); g = g * af + bg[1] * (1 - af); b = b * af + bg[2] * (1 - af);
      }
      const o = (x + 1) * 3;
      r = clamp(Math.round(r + e0[o]));
      g = clamp(Math.round(g + e0[o + 1]));
      b = clamp(Math.round(b + e0[o + 2]));
      const pi = nearest(r, g, b);
      out[y * W + x] = colorBase + pi;
      const c = palette[pi];
      const dr = r - c[0]; const dg = g - c[1]; const db = b - c[2];
      e0[o + 3] += dr * 0.4375; e0[o + 4] += dg * 0.4375; e0[o + 5] += db * 0.4375;
      e1[o - 3] += dr * 0.1875; e1[o - 2] += dg * 0.1875; e1[o - 1] += db * 0.1875;
      e1[o] += dr * 0.3125; e1[o + 1] += dg * 0.3125; e1[o + 2] += db * 0.3125;
      e1[o + 3] += dr * 0.0625; e1[o + 4] += dg * 0.0625; e1[o + 5] += db * 0.0625;
    }
    e0.set(e1);
  }
  return out;
}

/** Build a palette (list of rgb triplets) plus a nearest-colour cache. */
function buildGifPalette (frames, bg, maxColors, refine) {`,
  'refine + dither helpers')

rep(`  const list = [...hist.values()].sort((a, b) => b.n - a.n);
  let palette;
  if (list.length <= maxColors) palette = list.map((c) => c.rgb);
  else palette = medianCutPalette(list, maxColors);
  if (!palette.length) palette = [[0, 0, 0]];`,
  `  const list = [...hist.values()].sort((a, b) => b.n - a.n);
  let palette;
  if (list.length <= maxColors) palette = list.map((c) => c.rgb);
  else {
    palette = medianCutPalette(list, maxColors);
    if (refine !== false && palette.length > 2) palette = refinePalette(list, palette, 4);
  }
  if (!palette.length) palette = [[0, 0, 0]];`,
  'use refine')

rep(`function encodeGIF (frames, delayMs, bg) {
  const W = frames[0].width; const H = frames[0].height;
  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);
  const { palette, nearest } = buildGifPalette(datas, bg, bg === null ? 255 : 256);`,
  `function encodeGIF (frames, delayMs, bg, opts) {
  opts = opts || {};
  const want = opts.colors || 256;
  const W = frames[0].width; const H = frames[0].height;
  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);
  const { palette, nearest } = buildGifPalette(datas, bg, (bg === null ? 254 : 256, Math.min(want, bg === null ? 255 : 256)), opts.refine);`,
  'encodeGIF options')

rep(`  const delay = Math.max(2, Math.round(delayMs / 10));
  const indices = new Uint8Array(W * H);
  for (let fi = 0; fi < datas.length; fi++) {
    const d = datas[fi];
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const a = d[i + 3];
      if (bg === null) {
        if (a < 128) { indices[p] = transparentIndex; continue }
        indices[p] = colorBase + nearest(d[i], d[i + 1], d[i + 2]);
      } else {
        const af = a / 255;
        const r = Math.round(d[i] * af + bg[0] * (1 - af));
        const g = Math.round(d[i + 1] * af + bg[1] * (1 - af));
        const b = Math.round(d[i + 2] * af + bg[2] * (1 - af));
        indices[p] = nearest(r, g, b);
      }
    }
    // graphic control extension`,
  `  const delay = Math.max(2, Math.round(delayMs / 10));
  const dither = opts.dither !== false;
  for (let fi = 0; fi < datas.length; fi++) {
    const d = datas[fi];
    const indices = dither
      ? ditherFrame(d, W, H, palette, nearest, colorBase, transparentIndex, bg)
      : (() => {
          const idx = new Uint8Array(W * H);
          for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            const a = d[i + 3];
            if (bg === null) {
              if (a < 128) { idx[p] = transparentIndex; continue }
              idx[p] = colorBase + nearest(d[i], d[i + 1], d[i + 2]);
            } else {
              const af = a / 255;
              idx[p] = nearest(
                Math.round(d[i] * af + bg[0] * (1 - af)),
                Math.round(d[i + 1] * af + bg[1] * (1 - af)),
                Math.round(d[i + 2] * af + bg[2] * (1 - af)));
            }
          }
          return idx;
        })();
    // graphic control extension`,
  'dither in encode')

/* state + UI */
rep(`  gifBg: null,`,
  `  gifBg: null,
  gifColors: 256,     // GIF palette size; 128 + dithering often beats 256 without it
  gifDither: true,    // Floyd–Steinberg error diffusion`,
  'gif state')

rep(`  const bgSel = document.createElement('select'); bgSel.className = 'tbtn';`,
  `  const colSel = document.createElement('select'); colSel.className = 'tbtn';
  for (const [v, label] of [[256, 'GIF 色彩：256 色'], [128, 'GIF 色彩：128 色'], [64, 'GIF 色彩：64 色']]) {
    const o = document.createElement('option'); o.value = v; o.textContent = label; if (S.gifColors === v) o.selected = true; colSel.appendChild(o);
  }
  colSel.onchange = () => { S.gifColors = +colSel.value; refreshAnimInfo() };
  const dithBtn = document.createElement('button');
  dithBtn.className = 'btn' + (S.gifDither ? ' primary' : '');
  dithBtn.textContent = S.gifDither ? '抖动：开' : '抖动：关';
  dithBtn.title = '抖动 = Floyd–Steinberg 误差扩散。GIF 只有 256 色，不开抖动时这些渐变会明显分层。';
  dithBtn.onclick = () => { S.gifDither = !S.gifDither; dithBtn.textContent = S.gifDither ? '抖动：开' : '抖动：关'; dithBtn.classList.toggle('primary', S.gifDither) };
  r$ROW$.appendChild(colSel);
  r$ROW$.appendChild(dithBtn);
  const bgSel = document.createElement('select'); bgSel.className = 'tbtn';`,
  'gif ui')

console.log(fails ? 'FAILURES ' + fails : 'done')
