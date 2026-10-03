/* 造一张用于端到端测试的 APNG（71×95，按卡面尺寸），用独立的 upng-js 编码。
   用法：node .work/verify/mk-apng-sample.js */
'use strict'
const fs = require('fs')
const path = require('path')
const UPNG = require('upng-js')

const W = 71, H = 95, N = 5
const bufs = []
for (let f = 0; f < N; f++) {
  const px = new Uint8Array(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4
      const cx = 20 + f * 8
      const inBar = (x >= cx && x < cx + 12 && y > 20 && y < 70)
      const inDot = ((x - 35) * (x - 35) + (y - (20 + f * 10)) * (y - (20 + f * 10))) < 36
      px[o] = inBar ? 250 : (inDot ? 60 : 15)
      px[o + 1] = inBar ? 90 : (inDot ? 220 : 20)
      px[o + 2] = inBar ? 30 : (inDot ? 120 : 40)
      px[o + 3] = (x < 3 || y < 3) ? 0 : 255    /* 留一圈透明边，顺便测 alpha */
    }
  }
  bufs.push(px.buffer.slice(px.byteOffset, px.byteOffset + px.byteLength))
}
/* 延时故意不均匀：基准 60ms，倍数应当是 1 / 1 / 2 / 1 / 3 —— 用来验证逐帧时长（sprite_args.frame_durations） */
const dels = [60, 60, 120, 60, 180]
const png = UPNG.encode(bufs, W, H, 0, dels)     /* 无损 RGBA */
const out = path.join(__dirname, 'gifdump', 'apng-sample.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, Buffer.from(png))
console.log('已生成 ' + out + '（' + W + '×' + H + '，' + N + ' 帧，延时 ' + dels.join('/') + 'ms，' + Math.round(png.byteLength / 1024) + ' KB）')
