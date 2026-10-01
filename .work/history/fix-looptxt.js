const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
const bad = [
  "      `<b>循环</b>：${loopLabel().replace('🔁 循环：', '')}。游戏里的特效是若干正弦项相加，每一项都有自己的周期，所以只要找到它们的公共循环点，单向重复也能完全看不出跳变；找不到短循环时才退回「来回循环」（正放再倒放，接缝天然无跳变）。' +",
  "    '循环点是从着色器源码里的频率算出来、再逐帧渲染验证的，合成台的读数里会写明检测结果。<br>' +",
].join(NL)
const good = [
  "      '<b>循环</b>：特效是若干正弦项相加，每一项都有自己的周期，所以只要找到它们的公共循环点，单向重复也看不出跳变；',
  "      找不到短循环时才退回「来回循环」（正放再倒放，接缝天然无跳变）。循环点是从着色器源码里的频率算出来、再逐帧渲染验证的，',
  "      合成台的读数里会写明检测结果。<br>' +",
].join(NL)
const n = s.split(bad).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(bad, good))
new Function(fs.readFileSync(F, 'utf8'))
console.log('repaired, syntax OK')
