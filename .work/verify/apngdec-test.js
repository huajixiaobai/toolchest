/* APNG 解码器回归测试（纯 Node，不开浏览器）
   ① 手工构造的 6×3 APNG：逐帧子矩形 + dispose=1 + blend=1，逐像素对答案
   ② 用独立的 upng-js 编码（真彩 + 调色板两种）→ 我的解码器解回来 → 与原始帧逐像素比
   用法：node .work/verify/apngdec-test.js */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const UPNG = require('upng-js')

const src = fs.readFileSync(path.join(__dirname, '..', 'apngdec.js'), 'utf8')
const apngDecodeFrames = new Function(src + '\nreturn apngDecodeFrames')()
const inflate = (u8) => zlib.inflateSync(Buffer.from(u8))

let fail = 0
const ok = (name, cond, info) => { console.log((cond ? '  ✓ ' : '  ❌ ') + name + (info ? '  ' + info : '')); if (!cond) fail++ }

/* ---------- 造 PNG 块 ---------- */
let CRC = null
function crc32 (buf) {
  if (!CRC) {
    CRC = new Int32Array(256)
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); CRC[n] = c }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk (type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
/** RGBA 像素 → 每行 filter 0 的原始扫描线，再 zlib 压缩 */
function rawFrame (w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = rgba[(y * w * 4) + x]
  }
  return zlib.deflateSync(raw)
}

/* ---------- ① 手工 APNG：子矩形 / dispose / blend ---------- */
function buildHandmade () {
  const W = 6, H = 3
  const solid = (w, h, r, g, b, a) => { const px = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = a } return px }
  const parts = []
  parts.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6
  parts.push(chunk('IHDR', ihdr))
  const actl = Buffer.alloc(8); actl.writeUInt32BE(4, 0); actl.writeUInt32BE(0, 4)
  parts.push(chunk('acTL', actl))
  const fctl = (seq, w, h, x, y, dn, dd, disp, blend) => {
    const b = Buffer.alloc(26)
    b.writeUInt32BE(seq, 0); b.writeUInt32BE(w, 4); b.writeUInt32BE(h, 8); b.writeUInt32BE(x, 12); b.writeUInt32BE(y, 16)
    b.writeUInt16BE(dn, 20); b.writeUInt16BE(dd, 22); b[24] = disp; b[25] = blend
    return chunk('fcTL', b)
  }
  const fdat = (seq, data) => { const b = Buffer.alloc(4); b.writeUInt32BE(seq, 0); return chunk('fdAT', Buffer.concat([b, Buffer.from(data)])) }
  /* 第 0 帧：整张红，dispose=0 blend=0，数据走 IDAT */
  parts.push(fctl(0, W, H, 0, 0, 1, 10, 0, 0))
  parts.push(chunk('IDAT', rawFrame(W, H, solid(W, H, 255, 0, 0, 255))))
  /* 第 1 帧：2×1 绿贴在 (2,1)，dispose=1（显示完把这块抹掉） */
  parts.push(fctl(1, 2, 1, 2, 1, 1, 10, 1, 0))
  parts.push(fdat(2, rawFrame(2, 1, solid(2, 1, 0, 255, 0, 255))))
  /* 第 2 帧：1×1 蓝贴在 (0,0)，blend=0 */
  parts.push(fctl(3, 1, 1, 0, 0, 2, 10, 0, 0))
  parts.push(fdat(4, rawFrame(1, 1, solid(1, 1, 0, 0, 255, 255))))
  /* 第 3 帧：1×1 半透明白叠在 (1,0)，blend=1（alpha 叠加） */
  parts.push(fctl(5, 1, 1, 1, 0, 1, 100, 0, 1))
  parts.push(fdat(6, rawFrame(1, 1, solid(1, 1, 255, 255, 255, 128))))
  parts.push(chunk('IEND', Buffer.alloc(0)))
  return Buffer.concat(parts)
}

;(async () => {
  const hand = buildHandmade()
  const frames = await apngDecodeFrames(new Uint8Array(hand), 24, inflate)
  console.log('手工 APNG（6×3，4 帧：子矩形 / dispose=1 / blend=1）')
  ok('解出 4 帧', !!frames && frames.length === 4, frames ? '帧数=' + frames.length : 'null')
  if (frames && frames.length === 4) {
    const at = (f, x, y) => Array.from(f.rgba.slice((y * 6 + x) * 4, (y * 6 + x) * 4 + 4))
    ok('第 0 帧整张红', frames[0].rgba.every((v, i) => (i % 4 === 3 ? v === 255 : v === (i % 4 === 0 ? 255 : 0))))
    ok('第 1 帧 (2,1) (3,1) 是绿', JSON.stringify(at(frames[1], 2, 1)) === '[0,255,0,255]' && JSON.stringify(at(frames[1], 3, 1)) === '[0,255,0,255]', JSON.stringify(at(frames[1], 2, 1)))
    ok('第 1 帧 (1,1) 仍是红', JSON.stringify(at(frames[1], 1, 1)) === '[255,0,0,255]', JSON.stringify(at(frames[1], 1, 1)))
    ok('第 2 帧 (0,0) 是蓝', JSON.stringify(at(frames[2], 0, 0)) === '[0,0,255,255]', JSON.stringify(at(frames[2], 0, 0)))
    ok('dispose=1 之后那块被抹掉（第 2 帧 (2,1) 透明）', JSON.stringify(at(frames[2], 2, 1)) === '[0,0,0,0]', JSON.stringify(at(frames[2], 2, 1)))
    ok('dispose 只影响那一块（第 2 帧 (1,1) 还是红）', JSON.stringify(at(frames[2], 1, 1)) === '[255,0,0,255]', JSON.stringify(at(frames[2], 1, 1)))
    ok('blend=1 半透明白叠在红上 = (255,128,128,255)', JSON.stringify(at(frames[3], 1, 0)) === '[255,128,128,255]', JSON.stringify(at(frames[3], 1, 0)))
    ok('每帧延时按 fcTL 走', frames.map((f) => f.delay).join(',') === '100,100,200,10', frames.map((f) => f.delay).join(','))
    ok('每帧都有不透明像素', frames.every((f) => { let n = 0; for (let i = 3; i < f.rgba.length; i += 4) if (f.rgba[i] > 0) n++; return n > 0 }))
  }

  /* ---------- ② 与 upng-js 互测（独立实现造的 APNG） ---------- */
  console.log('\n用 upng-js（独立实现）造 APNG，再让我的解码器解回来比像素')
  const mkFrames = () => {
    const W = 8, H = 8, n = 4
    const bufs = []
    for (let f = 0; f < n; f++) {
      const px = new Uint8Array(W * H * 4)
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4
          const inBlock = (x >= f && x < f + 3 && y >= f && y < f + 3)
          px[o] = inBlock ? 250 : (f % 2 ? 10 : 200)
          px[o + 1] = inBlock ? 40 : 30 * f
          px[o + 2] = inBlock ? 90 : 255 - 20 * f
          px[o + 3] = inBlock ? 255 : (f === 3 && x === 0 ? 0 : 255)
        }
      }
      bufs.push(px.buffer.slice(px.byteOffset, px.byteOffset + px.byteLength))
    }
    return { W, H, n, bufs }
  }
  const { W, H, n, bufs } = mkFrames()
  const dels = [50, 60, 70, 80]

  for (const [label, cnum] of [['真彩（无损 RGBA）', 0], ['调色板（256 色）', 256]]) {
    let png = null
    try { png = UPNG.encode(bufs, W, H, cnum, dels) } catch (e) { ok('upng-js 编码 ' + label, false, e.message); continue }
    const mine = await apngDecodeFrames(new Uint8Array(png), 24, inflate)
    ok('upng-js 造出的 APNG 能解出 ' + n + ' 帧（' + label + '）', !!mine && mine.length === n, mine ? '帧数=' + mine.length : 'null')
    if (!mine || mine.length !== n) continue
    /* 独立参照：UPNG 自己解出来的帧 */
    const ref = UPNG.toRGBA8(UPNG.decode(png.slice(0)))
    let bad = 0
    for (let f = 0; f < n; f++) {
      const a = new Uint8Array(mine[f].rgba.buffer, mine[f].rgba.byteOffset, mine[f].rgba.byteLength)
      const b = new Uint8Array(ref[f])
      if (a.length !== b.length) { bad += 9999; continue }
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) bad++
    }
    ok('与 UPNG 的解码结果逐像素一致（' + label + '）', bad === 0, bad ? bad + ' 个字节不同' : W * H * 4 * n + ' 个字节全同')
    if (cnum === 0) {
      let bad2 = 0
      for (let f = 0; f < n; f++) {
        const a = new Uint8Array(mine[f].rgba.buffer, mine[f].rgba.byteOffset, mine[f].rgba.byteLength)
        const b = new Uint8Array(bufs[f])
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) bad2++
      }
      ok('无损模式下就是原图（' + W + '×' + H + '×' + n + ' 帧）', bad2 === 0, bad2 ? bad2 + ' 个字节不同' : '全同')
    }
    ok('帧延时读对（' + label + '）', mine.map((f) => f.delay).join(',') === dels.join(','), mine.map((f) => f.delay).join(',') + ' 期望 ' + dels.join(','))
    const distinct = new Set(mine.map((f) => { let h = 0; for (let i = 0; i < f.rgba.length; i += 7) h = (h * 31 + f.rgba[i]) >>> 0; return h })).size
    ok('各帧内容不同（' + label + '）', distinct > 1, distinct + '/' + n)
  }

  /* ---------- ③ 静态 PNG / 非 APNG 应当返回 null（交给静态那条路） ---------- */
  const stat = UPNG.encode([bufs[0]], W, H, 0)
  const s = await apngDecodeFrames(new Uint8Array(stat), 24, inflate)
  ok('单帧 PNG 返回 null（不抢静态路径）', s === null, String(s))
  const junk = await apngDecodeFrames(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), 24, inflate)
  ok('垃圾数据返回 null', junk === null, String(junk))

  console.log(fail ? '\n❌ ' + fail + ' 项没过' : '\n✅ 全部通过')
  process.exit(fail ? 1 : 0)
})()
