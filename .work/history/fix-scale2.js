/* The scale guess must not be poisoned by an item whose pos is deliberately wrong: score each
   candidate scale by how many declared positions it can hold, and take the better one. */
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

rep('app.js',
  `      const realKey = a.aliasOf || a.key;
      const used = parsed.items.filter((it) => it.atlas === realKey && it.pos);
      const fits = (s) => {
        const cols = Math.floor(rec.w / (s * a.px)); const rows = Math.floor(rec.h / (s * a.py));
        return cols >= 1 && rows >= 1 && used.every((it) => it.pos.x < cols && it.pos.y < rows);
      };
      if (!fits(scale) && fits(scale === 2 ? 1 : 2)) {
        parsed.warnings.push('图集 ' + a.key + ' 的贴图路径已丢失，按 ' + (scale === 2 ? 1 : 2) + 'x 处理（按条目坐标反推）');
        scale = scale === 2 ? 1 : 2;
      }`,
  `      const realKey = a.aliasOf || a.key;
      const used = parsed.items.filter((it) => it.atlas === realKey && it.pos);
      // score, don't require: a single broken pos must not outweigh every correct one
      const score = (sc) => {
        const cols = Math.floor(rec.w / (sc * a.px)); const rows = Math.floor(rec.h / (sc * a.py));
        if (cols < 1 || rows < 1) return -1;
        return used.filter((it) => it.pos.x < cols && it.pos.y < rows).length;
      };
      const alt = scale === 2 ? 1 : 2;
      if (score(alt) > score(scale)) {
        parsed.warnings.push('图集 ' + a.key + ' 的贴图路径已丢失，按 ' + alt + 'x 处理（按条目坐标反推）');
        scale = alt;
      }`,
  'score-based scale inference')

rep('app.js',
  `    case 'Deck': return { back: { atlas: it.atlas || 'centers', pos: it.pos } };`,
  `    case 'Deck': return it.pos ? { back: { atlas: it.atlas || 'centers', pos: it.pos } } : null;`,
  'Deck needs a pos')

rep('app.js',
  `  if (spec.standalone) {
    const a = atlas(spec.standalone.atlas);`,
  `  if (spec.standalone) {
    const a = atlas(spec.standalone.atlas);
    if (!a) return newCanvas(Math.round(CARD_W * scale), Math.round(CARD_H * scale));`,
  'guard standalone without an atlas')

console.log(fails ? 'FAILURES' : 'done')
