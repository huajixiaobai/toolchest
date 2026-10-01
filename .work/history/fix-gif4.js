/* Replace the per-frame index loop with the dither-aware version (line-range edit: the string
   form kept silently missing). */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n'
const lines = fs.readFileSync(F, 'utf8').split(/\r?\n/)
const start = lines.findIndex((l) => /^  const delay = Math\.max\(2, Math\.round\(delayMs \/ 10\)\);$/.test(l))
if (start < 0) { console.log('FAIL: delay line not found'); process.exit(1) }
let end = start
while (!/^  push\(0x3b\);$/.test(lines[end])) end++
console.log('replacing lines', start + 1, '-', end + 1)
const NEW = `  const delay = Math.max(2, Math.round(delayMs / 10));
  const dither = opts.dither !== false;
  for (let fi = 0; fi < datas.length; fi++) {
    const d = datas[fi];
    // Floyd–Steinberg when enabled: 256 colours band badly on these gradients without it
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
    // graphic control extension
    push(0x21, 0xf9, 0x04, (2 << 2) | (transparentIndex >= 0 ? 1 : 0));
    push16(delay);
    push(transparentIndex >= 0 ? transparentIndex : 0, 0);
    // image descriptor
    push(0x2c); push16(0); push16(0); push16(W); push16(H); push(0);
    const lzw = lzwEncode(indices, 8);
    push(8);
    for (let i = 0; i < lzw.length; i += 255) {
      const n = Math.min(255, lzw.length - i);
      push(n);
      for (let k = 0; k < n; k++) bytes.push(lzw[i + k]);
    }
    push(0);
  }`.split('\n')
lines.splice(start, end - start + 1, ...NEW)
fs.writeFileSync(F, lines.join(NL))
const out = fs.readFileSync(F, 'utf8')
new Function(out)
console.log('dither branch installed; ditherFrame present:', out.includes('function ditherFrame'))
