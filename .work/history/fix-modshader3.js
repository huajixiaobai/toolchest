/* Small follow-ups: the log wording (mod shaders ARE ported now), a live shader list, and
   dropping the mod's shader sources when it is unloaded. */
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

rep('app.js',
  `\${st.shaders ? ' · 自带 ' + st.shaders + ' 个着色器（未移植）' : ''}`,
  `\${st.shaders ? ' · 自带 ' + st.shaders + ' 个着色器（已接入）' : ''}`,
  'log wording')

rep('app.js',
  `    webgl: !!GL, shaderPrograms: GL ? Object.keys(GL.programs) : [],`,
  `    webgl: !!GL,
    get shaderPrograms () { return GL ? GL.names() : [] },`,
  'live shader list')

rep('app.js',
  `  if (idx >= 0) { for (const a of MODS[idx].atlasKeys) delete D.atlases[a]; MODS.splice(idx, 1) }`,
  `  if (idx >= 0) {
    for (const a of MODS[idx].atlasKeys) delete D.atlases[a];
    MODS.splice(idx, 1);
  }
  // shader sources belong to the mod; the compiled programs stay but nothing references them
  for (const k of Object.keys(MOD_SHADERS)) delete MOD_SHADERS[k];`,
  'unload shaders')

console.log(fails ? 'FAILURES' : 'done')
