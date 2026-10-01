/* If a pack's folder structure is missing (flat drop) or its art lives somewhere other than
   assets/{1x,2x}/, fall back to matching the declared file name anywhere in the pack. */
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
  `    const found = ['2x', '1x'].map((s) => ({ s, p: 'assets/' + s + '/' + path })).find((c) => rel.has(c.p));
    if (!found) { warnings.push(\`图集 \${k} 的贴图 assets/1x|2x/\${path} 不在包内\`); stats.skipped++; continue }
    atlases.set(k, { key: k, path, px, py, file: found.p, scale: found.s === '2x' ? 2 : 1, bytes: rel.get(found.p) });`,
  `    let found = ['2x', '1x'].map((s) => ({ s, p: 'assets/' + s + '/' + path })).find((c) => rel.has(c.p));
    if (!found) {
      // not where it was declared — some packs are flat, or keep art in their own folder, so
      // fall back to the declared file name and prefer a 2x copy if there is one
      const base = String(path).split('/').pop().toLowerCase();
      const cand = [...rel.keys()].filter((f) => f.toLowerCase().split('/').pop() === base && /\\.(png|jpe?g|webp)$/i.test(f));
      const pick = cand.sort((a, b) => (/(^|\\/)2x\\//i.test(b) ? 1 : 0) - (/(^|\\/)2x\\//i.test(a) ? 1 : 0))[0];
      if (pick) { found = { s: /(^|\\/)2x\\//i.test(pick) ? '2x' : '1x', p: pick }; inferredAtlas.push(k + ' → ' + pick) }
    }
    if (!found) { warnings.push(\`图集 \${k} 的贴图 assets/1x|2x/\${path} 不在包内\`); stats.skipped++; continue }
    atlases.set(k, { key: k, path, px, py, file: found.p, scale: found.s === '2x' ? 2 : 1, bytes: rel.get(found.p) });`,
  'atlas filename fallback')

rep('modimport.js',
  `  const missingAtlas = [];  // objects naming an atlas that is not in the mod nor in the base game`,
  `  const missingAtlas = [];  // objects naming an atlas that is not in the mod nor in the base game
  const inferredAtlas = []; // atlases found by file name instead of at the declared path`,
  'inferredAtlas decl')

rep('modimport.js',
  `  if (missingAtlas.length) warnings.push(`,
  `  if (inferredAtlas.length) warnings.push(\`\${inferredAtlas.length} 个图集的贴图不在声明的路径上，已按文件名匹配：\${inferredAtlas.slice(0, 3).join('、')}\${inferredAtlas.length > 3 ? ' …' : ''}\`);
  if (missingAtlas.length) warnings.push(`,
  'inferredAtlas warning')

rep('modimport.js',
  `  stats.missingAtlas = missingAtlas.length;`,
  `  stats.missingAtlas = missingAtlas.length;
  stats.inferredAtlas = inferredAtlas.length;`,
  'stats inferredAtlas')

/* realistic drops carry relative paths; keep a flat drop in the test to prove the fallback */
rep(path.join('verify', 'cdp.js'),
  `    const mk = (p, b64) => new File([u8(b64)], p.split('/').pop());`,
  `    const mk = (p, b64) => {
      const f = new File([u8(b64)], p.split('/').pop());
      try { Object.defineProperty(f, '__rel', { value: p, configurable: true }) } catch (e) { /* ignore */ }
      return f;
    };`,
  'test files carry a relative path')

console.log(fails ? 'FAILURES' : 'done')
