/* 第四十七轮：动效换思路 —— 按「游戏里的做法」来
   结论（对着本机装的 Steamodded 源码核过）：
     · 游戏里的"动"就是「图集里横向 N 帧 + fps」这一件事：SMODS.Atlas 的 atlas_table = 'ANIMATION_ATLAS'
       + frames + fps（overrides.lua: fps = sprite_args.fps or atlas.fps or G.ANIMATION_FPS）。
     · 所以根本不需要"能解码动图文件"这个前提：没有动图也能动 —— 给一张静图，按预设把帧序列**现场渲染出来**就行。
   这一轮做的：
     ① 动效预设（浮动/呼吸/摇摆/闪烁/抖动/心跳/旋转）+ 帧数 + 帧率 + 幅度 → 现场生成帧序列
     ② 上传支持**多选**：每张图当一帧（GIF/APNG 之外的路，任何格式都能用）
     ③ 立绘的 Lua 修正：写 soul_atlas = 'soul'
        （overrides.lua: atlas_key = lc_soul_atlas or soul_atlas or lc_atlas or atlas or set ——
          原来只写 soul_pos 而没有 soul_atlas，游戏会去**主体的图集**里找那层前景，
          等于把牌面自己飘一遍，立绘那张图根本不会被用到） */
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

/* ---------- ① 动效预设 + 帧生成 + 统一取帧入口 ---------- */
const HOOK = L(
  '/* ---------------------------------------------------------------- 动效（按游戏里的做法）',
  ' * 游戏里的"动"就一件事：图集里横向排 N 帧 + fps（SMODS.Atlas 的 atlas_table = ANIMATION_ATLAS）。',
  ' * 所以这里不依赖"能拆动图文件"：给了帧序列就用帧序列（GIF / APNG / 多选图片），',
  ' * 没给就按预设把**一张静图现场渲染成帧序列**。帧是惰性生成的，改图集格子/改参数都不会留下过期缓存。 */',
  'const MK_MOTION = [',
  "  ['', '不用预设（有导入的帧就用导入的）'],",
  "  ['float', '上下浮动（像原版的盲注芯片那样来回飘）'],",
  "  ['breathe', '呼吸（整体缓慢放大缩小）'],",
  "  ['sway', '轻微摇摆（左右小幅旋转）'],",
  "  ['blink', '闪烁（明暗起伏）'],",
  "  ['shake', '抖动（小幅左右上下抖）'],",
  "  ['beat', '心跳（快涨慢落）'],",
  "  ['spin', '缓慢旋转（整圈）'],",
  '];',
  'const mkMotionName = (k) => { const m = MK_MOTION.filter((x) => x[0] === k)[0]; return m ? m[1] : (k || "不生成") };',
  '/** 按预设画第 i 帧（整张卡面大小）：静图 + 一点位移/缩放/旋转/透明度就是游戏里那种循环动效 */',
  'function mkGenFrame (src, kind, i, n, amp) {',
  '  const cv = newCanvas(CARD_W, CARD_H);',
  '  const c = cv.getContext("2d");',
  '  c.imageSmoothingEnabled = false;',
  '  const t = i / Math.max(1, n);',
  '  const rad = Math.PI * 2 * t;',
  '  let dx = 0; let dy = 0; let sc = 1; let rot = 0; let al = 1;',
  "  if (kind === 'float') dy = Math.sin(rad) * amp;",
  "  else if (kind === 'breathe') sc = 1 + Math.sin(rad) * amp / 100;",
  "  else if (kind === 'sway') rot = Math.sin(rad) * amp * Math.PI / 180 * 3;",
  "  else if (kind === 'blink') al = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(rad));",
  "  else if (kind === 'shake') { dx = Math.sin(rad * 3) * amp * 0.6; dy = Math.cos(rad * 2) * amp * 0.4 }",
  "  else if (kind === 'beat') { const p = Math.pow(Math.max(0, Math.sin(rad)), 3); sc = 1 + p * amp / 100 }",
  "  else if (kind === 'spin') rot = rad;",
  '  c.save();',
  '  c.globalAlpha = al;',
  '  c.translate(CARD_W / 2 + dx, CARD_H / 2 + dy);',
  '  c.rotate(rot);',
  '  c.scale(sc, sc);',
  '  c.translate(-CARD_W / 2, -CARD_H / 2);',
  '  mkDrawSource(c, 1, 0, 0, src);   /* 静图（上传的图或图集那一格）画进卡面 */',
  '  c.restore();',
  '  return cv;',
  '}',
  '/** 这个图源现在该用哪些帧：导入的帧序列 > 预设现场生成 > null（静态） */',
  'function mkSourceFrames (src) {',
  '  if (!src) return null;',
  '  if (src.frames && src.frames.length) return src.frames;',
  '  const g = src.gen;',
  '  if (!g || !g.kind || !(g.n > 1)) return null;',
  '  const key = [g.kind, g.n, g.amp, src.atlas, src.pos ? src.pos.x + "," + src.pos.y : "", src.uploadName || ""].join("|");',
  '  if (src.__genCache && src.__genCache.key === key) return src.__genCache.list;',
  '  const base = { atlas: src.atlas, pos: src.pos, upload: src.upload || null };',
  '  const list = [];',
  '  for (let i = 0; i < g.n; i++) list.push(mkGenFrame(base, g.kind, i, g.n, g.amp));',
  '  src.__genCache = { key: key, list: list };',
  '  return list;',
  '}',
  '/** 帧延时：导入的按文件自己的，预设的按 fps（原版默认 10） */',
  'function mkFrameDelay (src, fps) {',
  '  if (src && src.frames && src.frames.length && src.delay) return src.delay;',
  '  return Math.round(1000 / (fps || 10));',
  '}',
  '/** 动效那一行下面的说明，跟着当前状态走 */',
  'function mkMotionHintText () {',
  '  const g = MK.art.gen || {};',
  '  if (!g.kind || !(g.n > 1)) {',
  '    const fl = mkSourceFrames(MK.art);',
  '    return fl ? ("主体现在用导入的 " + fl.length + " 帧（每帧 " + (MK.art.delay || "?") + "ms）。") : "主体现在是静态的：可以导入动图、多选几张图当帧，或选一个动效预设让它自己动起来。";',
  '  }',
  '  return "主体按「" + mkMotionName(g.kind) + "」生成 " + g.n + " 帧 · " + g.fps + "fps · 幅度 " + g.amp + "：预览在动，导出会铺成横向帧序列（Lua 写 ANIMATION_ATLAS + frames + fps）。";',
  '}',
  ''
);
rep('function mkSheetCanvas (scale, which) {', HOOK + 'function mkSheetCanvas (scale, which) {', '动效预设与取帧入口');

/* ---------- ② 帧条/预览/计时器/导出/Lua 全部走同一个取帧入口 ---------- */
rep(
  '  const frames = (src.frames && src.frames.length) ? src.frames.length : 1;   /* 这里要的是帧数，不是帧数组 */',
  '  const list = mkSourceFrames(src);',
  '  const frames = list ? list.length : 1;   /* 帧数：导入的帧序列，或按预设现场生成的帧 */',
  'mkSheetCanvas 取帧'
);
rep(
  '    const one = src.frames && src.frames.length ? src.frames[i] : null;',
  '    const one = list ? list[i] : null;',
  'mkSheetCanvas 逐帧'
);
rep(
  L('    const aN = (MK.art.frames && MK.art.frames.length) || 1;',
    '    const soulAlive = MK.type === \'Joker\' && MK.soul.on && !!(MK.soul.upload || (MK.soul.frames && MK.soul.frames.length));',
    '    const sN = soulAlive && MK.soul.frames ? MK.soul.frames.length : 1;'),
  L('    const aList = mkSourceFrames(MK.art);',
    '    const aN = aList ? aList.length : 1;',
    '    const soulAlive = MK.type === \'Joker\' && MK.soul.on;   /* 立绘开着就一直重画：它本身就在飘 */',
    '    const sList = soulAlive ? mkSourceFrames(MK.soul) : null;',
    '    const sN = sList ? sList.length : 1;'),
  '预览计时器帧数'
);
rep(
  L('  const nArt = (MK.art.frames && MK.art.frames.length) || 1;',
    '  const s1 = mkSheetCanvas(1, \'art\'); const s2 = mkSheetCanvas(2, \'art\');'),
  L('  const artList0 = mkSourceFrames(MK.art);',
    '  const nArt = artList0 ? artList0.length : 1;',
    '  const s1 = mkSheetCanvas(1, \'art\'); const s2 = mkSheetCanvas(2, \'art\');'),
  '导出尺寸自检取帧'
);
rep(
  '    const nSoul = (MK.soul.frames && MK.soul.frames.length) || 1;',
  '    const soulList0 = mkSourceFrames(MK.soul);\n    const nSoul = soulList0 ? soulList0.length : 1;',
  '导出尺寸自检取帧（立绘）'
);

/* ---------- ③ 预览：主体用第几帧 + 立绘永远叠上去 ---------- */
rep(
  L('function mkPreviewCanvas () {',
    '  if (MK.art.upload || (MK.art.frames && MK.art.frames.length)) {',
    '    const i = MK.art.frames && MK.art.frames.length ? (mkFrame % MK.art.frames.length) : 0;',
    '    const f = (MK.art.frames && MK.art.frames.length) ? MK.art.frames[i] : MK.art.upload;',
    '    const cv = newCanvas(CARD_W * 2, CARD_H * 2);',
    '    mkDrawSource(cv.getContext(\'2d\'), 2, 0, 0, { atlas: MK.art.atlas, pos: MK.art.pos, upload: f });',
    '    return cv;',
    '  }',
    '  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };',
    '  let base = null;',
    '  try { base = compose(spec, 2) } catch (e) { base = mkArtCanvas(2) }',
    '  if (MK.type === \'Joker\' && MK.soul.on) {',
    '    const cv = newCanvas(CARD_W * 2, CARD_H * 2);',
    '    const ctx = cv.getContext(\'2d\');',
    '    ctx.imageSmoothingEnabled = false;',
    '    ctx.drawImage(base, 0, 0);',
    '    const soulSrc = (MK.soul.frames && MK.soul.frames.length)',
    '      ? MK.soul.frames[mkFrame % MK.soul.frames.length]',
    '      : MK.soul.upload;'),
  L('function mkPreviewCanvas () {',
    '  /* 主体：有帧序列（导入的或按预设生成的）就画当前那一帧，否则用原版图集那一格合成整张卡 */',
    '  const artFrames = mkSourceFrames(MK.art);',
    '  const artSrc = artFrames ? artFrames[mkFrame % artFrames.length] : (MK.art.upload || null);',
    '  let base = null;',
    '  if (artSrc) {',
    '    base = newCanvas(CARD_W * 2, CARD_H * 2);',
    '    mkDrawSource(base.getContext(\'2d\'), 2, 0, 0, { atlas: MK.art.atlas, pos: MK.art.pos, upload: artSrc });',
    '  } else {',
    '    const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };',
    '    try { base = compose(spec, 2) } catch (e) { base = mkArtCanvas(2) }',
    '  }',
    '  /* 悬浮立绘：游戏里它是独立的一层前景精灵、一直在飘（soul_atlas / floating_sprite），',
    '     所以不管主体是合成的还是自己上传的，都该叠上去。 */',
    '  if (MK.type === \'Joker\' && MK.soul.on) {',
    '    const soulFrames = mkSourceFrames(MK.soul);',
    '    const soulSrc = soulFrames ? soulFrames[mkFrame % soulFrames.length] : (MK.soul.upload || null);',
    '    const cv = newCanvas(CARD_W * 2, CARD_H * 2);',
    '    const ctx = cv.getContext(\'2d\');',
    '    ctx.imageSmoothingEnabled = false;',
    '    ctx.drawImage(base, 0, 0);'),
  '预览取帧（含立绘）'
);
rep(
  '    mkDrawSource(layer.getContext(\'2d\'), w / CARD_W, 0, 0, { atlas: MK.soul.atlas, pos: MK.soul.pos, upload: soulSrc || null });',
  '    mkDrawSource(layer.getContext(\'2d\'), w / CARD_W, 0, 0, { atlas: MK.soul.atlas, pos: MK.soul.pos, upload: soulSrc || null });',
  '（立绘图层保持不变）'
);

/* ---------- ④ Lua：帧数/延时按取帧入口来；立绘写 soul_atlas ---------- */
rep(
  L("  L.push('SMODS.Atlas {');",
    "  for (const line of atlasLines('sheet', 'sheet.png', (MK.art.frames && MK.art.frames.length) || 1, MK.art.delay)) L.push(line);",
    "  L.push('}');"),
  L('  const aListLua = mkSourceFrames(MK.art);',
    '  const aNLua = aListLua ? aListLua.length : 1;',
    '  const aDelayLua = aListLua ? mkFrameDelay(MK.art, MK.art.gen && MK.art.gen.fps) : 0;',
    "  L.push('SMODS.Atlas {');",
    "  for (const line of atlasLines('sheet', 'sheet.png', aNLua, aDelayLua)) L.push(line);",
    "  L.push('}');"),
  'Lua 主体图集帧数'
);
rep(
  "    for (const line of atlasLines('soul', 'soul.png', (MK.soul.frames && MK.soul.frames.length) || 1, MK.soul.delay)) L.push(line);",
  L('    const sListLua = mkSourceFrames(MK.soul);',
    '    const sNLua = sListLua ? sListLua.length : 1;',
    '    const sDelayLua = sListLua ? mkFrameDelay(MK.soul, MK.soul.gen && MK.soul.gen.fps) : 0;',
    "    for (const line of atlasLines('soul', 'soul.png', sNLua, sDelayLua)) L.push(line);"),
  'Lua 立绘图集帧数'
);
rep(
  "      L.push(\"    soul_pos = { x = 0, y = 0 },\");",
  L('      /* 立绘是单独一张 soul.png，所以要写 soul_atlas：游戏就是按这个字段去找那层前景精灵的',
    '         （overrides.lua: atlas_key = lc_soul_atlas or soul_atlas or lc_atlas or atlas or set）。',
    '         只写 soul_pos 的话它会去**主体的图集**里找，等于把牌面自己飘一遍，立绘那张图用不上。 */',
    "      L.push(\"    soul_atlas = 'soul',\");"),
  'Lua 立绘用 soul_atlas'
);

/* ---------- ⑤ 界面：动效那一行 + 多选文件 ---------- */
rep(
  "    row.appendChild(field('③ 或上传自己的图', '<input type=\"file\" id=\"mkUpload\" accept=\"image/*\">', 'mkfile'));",
  "    row.appendChild(field('③ 或上传自己的图（可多选，每张图当一帧）', '<input type=\"file\" id=\"mkUpload\" accept=\"image/*\" multiple>', 'mkfile'));",
  '上传支持多选'
);
rep(
  "      row2.appendChild(field('或上传立绘文件', '<input type=\"file\" id=\"mkSoulUp\" accept=\"image/*\">', 'mkfile'));",
  "      row2.appendChild(field('或上传立绘文件（可多选，每张图当一帧）', '<input type=\"file\" id=\"mkSoulUp\" accept=\"image/*\" multiple>', 'mkfile'));",
  '立绘上传支持多选'
);
rep(
  "    src.appendChild(row);\n    src.insertAdjacentHTML('beforeend', '<div class=\"hint\">' + MK_IMG_TIP + '</div><div class=\"hint\" id=\"mkArtHint\"></div>');",
  L("    src.appendChild(row);",
    "    /* 动效：不用导入动图也能动 —— 按预设把一张静图现场渲染成帧序列（游戏里的做法就是横向 N 帧 + fps） */",
    "    const gen = MK.art.gen || { kind: '', n: 8, fps: 10, amp: 3 };",
    "    const genRow = document.createElement('div'); genRow.className = 'mkrow';",
    "    genRow.appendChild(field('④ 让它动起来（不导入动图也行，按预设现场生成帧）',",
    "      '<select class=\"tbtn\" id=\"mkMotion\">' + MK_MOTION.map((m) => '<option value=\"' + m[0] + '\"' + (gen.kind === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('') + '</select>'));",
    "    genRow.appendChild(field('帧数', '<select class=\"tbtn\" id=\"mkMotionN\">' + [4, 6, 8, 10, 12, 16, 20].map((k) => '<option value=\"' + k + '\"' + (gen.n === k ? ' selected' : '') + '>' + k + ' 帧</option>').join('') + '</select>'));",
    "    genRow.appendChild(field('帧率（原版默认 10）', '<select class=\"tbtn\" id=\"mkMotionFps\">' + [4, 6, 8, 10, 12, 15, 20, 25].map((k) => '<option value=\"' + k + '\"' + (gen.fps === k ? ' selected' : '') + '>' + k + ' fps</option>').join('') + '</select>'));",
    "    genRow.appendChild(field('幅度', '<input type=\"range\" id=\"mkMotionAmp\" min=\"1\" max=\"8\" value=\"' + gen.amp + '\">'));",
    "    src.appendChild(genRow);",
    "    src.insertAdjacentHTML('beforeend', '<div class=\"hint\">' + MK_IMG_TIP + '</div><div class=\"hint\" id=\"mkMotionHint\">' + mkMotionHintText() + '</div><div class=\"hint\" id=\"mkArtHint\"></div>');"),
  '动效控件'
);
rep(
  "      row2.appendChild(pickBtn);",
  L("      row2.appendChild(pickBtn);",
    "      const sgen = MK.soul.gen || { kind: '', n: 8, fps: 10, amp: 3 };",
    "      row2.appendChild(field('立绘动效', '<select class=\"tbtn\" id=\"mkSoulMotion\">' + MK_MOTION.map((m) => '<option value=\"' + m[0] + '\"' + (sgen.kind === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('') + '</select>'));"),
  '立绘动效控件'
);

/* ---------- ⑥ 事件：动效控件 + 多选上传 ---------- */
rep(
  "  const so = q('#mkSoulOn');",
  L("  /* 动效控件：预设 / 帧数 / 帧率 / 幅度 —— 改完立刻按新参数生成帧并让预览动起来 */",
    "  const mkSetGen = (which, patch) => {",
    "    const cur = (which === 'soul' ? MK.soul : MK.art).gen || { kind: '', n: 8, fps: 10, amp: 3 };",
    "    const gen = Object.assign({}, cur, patch);",
    "    const next = which === 'soul'",
    "      ? { soul: Object.assign({}, MK.soul, { gen: gen }) }",
    "      : { art: Object.assign({}, MK.art, { gen: gen }) };",
    "    mkSet(next);",
    "    if (gen.kind && gen.n > 1) {",
    "      mkStartAnim(Math.round(1000 / gen.fps));",
    "      status('已按「' + mkMotionName(gen.kind) + '」生成 ' + gen.n + ' 帧 · ' + gen.fps + 'fps：预览在动，导出铺成横向帧序列，Lua 里是 atlas_table = ANIMATION_ATLAS + frames = ' + gen.n + ' + fps = ' + gen.fps + '。', 'ok');",
    "    } else {",
    "      status('已关掉动效预设：有导入的帧序列就用导入的，没有就是静态。');",
    "    }",
    "  };",
    "  const mo = q('#mkMotion'); if (mo) mo.onchange = () => mkSetGen('art', { kind: mo.value });",
    "  const mn = q('#mkMotionN'); if (mn) mn.onchange = () => mkSetGen('art', { n: Number(mn.value) });",
    "  const mf = q('#mkMotionFps'); if (mf) mf.onchange = () => mkSetGen('art', { fps: Number(mf.value) });",
    "  const ma = q('#mkMotionAmp'); if (ma) ma.oninput = () => mkSetGen('art', { amp: Number(ma.value) });",
    "  const sm2 = q('#mkSoulMotion'); if (sm2) sm2.onchange = () => mkSetGen('soul', { kind: sm2.value });",
    "  const so = q('#mkSoulOn');"),
  '动效控件事件'
);
rep(
  L('  const up = q(\'#mkUpload\');',
    '  if (up) up.onchange = async (e) => {',
    '    const f = e.target.files && e.target.files[0];',
    '    if (!f) return;',
    '    const info = await mkReadImage(f);',
    '    if (!info) { status(\'这张图读不了（格式不支持）\'); return }'),
  L('  const up = q(\'#mkUpload\');',
    '  if (up) up.onchange = async (e) => {',
    '    const fl = [].slice.call(e.target.files || []);',
    '    if (!fl.length) return;',
    '    /* 多选：每张图当一帧（不挑格式，动图拆不了也能这么用） */',
    '    if (fl.length > 1) {',
    '      const got = [];',
    '      for (const one of fl) { const i2 = await mkReadImage(one); if (i2) got.push(i2.frames[0] || i2.cover) }',
    '      if (got.length < 2) { status(\'这几张图读不出来，换几张试试\'); return }',
    '      const fps0 = (MK.art.gen && MK.art.gen.fps) || 10;',
    '      mkSet({ art: Object.assign({}, MK.art, { upload: got[0], frames: got, animated: true, delay: Math.round(1000 / fps0), uploadName: fl.length + \' 张图（每张一帧）\' }) });',
    '      status(\'已用 \' + got.length + \' 张图拼成动图：预览在动，导出铺成横向帧序列，Lua 里写 frames = \' + got.length + \'（帧率按当前 \' + fps0 + \'fps）。\', \'ok\');',
    '      mkStartAnim(Math.round(1000 / fps0));',
    '      return;',
    '    }',
    '    const f = fl[0];',
    '    const info = await mkReadImage(f);',
    '    if (!info) { status(\'这张图读不了（格式不支持）\'); return }'),
  '主体上传多选'
);
rep(
  L('  const su = q(\'#mkSoulUp\');',
    '  if (su) su.onchange = async (e) => {',
    '    const f = e.target.files && e.target.files[0];',
    '    if (!f) return;',
    '    const info = await mkReadImage(f);',
    '    if (!info) { status(\'这张立绘图读不了\'); return }'),
  L('  const su = q(\'#mkSoulUp\');',
    '  if (su) su.onchange = async (e) => {',
    '    const fl = [].slice.call(e.target.files || []);',
    '    if (!fl.length) return;',
    '    if (fl.length > 1) {',
    '      const got = [];',
    '      for (const one of fl) { const i2 = await mkReadImage(one); if (i2) got.push(i2.frames[0] || i2.cover) }',
    '      if (got.length < 2) { status(\'这几张立绘图读不出来\'); return }',
    '      const fps1 = (MK.soul.gen && MK.soul.gen.fps) || 10;',
    '      mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: got[0], frames: got, delay: Math.round(1000 / fps1), uploadName: fl.length + \' 张图（每张一帧）\' }) });',
    '      status(\'立绘已用 \' + got.length + \' 张图拼成动图（帧率按当前 \' + fps1 + \'fps），预览里会飘着动。\', \'ok\');',
    '      mkStartAnim(Math.round(1000 / fps1));',
    '      return;',
    '    }',
    '    const f = fl[0];',
    '    const info = await mkReadImage(f);',
    '    if (!info) { status(\'这张立绘图读不了\'); return }'),
  '立绘上传多选'
);

/* ---------- ⑦ 调试接口里加上动效预设表（测试脚本要用） ---------- */
rep(
  'types: MK_TYPES, when: MK_WHEN, eff: MK_EFF,',
  'types: MK_TYPES, when: MK_WHEN, eff: MK_EFF, motion: MK_MOTION,',
  '暴露动效预设'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['const MK_MOTION = [', 'function mkGenFrame (src, kind, i, n, amp)', 'function mkSourceFrames (src)', 'function mkFrameDelay (src, fps)',
  'const list = mkSourceFrames(src);', 'const artFrames = mkSourceFrames(MK.art);', "soul_atlas = 'soul',", "id=\\\"mkMotion\\\"", 'id=\\\"mkSoulMotion\\\"', 'mkSetGen', 'motion: MK_MOTION'];
const missing = must.filter((m) => back.indexOf(m.replace(/\\"/g, '"')) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
