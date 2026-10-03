/* GIF 解码器回归测试（纯 Node，不开浏览器）
   1) 手工构造的 4×2 小 GIF（LZW 只用字面量，构造绝对正确）→ 解出来必须逐像素等于原图
   2) 用户那张真 GIF → 帧数 / 延时 / 每帧不透明像素数 / 相邻帧是否不同
   用法：node .work/verify/gifdec-test.js [图片路径] */
'use strict'
const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, '..', 'gifdec.js'), 'utf8')
const gifDecodeFrames = new Function(src + '\nreturn gifDecodeFrames')()

let fail = 0
const ok = (name, cond, info) => { console.log((cond ? '  ✓ ' : '  ❌ ') + name + (info ? '  ' + info : '')); if (!cond) fail++ }

/** 最简 PNG 编码（RGB，filter 0）：只为了让测试输出一张能用眼睛看的图 */
function toPNG (rgb, w, h) {
  const zlib = require('zlib')
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
let CRC_TABLE = null
function crc32 (buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); CRC_TABLE[n] = c }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

/* ---------- ① 手工小 GIF ---------- */
/** 迷你 LZW 打包（只用来造测试数据）：码长必须随字典填满而变宽，规则和规范里的编码器一致 */
function lzwPack (indices, minCode) {
  const clearCode = 1 << minCode
  const eoiCode = clearCode + 1
  let codeSize = minCode + 1
  let nextCode = eoiCode + 1
  let dict = new Map()
  const out = []
  let cur = 0, bits = 0
  const emit = (code) => {
    cur |= code << bits; bits += codeSize
    while (bits >= 8) { out.push(cur & 0xff); cur >>>= 8; bits -= 8 }
  }
  emit(clearCode)
  let prefix = indices[0]
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i]
    const key = (prefix << 8) | k
    const found = dict.get(key)
    if (found !== undefined) { prefix = found; continue }
    emit(prefix)
    if (nextCode >= (1 << codeSize) && codeSize < 12) codeSize++
    dict.set(key, nextCode++)
    prefix = k
  }
  emit(prefix)
  emit(eoiCode)
  if (bits > 0) out.push(cur & 0xff)
  return out
}
function buildTestGif () {
  /* 4 色调色板，6×6；图案故意带重复，好让 LZW 真的用上字典（而不是只发字面量） */
  const pal = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]]
  const w = 6, h = 6
  const idx = []
  for (let i = 0; i < w * h; i++) idx.push((Math.floor(i / 6) + (i % 3)) % 4)
  const lz = lzwPack(idx, 2)
  const bytes = []
  const push = (...v) => { for (const x of v) bytes.push(x & 0xff) }
  const pushStr = (s) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)) }
  pushStr('GIF89a')
  push(w, 0, h, 0)                     /* 逻辑屏 6×6 */
  push(0x80 | 0x00 | 0x01, 0, 0)       /* 全局色表，2^(1+1)=4 色 */
  for (const c of pal) push(c[0], c[1], c[2])
  /* GCE：延时 5（1/100 秒 = 50ms），不透明 */
  push(0x21, 0xf9, 4, 0, 5, 0, 0, 0)
  push(0x2c)
  push(0, 0, 0, 0, w, 0, h, 0)         /* 图像描述符：左 0 上 0 宽 w 高 h（8 字节，别少写） */
  push(0x00)                           /* 无局部色表 */
  push(2)                              /* LZW 最小码长 2 → clear=4, end=5, 起始码长 3 */
  for (let i = 0; i < lz.length; i += 255) { push(Math.min(255, lz.length - i)); for (let k = i; k < Math.min(i + 255, lz.length); k++) push(lz[k]) }
  push(0)                              /* 子块结束 */
  push(0x3b)                           /* 文件结束 */
  return { bytes: new Uint8Array(bytes), idx, pal, w, h }
}
const t = buildTestGif()
const dec = gifDecodeFrames(t.bytes, 24)
ok('手工小 GIF 解出 1 帧', !!dec && dec.length === 1, dec ? '帧数=' + dec.length : 'null')
if (dec && dec.length) {
  const f = dec[0]
  ok('尺寸正确', f.width === t.w && f.height === t.h, f.width + '×' + f.height)
  let bad = 0
  for (let i = 0; i < t.idx.length; i++) {
    const want = t.pal[t.idx[i]]
    const got = [f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2], f.rgba[i * 4 + 3]]
    if (got[0] !== want[0] || got[1] !== want[1] || got[2] !== want[2] || got[3] !== 255) { bad++; console.log('     像素 ' + i + ' 期望 ' + want + ' 得到 ' + got) }
  }
  ok('逐像素颜色正确', bad === 0, bad ? bad + ' 个像素不对' : t.idx.length + ' 个像素全对')
  ok('延时读到 50ms', f.delay === 50, 'delay=' + f.delay)
}

/* ---------- ② 真 GIF ---------- */
const file = process.argv[2] || 'C:/Users/18878/Desktop/2ab90f8671834c56befd349c4ba69b81.gif'
if (fs.existsSync(file)) {
  const u8 = new Uint8Array(fs.readFileSync(file))
  const t0 = Date.now()
  const frames = gifDecodeFrames(u8, 24)
  const ms = Date.now() - t0
  console.log('\n真图 ' + path.basename(file) + '（' + u8.length + ' 字节）解码 ' + ms + 'ms')
  ok('解出多帧', !!frames && frames.length > 1, frames ? '帧数=' + frames.length : 'null')
  if (frames) {
    const stats = frames.map((f, i) => {
      let opaque = 0, sum = 0
      for (let k = 0; k < f.rgba.length; k += 4) { if (f.rgba[k + 3] > 0) opaque++; sum += (f.rgba[k] * 3 + f.rgba[k + 1] * 5 + f.rgba[k + 2] * 7) }
      if (i < 6 || i === frames.length - 1) console.log('     帧 ' + i + '  ' + f.width + '×' + f.height + '  不透明像素=' + opaque + '  校验和=' + sum + '  延时=' + f.delay + 'ms')
      return { opaque, sum }
    })
    ok('每帧都有不透明像素', stats.every((s) => s.opaque > 0), '最少 ' + Math.min(...stats.map((s) => s.opaque)) + ' 个')
    const distinct = new Set(stats.map((s) => s.sum)).size
    ok('各帧内容不同（不是同一张重复）', distinct > 1, '不同帧 ' + distinct + '/' + frames.length)
    /* 逐像素比较相邻帧 */
    let moved = 0
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1].rgba, b = frames[i].rgba
      let d = 0
      for (let k = 0; k < a.length; k += 4) if (a[k] !== b[k] || a[k + 1] !== b[k + 1] || a[k + 2] !== b[k + 2] || a[k + 3] !== b[k + 3]) d++
      if (i <= 3) console.log('     帧 ' + (i - 1) + '→' + i + ' 变化像素 ' + d)
      if (d > 0) moved++
    }
    ok('相邻帧确实有像素变化', moved === frames.length - 1, moved + '/' + (frames.length - 1) + ' 对相邻帧有变化')
    ok('延时都在合理范围', frames.every((f) => f.delay >= 20 && f.delay <= 2000), '取值 ' + Array.from(new Set(frames.map((f) => f.delay))).join(','))
    /* 导出一张横向帧条 PNG：人眼能直接看解出来到底是什么（棋盘底衬出透明区） */
    const dumpDir = path.join(__dirname, 'gifdump')
    fs.mkdirSync(dumpDir, { recursive: true })
    const cols = Math.min(6, frames.length)
    const W = frames[0].width * cols
    const H = frames[0].height
    const buf = Buffer.alloc(W * H * 3)
    for (let c = 0; c < cols; c++) {
      const f = frames[Math.round(c * (frames.length - 1) / Math.max(1, cols - 1))]
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < f.width; x++) {
          const s = (y * f.width + x) * 4
          const a = f.rgba[s + 3] / 255
          const checker = (((x >> 3) + (y >> 3)) & 1) ? 90 : 130
          const o = (y * W + c * f.width + x) * 3
          buf[o] = Math.round(f.rgba[s] * a + checker * (1 - a))
          buf[o + 1] = Math.round(f.rgba[s + 1] * a + checker * (1 - a))
          buf[o + 2] = Math.round(f.rgba[s + 2] * a + checker * (1 - a))
        }
      }
    }
    const png = path.join(dumpDir, 'strip.png')
    fs.writeFileSync(png, toPNG(buf, W, H))
    console.log('     已导出帧条 ' + png + '（' + W + '×' + H + '，取 ' + cols + ' 帧）')
  }
} else {
  console.log('\n（没找到 ' + file + '，只跑了手工用例）')
}
console.log(fail ? '\n❌ ' + fail + ' 项没过' : '\n✅ 全部通过')
process.exit(fail ? 1 : 0)
