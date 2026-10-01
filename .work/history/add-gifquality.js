/* Objective GIF quality check: encode the same frames at several settings and measure the
   colour error of the decoded result against the source. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
if (s.includes('gifQuality: `')) { console.log('already present'); process.exit(0) }
const SCENARIO = `
  gifQuality: \`(async()=>{
    const A = window.__BALATRO__;
    const r = {};
    const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s) };
    const frames = [];
    const spec = Object.assign({}, A.specForItem(A.byId['j_joker']), { edition: 'e_polychrome' });
    for (let i = 0; i < 3; i++) frames.push(A.compose(spec, 2, i * 3));
    r.src = frames.map((f) => f.toDataURL('image/png'));
    const t0 = performance.now();
    const plain = A.encodeGIF(frames, 60, null, { dither: false, colors: 256 });
    const t1 = performance.now();
    const dith = A.encodeGIF(frames, 60, null, { dither: true, colors: 256 });
    const t2 = performance.now();
    const d128 = A.encodeGIF(frames, 60, null, { dither: true, colors: 128 });
    const t3 = performance.now();
    const d64 = A.encodeGIF(frames, 60, null, { dither: true, colors: 64 });
    r.times = { plain: Math.round(t1 - t0), dither: Math.round(t2 - t1), d128: Math.round(t3 - t2) };
    r.plain = { size: plain.length, b64: b64(plain) };
    r.dither = { size: dith.length, b64: b64(dith) };
    r.c128 = { size: d128.length, b64: b64(d128) };
    r.c64 = { size: d64.length, b64: b64(d64) };
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
