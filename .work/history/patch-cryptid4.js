/* Make the "no atlas" warning actually useful: group by category instead of guessing at a
   default sheet name. */
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
  `    else (declaredAtlas ? missingAtlas : implicitAtlas).push(fullKey + ' → ' + atlasKey);`,
  `    else (declaredAtlas ? missingAtlas : implicitAtlas).push({ id: fullKey, cat, declared: declaredAtlas || null, want: atlasKey });`,
  'implicitAtlas entries')

rep('modimport.js',
  `  if (implicitAtlas.length) warnings.push(\`\${implicitAtlas.length} 个条目没有声明 atlas，已标为无贴图：\${implicitAtlas.slice(0, 4).join('、')}\${implicitAtlas.length > 4 ? ' …' : ''}\`);`,
  `  if (implicitAtlas.length) {
    const byCat = {};
    for (const e of implicitAtlas) byCat[e.cat] = (byCat[e.cat] || 0) + 1;
    warnings.push(\`\${implicitAtlas.length} 个条目本身没有卡图（\${Object.entries(byCat).map(([k, v]) => k + '×' + v).join('、')}），在游戏里它们由原版图层合成或本来就是纯效果\`);
  }`,
  'implicit atlas warning')

rep('modimport.js',
  `  if (missingAtlas.length) warnings.push(\`\${missingAtlas.length} 个条目指向的图集不存在（mod 里没有，原版也没有），已标为无贴图：\${missingAtlas.slice(0, 4).join('、')}\${missingAtlas.length > 4 ? ' …' : ''}\`);`,
  `  if (missingAtlas.length) warnings.push(\`\${missingAtlas.length} 个条目指向的图集不存在（mod 里没有，原版也没有），已标为无贴图：\${missingAtlas.slice(0, 4).map((e) => e.id + ' → ' + e.declared).join('、')}\${missingAtlas.length > 4 ? ' …' : ''}\`);`,
  'missing atlas warning')

console.log(fails ? 'FAILURES' : 'done')
