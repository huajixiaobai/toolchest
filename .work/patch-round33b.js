/* 第三十三轮 B：盲注带贴图 + 选择列表再优化；机型空间优化（播放条/账目/局面网格） */
const fs = require('fs');
const path = require('path');
let n = 0;
const patch = (file, pairs) => {
  const F = path.join(__dirname, file);
  let s = fs.readFileSync(F, 'utf8');
  for (const [from, to, label] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) { console.error('❌ ' + file + ' :: ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
    s = s.replace(from, to);
    console.log('  ✓ ' + file + ' :: ' + label);
    n++;
  }
  fs.writeFileSync(F, s);
};
const L = (...a) => a.join('\n');

/* ---------- app.js ---------- */
const HELPERS = L(
  '/** 这个盲注会不会影响这一手的分（列表里给个标签，用户一眼知道该不该管它）',
  " *  返回 true=影响算分 / 'play'=只影响能不能这样出牌 / false=不影响 */",
  'function scBlindImpact (it) {',
  '  const rule = scBlindRule(it);',
  '  const spec = (it.raw && it.raw.debuff) || {};',
  '  if (rule && (rule.handLevel || rule.halfBase || rule.debuffAll)) return true;',
  '  if (spec.all || spec.suit || spec.is_face || spec.value || spec.nominal) return true;',
  '  if (spec.h_size_ge || spec.h_size_le || spec.hand) return \'play\';',
  '  return false;',
  '}',
  '/** 盲注贴图的小图（blind_chips 是 34×34 的格子、x 是帧号，取第 0 帧） */',
  'function scBlindArt (it, px) {',
  "  if (!it || !it.pos) return null;",
  "  const atlasName = (it.source && it.atlas && it.atlas !== 'blind_chips') ? it.atlas : 'blind_chips';",
  '  if (!D.atlases[atlasName]) return null;',
  '  let src = null;',
  "  try { src = compose({ standalone: { atlas: atlasName, pos: { x: 0, y: it.pos.y } } }, 2, 0) } catch (e) { return null }",
  '  if (!src || !src.width) return null;',
  '  const size = px || 34;',
  '  const cv = newCanvas(size, size);',
  '  const ctx = cv.getContext(\'2d\');',
  '  ctx.imageSmoothingEnabled = false;',
  '  const r = Math.min(size / src.width, size / src.height);',
  '  const w = src.width * r, h = src.height * r;',
  '  ctx.drawImage(src, (size - w) / 2, (size - h) / 2, w, h);',
  '  return cv;',
  '}',
  '/** 列表/大块里的贴图占位：滚到才画（29 个盲注一次性 compose 没必要） */',
  'function scPaintBlindArt (holder, item, px) {',
  '  if (!holder || holder.__painted) return;',
  '  holder.__painted = true;',
  '  const cv = scBlindArt(item, px);',
  "  if (!cv) { holder.classList.add('noart'); return }",
  '  holder.innerHTML = \'\';',
  '  holder.appendChild(cv);',
  '}',
  ''
);

patch('app.js', [
  ['/** 两句话是不是一个意思（够用的近似：汉字集合重合度 ≥ 0.7 就算） */', HELPERS + '/** 两句话是不是一个意思（够用的近似：汉字集合重合度 ≥ 0.7 就算） */', '贴图与影响标签辅助'],

  /* 当前盲注块：加贴图 + 布局规整 */
  [
    L("  return '<div class=\"scblindcur\"><div class=\"scblindrowmain\"><div class=\"scblindname\">' + esc(nm(it)) + (it.source ? ' <i class=\"mod\">MOD</i>' : '') + '</div>' +",
      "    '<div class=\"scblindfx\">' + scBlindEffectText(it) + (auto ? '<span class=\"scblinda\">这手里 ' + auto + ' 张牌被削弱</span>' : '') + '</div></div>' +",
      "    '<button class=\"btn scblindpick\" type=\"button\">换一个</button>' +",
      "    '<button class=\"btn scblindclear\" type=\"button\">取消</button></div>';"),
    L("  const impact = scBlindImpact(it);",
      "  const tag = impact === true ? '<i class=\"scblindtag score\">影响算分</i>'",
      "    : (impact === 'play' ? '<i class=\"scblindtag play\">影响出牌</i>' : '<i class=\"scblindtag none\">不影响算分</i>');",
      "  return '<div class=\"scblindcur\"><span class=\"scblindart\" data-art=\"' + it.id + '\"></span>' +",
      "    '<div class=\"scblindrowmain\"><div class=\"scblindname\">' + esc(nm(it)) + (it.source ? ' <i class=\"mod\">MOD</i>' : '') + tag + '</div>' +",
      "    '<div class=\"scblindfx\">' + scBlindEffectText(it) + (auto ? '<span class=\"scblinda\">这手里 ' + auto + ' 张牌被削弱</span>' : '') + '</div></div>' +",
      "    '<button class=\"btn scblindpick\" type=\"button\">换一个</button>' +",
      "    '<button class=\"btn scblindclear\" type=\"button\">取消</button></div>';"),
    '当前盲注块加贴图'
  ],
  /* 「不算盲注」那一块也给个占位，保持一致 */
  [
    L("    return '<div class=\"scblindcur none\"><div class=\"scblindrowmain\"><div class=\"scblindname\">不算盲注</div>' +",
      "      '<div class=\"scblindfx\">这一手按普通回合算。点「选择盲注」挑一个 BOSS，它的效果（谁被削弱、等级变化…）会自动算进去。</div></div>' +",
      "      '<button class=\"btn primary scblindpick\" type=\"button\">选择盲注</button></div>';"),
    L("    return '<div class=\"scblindcur none\"><span class=\"scblindart none\">—</span><div class=\"scblindrowmain\"><div class=\"scblindname\">不算盲注</div>' +",
      "      '<div class=\"scblindfx\">这一手按普通回合算。点「选择盲注」挑一个 BOSS，它的效果（谁被削弱、等级变化…）会自动算进去。</div></div>' +",
      "      '<button class=\"btn primary scblindpick\" type=\"button\">选择盲注</button></div>';"),
    '空态加占位'
  ],
  /* 列表行：贴图 + 名字 + 效果 + 标签 */
  [
    L("  const rowHtml = (it) => {",
      "    if (!it) return '<button class=\"scblindrow none\" data-blind=\"\"><b>不算盲注</b><span>这一手按普通回合算</span></button>';",
      "    const cur = SC.blind === it.id ? ' on' : '';",
      "    return '<button class=\"scblindrow' + cur + '\" data-blind=\"' + it.id + '\"><b>' + esc(nm(it)) +",
      "      (it.source ? ' <i class=\"mod\">MOD</i>' : '') + (cur ? ' <i class=\"cur\">当前</i>' : '') + '</b>' +",
      "      '<span>' + scBlindEffectText(it) + '</span></button>';",
      '  };'),
    L("  const rowHtml = (it) => {",
      "    if (!it) return '<button class=\"scblindrow none\" data-blind=\"\"><span class=\"scblindart none\">—</span>' +",
      "      '<span class=\"scblindtext\"><b>不算盲注</b><span class=\"fx\">这一手按普通回合算</span></span></button>';",
      "    const cur = SC.blind === it.id ? ' on' : '';",
      "    const impact = scBlindImpact(it);",
      "    const tag = impact === true ? '<i class=\"scblindtag score\">影响算分</i>'",
      "      : (impact === 'play' ? '<i class=\"scblindtag play\">影响出牌</i>' : '<i class=\"scblindtag none\">不影响算分</i>');",
      "    return '<button class=\"scblindrow' + cur + '\" data-blind=\"' + it.id + '\">' +",
      "      '<span class=\"scblindart\" data-art=\"' + it.id + '\"></span>' +",
      "      '<span class=\"scblindtext\"><b>' + esc(nm(it)) + (it.source ? ' <i class=\"mod\">MOD</i>' : '') +",
      "      (cur ? ' <i class=\"cur\">当前</i>' : '') + '</b>' +",
      "      '<span class=\"fx\">' + scBlindEffectText(it) + '</span></span>' + tag + '</button>';",
      '  };'),
    '列表行加贴图与标签'
  ],
  /* 画完列表后按需补图 */
  [
    L("    q('#scBlindList').innerHTML = rowHtml(null) + (hit.length ? hit.map(rowHtml).join('')",
      '      : \'<div class="hint" style="padding:14px">没有匹配的盲注</div>\');'),
    L("    q('#scBlindList').innerHTML = rowHtml(null) + (hit.length ? hit.map(rowHtml).join('')",
      '      : \'<div class="hint" style="padding:14px">没有匹配的盲注</div>\');',
      "    /* 贴图滚到才画（IntersectionObserver 有 300px 提前量） */",
      "    for (const el of q('#scBlindList').querySelectorAll('[data-art]')) {",
      "      const id = el.dataset.art;",
      "      const it2 = list.filter((x) => x.id === id)[0];",
      "      if (!it2) continue;",
      "      el.__paintBlind = () => scPaintBlindArt(el, it2, 34);",
      "      if (IO) { el._paint = el.__paintBlind; IO.observe(el) } else el.__paintBlind();",
      '    }'),
    '列表贴图懒画'
  ],
  /* 大块的贴图也在 render 之后补画 */
  [
    "  q('.scblindpick').onclick = () => scBlindPicker();",
    L("  { const art = q('.scblindbox .scblindart'); if (art && SC.blind) scPaintBlindArt(art, scBlindItem(), 52) }",
      "  q('.scblindpick').onclick = () => scBlindPicker();"),
    '大块贴图补画'
  ],
  /* 弹窗标题写成"名字 + 效果说明都在" */
  [
    "    '<span class=\"dim\">' + list.length + ' 个（含 mod）</span>' +",
    "    '<span class=\"dim\">' + list.length + ' 个（含 mod）· 每行都写了它在这一手里做什么</span>' +",
    '弹窗副标题'
  ],
]);

/* ---------- app.css：盲注行改横排 + 机型空间 ---------- */
patch('app.css', [
  [
    L('.scblindcur{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
      '.scblindcur.none .scblindname{color:var(--c-jgrey)}',
      '.scblindrowmain{flex:1 1 260px;min-width:0}'),
    L('.scblindcur{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
      '.scblindcur.none .scblindname{color:var(--c-jgrey)}',
      '.scblindrowmain{flex:1 1 260px;min-width:0}',
      '/* 盲注贴图：跟图鉴里用的同一张图集（blind_chips 34×34），大块 52、列表 34 */',
      '.scblindart{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:52px;height:52px;',
      '  background:#1b232a;border-radius:10px;box-shadow:inset 0 0 0 2px #00000033}',
      '.scblindart canvas{display:block;image-rendering:pixelated}',
      '.scblindart.none{color:#5b6b73;font-size:18px;background:none;box-shadow:none}',
      '.scblindrow .scblindart{width:34px;height:34px;border-radius:8px}',
      '.scblindtag{flex:0 0 auto;font-style:normal;font-size:10.5px;letter-spacing:.5px;border-radius:999px;padding:2px 8px;white-space:nowrap}',
      '.scblindtag.score{background:#5a2a26;color:#ffb4ad}',
      '.scblindtag.play{background:#3a3320;color:#f3d9a0}',
      '.scblindtag.none{background:#2a3339;color:#9fb0c0}'),
    '贴图与标签样式'
  ],
  [
    L('.scblindrow{display:flex;flex-direction:column;gap:3px;text-align:left;width:100%;min-height:56px;',
      '  background:#18232d;border:1px solid var(--line2);border-radius:8px;padding:9px 12px;cursor:pointer;transition:.12s}'),
    L('.scblindrow{display:flex;flex-direction:row;align-items:center;gap:10px;text-align:left;width:100%;min-height:56px;',
      '  background:#18232d;border:1px solid var(--line2);border-radius:8px;padding:8px 12px;cursor:pointer;transition:.12s}',
      '.scblindtext{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}'),
    '行改横排'
  ],
  [
    L('.scblindrow b{font-size:14px;color:#fff;font-weight:700}'),
    L('.scblindrow b{font-size:14px;color:#fff;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.scblindrow .fx{font-size:12px;line-height:1.5;color:#b9c6cf}'),
    '行内文字'
  ],
  ['.scblindrow span{font-size:12px;line-height:1.5;color:#b9c6cf}', '', '删掉旧的行内 span 规则'],
  /* 机型空间：账目框限高、局面网格更密、播放条在窄屏分两行 */
  [
    '.sclog{border-radius:var(--g-r);background:#2b3437;overflow:hidden;box-shadow:0 0 0 2px var(--c-uidark)}',
    L('.sclog{border-radius:var(--g-r);background:#2b3437;overflow:hidden;box-shadow:0 0 0 2px var(--c-uidark)}',
      '/* 账目在手机上别把页面撑得老长：限高 + 框内滚动 */',
      '.sclog[open] .sclogbody{max-height:min(42vh,420px);overflow:auto;overscroll-behavior:contain}'),
    '账目限高'
  ],
  [
    L('@media (prefers-reduced-motion: reduce){',
      '  .scblindrow,.scblindpick{transition:none}',
      '}'),
    L('@media (max-width:520px){',
      '  /* 窄屏播放条：算式独占一行，按钮与滑杆各自排开，别挤成一团 */',
      '  .scplay{gap:5px;padding:7px 9px}',
      '  .scplay .scplaymath{flex:1 1 100%;justify-content:center}',
      '  .scplay .btn{min-height:40px;padding:6px 10px}',
      '  .scplay input[type=range]{flex:1 1 100%;order:5}',
      '  .scplay .scnow{flex:1 1 100%}',
      '  /* 局面那一堆数字：手机上两列就够，别一个个占满整行 */',
      '  .scenv{grid-template-columns:repeat(auto-fill,minmax(132px,1fr))}',
      '  .scblindpick,.scblindclear{flex:1 1 46%}',
      '}',
      '@media (prefers-reduced-motion: reduce){',
      '  .scblindrow,.scblindpick{transition:none}',
      '}'),
    '窄屏播放条与局面网格'
  ],
]);

console.log('共 ' + n + ' 处改动');
