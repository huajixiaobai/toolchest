/* Point every shader call site at the real compiled shaders, sampling in atlas space. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

/* --- 1) add a canvas-source shade to the GL layer --- */
rep(`  return {
    gl, IS2, canvas, programs, buf, shade, defineShader, sheetTexture, textures,`,
  `  /**
   * Shade a canvas that is NOT part of a sheet (a composed card, a shader-preview tile).
   * The game never does this, but the shader previews need it; the sheet is the canvas itself.
   */
  function shadeCanvas (key, cv, phase, opts) {
    const pr = programs[key];
    if (!pr) return null;
    opts = opts || {};
    canvas.width = cv.width; canvas.height = cv.height;
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(pr.aPos);
    gl.vertexAttribPointer(pr.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const u = pr.u;
    gl.uniform1i(u.tex0, 0);
    if (u.sample_tex) gl.uniform1i(u.sample_tex, 0);
    if (u.uUvRect) gl.uniform4f(u.uUvRect, 0, 0, 1, 1);
    if (u.uImageDetails) gl.uniform2f(u.uImageDetails, cv.width, cv.height);
    if (u.texture_details) gl.uniform4f(u.texture_details, 0, 0, cv.width, cv.height);
    if (u.image_details) gl.uniform2f(u.image_details, cv.width, cv.height);
    if (u.time) gl.uniform1f(u.time, opts.time !== undefined ? opts.time : phase);
    if (u.dissolve) gl.uniform1f(u.dissolve, opts.dissolve || 0);
    if (u.shadow) gl.uniform1i(u.shadow, opts.shadow ? 1 : 0);
    if (u.hovering) gl.uniform1f(u.hovering, 0);
    if (u.screen_scale) gl.uniform1f(u.screen_scale, cv.width);
    if (u.mouse_screen_pos) gl.uniform2f(u.mouse_screen_pos, 0, 0);
    if (u.love_ScreenSize) gl.uniform2f(u.love_ScreenSize, cv.width, cv.height);
    if (u.burn_colour_1) gl.uniform4f(u.burn_colour_1, 0, 0, 0, 0);
    if (u.burn_colour_2) gl.uniform4f(u.burn_colour_2, 0, 0, 0, 0);
    if (pr.flavour && u[pr.flavour]) gl.uniform2f(u[pr.flavour], phase / 28, phase);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.deleteTexture(tex);
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    out.getContext('2d').drawImage(canvas, 0, 0);
    return out;
  }

  return {
    gl, IS2, canvas, programs, buf, shade, shadeCanvas, defineShader, sheetTexture, textures,`,
  'shadeCanvas')

/* --- 2) the old shims become wrappers over the compiled programs --- */
rep(`function glApply (key, src, w, h, phase, uv) {
  if (!GL || !GL.programs[key]) return null;
  const { gl, canvas, programs, buf } = GL;
  const pr = programs[key];
  canvas.width = w; canvas.height = h;
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.BLEND);
  gl.useProgram(pr.p);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(pr.aPos);
  gl.vertexAttribPointer(pr.aPos, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(pr.tex0, 0);
  gl.uniform2f(pr.tileSize, CARD_W, CARD_H);
  // G.TIMERS.REAL is always > 0 in game; negative.fs branches on that, so never pass
  // a literal 0 even when the animation clock sits at its neutral pose (phase 0).
  const t = Math.max(phase, 1e-4);
  gl.uniform2f(pr.uPhase, 1 + t / 28, t);
  gl.uniform1f(pr.uTime, 0);
  gl.uniform2f(pr.uvOffset, uv ? uv.ox : 0, uv ? uv.oy : 0);
  gl.uniform2f(pr.uvScale, uv ? uv.sx : 1, uv ? uv.sy : 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.deleteTexture(tex);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d').drawImage(canvas, 0, 0);
  return out;
}
/** Atlas-space uv rect of a tile — hologram.fs samples in atlas coordinates. */
function uvRectOf (spec) {
  const a = atlas(spec.atlas);
  if (!a || !spec.pos) return null;
  return { ox: spec.pos.x / a.cols, oy: spec.pos.y / a.rows, sx: 1 / a.cols, sy: 1 / a.rows };
}`,
  `/** Shade a plain canvas (not part of a sheet). Kept for the shader-preview page. */
function glApply (key, src, w, h, phase) {
  if (!GL || !GL.programs[key]) return null;
  return GL.shadeCanvas(key, src, phase);
}
/** Atlas-space uv rect of a tile — only used by the shader preview page now. */
function uvRectOf (spec) {
  const a = atlas(spec.atlas);
  if (!a || !spec.pos) return null;
  return { ox: spec.pos.x / a.cols, oy: spec.pos.y / a.rows, sx: 1 / a.cols, sy: 1 / a.rows };
}`,
  'glApply wrapper')

rep(`/** A black copy of a layer, used for the dissolve shader's shadow pass. */
function silhouette (src) {
  const c = newCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
/** Run a shader over a whole canvas; null when unavailable so callers can skip the pass. */
function shade (cv, key, phase, uv) {
  if (!GL || !GL.programs[key]) return null;
  return glApply(key, cv, cv.width, cv.height, phase, uv);
}
/** Draw a sprite, then draw the same sprite again through a shader on top of it.
 *  This is exactly what Card:draw does: the "effect" passes are extra layers, not
 *  replacements — the card underneath stays fully opaque. */
function drawShaded (ctx, tile, key, phase, uv) {
  ctx.drawImage(tile, 0, 0);
  const over = shade(tile, key, phase, uv);
  if (over) ctx.drawImage(over, 0, 0);
}`,
  `/** Run a shader over a whole canvas; null when unavailable so callers can skip the pass. */
function shade (cv, key, phase) {
  if (!GL || !GL.programs[key]) return null;
  return GL.shadeCanvas(key, cv, phase);
}
/** Draw a sprite, then draw the same sprite again through a shader on top of it.
 *  This is exactly what Card:draw does: the "effect" passes are extra layers, not
 *  replacements — the card underneath stays fully opaque. */
function drawShaded (ctx, spec, W, H, key, phase, opts) {
  const base = tileLayer(spec, W, H);
  ctx.drawImage(base, 0, 0);
  const over = shadeTile(spec, W, H, key, phase, opts);
  if (over) ctx.drawImage(over, 0, 0);
}`,
  'shade/drawShaded')

/* --- 3) compose passes --- */
rep(`  const centre = spec.center ? tileLayer(spec.center, W, H, spec.highContrast) : null;
  const stone = spec.center && spec.center.stoneNoFront;
  const front = (spec.front && !stone) ? tileLayer(spec.front, W, H, spec.highContrast) : null;
  const negative = spec.edition === 'e_negative';
  const gloss = EDITION_SHADER[spec.edition] || null;

  // 1-2) base pass. Negative replaces the normal draw; everything else adds a layer.
  if (centre) ctx.drawImage(negative ? (shade(centre, 'negative', phase) || centre) : centre, 0, 0);
  if (front) ctx.drawImage(negative ? (shade(front, 'negative', phase) || front) : front, 0, 0);

  // 3) Voucher / Booster / Spectral shimmer — centre sprite only
  if (centre && spec.setShader) { const o = shade(centre, spec.setShader, phase); if (o) ctx.drawImage(o, 0, 0); }

  // 4) Foil / Holographic / Polychrome gloss — centre AND front
  if (gloss && !negative) {
    if (centre) { const o = shade(centre, gloss, phase); if (o) ctx.drawImage(o, 0, 0); }
    if (front) { const o = shade(front, gloss, phase); if (o) ctx.drawImage(o, 0, 0); }
  }

  // 5) Negative shine — centre sprite only
  if (negative && centre) { const o = shade(centre, 'negative_shine', phase); if (o) ctx.drawImage(o, 0, 0); }`,
  `  const centre = spec.center ? tileLayer(spec.center, W, H, spec.highContrast) : null;
  const stone = spec.center && spec.center.stoneNoFront;
  const front = (spec.front && !stone) ? tileLayer(spec.front, W, H, spec.highContrast) : null;
  const negative = spec.edition === 'e_negative';
  const gloss = EDITION_SHADER[spec.edition] || null;
  const drawShadedTile = (spec2, key, opts) => {
    if (!spec2) return;
    const base = tileLayer(spec2, W, H, spec.highContrast);
    if (negative && key !== 'negative') ctx.drawImage(base, 0, 0);
    const over = shadeTile(spec2, W, H, key, phase, opts);
    if (over) ctx.drawImage(over, 0, 0);
  };

  // 1-2) base pass. Negative replaces the normal draw; everything else adds a layer.
  if (spec.center) {
    if (negative) {
      const o = shadeTile(spec.center, W, H, 'negative', phase);
      ctx.drawImage(o || centre, 0, 0);
    } else ctx.drawImage(centre, 0, 0);
  }
  if (spec.front && !stone) {
    if (negative) {
      const o = shadeTile(spec.front, W, H, 'negative', phase);
      ctx.drawImage(o || front, 0, 0);
    } else ctx.drawImage(front, 0, 0);
  }

  // 3) Voucher / Booster / Spectral shimmer — centre sprite only
  if (spec.center && spec.setShader) drawShadedTile(spec.center, spec.setShader);

  // 4) Foil / Holographic / Polychrome gloss — centre AND front
  if (gloss && !negative) {
    drawShadedTile(spec.center, gloss);
    if (spec.front && !stone) drawShadedTile(spec.front, gloss);
  }

  // 5) Negative shine — centre sprite only
  if (negative && spec.center) drawShadedTile(spec.center, 'negative_shine');`,
  'compose base passes')

rep(`  const sealRef = (spec.seal && typeof spec.seal === 'object') ? spec.seal
    : (COM.sealPos[spec.seal] ? { atlas: 'centers', pos: COM.sealPos[spec.seal] } : null);
  if (sealRef && atlas(sealRef.atlas)) {
    const tile = tileLayer(sealRef, W, H, spec.highContrast);
    if (tile) {
      if (spec.seal === 'Gold') drawShaded(ctx, tile, 'voucher', phase);
      else ctx.drawImage(tile, 0, 0);
    }
  }`,
  `  const sealRef = (spec.seal && typeof spec.seal === 'object') ? spec.seal
    : (COM.sealPos[spec.seal] ? { atlas: 'centers', pos: COM.sealPos[spec.seal] } : null);
  if (sealRef && atlas(sealRef.atlas)) {
    if (spec.seal === 'Gold') drawShaded(ctx, sealRef, W, H, 'voucher', phase);
    else ctx.drawImage(tileLayer(sealRef, W, H, spec.highContrast), 0, 0);
  }`,
  'seal pass')

rep(`  const stickers = spec.stickers || (spec.sticker ? [spec.sticker] : []);
  for (const s of stickers) {
    // a vanilla sticker is a key into the shared stickers sheet; a mod one carries its own sprite
    const ref = (s && typeof s === 'object') ? s : (COM.stickerPos[s] ? { atlas: 'stickers', pos: COM.stickerPos[s] } : null);
    if (!ref) continue;
    const tile = tileLayer({ atlas: ref.atlas, pos: ref.pos }, W, H, spec.highContrast);
    if (!tile) continue;
    drawShaded(ctx, tile, 'voucher', phase);
  }`,
  `  const stickers = spec.stickers || (spec.sticker ? [spec.sticker] : []);
  for (const s of stickers) {
    // a vanilla sticker is a key into the shared stickers sheet; a mod one carries its own sprite
    const ref = (s && typeof s === 'object')
      ? { atlas: s.atlas, pos: s.pos }
      : (COM.stickerPos[s] ? { atlas: 'stickers', pos: COM.stickerPos[s] } : null);
    if (!ref || !atlas(ref.atlas)) continue;
    drawShaded(ctx, ref, W, H, 'voucher', phase);
  }`,
  'sticker pass')

rep(`    let layer = tileLayer(spec.soul, W, H, spec.highContrast);
    if (spec.soulHologram) layer = shade(layer, 'hologram', phase, uvRectOf(spec.soul)) || layer;`,
  `    // Hologram's floating art is drawn through hologram.fs, and it samples the whole sheet,
    // so it must be shaded in atlas space (that is what shadeTile does).
    let layer = tileLayer(spec.soul, W, H, spec.highContrast);
    if (spec.soulHologram) layer = shadeTile(spec.soul, W, H, 'hologram', phase) || layer;`,
  'hologram float')

rep(`    if (!spec.soulHologram && !spec.soulNoShadow) {
      const WORLD_H = 2.7512; // G.CARD_H, i.e. the card's height in world units
      const dy = (0.1 + 0.03 * Math.sin(1.8 * t)) * (H / WORLD_H);
      place(silhouette(layer), 0, dy, 0.3);
    }`,
  `    if (!spec.soulHologram && !spec.soulNoShadow) {
      const WORLD_H = 2.7512; // G.CARD_H, i.e. the card's height in world units
      const dy = (0.1 + 0.03 * Math.sin(1.8 * t)) * (H / WORLD_H);
      // dissolve.fs with shadow = true emits the black 30%-alpha silhouette itself
      const sil = shadeTile(spec.soul, W, H, 'dissolve', phase, { shadow: true });
      place(sil || layer, 0, dy, sil ? 1 : 0.3);
    }`,
  'shadow pass')

/* --- 4) shader preview page --- */
rep(`  if (name === 'hologram') {
    const sp = { atlas: 'Joker', pos: { x: 2, y: 9 } };
    const t = tileLayer(sp, CARD_W * 2, CARD_H * 2);
    return shade(t, 'hologram', phase, uvRectOf(sp)) || t;
  }`,
  `  if (name === 'hologram') {
    const sp = { atlas: 'Joker', pos: { x: 2, y: 9 } };
    return shadeTile(sp, CARD_W * 2, CARD_H * 2, 'hologram', phase) || tileLayer(sp, CARD_W * 2, CARD_H * 2);
  }`,
  'shaderPreview hologram')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES ' + fails : 'done, syntax OK')
