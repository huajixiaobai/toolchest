/* ============================================================================
 * Compile the game's own shaders — vanilla and mod — for WebGL.
 *
 * Balatro's `resources/shaders/*.fs` and a mod's `assets/shaders/*.fs` are
 * LÖVE-flavoured GLSL: `extern` uniforms, `number`, `Image`, `Texel()`, an
 * `effect()` entry point and a `#ifdef VERTEX` block. Steamodded also repairs
 * them for GLSL ES (see lovely/glsl_es_patches/*.toml); the same rules are
 * applied here, so a mod shader that works in game compiles here too.
 *
 * Exposes window.__GLSHADERS__ = { repair, buildFragment, buildVertex,
 *                                  uniformNames, compile, selftest }
 * ==========================================================================*/
(function () {
  'use strict'

  /** Names every Sprite:draw_shader call provides (engine/sprite.lua:96-106). */
  const COMMON_UNIFORMS = [
    'time', 'dissolve', 'texture_details', 'image_details', 'shadow',
    'burn_colour_1', 'burn_colour_2', 'hovering', 'screen_scale', 'mouse_screen_pos',
  ]

  /**
   * Steamodded's GLSL ES repairs, in its own order (repair1 → repair2 → repair3):
   * GLSL ES is strict about int/float mixing, so every literal becomes a float and
   * every `int` declaration becomes a `float`, with the array/varying corner cases
   * cleaned up afterwards.
   */
  function repair (src) {
    let s = src
    // Our own vertex stage replaces LÖVE's. The guard must not contain a numeric literal:
    // the int→float pass below would turn `#if 0` into the illegal `#if 0.`.
    s = s.replace(/#ifdef\s+VERTEX\b/g, '#if defined(DSH_NO_VERTEX)')
    s = s.replace(/defined\s*\(\s*VERTEX\s*\)/g, 'defined(DSH_NO_VERTEX)')

    const lit = /([^\w.]\d+)([^\w.])/g
    s = s.replace(lit, '$1.$2').replace(lit, '$1.$2')
    s = s.replace(/([\s({])int([\s([])/g, '$1 float$2')

    // cleanup: preprocessor comparisons, scientific notation, array indices, float suffixes
    s = s.replace(/(__\w+__\s*[<>]\s*\d+)\./g, '$1')
    s = s.replace(/([\d.]e-?\d+)\./g, '$1')
    s = s.replace(/\[(\d+)\.\]/g, '[$1]')
    s = s.replace(/\[([^[\]]*[^\d.][^[\]]*)\]/g, '[int($1)]')
    s = s.replace(/((?:\d+\.)?\d+)f\b/g, '$1')

    // uniforms: no initialisers, always highp
    s = s.replace(/(extern|uniform)([^=\n]*=.*)/g, '$2')
    s = s.replace(/(extern|uniform)\s+(number|float|vec2|vec3|vec4|mat2|mat3|mat4)/g, '$1 highp $2')
    s = s.replace(/mediump\s+(number|float|vec2|vec3|vec4|mat2|mat3|mat4)/g, 'highp $1')
    return s
  }

  /** Uniform names the shader declares (so callers know what to send). */
  function uniformNames (src) {
    const out = []
    for (const m of src.matchAll(/extern\s+(?:MY_HIGHP_OR_MEDIUMP\s+)?([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)\s*;/g)) out.push(m[2])
    return out
  }

  /** The effect's own vec2 uniform: `extern vec2 foil;` for foil.fs, `mosaic` for a mod shader. */
  function flavourUniform (src) {
    for (const m of src.matchAll(/extern\s+(?:MY_HIGHP_OR_MEDIUMP\s+)?vec2\s+([A-Za-z0-9_]+)\s*;/g)) {
      if (!['mouse_screen_pos'].includes(m[1])) return m[1]
    }
    return null
  }

  function buildVertex (isGL2) {
    const head = isGL2
      ? '#version 300 es\nin vec2 aPos;\nout vec2 vTexCoord;\n'
      : 'attribute vec2 aPos;\nvarying vec2 vTexCoord;\n'
    return head + 'uniform vec4 uUvRect;\n' +
      'void main(){ vec2 t = vec2(aPos.x*0.5+0.5, 0.5-aPos.y*0.5);\n' +
      '  vTexCoord = uUvRect.xy + t*uUvRect.zw;\n' +
      '  gl_Position = vec4(aPos, 0.0, 1.0); }'
  }

  /**
   * Wrap a .fs source so WebGL can compile it: our prelude supplies the LÖVE
   * vocabulary, and main() calls the shader's own effect().
   */
  /** Two of the game's shaders are vertex-only (the tilt effect) and cannot be used as a
   *  fragment stage — they have no effect(). */
  const hasEffect = (src) => /\bvec4\s+effect\s*\(/.test(src)

  function buildFragment (src, isGL2) {
    let body = repair(src)
    if (isGL2) {
      // GLSL ES 3.00 renamed texture2D and reserved gl_FragColor; the effect()
      // parameter is literally called `texture`, which would shadow texture()
      body = body
        .replace(/,\s*Image\s+texture\s*,/, ', Image srcTex,')
        .replace(/Texel\s*\(\s*texture\s*,/g, 'Texel(srcTex,')
        .replace(/\btexture2D\s*\(/g, 'texture(')
        .replace(/\bvarying\b/g, 'in')
    }
    body = body.replace(/\bgl_FragColor\b/g, 'OUT')

    const head = isGL2
      ? [
          '#version 300 es',
          'precision highp float;',
          'in vec2 vTexCoord;',
          'uniform sampler2D tex0;',
          'uniform vec2 uImageDetails;',
          'uniform vec2 uTileOrigin;',
          'out vec4 OUT;',
        ]
      : [
          'precision highp float;',
          'varying vec2 vTexCoord;',
          'uniform sampler2D tex0;',
          'uniform vec2 uImageDetails;',
          'uniform vec2 uTileOrigin;',
          '#define OUT gl_FragColor',
        ]
    const defs = [
      '#define number float',
      '#define Image sampler2D',
      '#define extern uniform',
      isGL2 ? '#define Texel(s, uv) texture(s, uv)' : '#define Texel(s, uv) texture2D(s, uv)',
    ]
    // The screen-space effects (CRT / background / flash / splash) read LÖVE's own
    // love_ScreenSize, which the engine provides to every shader. Declare it here unless
    // the shader already declares it itself (a duplicate declaration would not compile).
    if (/love_ScreenSize/.test(body) && !/uniform[^;\n]*love_ScreenSize\s*;/.test(body)) {
      defs.push('uniform vec2 love_ScreenSize;')
    }
    /* LÖVE hands effect() four things: the tint colour, the texture, the texture coords and
       the *screen* coords of the fragment. We draw one card into a canvas, so the faithful
       equivalent of "screen coords" is the pixel position inside that card — the same units
       texture_details.zw is measured in. uTileOrigin is where this card sits in the sheet,
       so `vTexCoord*image_details - uTileOrigin` lands on (0..cellW, 0..cellH). */
    const tail = 'void main(){ OUT = effect(vec4(1.0), tex0, vTexCoord, vTexCoord*uImageDetails - uTileOrigin); }'
    return head.concat(defs).join('\n') + '\n' + body + '\n' + tail
  }

  /** Compile one shader; returns { program, log } (program is null on failure). */
  function compile (gl, isGL2, src, vertexSource) {
    if (!hasEffect(src)) return { program: null, log: 'not a fragment shader (no effect())', vertexOnly: true }
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, buildFragment(src, isGL2))
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      return { program: null, log: gl.getShaderInfoLog(fs) }
    }
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vertexSource || buildVertex(isGL2))
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      return { program: null, log: 'vertex: ' + gl.getShaderInfoLog(vs) }
    }
    const p = gl.createProgram()
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      return { program: null, log: 'link: ' + gl.getProgramInfoLog(p) }
    }
    return { program: p, log: '' }
  }

  /** Compile a batch and report which ones fail and why (used by the test suite). */
  function selftest (gl, isGL2, sources) {
    const vsrc = buildVertex(isGL2)
    const out = []
    for (const { name, source } of sources) {
      const r = compile(gl, isGL2, source, vsrc)
      out.push({ name, ok: !!r.program, log: r.program ? '' : String(r.log).slice(0, 400) })
    }
    return { isGL2, results: out }
  }

  window.__GLSHADERS__ = { repair, buildFragment, buildVertex, uniformNames, flavourUniform, hasEffect, compile, selftest, COMMON_UNIFORMS }
})();
