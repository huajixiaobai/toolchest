/* 第五十四轮：按用户三条反馈改
   ① 黄框（前置要求说明）挪到最底部，不占主要功能的位置
   ② 「照现成的牌做一个」和「选素材图片」真合成一件事：点图格子 = 照这张牌做（图+名字+效果+数值），
      按住 Shift 点 = 只换图。原来一个按名字找、一个看图找，两边互不相干 —— 所以「选什么都是阿尔法」这类
      问题才老是冒出来。现在格子上直接标出这张图对应哪张牌。
   ③ 导入动图的播放长度默认加长（默认 2×，可调 0.5/1/1.5/2/3/4），之前默认「就按动图本身的时长」太短。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

/* ---------- ① 播放速度倍率：算时长时乘上去（预览 / 导出 / Lua 全都走这里） ---------- */
rep(
  '    out.push(Math.max(10, Math.round(d * ((w && w[i]) || 1))));',
  '    out.push(Math.max(10, Math.round(d * ((w && w[i]) || 1) * (src.speed || 1))));   /* speed = 播放速度倍率（越大越慢） */',
  '时长乘上播放速度'
);
rep(
  "    art: { atlas: MK.art.atlas, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null },",
  "    art: { atlas: MK.art.atlas, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },",
  '新条目默认速度 1×'
);
rep(
  "    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, delay: info.delay || 0, delays: (multi && info.delays) ? info.delays : null, weights: null, uploadName: f.name }) });",
  "    /* 导入的动图默认 2× 慢放：原来「就按动图本身的时长」在游戏里显得太短（用户反馈） */\n    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, delay: info.delay || 0, delays: (multi && info.delays) ? info.delays : null, weights: null, speed: multi ? 2 : 1, uploadName: f.name }) });",
  '导入动图默认 2×'
);
rep(
  "      mkSet({ art: Object.assign({}, MK.art, { upload: got[0], frames: got, animated: true, delay: Math.round(1000 / fps0), uploadName: fl.length + ' 张图（每张一帧）' }) });",
  "      mkSet({ art: Object.assign({}, MK.art, { upload: got[0], frames: got, animated: true, delay: Math.round(1000 / fps0), weights: null, speed: 2, uploadName: fl.length + ' 张图（每张一帧）' }) });",
  '多选图默认 2×'
);

/* ---------- ② 播放速度控件（放在动效那一排里） ---------- */
rep(
  "    genRow.appendChild(field('幅度', '<input type=\"range\" id=\"mkMotionAmp\" min=\"1\" max=\"8\" value=\"' + gen.amp + '\">'));",
  L("    genRow.appendChild(field('幅度', '<input type=\"range\" id=\"mkMotionAmp\" min=\"1\" max=\"8\" value=\"' + gen.amp + '\">'));",
    "    const spd = MK.art.speed || 1;",
    "    genRow.appendChild(field('播放速度（越大越慢；导入的动图默认 2×）', '<select class=\"tbtn\" id=\"mkSpeed\">' + [[0.5, '0.5×（更快）'], [1, '1×（按动图本身的时长）'], [1.5, '1.5×'], [2, '2×（默认）'], [3, '3×'], [4, '4×（很慢）']].map((k) => '<option value=\"' + k[0] + '\"' + (spd === k[0] ? ' selected' : '') + '>' + k[1] + '</option>').join('') + '</select>'));"),
  '播放速度控件'
);
rep(
  "  const sm2 = q('#mkSoulMotion'); if (sm2) sm2.onchange = () => mkSetGen('soul', { kind: sm2.value });",
  L("  const spdEl = q('#mkSpeed');",
    "  if (spdEl) spdEl.onchange = () => {",
    "    const v = Number(spdEl.value) || 1;",
    "    mkSet({ art: Object.assign({}, MK.art, { speed: v }) });",
    "    const d = mkFrameDelays(MK.art);",
    "    mkStartAnim(d.length > 1 ? d[0] : 0);",
    "    status('播放速度：' + v + '×（每帧大约 ' + (d.length > 1 ? d[0] : '?') + 'ms）—— 导出时会换算成 fps 写进 Lua。');",
    "  };",
    "  const sm2 = q('#mkSoulMotion'); if (sm2) sm2.onchange = () => mkSetGen('soul', { kind: sm2.value });"),
  '播放速度事件'
);

/* ---------- ③ 黄框挪到底部 ---------- */
rep(
  'function viewMaker (root) {\n  /* 第一次打开：保证至少有一条，并把上次自动保存的工程读回来 */',
  'let mkNeedBoxEl = null; let mkSectionParent = null;\nfunction viewMaker (root) {\n  /* 第一次打开：保证至少有一条，并把上次自动保存的工程读回来 */',
  '声明黄框变量'
);
rep(
  '    body.appendChild(need);\n  }',
  '    mkNeedBoxEl = need; mkSectionParent = body.parentElement;   /* 放到最底部，别占主要功能的位置（用户要求） */\n  }',
  '黄框不在这里挂载'
);
rep(
  '  MKEL.refresh = refresh;',
  '  /* 所有段落都建完了，把「前置要求」那块挂到最底部 */\n  if (mkNeedBoxEl && mkSectionParent) mkSectionParent.appendChild(mkNeedBoxEl);\n  MKEL.refresh = refresh;',
  '黄框挂到底部'
);

/* ---------- ④ 克隆逻辑抽成函数，给网格复用 ---------- */
rep(
  '  const cs = q(\'#mkClone\');',
  L('/** 照某张现成的牌做（图 + 名字 + 原文 + 效果 + 数值），下拉和网格格子共用这一份逻辑 */',
    'function mkApplyCloneFrom (id) {',
    '  const it = BY_ID[id];',
    '  if (!it) return false;',
    '  const cfg = it.config || {};',
    '  const effects = [];',
    "  const SUIT_CN2 = { Diamonds: '♦', Hearts: '♥', Spades: '♠', Clubs: '♣' };",
    "  const suitRaw2 = (cfg.extra && cfg.extra.suit) || (it.raw && it.raw.suit) || it.suit || '';",
    "  const cond2 = SUIT_CN2[suitRaw2] ? 'suit' : '';",
    '  const condVal2 = cond2 ? SUIT_CN2[suitRaw2] : \'\';',
    '  const push2 = (when, kind, v) => { if (v) effects.push({ when: when, cond: cond2, condVal: condVal2, eff: kind, val: v }) };',
    '  push2(\'hand\', \'chips\', cfg.t_chips); push2(\'hand\', \'mult\', cfg.t_mult); push2(\'hand\', \'xmult\', cfg.x_mult);',
    '  if (cfg.extra && typeof cfg.extra === \'object\') {',
    '    push2(\'card\', \'chips\', cfg.extra.chips); push2(\'card\', \'mult\', cfg.extra.mult); push2(\'card\', \'xmult\', cfg.extra.x_mult);',
    '  }',
    '  const rule2 = (typeof JOKER_RULES !== \'undefined\' && JOKER_RULES.rules ? JOKER_RULES.rules : []).filter((r) => r.n === it.name)[0];',
    '  if (rule2 && rule2.e) {',
    '    const seen2 = {};',
    '    rule2.e.forEach((ex) => {',
    "      const f2 = ex.split('=')[0];",
    "      const kind2 = /^x_mult|^Xmult_mod/.test(f2) ? 'xmult' : /^mult|^t_mult|^mult_mod/.test(f2) ? 'mult' : /^chips|^chip_mod|^t_chips/.test(f2) ? 'chips' : /dollars/.test(f2) ? 'dollars' : null;",
    '      if (!kind2 || seen2[kind2]) return;',
    '      seen2[kind2] = true;',
    '      const cand2 = [(cfg.extra || {})[f2], (cfg.extra || {}).chips, (cfg.extra || {}).mult, (cfg.extra || {}).x_mult, cfg[f2], cfg.t_chips, cfg.t_mult, cfg.x_mult, cfg.chips, cfg.mult];',
    '      const num2 = cand2.filter((v) => typeof v === \'number\' && isFinite(v))[0];',
    '      if (typeof num2 !== \'number\') return;',
    '      effects.push({ when: rule2.r === \'individual\' ? \'card\' : (rule2.r === \'repetition\' ? \'repetition\' : \'hand\'), cond: cond2, condVal: condVal2, eff: kind2, val: num2 });',
    '    });',
    '  }',
    "  const zh2 = (it.text && it.text.zh_CN) || [];",
    '  mkSet({',
    '    cloneFrom: it.id,',
    "    type: it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat),",
    "    key: mkUniqueKey('my' + String(it.key || it.id).replace(/^[a-z]+_/, '')),",
    "    art: { atlas: it.atlas || MK.art.atlas, pos: it.pos || { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },",
    "    nameZh: nm(it, 'zh_CN'), nameEn: nm(it, 'en-us'), textZh: zh2.join(' '), textEn: ((it.text && it.text['en-US']) || (it.text && it.text['en-us']) || []).join(' '),",
    '    rarity: it.rarity || MK.rarity, cost: it.cost || MK.cost, order: it.order || MK.order, weight: it.weight || MK.weight,',
    '    effects: effects.length ? effects : MK.effects,',
    '  });',
    '  return effects.length ? effects.length : 0;',
    '}',
    '  const cs = q(\'#mkClone\');'),
  '克隆逻辑抽成函数'
);

/* 下拉改成调用它 */
rep(
  "  if (cs) cs.onchange = () => {\n    const it = BY_ID[cs.value];\n    if (!it) return;",
  "  if (cs) cs.onchange = () => {\n    const it = BY_ID[cs.value];\n    if (!it) return;\n    mkApplyCloneFrom(cs.value);   /* 逻辑在上面的 mkApplyCloneFrom 里，网格格子用的是同一份 */\n    return;\n    /* eslint-disable no-unreachable */",
  '下拉改调函数'
);

/* ---------- ⑤ 网格：标出这张图对应哪张牌，点它 = 照这张牌做 ---------- */
rep(
  '  /* 网格：滚到才画；点格子给 art 或 soul */',
  L('/** 图集格子 → 对应的牌（同一个图集同一格的那张）。原版和导入的 mod 都算。 */',
    'function mkItemAtCell (atlas, x, y) {',
    '  if (typeof ITEMS === \'undefined\') return null;',
    '  let best = null;',
    '  for (const it of ITEMS) {',
    '    const sp = it.sprite || it;',
    '    if (!sp || !sp.atlas || sp.atlas !== atlas) continue;',
    '    const ps = sp.pos || it.pos;',
    '    if (!ps || ps.x !== x || ps.y !== y) continue;',
    "    if (it.cat === MK.type) return it;          /* 优先同类型的那张 */",
    '    if (!best) best = it;',
    '  }',
    '  return best;',
    '}',
    '  /* 网格：滚到才画；点格子给 art 或 soul —— 有对应牌时直接「照这张牌做」 */'),
  '格子→牌的查找'
);
rep(
  L('        cell.title = \'x=\' + x + \' y=\' + y + (artTarget === \'soul\' ? \'（给立绘）\' : \'\');',
    '        cell.onclick = () => {',
    "          if (artTarget === 'soul') mkSet({ soul: Object.assign({}, MK.soul, { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null }) });",
    "          else mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null, animated: false } });",
    '        };'),
  L('        const mate = artTarget === \'soul\' ? null : mkItemAtCell(MK.art.atlas, x, y);',
    "        cell.title = 'x=' + x + ' y=' + y + (artTarget === 'soul' ? '（给立绘）' : '') + (mate ? ('\\n这张图是「' + nm(mate, 'zh_CN') + '」—— 点它 = 照这张牌做（图 + 名字 + 效果 + 数值）\\n按住 Shift 点 = 只换图') : '');",
    "        if (mate) cell.className += ' hasitem';",
    '        cell.onclick = (e) => {',
    "          if (artTarget === 'soul') { mkSet({ soul: Object.assign({}, MK.soul, { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null }) }); return }",
    '          if (mate && !e.shiftKey) {',
    "            const cnt = mkApplyCloneFrom(mate.id);",
    "            status('已照「' + nm(mate, 'zh_CN') + '」做了一份：图、名字、原文、数值都进来了' + (cnt ? '（' + cnt + ' 条效果）' : '（这张牌的效果没法自动拆成数值，原文已放进描述，请自己挑一条效果）') + ' —— 想只换图就按住 Shift 点同一格。', 'ok');",
    '            return;',
    '          }',
    "          mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 } });",
    "          if (mate) status('只换了贴图（这张图对应的「' + nm(mate, 'zh_CN') + '」的设置没动）—— 想连设置一起要，直接点这格（别按 Shift）。');",
    '        };'),
  '格子点击=照这张牌做'
);
rep(
  "    src.innerHTML = '<div class=\"mklabel\">来源与贴图 —— 三条路任选：照现成的牌做 / 从图集里取一格 / 上传自己的图</div>';",
  "    src.innerHTML = '<div class=\"mklabel\">来源与贴图 —— 看下图点一格就是「照这张牌做」（图 + 名字 + 效果 + 数值一起进来）；只想换图按住 Shift 点；也可以按名字在下拉里找，或上传自己的图</div>';",
  '这一段说明改成二合一'
);
rep(
  "    clone.innerHTML = '<span>① 照现成的牌做一个（原版 + 已导入的 mod 全都在这里）</span>' +",
  "    clone.innerHTML = '<span>按名字找现成的牌（原版 + 已导入的 mod 全都在这里）—— 也可以直接在下面的图格子上点</span>' +",
  '下拉标题改成「按名字找」'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['function mkApplyCloneFrom (id)', 'function mkItemAtCell (atlas, x, y)', 'mkNeedBoxEl = need; mkSectionParent', 'if (mkNeedBoxEl && mkSectionParent) mkSectionParent.appendChild(mkNeedBoxEl)', "id=\\\"mkSpeed\\\"", 'speed: multi ? 2 : 1', 'hasitem'];
const missing = must.filter((m) => back.indexOf(m.replace(/\\"/g, '"')) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
