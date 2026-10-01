/* texture_details.xy is the sprite's position in TILE units, not pixels:
     engine/sprite.lua newQuad(sprite_pos.x*atlas.px, sprite_pos.y*atlas.py, px, py, image_dims)
   and the shaders invert that with
     uv = (texture_coords*image_details - texture_details.xy*texture_details.ba) / texture_details.ba
   Sending pixel offsets pushed uv far outside 0..1, so hologram.fs (which culls the border)
   returned nothing at all. ref.x/ref.w recovers the tile index without changing the API. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const from = `    if (u.texture_details) gl.uniform4f(u.texture_details, ref.x, ref.y, ref.w, ref.h);`
const to = `    // tile units, not pixels — see the note above
    if (u.texture_details) gl.uniform4f(u.texture_details, ref.x / ref.w, ref.y / ref.h, ref.w, ref.h);`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
fs.writeFileSync(F, s)
new Function(s)
console.log('fixed, syntax OK')
