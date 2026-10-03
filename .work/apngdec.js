/* ---------------------------------------------------------------- APNG 帧解析
 * 和 gifdec.js 一样：纯计算，不碰 canvas / DOM；唯一的外部依赖是「解 zlib」这一步，
 * 由调用方注入（浏览器用 DecompressionStream('deflate')，Node 用 zlib.inflateSync）。
 * 为什么不用内核的 ImageDecoder：实测这台机器的 Chrome 根本没有这个接口，
 * APNG 上传就只会拿到第一帧、看着像"不支持动图"。
 *
 * 支持：8 位色深的 colorType 0/2/3/4/6（灰/真彩/调色板/灰+透明/真彩+透明）、
 *      PLTE 与 tRNS、逐帧子矩形、dispose（0 不处理 / 1 抹成透明 / 2 还原上一帧）、
 *      blend（0 覆盖 / 1 alpha 叠加）。
 * 不支持：16 位色深、隔行扫描（Adam7）—— 这两种直接返回 null，让调用方回退到「按第一帧用」。
 * 返回 [{ rgba: Uint8ClampedArray(w*h*4), width, height, delay }]，最多 maxFrames 帧；
 * 不是 APNG / 解不出来时返回 null。 */
function apngDecodeFrames (bytes, maxFrames, inflate) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (u8.length < 20) return Promise.resolve(null)
  for (let i = 0; i < 8; i++) if (u8[i] !== SIG[i]) return Promise.resolve(null)

  let p = 8
  const u32 = (o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0
  const u16 = (o) => (u8[o] << 8) | u8[o + 1]
  const rd16 = (b, o) => (b[o] << 8) | b[o + 1]
  const rd32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0

  let ihdr = null
  let plte = null
  let trns = null
  let declaredFrames = 0
  const frames = []
  const idat = []
  let seenIdat = false
  let firstCtlBeforeIdat = false

  while (p + 8 <= u8.length) {
    const len = u32(p)
    const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7])
    const data = u8.subarray(p + 8, p + 8 + len)
    p += 12 + len                                  /* 长度 + 类型 + 数据 + CRC */
    if (type === 'IHDR') {
      if (data.length < 13) return Promise.resolve(null)
      ihdr = {
        w: rd32(data, 0), h: rd32(data, 4),
        bitDepth: data[8], colorType: data[9],
        compression: data[10], filter: data[11], interlace: data[12],
      }
    } else if (type === 'acTL') {
      declaredFrames = rd32(data, 0)
    } else if (type === 'PLTE') {
      plte = data
    } else if (type === 'tRNS') {
      trns = data
    } else if (type === 'fcTL') {
      if (data.length < 26) return Promise.resolve(null)
      const ctl = {
        seq: rd32(data, 0), w: rd32(data, 4), h: rd32(data, 8), x: rd32(data, 12), y: rd32(data, 16),
        dNum: rd16(data, 20), dDen: rd16(data, 22), dispose: data[24], blend: data[25],
      }
      frames.push({ ctl: ctl, chunks: [] })
      if (!seenIdat && frames.length === 1) firstCtlBeforeIdat = true
    } else if (type === 'fdAT') {
      if (!frames.length || data.length < 4) return Promise.resolve(null)
      frames[frames.length - 1].chunks.push(data.subarray(4))
    } else if (type === 'IDAT') {
      idat.push(data)
      seenIdat = true
    } else if (type === 'IEND') {
      break
    }
  }

  if (!ihdr) return Promise.resolve(null)
  /* 没有 acTL / 只有一个 fcTL → 就是普通 PNG，交给调用方走静态那条路 */
  if (!declaredFrames || frames.length < 2) return Promise.resolve(null)
  const depth = ihdr.bitDepth
  /* 8 位全支持；1/2/4 位只有「灰度」与「调色板」是合法组合（真彩/带 alpha 只能是 8 或 16 位）。
     upng-js 这类工具默认就会产出 4 位调色板 APNG，所以这几种必须认。 */
  const depthOk = depth === 8 || ((ihdr.colorType === 0 || ihdr.colorType === 3) && (depth === 1 || depth === 2 || depth === 4))
  if (!depthOk || ihdr.interlace !== 0) return Promise.resolve(null)   /* 16 位 / 隔行：不装懂 */
  if (ihdr.colorType === 3 && !plte) return Promise.resolve(null)

  const chanOf = (ct) => (ct === 0 ? 1 : ct === 2 ? 3 : ct === 3 ? 1 : ct === 4 ? 2 : 4)
  const chan = chanOf(ihdr.colorType)
  if (!chan) return Promise.resolve(null)
  const bitsPerPx = chan * depth
  const strideOf = (w) => Math.ceil(w * bitsPerPx / 8)      /* 一行多少字节（1/2/4 位是打包的） */
  const filterBpp = Math.max(1, Math.ceil(bitsPerPx / 8))   /* 滤波按字节算，最少 1 */
  /* 第一帧的数据放在 IDAT 里（标准写法）；有些工具会把 IDAT 当静态图、不给它 fdAT，
     所以只要第一帧自己没有 fdAT 数据，就用 IDAT —— 两种写法都能读 */
  if (frames[0].chunks.length === 0 && idat.length) frames[0].chunks = idat

  const W = ihdr.w; const H = ihdr.h
  const limit = Math.max(1, Math.min(frames.length, maxFrames || 24))

  const unfilter = (raw, w, h) => {
    const stride = strideOf(w)
    if (!raw || raw.length < (stride + 1) * h) return null
    const out = new Uint8Array(stride * h)
    let prev = null
    for (let y = 0; y < h; y++) {
      const ft = raw[y * (stride + 1)]
      const off = y * (stride + 1) + 1
      const row = out.subarray(y * stride, (y + 1) * stride)
      for (let x = 0; x < stride; x++) {
        const a = x >= filterBpp ? row[x - filterBpp] : 0
        const b = prev ? prev[x] : 0
        const c = (prev && x >= filterBpp) ? prev[x - filterBpp] : 0
        let v = raw[off + x]
        if (ft === 0) { /* 原样 */ } else if (ft === 1) { v = (v + a) & 255 } else if (ft === 2) { v = (v + b) & 255 } else if (ft === 3) {
          v = (v + ((a + b) >> 1)) & 255
        } else if (ft === 4) {
          const pp = a + b - c
          const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c)
          v = (v + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 255
        } else { return null }
        row[x] = v
      }
      prev = row
    }
    return out
  }

  /** 取第 i 个样本：8 位直接取字节，1/2/4 位是打包的（每字节高位在前） */
  const sample = (rows, i) => {
    if (depth === 8) return rows[i]
    const perByte = 8 / depth
    const byte = rows[Math.floor(i / perByte)]
    const shift = 8 - depth * ((i % perByte) + 1)
    return (byte >> shift) & ((1 << depth) - 1)
  }
  const toGray = (v) => (depth === 8 ? v : Math.round(v * 255 / ((1 << depth) - 1)))

  /** 行序样本 → RGBA（按 colorType / 调色板展开） */
  const toRGBA = (rows, w, h) => {
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      const o = i * 4
      if (ihdr.colorType === 6) {
        rgba[o] = rows[i * 4]; rgba[o + 1] = rows[i * 4 + 1]; rgba[o + 2] = rows[i * 4 + 2]; rgba[o + 3] = rows[i * 4 + 3]
      } else if (ihdr.colorType === 2) {
        rgba[o] = rows[i * 3]; rgba[o + 1] = rows[i * 3 + 1]; rgba[o + 2] = rows[i * 3 + 2]; rgba[o + 3] = 255
      } else if (ihdr.colorType === 0) {
        const g = toGray(sample(rows, i)); rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = 255
      } else if (ihdr.colorType === 4) {
        const g = rows[i * 2]; rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = rows[i * 2 + 1]
      } else {
        const idx = sample(rows, i)
        rgba[o] = plte[idx * 3]; rgba[o + 1] = plte[idx * 3 + 1]; rgba[o + 2] = plte[idx * 3 + 2]
        rgba[o + 3] = (trns && idx < trns.length) ? trns[idx] : 255
      }
    }
    return rgba
  }

  /** 把一帧画到画布上（blend 1 = alpha 叠加，其余按覆盖） */
  const drawInto = (canvas, ctl, px, blend) => {
    for (let y = 0; y < ctl.h; y++) {
      const dy = ctl.y + y
      if (dy < 0 || dy >= H) continue
      for (let x = 0; x < ctl.w; x++) {
        const dx = ctl.x + x
        if (dx < 0 || dx >= W) continue
        const s = (y * ctl.w + x) * 4
        const t = (dy * W + dx) * 4
        const sa = px[s + 3]
        if (blend === 1 && sa !== 255) {
          if (sa === 0) continue
          const da = canvas[t + 3]
          if (da === 0) {
            canvas[t] = px[s]; canvas[t + 1] = px[s + 1]; canvas[t + 2] = px[s + 2]; canvas[t + 3] = sa
          } else {
            const sf = sa / 255; const df = da / 255 * (1 - sf)
            const af = sf + df
            canvas[t] = Math.round((px[s] * sf + canvas[t] * df) / af)
            canvas[t + 1] = Math.round((px[s + 1] * sf + canvas[t + 1] * df) / af)
            canvas[t + 2] = Math.round((px[s + 2] * sf + canvas[t + 2] * df) / af)
            canvas[t + 3] = Math.round(af * 255)
          }
        } else {
          canvas[t] = px[s]; canvas[t + 1] = px[s + 1]; canvas[t + 2] = px[s + 2]; canvas[t + 3] = sa
        }
      }
    }
  }
  const clearRect = (canvas, ctl) => {
    for (let y = 0; y < ctl.h; y++) {
      const dy = ctl.y + y
      if (dy < 0 || dy >= H) continue
      for (let x = 0; x < ctl.w; x++) {
        const dx = ctl.x + x
        if (dx < 0 || dx >= W) continue
        const t = (dy * W + dx) * 4
        canvas[t] = 0; canvas[t + 1] = 0; canvas[t + 2] = 0; canvas[t + 3] = 0
      }
    }
  }

  const out = []
  let canvas = new Uint8ClampedArray(W * H * 4)
  let chain = Promise.resolve()
  for (let i = 0; i < limit; i++) {
    const f = frames[i]
    chain = chain.then(() => {
      const parts = f.chunks
      let total = 0
      for (const c of parts) total += c.length
      const z = new Uint8Array(total)
      let off = 0
      for (const c of parts) { z.set(c, off); off += c.length }
      return Promise.resolve(inflate(z)).then((raw) => {
        const rows = unfilter(raw, f.ctl.w, f.ctl.h)
        if (!rows) throw new Error('第 ' + (i + 1) + ' 帧的像素数据解不开')
        const px = toRGBA(rows, f.ctl.w, f.ctl.h)
        const keep = f.ctl.dispose === 2 ? canvas.slice() : null
        const den = f.ctl.dDen || 100
        const delay = Math.max(10, Math.min(2000, Math.round(f.ctl.dNum * 1000 / den) || 80))
        drawInto(canvas, f.ctl, px, i === 0 ? 0 : f.ctl.blend)
        out.push({ rgba: canvas.slice(), width: W, height: H, delay: delay })
        if (f.ctl.dispose === 1) clearRect(canvas, f.ctl)
        else if (f.ctl.dispose === 2 && keep) canvas = keep
      })
    })
  }
  return chain.then(() => (out.length ? out : null), () => (out.length ? out : null))
}
