/* 调试：把 upng-js 造出来的 APNG 的块结构打出来，看我的解码器卡在哪个提前返回上 */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const UPNG = require('upng-js')
const src = fs.readFileSync(path.join(__dirname, '..', 'apngdec.js'), 'utf8')
const apngDecodeFrames = new Function(src + '\nreturn apngDecodeFrames')()

const W = 8, H = 8, n = 4
const bufs = []
for (let f = 0; f < n; f++) {
  const px = new Uint8Array(W * H * 4)
  for (let i = 0; i < W * H; i++) { px[i * 4] = 10 * f; px[i * 4 + 1] = 200 - 10 * f; px[i * 4 + 2] = 5; px[i * 4 + 3] = 255 }
  bufs.push(px.buffer.slice(px.byteOffset, px.byteOffset + px.byteLength))
}
const png = new Uint8Array(UPNG.encode(bufs, W, H, 0, [50, 60, 70, 80]))
fs.writeFileSync(path.join(__dirname, 'upng-sample.png'), png)
console.log('UPNG 产出的字节数: ' + png.length + '（已存 .work/verify/upng-sample.png）')

const u8 = png
const u32 = (o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0
let p = 8
let fc = 0, fd = 0, id = 0
while (p + 8 <= u8.length) {
  const len = u32(p)
  const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7])
  if (type === 'IHDR') console.log('  IHDR ' + u32(p + 8) + '×' + u32(p + 12) + ' 位深=' + u8[p + 16] + ' 色型=' + u8[p + 17] + ' 隔行=' + u8[p + 20])
  else if (type === 'acTL') console.log('  acTL 声明帧数=' + u32(p + 8) + ' 循环=' + u32(p + 12))
  else if (type === 'fcTL') { fc++; console.log('  fcTL#' + fc + ' 序号=' + u32(p + 8) + ' 矩形=' + u32(p + 12) + 'x' + u32(p + 16) + '@' + u32(p + 20) + ',' + u32(p + 24) + ' 延时=' + ((u8[p + 28] << 8) | u8[p + 29]) + '/' + ((u8[p + 30] << 8) | u8[p + 31]) + ' dispose=' + u8[p + 32] + ' blend=' + u8[p + 33]) }
  else if (type === 'fdAT') { fd++; if (fd <= 2) console.log('  fdAT#' + fd + ' 序号=' + u32(p + 8) + ' 长度=' + len) }
  else if (type === 'IDAT') { id++; if (id <= 2) console.log('  IDAT#' + id + ' 长度=' + len) }
  else console.log('  ' + type + ' 长度=' + len)
  p += 12 + len
}
console.log('合计: fcTL=' + fc + ' fdAT=' + fd + ' IDAT=' + id)

apngDecodeFrames(u8, 24, (b) => zlib.inflateSync(Buffer.from(b))).then((r) => {
  console.log('我的解码器结果: ' + (r ? r.length + ' 帧' : 'null'))
}).catch((e) => console.log('抛错: ' + e.message))
