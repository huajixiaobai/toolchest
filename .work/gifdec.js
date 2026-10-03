/* ---------------------------------------------------------------- GIF 帧解析
 * 自己写的 GIF89a 解析（纯计算，不碰 canvas / DOM / Node 的 API），所以同一份代码
 * 在浏览器里能跑、在 Node 里也能拿来做回归测试。
 * 为什么不用 ImageDecoder：那是内核功能，版本不对/无头环境下给不出多帧，
 * "上传动图"就会看起来完全没反应。这里块解析 + LZW 解压 + 按 disposal 合成每一帧。
 * 返回 [{ rgba: Uint8ClampedArray(w*h*4), width, height, delay }]，最多 maxFrames 帧；
 * 不是 GIF 或解不出任何帧时返回 null。 */
function gifDecodeFrames (bytes, maxFrames) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (u8.length < 13) return null
  const sig = String.fromCharCode(u8[0], u8[1], u8[2], u8[3], u8[4], u8[5])
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null
  let p = 6
  const u16 = () => { const v = u8[p] | (u8[p + 1] << 8); p += 2; return v }
  const sw = u16()
  const sh = u16()
  if (!sw || !sh) return null
  const flags = u8[p++]
  p += 2                                   /* 背景色索引 + 像素宽高比 */
  let gct = null
  let gctN = 0
  if (flags & 0x80) { gctN = 2 << (flags & 7); gct = u8.subarray(p, p + gctN * 3); p += gctN * 3 }

  const limit = Math.max(1, maxFrames || 24)
  const out = []
  /* 画面缓冲：整张逻辑屏，RGBA。disposal 合成都在这份缓冲上做 */
  let screen = new Uint8ClampedArray(sw * sh * 4)
  let gce = { delay: 80, transparent: -1, disposal: 0 }

  const skipBlocks = () => { while (p < u8.length && u8[p] !== 0) p += u8[p] + 1; p++ }

  /** 把一段（已拼好的）LZW 数据解成索引，写进 px（RGBA，尺寸 w×h） */
  const lzwToRGBA = (minCode, data, px, w, h, pal, transparent) => {
    const clear = 1 << minCode
    const end = clear + 1
    let size = minCode + 1
    let next = end + 1
    let dict = null
    let bitPos = 0
    const reset = () => {
      dict = new Array(4096)
      for (let i = 0; i < clear; i++) dict[i] = [i]
      dict[clear] = null
      dict[end] = null
      size = minCode + 1
      next = end + 1
    }
    reset()
    const readCode = () => {
      let v = 0
      for (let i = 0; i < size; i++) {
        const byte = data[bitPos >> 3]
        if (byte === undefined) return -1
        v |= ((byte >> (bitPos & 7)) & 1) << i
        bitPos++
      }
      return v
    }
    const put = (paletteIndex, pos) => {
      const o = pos * 4
      if (paletteIndex === transparent) { px[o] = 0; px[o + 1] = 0; px[o + 2] = 0; px[o + 3] = 0; return }
      const ci = paletteIndex * 3
      px[o] = pal[ci]
      px[o + 1] = pal[ci + 1]
      px[o + 2] = pal[ci + 2]
      px[o + 3] = 255
    }
    let pos = 0
    let prev = -1
    for (;;) {
      const code = readCode()
      if (code < 0) return pos
      if (code === clear) { reset(); prev = -1; continue }
      if (code === end) return pos
      let entry
      if (prev === -1) {
        if (code >= clear) return pos           /* 第一码必须是字面量 */
        entry = dict[code]
      } else if (code < next && dict[code]) {
        entry = dict[code]
      } else if (code === next && dict[prev]) {
        entry = dict[prev].concat(dict[prev][0])
      } else {
        return pos                              /* 码流坏了，能画多少算多少 */
      }
      if (prev !== -1 && next < 4096 && dict[prev]) {
        dict[next++] = dict[prev].concat(entry[0])
        if (next === (1 << size) && size < 12) size++
      }
      prev = code
      for (let i = 0; i < entry.length; i++) {
        if (pos < w * h) put(entry[i], pos)
        pos++
        if (pos >= w * h) return pos
      }
    }
  }

  while (p < u8.length) {
    const b = u8[p++]
    if (b === 0x21) {                                    /* 扩展块 */
      const label = u8[p++]
      if (label === 0xF9) {
        const size = u8[p++]
        const packed = u8[p]
        gce = {
          delay: Math.max(20, (u8[p + 1] | (u8[p + 2] << 8)) * 10 || 80),
          transparent: (packed & 1) ? u8[p + 3] : -1,
          disposal: (packed >> 2) & 7,
        }
        p += size
        skipBlocks()
      } else {
        skipBlocks()
      }
    } else if (b === 0x2C) {                             /* 图像块 */
      const ix = u16()
      const iy = u16()
      const iw = u16()
      const ih = u16()
      if (!iw || !ih) break
      const pf = u8[p++]
      let pal = gct
      if (pf & 0x80) { const n = 2 << (pf & 7); pal = u8.subarray(p, p + n * 3); p += n * 3 }
      if (!pal) break
      const minCode = u8[p++]
      const chunks = []
      let total = 0
      while (p < u8.length && u8[p] !== 0) { const len = u8[p]; p++; chunks.push(u8.subarray(p, p + len)); total += len; p += len }
      p++
      const data = new Uint8Array(total)
      let off = 0
      for (const c of chunks) { data.set(c, off); off += c.length }
      const keep = gce.disposal === 3 ? screen.slice() : null
      const px = new Uint8ClampedArray(iw * ih * 4)
      lzwToRGBA(minCode, data, px, iw, ih, pal, gce.transparent)
      /* 把这一格贴到逻辑屏上：透明像素不覆盖底下的画面 */
      for (let y = 0; y < ih; y++) {
        const sy = iy + y
        if (sy < 0 || sy >= sh) continue
        for (let x = 0; x < iw; x++) {
          const sx = ix + x
          if (sx < 0 || sx >= sw) continue
          const a = px[(y * iw + x) * 4 + 3]
          if (!a) continue
          const s = (y * iw + x) * 4
          const t = (sy * sw + sx) * 4
          screen[t] = px[s]
          screen[t + 1] = px[s + 1]
          screen[t + 2] = px[s + 2]
          screen[t + 3] = 255
        }
      }
      out.push({ rgba: screen.slice(), width: sw, height: sh, delay: gce.delay })
      if (out.length >= limit) break
      if (gce.disposal === 2) {                          /* 还原成背景色（这里按透明处理） */
        for (let y = 0; y < ih; y++) {
          const sy = iy + y
          if (sy < 0 || sy >= sh) continue
          for (let x = 0; x < iw; x++) {
            const sx = ix + x
            if (sx < 0 || sx >= sw) continue
            const t = (sy * sw + sx) * 4
            screen[t] = 0; screen[t + 1] = 0; screen[t + 2] = 0; screen[t + 3] = 0
          }
        }
      } else if (gce.disposal === 3 && keep) {
        screen = keep
      }
      gce = { delay: 80, transparent: -1, disposal: 0 }
    } else if (b === 0x3B) {                             /* 结束 */
      break
    } else {
      break
    }
  }
  return out.length ? out : null
}
