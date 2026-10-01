window.__APP_BUILD__ = "28c4b06d";
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

;
/* ============================================================================
 * Balatro mod importer — runs entirely in the page.
 *
 * A Steamodded mod is just a folder:
 *   <Mod>/manifest.json, <id>.lua, assets/{1x,2x}/*.png, localization/*.lua
 * and its data is produced by declaring plain tables:
 *   SMODS.Atlas { key='foo', path='foo.png', px=71, py=95 }
 *   SMODS.Joker { key='bar', atlas='foo', pos={x=0,y=0}, rarity=2, ... }
 *
 * Steamodded literally does `load(read(main_file))()`, so fully dynamic mods can
 * only be read by running Lua. Everything that is written as a literal table —
 * which is most declarations — is read here by parsing, with no dependencies.
 * ==========================================================================*/
'use strict';
(function () {
const LUA = window.__LUA__;
/* vanilla atlas keys, so a mod object may point at a base-game sheet */
const VANILLA_ATLAS = (window.__BALATRO_DATA__ && window.__BALATRO_DATA__.atlases) || {};

/* -------------------------------------------------------------- archives */
async function inflateRaw (u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('这个浏览器不支持 DecompressionStream，无法解压 zip');
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read a zip into a Map<path, Uint8Array>. Handles store + deflate, and ZIP64. */
async function readZip (arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 70000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('不是有效的 zip 文件');
  let count = dv.getUint16(eocd + 10, true);
  let cdOff = dv.getUint32(eocd + 16, true);
  if (cdOff === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20;
    if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
      const z = Number(dv.getBigUint64(loc + 8, true));
      if (dv.getUint32(z, true) === 0x06064b50) {
        count = Number(dv.getBigUint64(z + 32, true));
        cdOff = Number(dv.getBigUint64(z + 48, true));
      }
    }
  }
  const out = new Map();
  let p = cdOff;
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    let csize = dv.getUint32(p + 20, true);
    let usize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const cmtLen = dv.getUint16(p + 32, true);
    let lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen));
    if (usize === 0xffffffff || csize === 0xffffffff || lho === 0xffffffff) {
      let e = p + 46 + nameLen;
      const end = e + extraLen;
      while (e + 4 <= end) {
        const id = dv.getUint16(e, true); const sz = dv.getUint16(e + 2, true);
        if (id === 0x0001) {
          let q = e + 4;
          if (usize === 0xffffffff) { usize = Number(dv.getBigUint64(q, true)); q += 8 }
          if (csize === 0xffffffff) { csize = Number(dv.getBigUint64(q, true)); q += 8 }
          if (lho === 0xffffffff) { lho = Number(dv.getBigUint64(q, true)); q += 8 }
          break;
        }
        e += 4 + sz;
      }
    }
    p += 46 + nameLen + extraLen + cmtLen;
    if (name.endsWith('/')) continue;
    try {
      const lnameLen = dv.getUint16(lho + 26, true);
      const lextraLen = dv.getUint16(lho + 28, true);
      const start = lho + 30 + lnameLen + lextraLen;
      const raw = u8.subarray(start, start + csize);
      out.set(name, method === 0 ? new Uint8Array(raw) : await inflateRaw(raw));
    } catch (e) {
      out.set('__error__' + name, new TextEncoder().encode(String(e.message)));
    }
  }
  return out;
}

/** Read a <input webkitdirectory> / drag-dropped folder into the same Map shape. */
async function readFileList (fileList) {
  const out = new Map();
  for (const f of fileList) {
    const rel = f.__rel || f.webkitRelativePath || f.name;
    out.set(rel, new Uint8Array(await f.arrayBuffer()));
  }
  return out;
}

/* ------------------------------------------------------------ assembling */
const dec = (u8) => new TextDecoder('utf-8').decode(u8);

/** Some packs wrap everything in one top folder; find where manifest.json lives. */
const dirOf = (p) => p.replace(/[^/]*$/, '').replace(/\/$/, '')

/** A file may serve as this mod's manifest if it is manifest.json or a root-level .json. */
function isManifestPath (p) {
  if (!/\.json$/i.test(p)) return false
  if (/(^|\/)manifest\.json$/i.test(p)) return true
  return p.split('/').length <= 2
}

function looksLikeManifest (text) {
  try {
    const j = JSON.parse(text)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return false
    // a Steamodded manifest always names itself and points at an entry file
    return !!(j.id || j.name) && !!(j.main_file || j.version_number || j.version || j.prefix)
  } catch { return false }
}

/**
 * Some packs wrap everything in one top folder. GitHub's "Download ZIP" is one of those, and it
 * names the manifest after the mod (Cryptid.json), so any plausible manifest is accepted.
 */
function findRoot (files) {
  let best = null
  for (const p of files.keys()) {
    if (!isManifestPath(p)) continue
    if (!looksLikeManifest(dec(files.get(p)))) continue
    const dir = dirOf(p)
    if (best === null || dir.length < best.length) best = dir
  }
  if (best !== null) return best
  // no manifest at all: the shallowest folder that directly holds lua files is the mod root
  let pick = ''
  let pickDepth = Infinity
  for (const p of files.keys()) {
    if (!/\.lua$/i.test(p)) continue
    const dir = dirOf(p)
    const d = dir === '' ? 0 : dir.split('/').length
    if (d < pickDepth) { pickDepth = d; pick = dir }
  }
  return pick
}

function reRoot (files, root) {
  if (!root) return files;
  const out = new Map();
  const pre = root + '/';
  for (const [k, v] of files) if (k.startsWith(pre)) out.set(k.slice(pre.length), v);
  return out;
}

const firstString = (v) => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    if (v.expr) { const m = /['"]([^'"]+)['"]/.exec(v.expr); return m ? m[1] : null }
    for (const k of ['default', 'en-us', 'en_US', 'zh_CN']) if (typeof v[k] === 'string') return v[k];
    for (const k of Object.keys(v)) if (typeof v[k] === 'string') return v[k];
  }
  return null;
};

/** A declaration is only usable if its key is a literal string. */
function declKey (t) {
  const k = t && t.key;
  return typeof k === 'string' ? k : null;
}

/** Try the several key spellings SMODS may end up with. */
function keyCandidates (key, prefix, classPrefix) {
  // order matters: the LAST entry is the key the game really ends up with
  const out = [key];
  if (prefix) {
    out.push(prefix + '_' + key);
    if (classPrefix) { out.push(classPrefix + '_' + key); out.push(classPrefix + '_' + prefix + '_' + key) }
  }
  return [...new Set(out)];
}

/* SMODS class -> the `set` value the game uses (this is also the localization table name) */
const SET_OF = {
  Joker: 'Joker', Consumable: null, Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral',
  Voucher: 'Voucher', Back: 'Back', Booster: 'Booster',
  Enhancement: 'Enhanced', Edition: 'Edition', Seal: 'Seal', Sticker: 'Sticker',
  Tag: 'Tag', Blind: 'Blind', Stake: 'Stake', Challenge: 'Challenge',
  PokerHand: 'PokerHand', DeckSkin: 'DeckSkin',
  Sleeve: 'Sleeve',   // Cryptid / CardSleeves: a deck sleeve, its own collection tab
};
/* where the viewer's category differs from the game's set name */
const CAT_OF = { Back: 'Deck', Enhanced: 'Enhancement' };
/* class_prefix exactly as declared on each SMODS class (no prefix where SMODS has none) */
const CLASS_PREFIX = {
  Joker: 'j', Consumable: 'c', Tarot: 'c', Planet: 'c', Spectral: 'c', Voucher: 'v',
  Booster: 'p', Back: 'b', Tag: 'tag', Stake: 'stake', Enhancement: 'm', Edition: 'e',
  Challenge: 'c', Blind: 'bl', Sleeve: 'sleeve',
};
/* atlas a class falls back to when the object declares none */
const DEFAULT_ATLAS = {
  Joker: 'Joker', Consumable: 'Tarot', Tarot: 'Tarot', Planet: 'Planet', Spectral: 'Spectral',
  Voucher: 'Voucher', Booster: 'Booster', Back: 'centers', Enhancement: 'centers',
  Edition: 'Joker', Seal: 'centers', Sticker: 'stickers', Tag: 'tags', Stake: 'chips', Blind: 'blind_chips',
};
/* classes whose SMODS definition ships pos = {x=0,y=0} */
const POS_DEFAULT = new Set([
  'Joker', 'Consumable', 'Tarot', 'Planet', 'Spectral', 'Voucher', 'Back', 'Booster',
  'Tag', 'Sticker', 'Enhancement', 'Edition', 'Seal', 'Stake', 'Blind', 'Achievement',
]);

/**
 * Parse one mod. `files` is a Map<path, Uint8Array> relative to the archive/folder.
 * Returns { manifest, id, prefix, atlases, items, types, warnings, stats }.
 */
function parseMod (files, fallbackName) {
  const warnings = [];
  const stats = { files: files.size, decls: 0, parsed: 0, skipped: 0, dynamic: 0, atlases: 0, items: 0, images: 0, locEntries: 0, bytes: 0 };
  const root = findRoot(files);
  const rel = reRoot(files, root);

  // bookkeeping for the report: things this parser had to guess or could not place
  const implicitPos = [];   // objects that fall back to SMODS' pos = {x=0,y=0}
  const implicitAtlas = []; // objects with no atlas at all
  const missingAtlas = [];  // objects naming an atlas that is not in the mod nor in the base game
  const inferredAtlas = []; // atlases found by file name instead of at the declared path
  const unknownTypes = {};  // declarations of classes that have no card art (Shader, Sound, ...)


  // ---- manifest
  let manifest = {};
  let manifestPath = null;
  for (const p of rel.keys()) {
    if (!isManifestPath(p) || p.includes('/')) continue;
    if (looksLikeManifest(dec(rel.get(p)))) { manifestPath = p; break }
  }
  if (!manifestPath) {
    for (const p of rel.keys()) {
      if (!/\.json$/i.test(p) || !looksLikeManifest(dec(rel.get(p)))) continue;
      manifestPath = p; break
    }
  }
  if (manifestPath) {
    try {
      manifest = JSON.parse(dec(rel.get(manifestPath)));
      if (manifestPath !== 'manifest.json') warnings.push('mod 的元数据文件叫 ' + manifestPath + '，已当作 manifest.json 读取');
    } catch (e) { warnings.push(manifestPath + ' 解析失败：' + e.message) }
  } else warnings.push('没有找到 manifest.json，已按目录名 / 文件名推断 mod 信息');

  const id = manifest.id || manifest.name || root.split('/').pop() || fallbackName || 'mod';
  const prefix = manifest.prefix || String(id).toLowerCase().slice(0, 4);

  // ---- main lua
  const luaFiles = [...rel.keys()].filter((k) => k.toLowerCase().endsWith('.lua') && !k.includes('/'));
  const candidates = [manifest.main_file, id + '.lua', 'main.lua', String(id).toLowerCase() + '.lua'].filter(Boolean);
  let mainPath = candidates.find((c) => rel.has(c)) || luaFiles[0];
  if (!mainPath) {
    warnings.push('没有找到入口 Lua 文件');
    mainPath = null;
  }

  // ---- declarations
  const decls = [];
  const srcOf = new Map();
  const allLua = [...rel.keys()].filter((k) => k.toLowerCase().endsWith('.lua'));
  for (const p of allLua) {
    const src = dec(rel.get(p));
    srcOf.set(p, src);
    let d = [];
    try {
      d = LUA.extractDecls(src);
      // mods built on Cryptid declare content as plain tables carrying `object_type`
      if (LUA.extractItemTables) d = d.concat(LUA.extractItemTables(src));
    } catch (e) { warnings.push(p + ' 解析失败：' + e.message) }
    for (const x of d) { x.file = p; decls.push(x) }
  }
  stats.decls = decls.length;

  // ---- atlases declared by the mod
  const atlases = new Map(); // key -> {key, path, px, py, file(path in mod), bytes}
  for (const d of decls) {
    if (d.type !== 'Atlas' || !d.table) continue;
    const k = declKey(d.table);
    const path = firstString(d.table.path);
    const px = Number(d.table.px);
    const py = Number(d.table.py);
    if (!k || !path || !px || !py) { stats.skipped++; continue }
    let found = ['2x', '1x'].map((s) => ({ s, p: 'assets/' + s + '/' + path })).find((c) => rel.has(c.p));
    if (!found) {
      // not where it was declared — some packs are flat, or keep art in their own folder, so
      // fall back to the declared file name and prefer a 2x copy if there is one
      const base = String(path).split('/').pop().toLowerCase();
      const cand = [...rel.keys()].filter((f) => f.toLowerCase().split('/').pop() === base && /\.(png|jpe?g|webp)$/i.test(f));
      const pick = cand.sort((a, b) => (/(^|\/)2x\//i.test(b) ? 1 : 0) - (/(^|\/)2x\//i.test(a) ? 1 : 0))[0];
      if (pick) {
        found = { s: /(^|\/)1x\//i.test(pick) ? '1x' : '2x', p: pick, inferred: true };
        inferredAtlas.push(k + ' → ' + pick);
      }
    }
    if (!found) { warnings.push(`图集 ${k} 的贴图 assets/1x|2x/${path} 不在包内`); stats.skipped++; continue }
    atlases.set(k, {
      key: k, path, px, py, file: found.p,
      // a path that no longer says 1x/2x has to be guessed: sprite sheets are 2x by convention
      scale: found.s === '2x' ? 2 : 1,
      inferred: !!found.inferred,
      bytes: rel.get(found.p),
    });
    stats.atlases++;
  }
  // every atlas key also gets the mod prefix in SMODS
  for (const [k, v] of [...atlases]) {
    const pk = prefix + '_' + k;
    if (!atlases.has(pk)) atlases.set(pk, Object.assign({}, v, { key: pk, aliasOf: k }));
  }

  // ---- shaders: SMODS reads <mod>/assets/shaders/<path> for every SMODS.Shader object
  const shaders = [];
  const shaderFiles = [...rel.keys()].filter((k) => /\.fs$/i.test(k));
  for (const d of decls) {
    if (d.type !== 'Shader' || !d.table) continue;
    const k = declKey(d.table);
    const p = firstString(d.table.path);
    if (!k || !p) continue;
    const hit = ['assets/shaders/', 'assets/', ''].map((pre) => pre + p).find((f) => rel.has(f));
    if (!hit) { warnings.push('着色器 ' + k + ' 的文件 ' + p + ' 不在包内'); continue }
    shaders.push({ key: k, path: hit, source: dec(rel.get(hit)) });
  }
  // any other .fs in assets/shaders is pickable by file name too
  for (const f of shaderFiles) {
    if (shaders.some((s) => s.path === f)) continue;
    if (!/(^|\/)assets\/shaders\//i.test(f)) continue;
    shaders.push({ key: f.split('/').pop().replace(/\.fs$/i, ''), path: f, source: dec(rel.get(f)) });
  }
  stats.shaders = shaders.length;

  // ---- localization (same format as vanilla)
  const loc = {}; // locale -> { descriptions: {...} }
  for (const p of [...rel.keys()]) {
    if (!/\.lua$/i.test(p)) continue;
    const named = /^localization\/(.+?)\.lua$/i.exec(p);
    // a pack whose folders were lost still names its localization files after the locale;
    // accept those only when the file really returns a descriptions table
    const bare = named ? null : /^([A-Za-z]{2}(?:[-_][A-Za-z]{2,4})?)\.lua$/i.exec(p.split('/').pop());
    const m = named || bare;
    if (!m) continue;
    try {
      const t = LUA.resolve(LUA.parseLua(dec(rel.get(p))));
      if (!named && !(t && t.descriptions)) continue;
      loc[m[1]] = t && t.descriptions ? t : { descriptions: t };
    } catch (e) { warnings.push('本地化 ' + p + ' 解析失败：' + e.message) }
  }
  for (const l of Object.values(loc)) for (const s of Object.values(l.descriptions || {})) stats.locEntries += Object.keys(s || {}).length;

  // en-us first: it is the reference locale, and the parsed `name` is only a fallback anyway
  const locOrder = Object.keys(loc).sort((a, b) => {
    const rank = (c) => (c === 'en-us' ? 0 : c === 'zh_CN' ? 1 : 2);
    return rank(a) - rank(b)
  });

  const locLookup = (setName, key, localeList) => {
    for (const locale of localeList) {
      const d = loc[locale] && loc[locale].descriptions;
      if (!d) continue;
      const set = d[setName];
      if (!set) continue;
      for (const cand of key) if (set[cand]) return set[cand];
    }
    return null;
  };

  // ---- consumable / object types (a mod can create whole new card types)
  const types = new Map();
  for (const d of decls) {
    if (d.type !== 'ConsumableType' && d.type !== 'ObjectType') continue;
    const k = declKey(d.table);
    if (!k) { stats.dynamic++; continue }
    types.set(k, {
      key: k, kind: d.type,
      primary: d.table.primary_colour, secondary: d.table.secondary_colour,
      rows: d.table.collection_rows, file: d.file,
    });
    // ConsumableType / ObjectType carry prefix_config.key = false: their keys are never prefixed
  }

  // ---- entries
  const items = [];
  for (const d of decls) {
    const setBase = SET_OF[d.type];
    if (setBase === undefined) {
      // Shader / Sound / Event / Achievement and friends carry no card art
      unknownTypes[d.type] = (unknownTypes[d.type] || 0) + 1;
      stats.dynamic++;
      continue
    }
    const t = d.table;
    if (!t) { stats.dynamic++; continue }
    const key = declKey(t);
    if (!key) { stats.dynamic++; continue }
    const cls = CLASS_PREFIX[d.type] || null;
    // prefix_config.key = false means the object keeps the key exactly as written
    const noKeyPrefix = !!(t.prefix_config && t.prefix_config.key === false);
    const cands = noKeyPrefix ? [key] : keyCandidates(key, prefix, cls);
    const fullKey = cands[cands.length - 1];
    const set = d.type === 'Consumable' || ['Tarot', 'Planet', 'Spectral'].includes(d.type)
      ? (typeof t.set === 'string' ? t.set : (d.type === 'Consumable' ? 'Tarot' : d.type))
      : setBase;
    const cat = CAT_OF[set] || set;
    // atlas: the one the mod ships, else a vanilla sheet it explicitly names, else nothing.
    // SMODS prefixes `atlas` with the mod prefix too, so every spelling has to be tried.
    const declaredAtlas = typeof t.atlas === 'string' ? t.atlas : null;
    const atlasKey = declaredAtlas || (DEFAULT_ATLAS[d.type] || 'centers');
    const atlasCands = keyCandidates(atlasKey, prefix, null);
    if (atlasKey.startsWith(prefix + '_')) atlasCands.push(atlasKey.slice(prefix.length + 1));
    const hit = atlasCands.map((a) => atlases.get(a)).find(Boolean) || null;
    // a prefixed spelling maps onto the same image as the atlas the mod declared
    const atlas = hit ? (hit.aliasOf ? atlases.get(hit.aliasOf) || hit : hit) : null;
    let atlasName = null;
    if (atlas) atlasName = atlas.key;
    else if (declaredAtlas && VANILLA_ATLAS[declaredAtlas]) atlasName = declaredAtlas;
    else (declaredAtlas ? missingAtlas : implicitAtlas).push({ id: fullKey, cat, declared: declaredAtlas || null, want: atlasKey });
    const pos = (t.pos && typeof t.pos === 'object' && (typeof t.pos.x === 'number' || typeof t.pos.y === 'number'))
      ? { x: Number(t.pos.x) || 0, y: Number(t.pos.y) || 0 }
      : (POS_DEFAULT.has(d.type) ? (implicitPos.push(fullKey), { x: 0, y: 0 }) : null);
    const locEntry = locLookup(set, cands, locOrder) || locLookup('Joker', cands, locOrder) || locLookup('Other', cands, locOrder);
    const inline = t.loc_txt && typeof t.loc_txt === 'object' ? t.loc_txt : null;
    const text = inline && Array.isArray(inline.text) ? inline.text.slice() : (locEntry && locEntry.text ? [].concat(locEntry.text) : []);
    const name = (inline && typeof inline.name === 'string' && inline.name)
      || (locEntry && locEntry.name)
      || (typeof t.name === 'string' && t.name ? t.name : null)
      || key;

    const item = {
      id: fullKey, key: fullKey, cat, set,
      order: typeof t.order === 'number' ? t.order : 500,
      name, i18n: {}, text: {}, textRaw: {},
      atlas: atlasName, pos,
      sprite: atlasName ? { kind: 'center', atlas: atlasName, pos } : null,
      rarity: t.rarity, cost: t.cost, unlocked: t.unlocked, discovered: t.discovered,
      effect: t.effect, label: t.label, kind: t.kind, weight: t.weight,
      blueprint_compat: t.blueprint_compat, eternal_compat: t.eternal_compat, perishable_compat: t.perishable_compat,
      hidden: t.hidden, requires: t.requires, unlock_condition: t.unlock_condition,
      config: (t.config && typeof t.config === 'object') ? t.config : {},
      soul_pos: (t.soul_pos && typeof t.soul_pos === 'object') ? t.soul_pos : null,
      soul_atlas: typeof t.soul_atlas === 'string' ? t.soul_atlas : null,
      box: null,
      note: null,
      source: id, sourceName: manifest.display_name || manifest.name || id,
      modFile: d.file, modLine: d.line,
      raw: t,
    };
    // mod editions name their shader; the note is filled in once we know whether it compiled
    if (d.type === 'Edition' && typeof t.shader === 'string' && t.shader) item.shader = t.shader;
    if (item.soul_pos) {
      const sa = item.soul_atlas ? (keyCandidates(item.soul_atlas, prefix, null).find((a) => atlases.has(a)) || atlasName) : atlasName;
      item.soul = { atlas: sa, pos: item.soul_pos, kind: 'float' };
    }
    // localization: keep every language we found
    for (const locale of locOrder) {
      const e = locLookup(set, cands, [locale]);
      if (e && e.name) item.i18n[locale] = e.name;
      if (e && e.text) { const arr = [].concat(e.text); item.textRaw[locale] = arr; item.text[locale] = arr }
    }
    if (inline && Array.isArray(inline.text)) { item.textRaw['mod'] = inline.text.slice(); item.text['mod'] = inline.text.slice() }
    if (!Object.keys(item.i18n).length && name) item.i18n['mod'] = name;
    items.push(item);
    stats.parsed++;
  }
  if (inferredAtlas.length) warnings.push(`${inferredAtlas.length} 个图集的贴图不在声明的路径上，已按文件名匹配：${inferredAtlas.slice(0, 3).join('、')}${inferredAtlas.length > 3 ? ' …' : ''}`);
  if (missingAtlas.length) warnings.push(`${missingAtlas.length} 个条目指向的图集不存在（mod 里没有，原版也没有），已标为无贴图：${missingAtlas.slice(0, 4).map((e) => e.id + ' → ' + e.declared).join('、')}${missingAtlas.length > 4 ? ' …' : ''}`);
  if (implicitAtlas.length) {
    const byCat = {};
    for (const e of implicitAtlas) byCat[e.cat] = (byCat[e.cat] || 0) + 1;
    warnings.push(`${implicitAtlas.length} 个条目本身没有卡图（${Object.entries(byCat).map(([k, v]) => k + '×' + v).join('、')}），在游戏里它们由原版图层合成或本来就是纯效果`);
  }
  if (implicitPos.length) warnings.push(`${implicitPos.length} 个条目没有写 pos，已按 SMODS 默认的 (0,0) 处理，会与同图集第 0 格重叠`);
  stats.implicitPos = implicitPos.length;
  stats.implicitAtlas = implicitAtlas.length;
  stats.missingAtlas = missingAtlas.length;
  stats.inferredAtlas = inferredAtlas.length;
  stats.unknownTypes = unknownTypes;
  // Atlas / ConsumableType / ObjectType are handled elsewhere, so they are not "skipped"
  const handled = new Set(['Atlas', 'ConsumableType', 'ObjectType']);
  const unknownList = Object.keys(unknownTypes).filter((k) => !handled.has(k)).sort((a, b) => unknownTypes[b] - unknownTypes[a]);
  const unknownTotal = unknownList.reduce((a, k) => a + unknownTypes[k], 0);
  if (unknownTotal) {
    warnings.push('另有 ' + unknownTotal + ' 条声明不含卡牌素材（' + unknownList.slice(0, 5).map((k) => k + '×' + unknownTypes[k]).join('、') + (unknownList.length > 5 ? ' 等' : '') + '），已跳过');
  }
  stats.items = items.length;
  stats.images = [...rel.keys()].filter((k) => /\.(png|jpg|jpeg|gif|webp)$/i.test(k)).length;
  stats.shaderFiles = shaderFiles.length;
  for (const v of files.values()) stats.bytes += v.length;

  return {
    manifest, id, prefix, root,
    name: manifest.display_name || manifest.name || id,
    version: manifest.version_number || manifest.version || '',
    author: manifest.author || '',
    atlases: [...new Set([...atlases.values()])].filter((a) => !a.aliasOf),
    atlasIndex: atlases,
    items, types: [...new Set([...types.values()])], shaders,
    localization: loc, warnings, stats,
  };
}

window.__MODIMPORT__ = { readZip, readFileList, parseMod, findRoot, reRoot, keyCandidates };
})();

;
/* ============================================================================
 * Balatro 素材图鉴 — 全美术资源查看 / 预览 / 提取器
 * 数据与贴图全部内联，离线双击即可运行。
 * ==========================================================================*/
'use strict';
(function () {
const D = window.__BALATRO_DATA__;
const ATLAS = window.__BALATRO_ATLAS__;
const CARD_W = 71, CARD_H = 95;                 // logical tile size (matches game.lua px/py)
const ITEMS = D.items;
const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/* ------------------------------------------------------------------ state */
const S = {
  tab: 'codex',
  cat: 'all',
  q: '',
  sort: 'order',
  lang: 'zh_CN',
  scale: 2,
  // phase doubles as the game's G.TIMERS.REAL. t = 0 is the neutral pose: every sine
  // term of the floating-art animation vanishes there, so the character art is upright.
  phase: 0,
  blindFrame: 0,
  anim: { on: false, t: 0, speed: 4, seconds: 2.5, pingpong: true, fps: 20, loop: 'auto' },
  gifBg: null,
  rawSize: false,
  view: 'grid',
  sel: null,
  forge: {
    baseType: 'PlayingCard',
    base: 'S_A',
    baseQuery: '',
    back: 'b_red',
    enhancement: 'm_bonus',
    seal: 'Gold',
    // a joker can carry several stickers at once: eternal XOR perishable, plus rental
    // and one coloured stake sticker (game.lua: set_eternal / set_perishable / set_rental)
    stickers: { eternal: true, perishable: false, rental: false, color: '' },
    edition: 'e_foil',
    variants: false,
    showFront: true,
    open: null,        // which groups are expanded; null = decide from the viewport on first use
  },
  atlasOpen: {},
  source: 'all',   // 'all' | 'vanilla' | <mod id>
};
/* ------------------------------------------------------- imported mods */
const MODS = [];
const CAT_LABELS = new Map();
const MOD_SHADERS = {};   // shader key -> .fs source, for every imported mod
function categoryLabel (key) {
  if (CAT_LABELS.has(key)) return CAT_LABELS.get(key);
  const known = CATS.find((c) => c[0] === key);
  return known ? known[1] : key;
}
/** Register a parsed mod: atlas images, entries, and any new card types it declares. */
async function registerMod (parsed) {
  const modId = parsed.id;
  if (MODS.some((m) => m.id === modId)) return { ok: false, reason: '已导入同名 mod：' + modId };
  const addedAtlas = [];
  const byFile = new Map();   // mod path -> {url, w, h, error}
  // decode every sheet in parallel: Cryptid alone ships 60 of them, and a sequential load made
  // the import take several seconds on a phone
  const pending = [];
  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    if (byFile.has(file)) continue;
    const url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/png' }));
    ATLAS[file] = url;
    delete IMG[file]; delete IMG_READY[file];
    const im = new Image();
    const rec = { url, w: 0, h: 0, error: null };
    byFile.set(file, rec);
    // keep THIS element as the cached one: drawTileTo() reads IMG[file], and a second Image
    // created later may not be decoded yet (it would silently draw nothing)
    IMG[file] = im;
    IMG_READY[file] = new Promise((res) => {
      const ok = () => { rec.w = im.naturalWidth; rec.h = im.naturalHeight; res(im) };
      im.onload = ok;
      im.onerror = () => { rec.w = 0; rec.h = 0; res(null) };
    });
    im.src = url;
    pending.push(IMG_READY[file]);
  }
  if (pending.length) await Promise.all(pending);

  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    const rec = byFile.get(file);
    if (!rec.w || !rec.h) {
      if (!rec.error) { rec.error = '图集 ' + a.key + ' 的图片无法解码'; parsed.warnings.push(rec.error) }
      continue;
    }
    void rec.url;
    let scale = a.scale;
    if (a.inferred) {
      // the file name was matched, so 1x/2x had to be guessed — keep whichever scale can
      // actually hold every pos the mod declares
      const realKey = a.aliasOf || a.key;
      const used = parsed.items.filter((it) => it.atlas === realKey && it.pos);
      // score, don't require: a single broken pos must not outweigh every correct one
      const score = (sc) => {
        const cols = Math.floor(rec.w / (sc * a.px)); const rows = Math.floor(rec.h / (sc * a.py));
        if (cols < 1 || rows < 1) return -1;
        return used.filter((it) => it.pos.x < cols && it.pos.y < rows).length;
      };
      const alt = scale === 2 ? 1 : 2;
      if (score(alt) > score(scale)) {
        parsed.warnings.push('图集 ' + a.key + ' 的贴图路径已丢失，按 ' + alt + 'x 处理（按条目坐标反推）');
        scale = alt;
      }
    }
    D.atlases[a.key] = {
      name: a.key, file, px: a.px, py: a.py, w: rec.w, h: rec.h, scale,
      cols: Math.max(1, Math.round(rec.w / (scale * a.px))),
      rows: Math.max(1, Math.round(rec.h / (scale * a.py))),
      frames: null, kind: 'mod', aliasOf: a.aliasOf || null,
    };
    addedAtlas.push(a.key);
  }
  for (const t of parsed.types) {
    if (!CAT_LABELS.has(t.key)) CAT_LABELS.set(t.key, t.key + '（mod 新类型）');
  }
  // shaders: SMODS prefixes the object key but sends the original one as the uniform name,
  // so register (and resolve) both spellings
  const modShaders = [];
  const missingShaders = [];
  for (const sh of parsed.shaders || []) {
    // SMODS registers the shader under a prefixed key but still sends the original name
    const cands = [sh.key, parsed.prefix ? parsed.prefix + '_' + sh.key : null].filter(Boolean);
    let prog = null;
    for (const cand of cands) {
      if (GL && GL.defineShader(cand, sh.source)) { prog = cand; MOD_SHADERS[cand] = sh.source; }
    }
    if (prog) modShaders.push(prog);
    else { missingShaders.push(sh.key); parsed.warnings.push('着色器 ' + sh.key + ' 无法编译（顶点专用或语法不受支持）') }
  }
  for (const it of parsed.items) {
    if (it.shader && !modShaders.some((k) => k === it.shader || k.endsWith('_' + it.shader))) {
      it.note = '这个版本用的是 mod 自定义着色器 ' + it.shader + '，但该着色器无法编译，下面显示的是不加特效的牌面';
    } else if (it.shader) it.note = null;
  }
  const oob = [];
  const dupes = [];
  for (const it of parsed.items) {
    // the same key declared twice (Cryptid does this for tier placeholders) is one card in game
    const prev = BY_ID[it.id];
    if (prev && prev.source === modId) { dupes.push(it.id); continue }
    // a pos outside the sheet would simply draw nothing — say so instead of showing a blank card
    const a = it.atlas ? D.atlases[it.atlas] : null;
    if (a && a.cols && it.pos && (it.pos.x >= a.cols || it.pos.y >= a.rows)) {
      oob.push(it.id + ' (pos ' + it.pos.x + ',' + it.pos.y + ' / ' + a.cols + '×' + a.rows + ')');
      it.pos = null; it.sprite = null;
    }
    if (BY_ID[it.id]) it.id = it.id + '@' + modId;   // shadowing a vanilla entry keeps both
    it.source = modId;
    it.sourceName = parsed.name;
    ITEMS.push(it);
    BY_ID[it.id] = it;
    D.counts[it.cat] = (D.counts[it.cat] || 0) + 1;
  }
  if (oob.length) parsed.warnings.push('以下条目的 pos 超出图集范围，已标为无贴图：' + oob.slice(0, 4).join('、') + (oob.length > 4 ? ' …' : ''));
  if (dupes.length) parsed.warnings.push('有 ' + dupes.length + ' 条声明用了同一个 key（游戏中后声明的会覆盖前面的），已合并：' + dupes.slice(0, 4).join('、') + (dupes.length > 4 ? ' …' : ''));
  MODS.push({
    id: modId, name: parsed.name, version: parsed.version, author: parsed.author,
    items: parsed.items.length, atlasKeys: addedAtlas, warnings: parsed.warnings, stats: parsed.stats,
  });
  return { ok: true, items: parsed.items.length, atlases: addedAtlas.length, warnings: parsed.warnings };
}
async function importModFiles (files, fallbackName) {
  const map = files instanceof Map ? files : await window.__MODIMPORT__.readFileList(files);
  const parsed = window.__MODIMPORT__.parseMod(map, fallbackName);
  const res = await registerMod(parsed);
  return Object.assign(res, { mod: parsed });
}
async function importModZip (arrayBuffer, name) {
  const files = await window.__MODIMPORT__.readZip(arrayBuffer);
  return importModFiles(files, name);
}
/** Unload a mod and rebuild counts. */
function removeMod (id) {
  for (let i = ITEMS.length - 1; i >= 0; i--) if (ITEMS[i].source === id) { delete BY_ID[ITEMS[i].id]; ITEMS.splice(i, 1) }
  const idx = MODS.findIndex((x) => x.id === id);
  if (idx >= 0) {
    for (const a of MODS[idx].atlasKeys) delete D.atlases[a];
    MODS.splice(idx, 1);
  }
  // shader sources belong to the mod; the compiled programs stay but nothing references them
  for (const k of Object.keys(MOD_SHADERS)) delete MOD_SHADERS[k];
  for (const k of Object.keys(D.counts)) delete D.counts[k];
  for (const it of ITEMS) D.counts[it.cat] = (D.counts[it.cat] || 0) + 1;
  if (S.source === id) S.source = 'all';
  render();
}
/** Entries visible under the current source filter. */
function sourceItems () {
  if (S.source === 'all') return ITEMS;
  if (S.source === 'vanilla') return ITEMS.filter((i) => !i.source);
  return ITEMS.filter((i) => i.source === S.source);
}

/* ---------------------------------------------------------- mod dropzone */
const MOD_LOG = [];
function modLog (kind, text) { MOD_LOG.push({ kind: kind || 'info', text: String(text) }); if (MOD_LOG.length > 240) MOD_LOG.shift() }

/** Walk a dropped directory entry, tagging every File with its relative path. */
function filesFromEntry (entry, out, prefix) {
  return new Promise((resolve) => {
    if (!entry) return resolve();
    if (entry.isFile) {
      entry.file((f) => {
        try { Object.defineProperty(f, '__rel', { value: (prefix || '') + f.name, configurable: true }) } catch (e) { /* ignore */ }
        out.push(f); resolve();
      }, () => resolve());
      return;
    }
    if (!entry.isDirectory) return resolve();
    const reader = entry.createReader();
    const acc = [];
    const next = () => reader.readEntries((ents) => {
      if (!ents.length) {
        Promise.all(acc.map((en) => filesFromEntry(en, out, (prefix || '') + entry.name + '/'))).then(() => resolve());
        return;
      }
      for (const en of ents) acc.push(en);
      next();
    }, () => resolve());
    next();
  });
}
/** Collect the files of a drop; folders are walked through the entries API. */
async function filesFromDrop (dt) {
  const out = [];
  const items = dt && dt.items ? Array.from(dt.items) : [];
  const entries = [];
  for (const it of items) if (it.kind === 'file' && typeof it.webkitGetAsEntry === 'function') { const en = it.webkitGetAsEntry(); if (en) entries.push(en) }
  if (entries.length) { await Promise.all(entries.map((en) => filesFromEntry(en, out, ''))); if (out.length) return out }
  return Array.from((dt && dt.files) || []);
}
const isZipName = (n) => /\.(zip|balatro|mod)$/i.test(String(n || ''));

/** Import from a folder picker / drop (Files) or from a single .zip. */
async function importBatch (input, fallbackName) {
  const files = Array.from(input || []);
  if (!files.length) { toast('没有读到文件'); return null }
  const first = files[0].__rel || files[0].webkitRelativePath || files[0].name;
  let res = null;
  try {
    if (files.length === 1 && isZipName(first)) {
      modLog('info', '读取压缩包 ' + first + ' …');
      res = await importModZip(await files[0].arrayBuffer(), first.replace(/\.[^.]+$/, ''));
    } else {
      res = await importModFiles(files, fallbackName);
    }
  } catch (e) {
    modLog('bad', '解析出错：' + (e && e.message ? e.message : e));
    toast('解析出错，详见导入面板的日志');
    render();
    return null;
  }
  if (!res || !res.ok) {
    const why = (res && res.reason) || '未知错误';
    modLog('bad', '导入失败：' + why);
    toast('导入失败：' + why);
  } else {
    const st = (res.mod && res.mod.stats) || {};
    modLog('ok', `已导入「${res.mod.name}」：条目 ${res.items} · 图集 ${res.atlases} · 扫描 ${st.decls || 0} 条声明（跳过 ${st.skipped || 0}）${st.shaders ? ' · 自带 ' + st.shaders + ' 个着色器（已接入）' : ''}`);
    for (const w of res.warnings || []) modLog('warn', '· ' + w);
    toast(`已导入 ${res.mod.name}：${res.items} 个条目`);
  }
  render();
  return res;
}
async function importZipBuffer (buf, name) {
  try {
    const res = await importModZip(buf, name);
    if (!res || !res.ok) modLog('bad', '导入失败：' + ((res && res.reason) || '未知错误'));
    else { modLog('ok', `已导入「${res.mod.name}」：条目 ${res.items} · 图集 ${res.atlases}`); for (const w of res.warnings || []) modLog('warn', '· ' + w) }
    render();
    return res;
  } catch (e) {
    modLog('bad', '压缩包解析出错：' + (e && e.message ? e.message : e));
    render();
    return null;
  }
}

function viewMods (root) {
  const v = document.createElement('div');
  v.className = 'modsview';
  const modItems = MODS.reduce((a, m) => a + m.items, 0);
  v.innerHTML = `
    <h2>导入 Mod 素材</h2>
    <p class="lead">支持 <b>Steamodded（SMODS）格式</b> 的 Mod：把整个 Mod 文件夹拖进来，或者选它的 <code>.zip</code>。
      解析完全在本页进行——<b>不联网、不上传任何文件</b>。导入后，Mod 的小丑牌 / 消耗品 / 它自己新增的类型会直接进入图鉴，
      可以预览、搜索、合成，并导出 PNG / GIF / APNG / ZIP。</p>
    <div class="drop" id="modDrop">
      <div class="big">⊕</div>
      <div class="t">把 Mod 文件夹或 .zip 拖到这里</div>
      <div class="s">文件夹里需要有 <code>manifest.json</code> 和入口 lua，图集放在 <code>assets/2x/</code> 或 <code>assets/1x/</code></div>
      <div class="dropbtns">
        <button class="btn primary" id="modPickDir">选择 Mod 文件夹</button>
        <button class="btn" id="modPickZip">选择 Mod zip</button>
        ${MODS.length ? `<button class="btn" id="modClear">全部卸载（${MODS.length}）</button>` : ''}
      </div>
      <input type="file" id="modDirInput" webkitdirectory directory multiple style="display:none">
      <input type="file" id="modZipInput" accept=".zip,.balatro,.mod,application/zip" style="display:none">
    </div>
    <div class="glabel">已导入（${MODS.length} 个 Mod · ${modItems} 个条目）</div>
    <div class="modlist" id="modList"></div>
    <div class="glabel">导入日志</div>
    <div class="modlog" id="modLogBox"></div>
    <p class="lead" style="margin-top:2px">说明：解析器直接扫描 lua 里的 <code>SMODS.XXX{ ... }</code> 声明，并按 Mod 的 key 前缀（默认取 mod id 前 4 个小写字符，或 manifest 里的 <code>prefix</code>）去匹配 atlas / 本地化条目。
      如果某个 Mod 的牌是运行时循环生成的，解析不到的条目会写进日志；把日志发给作者就能补规则。</p>`;

  const list = v.querySelector('#modList');
  if (!MODS.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = '还没有导入任何 Mod。';
    list.appendChild(h);
  }
  for (const m of MODS) {
    const c = document.createElement('div');
    c.className = 'modcard';
    const warns = m.warnings || [];
    const shown = warns.slice(0, 5);
    c.innerHTML = `
      <div class="mh"><b>${esc(m.name)}</b><span class="mid">${esc(m.id)}</span><span class="sp"></span>
        <button class="btn" data-act="view">在图鉴中查看</button>
        <button class="btn" data-act="del">卸载</button></div>
      <div class="meta">
        <span>版本 <b>${esc(m.version || '—')}</b></span>
        <span>作者 <b>${esc(m.author || '—')}</b></span>
        <span>条目 <b>${m.items}</b></span>
        <span>图集 <b>${m.atlasKeys.length}</b></span>
        ${m.stats ? `<span>声明 <b>${m.stats.decls || 0}</b></span><span>文件 <b>${m.stats.files || 0}</b></span>` : ''}
        ${m.stats && m.stats.implicitPos ? `<span>隐含 pos <b>${m.stats.implicitPos}</b></span>` : ''}
        ${m.warnings.length ? `<span>警告 <b>${m.warnings.length}</b></span>` : ''}
      </div>
      ${shown.length ? `<div class="modwarns">${shown.map((w) => '· ' + esc(w)).join('<br>')}${warns.length > shown.length ? `<br>…还有 ${warns.length - shown.length} 条，见下方日志` : ''}</div>` : ''}`;
    c.querySelector('[data-act="view"]').onclick = () => { S.source = m.id; S.cat = 'all'; S.tab = 'codex'; render() };
    c.querySelector('[data-act="del"]').onclick = () => { removeMod(m.id); toast('已卸载 ' + m.name) };
    list.appendChild(c);
  }
  const logBox = v.querySelector('#modLogBox');
  if (!MOD_LOG.length) logBox.textContent = '（暂无）';
  else logBox.innerHTML = MOD_LOG.map((l) => `<span class="${l.kind === 'info' ? '' : l.kind}">${esc(l.text)}</span>`).join('\n');
  logBox.scrollTop = logBox.scrollHeight;

  const drop = v.querySelector('#modDrop');
  const dirIn = v.querySelector('#modDirInput');
  const zipIn = v.querySelector('#modZipInput');
  // phones have no directory picker, so do not offer a button that cannot do anything
  const dirPicker = 'webkitdirectory' in document.createElement('input');
  const pickDirBtn = v.querySelector('#modPickDir');
  if (!dirPicker) {
    pickDirBtn.disabled = true;
    pickDirBtn.title = '这个浏览器的文件选择器不支持选文件夹，请改用 zip 或直接拖进来';
    pickDirBtn.textContent = '选择 Mod 文件夹（此浏览器不支持）';
  } else pickDirBtn.onclick = () => dirIn.click();
  v.querySelector('#modPickZip').onclick = () => zipIn.click();
  const clear = v.querySelector('#modClear');
  if (clear) clear.onclick = () => { for (const m of MODS.slice()) removeMod(m.id); toast('已卸载全部 Mod') };
  // NOTE: input.files is a live FileList — clearing the input first would empty it, which is
  // why the picker used to report "没有读到文件". Snapshot before resetting.
  dirIn.onchange = () => { const f = Array.from(dirIn.files); dirIn.value = ''; importBatch(f) };
  zipIn.onchange = () => { const f = Array.from(zipIn.files); zipIn.value = ''; importBatch(f) };

  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.add('over') });
  for (const ev of ['dragleave', 'dragend']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over') });
  drop.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.remove('over');
    filesFromDrop(e.dataTransfer).then((files) => importBatch(files));
  });
  // a drop anywhere else in the content area would otherwise be handled by the browser
  for (const ev of ['dragover', 'drop']) root.addEventListener(ev, (e) => { if (e.target === root || e.target === v) { e.preventDefault(); e.stopPropagation() } });
  root.appendChild(v);
}

/** Value fed to compose() as the game's G.TIMERS.REAL: live animation clock or the static slider. */
const phaseNow = () => (S.anim.on ? S.anim.t : S.phase);
let animRAF = null;
let animLast = 0;
function startAnim (repaint) {
  stopAnim();
  S.anim.on = true;
  const step = (ts) => {
    animRAF = requestAnimationFrame(step);
    if (!animLast) animLast = ts;
    const dt = Math.min(0.06, (ts - animLast) / 1000);
    animLast = ts;
    // the preview runs at the same multiplier the export uses, so the speed selector is visible
    S.anim.t += dt * (S.anim.speed || 1);
    repaint();
  };
  animRAF = requestAnimationFrame(step);
}
function stopAnim () {
  if (animRAF) cancelAnimationFrame(animRAF);
  animRAF = null; animLast = 0;
  S.anim.on = false;
}
/** The game lets several stickers share one joker; wall-clock tilt binding is gone. */

/* ---------------------------------------------------------------- atlases */
const IMG = {};
const IMG_READY = {};
let ALL_READY = Promise.resolve();
function img (file) {
  if (!IMG[file]) {
    const el = new Image();
    el.src = ATLAS[file] || '';
    IMG[file] = el;
    IMG_READY[file] = new Promise((res) => {
      if (el.complete && el.naturalWidth) res(el);
      else { el.onload = () => res(el); el.onerror = () => res(null); }
    });
  }
  return IMG[file];
}
function atlas (name) { return D.atlases[name] || null; }
/** Pixel rect of one tile inside its sheet, at native resolution. */
function tileRect (atlasName, pos, file) {
  const a = atlas(atlasName);
  if (!a || !pos) return null;
  const s = a.scale;
  const px = a.px * s, py = a.py * s;
  return { x: pos.x * px, y: pos.y * py, w: px, h: py, file: file || a.file, atlasName };
}

/* --------------------------------------------------- WebGL edition shaders */
/* ------------------------------------------------- game shaders on WebGL
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
    const names = LIB.uniformNames(source).concat(['sample_tex', 'tex0', 'uUvRect', 'uImageDetails', 'uTileOrigin']);
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
   * `ref` is { file, x, y, w, h } in sheet pixels — the same thing Sprite:get_pos_pixel
   * hands the game's shaders, so the effect lands on the same pixels it would in game.
   */
  /** Shared per-draw setup: program, buffer, viewport, texture unit. */
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
  /**
   * The uniforms every game shader receives (engine/sprite.lua:96-106).
   *
   * `w`/`h` are the card's pixel size in the same units the shader sees as "screen":
   * in game a card is `G.TILESCALE*G.TILESIZE` ≈ 73 px wide on screen and
   * `screen_scale = TILESCALE*TILESIZE*CANV_SCALE` ≈ 109 (CANV_SCALE is 1.5), while
   * `mouse_screen_pos` is the cursor — which sits *on* the card whenever a player is
   * looking at one. Our card is drawn at an arbitrary zoom, so the ratio is what matters:
   * screen_scale = 1.5*w and the "cursor" at the card's centre reproduce the game's
   * geometry exactly (mouse_offset ≈ ±1/3 across the card). Passing screen_scale = w with
   * mouse at (0,0) — as this used to — inflated every cursor-distance term, which is what
   * made shaders like Cryptid's astral wash out to white.
   */
  function commonUniforms (pr, phase, opts, w, h) {
    const u = pr.u;
    if (u.time) gl.uniform1f(u.time, opts.time !== undefined ? opts.time : phase);
    if (u.dissolve) gl.uniform1f(u.dissolve, opts.dissolve || 0);
    if (u.shadow) gl.uniform1i(u.shadow, opts.shadow ? 1 : 0);
    if (u.hovering) gl.uniform1f(u.hovering, 0);
    if (u.screen_scale) gl.uniform1f(u.screen_scale, 1.5 * w);
    if (u.mouse_screen_pos) gl.uniform2f(u.mouse_screen_pos, w / 2, h / 2);
    if (u.love_ScreenSize) gl.uniform2f(u.love_ScreenSize, w, h);
    if (u.burn_colour_1) gl.uniform4f(u.burn_colour_1, 0, 0, 0, 0);
    if (u.burn_colour_2) gl.uniform4f(u.burn_colour_2, 0, 0, 0, 0);
    // the effect's own vec2 = send_to_shader: {REAL/28, REAL}   (card.lua:4349)
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
    const u = pr.u;
    if (u.uUvRect) gl.uniform4f(u.uUvRect, ref.x / sheet.w, ref.y / sheet.h, ref.w / sheet.w, ref.h / sheet.h);
    if (u.uImageDetails) gl.uniform2f(u.uImageDetails, sheet.w, sheet.h);
    if (u.uTileOrigin) gl.uniform2f(u.uTileOrigin, ref.x, ref.y);
    // tile units, not pixels — see the note above
    if (u.texture_details) gl.uniform4f(u.texture_details, ref.x / ref.w, ref.y / ref.h, ref.w, ref.h);
    if (u.image_details) gl.uniform2f(u.image_details, sheet.w, sheet.h);
    commonUniforms(pr, phase, opts, ref.w, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return finish(W, H);
  }

  /**
   * Shade a canvas that is NOT part of a sheet (a composed card, a shader-preview tile).
   * The game never does this, but the shader previews need it; the sheet is the canvas itself.
   */
  function shadeCanvas (key, cv, phase, opts) {
    const pr = programs[key];
    if (!pr) return null;
    opts = opts || {};
    const W = cv.width; const H = cv.height;
    begin(pr, W, H);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const u = pr.u;
    if (u.uUvRect) gl.uniform4f(u.uUvRect, 0, 0, 1, 1);
    if (u.uImageDetails) gl.uniform2f(u.uImageDetails, W, H);
    if (u.uTileOrigin) gl.uniform2f(u.uTileOrigin, 0, 0);
    if (u.texture_details) gl.uniform4f(u.texture_details, 0, 0, W, H);
    if (u.image_details) gl.uniform2f(u.image_details, W, H);
    commonUniforms(pr, phase, opts, W, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.deleteTexture(tex);
    return finish(W, H);
  }

  return {
    gl, IS2, canvas, programs, buf, shade, shadeCanvas, defineShader, sheetTexture, textures,
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
}

/**
 * Run a static frame of one of the edition shaders over a canvas.
 * Mirrors Card:draw's send_to_shader: phase.x = min(VT.r*3,1)+REAL/28, phase.y = REAL.
 */
/** Shade a plain canvas (not part of a sheet). Kept for the shader-preview page. */
function glApply (key, src, w, h, phase) {
  if (!GL || !GL.programs[key]) return null;
  return GL.shadeCanvas(key, src, phase);
}
/** Atlas-space uv rect of a tile — only used by the shader preview page now. */
function uvRectOf (spec) {
  const a = atlas(spec.atlas);
  if (!a || !spec.pos) return null;
  return { ox: spec.pos.x / a.cols, oy: spec.pos.y / a.rows, sx: 1 / a.cols, sy: 1 / a.rows };
}
/** Render just one tile onto its own transparent canvas. */
function tileLayer (spec, W, H, highContrast) {
  const c = newCanvas(W, H);
  drawTileTo(c.getContext('2d'), spec, 0, 0, W, H, highContrast);
  return c;
}
/** Run a shader over a whole canvas; null when unavailable so callers can skip the pass. */
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
}

/* ------------------------------------------------------------- composition */
function newCanvas (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function drawTileTo (ctx, spec, dx, dy, dw, dh, highContrast) {
  if (!spec || !spec.pos) return;
  const a = atlas(spec.atlas);
  if (!a) return;
  let file = a.file;
  if (highContrast && spec.atlas2 && D.atlases[spec.atlas2]) file = D.atlases[spec.atlas2].file;
  const r = tileRect(spec.atlas, spec.pos, file);
  const im = img(r.file);
  if (!im.complete || !im.naturalWidth) return;
  ctx.drawImage(im, r.x, r.y, r.w, r.h, dx, dy, dw, dh);
}

const EDITION_SHADER = { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' };
/** The shader a card should use for an edition item: a vanilla name, or a mod shader key. */
function editionShaderOf (it) {
  if (!it) return null;
  if (it.shader) return resolveShaderKey(it.shader);
  return (it.raw && it.raw.set === 'Edition') ? it.id : null;
}
/** Accepts either the bare or the mod-prefixed spelling of a shader key. */
function resolveShaderKey (key) {
  if (!key) return null;
  if (GL && GL.programs[key]) return key;
  for (const cand of Object.keys(MOD_SHADERS)) {
    if (cand.endsWith('_' + key)) return cand;
  }
  return key;
}
const COM = D.composition;

/**
 * Compose one card, mirroring Card:draw's layer order:
 *   centre (set shader) -> front -> edition shader -> seal (voucher shader if Gold)
 *   -> sticker (voucher shader) -> floating soul sprite (scale/rotate animated)
 * spec: {back, center, front, seal, sticker(s), edition, setShader, soul, soulHologram, highContrast, standalone}
 * sticker is either a vanilla sticker key or {atlas, pos} for a sprite an imported mod declared.
 * `phase` doubles as the game's G.TIMERS.REAL, so it drives both shaders and the float.
 */
function compose (spec, scale, phase) {
  scale = scale || 2;
  phase = phase === undefined ? S.phase : phase;
  if (spec.standalone) {
    const a = atlas(spec.standalone.atlas);
    if (!a) return newCanvas(Math.round(CARD_W * scale), Math.round(CARD_H * scale));
    const c = newCanvas(Math.round(a.px * scale), Math.round(a.py * scale));
    drawTileTo(c.getContext('2d'), spec.standalone, 0, 0, c.width, c.height);
    return c;
  }
  const W = Math.round(CARD_W * scale), H = Math.round(CARD_H * scale);
  const cv = newCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (spec.back) {
    drawTileTo(ctx, spec.back, 0, 0, W, H, spec.highContrast);
    return cv;
  }

  const centre = spec.center ? tileLayer(spec.center, W, H, spec.highContrast) : null;
  const stone = spec.center && spec.center.stoneNoFront;
  const front = (spec.front && !stone) ? tileLayer(spec.front, W, H, spec.highContrast) : null;
  const negative = spec.edition === 'e_negative';
  // a vanilla edition name, or the key of a shader an imported mod brought with it
  const gloss = EDITION_SHADER[spec.edition] || (GL && GL.programs[spec.edition] ? spec.edition : null);
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
  if (negative && spec.center) drawShadedTile(spec.center, 'negative_shine');

  // 6) seal (gold seals get the voucher shimmer, per card.lua). A mod seal carries its own
  //    sprite, exactly like a mod sticker.
  const sealRef = (spec.seal && typeof spec.seal === 'object') ? spec.seal
    : (COM.sealPos[spec.seal] ? { atlas: 'centers', pos: COM.sealPos[spec.seal] } : null);
  if (sealRef && atlas(sealRef.atlas)) {
    if (spec.seal === 'Gold') drawShaded(ctx, sealRef, W, H, 'voucher', phase);
    else ctx.drawImage(tileLayer(sealRef, W, H, spec.highContrast), 0, 0);
  }
  // 7) stickers — a joker may carry several at once (eternal XOR perishable, + rental,
  //    + one coloured stake sticker). Each is drawn with the voucher shimmer.
  const stickers = spec.stickers || (spec.sticker ? [spec.sticker] : []);
  for (const s of stickers) {
    // a vanilla sticker is a key into the shared stickers sheet; a mod one carries its own sprite
    const ref = (s && typeof s === 'object')
      ? { atlas: s.atlas, pos: s.pos }
      : (COM.stickerPos[s] ? { atlas: 'stickers', pos: COM.stickerPos[s] } : null);
    if (!ref || !atlas(ref.atlas)) continue;
    drawShaded(ctx, ref, W, H, 'voucher', phase);
  }

  // 8) floating overlay sprite (legendary jokers / Hologram / The Soul)
  if (spec.soul && spec.soul.pos) {
    const t = phase;
    const frac = t - Math.floor(t);
    let sc; let rot;
    if (spec.soul.kind === 'soul') {
      // Card:draw -> 'The Soul' branch
      sc = 0.05 + 0.05 * Math.sin(1.8 * t) + 0.07 * Math.sin(frac * Math.PI * 14) * Math.pow(1 - frac, 3);
      rot = 0.1 * Math.sin(1.219 * t) + 0.07 * Math.sin(t * Math.PI * 5) * Math.pow(1 - frac, 2);
    } else {
      // Card:draw -> soul_pos branch
      sc = 0.07 + 0.02 * Math.sin(1.8 * t);
      rot = 0.05 * Math.sin(1.219 * t);
    }
    // Hologram's floating art is drawn through hologram.fs, and it samples the whole sheet,
    // so it must be shaded in atlas space (that is what shadeTile does).
    let layer = tileLayer(spec.soul, W, H, spec.highContrast);
    if (spec.soulHologram) layer = shadeTile(spec.soul, W, H, 'hologram', phase) || layer;
    const place = (cv, dx, dy, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2 + dx, H / 2 + dy);
      ctx.rotate(rot);
      ctx.scale(1 + sc, 1 + sc);
      ctx.imageSmoothingEnabled = true; // the floating art is rotated, so let it filter
      ctx.drawImage(cv, -W / 2, -H / 2);
      ctx.restore();
    };
    // The game draws the floating sprite twice: the first pass passes _shadow_height = 0,
    // which is TRUTHY in Lua, so dissolve.fs takes its shadow branch and emits a black
    // silhouette at 30% alpha, shifted down by (0.1 + 0.03 sin 1.8t) world units.
    // Hologram only gets the custom shader pass, so it has no shadow.
    if (!spec.soulHologram && !spec.soulNoShadow) {
      const WORLD_H = 2.7512; // G.CARD_H, i.e. the card's height in world units
      const dy = (0.1 + 0.03 * Math.sin(1.8 * t)) * (H / WORLD_H);
      // dissolve.fs with shadow = true emits the black 30%-alpha silhouette itself
      const sil = shadeTile(spec.soul, W, H, 'dissolve', phase, { shadow: true });
      place(sil || layer, 0, dy, sil ? 1 : 0.3);
    }
    place(layer, 0, 0, 1);
  }

  // Card:set_ability shrinks / squashes the card box for a few centres; every layer is
  // drawn "from children.center", so the whole composite is transformed together.
  if (spec.box && !S.rawSize && (spec.box.w !== 1 || spec.box.h !== 1)) {
    // booster packs are 1.27x, so the canvas has to grow or they get clipped
    const outW = Math.max(W, Math.round(W * spec.box.w));
    const outH = Math.max(H, Math.round(H * spec.box.h));
    const bw = Math.round(W * spec.box.w);
    const bh = Math.round(H * spec.box.h);
    const out = newCanvas(outW, outH);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true; // non-integer rescale, so filter like LÖVE does
    g.drawImage(cv, Math.round((outW - bw) / 2), Math.round((outH - bh) / 2), bw, bh);
    return out;
  }
  return cv;
}

/** Sprite spec for a catalogue entry, choosing the most informative rendition. */
function specForItem (it) {
  const sampleFront = { atlas: 'cards_1', pos: { x: 12, y: 3 } }; // Ace of Spades
  const baseCenter = { atlas: 'centers', pos: COM.baseCenter.pos };
  const withLayers = (spec) => {
    if (it.setShader) spec.setShader = it.setShader;
    if (it.soul) spec.soul = it.soul;
    if (it.id === 'j_hologram') spec.soulHologram = true;
    return spec;
  };
  switch (it.cat) {
    case 'PlayingCard': return { center: baseCenter, front: { atlas: 'cards_1', pos: it.pos } };
    case 'Collab': return { center: baseCenter, front: { atlas: it.atlas, atlas2: it.atlas2, pos: it.pos } };
    case 'Enhancement':
      // a mod enhancement brings its own sheet; vanilla ones live in `centers`
      return it.pos
        ? { center: { atlas: (it.source && it.atlas) ? it.atlas : 'centers', pos: it.pos, stoneNoFront: it.id === 'm_stone' }, front: sampleFront }
        : { center: baseCenter, front: sampleFront };
    case 'Edition': {
      // vanilla editions are keyed by their own id (e_foil…); a mod edition names its .fs
      return { center: baseCenter, front: sampleFront, edition: editionShaderOf(it) };
    }
    case 'Seal':
      // vanilla seals are stamped from `centers`; a mod seal declares its own atlas/pos
      return { center: baseCenter, front: sampleFront, seal: (it.source && it.sprite && it.pos) ? { atlas: it.atlas, pos: it.pos } : it.key };
    case 'Sticker':
      // mod stickers are not in G.shared_stickers: draw the tile the mod declared
      return { center: baseCenter, front: sampleFront, sticker: (it.source && it.sprite && it.pos) ? { atlas: it.atlas, pos: it.pos } : it.key };
    case 'Tag':
    case 'Stake':
      return { standalone: { atlas: it.atlas, pos: it.pos } };
    case 'Blind': {
      // a mod blind ships its own static sheet; only vanilla's blind_chips is the 21-frame
      // animation (one row per blind, x = frame)
      if (it.source && it.atlas && it.atlas !== 'blind_chips') return { standalone: { atlas: it.atlas, pos: it.pos } };
      if (it.source && !it.atlas) return null;   // a mod blind with no art is not a vanilla blind
      const frames = (atlas('blind_chips') || {}).frames || 21;
      const f = ((S.blindFrame % frames) + frames) % frames;
      return { standalone: { atlas: 'blind_chips', pos: { x: f, y: it.pos.y } } };
    }
    case 'Deck': {
      // never fall back to the vanilla back for a mod deck that declared no atlas: that would
      // show an unrelated vanilla tile
      const backAtlas = it.atlas || (it.source ? null : 'centers');
      return (backAtlas && it.pos) ? { back: { atlas: backAtlas, pos: it.pos } } : null;
    }
    case 'Challenge': return { back: { atlas: 'centers', pos: { x: 0, y: 4 } } };
    case 'Overlay': return { standalone: { atlas: it.atlas, pos: it.pos } };
    default:
      if (it.sprite && it.sprite.atlas && it.pos) {
        const sp = withLayers({ center: { atlas: it.atlas, pos: it.pos } });
        if (it.box) sp.box = it.box;
        return sp;
      }
      return null;
  }
}

/* --------------------------------------------------------------- text markup */
const TAGCOL = D.colors.tags;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Render one Balatro localisation string ("{C:attention}...{}") into HTML. */
function markup (line) {
  let out = '';
  let color = null; let scale = 1; let xStyle = false;
  const re = /\{([^{}]*)\}|([^{}]+)/g;
  let m;
  while ((m = re.exec(line))) {
    if (m[1] !== undefined) {
      const ctrl = m[1];
      if (ctrl === '') { color = null; scale = 1; xStyle = false; continue; }
      const parts = ctrl.split(',');
      for (const p of parts) {
        const [k, v] = p.split(':');
        if (k === 'C') { color = TAGCOL[v] || null; }
        else if (k === 'X') { color = TAGCOL[v] || color; xStyle = true; }
        else if (k === 's' || k === 'S') { scale = parseFloat(v) || 1; }
        // V: variant colour (runtime), T: tooltip, E: emphasis — no visual change needed here
      }
      continue;
    }
    let text = m[2];
    if (!text) continue;
    text = esc(text).replace(/#(\d+)#/g, (mm, n) => `<span class="ph" title="运行时数值">#${n}#</span>`);
    const styles = [];
    if (color) styles.push('color:' + color);
    if (scale !== 1) styles.push('font-size:' + scale + 'em');
    out += `<span class="${xStyle ? 'x' : ''}${scale !== 1 ? ' sm' : ''}" style="${styles.join(';')}">${text}</span>`;
  }
  return out;
}
function descHTML (item) {
  const arr = item.text && item.text[S.lang] ? item.text[S.lang] : (item.text && item.text['en-us']) || [];
  if (!arr.length) return '<span style="color:var(--fg3)">—</span>';
  return arr.map((l) => `<span class="ln">${markup(l)}</span>`).join('');
}

/* ------------------------------------------------------------ deep links
 * #t=forge&c=Joker&s=testmod&i=j_cry_mosaic&q=mult&l=ja — only non-default values
 * are written, so a plain visit keeps a clean URL. Same code path on file://.
 * ------------------------------------------------------------------------- */
const HASH_KEYS = [['tab', 't'], ['cat', 'c'], ['source', 's'], ['sel', 'i'], ['q', 'q'], ['lang', 'l']];
function hashString () {
  const def = { tab: 'codex', cat: 'all', source: 'all', sel: null, q: '', lang: 'zh_CN' };
  const parts = [];
  for (const [key, short] of HASH_KEYS) {
    const v = S[key];
    if (v === undefined || v === null || v === '' || v === def[key]) continue;
    parts.push(short + '=' + encodeURIComponent(v));
  }
  return parts.length ? '#' + parts.join('&') : '#';
}
function syncHash () {
  const want = hashString();
  if (location.hash === want) return;
  try { history.replaceState(null, '', want) } catch (e) { location.hash = want.slice(1) }
}
/** Read the current hash into the state (validating against what actually exists). */
function applyHash () {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return false;
  const map = {};
  for (const kv of raw.split('&')) {
    const i = kv.indexOf('=');
    if (i < 0) continue;
    map[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  }
  let touched = false;
  for (const [key, short] of HASH_KEYS) {
    if (map[short] === undefined) continue;
    if (key === 'sel') { if (BY_ID[map[short]]) { S.sel = map[short]; touched = true } continue }
    if (key === 'lang') { if (D.meta.locales.some((l) => l.code === map[short])) { S.lang = map[short]; touched = true } continue }
    if (key === 'tab') {
      if (['codex', 'forge', 'atlas', 'hands', 'shaders', 'data', 'mods'].includes(map[short])) { S.tab = map[short]; touched = true }
      continue;
    }
    if (key === 'source') { S.source = map[short]; touched = true; continue }
    if (key === 'cat') { S.cat = map[short]; touched = true; continue }
    if (key === 'q') { S.q = map[short]; touched = true }
  }
  return touched;
}
/** The absolute URL for the current view, for「复制链接」. */
function shareUrl () {
  return location.origin === 'null' || !location.origin
    ? location.href.replace(/#.*$/, '') + hashString()
    : location.origin + location.pathname + location.search + hashString();
}
function copyLink () {
  const url = shareUrl();
  const done = () => toast('已复制链接：' + url.replace(/^https?:\/\/[^/]+/, ''));
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('复制这个链接：', url));
  else prompt('复制这个链接：', url);
}

/* ------------------------------------------------------------------ i18n */
function nm (item, lang) {
  lang = lang || S.lang;
  if (item.i18n && item.i18n[lang]) return item.i18n[lang];
  if (item.i18n && item.i18n['en-us']) return item.i18n['en-us'];
  return item.name || item.id;
}
const langLabel = (c) => (D.meta.locales.find((l) => l.code === c) || {}).label || c;

/* ---------------------------------------------------------------- search */
function buildBlob (it) {
  if (it._blob) return it._blob;
  const parts = [it.id, it.cat, it.set, it.name, it.effect, it.label, it.kind, it.atlas];
  if (it.i18n) for (const k in it.i18n) parts.push(it.i18n[k]);
  if (it.text) for (const k in it.text) parts.push([].concat(it.text[k]).join(' '));
  if (it.collabName) parts.push(it.collabName);
  parts.push(JSON.stringify(it.config || {}));
  if (it.pos) parts.push(`pos ${it.pos.x},${it.pos.y}`);
  it._blob = parts.filter(Boolean).join('\u0001').toLowerCase();
  return it._blob;
}
function parseQuery (q) {
  const terms = []; const filters = [];
  const re = /"([^"]*)"|(\S+)/g; let m;
  while ((m = re.exec(q))) {
    const tok = m[1] !== undefined ? m[1] : m[2];
    const fm = /^([a-z_]+)([:=<>!]+)(.+)$/i.exec(tok);
    if (fm && !/^https?$/i.test(fm[1])) filters.push({ field: fm[1].toLowerCase(), op: fm[2], val: fm[3].toLowerCase() });
    else terms.push(tok.toLowerCase());
  }
  return { terms, filters };
}
function matchFilter (it, f) {
  const num = (k) => (typeof it[k] === 'number' ? it[k] : null);
  switch (f.field) {
    case 'cat': case 'set': case 'id': case 'atlas': case 'effect': case 'kind': case 'source':
      return String(it[f.field] ?? '').toLowerCase().includes(f.val);
    case 'name':
      return (it.i18n ? Object.values(it.i18n).join('|') : it.name || '').toLowerCase().includes(f.val);
    case 'text':
      return (it.text ? Object.values(it.text).map((v) => [].concat(v).join(' ')).join('|') : '').toLowerCase().includes(f.val);
    case 'rarity': case 'cost': case 'order': case 'stake': case 'dollars': case 'mult': case 'weight': case 'ante': {
      const v = f.field === 'ante' ? (it.min_ante ?? -1) : num(f.field);
      if (v === null) return false;
      const want = parseFloat(f.val);
      if (Number.isNaN(want)) return false;
      switch (f.op) { case ':': case '=': return v === want; case '>': case '>=': return v >= want; case '<': case '<=': return v <= want; case '!=': return v !== want; default: return false; }
    }
    case 'pos': {
      const [x, y] = f.val.split(',').map(Number);
      if (!it.pos) return false;
      return (Number.isNaN(x) || it.pos.x === x) && (Number.isNaN(y) || it.pos.y === y);
    }
    case 'rarityname': return String(it.rarity) === f.val;
    default: return buildBlob(it).includes(f.val);
  }
}
function search (list, q) {
  const { terms, filters } = parseQuery(q || '');
  if (!terms.length && !filters.length) return list.slice();
  return list.filter((it) => {
    for (const f of filters) if (!matchFilter(it, f)) return false;
    if (terms.length) {
      const blob = buildBlob(it);
      for (const t of terms) if (!blob.includes(t)) return false;
    }
    return true;
  });
}

const RARITY = ['', '普通', '罕见', '稀有', '传奇'];
function sortItems (list, mode) {
  const arr = list.slice();
  const cmp = {
    order: (a, b) => (a.order - b.order) || a.id.localeCompare(b.id),
    orderDesc: (a, b) => (b.order - a.order) || a.id.localeCompare(b.id),
    name: (a, b) => nm(a).localeCompare(nm(b), 'zh'),
    cost: (a, b) => ((b.cost ?? -1) - (a.cost ?? -1)) || (a.order - b.order),
    rarity: (a, b) => ((a.rarity ?? 9) - (b.rarity ?? 9)) || (a.order - b.order),
    id: (a, b) => a.id.localeCompare(b.id),
    atlas: (a, b) => String(a.atlas).localeCompare(String(b.atlas)) || ((a.pos ? a.pos.y - b.pos.y : 0) || (a.pos ? a.pos.x - b.pos.x : 0)),
  }[mode] || null;
  if (cmp) arr.sort(cmp);
  return arr;
}

/* ---------------------------------------------------------------- export */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32 (u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const TE = new TextEncoder();

/** Minimal STORE-method ZIP writer (PNG payloads are already compressed). */
function zipStore (files) {
  const chunks = []; const central = []; let offset = 0;
  const dt = new Date();
  const dosTime = ((dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate()) & 0xffff;
  for (const f of files) {
    const nameB = TE.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const lh = new Uint8Array(30 + nameB.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true); dv.setUint16(10, dosTime, true); dv.setUint16(12, dosDate, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameB.length, true); dv.setUint16(28, 0, true);
    lh.set(nameB, 30);
    chunks.push(lh, data);
    const ch = new Uint8Array(46 + nameB.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameB.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nameB, 46);
    central.push(ch);
    offset += lh.length + data.length;
  }
  let cdSize = 0; for (const c of central) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  const total = offset + cdSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  for (const c of central) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}
function canvasBytes (cv) {
  return new Promise((res) => cv.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), 'image/png'));
}
function save (data, filename, type) {
  const blob = data instanceof Uint8Array ? new Blob([data], { type: type || 'application/octet-stream' }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function toast (msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}
function safeName (s) { return String(s).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_'); }

async function exportItemPNG (it, scale, plain) {
  const spec = specForItem(it);
  if (!spec) { toast('该项没有贴图'); return; }
  await ALL_READY; await ensureDrawn();
  const cv = compose(plain ? { center: spec.center, front: spec.front, back: spec.back, standalone: spec.standalone, highContrast: spec.highContrast } : spec, scale);
  save(await canvasBytes(cv), `${safeName(it.id)}_${safeName(nm(it))}_${scale}x.png`, 'image/png');
  toast(`已导出 ${scale}x PNG`);
}
function ensureDrawn () { return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }

async function exportItemSVG (it, scale) {
  const spec = specForItem(it);
  await ALL_READY; await ensureDrawn();
  const cv = compose(spec, scale);
  const url = cv.toDataURL('image/png');
  const w = cv.width, h = cv.height;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<title>${esc(it.id)} · ${esc(nm(it))}</title>` +
    `<desc>Balatro asset ${esc(it.id)} (${esc(it.cat)}), tile ${it.pos ? it.pos.x + ',' + it.pos.y : '-'} @ ${esc(it.atlas || '-')}</desc>` +
    `<image width="${w}" height="${h}" image-rendering="pixelated" xlink:href="${url}" xmlns:xlink="http://www.w3.org/1999/xlink"/></svg>`;
  save(new Blob([svg], { type: 'image/svg+xml' }), `${safeName(it.id)}_${scale}x.svg`, 'image/svg+xml');
  toast('已导出 SVG');
}
function itemJSON (it) {
  return {
    id: it.id, category: it.cat, set: it.set, name: nm(it, 'en-us'), names: it.i18n,
    description: it.text, descriptionRaw: it.textRaw,
    sprite: { atlas: it.atlas, pos: it.pos, atlas_file: it.atlas && D.atlases[it.atlas] ? D.atlases[it.atlas].file : null, tile: { w: CARD_W, h: CARD_H } },
    data: {
      order: it.order, rarity: it.rarity, cost: it.cost, weight: it.weight, kind: it.kind,
      effect: it.effect, label: it.label, unlocked: it.unlocked, discovered: it.discovered,
      blueprint_compat: it.blueprint_compat, eternal_compat: it.eternal_compat, perishable_compat: it.perishable_compat,
      min_ante: it.min_ante, dollars: it.dollars, mult: it.mult, stake: it.stake, stake_level: it.stake_level,
      boss: it.boss, debuff: it.debuff, requires: it.requires, unlock_condition: it.unlock_condition,
      config: it.config,
    },
    raw: it.raw,
  };
}
function toCSV (list) {
  const cols = ['id', 'cat', 'set', 'name_en', 'name_zh', 'order', 'rarity', 'cost', 'weight', 'kind', 'effect', 'atlas', 'pos', 'unlocked', 'discovered', 'config'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const rows = [cols.join(',')];
  for (const it of list) {
    rows.push([
      it.id, it.cat, it.set, nm(it, 'en-us'), nm(it, 'zh_CN'), it.order, it.rarity ?? '', it.cost ?? '', it.weight ?? '',
      it.kind ?? '', it.effect ?? '', it.atlas ?? '', it.pos ? `${it.pos.x},${it.pos.y}` : '',
      it.unlocked ?? '', it.discovered ?? '', JSON.stringify(it.config || {}),
    ].map(q).join(','));
  }
  return rows.join('\r\n');
}
function downloadText (text, filename, type) { save(new Blob(['\ufeff' + text], { type: type || 'text/plain;charset=utf-8' }), filename); }

/* ------------------------------------------------------- animation / APNG */
const ANIM_FPS = 20;
/**
 * Build one loop of an animated effect.
 *
 * Two things made the first version feel wrong: the game's shimmers run on very slow
 * cycles (the foil sweep alone is a ~25-90 s pattern), so 2 s of real time barely moved,
 * and jumping from the last frame back to the first was a visible cut.
 *
 * Fixes: a time multiplier (speed) so a whole sweep fits into a few seconds, and a
 * ping-pong loop — forward through the frames then back — which is seamless by
 * construction because the step across the loop point equals every other step.
 */
function buildAnimFrames (spec, scale, opts) {
  opts = opts || {};
  const fps = opts.fps || ANIM_FPS;
  const speed = opts.speed || 1;
  const seconds = opts.seconds || 2.5;
  const pingpong = opts.pingpong !== false;
  const n = Math.max(3, Math.round(fps * seconds));
  const dt = speed / fps; // game-seconds per frame
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(compose(spec, scale, i * dt));
  if (pingpong) for (let i = n - 2; i >= 1; i--) frames.push(compose(spec, scale, i * dt));
  return { frames, delay: Math.round(1000 / fps) };
}
/** BlindChips is a 21-frame atlas; the pose repeats, and a forward loop is already seamless. */
function blindAnimFrames (it, scale) {
  const total = (atlas('blind_chips') || {}).frames || 21;
  const all = [];
  for (let i = 0; i < total; i++) all.push(compose({ standalone: { atlas: 'blind_chips', pos: { x: i, y: it.pos.y } } }, scale, phaseNow()));
  return { frames: collapseFrames(all), delay: 110 };
}
/** Mean per-pixel difference between two canvases, 0..1 of full scale. */
function frameDiff (a, b) {
  const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  const db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  let sum = 0; let n = 0;
  for (let i = 0; i < da.length; i += 4) {
    sum += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) + Math.abs(da[i + 3] - db[i + 3]);
    n += 4;
  }
  return sum / (n * 255);
}
/** How bad is the loop seam, relative to a normal frame-to-frame step? 1 = perfect. */
function loopSeamRatio (frames) {
  if (!frames || frames.length < 3) return null;
  const seam = frameDiff(frames[frames.length - 1], frames[0]);
  let acc = 0;
  for (let i = 0; i < frames.length - 1; i++) acc += frameDiff(frames[i], frames[i + 1]);
  const avg = acc / (frames.length - 1);
  return { seam, avg, ratio: avg > 0 ? seam / avg : 1 };
}
/* ------------------------------------------------------------ loop finding
 * Game effects are sums of sines driven by G.TIMERS.REAL, so a card really does repeat —
 * but only after the least common multiple of every term's period, which the source gives us:
 * a term like cos(t/53.1532) has period 2π·53.1532. Those are astronomically long on their own,
 * so the candidates are used as *hints* and each one is verified by rendering.
 * ------------------------------------------------------------------------- */
const TWO_PI = Math.PI * 2;

/** Candidate periods (seconds) suggested by the shader sources a spec uses. */
function sourcePeriodHints (src) {
  const out = [];
  // cos(t/53.1532) / sin(-t / 143.634) — a divisor under a trig term is a period in radians
  for (const m of src.matchAll(/(?:sin|cos)\s*\(\s*[-+]?\s*[A-Za-z_][\w.]*\s*\/\s*([\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.01) out.push(TWO_PI * v);
  }
  // uPhase.x*2.612 style: uPhase.x is REAL/28, so the angular rate is k/28
  for (const m of src.matchAll(/u?Phase\.x\s*\*\s*([\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.0001) out.push(TWO_PI * 28 / v);
  }
  for (const m of src.matchAll(/(?:uPhase|time|hologram\.g|foil\.y|holo\.y)\.y\s*\*\s*([\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.0001) out.push(TWO_PI / v);
  }
  return out;
}
/** Periods the floating-art animation itself uses (Card:draw soul_pos branch). */
const SOUL_PERIODS = [TWO_PI / 1.8, TWO_PI / 1.219];

/** Which shader programs this spec actually runs. */
function specShaderKeys (spec) {
  const keys = new Set();
  if (!spec) return keys;
  if (spec.setShader) keys.add(spec.setShader);
  if (spec.edition && spec.edition !== 'e_negative') keys.add(EDITION_SHADER[spec.edition] || spec.edition);
  if (spec.edition === 'e_negative') { keys.add('negative'); keys.add('negative_shine'); }
  if (spec.soul) keys.add(spec.soulHologram ? 'hologram' : 'dissolve');
  for (const st of (spec.stickers || (spec.sticker ? [spec.sticker] : []))) keys.add('voucher');
  if (spec.seal === 'Gold') keys.add('voucher');
  return keys;
}
function shaderSourceOf (key) {
  if (MOD_SHADERS[key]) return MOD_SHADERS[key];
  const sh = D.shaders.find((x) => x.name === key);
  return sh ? sh.source : '';
}
/** Mean disagreement between the animation at t and at t + period. */
function loopError (spec, period, samples) {
  let sum = 0;
  for (const t of samples) sum += frameDiff(compose(spec, 1, t), compose(spec, 1, t + period));
  return sum / samples.length;
}
const periodCache = new Map();
const specKey = (spec) => JSON.stringify([spec.center, spec.front, spec.edition, spec.setShader, spec.soul, spec.soulHologram, spec.stickers, spec.sticker, spec.seal]);

/**
 * Smallest period at which the card visibly repeats, or null when none is found within
 * `maxSeconds`. Candidates come from the shader source; each is verified by rendering.
 */
function detectPeriod (spec, maxSeconds) {
  maxSeconds = maxSeconds || 40;
  const ck = specKey(spec);
  if (periodCache.has(ck)) return periodCache.get(ck);
  let best = null;
  try {
    const hints = new Set();
    for (const k of specShaderKeys(spec)) {
      if (k === 'dissolve') continue;
      for (const p of sourcePeriodHints(shaderSourceOf(k))) hints.add(p);
    }
    if (spec.soul) for (const p of SOUL_PERIODS) hints.add(p);
    if (!hints.size) { periodCache.set(ck, null); return null }
    // a period may be any multiple of the base frequencies
    const cands = new Set();
    for (const p of hints) {
      if (!(p > 0.05)) continue;
      for (let n = 1; n <= 12; n++) {
        const v = p * n;
        if (v <= maxSeconds) cands.add(Math.round(v * 1000) / 1000);
      }
    }
    const list = [...cands].sort((a, b) => a - b).slice(0, 60);
    const samples = [0, 0.37, 1.11];
    // A loop is seamless when its seam is no worse than one ordinary frame step at the current
    // fps/speed — the same yardstick the seam ratio uses. Exact equality is far too strict:
    // the floating-art terms 2π/1.8 and 2π/1.219 only line up approximately (≈10.47s).
    const dt = (S.anim.speed || 1) / (S.anim.fps || 20);
    let step = 0;
    for (const t of [0, 1.3]) step += frameDiff(compose(spec, 1, t), compose(spec, 1, t + dt));
    step = Math.max(1e-4, step / 2);
    const tol = Math.max(step * 1.3, 0.0015);
    for (const p of list) {
      const e = loopError(spec, p, samples);
      if (e <= tol) { best = p; break }
    }
  } catch (e) { best = null }
  periodCache.set(ck, best);
  return best;
}

const LOOP_MODES = [
  ['auto', '🔁 循环：自动找循环点'],
  ['pingpong', '↔ 循环：来回（无接缝）'],
  ['forward', '→ 循环：单向'],
];
const loopLabel = () => (LOOP_MODES.find((m) => m[0] === (S.anim.loop || 'auto')) || LOOP_MODES[0])[1];
const cycleLoop = () => {
  const i = LOOP_MODES.findIndex((m) => m[0] === (S.anim.loop || 'auto'));
  S.anim.loop = LOOP_MODES[(i + 1) % LOOP_MODES.length][0];
  S.anim.pingpong = S.anim.loop !== 'forward';
  return S.anim.loop;
};

/** Current animation settings, shared by the forge and the detail panel. */
function animOpts (spec) {
  const base = { fps: S.anim.fps, speed: S.anim.speed, seconds: S.anim.seconds, pingpong: S.anim.pingpong };
  const mode = S.anim.loop || 'auto';
  if (mode === 'forward') { base.pingpong = false; return base }
  if (mode === 'pingpong') { base.pingpong = true; return base }
  // auto: use the detected loop when there is one, so the export repeats exactly
  if (!spec) return base;
  const p = detectPeriod(spec);
  if (p) {
    base.pingpong = false;
    base.period = p;
    base.seconds = Math.max(0.4, Math.min(30, p / (base.speed || 1)));
    base.autoPeriod = p;
  }
  return base;
}
/** If the menu selection changes, any in-flight animation must restart from frame 0. */
function renderAnim (spec, scale, done, fps, seconds) {
  const r = buildAnimFrames(spec, scale, Object.assign(animOpts(spec), { fps: fps || S.anim.fps, seconds: seconds || S.anim.seconds }));
  done(r.frames, r.delay);
}
function canvasPngBytes (cv) {
  return new Promise((res) => cv.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), 'image/png'));
}
function pngChunk (type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function parsePngChunks (u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const out = [];
  let p = 8;
  while (p + 8 <= u8.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
    out.push({ type, data: u8.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return out;
}
/**
 * Build an APNG (.png with acTL/fcTL/fdAT) out of full frames. APNG is used instead of
 * GIF so the cards keep their alpha channel and full colour.
 */
async function encodeAPNG (frames, delayMs) {
  if (!frames.length) return null;
  const pngs = [];
  for (const f of frames) pngs.push(await canvasPngBytes(f));
  const first = parsePngChunks(pngs[0]);
  const ihdr = first.find((c) => c.type === 'IHDR');
  const hv = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, 8);
  const W = hv.getUint32(0); const H = hv.getUint32(4);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  parts.push(pngChunk('IHDR', ihdr.data));
  const actl = new Uint8Array(8);
  const av = new DataView(actl.buffer);
  av.setUint32(0, frames.length); av.setUint32(4, 0); // 0 plays = loop forever
  parts.push(pngChunk('acTL', actl));
  let seq = 0;
  const fcTL = () => {
    const b = new Uint8Array(26);
    const v = new DataView(b.buffer);
    v.setUint32(0, seq++);
    v.setUint32(4, W); v.setUint32(8, H);
    v.setUint32(12, 0); v.setUint32(16, 0);
    v.setUint16(20, delayMs); v.setUint16(22, 1000);
    b[24] = 0; // dispose: none
    b[25] = 0; // blend: source (full frames overwrite)
    return b;
  };
  parts.push(pngChunk('fcTL', fcTL()));
  for (const c of first) if (c.type === 'IDAT') parts.push(pngChunk('IDAT', c.data));
  for (let i = 1; i < pngs.length; i++) {
    const cs = parsePngChunks(pngs[i]);
    parts.push(pngChunk('fcTL', fcTL()));
    for (const c of cs) {
      if (c.type !== 'IDAT') continue;
      const d = new Uint8Array(4 + c.data.length);
      new DataView(d.buffer).setUint32(0, seq++);
      d.set(c.data, 4);
      parts.push(pngChunk('fdAT', d));
    }
  }
  parts.push(pngChunk('IEND', new Uint8Array(0)));
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function saveAnimAPNG (frames, delayMs, filename) {
  const bytes = await encodeAPNG(frames, delayMs);
  if (!bytes) { toast('动画生成失败'); return; }
  save(bytes, filename, 'image/png');
  toast(`已导出动图：${frames.length} 帧 / ${(bytes.length / 1024).toFixed(0)} KB`);
}
async function saveFrameZip (frames, delayMs, filename) {
  const enc = new TextEncoder();
  const files = [];
  for (let i = 0; i < frames.length; i++) files.push({ name: `frame_${String(i).padStart(3, '0')}.png`, data: await canvasPngBytes(frames[i]) });
  files.push({ name: 'README.txt', data: enc.encode(
    'Balatro 动画帧序列\r\n==================\r\n' +
    `帧数: ${frames.length}\r\n帧率: ${Math.round(1000 / delayMs)} fps\r\n时长: ${(frames.length * delayMs / 1000).toFixed(2)} 秒（循环）\r\n` +
    `导出时间: ${new Date().toLocaleString()}\r\n\r\n` +
    '每帧为 142×190 的透明背景 PNG，可直接导入 PR / AE / Aseprite 合成视频或 GIF。\r\n') });
  save(zipStore(files), filename, 'application/zip');
  toast(`已导出 ${frames.length} 帧 → ZIP`);
}

/* ------------------------------------------------------------------ GIF89a
 * APNG keeps full colour and alpha but only browsers animate it — Windows'
 * built-in photo viewer just shows frame 1. GIF plays everywhere, so we ship
 * both. 256 colours is a hard GIF limit, so the palette comes from either an
 * exact colour list (pixel art usually fits) or median-cut quantisation.
 */
function medianCutPalette (colors, maxColors) {
  let boxes = [colors];
  while (boxes.length < maxColors) {
    let pick = -1; let bestScore = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.length < 2) continue;
      let mn0 = 255; let mn1 = 255; let mn2 = 255; let mx0 = 0; let mx1 = 0; let mx2 = 0; let n = 0;
      for (const c of b) {
        const r = c.rgb[0]; const g = c.rgb[1]; const bl = c.rgb[2];
        if (r < mn0) mn0 = r; if (r > mx0) mx0 = r;
        if (g < mn1) mn1 = g; if (g > mx1) mx1 = g;
        if (bl < mn2) mn2 = bl; if (bl > mx2) mx2 = bl;
        n += c.n;
      }
      const range = Math.max(mx0 - mn0, mx1 - mn1, mx2 - mn2);
      const score = range * Math.log(1 + n);
      if (score > bestScore) { bestScore = score; pick = i; }
    }
    if (pick < 0) break;
    const b = boxes[pick];
    let mn = [255, 255, 255]; const mx = [0, 0, 0];
    for (const c of b) for (let k = 0; k < 3; k++) { if (c.rgb[k] < mn[k]) mn[k] = c.rgb[k]; if (c.rgb[k] > mx[k]) mx[k] = c.rgb[k] }
    let axis = 0; let best = -1;
    for (let k = 0; k < 3; k++) { const r = mx[k] - mn[k]; if (r > best) { best = r; axis = k } }
    b.sort((x, y) => x.rgb[axis] - y.rgb[axis]);
    let total = 0; for (const c of b) total += c.n;
    let acc = 0; let si = 1;
    for (let i = 0; i < b.length - 1; i++) { acc += b[i].n; if (acc >= total / 2) { si = i + 1; break } }
    boxes.splice(pick, 1, b.slice(0, si), b.slice(si));
    mn = null;
  }
  return boxes.map((b) => {
    let r = 0; let g = 0; let bl = 0; let n = 0;
    for (const c of b) { r += c.rgb[0] * c.n; g += c.rgb[1] * c.n; bl += c.rgb[2] * c.n; n += c.n }
    return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
  });
}
/**
 * A few Lloyd (k-means) iterations on top of the median-cut result: every palette entry moves to
 * the weighted mean of the colours that map to it. Cheap on a capped histogram, and it visibly
 * cleans up the smooth gradients the shader effects produce.
 */
function refinePalette (colors, palette, iterations) {
  let cur = palette.map((c) => c.slice());
  const step = colors.length > 4096 ? Math.ceil(colors.length / 4096) : 1;
  const sample = step > 1 ? colors.filter((_, i) => i % step === 0) : colors;
  for (let it = 0; it < iterations; it++) {
    const acc = cur.map(() => [0, 0, 0, 0]);
    for (const c of sample) {
      let bi = 0; let bd = Infinity;
      for (let i = 0; i < cur.length; i++) {
        const p = cur[i];
        const dr = c.rgb[0] - p[0]; const dg = c.rgb[1] - p[1]; const db = c.rgb[2] - p[2];
        const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
        if (d < bd) { bd = d; bi = i }
      }
      const a = acc[bi];
      a[0] += c.rgb[0] * c.n; a[1] += c.rgb[1] * c.n; a[2] += c.rgb[2] * c.n; a[3] += c.n;
    }
    cur = acc.map((a, i) => (a[3] > 0
      ? [Math.round(a[0] / a[3]), Math.round(a[1] / a[3]), Math.round(a[2] / a[3])]
      : cur[i]));
  }
  return cur;
}

/**
 * Floyd–Steinberg error diffusion. GIF has 256 colours at most, and these shader gradients band
 * badly without it; with it the eye blends neighbouring pixels back into the missing colours.
 */
function ditherFrame (data, W, H, palette, nearest, colorBase, transparentIndex, bg) {
  const out = new Uint8Array(W * H);
  const e0 = new Float32Array((W + 2) * 3);
  const e1 = new Float32Array((W + 2) * 3);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < H; y++) {
    e1.fill(0);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const alpha = data[i + 3];
      if (bg === null && alpha < 128) { out[y * W + x] = transparentIndex; continue }
      let r = data[i]; let g = data[i + 1]; let b = data[i + 2];
      if (bg !== null) {
        const af = alpha / 255;
        r = r * af + bg[0] * (1 - af); g = g * af + bg[1] * (1 - af); b = b * af + bg[2] * (1 - af);
      }
      const o = (x + 1) * 3;
      r = clamp(Math.round(r + e0[o]));
      g = clamp(Math.round(g + e0[o + 1]));
      b = clamp(Math.round(b + e0[o + 2]));
      const pi = nearest(r, g, b);
      out[y * W + x] = colorBase + pi;
      const c = palette[pi];
      const dr = r - c[0]; const dg = g - c[1]; const db = b - c[2];
      e0[o + 3] += dr * 0.4375; e0[o + 4] += dg * 0.4375; e0[o + 5] += db * 0.4375;
      e1[o - 3] += dr * 0.1875; e1[o - 2] += dg * 0.1875; e1[o - 1] += db * 0.1875;
      e1[o] += dr * 0.3125; e1[o + 1] += dg * 0.3125; e1[o + 2] += db * 0.3125;
      e1[o + 3] += dr * 0.0625; e1[o + 4] += dg * 0.0625; e1[o + 5] += db * 0.0625;
    }
    e0.set(e1);
  }
  return out;
}

/** Build a palette (list of rgb triplets) plus a nearest-colour cache. */
function buildGifPalette (frames, bg, maxColors, refine) {
  const hist = new Map();
  for (const d of frames) {
    for (let i = 0; i < d.length; i += 4) {
      if (bg === null && d[i + 3] < 128) continue;
      let r; let g; let b;
      if (bg === null) { r = d[i]; g = d[i + 1]; b = d[i + 2] } else {
        const a = d[i + 3] / 255;
        r = Math.round(d[i] * a + bg[0] * (1 - a));
        g = Math.round(d[i + 1] * a + bg[1] * (1 - a));
        b = Math.round(d[i + 2] * a + bg[2] * (1 - a));
      }
      const key = (r << 16) | (g << 8) | b;
      const e = hist.get(key);
      if (e) e.n++; else hist.set(key, { rgb: [r, g, b], n: 1 });
    }
  }
  const list = [...hist.values()].sort((a, b) => b.n - a.n);
  let palette;
  if (list.length <= maxColors) palette = list.map((c) => c.rgb);
  else {
    palette = medianCutPalette(list, maxColors);
    // k-means polish: median-cut boxes are axis-aligned, this pulls the entries onto the
    // real colour clusters
    if (refine !== false && palette.length > 2) palette = refinePalette(list, palette, 4);
  }
  if (!palette.length) palette = [[0, 0, 0]];
  const cache = new Map();
  const nearest = (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let bi = 0; let bd = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const dr = p[0] - r; const dg = p[1] - g; const db = p[2] - b;
      const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
      if (d < bd) { bd = d; bi = i; if (!d) break }
    }
    cache.set(key, bi);
    return bi;
  };
  return { palette, nearest };
}
function lzwEncode (indices, minCodeSize) {
  const out = [];
  let cur = 0; let curBits = 0;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let dict = new Map();
  const emit = (code) => {
    cur |= code << curBits; curBits += codeSize;
    while (curBits >= 8) { out.push(cur & 0xff); cur >>>= 8; curBits -= 8 }
  };
  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = dict.get(key);
    if (found !== undefined) { prefix = found; continue }
    emit(prefix);
    if (nextCode === 4096) { emit(clearCode); dict = new Map(); nextCode = eoiCode + 1; codeSize = minCodeSize + 1; } else {
      if (nextCode >= (1 << codeSize)) codeSize++;
      dict.set(key, nextCode++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoiCode);
  if (curBits > 0) out.push(cur & 0xff);
  return new Uint8Array(out);
}
/** Encode canvases into an animated GIF89a. bg = null keeps transparency. */
function encodeGIF (frames, delayMs, bg, opts) {
  opts = opts || {};
  const want = opts.colors || 256;
  const W = frames[0].width; const H = frames[0].height;
  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);
  // index 0 is reserved for transparency, so the rest of the table is what is left
  const maxColors = Math.min(want, bg === null ? 255 : 256);
  const { palette, nearest } = buildGifPalette(datas, bg, maxColors, opts.refine);
  const globalTable = bg === null ? [[0, 0, 0], ...palette] : palette;
  let gctBits = 1; while ((1 << gctBits) < globalTable.length) gctBits++;
  if (gctBits > 8) gctBits = 8;
  const gctSize = 1 << gctBits;
  const transparentIndex = bg === null ? 0 : -1;
  const colorBase = bg === null ? 1 : 0;

  const bytes = [];
  const push = (...v) => { for (const x of v) bytes.push(x & 0xff) };
  const pushStr = (s) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)) };
  const push16 = (v) => { bytes.push(v & 0xff, (v >> 8) & 0xff) };

  pushStr('GIF89a');
  push16(W); push16(H);
  push(0x80 | ((gctBits - 1) << 4) | (gctBits - 1), 0, 0); // global table, colour res, size
  for (let i = 0; i < gctSize; i++) { const c = globalTable[i] || [0, 0, 0]; push(c[0], c[1], c[2]) }
  // NETSCAPE looping extension
  push(0x21, 0xff, 0x0b); pushStr('NETSCAPE2.0'); push(0x03, 0x01); push16(0); push(0);

  const delay = Math.max(2, Math.round(delayMs / 10));
  const dither = opts.dither !== false;
  for (let fi = 0; fi < datas.length; fi++) {
    const d = datas[fi];
    // Floyd–Steinberg when enabled: 256 colours band badly on these gradients without it
    const indices = dither
      ? ditherFrame(d, W, H, palette, nearest, colorBase, transparentIndex, bg)
      : (() => {
          const idx = new Uint8Array(W * H);
          for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            const a = d[i + 3];
            if (bg === null) {
              if (a < 128) { idx[p] = transparentIndex; continue }
              idx[p] = colorBase + nearest(d[i], d[i + 1], d[i + 2]);
            } else {
              const af = a / 255;
              idx[p] = nearest(
                Math.round(d[i] * af + bg[0] * (1 - af)),
                Math.round(d[i + 1] * af + bg[1] * (1 - af)),
                Math.round(d[i + 2] * af + bg[2] * (1 - af)));
            }
          }
          return idx;
        })();
    // graphic control extension
    push(0x21, 0xf9, 0x04, (2 << 2) | (transparentIndex >= 0 ? 1 : 0));
    push16(delay);
    push(transparentIndex >= 0 ? transparentIndex : 0, 0);
    // image descriptor
    push(0x2c); push16(0); push16(0); push16(W); push16(H); push(0);
    const lzw = lzwEncode(indices, 8);
    push(8);
    for (let i = 0; i < lzw.length; i += 255) {
      const n = Math.min(255, lzw.length - i);
      push(n);
      for (let k = 0; k < n; k++) bytes.push(lzw[i + k]);
    }
    push(0);
  }
  return new Uint8Array(bytes);
}
async function saveAnimGIF (frames, delayMs, filename, bg) {
  // GIF gets big fast: halve the frame count (doubling the delay) beyond 24 frames.
  let f = frames;
  let d = delayMs;
  while (f.length > 40) { f = f.filter((_, i) => i % 2 === 0); d *= 2 }
  const bytes = encodeGIF(f, d, bg, { colors: S.gifColors, dither: S.gifDither });
  save(bytes, filename, 'image/gif');
  toast(`已导出 GIF：${f.length} 帧 / ${(bytes.length / 1024).toFixed(0)} KB`);
}
/** Does this catalogue entry have anything that actually moves? */
function hasAnim (it) {
  const s = specForItem(it);
  if (!s) return false;
  if (s.standalone) return s.standalone.atlas === 'blind_chips';
  const st = s.stickers || (s.sticker ? [s.sticker] : []);
  return !!(s.edition || s.setShader || s.soul || st.length || s.seal === 'Gold');
}
/** BlindChips holds one pose for most of its 21 frames; drop the duplicates for export. */
function collapseFrames (frames) {
  const out = [];
  let last = null;
  for (const f of frames) {
    const h = quickHash(f);
    if (h === last) continue;
    last = h;
    out.push(f);
  }
  return out.length ? out : frames;
}
function quickHash (cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let h = 2166136261;
  for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

/* ------------------------------------------------------------- rendering */
const IO = ('IntersectionObserver' in window)
  ? new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) { const f = e.target._paint; if (f) { f(); } IO.unobserve(e.target); } } }, { rootMargin: '300px' })
  : null;
/** Aspect-preserving display width so bigger boxes (boosters) really look bigger. */
const previewWidth = (cv, base) => Math.round((base || 110) * cv.width / (CARD_W * 3));
function paintInto (cv, spec, scale) {
  const src = compose(spec, scale);
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.imageSmoothingEnabled = false;
  const r = Math.min(cv.width / src.width, cv.height / src.height);
  const w = src.width * r, h = src.height * r;
  ctx.drawImage(src, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
}

function cellEl (it) {
  const el = document.createElement('div');
  el.className = 'cell' + (S.sel === it.id ? ' on' : '');
  el.dataset.id = it.id;
  const spec = specForItem(it);
  const box = document.createElement('div');
  box.style.height = '96px'; box.style.display = 'flex'; box.style.alignItems = 'center'; box.style.justifyContent = 'center';
  el.appendChild(box);
  let painted = false;
  const paint = () => { if (painted || !spec) return; painted = true; const cv = newCanvas(CARD_W * 2, CARD_H * 2); paintInto(cv, spec, 2); cv.style.width = '71px'; cv.style.height = '95px'; box.innerHTML = ''; box.appendChild(cv); };
  if (spec) {
    const ph = document.createElement('div');
    ph.style.cssText = 'width:71px;height:95px;border-radius:4px;background:#1a242e';
    box.appendChild(ph);
    if (IO) { el._paint = paint; IO.observe(el); } else paint();
  } else {
    box.innerHTML = '<div style="font-size:26px;opacity:.35">◈</div>';
  }
  const n = document.createElement('div'); n.className = 'nm'; n.textContent = nm(it); n.title = nm(it);
  const m = document.createElement('div'); m.className = 'meta';
  m.textContent = [it.rarity ? RARITY[it.rarity] : null, it.cost != null ? '$' + it.cost : null, it.kind || null].filter(Boolean).join(' · ') || it.id;
  const b = document.createElement('div'); b.className = 'badge'; b.textContent = categoryLabel(it.cat);
  el.appendChild(n); el.appendChild(m); el.appendChild(b);
  if (it.source) {
    const md = document.createElement('div'); md.className = 'modtag';
    md.textContent = 'MOD'; md.title = (it.sourceName || it.source) + ' · ' + it.id;
    el.appendChild(md);
  }
  if (it.boss_colour) {
    const e = document.createElement('div'); e.className = 'eyebrow'; e.textContent = 'BOSS';
    e.style.color = it.boss_colour.hex || ''; if (it.source) e.style.top = '22px'; el.appendChild(e);
  }
  el.onclick = () => selectItem(it.id);
  return el;
}

/* ------------------------------------------------------------- sidebar */
const CATS = [
  ['all', '全部', '✦'], ['Joker', '小丑牌', '♣'], ['Tarot', '塔罗牌', '✧'], ['Planet', '星球牌', '◉'],
  ['Spectral', '幽灵牌', '☾'], ['Voucher', '优惠券', '❖'], ['Booster', '补充包', '▣'], ['Deck', '牌组', '▤'],
  ['Enhancement', '强化牌', '◆'], ['Edition', '版本/闪卡', '✶'], ['Seal', '蜡封', 'Ⓢ'], ['Sticker', '贴纸', '★'],
  ['Tag', '标签', '▸'], ['Blind', '盲注', '☠'], ['Stake', '底注/筹码', '⬢'],
  ['PlayingCard', '扑克牌', '🂡'], ['Collab', '联动牌面', '⇄'], ['Overlay', '叠加层', '⁂'],
  ['Base', '底框', '▢'], ['Other', '其它', '·'],
  ['Challenge', '挑战', '⚑'],
];
function renderSidebar () {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  const group = (label) => { const g = document.createElement('div'); g.className = 'catgroup'; g.textContent = label; sb.appendChild(g) };
  const row = (name, icon, n, active, onclick, title) => {
    const el = document.createElement('div');
    el.className = 'cat' + (active ? ' on' : '');
    el.innerHTML = `<span class="k">${icon}</span><span>${esc(name)}</span>${n == null ? '' : `<span class="cnt">${n}</span>`}`;
    if (title) el.title = title;
    el.onclick = onclick;
    sb.appendChild(el);
    return el;
  };
  const pickCat = (key) => () => { S.cat = key; S.tab = 'codex'; closeDrawers(); render() };
  const pickTool = (k) => () => { S.tab = k; closeDrawers(); render() };
  const pickSource = (src) => () => { S.source = src; S.cat = 'all'; S.tab = 'codex'; S.sel = null; closeDrawers(); render() };

  const base = sourceItems();
  const per = (k) => base.filter((i) => i.cat === k).length;
  const knownCat = new Set(CATS.map((c) => c[0]));

  group('图鉴');
  row('全部', '✦', base.length, S.cat === 'all', pickCat('all'));
  for (const [label, cats] of [['卡牌与消耗品', CATS.slice(1, 6)], ['牌组与强化', CATS.slice(6, 13)], ['其它资源', CATS.slice(13)]]) {
    const visible = cats.filter(([k]) => per(k) > 0);
    if (!visible.length) continue;
    group(label);
    for (const [key, name, icon] of visible) row(name, icon, per(key), S.cat === key, pickCat(key));
  }
  const extra = [...new Set(base.map((i) => i.cat))].filter((k) => !knownCat.has(k)).sort();
  if (extra.length) {
    group('Mod 新增类型');
    for (const k of extra) row(categoryLabel(k), '◇', per(k), S.cat === k, pickCat(k), k);
  }
  if (MODS.length) {
    group('来源');
    row('全部来源', '∑', ITEMS.length, S.source === 'all', pickSource('all'));
    row('原版 Balatro', '◈', ITEMS.filter((i) => !i.source).length, S.source === 'vanilla', pickSource('vanilla'));
    for (const m of MODS) row(m.name, '⊕', ITEMS.filter((i) => i.source === m.id).length, S.source === m.id, pickSource(m.id), m.id);
  }
  group('工具');
  for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤'], ['mods', '导入 Mod', '⊕']]) {
    row(label, icon, k === 'mods' && MODS.length ? MODS.length : null, S.tab === k, pickTool(k));
  }
}

/* ------------------------------------------------------------- views */
function currentList () {
  const base = sourceItems();
  let list = S.cat === 'all' ? base : base.filter((i) => i.cat === S.cat);
  list = search(list, S.q);
  return sortItems(list, S.sort);
}

function viewCodex (root) {
  const list = currentList();
  const head = document.createElement('div');
  head.className = 'listhead';
  head.innerHTML = `<h2>${(CATS.find((c) => c[0] === S.cat) || [, '全部'])[1]}</h2>` +
    `<span class="sub">${list.length} / ${ITEMS.length} 项</span><span class="spacer"></span>`;
  if (S.source !== 'all') {
    // the source filter is a shortcut, so make the way back just as short
    const mod = MODS.find((m) => m.id === S.source);
    const chip = document.createElement('button');
    chip.className = 'tbtn srcchip';
    chip.innerHTML = `来源：<b>${esc(S.source === 'vanilla' ? '原版 Balatro' : (mod ? mod.name : S.source))}</b> <span class="x">✕</span>`;
    chip.title = '清除来源筛选，显示全部条目';
    chip.onclick = () => { S.source = 'all'; S.cat = 'all'; render(); toast('已显示全部来源') };
    head.appendChild(chip);
  }
  const sel = document.createElement('select'); sel.className = 'tbtn';
  for (const [v, t] of [['order', '游戏顺序'], ['orderDesc', '逆序'], ['name', '名称'], ['cost', '费用'], ['rarity', '稀有度'], ['id', 'ID'], ['atlas', '图集位置']]) {
    const o = document.createElement('option'); o.value = v; o.textContent = '排序：' + t; if (S.sort === v) o.selected = true; sel.appendChild(o);
  }
  sel.onchange = () => { S.sort = sel.value; render(); };
  head.appendChild(sel);
  const exp = document.createElement('button'); exp.className = 'tbtn'; exp.textContent = '⤓ 导出当前结果';
  exp.onclick = () => exportList(list);
  head.appendChild(exp);
  root.appendChild(head);

  if (!list.length) { root.appendChild(Object.assign(document.createElement('div'), { className: 'empty-note', textContent: '没有匹配的条目，试试搜索别的关键词。' })); return; }
  const grid = document.createElement('div');
  grid.className = 'grid' + (S.view === 'small' ? ' small' : S.view === 'large' ? ' large' : '');
  for (const it of list) grid.appendChild(cellEl(it));
  root.appendChild(grid);
}

async function exportList (list) {
  toast(`正在打包 ${list.length} 项…`);
  await ALL_READY;
  const files = [];
  const manifest = [];
  for (const it of list) {
    const spec = specForItem(it);
    if (!spec) continue;
    const cv = compose(spec, 2);
    await ensureDrawn();
    files.push({ name: `png/${safeName(it.cat)}/${safeName(it.id)}.png`, data: await canvasBytes(cv) });
    manifest.push(itemJSON(it));
  }
  const enc = new TextEncoder();
  files.push({ name: 'manifest.json', data: enc.encode(JSON.stringify({ meta: D.meta, count: manifest.length, items: manifest }, null, 1)) });
  files.push({ name: 'data.csv', data: new TextEncoder().encode('\ufeff' + toCSV(list)) });
  files.push({ name: 'README.txt', data: enc.encode(
    'Balatro 素材导出包\r\n' +
    '================\r\n' +
    `来源: ${D.meta.source} / 游戏版本 ${D.meta.version}\r\n` +
    `导出条目: ${manifest.length}\r\n` +
    `导出时间: ${new Date().toLocaleString()}\r\n\r\n` +
    '目录结构:\r\n' +
    '  png/<分类>/<id>.png   已合成好的独立贴图（含强化/蜡封/版本特效）\r\n' +
    '  manifest.json         全部条目的名称、描述、数值与图集坐标\r\n' +
    '  data.csv              可导入表格软件的扁平数据\r\n\r\n' +
    '说明: 每张 PNG 均为 2x 原始像素（142x190），透明背景。\r\n' +
    '图集坐标格式为 {atlas, pos:{x,y}}，对应游戏 Atlas 中的列/行。\r\n') });
  save(zipStore(files), `balatro-assets-${safeName(S.cat)}-${Date.now()}.zip`, 'application/zip');
  toast(`已导出 ${manifest.length} 项 → ZIP`);
}

/* ---------------------------------------------------------------- forge */
/** The eight coloured stake stickers (they all share one sprite sheet position family). */
const STICKER_COLORS = ['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'].map((k) => ({ key: k }));
/* The forge is rebuilt from ITEMS on every render, because importing a mod can add whole
   categories (Cryptid alone brings 224 jokers, 34 code cards, 17 sleeves, …). */
let FORGE_CARDS = [];
let FORGE_ENH = [];
let FORGE_EDITIONS = [];
let FORGE_SEALS = [];
let FORGE_BACKS = [];
let FORGE_TYPES = [];

/**
 * Which extra layers the game can legally attach to each kind of centre.
 * Seals only exist on playing cards; eternal/perishable/rental stickers only on jokers.
 * A category a mod invented allows the edition layer only — we cannot know its rules.
 */
const FORGE_TYPES_BASE = [
  { id: 'PlayingCard', name: '扑克牌', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: true } },
  { id: 'Joker', name: '小丑牌', allows: { enhancement: false, seal: false, sticker: true, edition: true, back: false } },
  { id: 'Collab', name: '联动牌面', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: false } },
  { id: 'Tarot', name: '塔罗牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Planet', name: '星球牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Spectral', name: '幽灵牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Voucher', name: '优惠券', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Booster', name: '补充包', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
];
const MOD_ALLOWS = { enhancement: false, seal: false, sticker: false, edition: true, back: false };

function refreshForgeLists () {
  FORGE_CARDS = ITEMS.filter((i) => i.cat === 'PlayingCard');
  FORGE_ENH = ITEMS.filter((i) => i.cat === 'Enhancement');
  FORGE_EDITIONS = ITEMS.filter((i) => i.cat === 'Edition');
  FORGE_SEALS = ITEMS.filter((i) => i.cat === 'Seal');
  FORGE_BACKS = ITEMS.filter((i) => i.cat === 'Deck');
  const count = (id) => ITEMS.filter((i) => i.cat === id).length;
  FORGE_TYPES = FORGE_TYPES_BASE
    .filter((t) => count(t.id) > 0)
    .map((t) => ({ id: t.id, name: t.name, label: t.name + ' (' + count(t.id) + ')', allows: t.allows }));
  const known = new Set(FORGE_TYPES_BASE.map((t) => t.id));
  const extra = [...new Set(ITEMS.map((i) => i.cat))].filter((c) => !known.has(c) && count(c) > 0);
  const vanillaCats = new Set(['all', 'Base', 'Other', 'Atlas', 'Shader', 'Hand', 'Overlay', 'Challenge', 'Stake', 'Tag', 'Blind', 'DeckSkin', 'PokerHand']);
  for (const c of extra) {
    if (vanillaCats.has(c)) continue;
    FORGE_TYPES.push({ id: c, name: categoryLabel(c), label: categoryLabel(c) + ' (' + count(c) + ')', allows: MOD_ALLOWS, mod: true });
  }
  // the currently selected subject may have come from a mod that was just unloaded
  if (!FORGE_TYPES.some((t) => t.id === S.forge.baseType)) S.forge.baseType = FORGE_TYPES[0].id;
  const cur = BY_ID[S.forge.base];
  if (!cur || cur.cat !== S.forge.baseType) {
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    S.forge.base = first ? first.id : S.forge.base;
  }
}
const forgeType = (id) => FORGE_TYPES.find((t) => t.id === id) || FORGE_TYPES[0];
const forgeBaseList = (typeId, q) => {
  let list = ITEMS.filter((i) => i.cat === typeId);
  if (q) {
    const s = q.toLowerCase();
    list = list.filter((i) => buildBlob(i).includes(s));
  }
  return list;
};
function forgeBaseItem () {
  const b = BY_ID[S.forge.base];
  if (b && b.cat === S.forge.baseType) return b;
  return ITEMS.find((i) => i.cat === S.forge.baseType) || BY_ID['S_A'];
}

function forgeSpec () {
  const F = S.forge;
  const type = forgeType(F.baseType);
  const a = type.allows;
  const base = forgeBaseItem();
  const back = BY_ID[F.back];
  const spec = {
    highContrast: F.variants,
    edition: a.edition ? editionShaderOf(BY_ID[F.edition]) : null,
    seal: a.seal ? F.seal : null,
  };
  if (a.sticker) {
    // card.lua: set_eternal requires eternal_compat and NOT perishable;
    // set_perishable requires perishable_compat and NOT eternal; rental is unrestricted.
    const list = [];
    if (F.stickers.eternal && base.eternal_compat) list.push('eternal');
    if (F.stickers.perishable && base.perishable_compat) list.push('perishable');
    if (F.stickers.rental) list.push('rental');
    if (F.stickers.color) list.push(F.stickers.color);
    spec.stickers = list;
  }
  if (type.id === 'PlayingCard' || type.id === 'Collab') {
    const enh = a.enhancement && F.enhancement ? BY_ID[F.enhancement] : null;
    const face = type.id === 'Collab'
      ? { atlas: base.atlas, atlas2: base.atlas2, pos: base.pos }
      : { atlas: F.variants ? 'cards_2' : 'cards_1', pos: base.pos };
    spec.center = enh && enh.id !== 'none'
      ? { atlas: 'centers', pos: enh.pos, stoneNoFront: enh.id === 'm_stone' }
      : { atlas: 'centers', pos: COM.baseCenter.pos };
    spec.front = F.showFront ? face : null;
    spec.back = F.showFront ? null : { atlas: 'centers', pos: back ? back.pos : { x: 0, y: 0 } };
  } else {
    spec.center = (base.atlas && base.pos) ? { atlas: base.atlas, pos: base.pos } : null;
    if (base.setShader) spec.setShader = base.setShader;
    if (base.soul) spec.soul = base.soul;
    if (base.box) spec.box = base.box;
    if (base.id === 'j_hologram') spec.soulHologram = true;
  }
  return spec;
}
function viewForge (root) {
  refreshForgeLists();
  const wrap = document.createElement('div'); wrap.className = 'forge';
  const left = document.createElement('div'); left.className = 'preview';
  const right = document.createElement('div'); right.className = 'opts';
  const nav = document.createElement('div'); nav.className = 'forgenav';
  wrap.appendChild(left); wrap.appendChild(right); right.appendChild(nav); root.appendChild(wrap);

  /* ---- collapsing: a long column is fine as long as you can put things away ---- */
  const NAV_GROUPS = [
    ['basetype', '牌型'], ['base', '主体'], ['enh', '强化'], ['ed', '版本'], ['seal', '蜡封'],
    ['stick', '贴纸'], ['back', '牌背'], ['view', '显示'],
  ];
  const openState = () => {
    if (!S.forge.open) {
      // first visit: keep only what most people reach for, so the column is not endless
      const all = { basetype: true, base: true, enh: true, ed: true, seal: true, stick: false, back: false, view: false, summary: !isNarrow(), export: true, anim: false };
      S.forge.open = isNarrow()
        ? Object.assign({}, all, { enh: false, ed: false, seal: false, summary: false, export: false, anim: false })
        : all;
    }
    return S.forge.open;
  };
  const isOpen = (key) => !!openState()[key];
  const applyOpen = (box, key) => { box.classList.toggle('collapsed', !isOpen(key)) };
  const syncNav = () => {
    for (const b of nav.querySelectorAll('.nv[data-gkey]')) b.classList.toggle('on', isOpen(b.dataset.gkey));
    for (const g of groups) if (g.label && g.cur) g.cur.textContent = g.label();
  };
  const toggleOpen = (key, force) => {
    const o = openState();
    o[key] = force === undefined ? !o[key] : !!force;
    for (const el of document.querySelectorAll('#content .opt[data-gkey="' + key + '"]')) applyOpen(el, key);
    syncNav();
  };
  /** A collapsible box: header shows the current pick, body holds the chips. */
  const section = (key, title) => {
    const box = document.createElement('section');
    box.className = 'opt'; box.dataset.gkey = key;
    const head = document.createElement('h4');
    const ttl = document.createElement('span'); ttl.className = 'otitle'; ttl.textContent = title;
    const cur = document.createElement('span'); cur.className = 'ocur';
    const chev = document.createElement('span'); chev.className = 'chev'; chev.textContent = '▾';
    head.appendChild(ttl); head.appendChild(cur); head.appendChild(chev);
    head.onclick = () => toggleOpen(key);
    box.appendChild(head);
    const body = document.createElement('div'); body.className = 'obody';
    box.appendChild(body);
    applyOpen(box, key);
    return { box, body, cur, key, head };
  };

  let previewCanvas = null;
  let nowLine = null;   // the always-visible one-line summary under the preview
  let sumSec = null;    // its collapsible "full detail" section
  /** Human-readable summary of everything currently stacked in the forge. */
  const forgeSummary = () => {
    const F = S.forge;
    const type = forgeType(F.baseType);
    const a = type.allows;
    const base = forgeBaseItem();
    const spec = forgeSpec();
    const label = (it) => (it ? `${nm(it)}（${it.id}）` : null);
    const rows = [];
    rows.push(['牌型', type.label]);
    rows.push(['主体', `${nm(base)}（${base.id}）`]);
    if (base.source) rows.push(['来源', `${base.sourceName || base.source}（${base.source}）`]);
    if (!base.atlas || !base.pos) rows.push(['提示', '这个条目本身没有卡图，预览只会显示叠加层']);
    if (base.atlas) {
      const at = D.atlases[base.atlas];
      rows.push(['主体贴图', `${base.atlas} (${base.pos ? base.pos.x + ',' + base.pos.y : '-'})${at ? ' · ' + at.file.split('/').pop() : ''}`]);
    }
    if (a.enhancement) rows.push(['强化', F.enhancement && BY_ID[F.enhancement] ? label(BY_ID[F.enhancement]) : (F.enhancement ? F.enhancement : '无')]);
    rows.push(['版本', !a.edition ? '不适用' : (F.edition && BY_ID[F.edition] ? label(BY_ID[F.edition]) + (BY_ID[F.edition].shader ? '（自定义着色器 ' + BY_ID[F.edition].shader + '，未移植）' : '') : (F.edition || '无'))]);
    if (a.seal) rows.push(['蜡封', F.seal ? (BY_ID['seal_' + F.seal] ? label(BY_ID['seal_' + F.seal]) : F.seal) : '无']);
    if (a.sticker) {
      const st = F.stickers;
      const parts = [];
      if (st.eternal && base.eternal_compat) parts.push('永恒');
      if (st.perishable && base.perishable_compat) parts.push('易腐');
      if (st.rental) parts.push('租用');
      if (st.color) parts.push(st.color + ' 彩色');
      rows.push(['贴纸', parts.length ? parts.join(' + ') : '无']);
    }
    if (a.back) rows.push(['牌背', F.showFront ? '（当前显示正面）' : label(BY_ID[F.back]) || '无']);
    if (type.id === 'PlayingCard' || type.id === 'Collab') rows.push(['牌面', F.variants ? '高对比 (cards_2)' : '标准 (cards_1)']);
    if (spec.soul) rows.push(['悬浮立绘', `${spec.soul.atlas} (${spec.soul.pos.x},${spec.soul.pos.y})${spec.soulHologram ? ' · hologram' : ''}`]);
    if (spec.setShader) rows.push(['卡体流光', spec.setShader]);
    rows.push(['导出尺寸', `${Math.round(CARD_W * S.scale)}×${Math.round(CARD_H * S.scale)}（${S.scale}x）`]);
    rows.push(['相位', S.anim.on ? `动画中 t=${S.anim.t.toFixed(2)}` : `${S.phase}${S.phase === 0 ? '（立绘摆正）' : ''}`]);
    return rows;
  };
  const paintSummary = () => {
    const box = left.querySelector('.pvsummary');
    if (!box) return;
    box.innerHTML = '';
    const tb = document.createElement('table');
    tb.className = 'kv';
    for (const [k, v] of forgeSummary()) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = k;
      const td2 = document.createElement('td'); td2.textContent = String(v);
      tr.appendChild(td1); tr.appendChild(td2);
      tb.appendChild(tr);
    }
    box.appendChild(tb);
  };
  const paintPreview = () => {
    const base = compose(forgeSpec(), S.scale, phaseNow());
    previewCanvas = base;
    const dir = (S.forge.showFront || !forgeType(S.forge.baseType).allows.back) ? '正面' : '牌背';
    const head = left.querySelector('.pvhead');
    if (head) head.textContent = `${base.width}×${base.height} · ${dir} · ${forgeBaseItem().name}`;
    const holder = left.querySelector('.pvbox');
    if (holder) {
      holder.innerHTML = '';
      const shown = newCanvas(base.width, base.height);
      shown.getContext('2d').drawImage(base, 0, 0);
      const maxW = isNarrow() ? 88 : 320;
      shown.style.cssText = `width:${Math.min(maxW, previewWidth(base, 200))}px;height:auto;image-rendering:pixelated;display:block;pointer-events:none;-webkit-user-drag:none`;
      holder.appendChild(shown);
    }
    paintSummary();
    const one = [];
    const F2 = S.forge;
    const t2 = forgeType(F2.baseType);
    one.push('主体 ' + nm(forgeBaseItem()));
    if (t2.allows.enhancement && F2.enhancement && BY_ID[F2.enhancement]) one.push('强化 ' + nm(BY_ID[F2.enhancement]));
    if (t2.allows.edition && F2.edition && BY_ID[F2.edition]) one.push('版本 ' + nm(BY_ID[F2.edition]));
    if (t2.allows.seal && F2.seal) one.push('蜡封 ' + F2.seal);
    if (t2.allows.sticker) {
      const st = [F2.stickers.eternal && '永恒', F2.stickers.perishable && '易腐', F2.stickers.rental && '租用', F2.stickers.color].filter(Boolean);
      if (st.length) one.push('贴纸 ' + st.join('+'));
    }
    if (t2.allows.back && !F2.showFront) one.push('牌背');
    nowLine.textContent = one.join(' · ');
    if (sumSec && sumSec.cur) sumSec.cur.textContent = one.length > 2 ? one.length + ' 层叠加' : one.slice(1).join(' · ') || '未叠加';
  };
  const draw = paintPreview;
  function build () {
    left.innerHTML = '';
    /* The pinned part on phones: preview + one-line combination, side by side and short.
       Everything else (details / export / animation) goes BELOW the option groups so it can
       never cover them. */
    const pvtop = document.createElement('div'); pvtop.className = 'pvtop';
    left.appendChild(pvtop);
    pvtop.onclick = () => pvtop.classList.toggle('zoom');
    const t = document.createElement('div'); t.className = 'pvhead';
    t.dataset.role = 'pvhead';
    t.style.cssText = 'font-size:12px;color:var(--fg3);margin-bottom:10px';
    pvtop.appendChild(t);
    const holder = document.createElement('div'); holder.className = 'pvbox';
    holder.style.cssText = 'display:inline-block;padding:18px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    pvtop.appendChild(holder);
    nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    pvtop.appendChild(nowLine);
    sumSec = section('summary', '当前组合详情');
    const summaryBox = document.createElement('div'); summaryBox.className = 'pvsummary';
    sumSec.body.appendChild(summaryBox);
    left.appendChild(sumSec.box);
    const exSec = section('export', '导出图片 / 数据');
    exSec.cur.textContent = 'PNG · SVG · JSON';
    const btns = document.createElement('div'); btns.className = 'btns'; btns.style.cssText = 'justify-content:center;margin-top:2px';
    const mk = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns.appendChild(b); return b; };
    mk('⤓ PNG 1x', () => saveCanvas(1));
    mk('⤓ PNG 2x', () => saveCanvas(2));
    mk('⤓ PNG 4x', () => saveCanvas(4));
    mk('⤓ SVG', () => saveSVG());
    mk('⧉ 复制组合 JSON', () => copyCombo());
    exSec.body.appendChild(btns);
    left.appendChild(exSec.box);

    const anSec = section('anim', '动图与动画');
    const btns2 = document.createElement('div'); btns2.className = 'btns'; btns2.style.cssText = 'justify-content:center;margin-top:2px';
    const mk2 = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns2.appendChild(b); return b; };
    mk2('🎞 GIF 动图', () => exportAnim('gif'), ' primary');
    mk2('🎞 APNG 动图', () => exportAnim('apng'));
    mk2('🎞 帧序列 ZIP', () => exportAnim('frames'));
    anSec.body.appendChild(btns2);
    left.appendChild(anSec.box);

    const row = document.createElement('div'); row.className = 'btns'; row.style.cssText = 'justify-content:center;margin-top:2px;align-items:center';
    const bgSel = document.createElement('select'); bgSel.className = 'tbtn';
    for (const [v, label] of [['transparent', 'GIF 背景：透明'], ['dark', 'GIF 背景：深色'], ['white', 'GIF 背景：白色']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if ((S.gifBg === null && v === 'transparent') || (v === 'dark' && S.gifBg && S.gifBg[0] === 18) || (v === 'white' && S.gifBg && S.gifBg[0] === 255)) o.selected = true; bgSel.appendChild(o);
    }
    bgSel.onchange = () => {
      S.gifBg = bgSel.value === 'transparent' ? null : bgSel.value === 'dark' ? [18, 24, 30] : [255, 255, 255];
    };
    row.appendChild(bgSel);
    anSec.body.appendChild(row);

    const row2 = document.createElement('div'); row2.className = 'btns'; row2.style.cssText = 'justify-content:center;margin-top:8px';
    const animBtn = document.createElement('button'); animBtn.className = 'btn'; animBtn.textContent = '▶ 实时动画预览';
    animBtn.onclick = () => {
      if (S.anim.on) { stopAnim(); animBtn.textContent = '▶ 实时动画预览'; animBtn.classList.remove('primary'); paintPreview(); return; }
      animBtn.textContent = '⏸ 停止动画'; animBtn.classList.add('primary');
      startAnim(() => paintPreview());
    };
    row2.appendChild(animBtn);
    const speedSel = document.createElement('select'); speedSel.className = 'tbtn';
    for (const [v, label] of [[0.5, '速度 0.5×'], [1, '速度 1×（原速）'], [2, '速度 2×'], [3, '速度 3×'], [4, '速度 4×'], [6, '速度 6×'], [8, '速度 8×'], [12, '速度 12×'], [16, '速度 16×']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if (S.anim.speed === v) o.selected = true; speedSel.appendChild(o);
    }
    speedSel.onchange = () => { S.anim.speed = +speedSel.value; refreshAnimInfo() };
    row2.appendChild(speedSel);
    const fpsSel = document.createElement('select'); fpsSel.className = 'tbtn';
    for (const [v, label] of [[10, '帧率 10fps'], [15, '帧率 15fps'], [20, '帧率 20fps（默认）'], [25, '帧率 25fps'], [30, '帧率 30fps'], [50, '帧率 50fps']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if (S.anim.fps === v) o.selected = true; fpsSel.appendChild(o);
    }
    fpsSel.onchange = () => { S.anim.fps = +fpsSel.value; refreshAnimInfo() };
    row2.appendChild(fpsSel);
    const durSel = document.createElement('select'); durSel.className = 'tbtn';
    for (const [v, label] of [[1, '时长 1s'], [1.5, '时长 1.5s'], [2.5, '时长 2.5s'], [4, '时长 4s'], [6, '时长 6s'], [10, '时长 10s']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if (S.anim.seconds === v) o.selected = true; durSel.appendChild(o);
    }
    durSel.onchange = () => { S.anim.seconds = +durSel.value; refreshAnimInfo() };
    row2.appendChild(durSel);
    const loopBtn = document.createElement('button');
    loopBtn.className = 'btn primary';
    loopBtn.textContent = loopLabel();
    loopBtn.title = '自动 = 用着色器源码里的频率去找真正的循环点；来回 = 正放再倒放（永远不会跳变）；单向 = 直接重复';
    loopBtn.onclick = () => { loopBtn.textContent = cycleLoop(); refreshAnimInfo() };
    row2.appendChild(loopBtn);
    anSec.body.appendChild(row2);
    const seam = document.createElement('div'); seam.className = 'hint mono'; seam.style.minHeight = '16px';
    anSec.body.appendChild(seam);
    function refreshAnimInfo () {
      const spec = forgeSpec();
      const f = buildAnimFrames(spec, 1, animOpts(spec));
      const m = loopSeamRatio(f.frames);
      const secs = (f.frames.length * f.delay / 1000).toFixed(1);
      const o = animOpts(spec);
      const loopNote = o.autoPeriod
        ? ` · 检测到循环点 ${o.autoPeriod.toFixed(2)}s`
        : ((S.anim.loop || 'auto') === 'auto' ? ' · 未找到短循环，已按来回循环' : '');
      seam.textContent = m
        ? `${f.frames.length} 帧 · ${f.delay}ms（≈${Math.round(1000 / f.delay)}fps）· 全长 ${secs}s · 接缝比 ${m.ratio.toFixed(2)}（1 = 最顺）${loopNote}`
        : '';
    }
    refreshAnimInfo();

    const hint = document.createElement('div'); hint.className = 'hint';
    hint.innerHTML = '导出为透明背景 PNG，可直接用于做图 / 视频封面。<br>' +
      '版本特效（闪箔 / 镭射 / 多彩 / 负片）、优惠券 / 补充包 / 幽灵牌的流光、传奇牌与灵魂牌的浮动立绘（含原版投影），全部由原版 GLSL 与动画参数实时渲染。' +
      '<br><b>速度</b>：游戏里这些特效是 1× 实时速度，一个完整周期长达二三十秒，所以导出动图默认加速 4×；想完全还原请选 1×。<br>' +
      '<b>循环</b>：特效是若干正弦项相加，每一项都有自己的周期，所以只要找到它们的公共循环点，单向重复也看不出跳变；' +
      '找不到短循环时才退回「来回循环」（正放再倒放，接缝天然无跳变）。循环点是从着色器源码里的频率算出来、' +
      '再逐帧渲染验证的，合成台的读数里会写明检测结果。<br>' +
      '<br><b>相位 0</b> = 悬浮立绘摆正的姿势（所有正弦项归零），静态导出建议保持 0。' +
      '<br><b>GIF</b>：任何看图软件都能动（256 色）；<b>APNG</b>：全彩带透明，但只有浏览器等支持 APNG 的查看器会动。' +
      (GL ? '' : '<br><b style="color:var(--red)">当前浏览器未启用 WebGL，着色器特效无法渲染，其余功能不受影响。</b>');
    hint.style.cssText = 'text-align:left;margin:8px 0 2px;font-size:11px;line-height:1.6';
    anSec.body.appendChild(hint);
  }
  function saveCanvas (scale) {
    ensureDrawn().then(async () => { save(await canvasBytes(compose(forgeSpec(), scale, phaseNow())), `balatro-${S.forge.baseType}-${forgeBaseItem().id}-${scale}x.png`, 'image/png'); toast('已导出 PNG'); });
  }
  function saveSVG () {
    const cv = compose(forgeSpec(), 2, phaseNow());
    const url = cv.toDataURL('image/png');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cv.width}" height="${cv.height}" viewBox="0 0 ${cv.width} ${cv.height}"><image width="${cv.width}" height="${cv.height}" image-rendering="pixelated" xlink:href="${url}" xmlns:xlink="http://www.w3.org/1999/xlink"/></svg>`;
    save(new Blob([svg], { type: 'image/svg+xml' }), `balatro-${forgeBaseItem().id}.svg`, 'image/svg+xml'); toast('已导出 SVG');
  }
  function exportAnim (kind) {
    toast(kind === 'gif' ? '正在渲染并量化 GIF…' : '正在渲染动画帧…');
    const base = forgeBaseItem().id;
    setTimeout(() => {
      try {
        const r = buildAnimFrames(forgeSpec(), 2, animOpts(forgeSpec()));
        if (kind === 'apng') saveAnimAPNG(r.frames, r.delay, `balatro-${base}-动图.png`);
        else if (kind === 'gif') saveAnimGIF(r.frames, r.delay, `balatro-${base}-动图.gif`, S.gifBg);
        else saveFrameZip(r.frames, r.delay, `balatro-${base}-帧序列.zip`);
      } catch (e) { toast('动图生成失败：' + e.message) }
    }, 30);
  }
  function copyCombo () {
    const F = S.forge;
    const txt = JSON.stringify({
      baseType: F.baseType, base: forgeBaseItem().id, enhancement: F.enhancement, edition: F.edition,
      seal: F.seal, stickers: F.stickers, back: F.back, highContrast: F.variants,
    }, null, 2);
    navigator.clipboard?.writeText(txt).then(() => toast('已复制组合 JSON'), () => toast('复制失败'));
  }

  /* ---- option groups ---- */
  const groups = [];
  const group = (title, items, getValue, onPick, opts) => {
    const sec = section((opts && opts.gkey) || title, title);
    const box = sec.box;
    const chips = document.createElement('div'); chips.className = 'chips';
    const buttons = [];
    const valueOf = (opts && typeof opts.value === 'function') ? opts.value : ((it) => it.id);
    const fill = (list) => {
      chips.innerHTML = ''; buttons.length = 0;
      if (opts && opts.allowNone) {
        const b = document.createElement('button');
        b.className = 'pick nosprite'; b.textContent = '无（不叠加）';
        b.onclick = () => { onPick(''); draw(); updateChips(); };
        chips.appendChild(b); buttons.push({ b, v: '' });
      }
      for (const it of list) {
        const b = document.createElement('button');
        b.className = 'pick'; b.title = nm(it) + ' · ' + it.id;
        const spec = specForItem(it);
        if (spec) {
          const mini = compose(spec, 2, phaseNow());
          const sm = newCanvas(26, 35);
          const c2 = sm.getContext('2d');
          c2.imageSmoothingEnabled = false;
          const r = Math.min(sm.width / mini.width, sm.height / mini.height);
          const w = mini.width * r, hh = mini.height * r;
          c2.drawImage(mini, (sm.width - w) / 2, (sm.height - hh) / 2, w, hh);
          b.appendChild(sm);
        }
        const s = document.createElement('span'); s.textContent = nm(it); b.appendChild(s);
        if (it.source) {
          const md = document.createElement('i'); md.className = 'pickmod'; md.textContent = 'MOD';
          md.title = it.sourceName || it.source;
          b.appendChild(md);
        }
        const v = valueOf(it);
        b.onclick = () => { onPick(v); draw(); updateChips(); };
        chips.appendChild(b); buttons.push({ b, v });
      }
    };
    fill(items);
    sec.body.appendChild(chips);
    const note = document.createElement('div'); note.className = 'hint'; note.style.display = 'none';
    sec.body.appendChild(note);
    const g = { box, body: sec.body, buttons, getValue, fill, note, cur: sec.cur, label: (opts && opts.cur) || null, key: opts && opts.key, gkey: sec.key };
    groups.push(g);
    return g;
  };
  function updateChips () {
    const a = forgeType(S.forge.baseType).allows;
    for (const g of groups) {
      const cur = g.getValue ? g.getValue() : null;
      for (const { b, v } of g.buttons) b.classList.toggle('on', cur === v);
      if (g.key) {
        const ok = !!a[g.key];
        g.box.style.opacity = ok ? '1' : '.45';
        g.note.style.display = ok ? 'none' : 'block';
        if (!ok) g.note.textContent = ({ enhancement: '强化只能用在扑克牌上', seal: '蜡封只能贴在扑克牌上', sticker: '贴纸只能贴在小丑牌上', back: '牌背只有扑克牌才有', edition: '' })[g.key] || '该层不适用于此牌型';
        for (const { b } of g.buttons) b.disabled = !ok;
      }
    }
    // the sticker block is built separately (multi-select), so refresh its gating too
    updateStickers();
    if (typeof syncNav === 'function') syncNav();
  }

  const typeSec = section('basetype', '牌型');
  typeSec.cur.textContent = forgeType(S.forge.baseType).name;
  const typeSel = document.createElement('select'); typeSel.className = 'tbtn'; typeSel.style.width = '100%';
  for (const t of FORGE_TYPES) { const o = document.createElement('option'); o.value = t.id; o.textContent = t.label; typeSel.appendChild(o); }
  typeSel.value = S.forge.baseType;
  typeSec.body.appendChild(typeSel);
  const baseSearch = document.createElement('input');
  baseSearch.className = 'tbtn'; baseSearch.placeholder = '筛选…（名称 / id / source:Cryptid）';
  baseSearch.style.cssText = 'width:100%;margin-top:8px;padding:5px 8px';
  typeSec.body.appendChild(baseSearch);
  const baseHint = document.createElement('div'); baseHint.className = 'hint';
  typeSec.body.appendChild(baseHint);
  right.appendChild(typeSec.box);

  const gBase = group('选择主体', [], () => S.forge.base, (v) => { S.forge.base = v; }, {
    key: null, gkey: 'base',
    cur: () => nm(forgeBaseItem()) + (forgeBaseItem().source ? ' · MOD' : ''),
  });
  right.appendChild(gBase.box);
  const refreshBase = () => {
    let list = forgeBaseList(S.forge.baseType, S.forge.baseQuery);
    const total = ITEMS.filter((i) => i.cat === S.forge.baseType).length;
    const mods = list.filter((i) => i.source).length;
    baseHint.textContent = `${total} 项${mods ? `（其中 ${mods} 项来自 Mod）` : ''}${list.length !== total ? ` · 筛出 ${list.length}` : ''}`;
    gBase.fill(list);
    updateChips();
  };
  typeSel.onchange = () => {
    S.forge.baseType = typeSel.value;
    S.forge.baseQuery = ''; baseSearch.value = '';
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    S.forge.base = first ? first.id : S.forge.base;
    typeSec.cur.textContent = forgeType(S.forge.baseType).name;
    build(); refreshBase(); draw(); updateChips();
  };
  baseSearch.oninput = () => { S.forge.baseQuery = baseSearch.value; refreshBase(); };

  const gEnh = group('强化 Enhancement（改变卡体外观）', FORGE_ENH, () => S.forge.enhancement, (v) => { S.forge.enhancement = v; }, {
    allowNone: true, key: 'enhancement', gkey: 'enh',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.enhancement) return '不适用';
      const v = S.forge.enhancement; const it = v && BY_ID[v];
      return (!v || v === 'none') ? '无' : (it ? nm(it) : v);
    },
  });
  const gEd = group('版本 Edition（原版 GLSL 特效）', FORGE_EDITIONS, () => S.forge.edition, (v) => { S.forge.edition = v; }, {
    allowNone: true, key: 'edition', gkey: 'ed',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.edition) return '不适用';
      const v = S.forge.edition; const it = v && BY_ID[v];
      return v ? (it ? nm(it) : v) : '无';
    },
  });
  const gSeal = group('蜡封 Seal（仅扑克牌）', FORGE_SEALS, () => S.forge.seal, (v) => { S.forge.seal = v; }, {
    allowNone: true, key: 'seal', gkey: 'seal', value: (it) => it.key,
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.seal) return '不适用';
      if (!S.forge.seal) return '无';
      const it = BY_ID['seal_' + S.forge.seal];
      return it ? nm(it) : S.forge.seal;
    },
  });
  right.appendChild(gEnh.box); right.appendChild(gEd.box); right.appendChild(gSeal.box);

  /* ---- stickers: several can share one joker (see card.lua: set_eternal / set_perishable) ---- */
  const stickSec = section('stick', '贴纸 Sticker（仅小丑牌 · 可同时存在）');
  const gStick = stickSec.box;
  const stickChips = document.createElement('div'); stickChips.className = 'chips';
  const stickNote = document.createElement('div'); stickNote.className = 'hint';
  const stickButtons = [];
  const stickerStat = () => {
    const base = forgeBaseItem();
    return { eternal: !!base.eternal_compat, perishable: !!base.perishable_compat };
  };
  const mkStick = (key, label, kind) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.dataset.kind = kind;
    b.dataset.key = key;
    const spec = specForItem(BY_ID['sticker_' + key] || BY_ID['sticker_eternal']);
    if (spec) {
      const mini = compose(Object.assign({}, spec, { center: { atlas: 'Joker', pos: { x: 0, y: 0 } } }), 2, phaseNow());
      const sm = newCanvas(26, 35);
      const c2 = sm.getContext('2d'); c2.imageSmoothingEnabled = false;
      const r = Math.min(sm.width / mini.width, sm.height / mini.height);
      c2.drawImage(mini, (sm.width - mini.width * r) / 2, (sm.height - mini.height * r) / 2, mini.width * r, mini.height * r);
      b.appendChild(sm);
    }
    const s = document.createElement('span'); s.textContent = label; b.appendChild(s);
    b.onclick = () => {
      if (b.disabled) return;
      const on = !S.forge.stickers[key];
      S.forge.stickers[key] = on;
      // eternal and perishable are drawn at the SAME spot on the card, so the game
      // never lets them coexist — behave like a radio pair.
      if (on && key === 'eternal') S.forge.stickers.perishable = false;
      if (on && key === 'perishable') S.forge.stickers.eternal = false;
      draw(); updateStickers();
    };
    stickChips.appendChild(b); stickButtons.push(b);
    return b;
  };
  // eternal / perishable are mutually exclusive in the game, so enlist them in one group
  mkStick('eternal', '永恒 Eternal', 'flag');
  mkStick('perishable', '易腐 Perishable', 'flag');
  mkStick('rental', '租用 Rental', 'flag');
  gStick.appendChild(stickChips);
  const colorRow = document.createElement('div'); colorRow.className = 'chips'; colorRow.style.marginTop = '6px';
  const colorButtons = [];
  const mkColor = (key, label) => {
    const b = document.createElement('button');
    b.className = 'pick'; b.dataset.kind = 'color'; b.dataset.key = key;
    const src = BY_ID['sticker_' + (key || 'White')];
    const spec = specForItem(src);
    if (spec) {
      const mini = compose(Object.assign({}, spec, { center: { atlas: 'Joker', pos: { x: 0, y: 0 } } }), 2, phaseNow());
      const sm = newCanvas(26, 35);
      const c2 = sm.getContext('2d'); c2.imageSmoothingEnabled = false;
      const r = Math.min(sm.width / mini.width, sm.height / mini.height);
      c2.drawImage(mini, (sm.width - mini.width * r) / 2, (sm.height - mini.height * r) / 2, mini.width * r, mini.height * r);
      b.appendChild(sm);
    }
    const s = document.createElement('span'); s.textContent = label; b.appendChild(s);
    b.onclick = () => { S.forge.stickers.color = key; draw(); updateStickers(); };
    colorRow.appendChild(b); colorButtons.push({ b, key });
  };
  mkColor('', '无彩色贴纸');
  for (const c of STICKER_COLORS) mkColor(c.key, c.key);
  stickSec.body.appendChild(colorRow);
  stickSec.body.appendChild(stickNote);
  right.appendChild(gStick);
  groups.push({
    box: gStick, body: stickSec.body, buttons: [], getValue: () => null, key: 'sticker', gkey: 'stick', note: stickNote, cur: stickSec.cur,
    label: () => {
      if (!forgeType(S.forge.baseType).allows.sticker) return '不适用';
      const st = S.forge.stickers;
      const p = [st.eternal && '永恒', st.perishable && '易腐', st.rental && '租用', st.color].filter(Boolean);
      return p.length ? p.join(' + ') : '无';
    },
  });
  function updateStickers () {
    const allowed = forgeType(S.forge.baseType).allows.sticker;
    const compat = stickerStat();
    const st = S.forge.stickers;
    if (st.eternal && st.perishable) st.perishable = false;
    gStick.style.opacity = allowed ? '1' : '.45';
    for (const b of stickButtons) {
      const k = b.dataset.key;
      let ok = allowed;
      // card.lua's set_eternal / set_perishable also honour per-joker compat flags
      if (k === 'eternal' && !compat.eternal) ok = false;
      if (k === 'perishable' && !compat.perishable) ok = false;
      b.disabled = !ok;
      b.classList.toggle('on', !!st[k]);
    }
    for (const { b, key } of colorButtons) {
      b.disabled = !allowed;
      b.classList.toggle('on', (st.color || '') === key);
    }
    const notes = [];
    if (!allowed) notes.push('贴纸只能贴在小丑牌上');
    else {
      if (!compat.eternal) notes.push('这张小丑牌原本就不能有「永恒」标签（eternal_compat = false）');
      if (!compat.perishable) notes.push('这张小丑牌原本就不能有「易腐」标签（perishable_compat = false）');
      notes.push('永恒与易腐在原版占用卡面同一个位置，因此互斥（点一个会自动取消另一个）；租用与彩色贴纸可以同时存在');
    }
    stickNote.textContent = notes.join('；');
  }
  updateStickers();

  const gBack = group('牌背 Deck（翻到牌背时生效）', FORGE_BACKS, () => S.forge.back, (v) => { S.forge.back = v; }, {
    key: 'back', gkey: 'back',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.back) return '不适用';
      if (S.forge.showFront) return '显示正面';
      const it = BY_ID[S.forge.back];
      return it ? nm(it) : '无';
    },
  });
  right.appendChild(gBack.box);

  const viewSec = section('view', '显示选项');
  const gToggle = viewSec.box;
  const row = document.createElement('div'); row.className = 'chips';
  const tg = (label, key, invert) => {
    const b = document.createElement('button'); b.className = 'pick nosprite'; b.textContent = label;
    b.onclick = () => { S.forge[key] = !S.forge[key]; draw(); updateChips(); };
    b._sync = () => b.classList.toggle('on', invert ? !S.forge[key] : !!S.forge[key]);
    row.appendChild(b); return b;
  };
  const bBack = tg('翻到牌背', 'showFront', true);
  const bHC = tg('高对比牌面 (colourblind)', 'variants');
  viewSec.body.appendChild(row);
  groups.push({
    buttons: [], getValue: () => null, box: gToggle, body: viewSec.body, key: null, gkey: 'view', note: null,
    cur: viewSec.cur,
    label: () => [S.forge.showFront ? '正面' : '牌背', S.forge.variants ? '高对比' : null].filter(Boolean).join(' · '),
    sync: () => { bBack._sync(); bHC._sync(); },
  });
  right.appendChild(gToggle);

  /* ---- jump bar: tap a chip to open a group and scroll to it ---- */
  const navChip = (key, label) => {
    const b = document.createElement('button');
    b.className = 'nv'; b.dataset.gkey = key; b.textContent = label;
    b.onclick = () => {
      const open = !isOpen(key);
      toggleOpen(key, true);
      const target = document.querySelector('#content .opt[data-gkey="' + key + '"]');
      if (target && !open) target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    nav.appendChild(b);
  };
  for (const [key, label] of NAV_GROUPS) navChip(key, label);
  const navSep = document.createElement('span'); navSep.className = 'nvsep'; nav.appendChild(navSep);
  const openAll = document.createElement('button'); openAll.className = 'nv act'; openAll.textContent = '全部展开';
  openAll.onclick = () => { for (const [k] of NAV_GROUPS) toggleOpen(k, true); for (const k of ['summary', 'export', 'anim']) toggleOpen(k, true) };
  const closeAll = document.createElement('button'); closeAll.className = 'nv act'; closeAll.textContent = '收起';
  closeAll.onclick = () => { for (const [k] of NAV_GROUPS) toggleOpen(k, false); for (const k of ['summary', 'export', 'anim']) toggleOpen(k, false) };
  const randBtn = document.createElement('button'); randBtn.className = 'nv act'; randBtn.textContent = '🎲 随机搭配';
  randBtn.onclick = () => {
    const pickFrom = (list, noneChance) => (list.length && Math.random() > (noneChance || 0)) ? list[Math.floor(Math.random() * list.length)] : null;
    const t = forgeType(S.forge.baseType);
    const base = pickFrom(ITEMS.filter((i) => i.cat === S.forge.baseType));
    if (base) S.forge.base = base.id;
    if (t.allows.enhancement) { const e = pickFrom(FORGE_ENH, 0.35); S.forge.enhancement = e ? e.id : 'none' }
    if (t.allows.edition) { const e = pickFrom(FORGE_EDITIONS, 0.4); S.forge.edition = e ? e.id : '' }
    if (t.allows.seal) { const s = pickFrom(FORGE_SEALS, 0.5); S.forge.seal = s ? s.key : '' }
    if (t.allows.sticker) {
      const st = S.forge.stickers;
      st.eternal = Math.random() < 0.25; st.perishable = false; st.rental = Math.random() < 0.2;
      st.color = Math.random() < 0.25 && STICKER_COLORS.length ? STICKER_COLORS[Math.floor(Math.random() * STICKER_COLORS.length)].key : '';
    }
    if (t.allows.back) { const b = pickFrom(FORGE_BACKS, 0.5); if (b) S.forge.back = b.id }
    build(); typeSel.value = S.forge.baseType; refreshBase(); draw(); updateChips();
    toast('已随机搭配一组');
  };
  const resetBtn = document.createElement('button'); resetBtn.className = 'nv act'; resetBtn.textContent = '↺ 重置';
  resetBtn.onclick = () => {
    S.forge.enhancement = 'none'; S.forge.edition = ''; S.forge.seal = '';
    S.forge.stickers = { eternal: false, perishable: false, rental: false, color: '' };
    S.forge.showFront = true; S.forge.variants = false;
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    if (first) S.forge.base = first.id;
    build(); typeSel.value = S.forge.baseType; refreshBase(); draw(); updateChips();
    toast('已重置叠加层');
  };
  nav.appendChild(openAll); nav.appendChild(closeAll); nav.appendChild(randBtn); nav.appendChild(resetBtn);

  build();
  typeSel.value = S.forge.baseType;
  refreshBase();
  draw();
  updateChips();
  syncNav();
  forgeRedraw = () => { draw(); updateChips(); };
}
let forgeRedraw = null;

/* ---------------------------------------------------------------- atlas */
function viewAtlas (root) {
  const head = document.createElement('div'); head.className = 'listhead';
  const files = D.atlasIndex.filter((f) => ATLAS[f.file]);
  head.innerHTML = `<h2>图集浏览</h2><span class="sub">${files.length} 张贴图 · 已内置 2x 高清版本</span><span class="spacer"></span>`;
  const note = document.createElement('span'); note.className = 'chip';
  note.innerHTML = '<b>提示</b> 点击贴图查看格子坐标，点格子可反查使用者';
  head.appendChild(note);
  root.appendChild(head);

  const list = document.createElement('div');
  for (const f of files) {
    const disp = ATLAS[f.file] ? f.file : f.file.replace(/^1x\//, '2x/');
    const row = document.createElement('div'); row.className = 'atarow';
    const h = document.createElement('div'); h.className = 'atahead';
    const a = Object.values(D.atlases).find((x) => x.file === disp);
    h.innerHTML = `<span class="fn">${disp}</span><span class="dim">${f.w}×${f.h}px</span>` +
      (a ? `<span class="dim">· 格子 ${a.px}×${a.py} · ${a.cols}×${a.rows}${a.frames ? ' · ' + a.frames + ' 帧动画' : ''}</span>` : '') +
      '<span class="spacer"></span><span class="dim">展开 ▾</span>';
    row.appendChild(h);
    const body = document.createElement('div'); body.className = 'atabody'; body.style.display = 'none';
    let built = false;
    h.onclick = () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (open && !built) { built = true; buildAtlasBody(body, disp, a, f); }
    };
    row.appendChild(body);
    list.appendChild(row);
  }
  root.appendChild(list);
}
function buildAtlasBody (body, file, a, meta) {
  const wrap = document.createElement('div'); wrap.className = 'wrap';
  const im = img(file);
  const showW = Math.min(meta.w, 1400);
  const ratio = showW / meta.w;
  const im2 = document.createElement('img');
  im2.src = ATLAS[file];
  im2.style.width = showW + 'px';
  im2.style.height = (meta.h * ratio) + 'px';
  wrap.appendChild(im2);
  const info = document.createElement('div'); info.className = 'tileinfo'; info.textContent = '把鼠标移到贴图上查看格子信息';
  if (a) {
    const ov = document.createElement('div'); ov.className = 'gridov';
    ov.style.width = showW + 'px'; ov.style.height = (meta.h * ratio) + 'px';
    const tw = a.px * (meta.w / a.w) * (a.scale ? 1 : 1);
    const cw = a.px * a.scale * ratio, ch = a.py * a.scale * ratio;
    for (let y = 0; y < a.rows; y++) for (let x = 0; x < a.cols; x++) {
      const i = document.createElement('i');
      i.style.left = (x * cw) + 'px'; i.style.top = (y * ch) + 'px';
      i.style.width = cw + 'px'; i.style.height = ch + 'px';
      ov.appendChild(i);
    }
    wrap.appendChild(ov);
    wrap.onmousemove = (e) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / ratio, py = (e.clientY - r.top) / ratio;
      const gx = Math.floor(px / (a.px * a.scale)), gy = Math.floor(py / (a.py * a.scale));
      if (gx < 0 || gy < 0 || gx >= a.cols || gy >= a.rows) { info.textContent = ''; return; }
      const users = ITEMS.filter((it) => it.atlas === a.name && it.pos && it.pos.x === gx && it.pos.y === gy);
      info.textContent = `格 (${gx}, ${gy})  像素 (${gx * a.px * a.scale}, ${gy * a.py * a.scale})  ${a.px * a.scale}×${a.py * a.scale}px   → ` +
        (users.length ? users.map((u) => nm(u)).join('、') : (a.frames ? '动画帧 ' + gx : '未使用'));
      if (users.length) info.dataset.first = users[0].id; else delete info.dataset.first;
    };
    wrap.onclick = () => { if (info.dataset.first) selectItem(info.dataset.first, true); };
  }
  body.appendChild(wrap);
  body.appendChild(info);
  const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = '⤓ 导出整张贴图 PNG';
  btn.onclick = () => {
    const raw = ATLAS[file];
    fetch(raw).then((r) => r.arrayBuffer()).then((b) => save(new Uint8Array(b), file.split('/').pop(), 'image/png')).catch(() => {
      const c = newCanvas(meta.w, meta.h); const ctx = c.getContext('2d');
      img(file).onload = () => { ctx.drawImage(img(file), 0, 0); c.toBlob((bl) => save(bl, file.split('/').pop(), 'image/png')); };
      if (img(file).complete) { ctx.drawImage(img(file), 0, 0); c.toBlob((bl) => save(bl, file.split('/').pop(), 'image/png')); }
    });
  };
  body.appendChild(btn);
  if (a) {
    const b2 = document.createElement('button'); b2.className = 'btn'; b2.style.marginLeft = '6px';
    b2.textContent = '⤓ 导出全部切片 ZIP';
    b2.onclick = async () => {
      toast('正在切片…');
      const files = [];
      for (let y = 0; y < a.rows; y++) for (let x = 0; x < a.cols; x++) {
        const c = newCanvas(a.px * a.scale, a.py * a.scale);
        drawTileTo(c.getContext('2d'), { atlas: a.name, pos: { x, y } }, 0, 0, c.width, c.height);
        await ensureDrawn();
        files.push({ name: `${file.split('/').pop().replace(/\.png$/, '')}_${x}_${y}.png`, data: await canvasBytes(c) });
      }
      save(zipStore(files), `${file.split('/').pop().replace(/\.png$/, '')}_tiles.zip`, 'application/zip');
      toast('已导出切片 ZIP');
    };
    body.appendChild(b2);
  }
}

/* ---------------------------------------------------------------- shaders */
const SHADER_TO_EDITION = { foil: 'e_foil', holo: 'e_holo', polychrome: 'e_polychrome', negative: 'e_negative', negative_shine: 'e_negative' };
const SHADER_TO_LABEL = {
  foil: '闪箔 Foil', holo: '镭射 Holographic', polychrome: '多彩 Polychrome', negative: '负片 Negative',
  negative_shine: '负片光泽层（与 negative 合用）', booster: '补充包 / 幽灵牌', voucher: '优惠券 / 黄金蜡封 / 贴纸',
  hologram: '全息小丑的悬浮立绘',
};
/** A representative render for each ported shader. */
function shaderPreview (name) {
  const phase = phaseNow();
  const ace = { atlas: 'cards_1', pos: { x: 12, y: 3 } };
  const baseCenter = { atlas: 'centers', pos: COM.baseCenter.pos };
  if (name === 'booster') return compose({ center: { atlas: 'Spectral', pos: { x: 2, y: 2 } }, setShader: 'booster' }, 2, phase);
  if (name === 'voucher') return compose({ center: { atlas: 'Voucher', pos: { x: 0, y: 0 } }, setShader: 'voucher' }, 2, phase);
  if (name === 'negative_shine') {
    // show this layer on its own, so it is not confused with the full negative card
    const ace = { atlas: 'cards_1', pos: { x: 12, y: 3 } };
    const t = compose({ center: { atlas: 'centers', pos: COM.baseCenter.pos }, front: ace }, 2, phase);
    return shade(t, 'negative_shine', phase) || t;
  }
  if (name === 'hologram') {
    const sp = { atlas: 'Joker', pos: { x: 2, y: 9 } };
    return shadeTile(sp, CARD_W * 2, CARD_H * 2, 'hologram', phase) || tileLayer(sp, CARD_W * 2, CARD_H * 2);
  }
  return compose({ center: baseCenter, front: ace, edition: SHADER_TO_EDITION[name] || null }, 2, phase);
}
function viewShaders (root) {
  const live = D.shaders.filter((s) => s.live).length;
  const head = document.createElement('div'); head.className = 'listhead';
  head.innerHTML = `<h2>着色器 Shader</h2><span class="sub">${D.shaders.length} 个片段着色器 · 其中 ${live} 个已逐行移植为 WebGL 实时预览</span><span class="spacer"></span>`;
  const note = document.createElement('span'); note.className = 'chip';
  note.innerHTML = '<b>相位</b> 用顶栏滑杆切换定格瞬间';
  head.appendChild(note);
  root.appendChild(head);

  const intro = document.createElement('div'); intro.className = 'hint';
  intro.style.marginBottom = '12px';
  intro.innerHTML = '卡牌的「版本」外观（闪箔 / 镭射 / 多彩 / 负片）在原版里不是图片，而是 <code>resources/shaders/*.fs</code> 里的 GLSL 片段着色器。下面把 19 个着色器全部列出，其中 5 个已移植到本页面的 WebGL 管线，<b>预览就是原版画面</b>。';
  root.appendChild(intro);

  for (const s of D.shaders) {
    const row = document.createElement('div'); row.className = 'atarow';
    const h = document.createElement('div'); h.className = 'atahead';
    h.innerHTML = `<span class="fn">${esc(s.name)}.fs</span>` +
      (s.live ? '<span class="tag" style="border-color:var(--accent);color:var(--accent)">实时预览</span>' : '') +
      `<span class="dim">${(s.size / 1024).toFixed(1)} KB</span>` +
      `<span class="dim">${esc(s.note || '')}</span>` +
      '<span class="spacer"></span><span class="dim">展开 ▾</span>';
    row.appendChild(h);
    const body = document.createElement('div'); body.className = 'atabody'; body.style.display = 'none';
    let built = false;
    h.onclick = () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (open && !built) { built = true; buildShaderBody(body, s); }
    };
    row.appendChild(body);
    root.appendChild(row);
  }
}
function buildShaderBody (body, s) {
  if (s.live && GL) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px';
    const box = document.createElement('div');
    box.style.cssText = 'padding:12px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    const out = shaderPreview(s.name);
    const shown = newCanvas(out.width, out.height);
    shown.getContext('2d').drawImage(out, 0, 0);
    shown.style.cssText = 'width:142px;height:190px;display:block;image-rendering:pixelated';
    box.appendChild(shown);
    const cap = document.createElement('div'); cap.className = 'hint'; cap.style.textAlign = 'center';
    cap.textContent = s.name === 'hologram' ? '应用在悬浮立绘上' : '原版效果';
    box.appendChild(cap);
    const side = document.createElement('div');
    side.innerHTML = `<div class="hint" style="max-width:380px">用于 <b>${esc(SHADER_TO_LABEL[s.name] || s.name)}</b>。<br>` +
      '在「卡牌合成台」里也能叠加观察，并可导出 PNG / APNG 动图。</div>';
    const b = document.createElement('button'); b.className = 'btn primary'; b.style.marginTop = '8px';
    b.textContent = '⚒ 去合成台看效果';
    b.onclick = () => {
      if (SHADER_TO_EDITION[s.name]) { S.forge.edition = SHADER_TO_EDITION[s.name]; }
      else if (s.name === 'booster') { S.forge.baseType = 'Spectral'; S.forge.base = 'c_soul'; }
      else if (s.name === 'voucher') { S.forge.baseType = 'Voucher'; S.forge.base = 'v_hone'; }
      else if (s.name === 'hologram') { S.forge.baseType = 'Joker'; S.forge.base = 'j_hologram'; }
      S.tab = 'forge'; render();
    };
    side.appendChild(b);
    wrap.appendChild(box); wrap.appendChild(side);
    body.appendChild(wrap);
  } else if (s.live) {
    const n = document.createElement('div'); n.className = 'hint';
    n.textContent = '当前浏览器未启用 WebGL，无法实时预览（源码仍可查看与导出）。';
    body.appendChild(n);
  }
  const pre = document.createElement('pre'); pre.className = 'cfgbox'; pre.style.maxHeight = '420px';
  pre.textContent = s.source;
  body.appendChild(pre);
  const bar = document.createElement('div'); bar.style.marginTop = '8px';
  const b1 = document.createElement('button'); b1.className = 'btn'; b1.textContent = '⤓ 导出 .fs 源文件';
  b1.onclick = () => downloadText(s.source, `${s.name}.fs`, 'text/plain;charset=utf-8');
  const b2 = document.createElement('button'); b2.className = 'btn'; b2.style.marginLeft = '6px'; b2.textContent = '⧉ 复制源码';
  b2.onclick = () => navigator.clipboard?.writeText(s.source).then(() => toast('已复制源码'), () => toast('复制失败'));
  bar.appendChild(b1); bar.appendChild(b2);
  body.appendChild(bar);
}

/* ---------------------------------------------------------------- hands */
function viewHands (root) {
  const head = document.createElement('div'); head.className = 'listhead';
  head.innerHTML = `<h2>牌型数据</h2><span class="sub">${D.hands.length} 种牌型 · 基础筹码/倍率与每级成长</span>`;
  root.appendChild(head);
  const tbl = document.createElement('table'); tbl.className = 'data';
  tbl.innerHTML = '<thead><tr><th>牌型</th><th>示例</th><th class="num">基础筹码</th><th class="num">基础倍率</th><th class="num">每级 +筹码</th><th class="num">每级 +倍率</th><th class="num">1 级分</th><th class="num">5 级分</th></tr></thead><tbody></tbody>';
  const tb = tbl.querySelector('tbody');
  for (const h of D.hands) {
    const tr = document.createElement('tr');
    const ex = h.example.slice(0, 5);
    const holder = document.createElement('div');
    holder.style.cssText = 'display:flex;gap:1px';
    for (const k of ex) {
      const it = BY_ID[k];
      if (!it) continue;
      const mini = compose({ center: { atlas: 'centers', pos: COM.baseCenter.pos }, front: { atlas: 'cards_1', pos: it.pos } }, 1);
      mini.style.cssText = 'width:26px;height:35px;image-rendering:pixelated';
      holder.appendChild(mini);
    }
    const nameTd = document.createElement('td');
    nameTd.innerHTML = `<b>${esc(h.i18n[S.lang] || h.name)}</b>${h.visible ? '' : ' <span class="tag">隐藏牌型</span>'}`;
    tr.appendChild(nameTd);
    const exTd = document.createElement('td'); exTd.appendChild(holder); tr.appendChild(exTd);
    const lvl = (n) => h.chips + h.l_chips * (n - 1) + (h.mult + h.l_mult * (n - 1));
    tr.insertAdjacentHTML('beforeend', `<td class="num">${h.chips}</td><td class="num">${h.mult}</td><td class="num">+${h.l_chips}</td><td class="num">+${h.l_mult}</td><td class="num">${lvl(1)}</td><td class="num">${lvl(5)}</td>`);
    tb.appendChild(tr);
  }
  { const w = document.createElement('div'); w.className = 'tablewrap'; w.appendChild(tbl); root.appendChild(w) }
  const note = document.createElement('div'); note.className = 'hint';
  note.innerHTML = '说明：等级分的计算方式与原版一致（筹码 + 倍率之和，仅用于排序参考）。<br>示例牌面取自 <code>game.lua</code> 中每手牌的 <code>example</code> 字段。';
  root.appendChild(note);
}

/* ---------------------------------------------------------------- data */
const DATA_COLS = [
  ['id', 'ID'], ['cat', '分类'], ['set', 'Set'], ['name', '名称'], ['rarity', '稀有度'], ['cost', '费用'],
  ['weight', '权重'], ['kind', '类型'], ['effect', '效果'], ['atlas', '图集'], ['pos', '坐标'], ['order', '顺序'],
];
let dataSort = { key: 'id', dir: 1 };
function viewData (root) {
  let list = currentList();
  const head = document.createElement('div'); head.className = 'listhead';
  head.innerHTML = `<h2>数据总表</h2><span class="sub">${list.length} 行 · 点击表头排序 · 点击行查看详情</span><span class="spacer"></span>`;
  const b1 = document.createElement('button'); b1.className = 'tbtn'; b1.textContent = '⤓ CSV';
  b1.onclick = () => downloadText(toCSV(list), `balatro-data-${safeName(S.cat)}.csv`, 'text/csv;charset=utf-8');
  const b2 = document.createElement('button'); b2.className = 'tbtn'; b2.textContent = '⤓ JSON';
  b2.onclick = () => downloadText(JSON.stringify({ meta: D.meta, items: list.map(itemJSON) }, null, 1), `balatro-data-${safeName(S.cat)}.json`, 'application/json');
  const b3 = document.createElement('button'); b3.className = 'tbtn'; b3.textContent = '⤓ Markdown';
  b3.onclick = () => {
    const md = ['# Balatro 数据表 — ' + S.cat, '', '| ' + DATA_COLS.map((c) => c[1]).join(' | ') + ' |', '|' + DATA_COLS.map(() => '---').join('|') + '|']
      .concat(list.map((it) => '| ' + [it.id, it.cat, it.set, nm(it), it.rarity ?? '', it.cost ?? '', it.weight ?? '', it.kind ?? '', it.effect ?? '', it.atlas ?? '', it.pos ? it.pos.x + ',' + it.pos.y : '', it.order].map((v) => String(v).replace(/\|/g, '\\|')).join(' | ') + ' |')).join('\r\n');
    downloadText(md, `balatro-data-${safeName(S.cat)}.md`, 'text/markdown;charset=utf-8');
  };
  head.appendChild(b1); head.appendChild(b2); head.appendChild(b3);
  root.appendChild(head);

  const key = dataSort.key, dir = dataSort.dir;
  list = list.slice().sort((a, b) => {
    let va; let vb;
    if (key === 'name') { va = nm(a); vb = nm(b); }
    else if (key === 'pos') { va = a.pos ? a.pos.x + a.pos.y * 100 : -1; vb = b.pos ? b.pos.x + b.pos.y * 100 : -1; }
    else { va = a[key] ?? ''; vb = b[key] ?? ''; }
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'zh') * dir;
  });
  const tbl = document.createElement('table'); tbl.className = 'data';
  const thead = document.createElement('thead'); const trh = document.createElement('tr');
  for (const [k, label] of DATA_COLS) {
    const th = document.createElement('th'); th.textContent = label + (dataSort.key === k ? (dataSort.dir > 0 ? ' ▲' : ' ▼') : '');
    th.onclick = () => { dataSort = { key: k, dir: dataSort.key === k ? -dataSort.dir : 1 }; render(); };
    trh.appendChild(th);
  }
  thead.appendChild(trh); tbl.appendChild(thead);
  const tb = document.createElement('tbody');
  for (const it of list.slice(0, 800)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="id">${esc(it.id)}</td><td>${esc(it.cat)}</td><td>${esc(it.set || '')}</td><td>${esc(nm(it))}</td>` +
      `<td>${it.rarity ? RARITY[it.rarity] : ''}</td><td class="num">${it.cost ?? ''}</td><td class="num">${it.weight ?? ''}</td>` +
      `<td>${esc(it.kind || '')}</td><td>${esc(it.effect || '')}</td><td>${esc(it.atlas || '')}</td>` +
      `<td>${it.pos ? it.pos.x + ',' + it.pos.y : ''}</td><td class="num">${it.order ?? ''}</td>`;
    tr.onclick = () => selectItem(it.id);
    tb.appendChild(tr);
  }
  tbl.appendChild(tb);
  { const w = document.createElement('div'); w.className = 'tablewrap'; w.appendChild(tbl); root.appendChild(w) }
  if (list.length > 800) root.appendChild(Object.assign(document.createElement('div'), { className: 'hint', textContent: `仅显示前 800 行（共 ${list.length} 行）；导出文件包含全部。` }));
}

/* ---------------------------------------------------------------- detail */
function selectItem (id, silent) {
  S.sel = id;
  if (!silent) S.tab = 'codex';
  render();
  const d = document.getElementById('detail');
  if (d && !silent) d.scrollTop = 0;
  if (isNarrow()) toggleDrawer('detail-open', true); // phones: slide the detail panel in
}
function renderDetail () {
  const d = document.getElementById('detail');
  const it = S.sel ? BY_ID[S.sel] : null;
  if (!it) {
    d.className = 'empty';
    d.innerHTML = '<div><div style="font-size:30px;opacity:.3">🂡</div><div style="margin-top:10px">从左侧选一项查看详情<br><span style="font-size:11.5px">支持搜索 <kbd>/</kbd>，如 <kbd>cat:Joker cost&gt;=5</kbd></span></div></div>';
    return;
  }
  d.className = '';
  d.innerHTML = '';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn'; closeBtn.id = 'detailClose'; closeBtn.textContent = '✕'; closeBtn.title = '关闭';
  closeBtn.onclick = () => closeDrawers();
  d.appendChild(closeBtn);
  const spec = specForItem(it);
  const head = document.createElement('div'); head.className = 'dhead';
  const r1 = document.createElement('div'); r1.className = 'row1';
  const previewHolder = document.createElement('div');
  previewHolder.style.cssText = 'flex:0 0 auto;width:110px;touch-action:none';
  const paintPreview = () => {
    const sp = specForItem(it);
    previewHolder.innerHTML = '';
    if (!sp) return;
    const cv = compose(sp, 3, phaseNow());
    cv.style.width = previewWidth(cv, 110) + 'px'; cv.style.height = 'auto';
    cv.style.pointerEvents = 'none';
    previewHolder.appendChild(cv);
  };
  if (spec) { r1.appendChild(previewHolder); paintPreview(); }
  const meta = document.createElement('div'); meta.style.minWidth = '0'; meta.style.flex = '1';
  meta.innerHTML = `<h3>${esc(nm(it))}</h3><div class="id">${esc(it.id)}</div>`;
  const tags = document.createElement('div'); tags.className = 'tags';
  const addTag = (t, col) => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; if (col) { s.style.borderColor = col; s.style.color = col; } tags.appendChild(s); };
  addTag(categoryLabel(it.cat));
  if (it.source) addTag('MOD · ' + (it.sourceName || it.source), '#a782d1');
  if (it.rarity) addTag(RARITY[it.rarity], D.colors.palette.rarity[it.rarity - 1]);
  if (it.cost != null) addTag('$' + it.cost, D.colors.tags.money);
  if (it.kind) addTag(it.kind);
  if (it.stake_level) addTag('底注等级 ' + it.stake_level);
  if (it.effect) addTag(it.effect);
  if (it.unlocked === false) addTag('未解锁');
  meta.appendChild(tags);
  r1.appendChild(meta);
  head.appendChild(r1);
  d.appendChild(head);

  const sect = (title) => { const s = document.createElement('div'); s.className = 'sect'; if (title) { const h = document.createElement('h4'); h.textContent = title; s.appendChild(h); } d.appendChild(s); return s; };

  if (it.source) {
    const s0 = sect('来源');
    const box = document.createElement('div'); box.className = 'names';
    box.innerHTML = `<div class="n"><i>Mod</i><span>${esc(it.sourceName || it.source)}</span></div>
      <div class="n"><i>Mod ID</i><span class="mono">${esc(it.source)}</span></div>` +
      (it.modFile ? `<div class="n"><i>声明于</i><span class="mono">${esc(it.modFile)}${it.modLine ? ':' + it.modLine : ''}</span></div>` : '') +
      `<div class="n"><i>原始键</i><span class="mono">${esc(it.set || '')}${it.cat && it.set && it.set !== it.cat ? ' / ' + esc(it.cat) : ''}</span></div>`;
    s0.appendChild(box);
    const btns = document.createElement('div'); btns.className = 'btns'; btns.style.marginTop = '9px';
    const b1 = document.createElement('button'); b1.className = 'btn';
    const filtered = S.source === it.source;
    b1.textContent = filtered ? '← 显示全部来源' : '只看这个 Mod 的内容';
    b1.title = filtered ? '当前就在只显示这个 Mod，点一下恢复全部来源' : '把图鉴筛选到这个 Mod 的内容';
    b1.onclick = () => {
      S.source = filtered ? 'all' : it.source;
      S.cat = 'all'; S.tab = 'codex';
      render();
      toast(filtered ? '已显示全部来源' : '只看 ' + (it.sourceName || it.source));
    };
    btns.appendChild(b1);
    s0.appendChild(btns);
  }

  const s1 = sect('描述');
  const dv = document.createElement('div'); dv.className = 'desc'; dv.innerHTML = descHTML(it);
  s1.appendChild(dv);
  if (it.note) {
    const nt = document.createElement('div');
    nt.className = 'hint'; nt.style.marginTop = '8px'; nt.style.color = 'var(--accent)';
    nt.textContent = it.note;
    s1.appendChild(nt);
  }

  // blind_chips is a 21-frame animation atlas — let the frame be scrubbed here
  if (it.cat === 'Blind' && it.pos) {
    const frames = (atlas('blind_chips') || {}).frames || 21;
    const s = sect('动画帧');
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:9px;flex-wrap:wrap';
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = '0'; sl.max = String(frames - 1); sl.step = '1'; sl.value = String(S.blindFrame);
    sl.style.cssText = 'flex:1;min-width:140px;accent-color:var(--accent)';
    const lab = document.createElement('span'); lab.className = 'mono'; lab.style.color = 'var(--fg3)';
    const setLab = () => { lab.textContent = `帧 ${S.blindFrame} / ${frames}`; };
    setLab();
    const play = document.createElement('button'); play.className = 'btn'; play.textContent = '▶ 播放';
    sl.oninput = () => { S.blindFrame = +sl.value; setLab(); paintPreview(); };
    play.onclick = () => {
      if (detailTimer) { clearInterval(detailTimer); detailTimer = null; play.textContent = '▶ 播放'; play.classList.remove('primary'); return; }
      play.textContent = '⏸ 暂停'; play.classList.add('primary');
      detailTimer = setInterval(() => {
        S.blindFrame = (S.blindFrame + 1) % frames;
        sl.value = String(S.blindFrame); setLab(); paintPreview();
      }, 110);
    };
    row.appendChild(sl); row.appendChild(lab); row.appendChild(play);
    s.appendChild(row);
    const h = document.createElement('div'); h.className = 'hint';
    h.textContent = `盲注贴图 BlindChips.png 是一张 ${frames} 帧的横向动画图集（每行一个盲注，${(atlas('blind_chips') || {}).px}×${(atlas('blind_chips') || {}).py} 像素一格）。拖动滑杆或播放即可逐帧查看，导出时输出当前帧。`;
    s.appendChild(h);
  }

  const langs = Object.keys(it.i18n || {}).filter((c) => c !== S.lang);
  if (langs.length) {
    const ns = sect('其它语言名称');
    const box = document.createElement('div'); box.className = 'names';
    for (const c of langs) box.innerHTML += `<div class="n"><i>${langLabel(c)}</i><span>${esc(it.i18n[c])}</span></div>`;
    ns.appendChild(box);
  }
  const txlangs = Object.keys(it.text || {}).filter((c) => c !== S.lang && (it.text[c] || []).length);
  if (txlangs.length) {
    const s2 = sect('其它语言描述');
    for (const c of txlangs) {
      const b = document.createElement('div'); b.style.marginBottom = '8px';
      b.innerHTML = `<div style="font-size:11px;color:var(--fg3);margin-bottom:2px">${langLabel(c)}</div><div class="desc">${(it.text[c] || []).map((l) => `<span class="ln">${markup(l)}</span>`).join('')}</div>`;
      s2.appendChild(b);
    }
  }

  const sp = sect('贴图信息');
  const a = it.atlas ? D.atlases[it.atlas] : null;
  const kv = document.createElement('table'); kv.className = 'kv';
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  kv.innerHTML =
    row('图集 Atlas', it.atlas ? esc(it.atlas) : '—') +
    row('纹理文件', a ? esc(a.file) + ` <span style="color:var(--fg3)">(${a.w}×${a.h})</span>` : '—') +
    row('格子坐标', it.pos ? `x=${it.pos.x}, y=${it.pos.y}` : '—') +
    row('单格尺寸', a ? `${a.px}×${a.py} (1x) / ${a.px * a.scale}×${a.py * a.scale} (${a.scale}x 文件)` : `${CARD_W}×${CARD_H}`) +
    row('像素裁剪', it.pos && a ? `left=${it.pos.x * a.px * a.scale}, top=${it.pos.y * a.py * a.scale}, w=${a.px * a.scale}, h=${a.py * a.scale}` : '整图');
  sp.appendChild(kv);

  const s3 = sect('导出');
  const btns = document.createElement('div'); btns.className = 'btns';
  const mk = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns.appendChild(b); return b; };
  mk('⤓ PNG 1x', () => exportItemPNG(it, 1), ' primary');
  mk('⤓ PNG 2x', () => exportItemPNG(it, 2));
  mk('⤓ PNG 4x', () => exportItemPNG(it, 4));
  mk('⤓ PNG 6x', () => exportItemPNG(it, 6));
  mk('⤓ SVG', () => exportItemSVG(it, 2));
  mk('⤓ 单张 ZIP', async () => {
    const cv = compose(spec, 2); await ensureDrawn();
    const enc = new TextEncoder();
    const files = [{ name: `${it.id}.png`, data: await canvasBytes(cv) }, { name: `${it.id}.json`, data: enc.encode(JSON.stringify(itemJSON(it), null, 2)) }];
    save(zipStore(files), `${safeName(it.id)}.zip`, 'application/zip'); toast('已导出 ZIP');
  });
  mk('⧉ 复制链接', copyLink);
  mk('⧉ 复制 JSON', () => navigator.clipboard?.writeText(JSON.stringify(itemJSON(it), null, 2)).then(() => toast('已复制 JSON'), () => toast('复制失败')));
  mk('⧉ 复制坐标', () => navigator.clipboard?.writeText(it.pos ? `${it.atlas} (${it.pos.x}, ${it.pos.y})` : '无坐标').then(() => toast('已复制坐标'), () => toast('复制失败')));
  s3.appendChild(btns);
  const hint = document.createElement('div'); hint.className = 'hint';
  hint.textContent = '全部导出均为透明背景；PNG 使用最近邻缩放保持像素风。';
  s3.appendChild(hint);

  if (hasAnim(it)) {
    const s3b = sect('动态效果');
    const row = document.createElement('div'); row.className = 'btns';
    const btns2 = document.createElement('div'); btns2.className = 'btns';
    const animBtn = document.createElement('button'); animBtn.className = 'btn'; animBtn.textContent = '▶ 实时动画预览';
    animBtn.onclick = () => {
      if (S.anim.on) { stopAnim(); animBtn.textContent = '▶ 实时动画预览'; animBtn.classList.remove('primary'); paintPreview(); return; }
      animBtn.textContent = '⏸ 停止动画'; animBtn.classList.add('primary');
      startAnim(() => paintPreview());
    };
    btns2.appendChild(animBtn);
    const apng = document.createElement('button'); apng.className = 'btn primary'; apng.textContent = '🎞 导出 APNG 动图';
    apng.onclick = () => {
      const spec = specForItem(it);
      if (spec.standalone && spec.standalone.atlas === 'blind_chips') {
        const r = blindAnimFrames(it, 2);
        saveAnimAPNG(r.frames, r.delay, `${safeName(it.id)}_动画.png`);
      } else {
        const r = buildAnimFrames(spec, 2, animOpts());
        saveAnimAPNG(r.frames, r.delay, `${safeName(it.id)}_动画.png`);
      }
    };
    btns2.appendChild(apng);
    const gif = document.createElement('button'); gif.className = 'btn primary'; gif.textContent = '🎞 导出 GIF 动图';
    gif.onclick = () => {
      const spec = specForItem(it);
      toast('正在渲染并量化 GIF…');
      setTimeout(() => {
        try {
          if (spec.standalone && spec.standalone.atlas === 'blind_chips') {
            const r = blindAnimFrames(it, 2);
            saveAnimGIF(r.frames, r.delay, `${safeName(it.id)}_动图.gif`, S.gifBg);
          } else {
            const r = buildAnimFrames(spec, 2, animOpts());
            saveAnimGIF(r.frames, r.delay, `${safeName(it.id)}_动图.gif`, S.gifBg);
          }
        } catch (e) { toast('GIF 生成失败：' + e.message) }
      }, 30);
    };
    btns2.appendChild(gif);
    const fz = document.createElement('button'); fz.className = 'btn'; fz.textContent = '🎞 导出帧序列 ZIP';
    fz.onclick = () => {
      const spec = specForItem(it);
      if (spec.standalone && spec.standalone.atlas === 'blind_chips') {
        const r = blindAnimFrames(it, 2);
        saveFrameZip(r.frames, r.delay, `${safeName(it.id)}_帧序列.zip`);
      } else {
        const r = buildAnimFrames(spec, 2, animOpts());
        saveFrameZip(r.frames, r.delay, `${safeName(it.id)}_帧序列.zip`);
      }
    };
    btns2.appendChild(fz);
    const seamInfo = document.createElement('div'); seamInfo.className = 'hint mono';
    if (!(spec.standalone)) {
      const m = loopSeamRatio(buildAnimFrames(specForItem(it), 1, animOpts(specForItem(it))).frames);
      const o = animOpts(specForItem(it));
    if (m) {
      seamInfo.textContent = `循环接缝 ${(m.seam * 100).toFixed(2)}% ／ 平均帧差 ${(m.avg * 100).toFixed(2)}% → 接缝比 ${m.ratio.toFixed(2)}（越接近 1 越顺）`
        + (o.autoPeriod ? ` · 已按检测到的循环点 ${o.autoPeriod.toFixed(2)}s 导出` : '');
    }
    }
    btns2.appendChild(seamInfo);
    s3b.appendChild(btns2);
    const h2 = document.createElement('div'); h2.className = 'hint';
    h2.innerHTML = '这一项在原版里是<b>代码驱动的动态效果</b>（着色器流光 / 悬浮立绘 / 逐帧动画）。<br>' +
      '<b>速度</b>与<b>循环方式</b>沿用合成台的设置（默认 4× 加速 + 来回循环）。游戏里是 1× 实时速度，一个完整周期长达二三十秒，所以默认加速才能在几秒内看全。<br>' +
      '<b>GIF</b>：任何看图软件（含 Windows 自带照片）都能看到动画，代价是 256 色。<br>' +
      '<b>APNG</b>：全彩带透明，画质更好，但 Windows 自带照片查看器只会显示第一帧，需要用浏览器等支持 APNG 的工具打开。<br>' +
      '「帧序列 ZIP」输出逐帧 PNG，方便导入 PR / AE / Aseprite。' +
      (it.cat === 'Blind' ? '<br>盲注贴图有 21 帧，其中大部分是同一姿势的静止帧，导出时会自动去重，只保留真正变化的帧。' : '');
    s3b.appendChild(h2);
    if (!GL) {
      const w = document.createElement('div'); w.className = 'hint'; w.style.color = 'var(--red)';
      w.textContent = '当前浏览器未启用 WebGL，着色器类动画无法渲染。';
      s3b.appendChild(w);
    }
  }

  if (['Enhancement', 'Edition', 'Seal', 'Sticker'].includes(it.cat)) {
    const s4 = sect('应用到任意牌上预览');
    const p = document.createElement('div'); p.className = 'hint';
    p.textContent = '打开「卡牌合成台」，即可把本项叠加到任意扑克牌上查看外观变化并导出。';
    const b = document.createElement('button'); b.className = 'btn primary'; b.style.marginTop = '8px';
    b.textContent = '⚒ 前往合成台';
    b.onclick = () => {
      if (it.cat === 'Enhancement') S.forge.enhancement = it.id;
      if (it.cat === 'Edition') S.forge.edition = it.id;
      if (it.cat === 'Seal') S.forge.seal = it.key;
      if (it.cat === 'Sticker') {
        S.forge.baseType = 'Joker';
        S.forge.base = 'j_joker';
        if (['eternal', 'perishable', 'rental'].includes(it.key)) S.forge.stickers[it.key] = true;
        else S.forge.stickers.color = it.key;
      }
      S.tab = 'forge'; render();
    };
    s4.appendChild(p); s4.appendChild(b);
  }

  const s5 = sect('原始数据');
  const cfg = document.createElement('div'); cfg.className = 'cfgbox';
  cfg.textContent = JSON.stringify(it.raw && Object.keys(it.raw).length ? it.raw : it.config, (k, v) => (typeof v === 'function' ? '[function]' : v), 1);
  s5.appendChild(cfg);
  if (it.textRaw && Object.keys(it.textRaw).length) {
    const raw = document.createElement('div'); raw.className = 'cfgbox'; raw.style.marginTop = '8px'; raw.style.color = '#8fa4b5';
    raw.textContent = JSON.stringify(it.textRaw, null, 1);
    const lbl = document.createElement('div'); lbl.className = 'hint'; lbl.textContent = '原始本地化文本（含 #n# 占位符）：';
    s5.appendChild(lbl); s5.appendChild(raw);
  }
  const rawBtn = document.createElement('button'); rawBtn.className = 'btn'; rawBtn.style.marginTop = '8px';
  rawBtn.textContent = '⧉ 复制原始 Lua 表';
  rawBtn.onclick = () => navigator.clipboard?.writeText(cfg.textContent).then(() => toast('已复制'), () => toast('复制失败'));
  s5.appendChild(rawBtn);
}

/* ---------------------------------------------------------------- shell */
let detailTimer = null;
function render () {
  if (detailTimer) { clearInterval(detailTimer); detailTimer = null; }
  stopAnim();
  S.anim.t = S.phase;
  renderSidebar();
  const content = document.getElementById('content');
  content.innerHTML = '';
  if (S.tab === 'codex') viewCodex(content);
  else if (S.tab === 'forge') { forgeRedraw = null; viewForge(content); }
  else if (S.tab === 'atlas') viewAtlas(content);
  else if (S.tab === 'hands') viewHands(content);
  else if (S.tab === 'shaders') viewShaders(content);
  else if (S.tab === 'data') viewData(content);
  else if (S.tab === 'mods') viewMods(content);
  renderDetail();
  syncHash();
  document.getElementById('statItems').textContent = ITEMS.length;
  document.getElementById('statSel').textContent = S.sel ? S.sel : '—';
}
function buildTopbar () {
  const tb = document.getElementById('topbar');
  tb.innerHTML = `
    <button class="tbtn" id="navToggle" title="分类" aria-label="打开分类">☰</button>
    <div id="logo"><b>BALATRO</b><span>素材图鉴 · v${D.meta.version || '1.0.1o'}</span></div>
    <div id="searchWrap"><span class="ico">🔍</span><input id="search" placeholder="搜索：名称 / ID / 描述 / cat:Joker  cost>=5  rarity:3  pos:0,0" autocomplete="off"><button id="clearSearch" title="清空">✕</button></div>
    <div class="tbtools">
      <select id="langSel" class="tbtn" title="语言">${D.meta.locales.map((l) => `<option value="${l.code}"${l.code === S.lang ? ' selected' : ''}>${l.label}</option>`).join('')}</select>
      <select id="scaleSel" class="tbtn" title="显示尺寸">${[1, 2, 3, 4].map((s) => `<option value="${s}"${s === S.scale ? ' selected' : ''}>显示 ${s}x</option>`).join('')}</select>
      <div class="slider" title="版本特效与悬浮立绘的定格相位；0 = 立绘摆正"><label>相位</label><input id="phase" type="range" min="0" max="240" step="1" value="${S.phase}"></div>
      <button class="tbtn" id="btnRawSize" title="小小丑 / 半张小丑 / 拍立得 / 方块小丑 / 补充包在原版里卡框尺寸被改过；点这里改成按原始贴图尺寸渲染与导出">📐 原尺寸</button>
      <button class="tbtn" id="btnZip">⤓ 导出当前分类 ZIP</button>
      <button class="tbtn" id="btnHelp">? 帮助</button>
    </div>`;
  const si = document.getElementById('search');
  si.value = S.q;
  let deb;
  si.oninput = () => { clearTimeout(deb); deb = setTimeout(() => { S.q = si.value; render(); }, 130); };
  si.onkeydown = (e) => { if (e.key === 'Escape') { si.value = ''; S.q = ''; render(); } };
  document.getElementById('clearSearch').onclick = () => { si.value = ''; S.q = ''; render(); };
  document.getElementById('langSel').onchange = (e) => { S.lang = e.target.value; render(); };
  document.getElementById('scaleSel').onchange = (e) => { S.scale = +e.target.value; render(); };
  document.getElementById('phase').oninput = (e) => { S.phase = +e.target.value; if (S.tab === 'forge' && forgeRedraw) forgeRedraw(); };
  const rawBtn = document.getElementById('btnRawSize');
  rawBtn.classList.toggle('on', S.rawSize);
  rawBtn.onclick = () => {
    S.rawSize = !S.rawSize;
    rawBtn.classList.toggle('on', S.rawSize);
    toast(S.rawSize ? '已切换为原始贴图尺寸（忽略原版卡框缩放）' : '已恢复原版卡框尺寸');
    render();
  };
  document.getElementById('btnZip').onclick = () => exportList(currentList());
  document.getElementById('btnHelp').onclick = showHelp;
  document.getElementById('navToggle').onclick = () => toggleDrawer('nav-open');
}
/* ---------------------------------------------------------- mobile drawers */
const isNarrow = () => window.matchMedia('(max-width: 820px)').matches;
function toggleDrawer (cls, force) {
  const on = force === undefined ? !document.body.classList.contains(cls) : force;
  for (const c of ['nav-open', 'detail-open']) if (c !== cls) document.body.classList.remove(c);
  document.body.classList.toggle(cls, on);
  return on;
}
function closeDrawers () { document.body.classList.remove('nav-open', 'detail-open'); }
function showHelp () {
  const d = document.getElementById('detail');
  d.className = '';
  d.innerHTML = `<div class="dhead"><h3>使用说明</h3><div class="id">Balatro 素材图鉴</div></div>
  <div class="sect"><h4>这是什么</h4><div class="desc">把 <code>${esc(D.meta.source)}</code> 里的全部美术素材与游戏数据解析出来，做成一个可离线打开的查看 / 预览 / 提取工具。共收录 <b>${ITEMS.length}</b> 个条目、<b>${Object.keys(D.atlases).length}</b> 个图集。</div></div>
  <div class="sect"><h4>搜索语法</h4><div class="desc">
    普通关键词会同时匹配 <b>ID / 所有语言名称 / 描述原文 / 配置数值 / 图集坐标</b>。<br>
    还支持字段过滤：<br>
    <span class="mono">cat:Joker</span> 分类 &nbsp; <span class="mono">set:Tarot</span> 原始 set<br>
    <span class="mono">rarity:3</span> 稀有度 &nbsp; <span class="mono">cost&lt;=4</span> 费用上限<br>
    <span class="mono">atlas:Jokers</span> 图集 &nbsp; <span class="mono">pos:0,0</span> 格子坐标<br>
    <span class="mono">effect:Mult</span> 效果关键词<br>
    可以混用：<span class="mono">cat:Joker rarity:1 cost&gt;=4</span>
  </div></div>
  <div class="sect"><h4>强化 / 蜡封 / 版本的外观变化</h4><div class="desc">
    进入 <b>卡牌合成台</b>：选一张扑克牌，再叠加 <b>强化牌</b>（奖励、倍率、万能、玻璃、钢铁、石头、黄金、幸运）、
    <b>蜡封</b>、<b>贴纸</b> 与 <b>版本</b>（闪箔 / 镭射 / 彩虹 / 负片），即可看到和原版一致的外观变化。<br>
    版本特效是直接从 <code>resources/shaders/*.fs</code> 移植的 GLSL，顶栏「相位」滑杆可以换一个定格瞬间。
  </div></div>
  <div class="sect"><h4>导出格式</h4><div class="desc">
    · <b>PNG</b>：1x / 2x / 4x / 6x，透明背景（2x 为游戏原始像素）<br>
    · <b>SVG</b>：内嵌位图的矢量容器，方便排版<br>
    · <b>ZIP</b>：整批导出，含 PNG + manifest.json + data.csv + README<br>
    · <b>JSON / CSV / Markdown</b>：数据总表右上角<br>
    · <b>.fs</b>：着色器源码，在「着色器」页导出
  </div></div>
  <div class="sect"><h4>盲注动画</h4><div class="desc">
    <code>BlindChips.png</code> 是 21 帧的横向动画图集。打开任意盲注的详情页，用「动画帧」滑杆或播放按钮逐帧查看，导出的是当前帧。
  </div></div>
  <div class="sect"><h4>导入 Mod</h4><div class="desc">
    左侧「<b>导入 Mod</b>」可以直接读 <b>Steamodded（SMODS）格式</b> 的 Mod：拖入整个 Mod 文件夹或它的 zip，
    解析器会读 <code>manifest.json</code>、入口 lua、<code>assets/{{1x,2x}}</code> 图集与 <code>localization/</code>，
    把 Mod 的小丑牌 / 消耗品 / 自定义类型接进图鉴，并单独标上 <b>MOD</b> 角标。<br>
    全程在本地完成，不联网、不上传文件。若某个牌是运行时循环生成的，会写进导入日志的警告里。
  </div></div>
  <div class="sect"><h4>数据来源</h4><div class="desc">
    条目与数值解析自 <code>game.lua</code>（P_CENTERS / P_BLINDS / P_TAGS / P_SEALS / P_STAKES / P_CARDS）、
    <code>challenges.lua</code> 与 <code>localization/*.lua</code>；贴图取自 <code>resources/textures/2x/</code>。<br>
    描述中的 <span class="ph">#n#</span> 是原版运行时才计算的数值（例如「当前为 X 倍率」），此处原样保留。
  </div></div>
  <div class="sect"><h4>快捷键</h4><div class="desc"><kbd>/</kbd> 聚焦搜索 &nbsp; <kbd>Esc</kbd> 清空搜索 &nbsp; <kbd>←</kbd><kbd>→</kbd> 上一个 / 下一个条目</div></div>
  <div class="sect"><h4>关于本站</h4><div class="desc">
    这是一个<b>非官方粉丝工具</b>，与 <b>LocalThunk</b> / <b>Playstack</b> 没有任何关联。<br>
    站点与页面本身<b>不包含任何游戏素材或游戏数据</b>：上面看到的每一张贴图、每一条数据，都是用你自己电脑上的游戏文件在这个页面里当场解析出来的，
    解析结果只留在浏览器内存里，关闭页面即消失，全程不联网、不上传。<br>
    游戏素材与数据的版权归原作者所有；本站只提供「查看你自己拥有的那份游戏」的工具，请勿把解析结果当作素材包传播。
    ${window.__SITE_HOME__ ? `<br><br>想回到工具箱看别的工具？<a href="${window.__SITE_HOME__}" style="color:var(--accent)">← 返回工具箱</a>（左下角状态栏也有一个入口）` : ''}
  </div></div>`;
}
function buildStatus () {
  const st = document.getElementById('status');
  const stamp = window.__APP_BUILD__ ? ` · 构建 ${window.__APP_BUILD__}` : '';
  /* 挂在上层工具箱站点里时，状态栏最左边放一个回工具箱的小入口（站点构建才会设这个变量） */
  const home = window.__SITE_HOME__ ? `<a class="homebtn" href="${window.__SITE_HOME__}" title="回到工具箱">← 工具箱</a>` : '';
  st.innerHTML = `${home}<span>条目 <b id="statItems">${ITEMS.length}</b></span><span>当前 <b id="statSel">—</b></span>
    <span>图集 <b>${Object.keys(D.atlases).length}</b></span><span>贴图 <b>${D.atlasIndex.length}</b></span>
    <span>语言 <b>${D.meta.locales.length}</b></span>${MODS.length ? `<span>Mod <b>${MODS.length}</b> · ${MODS.reduce((a, m) => a + m.items, 0)} 条</span>` : ''}<span style="margin-left:auto" title="查看器代码的构建号：和别人对比时可以确认是不是同一版">数据生成于 ${new Date(D.meta.generated).toLocaleString()} · 离线运行${stamp}</span>`;
}

/* ------------------------------------------------------------------ init */
function init () {
  applyHash();
  buildTopbar();
  buildStatus();
  render();
  window.addEventListener('hashchange', () => { if (applyHash()) render() });
  // mobile drawers: backdrop closes, Escape closes, resizing to desktop resets
  const bd = document.getElementById('backdrop');
  if (bd) bd.onclick = closeDrawers;
  window.addEventListener('resize', () => { if (!isNarrow()) closeDrawers(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });
  document.addEventListener('keydown', (e) => {    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'select') { e.preventDefault(); document.getElementById('search').focus(); return; }
    if (tag === 'input' || tag === 'select') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const list = currentList();
      if (!list.length) return;
      let i = list.findIndex((x) => x.id === S.sel);
      i = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1);
      if (i < 0) i = 0;
      selectItem(list[i].id);
      const el = document.querySelector(`.cell[data-id="${list[i].id}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  });
  // a mod dropped anywhere on the page is imported instead of navigating the browser away
  let dragDepth = 0;
  const hasFiles = (e) => !!(e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0);
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; document.body.classList.add('dropping') });
  window.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dropping') });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0; document.body.classList.remove('dropping');
    S.tab = 'mods'; S.source = 'all'; render();   // land on the import panel so the log is visible
    filesFromDrop(e.dataTransfer).then((files) => importBatch(files));
  });

  // warm up every sheet, then repaint once they are decoded
  for (const f in ATLAS) img(f);
  ALL_READY = Promise.all(Object.keys(ATLAS).map((f) => IMG_READY[f]));
  // Debug / scripting handle: drive the viewer straight from the console.
  window.__BALATRO__ = {
    data: D, state: S, items: ITEMS, byId: BY_ID, atlases: D.atlases, colors: D.colors,
    compose, specForItem, tileLayer, shade, shadeTile, glApply, uvRectOf, phaseNow, hasAnim, shaderPreview,
    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts, refreshForgeLists, forgeSpec,
    hashString, applyHash, syncHash, shareUrl, copyLink,
    encodeGIF, encodeAPNG, buildAnimFrames, loopSeamRatio,
    renderAnim, encodeAPNG, zipStore, canvasBytes, toCSV, itemJSON, save, downloadText, render, toast,
    webgl: !!GL,
    get shaderPrograms () { return GL ? GL.names() : [] },
    // --- mod import ---
    mods: MODS, importModZip, importModFiles, importBatch, importZipBuffer, filesFromDrop, removeMod, sourceItems,
    modImport: window.__MODIMPORT__, categoryLabel,
  };
  ALL_READY.then(() => {
    // the handle exists before the first paint (which waits for every sheet to decode)
    window.__BALATRO_READY__ = false;
    if (S.tab === 'codex' || S.tab === 'hands' || S.tab === 'atlas') render();
    else if (S.tab === 'forge' && forgeRedraw) forgeRedraw();
    console.log('[Balatro 素材图鉴] 已加载', ITEMS.length, '个条目 /', Object.keys(D.atlases).length, '个图集 /', Object.keys(ATLAS).length, '张贴图 /',
      GL ? GL.names().length + ' 个着色器就绪' : '无 WebGL');
    if (MODS.length) console.log('[Balatro 素材图鉴] 已导入', MODS.length, '个 Mod');
    console.log('[Balatro 素材图鉴] 控制台可用 window.__BALATRO__ 直接调用 compose / encodeAPNG 等接口');
    // 首帧之后才置位，测试/驱动脚本可安全等待
    setTimeout(() => { window.__BALATRO_READY__ = true; }, 0);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
