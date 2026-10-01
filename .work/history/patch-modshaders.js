/* Mod shader support: read a mod's assets/shaders/*.fs, compile them, and let an Edition
   reference them by `shader = '<key>'` exactly like SMODS does. */
'use strict'
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

/* ---------------- modimport: collect the .fs files ---------------- */
rep('modimport.js',
  `  // ---- localization (same format as vanilla)`,
  `  // ---- shaders: SMODS reads <mod>/assets/shaders/<path> for every SMODS.Shader object
  const shaders = [];
  const shaderFiles = [...rel.keys()].filter((k) => /\\.fs$/i.test(k));
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
    if (!/(^|\\/)assets\\/shaders\\//i.test(f)) continue;
    shaders.push({ key: f.split('/').pop().replace(/\\.fs$/i, ''), path: f, source: dec(rel.get(f)) });
  }
  stats.shaders = shaders.length;

  // ---- localization (same format as vanilla)`,
  'collect mod shaders')

rep('modimport.js',
  `  stats.shaders = [...rel.keys()].filter((k) => /\\.fs$/i.test(k)).length;`,
  `  stats.shaderFiles = shaderFiles.length;`,
  'stats rename')

rep('modimport.js',
  `    items, types: [...new Set([...types.values()])],`,
  `    items, types: [...new Set([...types.values()])], shaders,`,
  'return shaders')

/* ---------------- app.js: compile them on import ---------------- */
rep('app.js',
  `  for (const t of parsed.types) {
    if (!CAT_LABELS.has(t.key)) CAT_LABELS.set(t.key, t.key + '（mod 新类型）');
  }`,
  `  for (const t of parsed.types) {
    if (!CAT_LABELS.has(t.key)) CAT_LABELS.set(t.key, t.key + '（mod 新类型）');
  }
  // shaders: SMODS prefixes the object key but sends the original one as the uniform name,
  // so register (and resolve) both spellings
  const modShaders = [];
  for (const sh of parsed.shaders || []) {
    const cands = keyCandidates(sh.key, parsed.prefix, null).concat([sh.key]);
    let prog = null;
    for (const cand of cands) {
      const p = GL && GL.defineShader(cand, sh.source);
      if (p) { prog = cand; MOD_SHADERS[cand] = sh.source; }
    }
    if (prog) modShaders.push(prog);
    else parsed.warnings.push('着色器 ' + sh.key + ' 无法编译（可能是顶点专用着色器）');
  }`,
  'compile mod shaders')

rep('app.js',
  `const MODS = [];
const CAT_LABELS = new Map();`,
  `const MODS = [];
const CAT_LABELS = new Map();
const MOD_SHADERS = {};   // shader key -> .fs source, for every imported mod`,
  'MOD_SHADERS')

rep('app.js',
  `    addedAtlas.push(a.key);
  }`,
  `    addedAtlas.push(a.key);
  }
  void modShaders;`,
  'keep reference')

/* editions reference their shader by name */
rep('app.js',
  `    case 'Edition': {
      const sh = it.raw && it.raw.set === 'Edition' ? it.id : null;
      return { center: baseCenter, front: sampleFront, edition: sh };
    }`,
  `    case 'Edition': {
      // vanilla editions are keyed by their own id (e_foil…); a mod edition names its .fs
      return { center: baseCenter, front: sampleFront, edition: editionShaderOf(it) };
    }`,
  'edition spec')

rep('app.js',
  `const EDITION_SHADER = { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' };`,
  `const EDITION_SHADER = { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' };
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
}`,
  'editionShaderOf')

rep('app.js',
  `  const gloss = EDITION_SHADER[spec.edition] || null;`,
  `  // a vanilla edition name, or the key of a shader an imported mod brought with it
  const gloss = EDITION_SHADER[spec.edition] || (GL && GL.programs[spec.edition] ? spec.edition : null);`,
  'gloss resolves mod shaders')

/* ---------------- forge: same resolution ---------------- */
rep('app.js',
  `    edition: a.edition ? F.edition : null,`,
  `    edition: a.edition ? editionShaderOf(BY_ID[F.edition]) : null,`,
  'forge edition shader')

/* ---------------- console API ---------------- */
rep('app.js',
  `    compose, specForItem, tileLayer, shade, shadeTile, glApply, uvRectOf, phaseNow, hasAnim, shaderPreview,`,
  `    compose, specForItem, tileLayer, shade, shadeTile, glApply, uvRectOf, phaseNow, hasAnim, shaderPreview,
    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey,`,
  'console API')

/* ---------------- the shader list should include mod shaders ---------------- */
rep('app.js',
  `      GL ? Object.keys(GL.programs).length + ' 个着色器就绪' : '无 WebGL');`,
  `      GL ? GL.names().length + ' 个着色器就绪' : '无 WebGL');`,
  'boot log count')

console.log(fails ? 'FAILURES ' + fails : 'done')
