/* Slimming pass, no behaviour change:
     · drop three declarations nothing calls
     · wire refinePalette into the GIF palette (it was added but never called)
     · merge the duplicated GL setup shared by shade() and shadeCanvas() */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n'
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`function tileReady (r) { return r ? IMG_READY[r.file] : Promise.resolve(null); }
`, '', 'drop tileReady')

rep(`    else palette = medianCutPalette(list, maxColors);`,
  `    else {
      palette = medianCutPalette(list, maxColors);
      // k-means polish: the median-cut boxes are axis-aligned, this pulls the entries to the
      // real colour clusters
      if (refine !== false && palette.length > 2) palette = refinePalette(list, palette, 4);
    }`,
  'wire refinePalette')

/* the two shade variants shared ~25 lines of identical WebGL setup */
rep(`  function shade (key, ref, W, H, phase, opts) {
    const pr = programs[key];
    if (!pr) return null;
    const sheet = sheetTexture(ref.file);
    if (!sheet) return null;
    opts = opts || {};
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(pr.aPos);
    gl.vertexAttribPointer(pr.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sheet.tex);
    gl.uniform1i(pr.u.tex0, 0);
    if (pr.u.sample_tex) gl.uniform1i(pr.u.sample_tex, 0);
    const u = pr.u;`,
  `  /** Shared per-draw setup: program, buffer, viewport, texture unit. */
  function begin (pr, W, H) {
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(pr.aPos);
    gl.vertexAttribPointer(pr.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(pr.u.tex0, 0);
    if (pr.u.sample_tex) gl.uniform1i(pr.u.sample_tex, 0);
  }
  /** The uniforms every game shader receives (engine/sprite.lua:96-106). */
  function commonUniforms (pr, phase, opts, w, h) {
    const u = pr.u;
    if (u.time) gl.uniform1f(u.time, opts.time !== undefined ? opts.time : phase);
    if (u.dissolve) gl.uniform1f(u.dissolve, opts.dissolve || 0);
    if (u.shadow) gl.uniform1i(u.shadow, opts.shadow ? 1 : 0);
    if (u.hovering) gl.uniform1f(u.hovering, 0);
    if (u.screen_scale) gl.uniform1f(u.screen_scale, w);
    if (u.mouse_screen_pos) gl.uniform2f(u.mouse_screen_pos, 0, 0);
    if (u.love_ScreenSize) gl.uniform2f(u.love_ScreenSize, w, h);
    if (u.burn_colour_1) gl.uniform4f(u.burn_colour_1, 0, 0, 0, 0);
    if (u.burn_colour_2) gl.uniform4f(u.burn_colour_2, 0, 0, 0, 0);
    // the effect's own vec2 = send_to_shader: {REAL/28, REAL}
    if (pr.flavour && u[pr.flavour]) gl.uniform2f(u[pr.flavour], phase / 28, phase);
  }
  /** Copy the result off the GL canvas. */
  function finish (W, H) {
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    out.getContext('2d').drawImage(canvas, 0, 0);
    return out;
  }

  function shade (key, ref, W, H, phase, opts) {
    const pr = programs[key];
    if (!pr) return null;
    const sheet = sheetTexture(ref.file);
    if (!sheet) return null;
    opts = opts || {};
    begin(pr, W, H);
    gl.bindTexture(gl.TEXTURE_2D, sheet.tex);
    const u = pr.u;`,
  'shade shared setup')

rep(`    // tile units, not pixels — see the note above
    if (u.texture_details) gl.uniform4f(u.texture_details, ref.x / ref.w, ref.y / ref.h, ref.w, ref.h);
    if (u.image_details) gl.uniform2f(u.image_details, sheet.w, sheet.h);
    if (u.time) gl.uniform1f(u.time, opts.time !== undefined ? opts.time : phase);
    if (u.dissolve) gl.uniform1f(u.dissolve, opts.dissolve || 0);
    if (u.shadow) gl.uniform1i(u.shadow, opts.shadow ? 1 : 0);
    if (u.hovering) gl.uniform1f(u.hovering, 0);
    if (u.screen_scale) gl.uniform1f(u.screen_scale, ref.w);
    if (u.mouse_screen_pos) gl.uniform2f(u.mouse_screen_pos, 0, 0);
    if (u.love_ScreenSize) gl.uniform2f(u.love_ScreenSize, W, H);
    if (u.burn_colour_1) gl.uniform4f(u.burn_colour_1, 0, 0, 0, 0);
    if (u.burn_colour_2) gl.uniform4f(u.burn_colour_2, 0, 0, 0, 0);
    // the effect's own vec2 = send_to_shader: {REAL/28, REAL}
    if (pr.flavour && u[pr.flavour]) gl.uniform2f(u[pr.flavour], phase / 28, phase);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    out.getContext('2d').drawImage(canvas, 0, 0);
    return out;
  }`,
  `    // tile units, not pixels — see the note above
    if (u.texture_details) gl.uniform4f(u.texture_details, ref.x / ref.w, ref.y / ref.h, ref.w, ref.h);
    if (u.image_details) gl.uniform2f(u.image_details, sheet.w, sheet.h);
    commonUniforms(pr, phase, opts, ref.w, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return finish(W, H);
  }`,
  'shade tail')

rep(`    const pr = programs[key];
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
    const tex = gl.createTexture();`,
  `    const pr = programs[key];
    if (!pr) return null;
    opts = opts || {};
    const W = cv.width; const H = cv.height;
    begin(pr, W, H);
    const tex = gl.createTexture();`,
  'shadeCanvas head')

rep(`    const u = pr.u;
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
  }`,
  `    const u = pr.u;
    if (u.uUvRect) gl.uniform4f(u.uUvRect, 0, 0, 1, 1);
    if (u.uImageDetails) gl.uniform2f(u.uImageDetails, W, H);
    if (u.texture_details) gl.uniform4f(u.texture_details, 0, 0, W, H);
    if (u.image_details) gl.uniform2f(u.image_details, W, H);
    commonUniforms(pr, phase, opts, W, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.deleteTexture(tex);
    return finish(W, H);
  }`,
  'shadeCanvas tail')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES ' + fails : 'done, syntax OK')
