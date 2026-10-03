/* 第四十六轮：动图导出的 Lua 之前是错的（两处）
   ① 少了 atlas_table = 'ANIMATION_ATLAS'。对着本机装的 Steamodded 源码核实（.work/third-party/smods/
      lsp_def/classes/atlas.lua 与 src/game_object.lua）：Atlas 默认 atlas_table = 'ASSET_ATLAS'（静态图集），
      只有写成 ANIMATION_ATLAS 才会建动画精灵；光写 frames 会被当成静态图集、帧数被忽略 —— 游戏里根本不会动。
      fps 也是 Atlas 的字段（默认 10 或 G.ANIMATION_FPS），按每帧毫秒数换算。
   ② 逗号漏了：原先是「py = 95」换行再插「frames = N,」，Lua 的表构造里字段之间必须有逗号，
      也就是 { py = 95 frames = 24 } —— 这是语法错误，mod 加载就会报错。
   现在改成统一按「字段行 + 逗号（最后一行不带）」拼，不再手写续行。 */
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

rep(
  L('  L.push(\'SMODS.Atlas {\');',
    '  L.push("    key = \'sheet\',");',
    '  L.push("    path = \'sheet.png\',");',
    '  L.push(\'    px = \' + CARD_W + \',\');',
    '  L.push(\'    py = \' + CARD_H);',
    "  if (MK.art.frames && MK.art.frames.length) L.push('    frames = ' + MK.art.frames.length + ',   -- 动图：横向帧序列');",
    "  L.push('}');",
    "  if (MK.type === 'Joker' && MK.soul.on) {",
    "    L.push('');",
    "    L.push('SMODS.Atlas {');",
    "    L.push(\"    key = 'soul',\");",
    "    L.push(\"    path = 'soul.png',\");",
    "    L.push('    px = ' + CARD_W + ',');",
    "    L.push('    py = ' + CARD_H);",
    "    if (MK.soul.frames && MK.soul.frames.length) L.push('    frames = ' + MK.soul.frames.length + ',   -- 动图：横向帧序列');",
    "    L.push('}');",
    '  }'),
  L('  /* 图集：动图要写全三样（atlas_table / frames / fps），字段之间的逗号统一在这里拼，避免手写续行漏逗号 */',
    '  const atlasLines = (key, file, frames, delay) => {',
    "    const rows = [['key', \"'\" + key + \"'\"], ['path', \"'\" + file + \"'\"], ['px', String(CARD_W)], ['py', String(CARD_H)]];",
    '    if (frames > 1) {',
    '      const fps = delay ? Math.max(1, Math.min(60, Math.round(1000 / delay))) : 10;',
    "      rows.push(['atlas_table', \"'ANIMATION_ATLAS'\", '动图必须写这一行：不写就算静态图集，帧数会被忽略']);",
    "      rows.push(['frames', String(frames), '动图：横向帧序列']);",
    "      rows.push(['fps', String(fps), delay ? '每帧 ' + delay + 'ms' : '']);",
    '    }',
    "    return rows.map((r, i) => '    ' + r[0] + ' = ' + r[1] + (i < rows.length - 1 ? ',' : '') + (r[2] ? '   -- ' + r[2] : ''));",
    '  };',
    "  L.push('SMODS.Atlas {');",
    "  for (const line of atlasLines('sheet', 'sheet.png', (MK.art.frames && MK.art.frames.length) || 1, MK.art.delay)) L.push(line);",
    "  L.push('}');",
    "  if (MK.type === 'Joker' && MK.soul.on) {",
    "    L.push('');",
    "    L.push('SMODS.Atlas {');",
    "    for (const line of atlasLines('soul', 'soul.png', (MK.soul.frames && MK.soul.frames.length) || 1, MK.soul.delay)) L.push(line);",
    "    L.push('}');",
    '  }'),
  '图集字段按行拼 + 动图三件套'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ["atlas_table", "const atlasLines = (key, file, frames, delay)", "rows.push(['fps', String(fps)", "for (const line of atlasLines('sheet'", "for (const line of atlasLines('soul'"];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
