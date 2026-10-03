/* 第三十五轮 A：Mod 制作器 —— 更多可定义的预制内容
   ① 效果词表扩容（触发/条件/效果都加）② 常用效果预设库（点一下就是一整套行）
   ③ 小丑牌的悬浮立绘（soul_pos）④ 消耗品的牌组与"使用效果"预设
   ⑤ 效果行改成"读得懂的句子"并分色 */
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

/* ① 词表扩容 + 预设库 */
rep(
  L("const MK_EFF = [",
    "  ['chips', '+ 筹码'],",
    "  ['mult', '+ 倍率'],",
    "  ['xmult', '× 倍率'],",
    "  ['dollars', '+ 金钱'],",
    "  ['reps', '再多结算 N 次'],",
    '];'),
  L("const MK_EFF = [",
    "  ['chips', '+ 筹码'],",
    "  ['mult', '+ 倍率'],",
    "  ['xmult', '× 倍率'],",
    "  ['dollars', '+ 金钱'],",
    "  ['reps', '再多结算 N 次'],",
    "  ['hands', '+ 出牌次数'],",
    "  ['discards', '+ 弃牌次数'],",
    "  ['handsize', '+ 手牌上限'],",
    "  ['tarot', '给一张随机塔罗'],",
    "  ['planet', '给一张随机星球'],",
    '];',
    '/* 常用效果预设：点一下就把整套效果行填好（仍然不用写代码） */',
    'const MK_PRESETS = [',
    "  ['每张打出的红桃 +50 筹码', [{ when: 'card', cond: 'suit', condVal: 'Hearts', eff: 'chips', val: 50 }]],",
    "  ['每张打出的黑桃 +3 倍率', [{ when: 'card', cond: 'suit', condVal: 'Spades', eff: 'mult', val: 3 }]],",
    "  ['每张人头牌 ×1.5 倍率', [{ when: 'card', cond: 'face', eff: 'xmult', val: 1.5 }]],",
    "  ['每张打出的 A +30 筹码', [{ when: 'card', cond: 'rank', condVal: 'Ace', eff: 'chips', val: 30 }]],",
    "  ['打出对子时 +$2', [{ when: 'hand', cond: 'hand', condVal: 'Pair', eff: 'dollars', val: 2 }]],",
    "  ['打出这一手 +4 倍率', [{ when: 'hand', cond: '', eff: 'mult', val: 4 }]],",
    "  ['每弃一张牌 +1 倍率', [{ when: 'discard', cond: '', eff: 'mult', val: 1 }]],",
    "  ['每张打出的牌再结算一次', [{ when: 'repetition', cond: '', eff: 'reps', val: 1 }]],",
    "  ['留在手里的牌 +20 筹码', [{ when: 'held', cond: '', eff: 'chips', val: 20 }]],",
    "  ['打完这一手 +1 出牌次数', [{ when: 'hand', cond: '', eff: 'hands', val: 1 }]],",
    "  ['打完这一手 +1 弃牌次数', [{ when: 'hand', cond: '', eff: 'discards', val: 1 }]],",
    "  ['手牌上限 +1', [{ when: 'hand', cond: '', eff: 'handsize', val: 1 }]],",
    "  ['卖掉这张牌 +$3', [{ when: 'sell', cond: '', eff: 'dollars', val: 3 }]],",
    "  ['每张打出的梅花 ×1.2 倍率', [{ when: 'card', cond: 'suit', condVal: 'Clubs', eff: 'xmult', val: 1.2 }]],",
    "  ['打出同花时 +$5', [{ when: 'hand', cond: 'hand', condVal: 'Flush', eff: 'dollars', val: 5 }]],",
    '];'),
  '效果词表 + 预设库');

rep(
  L("const MK_COND = [",
    "  ['', '无条件'],",
    "  ['suit', '花色是…'],",
    "  ['rank', '点数是…'],",
    "  ['face', '人头牌（J/Q/K）'],",
    "  ['hand', '牌型是…'],",
    "  ['count', '这一手至少…张'],",
    '];'),
  L("const MK_COND = [",
    "  ['', '无条件'],",
    "  ['suit', '花色是…'],",
    "  ['rank', '点数是…'],",
    "  ['face', '人头牌（J/Q/K）'],",
    "  ['enh', '强化是…'],",
    "  ['even', '偶数点数'],",
    "  ['odd', '奇数点数'],",
    "  ['hand', '牌型是…'],",
    "  ['count', '这一手至少…张'],",
    '];'),
  '条件词表');

rep(
  L("const MK_USE = [['dollars', '给一笔钱'], ['chips', '本手 +筹码'], ['mult', '本手 +倍率'], ['none', '什么都不做（占位）']];"),
  L("const MK_USE = [['dollars', '给一笔钱'], ['chips', '本手 +筹码'], ['mult', '本手 +倍率'],",
    "  ['handsize', '手牌上限 +N'], ['tarot', '给一张随机塔罗'], ['planet', '给一张随机星球'],",
    "  ['none', '什么都不做（占位）']];",
    "const MK_SETS = [['Tarot', '塔罗'], ['Planet', '星球'], ['Spectral', '幽灵']];",
    'const MK_USE_ANY_TYPE = false;   /* 非小丑牌类型也允许挑牌组 */'),
  '消耗品词表');

/* ② 状态里加悬浮立绘与牌组 */
rep(
  "  useKind: 'dollars', useVal: 4,",
  L("  useKind: 'dollars', useVal: 4, set: 'Tarot',",
    "  /* 悬浮立绘（传奇牌那种飘在半空的画）：开了就多导一张 soul.png，并在 Lua 里写 soul_pos */",
    "  soul: { on: false, atlas: 'Joker', pos: { x: 0, y: 2 }, upload: null, uploadName: '' },"),
  '状态加悬浮立绘');

/* ③ 条件和效果的取值/文案/Lua */
rep(
  "  if (e.cond === 'count') return '#' + 'context.full_hand >= ' + (v || 5);",
  L("  if (e.cond === 'count') return '#' + 'context.full_hand >= ' + (v || 5);",
    "  if (e.cond === 'enh') return \"context.other_card.config.center.key == '\" + (v || 'm_bonus') + \"'\";",
    "  if (e.cond === 'even') return 'context.other_card:get_id() <= 10 and context.other_card:get_id() % 2 == 0';",
    "  if (e.cond === 'odd') return '(context.other_card:get_id() % 2 == 1 or context.other_card:get_id() == 14)';"),
  '条件判定片段');

rep(
  L("  const eff = e.eff === 'chips' ? 'chips = ' + val",
    "    : e.eff === 'mult' ? 'mult = ' + val",
    "      : e.eff === 'xmult' ? 'x_mult = ' + (val || 1)",
    "        : e.eff === 'dollars' ? 'dollars = ' + val",
    "          : 'repetitions = ' + (val || 1);"),
  L("  const eff = e.eff === 'chips' ? 'chips = ' + val",
    "    : e.eff === 'mult' ? 'mult = ' + val",
    "      : e.eff === 'xmult' ? 'x_mult = ' + (val || 1)",
    "        : e.eff === 'dollars' ? 'dollars = ' + val",
    "          : e.eff === 'hands' ? 'hands = ' + (val || 1)",
    "            : e.eff === 'discards' ? 'discards = ' + (val || 1)",
    "              : e.eff === 'handsize' ? 'h_size = ' + (val || 1)",
    "                : e.eff === 'tarot' ? \"create_card('Tarot', G.play)\"",
    "                  : e.eff === 'planet' ? \"create_card('Planet', G.play)\"",
    "                    : 'repetitions = ' + (val || 1);"),
  '效果 Lua 片段');

rep(
  L("  if (e.eff === 'dollars') return '+$' + val;",
    "  return '再多结算 ' + (val || 1) + ' 次';"),
  L("  if (e.eff === 'dollars') return '+$' + val;",
    "  if (e.eff === 'hands') return '出牌次数 +' + (val || 1);",
    "  if (e.eff === 'discards') return '弃牌次数 +' + (val || 1);",
    "  if (e.eff === 'handsize') return '手牌上限 +' + (val || 1);",
    "  if (e.eff === 'tarot') return '给一张随机塔罗';",
    "  if (e.eff === 'planet') return '给一张随机星球';",
    "  return '再多结算 ' + (val || 1) + ' 次';"),
  '效果文案');

rep(
  "  if (e.cond === 'count') return '这一手至少 ' + (v || 5) + ' 张';",
  L("  if (e.cond === 'count') return '这一手至少 ' + (v || 5) + ' 张';",
    "  if (e.cond === 'enh') return '「' + (v || 'm_bonus') + '」强化';",
    "  if (e.cond === 'even') return '偶数点数';",
    "  if (e.cond === 'odd') return '奇数点数';"),
  '条件文案');

/* ④ 消耗品的 set 与更多 use 预设（Lua 生成） */
rep(
  L("    L.push(\"    set = 'Tarot',\");"),
  "    L.push(\"    set = '\" + (MK.set || 'Tarot') + \"',\");",
  '消耗品牌组');
rep(
  L("    if (MK.useKind === 'dollars') L.push('        ease_dollars(' + (Number(MK.useVal) || 0) + ')');",
    "    else if (MK.useKind === 'chips') L.push('        update_hand_text({ immediate = true }, { chips = G.GAME.chips + ' + (Number(MK.useVal) || 0) + ' })');",
    "    else if (MK.useKind === 'mult') L.push('        update_hand_text({ immediate = true }, { mult = ' + (Number(MK.useVal) || 0) + ' })');",
    "    else L.push('        -- 想做点什么就改这里');"),
  L("    if (MK.useKind === 'dollars') L.push('        ease_dollars(' + (Number(MK.useVal) || 0) + ')');",
    "    else if (MK.useKind === 'chips') L.push('        update_hand_text({ immediate = true }, { chips = G.GAME.chips + ' + (Number(MK.useVal) || 0) + ' })');",
    "    else if (MK.useKind === 'mult') L.push('        update_hand_text({ immediate = true }, { mult = ' + (Number(MK.useVal) || 0) + ' })');",
    "    else if (MK.useKind === 'handsize') L.push('        G.hand:change_size(' + (Number(MK.useVal) || 1) + ')');",
    "    else if (MK.useKind === 'tarot' || MK.useKind === 'planet') L.push(\"        local c = create_card('\" + (MK.useKind === 'tarot' ? 'Tarot' : 'Planet') + \"', G.play); c:add_to_deck(); G.consumeables:emplace(c)\");",
    "    else L.push('        -- 想做点什么就改这里');"),
  '消耗品 use 预设');
/* 悬浮立绘：Joker 的 soul_pos + 多导一张 soul.png */
rep(
  "    L.push('    blueprint_compat = ' + (MK.blueprint ? 'true' : 'false') + ',');",
  L("    L.push('    blueprint_compat = ' + (MK.blueprint ? 'true' : 'false') + ',');",
    "    if (MK.soul.on) {",
    "      L.push(\"    soul_pos = { x = 0, y = 0 },\");",
    "    }"),
  'Joker soul_pos');
rep(
  L("  L.push('SMODS.Atlas {');",
    "  L.push(\"    key = 'sheet',\");",
    "  L.push(\"    path = 'sheet.png',\");",
    "  L.push('    px = ' + CARD_W + ',');",
    "  L.push('    py = ' + CARD_H);",
    "  L.push('}');"),
  L("  L.push('SMODS.Atlas {');",
    "  L.push(\"    key = 'sheet',\");",
    "  L.push(\"    path = 'sheet.png',\");",
    "  L.push('    px = ' + CARD_W + ',');",
    "  L.push('    py = ' + CARD_H);",
    "  L.push('}');",
    "  if (MK.type === 'Joker' && MK.soul.on) {",
    "    L.push('');",
    "    L.push('SMODS.Atlas {');",
    "    L.push(\"    key = 'soul',\");",
    "    L.push(\"    path = 'soul.png',\");",
    "    L.push('    px = ' + CARD_W + ',');",
    "    L.push('    py = ' + CARD_H);",
    "    L.push('}');",
    "  }"),
  '悬浮立绘图集声明');
rep(
  "  const one = await canvasBytes(mkArtCanvas(1));\n  const two = await canvasBytes(mkArtCanvas(2));\n  files.push({ name: 'assets/1x/sheet.png', data: one });\n  files.push({ name: 'assets/2x/sheet.png', data: two });",
  L("  const one = await canvasBytes(mkArtCanvas(1));",
    "  const two = await canvasBytes(mkArtCanvas(2));",
    "  files.push({ name: 'assets/1x/sheet.png', data: one });",
    "  files.push({ name: 'assets/2x/sheet.png', data: two });",
    "  if (MK.type === 'Joker' && MK.soul.on) {",
    "    files.push({ name: 'assets/1x/soul.png', data: await canvasBytes(mkSoulCanvas(1)) });",
    "    files.push({ name: 'assets/2x/soul.png', data: await canvasBytes(mkSoulCanvas(2)) });",
    "  }"),
  '悬浮立绘打包');
/* 悬浮立绘取图（复用同一套取图逻辑，只是换成 soul） */
rep(
  "function mkPreviewCanvas () {",
  L("/** 悬浮立绘的图：和主体用同一套取图方式，只是图集/坐标换成 soul 那一份 */",
    'function mkSoulCanvas (scale) {',
    '  const keep = MK.art;',
    "  MK.art = { atlas: MK.soul.atlas, pos: MK.soul.pos, upload: MK.soul.upload, uploadName: MK.soul.uploadName };",
    '  const cv = mkArtCanvas(scale);',
    '  MK.art = keep;',
    '  return cv;',
    '}',
    'function mkPreviewCanvas () {'),
  '悬浮立绘取图');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
