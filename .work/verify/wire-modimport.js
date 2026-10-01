// Line-ending-agnostic version of the mod-import wiring patch.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, '..', 'app.js')
let s = fs.readFileSync(f, 'utf8')
const before = s
const EOL = s.includes('\r\n') ? '\r\n' : '\n'

const anchor = '  atlasOpen: {},' + EOL + '};' + EOL
if (!s.includes(anchor)) { console.log('state anchor missing'); process.exit(1) }

const blockLines = [
  "  atlasOpen: {},",
  "  source: 'all',   // 'all' | 'vanilla' | <mod id>",
  '};',
  '/* ------------------------------------------------------- imported mods */',
  'const MODS = [];',
  'const CAT_LABELS = new Map();',
  'function categoryLabel (key) {',
  '  if (CAT_LABELS.has(key)) return CAT_LABELS.get(key);',
  '  const known = CATS.find((c) => c[0] === key);',
  '  return known ? known[1] : key;',
  '}',
  '/** Register a parsed mod: atlas images, entries, and any new card types it declares. */',
  'async function registerMod (parsed) {',
  '  const modId = parsed.id;',
  "  if (MODS.some((m) => m.id === modId)) return { ok: false, reason: '已导入同名 mod：' + modId };",
  '  const addedAtlas = [];',
  '  for (const a of parsed.atlases) {',
  "    const file = 'mod/' + modId + '/' + a.file;",
  "    const url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/png' }));",
  '    ATLAS[file] = url;',
  '    delete IMG[file]; delete IMG_READY[file];',
  '    const im = new Image();',
  '    const dims = await new Promise((res) => { im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = url });',
  '    const w = dims[0]; const h = dims[1];',
  "    if (!w || !h) { parsed.warnings.push('图集 ' + a.key + ' 的图片无法解码'); continue }",
  '    D.atlases[a.key] = {',
  '      name: a.key, file, px: a.px, py: a.py, w, h, scale: a.scale,',
  '      cols: Math.max(1, Math.round(w / (a.scale * a.px))),',
  '      rows: Math.max(1, Math.round(h / (a.scale * a.py))),',
  "      frames: null, kind: 'mod',",
  '    };',
  '    addedAtlas.push(a.key);',
  '  }',
  '  for (const t of parsed.types) {',
  "    if (!CAT_LABELS.has(t.key)) CAT_LABELS.set(t.key, t.key + '（mod 新类型）');",
  '  }',
  '  for (const it of parsed.items) {',
  "    if (BY_ID[it.id]) it.id = it.id + '@' + modId;",
  '    it.source = modId;',
  '    it.sourceName = parsed.name;',
  '    ITEMS.push(it);',
  '    BY_ID[it.id] = it;',
  '    D.counts[it.cat] = (D.counts[it.cat] || 0) + 1;',
  '  }',
  '  MODS.push({',
  '    id: modId, name: parsed.name, version: parsed.version, author: parsed.author,',
  '    items: parsed.items.length, atlasKeys: addedAtlas, warnings: parsed.warnings, stats: parsed.stats,',
  '  });',
  '  return { ok: true, items: parsed.items.length, atlases: addedAtlas.length, warnings: parsed.warnings };',
  '}',
  'async function importModFiles (files, fallbackName) {',
  '  const parsed = window.__MODIMPORT__.parseMod(files, fallbackName);',
  '  const res = await registerMod(parsed);',
  '  return Object.assign(res, { mod: parsed });',
  '}',
  'async function importModZip (arrayBuffer, name) {',
  '  const files = await window.__MODIMPORT__.readZip(arrayBuffer);',
  '  return importModFiles(files, name);',
  '}',
  '/** Unload a mod and rebuild counts. */',
  'function removeMod (id) {',
  "  for (let i = ITEMS.length - 1; i >= 0; i--) if (ITEMS[i].source === id) { delete BY_ID[ITEMS[i].id]; ITEMS.splice(i, 1) }",
  '  const idx = MODS.findIndex((x) => x.id === id);',
  '  if (idx >= 0) { for (const a of MODS[idx].atlasKeys) delete D.atlases[a]; MODS.splice(idx, 1) }',
  '  for (const k of Object.keys(D.counts)) delete D.counts[k];',
  '  for (const it of ITEMS) D.counts[it.cat] = (D.counts[it.cat] || 0) + 1;',
  "  if (S.source === id) S.source = 'all';",
  '  render();',
  '}',
  '/** Entries visible under the current source filter. */',
  'function sourceItems () {',
  "  if (S.source === 'all') return ITEMS;",
  "  if (S.source === 'vanilla') return ITEMS.filter((i) => !i.source);",
  '  return ITEMS.filter((i) => i.source === S.source);',
  '}',
  '',
]
s = s.replace(anchor, blockLines.join(EOL) + EOL)

const clOld = ['function currentList () {',
  "  let list = S.cat === 'all' ? ITEMS : ITEMS.filter((i) => i.cat === S.cat);",
  '  list = search(list, S.q);',
  '  return sortItems(list, S.sort);',
  '}'].join(EOL)
const clNew = ['function currentList () {',
  '  const base = sourceItems();',
  "  let list = S.cat === 'all' ? base : base.filter((i) => i.cat === S.cat);",
  '  list = search(list, S.q);',
  '  return sortItems(list, S.sort);',
  '}'].join(EOL)
if (!s.includes(clOld)) { console.log('currentList anchor missing'); process.exit(1) }
s = s.replace(clOld, clNew)

fs.writeFileSync(f, s)
console.log('app.js patched:', before !== s)
try { new Function(s); console.log('syntax OK') } catch (e) { console.log('syntax ERROR:', e.message) }
