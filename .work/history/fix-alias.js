/* Fixes found by the Node parser test:
   - an explicitly prefixed atlas spelling (atlas = 'tm_mod_notes') must resolve through the alias
   - a mod sticker declares its own atlas/pos, so the sticker overlay has to accept a sprite ref */
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
  `    let atlas = atlasCands.map((a) => atlases.get(a)).find((a) => a && !a.aliasOf) || null;
    let atlasName = null;`,
  `    const hit = atlasCands.map((a) => atlases.get(a)).find(Boolean) || null;
    // a prefixed spelling maps onto the same image as the atlas the mod declared
    const atlas = hit ? (hit.aliasOf ? atlases.get(hit.aliasOf) || hit : hit) : null;
    let atlasName = null;`,
  'atlas alias resolution')

rep('app.js',
  `  const stickers = spec.stickers || (spec.sticker ? [spec.sticker] : []);
  for (const s of stickers) {
    if (!COM.stickerPos[s]) continue;
    const tile = tileLayer({ atlas: 'stickers', pos: COM.stickerPos[s] }, W, H, spec.highContrast);
    drawShaded(ctx, tile, 'voucher', phase);
  }`,
  `  const stickers = spec.stickers || (spec.sticker ? [spec.sticker] : []);
  for (const s of stickers) {
    // a vanilla sticker is a key into the shared stickers sheet; a mod one carries its own sprite
    const ref = (s && typeof s === 'object') ? s : (COM.stickerPos[s] ? { atlas: 'stickers', pos: COM.stickerPos[s] } : null);
    if (!ref) continue;
    const tile = tileLayer({ atlas: ref.atlas, pos: ref.pos }, W, H, spec.highContrast);
    if (!tile) continue;
    drawShaded(ctx, tile, 'voucher', phase);
  }`,
  'sticker sprite ref')

rep('app.js',
  `    case 'Sticker': return { center: baseCenter, front: sampleFront, sticker: it.key };`,
  `    case 'Sticker':
      // mod stickers are not in G.shared_stickers: draw the tile the mod declared
      return { center: baseCenter, front: sampleFront, sticker: (it.source && it.sprite && it.pos) ? { atlas: it.atlas, pos: it.pos } : it.key };`,
  'mod sticker sprite')

rep('app.js',
  ` * spec: {back, center, front, seal, sticker, edition, setShader, soul, soulHologram, highContrast, standalone}`,
  ` * spec: {back, center, front, seal, sticker(s), edition, setShader, soul, soulHologram, highContrast, standalone}
 * sticker is either a vanilla sticker key or {atlas, pos} for a sprite an imported mod declared.`,
  'spec doc')

console.log(fails ? 'FAILURES ' + fails : 'done')
