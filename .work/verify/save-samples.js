// Copy the APNG/frame bundles captured during verification into a sample folder.
'use strict'
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const OUT = path.join(ROOT, '动图示例')
fs.mkdirSync(OUT, { recursive: true })

const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp-report.json'), 'utf8'))
let n = 0
for (const key of ['animExport', 'export', 'gif3d']) {
  const blobs = (((report[key] || {}).rep || {}).blobs) || []
  for (const b of blobs) {
    if (!b.b64) continue
    if (!/动图|动画|\.gif$/i.test(b.name || '')) continue
    fs.writeFileSync(path.join(OUT, b.name), Buffer.from(b.b64, 'base64'))
    console.log('saved', b.name, (b.size / 1024).toFixed(0), 'KB')
    n++
  }
}
// standalone GIF samples captured straight from the encoder
const g = (report.gif3d || {}).rep || {}
const direct = [['transparent-sample.gif', g.gifTransparentB64], ['dark-sample.gif', g.gifDarkB64], ['foil-sample.gif', g.gifFoilB64]]
for (const [name, b64] of direct) {
  if (!b64) continue
  fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64'))
  console.log('saved', name, (Buffer.from(b64, 'base64').length / 1024).toFixed(0), 'KB')
  n++
}
if (n) {
  fs.writeFileSync(path.join(OUT, '说明.txt'), [
    'Balatro 素材图鉴 — 动图导出示例',
    '',
    '· *.gif  —— 任何看图软件都能播放（Windows 自带的照片查看器也支持），但只有 256 色。',
    '· *.png  —— 这些其实是 APNG（动图 PNG）：全彩且保留透明通道，',
    '             但 Windows 自带的照片查看器只显示第一帧，请用浏览器打开才能看到动画。',
    '',
    '在查看器里打开任意带特效的条目（例如传奇小丑、幽灵牌、盲注），',
    '详情面板的「动态效果」区块可以导出同样格式的文件。',
  ].join('\r\n'), 'utf8')
  console.log('total', n, 'files ->', OUT)
} else {
  console.log('no blobs found — run `node cdp.js animExport gif3d` first')
}
