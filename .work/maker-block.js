/* ================================================================ Mod 制作器
 * 目标：不写代码也能做出一个能用的 mod。所有选项都是预设式的（和得分计算器里改小丑牌记录值一样的路子），
 * 生成标准 Steamodded 代码；再往上一层有「高级」面板，可以改 key / 稀有度 / config，也可以直接编辑生成的 Lua。
 * 导出是一个能直接丢进 Mods/ 的 zip；「自检」会真的把它导一遍，看条目数与警告。
 *
 * 已经导入过别的 mod 时，可以「照它的条目做一个」：贴图、配置、文案先复制过来再改 —— 新内容继续往上长。
 * 贴图既可以从任意图集里挑一格（原版或 mod 的），也可以直接上传自己的 PNG（自动生成 1x / 2x 两张）。
 */

const MK_TYPES = [
  ['Joker', '小丑牌', 'Joker', 'j_'],
  ['Consumable', '消耗品（塔罗 / 星球 / 幽灵）', 'Consumable', 'c_'],
  ['Voucher', '优惠券', 'Voucher', 'v_'],
  ['Booster', '补充包', 'Booster', 'p_'],
  ['Back', '牌组', 'Back', 'b_'],
  ['Enhanced', '强化牌', 'Enhanced', 'm_'],
  ['Edition', '版本', 'Edition', 'e_'],
  ['Seal', '蜡封', 'Seal', 's_'],
  ['Tag', '标签', 'Tag', 'tag_'],
  ['Blind', '盲注', 'Blind', 'bl_'],
];
const MK_WHEN = [
  ['card', '每张打出的牌（逐牌）'],
  ['hand', '打出这一手时（整手一次）'],
  ['held', '留在手里时'],
  ['repetition', '再结算一次（重触发）'],
  ['discard', '每次弃牌时'],
  ['independent', '每张牌独立结算时'],
  ['sell', '这张牌被卖掉时'],
];
const MK_COND = [
  ['', '无条件'],
  ['suit', '花色是…'],
  ['rank', '点数是…'],
  ['face', '人头牌（J/Q/K）'],
  ['hand', '牌型是…'],
  ['count', '这一手至少…张'],
];
const MK_EFF = [
  ['chips', '+ 筹码'],
  ['mult', '+ 倍率'],
  ['xmult', '× 倍率'],
  ['dollars', '+ 金钱'],
  ['reps', '再多结算 N 次'],
];
const MK_RARITY = [[1, '普通'], [2, '罕见'], [3, '稀有'], [4, '传奇']];
const MK_SUITS = [['Hearts', '红桃'], ['Diamonds', '方片'], ['Spades', '黑桃'], ['Clubs', '梅花']];
const MK_RANKS = [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10'], ['Jack', 'J'], ['Queen', 'Q'], ['King', 'K'], ['Ace', 'A']];
const MK_USE = [['dollars', '给一笔钱'], ['chips', '本手 +筹码'], ['mult', '本手 +倍率'], ['none', '什么都不做（占位）']];

const MK = {
  type: 'Joker',
  modId: 'mymod', modName: '我的 Mod', author: 'me', version: '1.0.0', desc: '由图鉴 Mod 制作器生成',
  prefix: 'mymod',
  key: 'alpha',
  art: { atlas: 'Joker', pos: { x: 0, y: 0 }, upload: null, uploadName: '' },
  rarity: 1, cost: 4, order: 100, weight: 1,
  eternal: true, perishable: true, blueprint: true,
  nameZh: '阿尔法', nameEn: 'Alpha', textZh: '', textEn: '',
  effects: [{ when: 'card', cond: 'suit', condVal: 'Hearts', eff: 'chips', val: 50 }],
  useKind: 'dollars', useVal: 4,
  advanced: false, lua: null, luaDirty: false, config: '',
  cloneFrom: '',
};

function mkType () { return MK_TYPES.filter((t) => t[0] === MK.type)[0] || MK_TYPES[0] }
function mkAtlasName () {
  const a = D.atlases[MK.art.atlas];
  if (MK.art.upload) return null;
  return a ? a.file : null;
}
/** 贴图源画到一张 71×95（或 2 倍）的画布上：从图集里裁一格，或用户上传的图 */
function mkArtCanvas (scale) {
  const px = CARD_W * scale, py = CARD_H * scale;
  const cv = newCanvas(Math.round(px), Math.round(py));
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (MK.art.upload) {
    const r = Math.min(cv.width / MK.art.upload.width, cv.height / MK.art.upload.height);
    const w = MK.art.upload.width * r, h = MK.art.upload.height * r;
    ctx.drawImage(MK.art.upload, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    return cv;
  }
  const a = D.atlases[MK.art.atlas];
  if (!a) return cv;
  const src = IMG[a.file];
  const s = a.scale || 1;
  const sx = MK.art.pos.x * a.px * s, sy = MK.art.pos.y * a.py * s, sw = a.px * s, sh = a.py * s;
  try { ctx.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height) } catch (e) { /* 图没解码完就留空 */ }
  return cv;
}
/** 预览：原版卡图（中心框 + 贴图），和合成台一样的方式 */
function mkPreviewCanvas () {
  const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };
  try { return compose(spec, 2) } catch (e) { return mkArtCanvas(2) }
}
function mkCondSnippet (e) {
  const v = e.condVal;
  if (e.cond === 'suit') return "context.other_card:is_suit('" + v + "')";
  if (e.cond === 'rank') return 'context.other_card:get_id() == ' + ({ Jack: 11, Queen: 12, King: 13, Ace: 14 }[v] || v);
  if (e.cond === 'face') return 'context.other_card:is_face()';
  if (e.cond === 'hand') return "context.scoring_name == '" + v + "'";
  if (e.cond === 'count') return '#' + 'context.full_hand >= ' + (v || 5);
  return '';
}
/** 一行效果 → Lua 片段 */
function mkEffectLua (e) {
  const val = Number(e.val) || 0;
  const eff = e.eff === 'chips' ? 'chips = ' + val
    : e.eff === 'mult' ? 'mult = ' + val
      : e.eff === 'xmult' ? 'x_mult = ' + (val || 1)
        : e.eff === 'dollars' ? 'dollars = ' + val
          : 'repetitions = ' + (val || 1);
  const cond = mkCondSnippet(e);
  const lines = [];
  if (e.when === 'card') {
    lines.push('if context.cardarea == G.play and context.individual then');
    if (cond) lines.push('    if ' + cond + ' then');
    lines.push((cond ? '        ' : '    ') + 'return { ' + eff + ' }');
    if (cond) lines.push('    end');
    lines.push('end');
  } else if (e.when === 'hand') {
    lines.push('if context.cardarea == G.play and not context.individual then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  } else if (e.when === 'held') {
    lines.push('if context.cardarea == G.hand and context.individual then');
    if (cond) lines.push('    if ' + cond + ' then');
    lines.push((cond ? '        ' : '    ') + 'return { ' + eff + ' }');
    if (cond) lines.push('    end');
    lines.push('end');
  } else if (e.when === 'repetition') {
    lines.push('if context.repetition and context.cardarea == G.play then');
    if (cond) lines.push('    if ' + cond + ' then');
    lines.push((cond ? '        ' : '    ') + 'return { ' + eff + ' }');
    if (cond) lines.push('    end');
    lines.push('end');
  } else if (e.when === 'discard') {
    lines.push('if context.discard then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  } else if (e.when === 'independent') {
    lines.push('if context.independent then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  } else if (e.when === 'sell') {
    lines.push('if context.sell then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  }
  return lines.join('\n');
}
function mkCondText (e) {
  const v = e.condVal;
  if (e.cond === 'suit') return (MK_SUITS.filter((s) => s[0] === v)[0] || [v, v])[1] + '牌';
  if (e.cond === 'rank') return (MK_RANKS.filter((r) => r[0] === v)[0] || [v, v])[1] + '点';
  if (e.cond === 'face') return '人头牌（J/Q/K）';
  if (e.cond === 'hand') return '「' + (handCN({ name: v }) || v) + '」';
  if (e.cond === 'count') return '这一手至少 ' + (v || 5) + ' 张';
  return '';
}
function mkEffText (e) {
  const val = Number(e.val) || 0;
  if (e.eff === 'chips') return '+' + val + ' 筹码';
  if (e.eff === 'mult') return '+' + val + ' 倍率';
  if (e.eff === 'xmult') return '×' + (val || 1) + ' 倍率';
  if (e.eff === 'dollars') return '+$' + val;
  return '再多结算 ' + (val || 1) + ' 次';
}
function mkWhenText (e) {
  return (MK_WHEN.filter((w) => w[0] === e.when)[0] || ['', e.when])[1];
}
/** 描述文字：按选的效果自动拼（也可以手改） */
function mkAutoText (lang) {
  const parts = MK.effects.map((e) => {
    const c = mkCondText(e);
    let s = '';
    if (e.when === 'card') s = '每张' + (c || '打出的') + '牌';
    else if (e.when === 'hand') s = '打出这一手' + (c ? '（' + c + '）' : '');
    else if (e.when === 'held') s = '留在手里的' + (c || '每张') + '牌';
    else if (e.when === 'repetition') s = (c || '打出的牌') + '再结算一次';
    else if (e.when === 'discard') s = '每次弃牌';
    else if (e.when === 'independent') s = '每张牌独立结算时';
    else if (e.when === 'sell') s = '这张牌被卖掉时';
    return s + ' ' + mkEffText(e);
  });
  return parts.join(lang === 'zh' ? '；' : '; ');
}
/** 生成完整的 mod Lua（含 Atlas 声明与对象声明） */
function mkLua () {
  const t = mkType();
  const L = [];
  const key = String(MK.key || 'thing').replace(/[^A-Za-z0-9_]/g, '_') || 'thing';
  const nameZh = MK.nameZh || key, nameEn = MK.nameEn || nameZh;
  const textZh = MK.textZh || mkAutoText('zh'), textEn = MK.textEn || mkAutoText('en');
  L.push('-- ' + MK.modName + ' · 由图鉴「Mod 制作器」生成');
  L.push('-- 直接放：%AppData%/Balatro/Mods/' + MK.modId + '/');
  L.push('');
  L.push('SMODS.Atlas {');
  L.push("    key = 'sheet',");
  L.push("    path = 'sheet.png',");
  L.push('    px = ' + CARD_W + ',');
  L.push('    py = ' + CARD_H);
  L.push('}');
  L.push('');
  const loc = [
    '    loc_txt = {',
    "        name = '" + nameZh.replace(/'/g, "\\'") + "',",
    '        text = {',
    "            '" + textZh.replace(/'/g, "\\'") + "'",
    '        }',
    '    },',
  ];
  if (MK.type === 'Joker') {
    const cfg = MK.effects.map((e) => {
      const v = Number(e.val) || 0;
      const k = e.eff === 'reps' ? 'repetitions' : e.eff;
      return '        ' + k + ' = ' + (e.eff === 'xmult' ? (v || 1) : v);
    });
    L.push('SMODS.Joker {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push('    config = {');
    L.push('        extra = {');
    L.push.apply(L, cfg);
    L.push('        }');
    L.push('    },');
    L.push('    rarity = ' + MK.rarity + ',');
    L.push('    cost = ' + MK.cost + ',');
    L.push("    atlas = 'sheet',");
    L.push('    pos = { x = 0, y = 0 },');
    L.push('    order = ' + MK.order + ',');
    L.push('    weight = ' + MK.weight + ',');
    L.push('    eternal_compat = ' + (MK.eternal ? 'true' : 'false') + ',');
    L.push('    perishable_compat = ' + (MK.perishable ? 'true' : 'false') + ',');
    L.push('    blueprint_compat = ' + (MK.blueprint ? 'true' : 'false') + ',');
    L.push('    calculate_joker = function(self, context)');
    MK.effects.forEach((e, i) => {
      L.push('        -- ' + (i + 1) + '. ' + mkWhenText(e) + '：' + mkEffText(e));
      mkEffectLua(e).split('\n').forEach((ln) => L.push('        ' + ln));
    });
    L.push('        return nil');
    L.push('    end');
    L.push('}');
  } else if (MK.type === 'Consumable') {
    L.push('SMODS.Consumable {');
    L.push("    key = '" + key + "',");
    L.push("    set = 'Tarot',");
    L.push.apply(L, loc);
    L.push('    config = { extra = { value = ' + (Number(MK.useVal) || 0) + ' } },');
    L.push('    cost = ' + MK.cost + ',');
    L.push("    atlas = 'sheet',");
    L.push('    pos = { x = 0, y = 0 },');
    L.push('    can_use = function(self, card) return true end,');
    L.push('    use = function(self, card, area, copier)');
    if (MK.useKind === 'dollars') L.push('        ease_dollars(' + (Number(MK.useVal) || 0) + ')');
    else if (MK.useKind === 'chips') L.push('        update_hand_text({ immediate = true }, { chips = G.GAME.chips + ' + (Number(MK.useVal) || 0) + ' })');
    else if (MK.useKind === 'mult') L.push('        update_hand_text({ immediate = true }, { mult = ' + (Number(MK.useVal) || 0) + ' })');
    else L.push('        -- 想做点什么就改这里');
    L.push('    end');
    L.push('}');
  } else {
    const cls = t[2];
    L.push('SMODS.' + cls + ' {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    if (MK.type === 'Voucher') L.push('    cost = ' + MK.cost + ',');
    L.push("    atlas = 'sheet',");
    L.push('    pos = { x = 0, y = 0 },');
    if (MK.type === 'Booster') L.push('    config = { extra = 3, choose = 1 },');
    if (MK.type === 'Blind') L.push('    boss = { min = 1, max = 10 },');
    L.push('    unlocked = true,');
    L.push('    discovered = true');
    L.push('}');
  }
  return L.join('\n') + '\n';
}
function mkManifest () {
  return JSON.stringify({
    id: MK.modId,
    name: MK.modName,
    author: MK.author,
    version: MK.version,
    description: MK.desc,
    prefix: MK.prefix,
    main_file: MK.modId + '.lua',
    dependencies: ['Steamodded (>=1.0.0~BETA-0706b)', 'Lovely (>=0.6)'],
    provides: ['图鉴 Mod 制作器'],
  }, null, 2) + '\n';
}
/** 生成整个 mod 的文件表（名字 → 字节），给 zipStore / 自检用 */
async function mkBuildFiles () {
  const files = [];
  files.push({ name: 'manifest.json', data: TE.encode(mkManifest()) });
  files.push({ name: MK.modId + '.lua', data: TE.encode(mkLua()) });
  const one = await canvasBytes(mkArtCanvas(1));
  const two = await canvasBytes(mkArtCanvas(2));
  files.push({ name: 'assets/1x/sheet.png', data: one });
  files.push({ name: 'assets/2x/sheet.png', data: two });
  return files;
}
function mkSet (patch) { Object.assign(MK, patch); if (patch && ('type' in patch || 'key' in patch || 'art' in patch || 'effects' in patch)) MK.luaDirty = false; mkRedraw() }
let mkRedraw = () => { render() };

/* ---------------------------------------------------------------- 视图 */
function viewMaker (root) {
  const wrap = document.createElement('div'); wrap.className = 'maker';
  const left = document.createElement('div'); left.className = 'mkleft';
  const right = document.createElement('div'); right.className = 'mkright';
  wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);

  /* 预览 */
  const pv = document.createElement('div'); pv.className = 'mkpv opt'; pv.dataset.gkey = 'pv';
  const pvBox = document.createElement('div'); pvBox.className = 'mkpvbox';
  const cv = mkPreviewCanvas();
  if (cv) { cv.style.width = '142px'; cv.style.height = '190px'; pvBox.appendChild(cv) }
  pv.appendChild(pvBox);
  const pvLine = document.createElement('div'); pvLine.className = 'hint mkpvline';
  pvLine.innerHTML = '<b>' + esc(MK.nameZh || MK.key) + '</b> · ' + esc(mkType()[1]) +
    '<br>' + esc(mkAutoText('zh') || '（还没有效果）');
  pv.appendChild(pvLine);
  left.appendChild(pv);

  const io = document.createElement('div'); io.className = 'mkio opt';
  io.innerHTML = '<h4>导出</h4><div class="obody">' +
    '<div class="mkrow"><label>mod id<input class="tbtn" data-mk="modId"></label>' +
    '<label>前缀<input class="tbtn" data-mk="prefix" title="Steamodded 会自动给 key 加这个前缀"></label></div>' +
    '<div class="mkrow"><label>作者<input class="tbtn" data-mk="author"></label>' +
    '<label>版本<input class="tbtn" data-mk="version"></label></div>' +
    '<div class="mkbtnrow"><button class="btn primary" id="mkZip">⬇ 下载 mod zip</button>' +
    '<button class="btn" id="mkCheck">✓ 自检并导入</button>' +
    '<button class="btn" id="mkCopy">📋 复制 Lua</button></div>' +
    '<div class="hint" id="mkStatus">生成的是一个能直接丢进 <code>Mods/</code> 的 mod：manifest + Lua + 1x/2x 贴图。</div>' +
    '</div>';
  left.appendChild(io);

  const sec = (title, body, key) => {
    const box = document.createElement('section');
    box.className = 'opt'; box.dataset.gkey = key || title;
    const head = document.createElement('h4');
    head.innerHTML = '<span class="otitle">' + title + '</span><span class="chev">▾</span>';
    const ob = document.createElement('div'); ob.className = 'obody';
    head.onclick = () => box.classList.toggle('collapsed');
    box.appendChild(head); box.appendChild(ob);
    if (body) ob.appendChild(body);
    return { box, body: ob };
  };

  /* ① 做什么 */
  {
    const b = document.createElement('div');
    const chips = document.createElement('div'); chips.className = 'chips';
    for (const t of MK_TYPES) {
      const btn = document.createElement('button');
      btn.className = 'pick' + (MK.type === t[0] ? ' on' : '');
      btn.textContent = t[1];
      btn.onclick = () => mkSet({ type: t[0] });
      chips.appendChild(btn);
    }
    b.appendChild(chips);
    const clone = document.createElement('div'); clone.className = 'mkrow';
    const modItems = (typeof ITEMS !== 'undefined' ? ITEMS : []).filter((i) => i.source);
    clone.innerHTML = '<label class="mkwide">照已导入 mod 的条目做一个' +
      '<select class="tbtn" id="mkClone"><option value="">（不复制，自己从头做）</option>' +
      modItems.slice(0, 400).map((i) => '<option value="' + i.id + '">' + esc((i.sourceName || i.source) + ' · ' + nm(i)) + '</option>').join('') +
      '</select></label><div class="hint">选一个已导入的条目：贴图、配置、文案会先复制过来，再按你的想法改。</div>';
    b.appendChild(clone);
    right.appendChild(sec('① 做什么', b, 'type').box);
  }

  /* ② 长什么样 */
  {
    const b = document.createElement('div');
    const atlasNames = Object.keys(D.atlases);
    b.innerHTML = '<div class="mkrow"><label>从哪个图集取图<select class="tbtn" id="mkAtlas">' +
      atlasNames.map((n) => '<option value="' + n + '"' + (MK.art.atlas === n ? ' selected' : '') + '>' + n + '</option>').join('') +
      '</select></label>' +
      '<label class="mkfile">或上传自己的图<input type="file" id="mkUpload" accept="image/*"></label></div>' +
      '<div class="hint" id="mkArtHint"></div>' +
      '<div class="mkartgrid" id="mkArtGrid"></div>';
    right.appendChild(sec('② 长什么样', b, 'art').box);
  }

  /* ③ 它做什么（预设式） */
  if (MK.type === 'Joker') {
    const b = document.createElement('div');
    const list = document.createElement('div'); list.className = 'mkfxlist';
    MK.effects.forEach((e, i) => {
      const row = document.createElement('div'); row.className = 'mkfx';
      const when = '<select class="tbtn" data-fx="' + i + '" data-f="when">' +
        MK_WHEN.map((w) => '<option value="' + w[0] + '"' + (e.when === w[0] ? ' selected' : '') + '>' + w[1] + '</option>').join('') + '</select>';
      const cond = '<select class="tbtn" data-fx="' + i + '" data-f="cond">' +
        MK_COND.map((c) => '<option value="' + c[0] + '"' + (e.cond === c[0] ? ' selected' : '') + '>' + c[1] + '</option>').join('') + '</select>';
      const condVal = e.cond === 'suit' ? '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + MK_SUITS.map((s) => '<option value="' + s[0] + '"' + (e.condVal === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select>'
        : e.cond === 'rank' ? '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + MK_RANKS.map((r) => '<option value="' + r[0] + '"' + (e.condVal === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select>'
          : e.cond === 'hand' ? '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + D.hands.slice().sort((x, y) => (y.order || 0) - (x.order || 0)).map((h) => '<option value="' + h.name + '"' + (e.condVal === h.name ? ' selected' : '') + '>' + handCN(h) + '</option>').join('') + '</select>'
            : (e.cond === 'count' ? '<input class="tbtn" type="number" min="1" max="5" data-fx="' + i + '" data-f="condVal" value="' + (e.condVal || 5) + '">' : '');
      const eff = '<select class="tbtn" data-fx="' + i + '" data-f="eff">' +
        MK_EFF.map((x) => '<option value="' + x[0] + '"' + (e.eff === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>';
      const val = '<input class="tbtn mkn" type="number" step="0.5" data-fx="' + i + '" data-f="val" value="' + e.val + '">';
      row.innerHTML = when + cond + condVal + eff + val +
        '<button class="btn warn mkx" data-del="' + i + '" title="删掉这一行">✕</button>';
      list.appendChild(row);
    });
    b.appendChild(list);
    const addRow = document.createElement('div'); addRow.className = 'mkbtnrow';
    addRow.innerHTML = '<button class="btn" id="mkAddFx">＋ 加一条效果</button>' +
      '<button class="btn" id="mkAutoText">按上面的效果生成描述</button>';
    b.appendChild(addRow);
    right.appendChild(sec('③ 它做什么（选择式，不用写代码）', b, 'fx').box);
  } else {
    const b = document.createElement('div');
    b.innerHTML = '<div class="mkrow"><label>使用效果<select class="tbtn" id="mkUse">' +
      MK_USE.map((u) => '<option value="' + u[0] + '"' + (MK.useKind === u[0] ? ' selected' : '') + '>' + u[1] + '</option>').join('') +
      '</select></label><label>数值<input class="tbtn mkn" type="number" id="mkUseVal" value="' + MK.useVal + '"></label></div>' +
      '<div class="hint">这一版对非小丑牌类型只做「外观 + 文案 + 基础数值 + 一个使用效果」，更细的逻辑在下面的「高级」里自己补。</div>';
    right.appendChild(sec('③ 它做什么', b, 'fx').box);
  }

  /* ④ 文字 */
  {
    const b = document.createElement('div');
    b.innerHTML = '<div class="mkrow"><label>名字（中文）<input class="tbtn" data-mk="nameZh"></label>' +
      '<label>名字（英文）<input class="tbtn" data-mk="nameEn"></label></div>' +
      '<div class="mkrow"><label class="mkwide">描述（中文）<input class="tbtn" data-mk="textZh" id="mkTextZh"></label></div>' +
      '<div class="hint">留空就按效果自动生成；描述里的 <code>#1#</code> 这类占位符在这一版不做，直接写数字最省事。</div>';
    right.appendChild(sec('④ 名字与描述', b, 'text').box);
  }

  /* ⑤ 数值 */
  {
    const b = document.createElement('div');
    b.innerHTML = '<div class="mkrow"><label>稀有度<select class="tbtn" data-mk="rarity">' +
      MK_RARITY.map((r) => '<option value="' + r[0] + '"' + (MK.rarity === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') +
      '</select></label>' +
      '<label>价格<input class="tbtn mkn" type="number" data-mk="cost"></label>' +
      '<label>出现权重<input class="tbtn mkn" type="number" data-mk="weight"></label>' +
      '<label>排序<input class="tbtn mkn" type="number" data-mk="order"></label></div>' +
      '<div class="mkrow">' +
      '<label class="mkck"><input type="checkbox" data-mkflag="eternal">可以永恒</label>' +
      '<label class="mkck"><input type="checkbox" data-mkflag="perishable">可以易腐</label>' +
      '<label class="mkck"><input type="checkbox" data-mkflag="blueprint">可被蓝图复制</label></div>';
    right.appendChild(sec('⑤ 数值与兼容性', b, 'num').box);
  }

  /* ⑥ 高级 */
  {
    const b = document.createElement('div');
    b.innerHTML = '<div class="mkrow"><label>条目 key<input class="tbtn" data-mk="key"></label>' +
      '<label class="mkwide">mod 名称<input class="tbtn" data-mk="modName"></label></div>' +
      '<div class="mkrow"><label class="mkwide">config 覆盖（JSON，可留空）<input class="tbtn mono" data-mk="config" placeholder=\'{"extra":{"chips":50}}\'></label></div>' +
      '<div class="hint">生成的 Lua（可以直接改；改了之后就不再被上面的选项覆盖，点「重新生成」会覆盖你的改动）：</div>' +
      '<textarea id="mkLua" class="mklua" spellcheck="false"></textarea>' +
      '<div class="mkbtnrow"><button class="btn" id="mkRegen">↻ 按上面的选项重新生成</button>' +
      '<button class="btn" id="mkApplyCfg">把 config JSON 写进 Lua</button></div>';
    right.appendChild(sec('⑥ 高级（可跳过）', b, 'adv').box);
  }

  /* ---- 事件 ---- */
  const q = (s) => root.querySelector(s);
  const qa = (s) => [].slice.call(root.querySelectorAll(s));
  const status = (t, cls) => { const el = q('#mkStatus'); if (el) { el.textContent = t; el.className = 'hint' + (cls ? ' ' + cls : '') } };
  const syncInputs = () => {
    qa('[data-mk]').forEach((el) => {
      const k = el.dataset.mk;
      if (el.tagName === 'SELECT') el.value = MK[k];
      else el.value = MK[k] == null ? '' : (k === 'lua' ? MK.lua : MK[k]);
    });
    qa('[data-mkflag]').forEach((el) => { el.checked = !!MK[el.dataset.mkflag] });
    const luaEl = q('#mkLua');
    if (luaEl && !MK.luaDirty) luaEl.value = mkLua();
  };
  syncInputs();
  qa('[data-mk]').forEach((el) => {
    const k = el.dataset.mk;
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      MK[k] = el.type === 'number' ? Number(el.value) : el.value;
      if (k === 'textZh') MK.textZh = el.value;
      mkRedraw();
    });
  });
  qa('[data-mkflag]').forEach((el) => el.addEventListener('change', () => mkSet({ [el.dataset.mkflag]: el.checked })));
  { const l = q('#mkLua'); if (l) l.addEventListener('input', () => { MK.lua = l.value; MK.luaDirty = true }) }
  const regen = q('#mkRegen'); if (regen) regen.onclick = () => { MK.luaDirty = false; MK.lua = null; mkRedraw() };
  const applyCfg = q('#mkApplyCfg');
  if (applyCfg) applyCfg.onclick = () => { const l = q('#mkLua'); if (l && MK.config) { l.value = l.value.replace(/config = \{[\s\S]*?\n    \},/, 'config = ' + MK.config + ','); MK.lua = l.value; MK.luaDirty = true } };
  const addFx = q('#mkAddFx');
  if (addFx) addFx.onclick = () => mkSet({ effects: MK.effects.concat([{ when: 'card', cond: '', condVal: '', eff: 'mult', val: 4 }]) });
  const autoTxt = q('#mkAutoText');
  if (autoTxt) autoTxt.onclick = () => mkSet({ textZh: mkAutoText('zh'), textEn: mkAutoText('en') });

  /* 贴图：图集格子网格 */
  const paintArtGrid = () => {
    const grid = q('#mkArtGrid'); if (!grid) return;
    grid.innerHTML = '';
    const a = D.atlases[MK.art.atlas];
    if (!a) { grid.innerHTML = '<div class="hint">这个图集没有贴图信息</div>'; return }
    const cols = a.cols || Math.max(1, Math.floor((a.w / (a.px * (a.scale || 1))) || 1));
    const rows = a.rows || Math.max(1, Math.floor((a.h / (a.py * (a.scale || 1))) || 1));
    const total = Math.min(cols * rows, 240);
    for (let i = 0; i < total; i++) {
      const x = i % cols, y = Math.floor(i / cols);
      const cell = document.createElement('button');
      cell.className = 'mkcell' + (MK.art.pos.x === x && MK.art.pos.y === y && !MK.art.upload ? ' on' : '');
      cell.title = 'x=' + x + ' y=' + y;
      cell.onclick = () => mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '' } });
      grid.appendChild(cell);
    }
    const hint = q('#mkArtHint');
    if (hint) hint.textContent = MK.art.upload ? ('用的是你上传的图：' + MK.art.uploadName) : (a.file + ' · ' + cols + '×' + rows + ' 格 · 当前 x=' + MK.art.pos.x + ' y=' + MK.art.pos.y);
  };
  const atlasSel = q('#mkAtlas');
  if (atlasSel) atlasSel.onchange = () => mkSet({ art: Object.assign({}, MK.art, { atlas: atlasSel.value, pos: { x: 0, y: 0 }, upload: null }) });
  const up = q('#mkUpload');
  if (up) up.onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const im = new Image();
    im.onload = () => mkSet({ art: { atlas: MK.art.atlas, pos: MK.art.pos, upload: im, uploadName: f.name } });
    im.src = URL.createObjectURL(f);
  };
  const sz = q('#mkSize');
  if (sz) sz.onchange = () => mkSet({});
  paintArtGrid();
  { const u = q('#mkUse'); if (u) u.onchange = () => mkSet({ useKind: u.value });
    const uv = q('#mkUseVal'); if (uv) uv.oninput = () => mkSet({ useVal: Number(uv.value) || 0 }) }
  /* 效果行 */
  qa('[data-fx]').forEach((el) => {
    const i = Number(el.dataset.fx), f = el.dataset.f;
    el.addEventListener('change', () => {
      const list2 = MK.effects.slice();
      list2[i] = Object.assign({}, list2[i]);
      list2[i][f] = el.type === 'number' ? Number(el.value) : el.value;
      if (f === 'eff' && el.value === 'reps' && !Number(list2[i].val)) list2[i].val = 1;
      if (f === 'cond' && el.value === 'suit') list2[i].condVal = 'Hearts';
      if (f === 'cond' && el.value === 'rank') list2[i].condVal = 'King';
      if (f === 'cond' && el.value === 'hand') list2[i].condVal = D.hands[0] && D.hands[0].name;
      if (f === 'cond' && el.value === 'count') list2[i].condVal = 5;
      mkSet({ effects: list2 });
    });
  });
  qa('[data-del]').forEach((el) => el.addEventListener('click', () => {
    const list2 = MK.effects.slice(); list2.splice(Number(el.dataset.del), 1);
    mkSet({ effects: list2 });
  }));
  /* 克隆已导入 mod 的条目 */
  const cloneSel = q('#mkClone');
  if (cloneSel) cloneSel.onchange = () => {
    const it = BY_ID[cloneSel.value];
    if (!it) { mkSet({ cloneFrom: '' }); return }
    const cfg = it.config || {};
    const effects = [];
    const push = (when, kind, v) => { if (v) effects.push({ when, cond: '', condVal: '', eff: kind, val: v }) };
    push('hand', 'chips', cfg.t_chips); push('hand', 'mult', cfg.t_mult); push('hand', 'xmult', cfg.x_mult);
    if (cfg.extra && typeof cfg.extra === 'object') { push('card', 'chips', cfg.extra.chips); push('card', 'mult', cfg.extra.mult); push('card', 'xmult', cfg.extra.x_mult) }
    else { push('card', 'chips', typeof cfg.extra === 'number' ? 0 : 0) }
    const zh = (it.text && it.text.zh_CN) || [];
    mkSet({
      cloneFrom: it.id, type: it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat),
      key: 'my' + String(it.key || it.id).replace(/^[a-z]+_/, ''),
      art: { atlas: it.atlas || MK.art.atlas, pos: it.pos || { x: 0, y: 0 }, upload: null, uploadName: '' },
      nameZh: nm(it, 'zh_CN'), nameEn: nm(it, 'en-us'), textZh: zh.join(' '), textEn: ((it.text && it.text['en-us']) || []).join(' '),
      effects: effects.length ? effects : MK.effects,
    });
    status('已按「' + nm(it, 'zh_CN') + '」复制了一份，改完导出就是你的新条目。');
  };
  /* 导出 / 自检 / 复制 */
  const zipBtn = q('#mkZip');
  if (zipBtn) zipBtn.onclick = async () => {
    status('正在打包…');
    try {
      const files = await mkBuildFiles();
      const bytes = zipStore(files);
      save(bytes, MK.modId + '.zip', 'application/zip');
      status('已生成 ' + MK.modId + '.zip（' + files.length + ' 个文件，' + Math.round(bytes.length / 1024) + ' KB）—— 解压到 %AppData%/Balatro/Mods/ 即可。', 'ok');
    } catch (e) { status('打包失败：' + e.message) }
  };
  const chk = q('#mkCheck');
  if (chk) chk.onclick = async () => {
    status('正在自检（用图鉴自己的解析器把这份 mod 读一遍）…');
    try {
      const files = await mkBuildFiles();
      const bytes = zipStore(files);
      const res = await importZipBuffer(bytes, MK.modId);
      const ok = res && res.ok !== false;
      const mod = res && res.mod;
      status((ok ? '自检通过：' : '自检有问题：') + (mod ? (mod.items + ' 个条目 / ' + mod.atlases + ' 个图集 / ' + mod.warnings.length + ' 条警告') : JSON.stringify(res)) +
        (mod && mod.warnings.length ? ' —— ' + mod.warnings.slice(0, 2).join('；') : ' —— 它已经出现在「图鉴」里了（左侧来源可选到它）。'), ok ? 'ok' : '');
    } catch (e) { status('自检失败：' + e.message) }
  };
  const cp = q('#mkCopy');
  if (cp) cp.onclick = () => {
    const luaEl = q('#mkLua');
    const txt = (luaEl && MK.luaDirty) ? luaEl.value : mkLua();
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => status('Lua 已复制到剪贴板。', 'ok'), () => status('复制失败，请手动选中文本框复制。'))
    else status('这个浏览器不给剪贴板权限，请手动选中文本框复制。')
  };
  mkRedraw = () => render();
}
