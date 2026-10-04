/* 第五十轮（A+B）：制作器从「一个条目」变成「一个 mod 工程」
   做法：MK 从 const 改成 let —— 它永远指向「正在编辑的那一条」，既有代码（贴图/帧序列/动图/逐帧时长/立绘/
   Lua 生成）一行都不用动；工程级字段与条目列表放进 MKR。导出时把 MK 临时切到每条上依次生成，
   图集 key 与文件名带上条目 slug，保证同一个 mod 里多条互不覆盖。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

const repAll = (from, to, label, want) => {
  const hits = s.split(from).length - 1;
  if (hits !== want) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次（期望 ' + want + '）'); process.exit(1); }
  s = s.split(from).join(to); console.log('  ✓ ' + label + '（' + hits + ' 处）'); n += hits;
};

/* ---------- ① MK 变「当前条目」，新增工程 MKR 与条目操作 ---------- */
rep("const MK = {\n  type: 'Joker',", "let MK = {\n  type: 'Joker',", 'MK 改成 let');

rep(
  'function mkType () { return MK_TYPES.filter((t) => t[0] === MK.type)[0] || MK_TYPES[0] }',
  L('/** 一个 mod 工程：工程级字段 + 条目列表。MK 永远指向 items[cur]，也就是「正在编辑的那一条」。 */',
    "const MK_PROJ_KEY = 'balatro.maker.project.v1';",
    'const MKR = {',
    '  modId: MK.modId, modName: MK.modName, author: MK.author, version: MK.version, prefix: MK.prefix, desc: MK.desc,',
    '  items: [MK], cur: 0, v: 1,',
    '};',
    '/** 条目在文件名 / 图集 key 里用的 slug */',
    "function mkSlug (it) { return String((it || MK).key || 'item').replace(/[^A-Za-z0-9_]/g, '_') || 'item' }",
    '/** 新条目：拿当前条目的图集当默认，名字按类型给 */',
    'function mkBlankItem (type) {',
    '  const ty = type || MK.type;',
    "  const d = MK_DEFAULT_NAME[ty] || ['新条目', 'newitem'];",
    '  return {',
    '    type: ty,',
    '    key: d[1],',
    "    art: { atlas: MK.art.atlas, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null },",
    '    rarity: 1, cost: 4, order: 100, weight: 1,',
    '    eternal: true, perishable: true, blueprint: true,',
    "    nameZh: d[0], nameEn: d[0], textZh: '', textEn: '',",
    "    effects: [{ when: 'card', cond: 'suit', condVal: 'Hearts', eff: 'chips', val: 50 }],",
    "    useKind: 'dollars', useVal: 4, set: 'Tarot',",
    "    soul: { on: false, atlas: MK.soul.atlas, pos: { x: 0, y: 2 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null },",
    "    advanced: false, lua: null, luaDirty: false, config: '', t: {}, cloneFrom: '',",
    '  };',
    '}',
    'function mkSelect (i) { if (i < 0 || i >= MKR.items.length) return; MKR.cur = i; MK = MKR.items[i] }',
    'function mkEnsureItems () { if (!MKR.items.length) MKR.items.push(mkBlankItem()); if (MKR.cur >= MKR.items.length) MKR.cur = MKR.items.length - 1; MK = MKR.items[MKR.cur] }',
    "function mkUniqueKey (base) {",
    '  const used = {};',
    '  MKR.items.forEach((it) => { if (it !== MK) used[it.key] = 1 });',
    "  const k = String(base || 'item').replace(/[^A-Za-z0-9_]/g, '_') || 'item';",
    '  if (!used[k]) return k;',
    '  let i = 2;',
    "  while (used[k + '_' + i]) i++;",
    "  return k + '_' + i;",
    '}',
    'function mkAddItem (type) {',
    '  const it = mkBlankItem(type);',
    '  it.key = mkUniqueKey(it.key);',
    '  MKR.items.push(it);',
    '  mkSelect(MKR.items.length - 1);',
    '  return it;',
    '}',
    '/** 复制当前条目：贴图 / 帧序列 / 立绘都跟着来，key 换个不重名的 */',
    'function mkDupItem () {',
    '  const keepArt = Object.assign({}, MK.art), keepSoul = Object.assign({}, MK.soul);',
    '  const it = mkBlankItem(MK.type);',
    '  for (const k of Object.keys(MK)) { if (k === \'art\' || k === \'soul\') continue; it[k] = MK[k] }',
    '  it.art = keepArt; it.soul = keepSoul;',
    "  it.effects = (MK.effects || []).map((e) => Object.assign({}, e));",
    "  it.key = mkUniqueKey(MK.key + '_copy');",
    "  it.nameZh = (MK.nameZh || MK.key) + ' 副本';",
    '  MKR.items.splice(MKR.cur + 1, 0, it);',
    '  mkSelect(MKR.cur + 1);',
    '  return it;',
    '}',
    'function mkDelItem () {',
    '  if (MKR.items.length <= 1) return false;',
    '  MKR.items.splice(MKR.cur, 1);',
    '  mkSelect(Math.max(0, MKR.cur - 1));',
    '  return true;',
    '}',
    'function mkMoveItem (d) {',
    '  const j = MKR.cur + d;',
    '  if (j < 0 || j >= MKR.items.length) return false;',
    '  const t = MKR.items[MKR.cur]; MKR.items[MKR.cur] = MKR.items[j]; MKR.items[j] = t;',
    '  mkSelect(j);',
    '  return true;',
    '}',
    '/** 按类型分组统计（概览与列表都用它） */',
    'function mkGrouped () {',
    '  const g = {};',
    '  MKR.items.forEach((it, i) => { (g[it.type] = g[it.type] || []).push({ it: it, i: i }) });',
    '  return MK_TYPES.map((t) => ({ type: t[0], name: t[1], rows: g[t[0]] || [] })).filter((x) => x.rows.length);',
    '}',
    '/** 工程 → 可序列化对象；withImages=true 时把上传的图与帧编成 dataURL（工程备份用） */',
    'function mkProjectJSON (withImages) {',
    "  const img = (cv) => { try { return cv && cv.toDataURL ? cv.toDataURL('image/png') : null } catch (e) { return null } };",
    '  const one = (it) => {',
    '    const o = {',
    '      type: it.type, key: it.key, rarity: it.rarity, cost: it.cost, order: it.order, weight: it.weight,',
    '      eternal: !!it.eternal, perishable: !!it.perishable, blueprint: !!it.blueprint,',
    '      nameZh: it.nameZh, nameEn: it.nameEn, textZh: it.textZh, textEn: it.textEn,',
    '      effects: (it.effects || []).map((e) => ({ when: e.when, cond: e.cond, condVal: e.condVal, eff: e.eff, val: e.val })),',
    "      useKind: it.useKind, useVal: it.useVal, set: it.set, advanced: !!it.advanced, config: it.config || '', cloneFrom: it.cloneFrom || '',",
    "      art: { atlas: it.art.atlas, pos: it.art.pos, weights: it.art.weights || null, gen: it.art.gen || null, delays: it.art.delays || null, uploadName: it.art.uploadName || '' },",
    "      soul: { on: !!it.soul.on, atlas: it.soul.atlas, pos: it.soul.pos, weights: it.soul.weights || null, gen: it.soul.gen || null, delays: it.soul.delays || null, uploadName: it.soul.uploadName || '' },",
    '    };',
    '    if (withImages) {',
    '      o.art.img = img(it.art.upload);',
    '      o.art.imgs = (it.art.frames || []).map(img).filter(Boolean);',
    '      o.soul.img = img(it.soul.upload);',
    '      o.soul.imgs = (it.soul.frames || []).map(img).filter(Boolean);',
    '    }',
    '    return o;',
    '  };',
    '  return { v: 1, modId: MKR.modId, modName: MKR.modName, author: MKR.author, version: MKR.version, prefix: MKR.prefix, desc: MKR.desc, cur: MKR.cur, items: MKR.items.map(one), at: Date.now() };',
    '}',
    '/** 从对象恢复（启动读 localStorage / 导入工程 JSON 都走它） */',
    'function mkApplyProject (o) {',
    '  if (!o || !o.items || !o.items.length) return false;',
    '  MKR.modId = o.modId || MKR.modId; MKR.modName = o.modName || MKR.modName; MKR.author = o.author || MKR.author;',
    '  MKR.version = o.version || MKR.version; MKR.prefix = o.prefix || MKR.prefix; MKR.desc = o.desc || MKR.desc;',
    '  MKR.items = o.items.map((x) => {',
    '    const it = mkBlankItem(x.type);',
    '    Object.assign(it, {',
    '      key: x.key || it.key, rarity: x.rarity != null ? x.rarity : it.rarity, cost: x.cost != null ? x.cost : it.cost,',
    '      order: x.order != null ? x.order : it.order, weight: x.weight != null ? x.weight : it.weight,',
    '      eternal: !!x.eternal, perishable: !!x.perishable, blueprint: !!x.blueprint,',
    "      nameZh: x.nameZh || it.nameZh, nameEn: x.nameEn || it.nameEn, textZh: x.textZh || '', textEn: x.textEn || '',",
    '      effects: (x.effects && x.effects.length ? x.effects : it.effects).map((e) => Object.assign({}, e)),',
    "      useKind: x.useKind || it.useKind, useVal: x.useVal != null ? x.useVal : it.useVal,",
    "      set: x.set || it.set, advanced: !!x.advanced, config: x.config || '', cloneFrom: x.cloneFrom || '',",
    '    });',
    "    if (x.art) it.art = { atlas: x.art.atlas || it.art.atlas, pos: x.art.pos || { x: 0, y: 0 }, upload: null, uploadName: x.art.uploadName || '', frames: null, animated: false, weights: x.art.weights || null, gen: x.art.gen || null, delays: x.art.delays || null };",
    "    if (x.soul) it.soul = { on: !!x.soul.on, atlas: x.soul.atlas || it.soul.atlas, pos: x.soul.pos || { x: 0, y: 0 }, upload: null, uploadName: x.soul.uploadName || '', frames: null, animated: false, weights: x.soul.weights || null, gen: x.soul.gen || null, delays: x.soul.delays || null };",
    '    return it;',
    '  });',
    '  MKR.cur = Math.max(0, Math.min(o.cur || 0, MKR.items.length - 1));',
    '  MK = MKR.items[MKR.cur];',
    '  return true;',
    '}',
    '/** 把工程 JSON 里的图片（dataURL）解回来贴到条目上 */',
    'async function mkRestoreImages (o) {',
    "  const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u });",
    '  const cnt = Math.min((o.items || []).length, MKR.items.length);',
    '  for (let i = 0; i < cnt; i++) {',
    '    const src = o.items[i]; const it = MKR.items[i];',
    '    if (src.art && src.art.img) { const im = await load(src.art.img); if (im) it.art.upload = im }',
    '    if (src.art && src.art.imgs && src.art.imgs.length) { const fl = []; for (const u of src.art.imgs) { const im = await load(u); if (im) fl.push(im) } if (fl.length > 1) { it.art.frames = fl; it.art.animated = true; it.art.upload = fl[0] } }',
    '    if (src.soul && src.soul.img) { const im = await load(src.soul.img); if (im) it.soul.upload = im }',
    '    if (src.soul && src.soul.imgs && src.soul.imgs.length) { const fl = []; for (const u of src.soul.imgs) { const im = await load(u); if (im) fl.push(im) } if (fl.length > 1) { it.soul.frames = fl; it.soul.upload = fl[0] } }',
    '  }',
    '}',
    '/** 自动保存：只存设置（图片太大） */',
    'function mkSaveProject () {',
    '  try { localStorage.setItem(MK_PROJ_KEY, JSON.stringify(mkProjectJSON(false))) } catch (e) { /* 隐私模式/超配额：不影响用 */ }',
    '}',
    'function mkLoadProject () {',
    '  try {',
    '    const raw = localStorage.getItem(MK_PROJ_KEY);',
    '    if (!raw) return false;',
    '    return mkApplyProject(JSON.parse(raw));',
    '  } catch (e) { return false }',
    '}',
    'function mkType () { return MK_TYPES.filter((t) => t[0] === MK.type)[0] || MK_TYPES[0] }'),
  '工程状态与条目操作'
);

/* ---------- ② 工程级字段引用改到 MKR ---------- */
rep("    ' <code>' + esc(MK.prefix) + '_' + esc(MK.key) + '</code> · ' + esc(mkShownText() || '还没有效果') +",
  "    ' <code>' + esc(MKR.prefix) + '_' + esc(MK.key) + '</code> · ' + esc(mkShownText() || '还没有效果') +", '摘要用工程前缀');
rep("  L.push('-- ' + MK.modName + ' · 由图鉴「Mod 制作器」生成');\n  L.push('-- 直接放：%AppData%/Balatro/Mods/' + MK.modId + '/');",
  "  L.push('-- ' + MKR.modName + ' · 由图鉴「Mod 制作器」生成');\n  L.push('-- 直接放：%AppData%/Balatro/Mods/' + MKR.modId + '/');", 'Lua 头部用工程字段');
rep('    id: MK.modId,\n    name: MK.modName,\n    author: MK.author,\n    version: MK.version,',
  '    id: MKR.modId,\n    name: MKR.modName,\n    author: MKR.author,\n    version: MKR.version,', 'manifest 用工程字段');
rep("    prefix: MK.prefix,\n    main_file: MK.modId + '.lua',", "    prefix: MKR.prefix,\n    main_file: MKR.modId + '.lua',", 'manifest 前缀与主文件');
rep("  files.push({ name: MK.modId + '.lua', data: TE.encode(mkLua()) });", "  files.push({ name: MKR.modId + '.lua', data: TE.encode(mkLua()) });", 'Lua 文件名');
rep("      save(bytes, MK.modId + '.zip', 'application/zip');\n      status('已生成 ' + MK.modId + '.zip（' + files.length + ' 个文件，' + Math.round(bytes.length / 1024) + ' KB）—— 解压到 %AppData%/Balatro/Mods/ 即可。', 'ok');",
  "      save(bytes, MKR.modId + '.zip', 'application/zip');\n      status('已生成 ' + MKR.modId + '.zip（' + files.length + ' 个文件 / ' + MKR.items.length + ' 个条目 / ' + Math.round(bytes.length / 1024) + ' KB）—— 直接丢进 %AppData%/Balatro/Mods/ 就行。', 'ok');", 'zip 名与提示');
rep('      const res = await importZipBuffer(zipStore(files), MK.modId);', '      const res = await importZipBuffer(zipStore(files), MKR.modId);', '自检用工程 id');

/* ---------- ③ 图集 key / 文件名按条目唯一，Lua 逐条目生成 ---------- */
rep("  L.push('SMODS.Atlas {');\n  for (const line of atlasLines('sheet', 'sheet.png', aAnim)) L.push(line);",
  "  const slug = mkSlug(MK);\n  L.push('SMODS.Atlas {');\n  for (const line of atlasLines('sheet_' + slug, 'sheet_' + slug + '.png', aAnim)) L.push(line);", '主体图集 key 唯一');
repAll("  L.push(\"    atlas = 'sheet',\");", '  L.push("    atlas = \'sheet_" + slug + "\',");', '主体 atlas 指向唯 key', 8);
rep("    for (const line of atlasLines('soul', 'soul.png', sAnim)) L.push(line);",
  "    for (const line of atlasLines('soul_' + slug, 'soul_' + slug + '.png', sAnim)) L.push(line);", '立绘图集 key 唯一');
rep('      L.push("    soul_atlas = \'soul\',");', '      L.push("    soul_atlas = \'soul_" + slug + "\',");', '立绘 atlas 指向唯 key');
rep("function mkLua () {", 'function mkItemLua () {', '单条目 Lua 改名');
rep('/* ---------------------------------------------------------------- 动效（按游戏里的做法）',
  L('/** 整个工程的 Lua：逐条目生成（生成时把 MK 临时切到那一条上），条目之间空一行 */',
    'function mkLua () {',
    '  const keep = MK;',
    '  const out = [];',
    '  MKR.items.forEach((it, i) => {',
    '    MK = it;',
    '    if (i) out.push(\'\');',
    '    out.push(mkItemLua());',
    '  });',
    '  MK = keep;',
    '    return out.join(\'\\n\');',
    '}',
    '/* ---------------------------------------------------------------- 动效（按游戏里的做法）'),
  '新增工程级 mkLua'
);
fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['let MK = {', 'const MKR = {', 'function mkItemLua ()', 'function mkLua () {', 'mkSlug(MK)', "atlas = 'sheet_", 'function mkProjectJSON (withImages)', 'function mkApplyProject (o)', 'function mkSaveProject ()'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
