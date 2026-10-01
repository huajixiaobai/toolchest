/* Two fallout fixes from the flat-pack test:
   - an inferred atlas path must default to 2x (sprite-sheet convention), not 1x
   - localization also needs a flat-file fallback: a bare en-us.lua / zh_CN.lua still counts
     as long as it actually returns a { descriptions = ... } table */
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
  `        found = { s: /(^|\\/)2x\\//i.test(pick) ? '2x' : '1x', p: pick, inferred: true };`,
  `        found = { s: /(^|\\/)1x\\//i.test(pick) ? '1x' : '2x', p: pick, inferred: true };`,
  'inferred atlas defaults to 2x')

rep('modimport.js',
  `  for (const p of [...rel.keys()]) {
    const m = /^localization\\/(.+?)\\.lua$/i.exec(p);
    if (!m) continue;
    try {
      const t = LUA.resolve(LUA.parseLua(dec(rel.get(p))));
      loc[m[1]] = t && t.descriptions ? t : { descriptions: t };
    } catch (e) { warnings.push('本地化 ' + p + ' 解析失败：' + e.message) }
  }`,
  `  for (const p of [...rel.keys()]) {
    if (!/\\.lua$/i.test(p)) continue;
    const named = /^localization\\/(.+?)\\.lua$/i.exec(p);
    // a pack whose folders were lost still names its localization files after the locale;
    // accept those only when the file really returns a descriptions table
    const bare = named ? null : /^([A-Za-z]{2}(?:[-_][A-Za-z]{2,4})?)\\.lua$/i.exec(p.split('/').pop());
    const m = named || bare;
    if (!m) continue;
    try {
      const t = LUA.resolve(LUA.parseLua(dec(rel.get(p))));
      if (!named && !(t && t.descriptions)) continue;
      loc[m[1]] = t && t.descriptions ? t : { descriptions: t };
    } catch (e) { warnings.push('本地化 ' + p + ' 解析失败：' + e.message) }
  }`,
  'flat localization fallback')

rep(path.join('verify', 'cdp.js'),
  `    for (const it of B.items.filter((i) => i.source === 'flat')) {`,
  `    for (const it of B.items.filter((i) => i.source === 'testmod')) {`,
  'modFlat filters by the real mod id')

console.log(fails ? 'FAILURES' : 'done')
