const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
const from = `  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);
  const { palette, nearest } = buildGifPalette(datas, bg, bg === null ? 255 : 256);`.split('\n').join(NL)
const to = `  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);
  // index 0 is reserved for transparency, so the rest of the table is what is left
  const maxColors = Math.min(want, bg === null ? 255 : 256);
  const { palette, nearest } = buildGifPalette(datas, bg, maxColors, opts.refine);`.split('\n').join(NL)
let n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL palette ' + n); process.exit(1) }
s = s.replace(from, to)

const from2 = `  const bytes = encodeGIF(f, d, bg);`
const to2 = `  const bytes = encodeGIF(f, d, bg, { colors: S.gifColors, dither: S.gifDither });`
n = s.split(from2).length - 1
if (n !== 1) { console.log('FAIL call ' + n); process.exit(1) }
s = s.replace(from2, to2)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
