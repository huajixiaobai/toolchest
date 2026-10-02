/* 第三十轮：工具顺序、手牌行间距、缩略图补画、触屏长按等同右键、缩略图缓存、触屏尺寸。
   每个锚点断言唯一命中，找不到立刻退出。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const patch = (file, pairs) => {
  const F = path.join(__dirname, file);
  let s = fs.readFileSync(F, 'utf8');
  for (const [from, to, label] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) { console.error('❌ ' + file + ' :: ' + label + ' 命中 ' + hits + ' 次，放弃'); process.exit(1); }
    s = s.replace(from, to);
    console.log('  ✓ ' + file + ' :: ' + label);
    n++;
  }
  fs.writeFileSync(F, s);
};

patch('app.js', [
  /* ① 工具顺序：合成台第一、计算器第二 */
  [
    "for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['score', '得分计算器', '🧮'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤'], ['mods', '导入 Mod', '⊕']]) {",
    "for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['score', '得分计算器', '🧮'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤'], ['mods', '导入 Mod', '⊕']]) {",
    '工具顺序'
  ],
  /* ② 贴图晚到就补画（缩略图空白的老问题） */
  [
    "function img (file) {\n  if (!IMG[file]) {\n    const el = new Image();\n    el.src = ATLAS[file] || '';\n    IMG[file] = el;\n    IMG_READY[file] = new Promise((res) => {\n      if (el.complete && el.naturalWidth) res(el);\n      else { el.onload = () => res(el); el.onerror = () => res(null); }\n    });\n  }\n  return IMG[file];\n}",
    "let REPAINT_TIMER = null;\n" +
    "/** 某张贴图解完码之后，如果首屏早就画完了，就把当前这一屏重画一次。\n" +
    " *  没有这一步，那些「先画好、图还没解码」的缩略图会一直空着 —— 用户报的正是这个：\n" +
    " *  选完 exe 进合成台，「选择主体」里的缩略图不显示，切到别的工具再回来才有。 */\n" +
    "function scheduleRepaint () {\n" +
    "  if (typeof window === 'undefined' || !window.__BALATRO_READY__ || REPAINT_TIMER) return;\n" +
    "  const ae = document.activeElement;\n" +
    "  if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;   /* 正在输入框里就别抢焦点 */\n" +
    "  REPAINT_TIMER = setTimeout(() => { REPAINT_TIMER = null; if (!SCP.open) { try { render() } catch (e) { /* ignore */ } } }, 150);\n" +
    "}\n" +
    "function img (file) {\n" +
    "  if (!IMG[file]) {\n" +
    "    const el = new Image();\n" +
    "    el.src = ATLAS[file] || '';\n" +
    "    IMG[file] = el;\n" +
    "    IMG_READY[file] = new Promise((res) => {\n" +
    "      const done = (v) => { res(v); scheduleRepaint(); };\n" +
    "      if (el.complete && el.naturalWidth) done(el);\n" +
    "      else { el.onload = () => done(el); el.onerror = () => done(null); }\n" +
    "    });\n" +
    "  }\n" +
    "  return IMG[file];\n" +
    "}",
    '贴图晚到补画'
  ],
  [
    "    if (S.tab === 'codex' || S.tab === 'hands' || S.tab === 'atlas') render();\n    else if (S.tab === 'forge' && forgeRedraw) forgeRedraw();",
    "    render();                        /* 贴图解码完再整页重画一次：补上首屏那些空白缩略图 */\n    if (S.tab === 'forge' && forgeRedraw) forgeRedraw();",
    'ALL_READY 后整页重画'
  ],
  /* ③ 触屏：长按 = 右键 */
  [
    "/** 一排小按钮：◀ ▶ 挪位置、⧉ 复制一张、✕ 移除（小丑牌与扑克牌共用） */",
    "/** 触屏上没有右键：长按 480ms 等同于右键（PC 的右键 = 改这张牌 / 改这张小丑牌）。\n" +
    " *  长按之后紧跟的那次 click 会被吞掉，免得顺带把这张牌又切换一次。 */\n" +
    "function bindContext (el, handler) {\n" +
    "  el.oncontextmenu = (e) => { e.preventDefault(); handler(e) };\n" +
    "  let timer = null;\n" +
    "  const cancel = () => { if (timer) { clearTimeout(timer); timer = null } };\n" +
    "  el.addEventListener('touchstart', (e) => {\n" +
    "    if (e.touches.length !== 1) return cancel();\n" +
    "    const t = e.touches[0];\n" +
    "    cancel();\n" +
    "    timer = setTimeout(() => {\n" +
    "      timer = null;\n" +
    "      el.__lpAt = Date.now();\n" +
    "      if (navigator.vibrate) { try { navigator.vibrate(12) } catch (err) { /* ignore */ } }\n" +
    "      handler({ clientX: t.clientX, clientY: t.clientY });\n" +
    "    }, 480);\n" +
    "  }, { passive: true });\n" +
    "  el.addEventListener('touchmove', cancel, { passive: true });\n" +
    "  el.addEventListener('touchcancel', cancel, { passive: true });\n" +
    "  el.addEventListener('touchend', (e) => { cancel(); if (el.__lpAt && Date.now() - el.__lpAt < 900) { el.__lpAt = 0; if (e.cancelable) e.preventDefault() } });\n" +
    "}\n" +
    "/** 长按之后的 900ms 里，点击不算数（否则长按开面板的同时又切了一次牌） */\n" +
    "function lpSwallow (el) { return el.__lpAt && Date.now() - el.__lpAt < 900 }\n\n" +
    "/** 一排小按钮：◀ ▶ 挪位置、⧉ 复制一张、✕ 移除（小丑牌与扑克牌共用） */",
    '长按 = 右键'
  ],
  [
    "    t.onclick = () => { scStopPlay(); scToggleCard(c); render() };\n    t.oncontextmenu = (e) => { e.preventDefault(); scOpenCardEditor(c); render() };\n    railP.appendChild(t);",
    "    t.onclick = () => { if (lpSwallow(t)) return; scStopPlay(); scToggleCard(c); render() };\n    bindContext(t, () => { scOpenCardEditor(c); render() });\n    railP.appendChild(t);",
    '打出的牌：长按改牌'
  ],
  [
    "    t.onclick = () => { scStopPlay(); scToggleCard(c); render() };\n    t.oncontextmenu = (e) => { e.preventDefault(); scOpenCardEditor(c); render() };\n    railH.appendChild(t);",
    "    t.onclick = () => { if (lpSwallow(t)) return; scStopPlay(); scToggleCard(c); render() };\n    bindContext(t, () => { scOpenCardEditor(c); render() });\n    railH.appendChild(t);",
    '手牌：长按改牌'
  ],
  ["cardLabel(c) + '　·　点一下改回留手，右键改牌'", "cardLabel(c) + '　·　点一下改回留手，右键 / 长按改牌'", '提示语（打出的牌）'],
  ["（点一下切换，右键改牌，可以拖动）", "（点一下切换，右键 / 长按改牌，可以拖动）", '提示语（手牌）'],
  ["<em>点一下 = 打出去，再点一下 = 留在手里（右键改牌，可以拖动换位置）</em>", "<em>点一下 = 打出去，再点一下 = 留在手里（右键 / 长按改牌，可以拖动换位置）</em>", '提示语（手牌表头）'],
  /* ④ 合成台缩略图缓存：搜索框每敲一个字都重排一次，不能每次都重画 150 张 */
  [
    "  /* ---- option groups ---- */",
    "  /* ---- 缩略图缓存 ----------------\n" +
    "   * 「选择主体」最多有 150+ 项，以前每次重排（切牌型 / 搜索框每敲一个字）都要把每一项\n" +
    "   * 重新 compose 一遍（每张 1-3ms，一敲就是几百毫秒）。这里按条目 id 缓存那张 26×35 的小图，\n" +
    "   * 重排时只做一次 drawImage 复制。相位固定 0，保证缓存可复用。 */\n" +
    "  const MINI_CACHE = new Map();\n" +
    "  const miniThumb = (it) => {\n" +
    "    let src = MINI_CACHE.get(it.id);\n" +
    "    if (!src) {\n" +
    "      const spec = specForItem(it);\n" +
    "      if (!spec) return null;\n" +
    "      const mini = compose(spec, 2, 0);\n" +
    "      src = newCanvas(26, 35);\n" +
    "      const c2 = src.getContext('2d');\n" +
    "      c2.imageSmoothingEnabled = false;\n" +
    "      const r = Math.min(src.width / mini.width, src.height / mini.height);\n" +
    "      c2.drawImage(mini, (src.width - mini.width * r) / 2, (src.height - mini.height * r) / 2, mini.width * r, mini.height * r);\n" +
    "      if (MINI_CACHE.size > 1500) MINI_CACHE.clear();\n" +
    "      MINI_CACHE.set(it.id, src);\n" +
    "    }\n" +
    "    const out = newCanvas(26, 35);\n" +
    "    out.getContext('2d').drawImage(src, 0, 0);\n" +
    "    return out;\n" +
    "  };\n\n" +
    "  /* ---- option groups ---- */",
    '缩略图缓存'
  ],
  [
    "        const spec = specForItem(it);\n        if (spec) {\n          const mini = compose(spec, 2, phaseNow());\n          const sm = newCanvas(26, 35);\n          const c2 = sm.getContext('2d');\n          c2.imageSmoothingEnabled = false;\n          const r = Math.min(sm.width / mini.width, sm.height / mini.height);\n          const w = mini.width * r, hh = mini.height * r;\n          c2.drawImage(mini, (sm.width - w) / 2, (sm.height - hh) / 2, w, hh);\n          b.appendChild(sm);\n        }",
    "        const sm = miniThumb(it);\n        if (sm) b.appendChild(sm);",
    '缩略图用缓存'
  ],
]);

patch('app.css', [
  [
    ".scrail{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;min-height:70px}",
    "/* padding-top 是给「卡图上方的按钮条」留的位置：条挂在牌上方 3~25px，\n" +
    "   不留出来的话它会盖住上一排的表头按钮（用户报的：手牌那排的按钮压住了「＋ 加牌」）。 */\n" +
    ".scrail{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;min-height:70px;padding-top:30px}",
    '行内给按钮条留位'
  ],
  [
    ".sctile .scmv{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:5px;display:flex;gap:4px;z-index:260;",
    ".sctile .scmv{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:3px;display:flex;gap:4px;z-index:260;",
    '按钮条贴近卡图'
  ],
  [".sctile::after{content:'';position:absolute;left:0;right:0;bottom:100%;height:30px}", ".sctile::after{content:'';position:absolute;left:0;right:0;bottom:100%;height:28px}", '过桥高度'],
  [
    ".sctile .scmv button:focus-visible{outline:2px solid var(--c-money);outline-offset:1px}",
    ".sctile .scmv button:focus-visible{outline:2px solid var(--c-money);outline-offset:1px}\n" +
    "/* 触屏 / 平板：按钮按手指尺寸放大，行距也跟着加；悬停态在触屏上由「点一下」触发 */\n" +
    "@media (hover:none){\n" +
    "  .sctile .scmv button{min-width:32px;min-height:30px;font-size:14px}\n" +
    "  .sctile::after{height:36px}\n" +
    "  .scrail{padding-top:40px}\n" +
    "}",
    '触屏尺寸与行距'
  ],
]);

console.log('共 ' + n + ' 处改动');
