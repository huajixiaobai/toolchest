/* Mod editions use custom .fs shaders that the viewer does not port yet. Say so on the item
   instead of silently showing a plain card, and report how many shaders the mod ships. */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

rep('modimport.js',
  `      box: null,
      source: id, sourceName: manifest.display_name || manifest.name || id,`,
  `      box: null,
      note: null,
      source: id, sourceName: manifest.display_name || manifest.name || id,`,
  'item.note field')

rep('modimport.js',
  `    if (item.soul_pos) {`,
  `    // mod editions are shader effects; the viewer only ships the vanilla GLSL, so be explicit
    if (d.type === 'Edition' && typeof t.shader === 'string' && t.shader) {
      item.shader = t.shader;
      item.note = '这个版本用的是 mod 自定义着色器 ' + t.shader + '（.fs 未移植到本页），下面显示的是不加特效的牌面';
    }
    if (item.soul_pos) {`,
  'edition shader note')

rep('modimport.js',
  `  stats.images = [...rel.keys()].filter((k) => /\\.(png|jpg|jpeg|gif|webp)$/i.test(k)).length;`,
  `  stats.images = [...rel.keys()].filter((k) => /\\.(png|jpg|jpeg|gif|webp)$/i.test(k)).length;
  stats.shaders = [...rel.keys()].filter((k) => /\\.fs$/i.test(k)).length;`,
  'count shaders')

rep('app.js',
  `    modLog('ok', \`已导入「\${res.mod.name}」：条目 \${res.items} · 图集 \${res.atlases} · 扫描 \${st.decls || 0} 条声明（跳过 \${st.skipped || 0}）\`);`,
  `    modLog('ok', \`已导入「\${res.mod.name}」：条目 \${res.items} · 图集 \${res.atlases} · 扫描 \${st.decls || 0} 条声明（跳过 \${st.skipped || 0}）\${st.shaders ? ' · 自带 ' + st.shaders + ' 个着色器（未移植）' : ''}\`);`,
  'log shader count')

console.log(fails ? 'FAILURES' : 'done')
