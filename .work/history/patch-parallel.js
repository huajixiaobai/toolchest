/* A big mod ships 60+ sheets; decoding them one at a time made an import take many seconds
   (and could exceed a phone's patience). Decode them all in parallel, then register. */
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
  `  const addedAtlas = [];
  const byFile = new Map();   // mod path -> {url, w, h, error}
  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    if (!byFile.has(file)) {
      const url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/png' }));
      ATLAS[file] = url;
      delete IMG[file]; delete IMG_READY[file];
      const im = new Image();
      const dims = await new Promise((res) => { im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = url });
      // keep THIS element as the cached one: drawTileTo() reads IMG[file], and a second Image
      // created later may not be decoded yet (it would silently draw nothing)
      IMG[file] = im;
      IMG_READY[file] = Promise.resolve(im);
      byFile.set(file, { url, w: dims[0], h: dims[1], error: null });
    }
    const rec = byFile.get(file);`,
  `  const addedAtlas = [];
  const byFile = new Map();   // mod path -> {url, w, h, error}
  // decode every sheet in parallel: Cryptid alone ships 60 of them, and a sequential load made
  // the import take several seconds on a phone
  const pending = [];
  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    if (byFile.has(file)) continue;
    const url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/png' }));
    ATLAS[file] = url;
    delete IMG[file]; delete IMG_READY[file];
    const im = new Image();
    const rec = { url, w: 0, h: 0, error: null };
    byFile.set(file, rec);
    // keep THIS element as the cached one: drawTileTo() reads IMG[file], and a second Image
    // created later may not be decoded yet (it would silently draw nothing)
    IMG[file] = im;
    IMG_READY[file] = new Promise((res) => {
      const ok = () => { rec.w = im.naturalWidth; rec.h = im.naturalHeight; res(im) };
      im.onload = ok;
      im.onerror = () => { rec.w = 0; rec.h = 0; res(null) };
    });
    im.src = url;
    pending.push(IMG_READY[file]);
  }
  if (pending.length) await Promise.all(pending);

  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    const rec = byFile.get(file);`,
  'parallel atlas decode')

rep('app.js',
  `    if (!rec.w || !rec.h) {
      if (!rec.error) { rec.error = '图集 ' + a.key + ' 的图片无法解码'; parsed.warnings.push(rec.error) }
      continue;
    }`,
  `    if (!rec.w || !rec.h) {
      if (!rec.error) { rec.error = '图集 ' + a.key + ' 的图片无法解码'; parsed.warnings.push(rec.error) }
      continue;
    }
    void rec.url;`,
  'keep rec.url referenced')

/* the test needs a longer budget for a 20MB mod under software rendering */
rep(path.join('verify', 'cdp.js'),
  `    for (let i = 0; i < 60 && !B.mods.length; i++) await __V.wait(400);`,
  `    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);`,
  'longer wait for Cryptid')

console.log(fails ? 'FAILURES' : 'done')
