/* Probe the Hologram floating overlay: raw tile, shader pass, and the Overlay entry. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const SCENARIO = `
  holoProbe: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    const opaque = (cv) => { if(!cv) return -1; const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) n++; return n };
    const meanA = (cv) => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let s=0,n=0; for(let i=3;i<d.length;i+=4){ if(d[i]>8){s+=d[i];n++} } return n? +(s/n).toFixed(1) : 0 };

    const holo = B.byId['j_hologram'];
    r.hologramItem = { id: holo.id, atlas: holo.atlas, pos: holo.pos, soul: holo.soul, setShader: holo.setShader, soulHologramInSpec: B.specForItem(holo).soulHologram };

    // the raw floating tile, its shader pass, and the full composite with / without the overlay
    const rawTile = B.tileLayer({ atlas: 'Joker', pos: { x: 2, y: 9 } }, 142, 190);
    const shaded = B.shade(rawTile, 'hologram', 0, B.uvRectOf({ atlas: 'Joker', pos: { x: 2, y: 9 } }));
    r.holoRaw = { opaque: opaque(rawTile), meanA: meanA(rawTile) };
    r.holoShaded = shaded ? { opaque: opaque(shaded), meanA: meanA(shaded), diff: __V.diff(rawTile, shaded) } : null;

    const withSoul = B.compose(B.specForItem(holo), 2, 0);
    const noSoulSpec = B.specForItem(holo); noSoulSpec.soul = null;
    const noSoul = B.compose(noSoulSpec, 2, 0);
    r.hologramComposite = { withSoul: opaque(withSoul), withoutSoul: opaque(noSoul), diff: __V.diff(noSoul, withSoul), box: __V.bbox(withSoul) };

    // a legendary, for comparison
    const caino = B.byId['j_caino'];
    const cw = B.compose(B.specForItem(caino), 2, 0);
    const cs = B.specForItem(caino); cs.soul = null;
    r.cainoComposite = { diff: __V.diff(B.compose(cs, 2, 0), cw), box: __V.bbox(cw) };

    // raw tiles of all six floating sprites
    r.tiles = ['j_hologram','j_caino','j_triboulet','j_yorick','j_chicot','j_perkeo'].map((id) => {
      const it = B.byId[id];
      const t = B.tileLayer(it.soul, 142, 190);
      const sh = B.shade(t, id === 'j_hologram' ? 'hologram' : 'dissolve', 0, B.uvRectOf(it.soul));
      return id + ' raw=' + opaque(t) + ' meanA=' + meanA(t) + (sh ? ' shaded=' + opaque(sh) : ' shaded=null');
    });

    // the Overlay category entries
    r.overlays = B.items.filter((i) => i.cat === 'Overlay').map((i) => {
      const sp = B.specForItem(i);
      const cv = sp ? B.compose(sp, 2, 0) : null;
      return i.id + ' spec=' + JSON.stringify(sp) + ' opaque=' + opaque(cv) + ' box=' + JSON.stringify(__V.bbox(cv));
    });
    r.blank = __V.blank();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
