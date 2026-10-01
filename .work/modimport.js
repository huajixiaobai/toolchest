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
