/* The web build joins several IIFEs into one file; check that the concatenation is valid and
   that each part still sets up its globals. */
'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(W, '.work', p), 'utf8')
const boot = [read('lua.js'), read('databuild.js'), read('gameparse.js'), read('boot.js')].join('\n;\n')
const app = [read('glshaders.js'), read('modimport.js'), read('app.js')].join('\n;\n')

for (const [name, src] of [['boot bundle', boot], ['app bundle', app]]) {
  try { new Function(src); console.log('✅ ' + name + ' 语法有效 (' + (src.length / 1024).toFixed(0) + ' KB)') } catch (e) { console.log('❌ ' + name + ' 语法错误：' + e.message) }
}
/* Where does the app bundle start/end? */
const head = app.split('\n').slice(0, 3).join(' | ')
const tail = app.split('\n').slice(-3).join(' | ')
console.log('app bundle 头:', head.slice(0, 120))
console.log('app bundle 尾:', tail.slice(0, 120))
/* Look for a stray top-level return or a </script> that would break in an inline tag */
for (const bad of ['</script', '\nreturn ', '\nexport ', '\nimport ']) {
  const i = app.indexOf(bad)
  if (i >= 0) console.log('⚠️  app bundle 含可疑片段 ' + JSON.stringify(bad) + ' @' + i + ': ' + JSON.stringify(app.slice(i, i + 60)))
}
