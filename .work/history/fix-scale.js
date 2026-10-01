/* The file-name fallback loses the 1x/2x information. Assume 2x (the convention for sprite
   sheets), then verify against the declared pos values after the image is decoded and flip to
   1x if that is the only scale that fits. Say which one was chosen. */
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
  `      if (pick) { found = { s: /(^|\\/)2x\\//i.test(pick) ? '2x' : '1x', p: pick }; inferredAtlas.push(k + ' → ' + pick) }`,
  `      if (pick) {
        found = { s: /(^|\\/)2x\\//i.test(pick) ? '2x' : '1x', p: pick, inferred: true };
        inferredAtlas.push(k + ' → ' + pick);
      }`,
  'mark inferred atlas')

rep('modimport.js',
  `    atlases.set(k, { key: k, path, px, py, file: found.p, scale: found.s === '2x' ? 2 : 1, bytes: rel.get(found.p) });`,
  `    atlases.set(k, {
      key: k, path, px, py, file: found.p,
      // a path that no longer says 1x/2x has to be guessed: sprite sheets are 2x by convention
      scale: found.s === '2x' ? 2 : 1,
      inferred: !!found.inferred,
      bytes: rel.get(found.p),
    });`,
  'carry the inferred flag')

rep('app.js',
  `    const rec = byFile.get(file);
    if (!rec.w || !rec.h) {
      if (!rec.error) { rec.error = '图集 ' + a.key + ' 的图片无法解码'; parsed.warnings.push(rec.error) }
      continue;
    }
    D.atlases[a.key] = {
      name: a.key, file, px: a.px, py: a.py, w: rec.w, h: rec.h, scale: a.scale,
      cols: Math.max(1, Math.round(rec.w / (a.scale * a.px))),
      rows: Math.max(1, Math.round(rec.h / (a.scale * a.py))),
      frames: null, kind: 'mod', aliasOf: a.aliasOf || null,
    };`,
  `    const rec = byFile.get(file);
    if (!rec.w || !rec.h) {
      if (!rec.error) { rec.error = '图集 ' + a.key + ' 的图片无法解码'; parsed.warnings.push(rec.error) }
      continue;
    }
    let scale = a.scale;
    if (a.inferred) {
      // the file name was matched, so 1x/2x had to be guessed — keep whichever scale can
      // actually hold every pos the mod declares
      const realKey = a.aliasOf || a.key;
      const used = parsed.items.filter((it) => it.atlas === realKey && it.pos);
      const fits = (s) => {
        const cols = Math.floor(rec.w / (s * a.px)); const rows = Math.floor(rec.h / (s * a.py));
        return cols >= 1 && rows >= 1 && used.every((it) => it.pos.x < cols && it.pos.y < rows);
      };
      if (!fits(scale) && fits(scale === 2 ? 1 : 2)) {
        parsed.warnings.push('图集 ' + a.key + ' 的贴图路径已丢失，按 ' + (scale === 2 ? 1 : 2) + 'x 处理（按条目坐标反推）');
        scale = scale === 2 ? 1 : 2;
      }
    }
    D.atlases[a.key] = {
      name: a.key, file, px: a.px, py: a.py, w: rec.w, h: rec.h, scale,
      cols: Math.max(1, Math.round(rec.w / (scale * a.px))),
      rows: Math.max(1, Math.round(rec.h / (scale * a.py))),
      frames: null, kind: 'mod', aliasOf: a.aliasOf || null,
    };`,
  'verify inferred scale against declared pos')

console.log(fails ? 'FAILURES' : 'done')
