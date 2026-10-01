/* modimport.js — support GitHub-source-style packs and Cryptid-style item tables:
   - the manifest may be named <id>.json instead of manifest.json
   - the mod root may have to be guessed from where the .lua files are
   - items may be plain tables with an `object_type` key instead of SMODS.X{...} calls
   - prefix_config.key = false must be honoured                                   */
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

/* ---------------------------------------------------- manifest discovery */
rep('modimport.js',
  `/** Some packs wrap everything in one top folder; find where manifest.json lives. */
function findRoot (files) {
  let best = null
  for (const path of files.keys()) {
    if (!/(^|\\/)manifest\\.json$/i.test(path)) continue
    const dir = path.replace(/manifest\\.json$/i, '').replace(/\\/$/, '');
    if (best === null || dir.length < best.length) best = dir
  }
  return best === null ? '' : best
}`,
  `const dirOf = (p) => p.replace(/[^/]*$/, '').replace(/\\/$/, '')

/** A file is this mod's manifest if it is manifest.json, or a root-level .json with mod fields. */
function isManifestPath (p) {
  if (!/\\.json$/i.test(p)) return false
  if (/(^|\\/)manifest\\.json$/i.test(p)) return true
  const depth = p.split('/').length
  return depth <= 2   // <root>/anything.json or anything.json
}

function looksLikeManifest (text) {
  try {
    const j = JSON.parse(text)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return false
    // Steamodded manifests always name themselves and point at an entry file
    return !!(j.id || j.name) && !!(j.main_file || j.version_number || j.version || j.prefix)
  } catch { return false }
}

/**
 * Some packs wrap everything in one top folder. GitHub's "Download ZIP" is one of those and
 * names the manifest after the mod (Cryptid.json), so look for any plausible manifest.
 */
function findRoot (files) {
  let best = null
  for (const p of files.keys()) {
    if (!isManifestPath(p)) continue
    const bytes = files.get(p)
    if (!/\\.json$/i.test(p)) continue
    if (!looksLikeManifest(dec(bytes))) continue
    const dir = dirOf(p)
    if (best === null || dir.length < best.length) best = dir
  }
  if (best !== null) return best
  // no manifest at all: the shallowest folder that directly holds lua files is the mod root
  const depths = new Map()
  for (const p of files.keys()) {
    if (!/\\.lua$/i.test(p)) continue
    const dir = dirOf(p)
    depths.set(dir, (depths.get(dir) || 0) + 1)
  }
  let pick = ''
  let pickDepth = Infinity
  for (const dir of depths.keys()) {
    const d = dir === '' ? 0 : dir.split('/').length
    if (d < pickDepth) { pickDepth = d; pick = dir }
  }
  return pick
}`,
  'manifest discovery + root')

/* the manifest file itself is no longer necessarily manifest.json */
rep('modimport.js',
  `  let manifest = {};
  const mf = rel.get('manifest.json') || files.get('manifest.json');
  if (mf) { try { manifest = JSON.parse(dec(mf)) } catch (e) { warnings.push('manifest.json 解析失败：' + e.message) } }
  else warnings.push('没有找到 manifest.json，已按目录名 / 文件名推断 mod 信息');`,
  `  let manifest = {};
  let manifestPath = null;
  for (const p of rel.keys()) {
    if (!isManifestPath(p) || p.includes('/')) continue;
    if (looksLikeManifest(dec(rel.get(p)))) { manifestPath = p; break }
  }
  if (!manifestPath) {
    for (const p of rel.keys()) {
      if (!/\\.json$/i.test(p) || !looksLikeManifest(dec(rel.get(p)))) continue;
      manifestPath = p; break
    }
  }
  if (manifestPath) {
    try {
      manifest = JSON.parse(dec(rel.get(manifestPath)));
      if (manifestPath !== 'manifest.json') warnings.push('mod 的元数据文件叫 ' + manifestPath + '，已当作 manifest.json 读取');
    } catch (e) { warnings.push(manifestPath + ' 解析失败：' + e.message) }
  } else warnings.push('没有找到 manifest.json，已按目录名 / 文件名推断 mod 信息');`,
  'manifest file lookup')

/* ------------------------------------------------------------ decl source */
rep('modimport.js',
  `  const allLua = [...rel.keys()].filter((k) => k.toLowerCase().endsWith('.lua'));
  for (const p of allLua) {
    const src = dec(rel.get(p));
    srcOf.set(p, src);
    let d = [];
    try { d = LUA.extractDecls(src) } catch (e) { warnings.push(p + ' 解析失败：' + e.message) }
    for (const x of d) { x.file = p; decls.push(x) }
  }`,
  `  const allLua = [...rel.keys()].filter((k) => k.toLowerCase().endsWith('.lua'));
  for (const p of allLua) {
    const src = dec(rel.get(p));
    srcOf.set(p, src);
    let d = [];
    try {
      d = LUA.extractDecls(src);
      // mods built on Cryptid declare content as plain tables carrying \`object_type\`
      if (LUA.extractItemTables) d = d.concat(LUA.extractItemTables(src));
    } catch (e) { warnings.push(p + ' 解析失败：' + e.message) }
    for (const x of d) { x.file = p; decls.push(x) }
  }`,
  'scan item tables too')

/* --------------------------------------------------- prefix_config honour */
rep('modimport.js',
  `    const cls = CLASS_PREFIX[d.type] || null;
    const cands = keyCandidates(key, prefix, cls);
    const fullKey = cands[cands.length - 1];`,
  `    const cls = CLASS_PREFIX[d.type] || null;
    // prefix_config.key = false means the object keeps the key exactly as written
    const noKeyPrefix = !!(t.prefix_config && t.prefix_config.key === false);
    const cands = noKeyPrefix ? [key] : keyCandidates(key, prefix, cls);
    const fullKey = cands[cands.length - 1];`,
  'prefix_config.key = false')

/* ------------------------------------------------ names + atlas resolution */
rep('modimport.js',
  `    const name = (inline && typeof inline.name === 'string' && inline.name) || (locEntry && locEntry.name) || key;`,
  `    const name = (inline && typeof inline.name === 'string' && inline.name)
      || (locEntry && locEntry.name)
      || (typeof t.name === 'string' && t.name ? t.name : null)
      || key;`,
  'inline name fallback')

/* the declared atlas may be prefixed by the framework even when the Atlas key is not */
rep('modimport.js',
  `    const atlasCands = keyCandidates(atlasKey, prefix, null);`,
  `    const atlasCands = keyCandidates(atlasKey, prefix, null);
    if (atlasKey.startsWith(prefix + '_')) atlasCands.push(atlasKey.slice(prefix.length + 1));`,
  'atlas spelling both ways')

/* ------------------------------------------------------------- new classes */
rep('modimport.js',
  `  Tag: 'Tag', Blind: 'Blind', Stake: 'Stake', Challenge: 'Challenge',
  PokerHand: 'PokerHand', DeckSkin: 'DeckSkin', UndiscoveredSprite: 'Undiscovered', Rarity: 'Rarity',
};`,
  `  Tag: 'Tag', Blind: 'Blind', Stake: 'Stake', Challenge: 'Challenge',
  PokerHand: 'PokerHand', DeckSkin: 'DeckSkin', UndiscoveredSprite: 'Undiscovered', Rarity: 'Rarity',
  Sleeve: 'Sleeve',   // Cryptid / CardSleeves: a deck sleeve, its own collection tab
};`,
  'Sleeve set')

rep('modimport.js',
  `  Challenge: 'c', Blind: 'bl',
};`,
  `  Challenge: 'c', Blind: 'bl', Sleeve: 'sleeve',
};`,
  'Sleeve class prefix')

/* ----------------------------------------------------- report unknown types */
rep('modimport.js',
  `    const setBase = SET_OF[d.type];
    if (setBase === undefined) continue; // not an entry-bearing type`,
  `    const setBase = SET_OF[d.type];
    if (setBase === undefined) {
      // Shader / Sound / Event / Achievement and friends carry no card art
      unknownTypes[d.type] = (unknownTypes[d.type] || 0) + 1;
      stats.dynamic++;
      continue
    }`,
  'count unknown types')

rep('modimport.js',
  `  const inferredAtlas = []; // atlases found by file name instead of at the declared path`,
  `  const inferredAtlas = []; // atlases found by file name instead of at the declared path
  const unknownTypes = {};  // declarations of classes that have no card art (Shader, Sound, ...)`,
  'unknownTypes decl')

rep('modimport.js',
  `  stats.inferredAtlas = inferredAtlas.length;`,
  `  stats.inferredAtlas = inferredAtlas.length;
  stats.unknownTypes = unknownTypes;
  const unknownList = Object.keys(unknownTypes);
  if (unknownList.length) warnings.push('另有 ' + unknownList.length + ' 种声明不属于卡牌素材，已跳过：' + unknownList.map((k) => k + '×' + unknownTypes[k]).join('、'));`,
  'unknown types warning')

console.log(fails ? 'FAILURES ' + fails : 'done')
