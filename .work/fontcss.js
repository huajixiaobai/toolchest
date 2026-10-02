/* ============================================================================
 * fontcss.js — 游戏像素字体（resources/fonts/m6x11plus.ttf）的 @font-face 片段。
 *
 * 公开构建**不**内嵌它（那是游戏素材）；内嵌只用于单文件版与自用版。
 * 站点版靠 boot.js 从访客自己的游戏文件里读出来注册成同一族名。
 * ==========================================================================*/
'use strict'
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, 'love', 'resources', 'fonts', 'm6x11plus.ttf')

/** 返回可直接塞进 <style> 的 @font-face；文件不在就返回空串（界面退回等宽字体） */
function fontFace (family) {
  if (!fs.existsSync(SRC)) return ''
  const b64 = fs.readFileSync(SRC).toString('base64')
  return '@font-face{font-family:' + (family || 'BalatroPixel') + ';font-style:normal;font-weight:700;' +
    'src:url(data:font/ttf;base64,' + b64 + ') format("truetype");font-display:swap}\n' +
    ':root{--pix:' + (family || 'BalatroPixel') + ',"Cascadia Mono",Consolas,monospace}\n'
}

module.exports = { fontFace, SRC }
