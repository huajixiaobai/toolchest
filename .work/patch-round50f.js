/* 第五十轮（F）：maker.state 要跟着 MK 走（原来捕获的是旧对象引用）+ 场景里 key 的读法 + 第 50 轮记录 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');

/* ① app.js：state 改成 getter —— MK 现在是 let（会被重新指向 / 工程重建条目），捕获引用会指向过期对象 */
{
  const F = path.join(__dirname, 'app.js');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const from = 'maker: { typeChip: (ty) => { mkSet({ type: ty }) }, state: MK,';
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ 暴露对象锚点命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => 'maker: { typeChip: (ty) => { mkSet({ type: ty }) }, get state () { return MK },   /* 必须是 getter：MK 会被重新指向 */');
  fs.writeFileSync(F, s);
  const b = fs.readFileSync(F, 'utf8');
  console.log(b.indexOf('get state () { return MK }') >= 0 ? '  ✓ maker.state 改成 getter' : '  ❌ 没写进去'); n++;
}

/* ② cdp.js：key 的断言放到导出之后（导出前会归一化），并补一条「归一化后不重名」 */
{
  const F = path.join(__dirname, 'verify', 'cdp.js');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const from = "    r.uniqueSheets=new Set(r.sheets).size===r.sheets.length && r.sheets.length===4;";
  if (s.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
  s = s.replace(from, () => from + [
    '',
    '    r.keysAfterExport=B.maker.project.items.map(function(it){return it.key});',
    '    r.keysUniqueAfterExport=new Set(r.keysAfterExport).size===r.keysAfterExport.length && r.keysAfterExport.length===4;',
  ].join('\n'));
  fs.writeFileSync(F, s);
  console.log('  ✓ 场景补 key 归一化断言'); n++;
}

/* ③ DEVELOPMENT.md：第 50 轮 */
{
  const F = path.join(__dirname, '..', 'DEVELOPMENT.md');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const anchor = '**第四十九轮（修「照现成的牌做一个」之后预览还是同一段内容）**';
  if (s.split(anchor).length - 1 !== 1) { console.error('❌ 记录锚点不唯一'); process.exit(1) }
  const E = [
    '**第五十轮（Mod 制作器改成「一个工程」：多条目、按类型分组、自动保存、最后打成一个 mod）**',
    '- 用户提的：mod 不可能一次只做一个条目 —— 得有个地方按类型装起来、存住，最后**整包**打成一个 mod。',
    '- 关键取巧点：`MK` 从 `const` 改成 **`let`，永远指向「正在编辑的那一条」**，于是贴图 / 帧序列 / 动图 / 逐帧时长 / 立绘 / Lua 生成这些既有逻辑**一行都不用改**；工程级字段（id / 名称 / 作者 / 版本 / 前缀 / 说明）与条目列表搬进新的 `MKR`。',
    '- 新增 ⓪ 段落「这个 mod 里有什么」：工程字段输入框 + **按类型分组的条目列表**（点谁编辑谁、当前那条高亮）+ ＋加一个 / ⧉复制 / 🗑删除 / ↑↓排序 + 工程概览 + 导出/导入工程 JSON（**连图片一起**，用 dataURL 存）。',
    '- 打包：一个 `manifest.json` + 一个 `<modid>.lua`（逐条目生成，注册全部条目）+ **每个条目自己的图集** `assets/1x/sheet_<key>.png`（有立绘再加 `soul_<key>.png`）。生成时把 `MK` 临时切到那一条上依次跑，所以每个条目的动图 / 逐帧时长 / 立绘能力都不退化。',
    '- 自动保存：任何改动都写进 `localStorage`（只存设置，图片太大不存），打开制作器自动读回来。',
    '- 实测（新场景 `mkProject`，真的点按钮）：控件全在（列表 / 加 / 复制 / 删 / 上移 / 下移 / 导出 JSON / 导入 JSON + 6 个工程字段）；点 3 次「＋再加一个」→ 列表 **1 → 4 行**；四条类型 = 小丑 / 消耗品 / 优惠券 / 盲注；导出的文件名是 `assets/1x/sheet_alpha.png`、`assets/1x/soul_alpha.png` 这种**带条目 slug** 的。',
    '- 场景当场抓到两个真 bug：① **两条条目的 key 都成了 `alpha_2`**（只在「新建」时查重，之后改类型/手改 key 就可能重名，同一个 mod 里会互相覆盖）→ 改成导出与生成 Lua 前统一归一化，导入工程后也归一化；② **`window.__BALATRO__.maker.state` 是过期引用**（`MK` 现在是 `let`，读工程时条目会被重建）→ 改成 getter。第二个正是靠「立绘的 `soul_atlas` 没出现」这条断言露出来的。',
    '- 这一轮自己的老毛病又犯两次：`node -e` 里塞带引号的 JS（PowerShell 把引号吃掉，脚本直接语法错、什么都没改），补丁脚本里在双引号字符串里写 ASCII 双引号 —— 都改成「写文件」而不是内联字符串。',
    '- 仍然**没验证**的：游戏里实际加载。这台机器跑不了 Balatro，工程的打包结构只做到「结构自检 + 能重新导入」这一层。',
    '',
  ].join('\n');
  s = s.replace(anchor, () => E + anchor);
  fs.writeFileSync(F, s);
  console.log('  ✓ DEVELOPMENT.md 第 50 轮'); n++;
}

console.log('共 ' + n + ' 处');
