/* Replace the hand-ported GLSL bodies with the game's real shaders, compiled through
   glshaders.js, and sample them in atlas space exactly like Sprite:draw_shader does. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0

const lines = s.split(/\r?\n/)
const start = lines.findIndex((l) => /^const GL = \(\(\) => \{/.test(l))
let end = start
while (!/^\}\)\(\);\s*$/.test(lines[end])) end++
console.log('replacing GL IIFE lines', start + 1, '-', end + 1)

const NEW = `/* ------------------------------------------------- game shaders on WebGL
 * The .fs files the game ships (and the ones a mod brings) are LÖVE-flavoured GLSL.
 * glshaders.js translates them, so the effects here are the real thing rather than a
 * re-implementation — and any mod shader compiles along with them.
 *
 * A sprite draw in LÖVE hands the shader:
 *   time            a per-card constant (engine/sprite.lua:100)
 *   texture_details {x, y, w, h} of the sprite's rect inside its sheet, in pixels
 *   image_details   the sheet's pixel size
 *   shadow          true only for the drop-shadow pass
 *   dissolve        |card.dissolve| — 0 for a still card
 *   <shader name>   {G.TIMERS.REAL/28, G.TIMERS.REAL}   <- the animation clock
 * so that is exactly what shade() sends.
 * ------------------------------------------------------------------------- */
const GL = (() => {
  const canvas = document.createElement('canvas');
  const attrs = { premultipliedAlpha: false, preserveDrawingBuffer: true, alpha: true, antialias: false };
  const gl2 = canvas.getContext('webgl2', attrs);
  const gl = gl2 || canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
  if (!gl) return null;
  const LIB = window.__GLSHADERS__;
  const IS2 = !!gl2;
  const VS = LIB.buildVertex(IS2);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const programs = {};        // key -> { p, aPos, u:{}, flavour }
  const textures = new Map(); // sheet file -> { tex, w, h }

  /** Compile one shader and cache the uniform locations we send. */
  function defineShader (key, source) {
    if (!LIB.hasEffect(source)) return null;
    const res = LIB.compile(gl, IS2, source, VS);
    if (!res.program) { console.warn('[Balatro 素材图鉴] 着色器 ' + key + ' 编译失败：' + res.log); return null }
    const p = res.program;
    const u = {};
    const names = LIB.uniformNames(source).concat(['sample_tex', 'tex0', 'uUvRect', 'uImageDetails']);
    names.push('love_ScreenSize');
    for (const n of names) {
      const loc = gl.getUniformLocation(p, n);
      if (loc !== null) u[n] = loc;
    }
    const pr = {
      p,
      aPos: gl.getAttribLocation(p, 'aPos'),
      u,
      flavour: LIB.flavourUniform(source),
      key,
      source,
    };
    programs[key] = pr;
    return pr;
  }

  /* every vanilla shader that has a fragment stage; skew/vortex are vertex-only (tilt) */
  let compiled = 0;
  for (const sh of D.shaders) if (defineShader(sh.name, sh.source)) compiled++;

  /** Upload (once) and cache a sheet as a GL texture. */
  function sheetTexture (file) {
    const im = img(file);
    if (!im || !im.complete || !im.naturalWidth) return null;
    let rec = textures.get(file);
    if (rec && rec.w === im.naturalWidth && rec.h === im.naturalHeight) return rec;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    rec = { tex, w: im.naturalWidth, h: im.naturalHeight };
    textures.set(file, rec);
    return rec;
  }

  /**
   * Run a shader over one rect of one sheet and return it on a fresh 2D canvas.
   * \`ref\` is { file, x, y, w, h } in sheet pixels — the same thing Sprite:get_pos_pixel
   * hands the game's shaders, so the effect lands on the same pixels it would in game.
   */
  function shade (key, ref, W, H, phase, opts) {
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
    const u = pr.u;
    if (u.uUvRect) gl.uniform4f(u.uUvRect, ref.x / sheet.w, ref.y / sheet.h, ref.w / sheet.w, ref.h / sheet.h);
    if (u.uImageDetails) gl.uniform2f(u.uImageDetails, sheet.w, sheet.h);
    if (u.texture_details) gl.uniform4f(u.texture_details, ref.x, ref.y, ref.w, ref.h);
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
  }

  return {
    gl, IS2, canvas, programs, buf, shade, defineShader, sheetTexture, textures,
    get count () { return compiled },
    dropTextures () { for (const r of textures.values()) gl.deleteTexture(r.tex); textures.clear() },
    names () { return Object.keys(programs) },
  };
})();

/** Shade one atlas tile: the atlas-space rect a sprite draw would use. */
function shadeTile (spec, W, H, key, phase, opts) {
  if (!GL || !spec || !spec.pos) return null;
  const r = tileRect(spec.atlas, spec.pos);
  if (!r) return null;
  return GL.shade(key, { file: r.file, x: r.x, y: r.y, w: r.w, h: r.h }, W, H, phase, opts);
}`

const out = lines.slice(0, start).concat(NEW.split('\n'), lines.slice(end + 1))
fs.writeFileSync(F, out.join(NL))
console.log('GL layer replaced')
new Function(fs.readFileSync(F, 'utf8'))
console.log('syntax OK')
