/* Verify the in-page game parser against the Node build:
     1) synthesize a "fused exe" (1 MB prefix + zip of a nested Balatro/ tree, deflate+store)
     2) parse it with gameparse.js and compare the dataset with out/data.json
     3) do the same from a plain folder listing
   Nothing here touches the network or the real game; it uses the already-extracted love/ tree. */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const W = path.join(__dirname, '..')

/* ---- load the browser modules the way a <script> would ---- */
global.window = {}
new Function(fs.readFileSync(path.join(W, 'lua.js'), 'utf8'))()
new Function(fs.readFileSync(path.join(W, 'databuild.js'), 'utf8'))()
new Function(fs.readFileSync(path.join(W, 'gameparse.js'), 'utf8'))()
const GP = global.window.__GAMEPARSE__

const LOVE = path.join(W, 'love')
const files = []
;(function walk (dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    const r = rel ? rel + '/' + e.name : e.name
    if (e.isDirectory()) walk(p, r)
    else files.push({ rel: r, data: fs.readFileSync(p) })
  }
})(LOVE, '')
console.log('love/ 里的文件:', files.length)

/* ---- a tiny zip writer (store + deflate) ---- */
const CRC = (() => {
  const T = []
  let c
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0 }
  return (buf) => {
    let crc = 0xffffffff
    for (let i = 0; i < buf.length; i++) crc = T[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }
})()
function makeZip (entries) {
  const locals = []; const centrals = []; let off = 0
  for (const [name, raw] of entries) {
    const deflated = zlib.deflateRawSync(raw, { level: 6 })
    const useDeflate = deflated.length < raw.length
    const body = useDeflate ? deflated : raw
    const method = useDeflate ? 8 : 0
    const nb = Buffer.from(name, 'utf8')
    const crc = CRC(raw)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8)
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26)
    locals.push(lh, nb, body)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10)
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28)
    ch.writeUInt32LE(off, 42)
    centrals.push(ch, nb)
    off += 30 + nb.length + body.length
  }
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16)
  return Buffer.concat([...locals, cd, eocd])
}

const reference = JSON.parse(fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8'))
const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); c.meta.generated = 'X'; c.meta.source = 'X'; return JSON.stringify(c) }
const refJson = strip(reference)

;(async () => {
  /* ---------- 1) fused exe: 1 MB of "PE stub" + zip with a nested Balatro/ tree ---------- */
  const PREFIX = Buffer.alloc(1024 * 1024, 0x90)
  const zipBuf = makeZip(files.map((f) => ['Balatro/' + f.rel, f.data]))
  const exe = Buffer.concat([PREFIX, zipBuf])
  fs.writeFileSync(path.join(__dirname, 'fake-balatro.exe'), exe)
  console.log('合成 exe: ' + (exe.length / 1048576).toFixed(2) + ' MB（前缀 1 MB + zip ' + (zipBuf.length / 1048576).toFixed(2) + ' MB）')

  const t0 = Date.now()
  const fromExe = await GP.parseGameExe(exe.buffer.slice(exe.byteOffset, exe.byteOffset + exe.byteLength), 'Balatro.exe')
  const msExe = Date.now() - t0
  console.log('exe 解析: ' + msExe + ' ms ｜ root=' + JSON.stringify(fromExe.root) + ' ｜ 读取 ' + fromExe.entries + ' 个文件')
  console.log('  items ' + fromExe.stats.items + ' ｜ atlases ' + fromExe.stats.atlases + ' ｜ textures ' + fromExe.textures.length)
  const exeOk = strip(fromExe.data) === refJson
  console.log('  与 out/data.json 对比: ' + (exeOk ? '✅ 完全一致' : '❌ 有差异'))
  if (!exeOk) {
    const a = refJson; const b = strip(fromExe.data)
    let i = 0; while (i < a.length && a[i] === b[i]) i++
    console.log('   首个差异 @' + i)
    console.log('   Node: ' + JSON.stringify(a.slice(Math.max(0, i - 60), i + 60)))
    console.log('   浏览器: ' + JSON.stringify(b.slice(Math.max(0, i - 60), i + 60)))
  }
  if (fromExe.warnings.length) console.log('  警告:', fromExe.warnings.slice(0, 5).join(' | '))

  /* ---------- 2) a folder listing ---------- */
  const list = files.map((f) => ({ path: 'Balatro/' + f.rel, bytes: new Uint8Array(f.data) }))
  const t1 = Date.now()
  const fromDir = await GP.parseGameFiles(list, 'Balatro')
  const msDir = Date.now() - t1
  const dirOk = strip(fromDir.data) === refJson
  console.log('文件夹解析: ' + msDir + ' ms ｜ root=' + JSON.stringify(fromDir.root) + ' ｜ 读取 ' + fromDir.entries + ' 个文件')
  console.log('  与 out/data.json 对比: ' + (dirOk ? '✅ 完全一致' : '❌ 有差异'))

  /* ---------- 3) texture bytes must match the files on disk ---------- */
  let texOk = 0; let texBad = []
  for (const t of fromExe.textures) {
    const disk = path.join(LOVE, 'resources/textures', t.file)
    if (!fs.existsSync(disk)) { texBad.push(t.file + '(磁盘上没有)'); continue }
    if (Buffer.compare(Buffer.from(t.bytes), fs.readFileSync(disk)) === 0) texOk++
    else texBad.push(t.file + '(字节不同)')
  }
  console.log('贴图字节比对: ' + texOk + '/' + fromExe.textures.length + ' 一致' + (texBad.length ? ' ｜ 异常: ' + texBad.slice(0, 4).join(', ') : ''))

  const ok = exeOk && dirOk && !texBad.length
  console.log(ok ? '\n✅ 浏览器端解析器与 Node 构建结果一致' : '\n❌ 有偏差，需要排查')
  process.exit(ok ? 0 : 1)
})()
