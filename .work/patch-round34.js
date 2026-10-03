/* 第三十四轮（修正版）：先把 maker 代码块自己改好，再整块插进 app.js，最后接侧栏/分发/调试接口 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let app = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');   /* git checkout 会把它写回 CRLF，先归一化 */
let block = fs.readFileSync(path.join(__dirname, 'maker-block.js'), 'utf8').replace(/\r\n/g, '\n');

const rep = (text, from, to, label) => {
  const hits = text.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  console.log('  ✓ ' + label); n++;
  /* 关键：用函数式替换。直接传字符串的话，结尾里出现的 $' / $& 会被当成替换模式，
     上一版就是这样把 '+$' + val 撕成了半行（生成的代码里含 $ 的地方都会中招）。 */
  return text.replace(from, () => to);
};

/* ① 块内：文本框输入只刷新 Lua/预览，别整页重画（否则每敲一个字丢焦点） */
block = rep(block,
  L("  qa('[data-mk]').forEach((el) => {",
    '    const k = el.dataset.mk;',
    "    const ev = el.tagName === 'SELECT' ? 'change' : 'input';",
    '    el.addEventListener(ev, () => {',
    "      MK[k] = el.type === 'number' ? Number(el.value) : el.value;",
    "      if (k === 'textZh') MK.textZh = el.value;",
    '      mkRedraw();',
    '    });',
    '  });'),
  L("  qa('[data-mk]').forEach((el) => {",
    '    const k = el.dataset.mk;',
    "    const ev = el.tagName === 'SELECT' ? 'change' : 'input';",
    '    el.addEventListener(ev, () => {',
    "      MK[k] = el.type === 'number' ? Number(el.value) : el.value;",
    "      if (el.tagName === 'SELECT' || el.type === 'number') { mkRedraw(); return }",
    '      /* 文本框：只刷新 Lua 与预览那一行 */',
    '      mkRefreshLuaAndPreview();',
    '    });',
    '  });'),
  '文本框不整页重画');

/* ② 块内：加「只刷新 Lua + 预览」的小函数 */
block = rep(block,
  'function mkSet (patch) {',
  L('/** 只刷新 Lua 文本框与预览那行（文本框里打字时用） */',
    'function mkRefreshLuaAndPreview () {',
    "  const lua = document.querySelector('#mkLua');",
    '  if (lua && !MK.luaDirty) lua.value = mkLua();',
    "  const line = document.querySelector('.mkpvline');",
    "  if (line) line.innerHTML = '<b>' + esc(MK.nameZh || MK.key) + '</b> · ' + esc(mkType()[1]) +",
    "    '<br>' + esc(mkAutoText('zh') || '（还没有效果）');",
    '}',
    'function mkSet (patch) {'),
  '刷新函数');

/* ③ 整块插到 IIFE 收尾之前 */
app = rep(app,
  "if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();\n})();",
  block + "\nif (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();\n})();",
  '插入 maker 代码块');

/* ④ 侧栏工具 + 视图分发（带容错）+ 调试接口 */
app = rep(app,
  "for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['score', '得分计算器', '🧮'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤'], ['mods', '导入 Mod', '⊕']]) {",
  "for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['score', '得分计算器', '🧮'], ['maker', 'Mod 制作器', '🛠'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤'], ['mods', '导入 Mod', '⊕']]) {",
  '侧栏加工具');
app = rep(app,
  "  else if (S.tab === 'score') viewScore(content);",
  "  else if (S.tab === 'score') viewScore(content);\n" +
  "  else if (S.tab === 'maker') { try { viewMaker(content) } catch (e) { content.innerHTML = '<div class=\"hint\">Mod 制作器出错：' + esc(e.message) + '</div>' } }",
  '视图分发 + 容错');
app = rep(app,
  '    modImport: window.__MODIMPORT__, categoryLabel,',
  L('    modImport: window.__MODIMPORT__, categoryLabel,',
    '    /* Mod 制作器：状态 / 生成的 Lua / manifest / 要打包的文件（脚本与控制台都能用） */',
    '    maker: { state: MK, lua: () => mkLua(), manifest: () => mkManifest(), files: () => mkBuildFiles(), types: MK_TYPES, when: MK_WHEN, eff: MK_EFF },'),
  '暴露 maker');

fs.writeFileSync(F, app);
console.log('共 ' + n + ' 处改动');
