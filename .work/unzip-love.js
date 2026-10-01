// Pure-Node ZIP reader. LÖVE fused .exe = PE stub + appended ZIP; this reads the
// central directory directly so we never depend on external tools.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const EOCD_SIG = 0x06054b50
const EOCD64_LOC = 0x07064b50
const EOCD64_SIG = 0x06064b50
const CEN_SIG = 0x02014b50

function findEOCD (buf) {
  const min = Math.max(0, buf.length - 65557)
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i
  }
  throw new Error('EOCD not found — not a zip / fused love archive')
}

function readEntries (buf) {
  const eocd = findEOCD(buf)
  let count = buf.readUInt16LE(eocd + 10)
  let cdOffset = buf.readUInt32LE(eocd + 16)

  // ZIP64 fallback
  if (cdOffset === 0xffffffff || count === 0xffff) {
    const locOff = eocd - 20
    if (locOff >= 0 && buf.readUInt32LE(locOff) === EOCD64_LOC) {
      const z64 = Number(buf.readBigUInt64LE(locOff + 8))
      if (buf.readUInt32LE(z64) === EOCD64_SIG) {
        count = Number(buf.readBigUInt64LE(z64 + 32))
        cdOffset = Number(buf.readBigUInt64LE(z64 + 48))
      }
    }
  }

  // Fused exes prepend a PE stub, so every stored offset is relative to the START
  // of the zip payload rather than the file. Derive that base from the CD end.
  const cdStart = eocd - buf.readUInt32LE(eocd + 12)
  const base = cdStart - cdOffset
  cdOffset += base

  const entries = []
  let p = cdOffset
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CEN_SIG) break
    const method = buf.readUInt16LE(p + 10)
    const crc = buf.readUInt32LE(p + 16)
    let csize = buf.readUInt32LE(p + 20)
    let usize = buf.readUInt32LE(p + 24)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    let lho = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)

    // ZIP64 extra field
    if (usize === 0xffffffff || csize === 0xffffffff || lho === 0xffffffff) {
      let e = p + 46 + nameLen
      const end = e + extraLen
      while (e + 4 <= end) {
        const id = buf.readUInt16LE(e)
        const sz = buf.readUInt16LE(e + 2)
        if (id === 0x0001) {
          let q = e + 4
          if (usize === 0xffffffff) { usize = Number(buf.readBigUInt64LE(q)); q += 8 }
          if (csize === 0xffffffff) { csize = Number(buf.readBigUInt64LE(q)); q += 8 }
          if (lho === 0xffffffff) { lho = Number(buf.readBigUInt64LE(q)); q += 8 }
          break
        }
        e += 4 + sz
      }
    }

    entries.push({ name, method, crc, csize, usize, lho: lho + base })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

function readData (buf, ent) {
  const nameLen = buf.readUInt16LE(ent.lho + 26)
  const extraLen = buf.readUInt16LE(ent.lho + 28)
  const start = ent.lho + 30 + nameLen + extraLen
  const raw = buf.subarray(start, start + ent.csize)
  if (ent.method === 0) return Buffer.from(raw)
  if (ent.method === 8) return zlib.inflateRawSync(raw)
  throw new Error('unsupported compression method ' + ent.method + ' for ' + ent.name)
}

module.exports = { readEntries, readData, findEOCD }

if (require.main === module) {
  const src = process.argv[2]
  const outDir = process.argv[3]
  const filter = process.argv[4] || ''
  const buf = fs.readFileSync(src)
  const entries = readEntries(buf)
  console.log('entries:', entries.length)
  let n = 0
  let bytes = 0
  for (const ent of entries) {
    if (ent.name.endsWith('/')) continue
    if (filter && !ent.name.includes(filter)) continue
    const data = readData(buf, ent)
    const dest = path.join(outDir, ent.name)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, data)
    n++
    bytes += data.length
  }
  console.log('extracted:', n, 'files,', (bytes / 1048576).toFixed(1), 'MB')
}
