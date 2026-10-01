/* Loop detection was too strict: caino's two floating-art terms (2π/1.8 and 2π/1.219) only come
   close to a common period at ~10.47s, which is visually seamless but not exact. Judge candidates
   the same way the seam ratio is judged — "no worse than one normal frame step". */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`    const list = [...cands].sort((a, b) => a - b).slice(0, 60);
    const samples = [0, 0.37, 1.11];
    for (const p of list) {
      if (loopError(spec, p, samples) < 0.0016) { best = p; break }
    }`,
  `    const list = [...cands].sort((a, b) => a - b).slice(0, 60);
    const samples = [0, 0.37, 1.11];
    // A loop is seamless when its seam is no worse than one ordinary frame step at the current
    // fps/speed — the same yardstick the seam ratio uses. Exact equality is far too strict:
    // the floating-art terms 2π/1.8 and 2π/1.219 only line up approximately (≈10.47s).
    const dt = (S.anim.speed || 1) / (S.anim.fps || 20);
    let step = 0;
    for (const t of [0, 1.3]) step += frameDiff(compose(spec, 1, t), compose(spec, 1, t + dt));
    step = Math.max(1e-4, step / 2);
    const tol = Math.max(step * 1.3, 0.0015);
    for (const p of list) {
      const e = loopError(spec, p, samples);
      if (e <= tol) { best = p; break }
    }`,
  'relaxed threshold')

rep(`    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey,`,
  `    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts, refreshForgeLists,`,
  'console API')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
