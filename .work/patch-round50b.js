/* 第五十轮（B）：一个工程打成同一个 mod —— 每个条目自己的图集 + 一个 Lua 注册全部条目
   顺带：改任何东西都自动存（localStorage），打开制作器时把上次的工程读回来。 */
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

/* ① 打包：逐条目生成自己的帧条（文件名与图集 key 都用 slug） */
rep(
  L('  /* 尺寸自检：动图是横向帧条，宽度必须正好是 帧数×格宽 —— 算错的话后面 toBlob 会直接挂住 */',
    '  const artList0 = mkSourceFrames(MK.art);',
    '  const nArt = artList0 ? artList0.length : 1;',
    "  const s1 = mkSheetCanvas(1, 'art'); const s2 = mkSheetCanvas(2, 'art');",
    '  if (s1.width !== CARD_W * nArt || s2.width !== CARD_W * 2 * nArt) {',
    "    throw new Error('帧条宽度不对（1x ' + s1.width + '、2x ' + s2.width + '，按 ' + nArt + ' 帧应该是 ' + (CARD_W * nArt) + ' 和 ' + (CARD_W * 2 * nArt) + '）');",
    '  }',
    '  const one = await canvasBytes(s1);',
    '  const two = await canvasBytes(s2);',
    "  files.push({ name: 'assets/1x/sheet.png', data: one });",
    "  files.push({ name: 'assets/2x/sheet.png', data: two });",
    "  if (MK.type === 'Joker' && MK.soul.on) {",
    '    const soulList0 = mkSourceFrames(MK.soul);',
    '    const nSoul = soulList0 ? soulList0.length : 1;',
    "    const q1 = mkSheetCanvas(1, 'soul'); const q2 = mkSheetCanvas(2, 'soul');",
    '    if (q1.width !== CARD_W * nSoul || q2.width !== CARD_W * 2 * nSoul) {',
    "      throw new Error('立绘帧条宽度不对（1x ' + q1.width + '、2x ' + q2.width + '，按 ' + nSoul + ' 帧应该是 ' + (CARD_W * nSoul) + ' 和 ' + (CARD_W * 2 * nSoul) + '）');",
    '    }',
    "    files.push({ name: 'assets/1x/soul.png', data: await canvasBytes(q1) });",
    "    files.push({ name: 'assets/2x/soul.png', data: await canvasBytes(q2) });",
    '  }'),
  L('  /* 逐条目打包：每条自己的帧条文件（sheet_<slug>.png / soul_<slug>.png），和 Lua 里的图集 key 一一对应。',
    '     生成时把 MK 临时切到那一条上 —— 贴图/帧序列/动效/逐帧时长这些逻辑一行都不用改。 */',
    '  const keepMK = MK;',
    '  for (const it of MKR.items) {',
    '    MK = it;',
    '    const slug = mkSlug(it);',
    '    /* 尺寸自检：动图是横向帧条，宽度必须正好是 帧数×格宽 —— 算错的话后面 toBlob 会直接挂住 */',
    '    const artList0 = mkSourceFrames(MK.art);',
    '    const nArt = artList0 ? artList0.length : 1;',
    "    const s1 = mkSheetCanvas(1, 'art'); const s2 = mkSheetCanvas(2, 'art');",
    '    if (s1.width !== CARD_W * nArt || s2.width !== CARD_W * 2 * nArt) {',
    "      throw new Error('第 ' + (MKR.items.indexOf(it) + 1) + ' 条（' + (it.nameZh || it.key) + '）帧条宽度不对：1x ' + s1.width + '、2x ' + s2.width + '，按 ' + nArt + ' 帧应该是 ' + (CARD_W * nArt) + ' 和 ' + (CARD_W * 2 * nArt));",
    '    }',
    "    files.push({ name: 'assets/1x/sheet_' + slug + '.png', data: await canvasBytes(s1) });",
    "    files.push({ name: 'assets/2x/sheet_' + slug + '.png', data: await canvasBytes(s2) });",
    "    if (MK.type === 'Joker' && MK.soul.on) {",
    '      const soulList0 = mkSourceFrames(MK.soul);',
    '      const nSoul = soulList0 ? soulList0.length : 1;',
    "      const q1 = mkSheetCanvas(1, 'soul'); const q2 = mkSheetCanvas(2, 'soul');",
    '      if (q1.width !== CARD_W * nSoul || q2.width !== CARD_W * 2 * nSoul) {',
    "        throw new Error('第 ' + (MKR.items.indexOf(it) + 1) + ' 条立绘帧条宽度不对：1x ' + q1.width + '、2x ' + q2.width + '，按 ' + nSoul + ' 帧应该是 ' + (CARD_W * nSoul) + ' 和 ' + (CARD_W * 2 * nSoul));",
    '      }',
    "      files.push({ name: 'assets/1x/soul_' + slug + '.png', data: await canvasBytes(q1) });",
    "      files.push({ name: 'assets/2x/soul_' + slug + '.png', data: await canvasBytes(q2) });",
    '    }',
    '  }',
    '  MK = keepMK;'),
  '逐条目打包'
);

/* ② 改什么都自动存 */
rep(
  "  if (patch && patch.type && patch.type !== prevType) mkApplyTypeDefaults(prevType); if (patch && ('type' in patch || 'key' in patch || 'art' in patch || 'effects' in patch)) MK.luaDirty = false; mkRedraw() }",
  "  if (patch && patch.type && patch.type !== prevType) mkApplyTypeDefaults(prevType); if (patch && ('type' in patch || 'key' in patch || 'art' in patch || 'effects' in patch)) MK.luaDirty = false; mkSaveProject(); mkRedraw() }",
  'mkSet 里自动保存'
);

/* ③ 打开制作器时把上次的工程读回来（只读一次） */
rep(
  'function viewMaker (root) {',
  L('let mkProjectLoaded = false;',
    'function viewMaker (root) {',
    '  /* 第一次打开：保证至少有一条，并把上次自动保存的工程读回来 */',
    '  if (!mkProjectLoaded) { mkProjectLoaded = true; mkEnsureItems(); try { mkLoadProject() } catch (e) { /* 读不回来就用默认的 */ } }'),
  '打开时恢复工程'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ["assets/1x/sheet_' + slug + '.png'", 'const keepMK = MK;', 'mkSaveProject(); mkRedraw()', 'let mkProjectLoaded = false;'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
