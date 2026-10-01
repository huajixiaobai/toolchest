/* Render the Hologram card and its overlay entry to PNG so they can be inspected visually. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const SCENARIO = `
  holoShot: \`(async()=>{
    const B = window.__BALATRO__;
    const holo = B.byId['j_hologram'];
    const caino = B.byId['j_caino'];
    const shot = (spec, scale) => B.compose(spec, scale || 4, 0).toDataURL('image/png');
    const out = {
      hologramFull: shot(B.specForItem(holo)),
      hologramNoSoul: (() => { const sp = B.specForItem(holo); sp.soul = null; return shot(sp) })(),
      hologramSoulOnly: (() => { const t = B.tileLayer(holo.soul, 284, 380); return t.toDataURL('image/png') })(),
      hologramSoulShaded: (() => { const t = B.tileLayer({ atlas: 'Joker', pos: { x: 2, y: 9 } }, 284, 380); const sh = B.shade(t, 'hologram', 0, B.uvRectOf({ atlas: 'Joker', pos: { x: 2, y: 9 } })) || t; return sh.toDataURL('image/png') })(),
      cainoFull: shot(B.specForItem(caino)),
      overlayHolo: shot(B.specForItem(B.byId['overlay_j_hologram'])),
    };
    return out })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
