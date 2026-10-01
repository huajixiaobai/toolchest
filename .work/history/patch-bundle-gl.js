/* Bundle the WebGL shader compiler into the single file. */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

rep('shell.html',
  `<script>
/*__LUA__*/
</script>`,
  `<script>
/*__GLSHADERS__*/
</script>
<script>
/*__LUA__*/
</script>`,
  'shell placeholder')

rep('bundle.js',
  `const modSrc = read('modimport.js')`,
  `const modSrc = read('modimport.js')
const glSrc = read('glshaders.js')`,
  'bundle read')

rep('bundle.js',
  `html = put(html, '/*__LUA__*/', luaSrc)`,
  `html = put(html, '/*__LUA__*/', luaSrc)
html = put(html, '/*__GLSHADERS__*/', glSrc)`,
  'bundle inject')

rep('bundle.js',
  `for (const m of ['/*__CSS__*/', '/*__DATA__*/', '/*__ATLAS__*/', '/*__APP__*/', '/*__LUA__*/', '/*__MODIMPORT__*/']) {`,
  `for (const m of ['/*__CSS__*/', '/*__DATA__*/', '/*__ATLAS__*/', '/*__APP__*/', '/*__LUA__*/', '/*__MODIMPORT__*/', '/*__GLSHADERS__*/']) {`,
  'bundle check')

console.log(fails ? 'FAILURES' : 'done')
