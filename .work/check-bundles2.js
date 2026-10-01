'use strict'
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process')
const W = path.join(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(W, '.work', p), 'utf8')
const files = ['glshaders.js', 'modimport.js', 'app.js']
const tmp = path.join(os.tmpdir(), 'dsh-bundle-check.js')
const check = (label, src) => {
  fs.writeFileSync(tmp, src)
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); console.log('✅ ' + label) }
  catch (e) { const m = String(e.stderr || e.message).split('\n').filter((l) => /Error|^\s*\^|at /.test(l)).slice(0, 6).join(' | '); console.log('❌ ' + label + ' → ' + m) }
}
for (const f of files) check('单独 ' + f, read(f))
check('gl+mod', [read('glshaders.js'), read('modimport.js')].join('\n;\n'))
check('mod+app', [read('modimport.js'), read('app.js')].join('\n;\n'))
check('gl+app', [read('glshaders.js'), read('app.js')].join('\n;\n'))
check('三者', files.map(read).join('\n;\n'))
for (const f of files) {
  const s = read(f)
  console.log(f + ' 结尾: ' + JSON.stringify(s.slice(-80)))
}
