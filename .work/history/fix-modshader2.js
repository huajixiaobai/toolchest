/* Fix two things in the mod-shader wiring:
   - keyCandidates lives in modimport.js, not app.js (that ReferenceError aborted the import)
   - the "not ported" note should only appear when the shader really is unavailable */
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
  `  const modShaders = [];
  for (const sh of parsed.shaders || []) {
    const cands = keyCandidates(sh.key, parsed.prefix, null).concat([sh.key]);
    let prog = null;
    for (const cand of cands) {
      const p = GL && GL.defineShader(cand, sh.source);
      if (p) { prog = cand; MOD_SHADERS[cand] = sh.source; }
    }
    if (prog) modShaders.push(prog);
    else parsed.warnings.push('着色器 ' + sh.key + ' 无法编译（可能是顶点专用着色器）');
  }`,
  `  const modShaders = [];
  const missingShaders = [];
  for (const sh of parsed.shaders || []) {
    // SMODS registers the shader under a prefixed key but still sends the original name
    const cands = [sh.key, parsed.prefix ? parsed.prefix + '_' + sh.key : null].filter(Boolean);
    let prog = null;
    for (const cand of cands) {
      if (GL && GL.defineShader(cand, sh.source)) { prog = cand; MOD_SHADERS[cand] = sh.source; }
    }
    if (prog) modShaders.push(prog);
    else { missingShaders.push(sh.key); parsed.warnings.push('着色器 ' + sh.key + ' 无法编译（顶点专用或语法不受支持）') }
  }
  for (const it of parsed.items) {
    if (it.shader && !modShaders.some((k) => k === it.shader || k.endsWith('_' + it.shader))) {
      it.note = '这个版本用的是 mod 自定义着色器 ' + it.shader + '，但该着色器无法编译，下面显示的是不加特效的牌面';
    } else if (it.shader) it.note = null;
  }`,
  'shader candidates')

rep('modimport.js',
  `    // mod editions are shader effects; the viewer only ships the vanilla GLSL, so be explicit
    if (d.type === 'Edition' && typeof t.shader === 'string' && t.shader) {
      item.shader = t.shader;
      item.note = '这个版本用的是 mod 自定义着色器 ' + t.shader + '（.fs 未移植到本页），下面显示的是不加特效的牌面';
    }`,
  `    // mod editions name their shader; the note is filled in once we know whether it compiled
    if (d.type === 'Edition' && typeof t.shader === 'string' && t.shader) item.shader = t.shader;`,
  'edition note moved')

console.log(fails ? 'FAILURES' : 'done')
