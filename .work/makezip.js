/* ============================================================================
 * makezip.js — a minimal store-only ZIP writer (no dependencies).
 *
 * Shared by build-lite.js and site.js: the output is opened by hosts (Netlify Drop,
 * Cloudflare Pages) and by plain Expand-Archive, so it is deliberately boring and
 * self-verifying rather than clever.
 * ==========================================================================*/
'use strict'

function crc32 (buf) {
  let c, crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** entries: [[name, Buffer], …] → ZIP buffer (stored, UTF-8 names) */
function zipStore (entries) {
  const locals = []; const centrals = []; let off = 0
  for (const [name, data] of entries) {
    const nb = Buffer.from(name, 'utf8'); const crc = crc32(data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6)
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26)
    locals.push(lh, nb, data)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8)
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28)
    ch.writeUInt32LE(off, 42)
    centrals.push(ch, nb)
    off += 30 + nb.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16)
  return Buffer.concat([...locals, cd, eocd])
}

module.exports = zipStore
module.exports.crc32 = crc32
