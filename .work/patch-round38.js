/* 第三十八轮：
   ① 「照现成的牌做一个」与「从哪个图集取图」并到同一块（来源与贴图）
   ② 悬浮立绘做全：可来自图集**也可自己导入**（含动图），并在预览里实时叠出来（会飘）
   ③ 顺手清掉冗余：mkSoulCanvas / mkOldArtCanvas / MK_USE_ANY_TYPE / mkSize 引用，段落重新编号 */
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

/* ---------- ① 克隆下拉从「① 做什么」里挪走 ---------- */
rep(
  L("    const clone = document.createElement('div'); clone.className = 'mkrow';",
    "    const pickable = ['Joker', 'Consumable', 'Voucher', 'Booster', 'Deck', 'Enhancement', 'Edition', 'Seal', 'Tag', 'Blind'];",
    "    const allItems = (typeof ITEMS !== 'undefined' ? ITEMS : []).filter((i) => pickable.indexOf(i.cat) >= 0);",
    "    const vanilla = allItems.filter((i) => !i.source);",
    "    const modGroups = {};",
    "    allItems.filter((i) => i.source).forEach((i) => { (modGroups[i.source] = modGroups[i.source] || []).push(i) });",
    "    clone.innerHTML = '<label class=\"mkwide\">照现成的牌做一个（原版 + 已导入的 mod 全都在这里）' +"),
  L("    /* 克隆下拉先建好，等会儿放进「来源与贴图」那块（用户要求：和取图放一起） */",
    "    const clone = document.createElement('div'); clone.className = 'mksrcclone';",
    "    const pickable = ['Joker', 'Consumable', 'Voucher', 'Booster', 'Deck', 'Enhancement', 'Edition', 'Seal', 'Tag', 'Blind'];",
    "    const allItems = (typeof ITEMS !== 'undefined' ? ITEMS : []).filter((i) => pickable.indexOf(i.cat) >= 0);",
    "    const vanilla = allItems.filter((i) => !i.source);",
    "    const modGroups = {};",
    "    allItems.filter((i) => i.source).forEach((i) => { (modGroups[i.source] = modGroups[i.source] || []).push(i) });",
    "    clone.innerHTML = '<label class=\"mkwide\">① 照现成的牌做一个（原版 + 已导入的 mod 全都在这里）' +"),
  '克隆下拉改名');
rep(
  "    b.appendChild(clone);\n    const secType = sec('① 做什么（也决定预览长什么样）', b, 'type');",
  "    /* 克隆下拉不挂这里：下面「来源与贴图」那块会把它和取图放在一起 */\n    const secType = sec('① 做什么（也决定预览长什么样）', b, 'type');",
  '克隆不再单独挂');

/* ---------- ② 来源与贴图：克隆 + 图集 + 上传 + 网格 + 立绘 ---------- */
rep(
  L("      box.innerHTML = '<div class=\"mklabel\">贴图（点格子换图，或上传自己的图）</div>';",
    "      box.appendChild(b);"),
  L("      box.innerHTML = '<div class=\"mklabel\">来源与贴图（三条路任选：照现成的牌 / 从图集取一格 / 上传自己的图）</div>';",
    "      box.appendChild(clone);",
    "      box.appendChild(b);"),
  '克隆并进贴图块');
rep(
  L("      '<div class=\"hint\" id=\"mkArtHint\"></div>' +",
    "      '<div class=\"mkartgrid\" id=\"mkArtGrid\"></div>';",
    "    if (MK.type === 'Joker') {",
    "      b.appendChild(Object.assign(document.createElement('div'), { className: 'mkrow mksoul' }));",
    "      b.lastChild.innerHTML = '<label class=\"mkck\"><input type=\"checkbox\" id=\"mkSoulOn\"' + (MK.soul.on ? ' checked' : '') + '>再给一张「悬浮立绘」（传奇牌那种飘在半空的画）</label>' +",
    "        '<div class=\"hint\">开了之后会多导一张 soul.png，并写上 soul_pos —— 现在用的是主体那张图，等导出来你可以替换 assets/1x/soul.png。</div>';",
    "    }"),
  L("      '<div class=\"hint\" id=\"mkArtHint\"></div>' +",
    "      '<div class=\"mkartgrid\" id=\"mkArtGrid\"></div>';",
    "    /* 悬浮立绘：自己的图集 / 自己的文件，都能用；预览里会实时叠出来 */",
    "    if (MK.type === 'Joker') {",
    "      const soul = document.createElement('div'); soul.className = 'mksoul';",
    "      soul.innerHTML = '<label class=\"mkck\"><input type=\"checkbox\" id=\"mkSoulOn\"' + (MK.soul.on ? ' checked' : '') + '>给这张牌加一层「悬浮立绘」（传奇牌那种飘在半空的画）</label>' +",
    "        '<div class=\"mkrow\"><label>立绘从哪个图集取<select class=\"tbtn\" id=\"mkSoulAtlas\">' +",
    "          Object.keys(D.atlases).map((nm2) => '<option value=\"' + nm2 + '\"' + (MK.soul.atlas === nm2 ? ' selected' : '') + '>' + mkAtlasLabel(nm2) + '</option>').join('') +",
    "        '</select></label>' +",
    "        '<label class=\"mkfile\">或上传立绘文件<input type=\"file\" id=\"mkSoulUp\" accept=\"image/*\"></label>' +",
    "        '<button class=\"btn\" type=\"button\" id=\"mkSoulPick\">在下面的网格里选立绘的格子</button></div>' +",
    "        '<div class=\"hint\" id=\"mkSoulHint\">' + (MK.soul.uploadName ? ('用的立绘文件：' + esc(MK.soul.uploadName)) : ('立绘取 ' + esc(MK.soul.atlas) + ' 的 x' + MK.soul.pos.x + ' y' + MK.soul.pos.y)) + '</div>';",
    "      b.appendChild(soul);",
    "    }"),
  '立绘控制台');

/* ---------- 网格支持"选立绘的格子"：加目标切换 ---------- */
rep(
  "      cell.onclick = () => mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null, animated: false } });",
  L("      cell.onclick = () => {",
    "        if (mkArtTarget === 'soul') mkSet({ soul: Object.assign({}, MK.soul, { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null }) });",
    "        else mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null, animated: false } });",
    '      };'),
  '网格支持立绘目标');
rep(
  "function viewMaker (root) {",
  "let mkArtTarget = 'art';   /* 网格当前在给谁选格子：主体 art / 立绘 soul */\nfunction viewMaker (root) {",
  '网格目标变量');

/* ---------- 预览：把立绘叠上去（会飘） ---------- */
rep(
  L("  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };",
    "  try { return compose(spec, 2) } catch (e) { return mkArtCanvas(2) }",
    '}'),
  L("  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };",
    "  let base = null;",
    "  try { base = compose(spec, 2) } catch (e) { base = mkArtCanvas(2) }",
    "  /* 立绘叠上去：和游戏一样，画在卡面之上、略微缩小并上下飘 */",
    "  if (MK.type === 'Joker' && MK.soul.on) {",
    "    const cv = newCanvas(CARD_W * 2, CARD_H * 2);",
    "    const ctx = cv.getContext('2d');",
    "    ctx.imageSmoothingEnabled = false;",
    "    ctx.drawImage(base, 0, 0);",
    "    const soulSrc = (MK.soul.frames && MK.soul.frames.length)",
    "      ? MK.soul.frames[mkFrame % MK.soul.frames.length]",
    "      : MK.soul.upload;",
    "    const bob = Math.sin((mkFrame % 60) / 60 * Math.PI * 2) * 4;   /* ±4px 的浮动 */",
    "    const w = CARD_W * 2 * 0.86, h = CARD_H * 2 * 0.86;",
    "    ctx.drawImage(mkDrawToCanvas(soulSrc, MK.soul.atlas, MK.soul.pos, w, h), (CARD_W * 2 - w) / 2, (CARD_H * 2 - h) / 2 - 6 + bob, w, h);",
    "    return cv;",
    "  }",
    "  return base;",
    '}',
    '/** 立绘那一层单独画到一张画布（上传的图或图集里的一格） */',
    'function mkDrawToCanvas (upload, atlasName, pos, w, h) {',
    '  const cv = newCanvas(Math.round(w), Math.round(h));',
    "  mkDrawSource(cv.getContext('2d'), w / CARD_W, 0, 0, { atlas: atlasName, pos, upload: upload || null });",
    '  return cv;',
    '}'),
  '预览叠立绘');

/* ---------- 立绘的事件：图集 / 上传 / 选格子（含动图拆帧） ---------- */
rep(
  "  { const so = q('#mkSoulOn'); if (so) so.onchange = () => mkSet({ soul: Object.assign({}, MK.soul, { on: so.checked }) }) }",
  L("  { const so = q('#mkSoulOn'); if (so) so.onchange = () => { mkSet({ soul: Object.assign({}, MK.soul, { on: so.checked }) }); if (so.checked && (MK.soul.frames || []).length > 1) mkStartAnim() } }",
    "  { const sa = q('#mkSoulAtlas'); if (sa) sa.onchange = () => mkSet({ soul: Object.assign({}, MK.soul, { atlas: sa.value, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null } }) }",
    "  { const sp = q('#mkSoulPick'); if (sp) sp.onclick = () => { mkArtTarget = mkArtTarget === 'soul' ? 'art' : 'soul';",
    "      status(mkArtTarget === 'soul' ? '下面网格现在是在给「悬浮立绘」选格子（再点一次切回主体）' : '网格切回给主体选格子');",
    "      mkRedraw(); } }",
    "  { const su = q('#mkSoulUp'); if (su) su.onchange = async (e) => {",
    "      const f = e.target.files && e.target.files[0]; if (!f) return;",
    "      const info = await mkReadImage(f);",
    "      if (!info) { status('这张立绘图读不了'); return }",
    "      const multi = info.frames.length > 1;",
    "      mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, uploadName: f.name }) });",
    "      status('立绘已换成「' + f.name + '」' + (multi ? '（动图 ' + info.frames.length + ' 帧，预览会飘着动）' : '') + '，预览里现在就能看到。', 'ok');",
    "      if (multi) mkStartAnim();",
    "    } }"),
  '立绘事件');

/* ---------- ③ 清掉冗余 + 段落重新编号 ---------- */
rep(
  L("/** 悬浮立绘的图：和主体用同一套取图方式，只是图集/坐标换成 soul 那一份 */",
    'function mkSoulCanvas (scale) {',
    '  const keep = MK.art;',
    "  MK.art = { atlas: MK.soul.atlas, pos: MK.soul.pos, upload: MK.soul.upload, uploadName: MK.soul.uploadName };",
    '  const cv = mkArtCanvas(scale);',
    '  MK.art = keep;',
    '  return cv;',
    '}'),
  '',
  '删掉旧的 mkSoulCanvas');
rep(
  L("function mkOldArtCanvas (scale) {",
    "  const px = CARD_W * scale, py = CARD_H * scale;",
    "  const cv = newCanvas(Math.round(px), Math.round(py));",
    "  const ctx = cv.getContext('2d');",
    "  ctx.imageSmoothingEnabled = false;",
    "  if (MK.art.upload) {",
    "    const r = Math.min(cv.width / MK.art.upload.width, cv.height / MK.art.upload.height);",
    "    const w = MK.art.upload.width * r, h = MK.art.upload.height * r;",
    "    ctx.drawImage(MK.art.upload, (cv.width - w) / 2, (cv.height - h) / 2, w, h);",
    "    return cv;",
    "  }",
    "  const a = D.atlases[MK.art.atlas];",
    "  if (!a) return cv;",
    "  const src = IMG[a.file];",
    "  const s = a.scale || 1;",
    "  const sx = MK.art.pos.x * a.px * s, sy = MK.art.pos.y * a.py * s, sw = a.px * s, sh = a.py * s;",
    "  try { ctx.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height) } catch (e) { /* 图没解码完就留空 */ }",
    "  return cv;",
    '}'),
  '',
  '删掉旧的画布函数');
rep("const MK_USE_ANY_TYPE = false;   /* 非小丑牌类型也允许挑牌组 */", '', '删掉没用到的常量');
rep("  const sz = q('#mkSize');\n  if (sz) sz.onchange = () => mkSet({});\n", '', '删掉指向不存在元素的引用');
rep("right.appendChild(sec('③ 它做什么（选择式，不用写代码）', b, 'fx').box);", "right.appendChild(sec('② 它做什么（选择式，不用写代码）', b, 'fx').box);", '② 编号');
rep("right.appendChild(sec('③ 它做什么', b, 'fx').box);", "right.appendChild(sec('② 它做什么', b, 'fx').box);", '② 编号（其它类型）');
rep("right.appendChild(sec('④ 名字与描述', b, 'text').box);", "right.appendChild(sec('③ 名字与描述', b, 'text').box);", '③ 编号');
rep("right.appendChild(sec('⑤ 数值与兼容性', b, 'num').box);", "right.appendChild(sec('④ 数值与兼容性', b, 'num').box);", '④ 编号');
rep("right.appendChild(sec('⑥ 高级（可跳过）', b, 'adv').box);", "right.appendChild(sec('⑤ 高级（可跳过）', b, 'adv').box);", '⑤ 编号');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
