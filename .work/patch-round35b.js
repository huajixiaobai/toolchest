/* 第三十五轮 B：Mod 制作器 —— 界面美化 + 新控件接线
   ① 顶部标题条（类型胶囊 + 一行实时摘要）
   ② 预设库一排胶囊：点一下把整套效果行填好
   ③ 效果行改成"读得懂的句子"并按效果分色
   ④ 悬浮立绘（soul）选择：开关 + 取图模式
   ⑤ 消耗品牌组下拉；预览区做成"卡位 + 信息卡" */
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

/* ① 顶部标题条 */
rep(
  L("  const wrap = document.createElement('div'); wrap.className = 'maker';",
    "  const left = document.createElement('div'); left.className = 'mkleft';",
    "  const right = document.createElement('div'); right.className = 'mkright';",
    "  wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);"),
  L("  /* 顶部：类型胶囊 + 一行摘要（像原版的标题条） */",
    "  const head = document.createElement('div'); head.className = 'mkhead';",
    "  head.innerHTML = '<div class=\"mkhtitle\"><b>Mod 制作器</b><span>不用写代码，选一选就能出一个能用的 mod</span></div>' +",
    "    '<div class=\"mkhchips\">' + MK_TYPES.map((t) => '<button class=\"mkhchip' + (t[0] === MK.type ? ' on' : '') + '\" data-mktype=\"' + t[0] + '\">' + t[1] + '</button>').join('') + '</div>' +",
    "    '<div class=\"mkhsum\" id=\"mkSum\"></div>';",
    "  root.appendChild(head);",
    "  head.onclick = (e) => { const b = e.target.closest('[data-mktype]'); if (b) mkSet({ type: b.dataset.mktype }) };",
    "  const wrap = document.createElement('div'); wrap.className = 'maker';",
    "  const left = document.createElement('div'); left.className = 'mkleft';",
    "  const right = document.createElement('div'); right.className = 'mkright';",
    "  wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);"),
  '顶部标题条');

/* ② 预览区做成卡位 + 信息卡 */
rep(
  L("  const pv = document.createElement('div'); pv.className = 'mkpv opt'; pv.dataset.gkey = 'pv';",
    "  const pvBox = document.createElement('div'); pvBox.className = 'mkpvbox';",
    "  const cv = mkPreviewCanvas();",
    "  if (cv) { cv.style.width = '142px'; cv.style.height = '190px'; pvBox.appendChild(cv) }",
    "  pv.appendChild(pvBox);",
    "  const pvLine = document.createElement('div'); pvLine.className = 'hint mkpvline';",
    "  pvLine.innerHTML = '<b>' + esc(MK.nameZh || MK.key) + '</b> · ' + esc(mkType()[1]) +",
    "    '<br>' + esc(mkAutoText('zh') || '（还没有效果）');",
    "  pv.appendChild(pvLine);",
    "  left.appendChild(pv);"),
  L("  const pv = document.createElement('div'); pv.className = 'mkpv';",
    "  const pvBox = document.createElement('div'); pvBox.className = 'mkpvbox';",
    "  const cv = mkPreviewCanvas();",
    "  if (cv) { cv.style.width = '142px'; cv.style.height = '190px'; pvBox.appendChild(cv) }",
    "  pv.appendChild(pvBox);",
    "  const pvLine = document.createElement('div'); pvLine.className = 'mkpvline';",
    "  pvLine.innerHTML = '<div class=\"mkpvname\"><b>' + esc(MK.nameZh || MK.key) + '</b>' + mkTag() + '</div>' +",
    "    '<div class=\"mkpvfx\">' + esc(mkAutoText('zh') || '（还没有效果 —— 在右边第 ③ 段选一个预设）') + '</div>';",
    "  pv.appendChild(pvLine);",
    "  left.appendChild(pv);"),
  '预览区改成卡位');

/* ③ 预设库 + 句子式效果行 */
rep(
  L("    const list = document.createElement('div'); list.className = 'mkfxlist';",
    "    MK.effects.forEach((e, i) => {",
    "      const row = document.createElement('div'); row.className = 'mkfx';"),
  L("    const pres = document.createElement('div'); pres.className = 'mkpresets';",
    "    pres.innerHTML = '<div class=\"mklabel\">常用预设（点一下就是一整套效果）</div>' +",
    "      MK_PRESETS.map((p, i) => '<button class=\"mkpreset\" data-preset=\"' + i + '\">' + p[0] + '</button>').join('');",
    "    b.appendChild(pres);",
    "    const list = document.createElement('div'); list.className = 'mkfxlist';",
    "    MK.effects.forEach((e, i) => {",
    "      const row = document.createElement('div'); row.className = 'mkfx mkfx-' + e.eff;",
    "      row.innerHTML = '<i class=\"mknum\">' + (i + 1) + '</i>';"),
  '预设库');

/* ④ 效果行内部：加"读得懂"的连接词标签 */
rep(
  "      row.innerHTML = when + cond + condVal + eff + val +",
  L("      row.innerHTML = row.innerHTML + when + cond + condVal + eff + val +"),
  '效果行拼接');
rep(
  L("      const eff = '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"eff\">' +",
    "        MK_EFF.map((x) => '<option value=\"' + x[0] + '\"' + (e.eff === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>';"),
  L("      const eff = '<span class=\"mkword\">则给</span><select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"eff\">' +",
    "        MK_EFF.map((x) => '<option value=\"' + x[0] + '\"' + (e.eff === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>';"),
  '效果选择加连接词');
rep(
  "      const when = '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"when\">' +",
  "      const when = '<span class=\"mkword\">当</span><select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"when\">' +",
  '触发选择加连接词');
rep(
  "      const cond = '<select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"cond\">' +",
  "      const cond = '<span class=\"mkword\">且</span><select class=\"tbtn\" data-fx=\"' + i + '\" data-f=\"cond\">' +",
  '条件选择加连接词');

/* ⑤ 预设按钮事件 + 悬浮立绘/牌组控件 */
rep(
  "  qa('[data-del]').forEach((el) => el.addEventListener('click', () => {",
  L("  qa('[data-preset]').forEach((el) => el.addEventListener('click', () => {",
    "    const p = MK_PRESETS[Number(el.dataset.preset)];",
    "    mkSet({ effects: p[1].map((x) => Object.assign({}, x)), textZh: '', textEn: '' });",
    "    status('已套用预设「' + p[0] + '」—— 数值和条件都能再改。');",
    '  }));',
    "  qa('[data-del]').forEach((el) => el.addEventListener('click', () => {"),
  '预设按钮事件');

/* ⑥ 悬浮立绘控件（放在「长什么样」那一段里） */
rep(
  "      '<div class=\"mkartgrid\" id=\"mkArtGrid\"></div>';",
  L("      '<div class=\"mkartgrid\" id=\"mkArtGrid\"></div>';",
    "    if (MK.type === 'Joker') {",
    "      b.appendChild(Object.assign(document.createElement('div'), { className: 'mkrow mksoul' }));",
    "      b.lastChild.innerHTML = '<label class=\"mkck\"><input type=\"checkbox\" id=\"mkSoulOn\"' + (MK.soul.on ? ' checked' : '') + '>再给一张「悬浮立绘」（传奇牌那种飘在半空的画）</label>' +",
    "        '<div class=\"hint\">开了之后会多导一张 soul.png，并写上 soul_pos —— 现在用的是主体那张图，等导出来你可以替换 assets/1x/soul.png。</div>';",
    "    }"),
  '悬浮立绘控件');

/* ⑦ 消耗品牌组下拉 */
rep(
  "    b.innerHTML = '<div class=\"mkrow\"><label>使用效果<select class=\"tbtn\" id=\"mkUse\">' +",
  L("    b.innerHTML = '<div class=\"mkrow\"><label>属于哪一类<select class=\"tbtn\" id=\"mkSet\">' +",
    "      MK_SETS.map((x) => '<option value=\"' + x[0] + '\"' + (MK.set === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') +",
    "      '</select></label></div>' +",
    "      '<div class=\"mkrow\"><label>使用效果<select class=\"tbtn\" id=\"mkUse\">' +"),
  '消耗品牌组下拉');

/* ⑧ 事件接线：悬浮立绘 / 牌组 */
rep(
  "  { const u = q('#mkUse'); if (u) u.onchange = () => mkSet({ useKind: u.value });",
  L("  { const so = q('#mkSoulOn'); if (so) so.onchange = () => mkSet({ soul: Object.assign({}, MK.soul, { on: so.checked }) }) }",
    "  { const st = q('#mkSet'); if (st) st.onchange = () => mkSet({ set: st.value }) }",
    "  { const u = q('#mkUse'); if (u) u.onchange = () => mkSet({ useKind: u.value });"),
  '新控件事件');

/* ⑨ 摘要与标签的小工具（顶部条与预览卡共用） */
rep(
  "function mkType () { return MK_TYPES.filter((t) => t[0] === MK.type)[0] || MK_TYPES[0] }",
  L("function mkType () { return MK_TYPES.filter((t) => t[0] === MK.type)[0] || MK_TYPES[0] }",
    "/** 预览卡上的小标签：稀有度 + 价格（只有小丑牌/消耗品有） */",
    "function mkTag () {",
    "  const bits = [];",
    "  if (MK.type === 'Joker') bits.push(...MK_RARITY.filter((r) => r[0] === MK.rarity).map((r) => r[1]));",
    "  bits.push('$' + MK.cost);",
    "  if (MK.soul.on && MK.type === 'Joker') bits.push('有立绘');",
    "  return bits.map((b) => '<i class=\"mktag\">' + b + '</i>').join('');",
    "}",
    "/** 顶部那一行实时摘要 */",
    "function mkSummaryHtml () {",
    "  return '<b>' + esc(mkType()[1]) + '</b> · ' + esc(MK.nameZh || MK.key) +",
    "    ' <code>' + esc(MK.prefix) + '_' + esc(MK.key) + '</code> · ' + esc(mkAutoText('zh') || '还没有效果') +",
    "    ' · 贴图 ' + (MK.art.upload ? '上传的图' : (MK.art.atlas + ' x' + MK.art.pos.x + ' y' + MK.art.pos.y));",
    "}"),
  '摘要与标签');

/* ⑩ render 时刷新顶部摘要（预览那行已在 mkRefreshLuaAndPreview 里） */
rep(
  "  mkRedraw = () => render();",
  L("  { const sum = document.querySelector('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml() }",
    "  mkRedraw = () => render();"),
  '顶部摘要刷新');
rep(
  "      mkRefreshLuaAndPreview();",
  L("      mkRefreshLuaAndPreview();",
    "      const sum = document.querySelector('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml();"),
  '输入时也刷新摘要');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动（app.js）');
