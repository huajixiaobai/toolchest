/* 第五十轮（E）：修「两条同 key」+ 测试断言跟上新命名
   场景实测抓到的真问题：条目 key 只在「新建」那一刻查重，改成别的类型/手改 key 之后就可能重名
   （实测两条都叫 alpha_2）→ 同一个 mod 里会互相覆盖。现在导出前统一归一化一遍。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');

/* ---------- ① app.js：导出前把重名 key 归一化 ---------- */
{
  const F = path.join(__dirname, 'app.js');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const rep = (from, to, label, want) => {
    const hits = s.split(from).length - 1;
    if (hits !== (want || 1)) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
    s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
  };
  rep("function mkEnsureItems () {",
    L('/** 导出/加载前把重名的 key 归一化：同一个 mod 里两条同 key 会互相覆盖 */',
      'function mkNormalizeKeys () {',
      '  const used = {};',
      '  MKR.items.forEach((it) => {',
      "    let k = String(it.key || 'item').replace(/[^A-Za-z0-9_]/g, '_') || 'item';",
      '    if (used[k]) { let i = 2; while (used[k + \'_\' + i]) i++; k = k + \'_\' + i }',
      '    used[k] = 1;',
      '    it.key = k;',
      '  });',
      '}',
      'function mkEnsureItems () {'),
    '重名归一化');
  rep("async function mkBuildFiles () {\n  const files = [];",
    "async function mkBuildFiles () {\n  mkNormalizeKeys();   /* 打包前先保证 key 不重名 */\n  const files = [];",
    '打包前归一化');
  rep("function mkLua () {\n  const keep = MK;",
    "function mkLua () {\n  mkNormalizeKeys();   /* 生成 Lua 前也归一化一次（两个入口都要） */\n  const keep = MK;",
    '生成 Lua 前归一化');
  rep('  MKR.cur = Math.max(0, Math.min(o.cur || 0, MKR.items.length - 1));\n  MK = MKR.items[MKR.cur];\n  return true;',
    '  MKR.cur = Math.max(0, Math.min(o.cur || 0, MKR.items.length - 1));\n  MK = MKR.items[MKR.cur];\n  mkNormalizeKeys();\n  return true;',
    '导入后归一化');
  fs.writeFileSync(F, s);
  const b = fs.readFileSync(F, 'utf8');
  console.log(b.indexOf('function mkNormalizeKeys ()') >= 0 ? '  ✓ 写回校验通过' : '  ❌ 没写进去');
}

/* ---------- ② cdp.js：断言跟上 sheet_<slug> / soul_<slug> 的新命名 ---------- */
{
  const F = path.join(__dirname, 'verify', 'cdp.js');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const pairs = [
    ['f.name==="assets/1x/soul.png"', 'f.name.indexOf("assets/1x/soul")===0'],
    ["rd('assets/1x/sheet.png'), w2=rd('assets/2x/sheet.png')", "rd2('assets/1x/sheet'), w2=rd2('assets/2x/sheet')"],
    ["const rd=(nm)=>{ const f=files.filter(function(x){return x.name===nm})[0];", "const rd2=(nm)=>{ const f=files.filter(function(x){return x.name.indexOf(nm)===0})[0];"],
    ['r.soulAtlasInLua=lua.indexOf("soul_atlas = \'soul\'")>=0;', 'r.soulAtlasInLua=lua.indexOf("soul_atlas = \'soul_")>=0;'],
    ['soulAtlas:lua.indexOf("soul_atlas = \'soul\'")>=0', 'soulAtlas:lua.indexOf("soul_atlas = \'soul_")>=0'],
    ['r.uniqueRefs=r.atlasKeys.every', 'r.uniqueRefs=r.atlasKeys.every'],
  ];
  for (const [a, b] of pairs) {
    const h = s.split(a).length - 1;
    if (h) { s = s.split(a).join(b); console.log('  ✓ 断言更新（' + h + ' 处）：' + a.slice(0, 46)); n += h }
  }
  /* mkMotion / mkApng / mkGif 里的 sheet 断言已经是 indexOf 形式（上一轮改过），这里只是兜底再扫一遍 */
  const left = s.split("'assets/2x/sheet.png'").length - 1 + s.split('"assets/2x/sheet.png"').length - 1;
  if (left) { s = s.split("'assets/2x/sheet.png'").join("'assets/2x/sheet'").split('"assets/2x/sheet.png"').join('"assets/2x/sheet"'); console.log('  ✓ 兜底改名 ' + left + ' 处'); n += left }
  fs.writeFileSync(F, s);
  console.log('  ✓ cdp.js 已更新');
}

/* ---------- ③ DEVELOPMENT.md：这一轮的记录 ---------- */
{
  const F = path.join(__dirname, '..', 'DEVELOPMENT.md');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const anchor = '**第四十九轮（修「照现成的牌做一个」之后预览还是同一段内容）**';
  if (s.split(anchor).length - 1 !== 1) { console.error('❌ 更新记录锚点不唯一'); process.exit(1) }
  const E = L(
    '**第五十轮（Mod 制作器改成「一个工程」：多条目、按类型分组、自动保存、打成一个 mod）**',
    '- 用户提的问题：mod 不可能一次只做一个条目 —— 得有个地方按类型装起来、存住，最后**整包**打成一个 mod。',
    '- 做法（关键取巧点）：`MK` 从 `const` 改成 **`let`，永远指向「正在编辑的那一条」**，于是贴图 / 帧序列 / 动图 / 逐帧时长 / 立绘 / Lua 生成这些既有逻辑**一行都不用改**；工程级字段（id / 名称 / 作者 / 版本 / 前缀 / 说明）与条目列表搬进新的 `MKR`。',
    '- 新增：⓪ 段落「这个 mod 里有什么」—— 工程字段输入框 + **按类型分组的条目列表**（点谁编辑谁，高亮当前）+ ＋加一个 / ⧉复制 / 🗑删除 / ↑↓排序 + 工程概览（几个条目、各类型几个）+ 导出/导入工程 JSON（**连图片一起**，用 dataURL）。',
    '- 打包：一个 `manifest.json` + 一个 `<modid>.lua`（逐条目生成、注册全部条目）+ **每个条目自己的图集** `assets/1x/sheet_<key>.png`（有立绘再加 `soul_<key>.png`）。生成时把 `MK` 临时切到那一条上依次跑，所以每个条目的帧条 / 动图 / 逐帧时长能力都不退化。',
    '- 自动保存：任何改动都写进 `localStorage`（只存设置，图片太大不存），打开制作器时自动读回来。',
    '- 实测（新场景 `mkProject`，真点按钮）：控件全在（列表/加/复制/删/上移/下移/导出 JSON/导入 JSON + 6 个工程字段）；点 3 次「＋再加一个」→ 列表 **1 → 4 行**；四条类型是 小丑 / 消耗品 / 优惠券 / 盲注；导出的文件名是 `assets/1x/sheet_alpha.png`、`assets/1x/soul_alpha.png` 这种**带条目 slug** 的。',
    '- 场景当场抓到一个真 bug：**两条条目的 key 都成了 `alpha_2`** —— 原来只在「新建」那一刻查重，之后改类型/手改 key 就可能重名（同一个 mod 里会互相覆盖）。现在改成**导出与生成 Lua 之前统一归一化一遍**（导入工程后也归一化）。',
    '- 又是自己的老毛病：`node -e` 里塞带引号的 JS（PowerShell 传参把引号吃掉，脚本直接语法错、什么都没改），以及补丁脚本里在双引号字符串里写 ASCII 双引号 —— 这轮各踩一次，都改成写文件而不是内联字符串。',
    '',
  ).join('\n');
  s = s.replace(anchor, () => E + anchor);
  fs.writeFileSync(F, s);
  console.log('  ✓ DEVELOPMENT.md 第 50 轮'); n++;
}

console.log('共 ' + n + ' 处');
