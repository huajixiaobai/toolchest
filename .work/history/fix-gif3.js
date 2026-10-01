const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
const from = `function encodeGIF (frames, delayMs, bg) {
  const W = frames[0].width; const H = frames[0].height;
  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);`.split('\n').join(NL)
const to = `function encodeGIF (frames, delayMs, bg, opts) {
  opts = opts || {};
  const want = opts.colors || 256;
  const W = frames[0].width; const H = frames[0].height;
  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);`.split('\n').join(NL)
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
