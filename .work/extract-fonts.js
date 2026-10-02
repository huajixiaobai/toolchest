/* ============================================================================
 * extract-fonts.js — 从游戏 exe（融合 LÖVE 包）里取出 resources/fonts/*.ttf
 *
 *   node extract-fonts.js [exe路径] [输出目录]
 *
 * 默认读 C:\Users\<你>\Desktop\Balatro\Balatro.exe，写到 .work/love/resources/fonts/
 * ==========================================================================*/
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const HERE = __dirname
const EXE = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'Balatro', 'Balatro.exe')
const OUT = process.argv[3] || path.join(HERE, 'love', 'resources', 'fonts')

if (!fs.existsSync(EXE)) { console.error('❌ 找不到 ' + EXE); process.exit(1) }
const buf = fs.readFileSync(EXE)
console.log('exe: ' + EXE + '  ' + (buf.length / 1048576).toFixed(1) + ' MB')

/* ---- 融合包：EOCD → 中央目录（payload base 偏移要还原） ---- */
let eocd = -1
for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
}
if (eocd < 0) { console.error('❌ 没找到 ZIP 结尾记录，这不是融合包'); process.exit(1) }
const count = buf.readUInt16LE(eocd + 10)
const cdSize = buf.readUInt32LE(eocd + 12)
const cdOff = buf.readUInt32LE(eocd + 16)
const base = eocd - cdSize - cdOff
console.log('中央目录 ' + count + ' 条，payload base = ' + base)

const entries = []
let p = cdOff + base
for (let i = 0; i < count; i++) {
  if (buf.readUInt32LE(p) !== 0x02014b50) break
  const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32)
  entries.push({
    name: buf.toString('utf8', p + 46, p + 46 + nlen),
    method: buf.readUInt16LE(p + 10),
    csize: buf.readUInt32LE(p + 20),
    usize: buf.readUInt32LE(p + 24),
    lho: buf.readUInt32LE(p + 42),
  })
  p += 46 + nlen + elen + clen
}
const read = (e) => {
  const lnlen = buf.readUInt16LE(e.lho + 26), lelen = buf.readUInt16LE(e.lho + 28)
  const start = e.lho + 30 + lnlen + lelen + base
  const raw = buf.subarray(start, start + e.csize)
  return e.method === 0 ? raw : zlib.inflateRawSync(raw)
}

/* ---- 字体 + 顺带看看还有哪些界面素材 ---- */
const fonts = entries.filter((e) => /^resources\/fonts\/[^/]+\.(ttf|otf)$/i.test(e.name))
const other = entries.filter((e) => /\.(ttf|otf)$/i.test(e.name) && !fonts.includes(e))
console.log('\n字体文件 ' + fonts.length + ' 个：')
for (const f of fonts) console.log('  ' + f.name + '  ' + f.usize + ' B')
if (other.length) { console.log('其它字体：'); other.forEach((o) => console.log('  ' + o.name)) }

if (!fonts.length) { console.error('\n❌ 包里没有 resources/fonts/ —— 也许路径不同，见下面几个候选：'); entries.filter((e) => /font/i.test(e.name)).slice(0, 20).forEach((e) => console.log('  ' + e.name)); process.exit(1) }

fs.mkdirSync(OUT, { recursive: true })
for (const f of fonts) {
  const out = path.join(OUT, path.basename(f.name))
  fs.writeFileSync(out, read(f))
  console.log('  → ' + path.relative(path.join(HERE, '..'), out) + '  ' + (fs.statSync(out).size / 1024).toFixed(1) + ' KB')
}

/* ---- 顺手统计一下界面相关的贴图，看看有没有没收录的 ---- */
const uiTex = entries.filter((e) => /^resources\/textures\/(1x|2x)\/.*\.png$/i.test(e.name)).map((e) => e.name.replace(/^resources\/textures\/(1x|2x)\//, ''))
console.log('\n贴图总数（1x+2x 条目）：' + uiTex.length)
