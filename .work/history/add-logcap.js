const fs = require('fs')
let s = fs.readFileSync('cdp.js', 'utf8')
const from = '    r.imported = res && { ok: res.ok, items: res.items, atlases: res.atlases };\n    r.shaderFiles = res && res.mod.stats.shaders;'
const to = '    r.logText = (document.getElementById("modLogBox") || {}).textContent || "";\n    r.toast = (document.getElementById("toast") || {}).textContent || "";\n' + from
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync('cdp.js', s.replace(from, to))
new Function(fs.readFileSync('cdp.js', 'utf8'))
console.log('ok, syntax OK')
