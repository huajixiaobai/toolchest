const fs = require('fs')
const s = fs.readFileSync('Balatro素材图鉴.html', 'utf8')
const has = (t) => s.includes(t)
console.log('size MB', (s.length / 1048576).toFixed(2))
const needles = [
  'window.__MODIMPORT__', 'window.__LUA__', '导入 Mod', 'modDrop', 'pickSource', 'modtag',
  '把 Mod 文件夹或 .zip 拖到这里', 'class="modsview"', 'Mod 新增类型', 'source:testmod',
  'CategoryOfNothing', 'inferred',
]
for (const t of needles) console.log((has(t) ? 'ok  ' : 'MISS'), t)
console.log('script blocks', (s.match(/<script>/g) || []).length,
  '| placeholders left', /\/\*__(CSS|DATA|ATLAS|APP|LUA|MODIMPORT)__\*\//.test(s))
