/* 字体探针：把游戏自带像素字体、等宽字体、无衬线字体并排渲染同样的数字，
   截图后放大肉眼看 —— 数值断言能证明「用上了」，看不出「像不像原版」。
   用法：node .work/verify/fontprobe.js  → 写 shots/font-probe.html 并让 Chrome 截图 */
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..')
const SHOTS = path.join(__dirname, 'shots')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const face = require('../fontcss.js').fontFace()

const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<style>
${face}
body{margin:0;background:#374244;color:#fff;font:16px/1.4 sans-serif;padding:18px}
h2{font-size:13px;margin:0 0 2px;color:#9fb3b8;font-weight:400}
.row{margin:0 0 16px}
.pix{font-family:var(--pix);font-weight:700;font-size:64px;color:#8fd4ff}
.mono{font-family:monospace;font-size:64px;color:#8fd4ff}
.sans{font-family:sans-serif;font-size:64px;color:#8fd4ff}
.zoom{font-family:var(--pix);font-weight:700;font-size:64px;color:#ff9d95;transform:scale(2.2);transform-origin:left center;display:inline-block;margin:34px 0 44px}
.small{font-family:var(--pix);font-weight:700;font-size:15px;color:#fff}
</style></head><body>
<div class="row"><h2>BalatroPixel（游戏自带 m6x11plus.ttf）</h2><div class="pix">0123456789 540</div></div>
<div class="row"><h2>monospace（回退字体）</h2><div class="mono">0123456789 540</div></div>
<div class="row"><h2>sans-serif（回退字体）</h2><div class="sans">0123456789 540</div></div>
<div class="row"><h2>像素字体放大 2.2×（看格子）</h2><div class="zoom">540</div></div>
<div class="row"><h2>小字号 15px（界面里真正的用法）</h2><div class="small">筹码 30 × 倍率 18 = 540　第 3 / 5 步　小丑牌：Joker +4 倍率</div></div>
</body></html>`

const out = path.join(SHOTS, 'font-probe.html')
fs.writeFileSync(out, html)
const png = path.join(SHOTS, 'font-probe.png')
fs.rmSync(png, { force: true })
execFileSync(CHROME, [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--allow-file-access-from-files', '--force-device-scale-factor=1',
  '--window-size=760,720', '--screenshot=' + png,
  'file:///' + out.replace(/\\/g, '/'),
], { stdio: 'ignore' })
const st = fs.statSync(png)
console.log('wrote', png, (st.size / 1024).toFixed(1) + ' KB')
console.log('hint: 若 BalatroPixel 那行和 monospace 那行长得一样，说明字体没生效')
void ROOT
