/* 调试用：把 gifdec.js 的关键位置插上探针，看手工小 GIF 到底卡在哪一步 */
'use strict'
const fs = require('fs')
const path = require('path')
let src = fs.readFileSync(path.join(__dirname, '..', 'gifdec.js'), 'utf8')
let n = 0
const rep = (from, to, label) => {
  const hits = src.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1) }
  src = src.replace(from, () => to); n++
}
rep('  const limit = Math.max(1, maxFrames || 24)',
  "  if (globalThis.__T) console.log('[头] sig=' + sig + ' ' + sw + 'x' + sh + ' flags=0x' + flags.toString(16) + ' gctN=' + gctN + ' p=' + p + ' 总长=' + u8.length)",
  '头部探针')
rep('      const px = new Uint8ClampedArray(iw * ih * 4)',
  "      if (globalThis.__T) console.log('[图] ix/iy=' + ix + ',' + iy + ' iw/ih=' + iw + 'x' + ih + ' pf=0x' + pf.toString(16) + ' minCode=' + minCode + ' 数据=' + total + '字节 调色板=' + (pal ? pal.length / 3 + '色' : 'null') + ' 透明索引=' + gce.transparent)\n      const px = new Uint8ClampedArray(iw * ih * 4)",
  '图像块探针')
rep('    const put = (paletteIndex, pos) => {',
  "    const put = (paletteIndex, pos) => {\n      if (globalThis.__T && pos < 6) console.log('  put 索引=' + paletteIndex + ' 位置=' + pos)",
  'put 探针')
rep('      lzwToRGBA(minCode, data, px, iw, ih, pal, gce.transparent)',
  "      const used = lzwToRGBA(minCode, data, px, iw, ih, pal, gce.transparent)\n      if (globalThis.__T) console.log('[LZW] 写出像素数=' + used + ' 前 8 字节=' + Array.from(px.slice(0, 8)).join(','))",
  'LZW 返回值探针')
globalThis.__T = true
const gifDecodeFrames = new Function(src + '\nreturn gifDecodeFrames')()

/* 和测试里一模一样的手工小 GIF */
const pal = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]]
const idx = [0, 1, 2, 3, 0, 2]
const bytes = []
const push = (...v) => { for (const x of v) bytes.push(x & 0xff) }
const pushStr = (s) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)) }
pushStr('GIF89a')
push(2, 0, 3, 0)
push(0x80 | 0x00 | 0x01, 0, 0)
for (const c of pal) push(c[0], c[1], c[2])
push(0x21, 0xf9, 4, 0, 5, 0, 0, 0)
push(0x2c)
push(0, 0, 2, 0, 3, 0)
push(0x00)
push(2)
const codes = [4, 0, 1, 2, 3, 0, 2, 5]
let cur = 0, bits = 0
const lz = []
for (const c of codes) { cur |= c << bits; bits += 3; while (bits >= 8) { lz.push(cur & 0xff); cur >>>= 8; bits -= 8 } }
if (bits > 0) lz.push(cur & 0xff)
push(lz.length)
for (const b of lz) push(b)
push(0)
push(0x3b)
console.log('构造出的 GIF 共 ' + bytes.length + ' 字节，LZW 数据 ' + lz.length + ' 字节: ' + lz.join(','))
const r = gifDecodeFrames(new Uint8Array(bytes), 24)
console.log('结果：' + (r ? r.length + ' 帧，第一帧前 8 字节 ' + Array.from(r[0].rgba.slice(0, 8)).join(',') : 'null'))
console.log('（插入探针 ' + n + ' 处）')
