/* Replaces the modProbe scenario with a surgical one: compare shade() in/out for a mod tile
   versus a vanilla tile, and sample actual pixels. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')

const start = s.indexOf('\n  modProbe: `')
const endMarker = '\n}\n\nasync function main () {'
const end = s.indexOf(endMarker, start)
if (start < 0 || end < 0) { console.log('FAIL locate', start, end); process.exit(1) }

const SCENARIO = `
  modProbe: \`(async()=>{
    const r = {};
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(600);

    const px = (cv, x, y) => { const d = cv.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0],d[1],d[2],d[3]] };
    const opaque = (cv) => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) n++; return n };
    const test = (label, tile) => {
      const sh = B.shade(tile, 'polychrome', 6);
      return { label, tileOpaque: opaque(tile), shadeOpaque: sh ? opaque(sh) : -1, diff: sh ? __V.diff(tile, sh) : -1,
        tilePx: px(tile, 70, 95), shadePx: sh ? px(sh, 70, 95) : null };
    };

    // mod tile and vanilla tile built the same way
    const modTile = B.tileLayer({ atlas: 'mod_jokers', pos: { x: 1, y: 0 } }, 142, 190);
    const vanTile = B.tileLayer({ atlas: 'Joker', pos: { x: 0, y: 0 } }, 142, 190);
    r.modTile = test('mod', modTile);
    r.vanTile = test('van', vanTile);

    // is the mod image itself decoded?
    const file = B.atlases['mod_jokers'].file;
    const im = document.querySelector('img'); // just to touch the DOM
    r.atlasFile = file;
    r.imgLoaded = await new Promise((res) => {
      const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res('error'); i.src = B.atlases['mod_jokers'] && '' ;
      res('skipped');
    });

    // a shader over a plain opaque canvas (no atlas involved at all)
    const flat = document.createElement('canvas'); flat.width = 142; flat.height = 190;
    const g = flat.getContext('2d'); g.fillStyle = '#c86432'; g.fillRect(0,0,142,190);
    r.flat = test('flat', flat);

    // canvas-tainting check: read a blob-url image straight into a canvas
    const raw = document.createElement('canvas'); raw.width = 142; raw.height = 190;
    const rg = raw.getContext('2d');
    let taint = 'n/a';
    try {
      const im2 = new Image();
      await new Promise((res) => { im2.onload = res; im2.onerror = res; im2.src = B.atlases['mod_jokers'].file.startsWith('blob:') ? '' : '' });
      taint = 'skipped';
    } catch (e) { taint = String(e.message) }
    r.taint = taint;

    // does compose() put the gloss on a mod item when a vanilla front is involved?
    const modIt = B.byId['j_tm_beta'];
    const spA = B.specForItem(modIt);
    const spB = B.specForItem(modIt); spB.edition = 'e_polychrome';
    r.composeMod = { diff: __V.diff(B.compose(spA,2,6), B.compose(spB,2,6)) };
    const vanIt = B.byId['j_joker'];
    const vA = B.specForItem(vanIt);
    const vB = B.specForItem(vanIt); vB.edition = 'e_polychrome';
    r.composeVan = { diff: __V.diff(B.compose(vA,2,6), B.compose(vB,2,6)) };
    r.specs = { mod: JSON.stringify(B.specForItem(modIt)), van: JSON.stringify(B.specForItem(vanIt)) };
    return r })()\`,
`
s = s.slice(0, start) + SCENARIO + s.slice(end + 1)
fs.writeFileSync(F, s)
new Function(s)
console.log('probe replaced, syntax OK')
