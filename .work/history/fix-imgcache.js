/* registerMod probed each atlas with a throwaway <img>; drawTileTo() then created a *second*
   Image for the same blob URL and silently skipped anything not decoded yet, so a mod imported
   while its sheets were still decoding painted blank cards (and never repainted). Keep the
   decoded element in the normal image cache instead. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
const from = `      const im = new Image();
      const dims = await new Promise((res) => { im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = url });
      byFile.set(file, { url, w: dims[0], h: dims[1], error: null });`.split('\n').join(NL)
const to = `      const im = new Image();
      const dims = await new Promise((res) => { im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = url });
      // keep THIS element as the cached one: drawTileTo() reads IMG[file], and a second Image
      // created later may not be decoded yet (it would silently draw nothing)
      IMG[file] = im;
      IMG_READY[file] = Promise.resolve(im);
      byFile.set(file, { url, w: dims[0], h: dims[1], error: null });`.split('\n').join(NL)
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
fs.writeFileSync(F, s)
new Function(s)
console.log('fixed, syntax OK')
