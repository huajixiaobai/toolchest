// Assembles the single-file viewer: shell + css + data + textures + app.
'use strict'
const fs = require('fs')
const path = require('path')

const HERE = __dirname
const OUTDIR = path.join(HERE, '..')
const read = (p) => fs.readFileSync(path.join(HERE, p), 'utf8')

const shell = read('shell.html')
const css = read('app.css')
const app = read('app.js')
const luaSrc = read('lua.js')
const modSrc = read('modimport.js')
const glSrc = read('glshaders.js')
const data = read('out/data.json')
const atlas = read('out/atlas.js')

/* ---- gate: every inline <script> payload must parse and must not contain a literal
   </script (which would terminate the tag early and silently kill the whole viewer). ---- */
function gate (inline) {
  for (const [name, src] of Object.entries(inline)) {
    const bad = src.toLowerCase().indexOf('</script')
    if (bad >= 0) throw new Error('inline script "' + name + '" contains </script at offset ' + bad)
    try { new Function(src) } catch (e) { throw new Error('syntax error in inline script "' + name + '": ' + e.message) }
  }
  console.log('gate ✓  ' + Object.keys(inline).join(' / ') + ' 全部语法通过')
}
gate({ lua: luaSrc, glshaders: glSrc, modimport: modSrc, app })

const put = (src, marker, value) => src.replace(marker, () => value)

let html = shell
/* The same build stamp the web build shows in the status bar, so a screenshot from either
   build identifies exactly which code produced it. */
const appStamp = require('crypto').createHash('sha256').update(app).digest('hex').slice(0, 8)
html = put(html, '/*__CSS__*/', css)
html = put(html, '/*__DATA__*/', 'window.__BALATRO_DATA__=' + data + ';')
html = put(html, '/*__ATLAS__*/', atlas)
html = put(html, '/*__LUA__*/', luaSrc)
html = put(html, '/*__GLSHADERS__*/', glSrc)
html = put(html, '/*__MODIMPORT__*/', modSrc)
html = put(html, '/*__APP__*/', 'window.__APP_BUILD__=' + JSON.stringify(appStamp) + ';' + app)

const target = path.join(OUTDIR, 'Balatro素材图鉴.html')
fs.writeFileSync(target, html)
console.log('wrote', target)
console.log('size:', (fs.statSync(target).size / 1048576).toFixed(2), 'MB')

// sanity: no placeholder left, and every atlas referenced by the data is embedded
for (const m of ['/*__CSS__*/', '/*__DATA__*/', '/*__ATLAS__*/', '/*__APP__*/', '/*__LUA__*/', '/*__MODIMPORT__*/', '/*__GLSHADERS__*/']) {
  if (html.includes(m)) throw new Error('placeholder left: ' + m)
}
const D = JSON.parse(data)
const embedded = new Set(Object.keys(JSON.parse(atlas.replace(/^window\.__BALATRO_ATLAS__=/, '').replace(/;\s*$/, ''))))
const missing = Object.values(D.atlases).map((a) => a.file).filter((f) => !embedded.has(f))
if (missing.length) throw new Error('atlas not embedded: ' + [...new Set(missing)].join(', '))
console.log('atlases referenced:', Object.keys(D.atlases).length, '| all embedded ✓')
