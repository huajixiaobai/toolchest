/* Re-add the GIF palette-refinement + dither helpers (they went missing) and verify by grep. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
if (s.includes('function ditherFrame')) { console.log('helpers already present'); process.exit(0) }

const anchor = '/** Build a palette (list of rgb triplets) plus a nearest-colour cache. */'
const at = s.indexOf(anchor.split('\n').join(NL))
if (at < 0) { console.log('FAIL: anchor not found'); process.exit(1) }

const HELPERS = `/**
 * A few Lloyd (k-means) iterations on top of the median-cut result: every palette entry moves to
 * the weighted mean of the colours that map to it. Cheap on a capped histogram, and it visibly
 * cleans up the smooth gradients the shader effects produce.
 */
function refinePalette (colors, palette, iterations) {
  let cur = palette.map((c) => c.slice());
  const step = colors.length > 4096 ? Math.ceil(colors.length / 4096) : 1;
  const sample = step > 1 ? colors.filter((_, i) => i % step === 0) : colors;
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
 * Floyd–Steinberg error diffusion. GIF has 256 colours at most, and these shader gradients band
 * badly without it; with it the eye blends neighbouring pixels back into the missing colours.
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

`
s = s.slice(0, at) + HELPERS.split('\n').join(NL) + s.slice(at)
fs.writeFileSync(F, s)
const out = fs.readFileSync(F, 'utf8')
new Function(out)
for (const k of ['function ditherFrame', 'function refinePalette', 'refinePalette(list, palette, 4)']) {
  console.log(k.padEnd(32), (out.split(k).length - 1))
}
console.log('done, syntax OK')
