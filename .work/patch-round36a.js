/* 第三十六轮 A：Mod 制作器修复与扩容
   ① 贴图网格真的把图**画出来**（以前只有黑格子）
   ② 上传的图要进预览与网格；支持 PNG/JPG/WebP/GIF/APNG，**动图拆帧**并导出横向帧序列
   ③ 全中文：强化/版本/蜡封用中文下拉，图集下拉加中文说明
   ④ 更多可定义项：条件 +版本/蜡封/牌堆张数，效果 +升级牌型/给随机小丑牌
   ⑤ 「照现成的牌做一个」对**全部条目**开放（原版也不止 mod），并把数值/文案/兼容性一起复制 */
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

/* ---------- 词表：图集中文名、强化/版本/蜡封、条件与效果 ---------- */
rep(
  "const MK_RARITY = [[1, '普通'], [2, '罕见'], [3, '稀有'], [4, '传奇']];",
  L("const MK_RARITY = [[1, '普通'], [2, '罕见'], [3, '稀有'], [4, '传奇']];",
    '/* 常见图集的中文说明（图集名本身是游戏里的键，没法翻译，这里给"它是什么"） */',
    'const MK_ATLAS_CN = {',
    "  Joker: '小丑牌', centers: '中心图集（塔罗 / 星球 / 强化 / 牌背…）', Tarot: '塔罗牌', Planet: '星球牌',",
    "  Spectral: '幽灵牌', Voucher: '优惠券', Booster: '补充包', tags: '标签', stickers: '贴纸',",
    "  blind_chips: '盲注筹码', cards_1: '扑克牌面（标准）', cards_2: '扑克牌面（高对比）',",
    "  Enhancers: '强化牌底纹', Edition: '版本', ui_1: '界面素材', ui_2: '界面素材（高对比）',",
    "  shop_sign: '商店招牌', chips: '筹码', money: '金额', '8BitDeck': '扑克牌面',",
    '};',
    '/** 图集下拉里显示的文案：中文说明 + 原始名 */',
    "function mkAtlasLabel (name) { return (MK_ATLAS_CN[name] ? MK_ATLAS_CN[name] + '（' + name + '）' : name) }",
    '/** 图片格式说明（放在上传那一行下面） */',
    "const MK_IMG_TIP = '支持 PNG / JPG / WebP / GIF / APNG；**动图会自动拆帧**（最多 24 帧），导出成横向帧序列 sheet.png，并在图集声明里写上 frames。';"),
  '图集中文名与格式说明');

rep(
  "const MK_USE = [['dollars', '给一笔钱'], ['chips', '本手 +筹码'], ['mult', '本手 +倍率'],",
  L("const MK_ENH = [['', '不限'], ['m_bonus', '奖励牌'], ['m_mult', '倍率牌'], ['m_wild', '万能牌'], ['m_glass', '玻璃牌'],",
    "  ['m_steel', '钢铁牌'], ['m_stone', '石头牌'], ['m_gold', '黄金牌'], ['m_lucky', '幸运牌']];",
    "const MK_EDITION = [['', '不限'], ['e_foil', '闪箔'], ['e_holo', '镭射'], ['e_polychrome', '多彩'], ['e_negative', '负片']];",
    "const MK_SEAL = [['', '不限'], ['Red', '红蜡封'], ['Blue', '蓝蜡封'], ['Gold', '金蜡封'], ['Purple', '紫蜡封']];",
    "const MK_USE = [['dollars', '给一笔钱'], ['chips', '本手 +筹码'], ['mult', '本手 +倍率'],"),
  '中文词表（强化/版本/蜡封）');

rep(
  L("  ['hand', '牌型是…'],",
    "  ['count', '这一手至少…张'],",
    '];'),
  L("  ['hand', '牌型是…'],",
    "  ['edition', '版本是…'],",
    "  ['seal', '蜡封是…'],",
    "  ['deckcount', '牌堆里至少…张'],",
    "  ['count', '这一手至少…张'],",
    '];'),
  '条件词表扩容');
rep(
  "  ['planet', '给一张随机星球'],\n];",
  L("  ['planet', '给一张随机星球'],",
    "  ['levelup', '升级打出的牌型'],",
    "  ['joker', '给一张随机小丑牌'],",
    '];'),
  '效果词表扩容');

/* ---------- 条件的取值/文案/片段 ---------- */
rep(
  "  if (e.cond === 'odd') return '(context.other_card:get_id() % 2 == 1 or context.other_card:get_id() == 14)';",
  L("  if (e.cond === 'odd') return '(context.other_card:get_id() % 2 == 1 or context.other_card:get_id() == 14)';",
    "  if (e.cond === 'edition') return \"context.other_card.edition and context.other_card.edition.key == '\" + (v || 'e_foil') + \"'\";",
    "  if (e.cond === 'seal') return \"context.other_card.seal == '\" + (v || 'Red') + \"'\";",
    "  if (e.cond === 'deckcount') return '#G.playing_cards >= ' + (v || 40);"),
  '新条件片段');
rep(
  "  if (e.cond === 'odd') return '奇数点数';",
  L("  if (e.cond === 'odd') return '奇数点数';",
    "  if (e.cond === 'edition') return '「' + ((MK_EDITION.filter((x) => x[0] === v)[0] || [v, v])[1]) + '」版本';",
    "  if (e.cond === 'seal') return '「' + ((MK_SEAL.filter((x) => x[0] === v)[0] || [v, v])[1]) + '」';",
    "  if (e.cond === 'deckcount') return '牌堆里至少 ' + (v || 40) + ' 张';"),
  '新条件文案');
rep(
  "  if (e.cond === 'enh') return '「' + (v || 'm_bonus') + '」强化';",
  "  if (e.cond === 'enh') return '「' + ((MK_ENH.filter((x) => x[0] === v)[0] || [v, v])[1]) + '」强化';",
  '强化文案用中文');
rep(
  "  if (e.cond === 'enh') return \"context.other_card.config.center.key == '\" + (v || 'm_bonus') + \"'\";",
  "  if (e.cond === 'enh') return \"context.other_card.config.center.key == '\" + (v || 'm_bonus') + \"'\";",
  '强化片段（不变）');

/* ---------- 效果：Lua 与文案 ---------- */
rep(
  "                    : 'repetitions = ' + (val || 1);",
  L("                    : e.eff === 'levelup' ? 'level_up = true'",
    "                      : e.eff === 'joker' ? \"create_card('Joker', G.play)\"",
    "                        : 'repetitions = ' + (val || 1);"),
  '新效果 Lua');
rep(
  "  if (e.eff === 'planet') return '给一张随机星球';",
  L("  if (e.eff === 'planet') return '给一张随机星球';",
    "  if (e.eff === 'levelup') return '升级打出的牌型';",
    "  if (e.eff === 'joker') return '给一张随机小丑牌';"),
  '新效果文案');

/* ---------- 悬浮立绘也支持动图 ---------- */
rep(
  "  soul: { on: false, atlas: 'Joker', pos: { x: 0, y: 2 }, upload: null, uploadName: '' },",
  "  soul: { on: false, atlas: 'Joker', pos: { x: 0, y: 2 }, upload: null, uploadName: '', frames: null, animated: false },",
  '立绘状态加帧');
rep(
  "  art: { atlas: 'Joker', pos: { x: 0, y: 0 }, upload: null, uploadName: '' },",
  "  art: { atlas: 'Joker', pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false },",
  '主体状态加帧');

/* ---------- 画图：mkArtCanvas 支持帧序列（横向铺开） ---------- */
rep(
  L("function mkArtCanvas (scale) {",
    "  const px = CARD_W * scale, py = CARD_H * scale;",
    "  const cv = newCanvas(Math.round(px), Math.round(py));"),
  L("/** 一帧画到 ctx 的指定位置（上传的图 / 图集里的一格） */",
    "function mkDrawSource (ctx, scale, dx, dy, src) {",
    "  const w = CARD_W * scale, h = CARD_H * scale;",
    "  const a = D.atlases[src.atlas];",
    "  if (src.upload) {",
    "    const im = src.upload;",
    "    const r = Math.min(w / im.width, h / im.height);",
    "    const iw = im.width * r, ih = im.height * r;",
    "    ctx.drawImage(im, dx + (w - iw) / 2, dy + (h - ih) / 2, iw, ih);",
    "    return;",
    "  }",
    "  if (!a) return;",
    "  const im2 = IMG[a.file];",
    "  const sc = a.scale || 1;",
    "  const sx = src.pos.x * a.px * sc, sy = src.pos.y * a.py * sc, sw = a.px * sc, sh = a.py * sc;",
    "  try { ctx.drawImage(im2, sx, sy, sw, sh, dx, dy, w, h) } catch (e) { /* 图还没解码完 */ }",
    "}",
    "/** 主体 / 立绘的一帧或整套帧序列（动图时横向铺开，正是原版图集的排法） */",
    "function mkSheetCanvas (scale, which) {",
    "  const src = which === 'soul' ? MK.soul : MK.art;",
    "  const frames = (src.frames && src.frames.length) ? src.frames : 1;",
    "  const cv = newCanvas(Math.round(CARD_W * scale * frames), Math.round(CARD_H * scale));",
    "  const ctx = cv.getContext('2d');",
    "  ctx.imageSmoothingEnabled = false;",
    "  for (let i = 0; i < frames; i++) {",
    "    const one = src.frames && src.frames.length ? src.frames[i] : null;",
    "    if (one) mkDrawSource(ctx, scale, i * CARD_W * scale, 0, { atlas: src.atlas, pos: src.pos, upload: one });",
    "    else mkDrawSource(ctx, scale, i * CARD_W * scale, 0, src);",
    "  }",
    "  return cv;",
    "}",
    "function mkArtCanvas (scale) { return mkSheetCanvas(scale, 'art') }",
    "function mkSoulSheetCanvas (scale) { return mkSheetCanvas(scale, 'soul') }",
    "function mkOldArtCanvas (scale) {",
    "  const px = CARD_W * scale, py = CARD_H * scale;",
    "  const cv = newCanvas(Math.round(px), Math.round(py));"),
  '帧序列画布');

/* ---------- 预览：动图会动起来 ---------- */
rep(
  "function mkPreviewCanvas () {\n  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };\n  try { return compose(spec, 2) } catch (e) { return mkArtCanvas(2) }\n}",
  L("/** 预览：有上传（或动图）时直接画那张图/那一帧；否则用原版图集那一格 */",
    'function mkPreviewCanvas () {',
    '  if (MK.art.upload || (MK.art.frames && MK.art.frames.length)) {',
    '    const i = MK.art.frames && MK.art.frames.length ? (mkFrame % MK.art.frames.length) : 0;',
    '    const f = (MK.art.frames && MK.art.frames.length) ? MK.art.frames[i] : MK.art.upload;',
    "    const cv = newCanvas(CARD_W * 2, CARD_H * 2);",
    "    mkDrawSource(cv.getContext('2d'), 2, 0, 0, { atlas: MK.art.atlas, pos: MK.art.pos, upload: f });",
    '    return cv;',
    '  }',
    '  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };',
    '  try { return compose(spec, 2) } catch (e) { return mkArtCanvas(2) }',
    '}',
    'let mkFrame = 0;',
    'let mkAnimTimer = null;',
    '/** 预览里的动图：6fps 换帧（只在有帧序列时跑，开销就是一次 drawImage） */',
    'function mkStartAnim () {',
    '  if (mkAnimTimer) return;',
    '  mkAnimTimer = setInterval(() => {',
    "    const box = document.querySelector('.mkpvbox');",
    '    if (!box || !box.isConnected) { clearInterval(mkAnimTimer); mkAnimTimer = null; return }',
    '    const total = (MK.art.frames && MK.art.frames.length) || 1;',
    '    if (total < 2) return;',
    '    mkFrame = (mkFrame + 1) % total;',
    '    const old = box.querySelector("canvas");',
    '    const cv = mkPreviewCanvas();',
    "    cv.style.width = '142px'; cv.style.height = '190px';",
    '    if (old) box.replaceChild(cv, old); else box.appendChild(cv);',
    '  }, 160);',
    '}'),
  '预览支持动图');

/* ---------- 上传：拆帧 ---------- */
rep(
  "  if (up) up.onchange = (e) => {\n    const f = e.target.files && e.target.files[0];\n    if (!f) return;\n    const im = new Image();\n    im.onload = () => mkSet({ art: { atlas: MK.art.atlas, pos: MK.art.pos, upload: im, uploadName: f.name } });\n    im.src = URL.createObjectURL(f);\n  };",
  L('  if (up) up.onchange = async (e) => {',
    '    const f = e.target.files && e.target.files[0];',
    '    if (!f) return;',
    '    const info = await mkReadImage(f);',
    '    if (!info) { status("这张图读不了（浏览器不支持这个格式）"); return }',
    '    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: info.frames.length > 1 ? info.frames : null, animated: info.frames.length > 1, uploadName: f.name }) });',
    "    status('已使用「' + f.name + '」' + (info.frames.length > 1 ? '（动图，拆出 ' + info.frames.length + ' 帧，导出会铺成横向帧序列）' : '（静态图）'));",
    '    if (info.frames.length > 1) mkStartAnim();',
    '  };',
    '/** 读一张图：静态返回 1 帧，GIF / APNG / 动图 WebP 用 ImageDecoder 拆帧（最多 24 帧） */',
    'async function mkReadImage (file) {',
    "  const url = URL.createObjectURL(file);",
    '  try {',
    "    if (typeof ImageDecoder !== 'undefined' && /gif|webp|apng|png$/i.test(file.type)) {",
    '      try {',
    "        const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: file.type || 'image/png' });",
    '        await dec.completed;',
    '        const total = Math.min(dec.tracks.selectedTrack ? dec.tracks.selectedTrack.frameCount : 1, 24);',
    '        if (total > 1) {',
    '          const frames = [];',
    '          for (let i = 0; i < total; i++) {',
    '            const r = await dec.decode({ frameIndex: i });',
    '            const bmp = r.image;',
    '            const cv = newCanvas(bmp.displayWidth || bmp.codedWidth, bmp.displayHeight || bmp.codedHeight);',
    '            cv.getContext("2d").drawImage(bmp, 0, 0);',
    '            frames.push(cv);',
    '            bmp.close && bmp.close();',
    '          }',
    '          URL.revokeObjectURL(url);',
    '          return { frames, cover: frames[0] };',
    '        }',
    '      } catch (e) { /* 不是动图或解码器不认，退回静态 */ }',
    '    }',
    '    const im = await new Promise((res, rej) => { const i2 = new Image(); i2.onload = () => res(i2); i2.onerror = rej; i2.src = url });',
    '    URL.revokeObjectURL(url);',
    '    return { frames: [im], cover: im };',
    '  } catch (e) { URL.revokeObjectURL(url); return null }',
    '}'),
  '上传拆帧');

/* ---------- 贴图网格：真的把图画出来 ---------- */
rep(
  L("    for (let i = 0; i < total; i++) {",
    "      const x = i % cols, y = Math.floor(i / cols);",
    "      const cell = document.createElement('button');",
    "      cell.className = 'mkcell' + (MK.art.pos.x === x && MK.art.pos.y === y && !MK.art.upload ? ' on' : '');",
    "      cell.title = 'x=' + x + ' y=' + y;",
    "      cell.onclick = () => mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '' } });",
    "      grid.appendChild(cell);",
    "    }"),
  L('    const a2 = a;',
    '    const paint = (cell, x, y) => {',
    '      if (cell.__painted) return;',
    '      cell.__painted = true;',
    '      const s2 = a2.scale || 1;',
    '      const cv2 = newCanvas(34, 46);',
    '      const c2 = cv2.getContext("2d");',
    '      c2.imageSmoothingEnabled = false;',
    '      const im = IMG[a2.file];',
    '      const sw = a2.px * s2, sh = a2.py * s2;',
    '      const r = Math.min(cv2.width / sw, cv2.height / sh);',
    '      try { c2.drawImage(im, x * sw, y * sh, sw, sh, (cv2.width - sw * r) / 2, (cv2.height - sh * r) / 2, sw * r, sh * r) } catch (e) { /* 图没解码完 */ }',
    '      cell.appendChild(cv2);',
    '    };',
    '    for (let i = 0; i < total; i++) {',
    '      const x = i % cols, y = Math.floor(i / cols);',
    "      const cell = document.createElement('button');",
    "      cell.className = 'mkcell' + (MK.art.pos.x === x && MK.art.pos.y === y && !MK.art.upload ? ' on' : '');",
    "      cell.title = 'x=' + x + ' y=' + y;",
    "      cell.onclick = () => mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null, animated: false } });",
    '      if (IO) { cell._paint = () => paint(cell, x, y); IO.observe(cell) } else paint(cell, x, y);',
    "      grid.appendChild(cell);",
    "    }"),
  '贴图网格画图');

/* ---------- 图集下拉：中文说明 ---------- */
rep(
  "      atlasNames.map((n) => '<option value=\"' + n + '\"' + (MK.art.atlas === n ? ' selected' : '') + '>' + n + '</option>').join('') +",
  "      atlasNames.map((n) => '<option value=\"' + n + '\"' + (MK.art.atlas === n ? ' selected' : '') + '>' + mkAtlasLabel(n) + '</option>').join('') +",
  '图集下拉中文');
rep(
  "      '<div class=\"hint\" id=\"mkArtHint\"></div>' +",
  L("      '<div class=\"hint\">' + MK_IMG_TIP + '</div>' +",
    "      '<div class=\"hint\" id=\"mkArtHint\"></div>' +"),
  '格式说明');

/* ---------- 条件取值：强化/版本/蜡封用中文下拉 ---------- */
rep(
  L("      const condVal = e.cond === 'suit' ? '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"condVal\">' + MK_SUITS.map((s) => '<option value=\"' + s[0] + '\"' + (e.condVal === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select>'"),
  L("      const mkOpts = (list) => list.map((s) => '<option value=\"' + s[0] + '\"' + (e.condVal === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('');",
    "      const condVal = e.cond === 'suit' ? '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"condVal\">' + mkOpts(MK_SUITS) + '</select>'",
    "        : e.cond === 'enh' ? '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"condVal\">' + mkOpts(MK_ENH) + '</select>'",
    "          : e.cond === 'edition' ? '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"condVal\">' + mkOpts(MK_EDITION) + '</select>'",
    "            : e.cond === 'seal' ? '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"condVal\">' + mkOpts(MK_SEAL) + '</select>'"),
  '条件取值下拉');
rep(
  "            : (e.cond === 'count' ? '<input class=\"tbtn\" type=\"number\" min=\"1\" max=\"5\" data-fx=\"' + i + '\" data-f=\"condVal\" value=\"' + (e.condVal || 5) + '\">' : '');",
  "            : ((e.cond === 'count' || e.cond === 'deckcount') ? '<input class=\"tbtn\" type=\"number\" min=\"1\" max=\"99\" data-fx=\"' + i + '\" data-f=\"condVal\" value=\"' + (e.condVal || (e.cond === 'count' ? 5 : 40)) + '\">' : '');",
  '张数输入');

/* ---------- 默认值：切条件时给中文默认 ---------- */
rep(
  "      if (f === 'cond' && el.value === 'count') list2[i].condVal = 5;",
  L("      if (f === 'cond' && el.value === 'count') list2[i].condVal = 5;",
    "      if (f === 'cond' && el.value === 'enh') list2[i].condVal = 'm_bonus';",
    "      if (f === 'cond' && el.value === 'edition') list2[i].condVal = 'e_foil';",
    "      if (f === 'cond' && el.value === 'seal') list2[i].condVal = 'Red';",
    "      if (f === 'cond' && el.value === 'deckcount') list2[i].condVal = 40;"),
  '条件默认值');

/* ---------- 导出：动图铺帧 + frames 声明 ---------- */
rep(
  "  if (MK.type === 'Joker' && MK.soul.on) {\n    files.push({ name: 'assets/1x/soul.png', data: await canvasBytes(mkSoulCanvas(1)) });\n    files.push({ name: 'assets/2x/soul.png', data: await canvasBytes(mkSoulCanvas(2)) });\n  }",
  L("  if (MK.type === 'Joker' && MK.soul.on) {",
    "    files.push({ name: 'assets/1x/soul.png', data: await canvasBytes(mkSheetCanvas(1, 'soul')) });",
    "    files.push({ name: 'assets/2x/soul.png', data: await canvasBytes(mkSheetCanvas(2, 'soul')) });",
    '  }'),
  '立绘导出用帧序列');
rep(
  "  const one = await canvasBytes(mkArtCanvas(1));\n  const two = await canvasBytes(mkArtCanvas(2));",
  "  const one = await canvasBytes(mkSheetCanvas(1, 'art'));\n  const two = await canvasBytes(mkSheetCanvas(2, 'art'));",
  '主体导出用帧序列');
rep(
  L("  L.push('    px = ' + CARD_W + ',');",
    "  L.push('    py = ' + CARD_H);",
    "  L.push('}');",
    "  if (MK.type === 'Joker' && MK.soul.on) {"),
  L("  L.push('    px = ' + CARD_W + ',');",
    "  L.push('    py = ' + CARD_H);",
    "  if (MK.art.frames && MK.art.frames.length) L.push('    frames = ' + MK.art.frames.length + ',   -- 动图：横向帧序列');",
    "  L.push('}');",
    "  if (MK.type === 'Joker' && MK.soul.on) {"),
  'sheet 声明 frames');
rep(
  L("    L.push('    px = ' + CARD_W + ',');",
    "    L.push('    py = ' + CARD_H);",
    "    L.push('}');",
    "  }"),
  L("    L.push('    px = ' + CARD_W + ',');",
    "    L.push('    py = ' + CARD_H);",
    "    if (MK.soul.frames && MK.soul.frames.length) L.push('    frames = ' + MK.soul.frames.length + ',   -- 动图：横向帧序列');",
    "    L.push('}');",
    "  }"),
  'soul 声明 frames');

/* ---------- 「照现成的牌做一个」：放开到全部条目 ---------- */
rep(
  L("    const modItems = (typeof ITEMS !== 'undefined' ? ITEMS : []).filter((i) => i.source);",
    "    clone.innerHTML = '<label class=\"mkwide\">照已导入 mod 的条目做一个' +",
    "      '<select class=\"tbtn\" id=\"mkClone\"><option value=\"\">（不复制，自己从头做）</option>' +",
    "      modItems.slice(0, 400).map((i) => '<option value=\"' + i.id + '\">' + esc((i.sourceName || i.source) + ' · ' + nm(i)) + '</option>').join('') +",
    "      '</select></label><div class=\"hint\">选一个已导入的条目：贴图、配置、文案会先复制过来，再按你的想法改。</div>';"),
  L("    const pickable = ['Joker', 'Consumable', 'Voucher', 'Booster', 'Deck', 'Enhancement', 'Edition', 'Seal', 'Tag', 'Blind'];",
    "    const allItems = (typeof ITEMS !== 'undefined' ? ITEMS : []).filter((i) => pickable.indexOf(i.cat) >= 0);",
    "    const vanilla = allItems.filter((i) => !i.source);",
    "    const modGroups = {};",
    "    allItems.filter((i) => i.source).forEach((i) => { (modGroups[i.source] = modGroups[i.source] || []).push(i) });",
    "    clone.innerHTML = '<label class=\"mkwide\">照现成的牌做一个（原版 + 已导入的 mod 全都在这里）' +",
    "      '<select class=\"tbtn\" id=\"mkClone\"><option value=\"\">（不复制，自己从头做）</option>' +",
    "      '<optgroup label=\"原版 Balatro（' + vanilla.length + '）\">' + vanilla.map((i) => '<option value=\"' + i.id + '\">' + esc(i.cat + ' · ' + nm(i)) + '</option>').join('') + '</optgroup>' +",
    "      Object.keys(modGroups).map((k) => '<optgroup label=\"' + esc((modGroups[k][0].sourceName || k)) + '（' + modGroups[k].length + '）\">' +",
    "        modGroups[k].map((i) => '<option value=\"' + i.id + '\">' + esc(i.cat + ' · ' + nm(i)) + '</option>').join('') + '</optgroup>').join('') +",
    "      '</select></label><div class=\"hint\">选一张现成的牌：类型、贴图、稀有度 / 价格 / 权重、中英文文案、config 与能反解出来的效果都会先复制过来，然后你可以逐项改（这就是「全方位修改」）。</div>';"),
  '克隆放开到全部条目');

/* ---------- 克隆时把更多字段一起复制 + 反解规则 ---------- */
rep(
  L("    const zh = (it.text && it.text.zh_CN) || [];",
    "    mkSet({",
    "      cloneFrom: it.id, type: it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat),"),
  L("    const zh = (it.text && it.text.zh_CN) || [];",
    "    /* 规则反解：把原版规则里的 chips / mult / x_mult 变成可编辑的效果行（认不出的留给配置 JSON） */",
    "    const rule = (typeof JOKER_RULES !== 'undefined' && JOKER_RULES.rules ? JOKER_RULES.rules : []).find((r) => r.n === it.name) || null;",
    "    if (rule && rule.e) {",
    "      const kindOf = (f) => (/^x_mult|^Xmult_mod/.test(f) ? 'xmult' : /^mult|^t_mult|^mult_mod/.test(f) ? 'mult' : /^chips|^chip_mod|^t_chips/.test(f) ? 'chips' : /dollars/.test(f) ? 'dollars' : null);",
    "      const seenK = {};",
    "      rule.e.forEach((ex) => {",
    "        const f = ex.split('=')[0]; const k = kindOf(f);",
    "        if (!k || seenK[k]) return;",
    "        const cfgV = (it.config && it.config.extra && (it.config.extra[f] || it.config.extra.chips || it.config.extra.mult || it.config.extra.x_mult)) || it.config[f];",
    "        const num = typeof cfgV === 'number' ? cfgV : (k === 'xmult' ? 1.5 : k === 'dollars' ? 1 : 4);",
    "        seenK[k] = true;",
    "        effects.push({ when: rule.r === 'individual' ? 'card' : (rule.r === 'repetition' ? 'repetition' : 'hand'), cond: '', condVal: '', eff: k, val: num });",
    "      });",
    "    }",
    "    mkSet({",
    "      cloneFrom: it.id, type: it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat),",
    "      rarity: it.rarity || MK.rarity, cost: it.cost || MK.cost, order: it.order || MK.order, weight: it.weight || MK.weight,",
    "      eternal: it.eternal_compat !== false, perishable: it.perishable_compat !== false, blueprint: it.blueprint_compat !== false,"),
  '克隆复制更多字段');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
