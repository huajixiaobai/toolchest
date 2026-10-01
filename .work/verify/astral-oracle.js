/* ============================================================================
 * astral-oracle.js — Cryptid 的 astral.fs 数学的 JS 移植，用来当"裁判"：
 * 同一套 uniform，看 shader 本该输出什么，再和浏览器里真实渲染的结果对比。
 *
 *   node astral-oracle.js
 *
 * 目标是把"看起来太亮/太白"从主观感受变成可比较的数字：
 * 比较旧坐标系（mouse=(0,0)、screen_scale=格子宽、screen_coords=图集像素）
 * 与新坐标系（鼠标在卡中心、screen_scale=1.5*格宽、screen_coords=格子内像素）。
 * ==========================================================================*/
'use strict'

/* ---- astral.fs 里的工具函数（逐行照抄） ---- */
const fract = (x) => x - Math.floor(x)
const mod = (a, b) => a - b * Math.floor(a / b)
const rand = (x, y) => fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453)
function noise (px, py, freq) {
  const unit = 1 / freq
  const ijx = Math.floor(px / unit), ijy = Math.floor(py / unit)
  let xy_x = mod(px, unit) / unit, xy_y = mod(py, unit) / unit
  xy_x = 0.5 * (1 - Math.cos(Math.PI * xy_x))
  xy_y = 0.5 * (1 - Math.cos(Math.PI * xy_y))
  const a = rand(ijx, ijy), b = rand(ijx + 1, ijy), c = rand(ijx, ijy + 1), d = rand(ijx + 1, ijy + 1)
  const x1 = a + (b - a) * xy_x, x2 = c + (d - c) * xy_x
  return x1 + (x2 - x1) * xy_y
}
function pNoise (px, py, res) {
  let n = 0, normK = 0, f = 4, amp = 1, iCount = 0
  for (let i = 0; i < 50; i++) {
    n += amp * noise(px, py, f)
    f *= 2; normK += amp; amp *= 0.5
    if (iCount === res) break
    iCount++
  }
  const nf = n / normK
  return nf * nf * nf * nf
}
const mix = (a, b, t) => a + (b - a) * t

function hue (s, t, h) {
  const hs = mod(h, 1) * 6
  if (hs < 1) return (t - s) * hs + s
  if (hs < 3) return t
  if (hs < 4) return (t - s) * (4 - hs) + s
  return s
}
function RGB (c) {
  if (c[1] < 0.0001) return [c[2], c[2], c[2], c[3]]
  const t = c[2] < 0.5 ? c[1] * c[2] + c[2] : -c[1] * c[2] + (c[1] + c[2])
  const s = 2 * c[2] - t
  return [hue(s, t, c[0] + 1 / 3), hue(s, t, c[0]), hue(s, t, c[0] - 1 / 3), c[3]]
}
function HSL (c) {
  const low = Math.min(c[0], Math.min(c[1], c[2]))
  const high = Math.max(c[0], Math.max(c[1], c[2]))
  const delta = high - low
  const sum = high + low
  const hsl = [0, 0, 0.5 * sum, c[3]]
  if (delta === 0) return hsl
  hsl[1] = hsl[2] < 0.5 ? delta / sum : delta / (2 - sum)
  if (high === c[0]) hsl[0] = (c[1] - c[2]) / delta
  else if (high === c[1]) hsl[0] = (c[2] - c[0]) / delta + 2
  else hsl[0] = (c[0] - c[1]) / delta + 4
  hsl[0] = mod(hsl[0] / 6, 1)
  return hsl
}

/* ---- effect() 的主体 ---- */
function effect (env) {
  const { tex, uv, textureDetails, screen, mouse, screenScale, astral, time } = env
  const t = astral[1] * 2.221 + time
  const fuvx = Math.floor(uv[0] * textureDetails[2]) / textureDetails[2]
  const fuvy = Math.floor(uv[1] * textureDetails[3]) / textureDetails[3]
  const cx = (fuvx - 0.5) * 50, cy = (fuvy - 0.5) * 50
  const f1x = cx + 50 * Math.sin(-t / 143.6340), f1y = cy + 50 * Math.cos(-t / 99.4324)
  const f2x = cx + 50 * Math.cos(t / 53.1532), f2y = cy + 50 * Math.cos(t / 61.4532)
  const f3x = cx + 50 * Math.sin(-t / 87.53218), f3y = cy + 50 * Math.sin(-t / 49.0000)
  const field = (1 + (Math.cos(Math.hypot(f1x, f1y) / 19.483) +
    Math.sin(Math.hypot(f2x, f2y) / 33.155) * Math.cos(f2y / 15.73) +
    Math.cos(Math.hypot(f3x, f3y) / 27.193) * Math.sin(f3x / 21.92))) / 2

  const hsl = HSL([tex[0], tex[1], tex[2], tex[3]])
  const mo = [(screen[0] - mouse[0]) / screenScale, (screen[1] - mouse[1]) / screenScale]
  const suvy = (uv[1] + mo[1] - 0.5) * 5 * 1.338
  const suvx = (uv[0] + mo[0] - 0.5) * 5
  const norm_uv = Math.hypot(suvx, suvy)

  const p1 = pNoise(uv[0] * 10 + t / 15, uv[1] * 10 + t / 15, 10)
  const p2 = pNoise(uv[0] * 12 + t / 15, uv[1] * 12 + t / 15, 10)
  let stars = ((p1 * p1 + 1.5) / 1 + 0.15 + ((p2 + 1.2) / 1 + 0.3)) / 2.2 + 0.05 + 0.007 * norm_uv * 1.1
  let clusters = (pNoise(uv[0] * 10 - t / 15, uv[1] * 10 - t / 15, 10) + 1.5) / 1.5 - 0.25 + 0.007 * norm_uv
  let superC = (pNoise(uv[0] / 15, uv[1] / 15, 10) + 0.1) / 2 + 0.3 - 0.008 * norm_uv
  clusters *= clusters * clusters * clusters * 0.4
  stars *= stars * stars
  superC *= superC * superC

  const factor = (clusters + stars + superC + 0.1) * 0.285
  const colour = [0.6 * factor, 0.45 * factor, 1.0 * factor]
  const out = [tex[0] * colour[0], tex[1] * colour[1], tex[2] * colour[2], tex[3]]
  return {
    out, colour, factor: +factor.toFixed(3), stars: +stars.toFixed(3), clusters: +clusters.toFixed(3),
    superC: +superC.toFixed(3), norm_uv: +norm_uv.toFixed(2), field: +field.toFixed(3),
    clipped: out.slice(0, 3).some((v) => v >= 0.999),
  }
}

/* ---- 一套卡牌的典型参数：Joker 图集 2x，格子 142×190，卡在第 4 列第 12 行 ---- */
const CELL = [142, 190]
const IMG = [1420, 2660]
const TILE = [4, 12]
const ORIGIN = [TILE[0] * CELL[0], TILE[1] * CELL[1]]

const cases = {
  '旧的（mouse=(0,0), scale=格子宽, screen=图集像素）': (uv) => ({
    screen: [ORIGIN[0] + uv[0] * CELL[0], ORIGIN[1] + uv[1] * CELL[1]],
    mouse: [0, 0], screenScale: CELL[0],
  }),
  '新的（mouse=卡中心, scale=1.5*格宽, screen=格内像素）': (uv) => ({
    screen: [uv[0] * CELL[0], uv[1] * CELL[1]],
    mouse: [CELL[0] / 2, CELL[1] / 2], screenScale: 1.5 * CELL[0],
  }),
}

console.log('像素 tex=(1,1,1) 为白卡面，(0.4,0.35,0.3) 为暗部；uv 是格内归一化坐标\n')
for (const [label, mk] of Object.entries(cases)) {
  console.log('=== ' + label + ' ===')
  for (const tex of [[1, 1, 1, 1], [0.4, 0.35, 0.3, 1]]) {
    const rows = []
    for (const [u, v] of [[0.05, 0.05], [0.25, 0.5], [0.5, 0.5], [0.75, 0.5], [0.95, 0.95]]) {
      const env = Object.assign({ tex, uv: [u, v], textureDetails: TILE.concat(CELL), astral: [1234.5 / 28, 1234.5], time: 812.3 }, mk([u, v]))
      const r = effect(env)
      rows.push(`uv(${u},${v}) 倍率=${String(r.factor).padEnd(6)} stars³=${String(r.stars).padEnd(7)} norm=${String(r.norm_uv).padEnd(8)} 输出=[${r.out.slice(0, 3).map((x) => x.toFixed(2)).join(', ')}]${r.clipped ? '  ← 溢出到纯白' : ''}`)
    }
    console.log(' tex=' + JSON.stringify(tex.slice(0, 3)))
    rows.forEach((x) => console.log('   ' + x))
  }
  console.log('')
}
