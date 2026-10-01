// Minimal PNG decode/encode (8-bit, non-interlaced) used to slice atlases.
const zlib = require('zlib')

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32 (buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk (type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

/** Decode a PNG buffer -> {width, height, data: RGBA Uint8Array} */
function decode (buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png')
  let p = 8
  let width = 0; let height = 0; let bitDepth = 0; let colorType = 0; let interlace = 0
  const idat = []
  let palette = null
  let trns = null
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]; interlace = data[12]
    } else if (type === 'PLTE') palette = Buffer.from(data)
    else if (type === 'tRNS') trns = Buffer.from(data)
    else if (type === 'IDAT') idat.push(Buffer.from(data))
    else if (type === 'IEND') break
    p += 12 + len
  }
  if (bitDepth !== 8) throw new Error('unsupported bit depth ' + bitDepth)
  if (interlace !== 0) throw new Error('interlaced png unsupported')
  const raw = zlib.inflateSync(Buffer.concat(idat))

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error('unsupported color type ' + colorType)
  const bpp = channels
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)

  let sp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[sp++]
    const line = raw.subarray(sp, sp + stride); sp += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = (prev && x >= bpp) ? prev[x - bpp] : 0
      let v = line[x]
      switch (filter) {
        case 0: break
        case 1: v = (v + a) & 0xff; break
        case 2: v = (v + b) & 0xff; break
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break
        case 4: {
          const pp = a + b - c
          const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c)
          const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
          v = (v + pr) & 0xff
          break
        }
        default: throw new Error('bad filter ' + filter)
      }
      cur[x] = v
    }
  }

  // Normalise to RGBA
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    let r; let g; let b; let a = 255
    if (colorType === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; a = out[i * 4 + 3] } else if (colorType === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2] } else if (colorType === 0) { r = g = b = out[i] } else if (colorType === 4) { r = g = b = out[i * 2]; a = out[i * 2 + 1] } else {
      const idx = out[i]; r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2]
      if (trns && idx < trns.length) a = trns[idx]
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a
  }
  return { width, height, data: rgba }
}

/** Encode {width,height,data:RGBA} -> PNG buffer */
function encode (img) {
  const { width, height, data } = img
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(data.buffer || data, data.byteOffset || 0, data.length).copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Crop a sub-rectangle out of a decoded image */
function crop (img, x, y, w, h) {
  const out = Buffer.alloc(w * h * 4)
  for (let row = 0; row < h; row++) {
    const sy = y + row
    if (sy < 0 || sy >= img.height) continue
    const sx = Math.max(0, x)
    const ex = Math.min(img.width, x + w)
    if (ex <= sx) continue
    const src = img.data
    const from = (sy * img.width + sx) * 4
    const to = (sy * img.width + ex) * 4
    src.copy(out, row * w * 4 + (sx - x) * 4, from, to)
  }
  return { width: w, height: h, data: out }
}

module.exports = { decode, encode, crop, crc32 }
