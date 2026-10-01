/* README for this round: the real-shader pipeline, the Hologram fix, loop detection, GIF
   quality, the preview-speed fix, slimming, and the audit. */
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

rep(`## 八、更新记录

**第十轮（手机端合成台布局修复）**`,
  `## 八、更新记录

**第十一轮（全息影像 / mod 着色器 / 动图与瘦身）**
- 修：**全息影像小丑（Hologram）没有叠加层**。它的悬浮立绘是用 \`hologram.fs\` 画的，而这个着色器要按**图集坐标**采样（它会在贴图边缘 5% 处直接裁掉像素）。原来只把单格贴图喂给着色器，采样坐标全落到范围外，整层被裁成 0 个像素——所以看上去"没有叠加层"。现在按 LÖVE 的方式把整张图集作为纹理、用图集坐标采样，Hologram 的悬浮小人正常显示（底图是灰蓝的 Joker 卡，上面叠加彩色全息小人）。
- 新：**真正跑原版着色器**。以前页面上那些特效是**手写重实现**的近似版本；现在改成把 \`resources/shaders/*.fs\` **原样编译**到 WebGL（自动套用 Steamodded 的 GLSL ES 修复规则：整数→浮点、\`extern\`→\`uniform\`、\`Texel/effect()\` 适配），并把游戏真正会传的 uniform（\`time / dissolve / texture_details / image_details / shadow / burn_colour\`、以及特效自己的 vec2）按 \`engine/sprite.lua\` 的规则送进去。19 个原版着色器里 17 个是片元着色器（全部编译通过），skew / vortex 是顶点专用（倾斜效果，本页不做倾斜）。
- 新：**mod 自带着色器也能用**。导入 mod 时会读它的 \`assets/shaders/*.fs\` 并编译，版本（Edition）用 \`shader = 'xxx'\` 指定即可——**Cryptid 的 10 个自定义版本里 9 个已能正常渲染**（mosaic / astral / glass / glitched / gold / blur / noisy / oversat / m），第 10 个（double sided）本身没有声明着色器。合成台里也能选到这些版本，条目上带 MOD 角标。
- 修：**合成台的倍速在预览里看不出变化**。实时预览的时间步进没有乘速度系数，所以改速度只有导出的动图变了。现在预览按同一倍速跑，实测 1× / 4× / 8× 的比例是 3.9 / 7.9。
- 新：**自动找循环点**。游戏特效是若干正弦项相加，每一项都有自己的周期；循环点从**着色器源码里的频率**算出候选（例如 \`cos(t/53.1532)\` → 2π·53.1532），再**逐帧渲染验证**"接缝是否不比普通帧间隔更明显"。找到就用它做单向循环（传奇牌从 98 帧来回循环变成 **13 帧完美循环**，体积小 7 倍且完全无跳变）；找不到短循环（比如带了闪箔）就老实退回来回循环，并在读数里写明。
- 新：**GIF 画质提升**。调色板在 median cut 之后加了 k-means 精炼，映射时加 **Floyd–Steinberg 抖动**（可开关），并可选 256 / 128 / 64 色。用独立的 \`omggif\` 解码逐像素比对：感知误差（4×4 局部平均）从 **1.05 降到 0.42，改善 60%**；抖动本身会让逐像素误差略升（1.13）但体积 +37%，界面上给了开关和说明。
- 减负：**代码瘦身**（功能不减）。删掉了三处没人调用的声明；把 \`shade()\` 与 \`shadeCanvas()\` 里重复的 25 行 WebGL 设置合并成 \`begin()/commonUniforms()/finish()\`；最大的减重来自把手写的 GLSL 近似实现整块删掉，改用原版 \`.fs\`（app.js 少了两百多行近似代码）。当前 app.js 167 KB / 3365 行，lua.js 14 KB，modimport.js 23 KB，glshaders.js 6.7 KB。
- 新：**自动审计场景**。一次跑完所有视图（0 空白画布）、全部 527 个条目合成（0 空白 / 0 缺图集）、导出助手（PNG / ZIP / CSV / JSON）、13 个着色器逐个执行、循环检测的确定性与缓存（第二次调用 0ms），以及页面级错误——全绿。

**第十轮（手机端合成台布局修复）**`,
  'change log 第十一轮')

/* the shader feature section */
rep(`### 6. 着色器 ✦`,
  `### 6. 着色器 ✦（用游戏自己的 GLSL 跑）`,
  'shader heading')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
