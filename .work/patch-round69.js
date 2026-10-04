/* 第六十九轮：把「死控件」检查扩到整包产物（Lua + manifest + 预览画布）
   上一轮只比 Lua 文本，工程字段（modId/modName/author/…）主要影响 manifest 与 Lua 头部注释，
   可能被误判成"死"。现在三样一起比，把假死剔掉，留下真的"改了看不出变化"。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
let n = 0
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}
rep(
  '    const pvHash=()=>{ const cv=q(".mkpvbox canvas");',
  "    /* 整包签名：Lua + manifest + 预览画布 */\n    const sig=()=>B.maker.lua()+'|'+B.maker.manifest()+'|'+pvHash();\n    const pvHash=()=>{ const cv=q(\".mkpvbox canvas\");",
  '加整包签名'
)
rep('      const beforeLua=B.maker.lua(), beforePv=pvHash();', '      const beforeSig=sig();', '改动前用签名')
rep('      const afterLua=B.maker.lua(), afterPv=pvHash();', '      const afterSig=sig();', '改动后用签名')
rep('      if (afterLua === beforeLua && afterPv === beforePv) r.deadControls.push(labelOf(el));', '      if (afterSig === beforeSig) r.deadControls.push(labelOf(el));', '判定用签名')
fs.writeFileSync(F, s)
console.log('共 ' + n + ' 处')
