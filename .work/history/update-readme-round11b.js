/* README: correct the shader section (real GLSL now) and the loop/GIF documents. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, '..', '..', 'README.md')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`**版本特效**用**从 \`resources/shaders/*.fs\` 逐行移植的 GLSL**在 WebGL 里实时渲染：闪箔的金属斜光、镭射的彩虹栅格、多彩的色相流动、负片的反相冷色。顶栏「相位」滑杆可以定格任意一帧，也可以点「实时动画预览」看它动起来。`,
  `**版本特效直接把游戏自己的 \`resources/shaders/*.fs\` 编译到 WebGL 里跑**（不是重写一遍近似效果）：闪箔的金属斜光、镭射的彩虹栅格、多彩的色相流动、负片的反相冷色，都是原版 GLSL 的输出。着色器需要的 uniform 按原版 \`engine/sprite.lua\` 的规则送（\`time / dissolve / texture_details / image_details / shadow / burn_colour\`，以及特效自己的 vec2 = \`{REAL/28, REAL}\`），并且按**图集坐标**采样——所以传奇牌的投影层、全息影像的悬浮立绘都和游戏里一致。
**导入 mod 后，mod 自带的 \`.fs\` 也会一起编译**（自动套用 Steamodded 的 GLSL ES 修复规则），mod 的自定义「版本」可以直接选中预览。顶栏「相位」滑杆可以定格任意一帧，也可以点「实时动画预览」看它动起来（预览速度与导出倍速一致）。`,
  'shader section body')

rep(`**循环**（默认「来回循环」）：单向循环从最后一帧跳回第一帧时会有明显跳变；来回循环是"正放一遍再倒放一遍"，接缝处的帧间隔与普通帧完全一致，因此看不出跳动。界面上会实时显示**接缝比**（接缝处像素差 ÷ 平均帧间差），越接近 1 越顺：`,
  `**循环**（默认「自动找循环点」）：游戏特效是若干正弦项相加，每项都有自己的周期。查看器会**从着色器源码里的频率**算出候选循环点（\`cos(t/53.1532)\` → 2π·53.1532），再**逐帧渲染验证**"接缝是否不比一个普通帧间隔更明显"，找到就用它做单向循环；找不到短循环（例如带闪箔）才退回「来回循环」（正放再倒放，接缝天然无跳变）。界面上会实时显示**接缝比**（接缝处像素差 ÷ 平均帧间差）与检测结果：`,
  'loop section')

rep(`| 合成台 / 详情 | **GIF 动图 / APNG 动图 / 帧序列 ZIP** | 着色器流光、悬浮立绘、盲注逐帧 |`,
  `| 合成台 / 详情 | **GIF 动图 / APNG 动图 / 帧序列 ZIP** | 着色器流光、悬浮立绘、盲注逐帧；GIF 可选 256/128/64 色与抖动开关 |`,
  'export table gif')

console.log(fails ? 'FAILURES ' + fails : 'done')
