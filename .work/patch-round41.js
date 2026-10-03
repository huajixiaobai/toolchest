/* 第四十轮：预览信息卡要跟着类型走（用户："我选的每一个都是这个文本，那我让你预设的意义何在"）
   - 新增 mkTypeSummaryLines()：把「类型专属设置」当前值拼成人类读得懂的行
   - mkTag() 按类型给胶囊：小丑牌给稀有度/价格/立绘；其它类型给类型专属摘要
   - mkAutoText() / mkDescHtml() 对非小丑牌类型直接显示这些摘要（不再永远是"每张红桃牌 +50 筹码"） */
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

/* ① 类型专属摘要 */
rep(
  "/** 预览卡上的小标签：稀有度 + 价格（只有小丑牌/消耗品有） */",
  L('/** 类型专属设置的当前值 → 一行行读得懂的说明（盲注：底注 1–10 / 需求 ×2 / 削弱梅花…） */',
    'function mkTypeSummaryLines () {',
    '  const defs = MK_TYPE_FIELDS[MK.type];',
    '  if (!defs) return [];',
    '  const out = [];',
    '  defs.forEach((f) => {',
    '    const key = f[0], label = f[1], kind = f[2], opt = f[3];',
    '    const v = MK.t[key] !== undefined ? MK.t[key] : opt;',
    "    if (kind === 'bool') { if (v) out.push(label); return }",
    "    if (kind === 'sel') { const o = (opt || []).filter((x) => x[0] === v)[0]; out.push(label + '：' + (o ? o[1] : v)); return }",
    "    if (kind === 'num') { out.push(label + ' ' + v); return }",
    '  });',
    '  return out;',
    '}',
    '/** 盲注那种"底注 1–10"要连起来读更顺 */',
    'function mkTypeSummaryText () {',
    '  const lines = mkTypeSummaryLines();',
    "  if (MK.type === 'Blind') {",
    '    const t2 = MK.t;',
    "    const min = t2.boss_min !== undefined ? t2.boss_min : 1, max = t2.boss_max !== undefined ? t2.boss_max : 10;",
    "    const rest = lines.filter((x) => x.indexOf('起始底注') < 0 && x.indexOf('结束底注') < 0);",
    "    return ['在底注 ' + min + '–' + max + ' 出现'].concat(rest);",
    '  }',
    '  return lines;',
    '}',
    '/** 预览卡上的小标签：小丑牌是稀有度/价格/立绘，其它类型给类型专属摘要 */',
    'function mkTag () {',
    '  const bits = [];',
    "  if (MK.type === 'Joker') {",
    "    bits.push(...MK_RARITY.filter((r) => r[0] === MK.rarity).map((r) => r[1]));",
    "    bits.push('$' + MK.cost);",
    "    if (MK.soul.on) bits.push('有立绘');",
    "  } else if (MK.type === 'Consumable' || MK.type === 'Voucher' || MK.type === 'Booster') {",
    "    if (MK.type === 'Consumable') bits.push((MK_SETS.filter((x) => x[0] === MK.set)[0] || ['', '消耗品'])[1]);",
    "    bits.push('$' + (MK.type === 'Booster' ? (MK.t.cost || 4) : MK.cost));",
    "  } else bits.push(mkType()[1]);",
    "  return bits.map((b) => '<i class=\"mktag\">' + esc(String(b)) + '</i>').join('');",
    '}'),
  '类型专属摘要 + 标签');

/* ② 描述/摘要按类型走 */
rep(
  "/** 顶部那一行实时摘要 */",
  L('/** 非小丑牌类型：描述就是类型专属设置那几行 */',
    'function mkTypeDescHtml () {',
    '  const lines = mkTypeSummaryText();',
    "  if (!lines.length) return '<span class=\"mkdim\">（这个类型还没有专属设置）</span>';",
    "  return lines.map((x) => '· ' + esc(x)).join('<br>');",
    '}',
    '/** 顶部那一行实时摘要 */'),
  '非小丑描述');
rep(
  "function mkAutoText (lang) {\n  const parts = MK.effects.map((e) => {",
  L("function mkAutoText (lang) {",
    "  if (MK.type !== 'Joker') {",
    "    const lines = mkTypeSummaryText();",
    "    return lines.join(lang === 'zh' ? '；' : '; ');",
    "  }",
    '  const parts = MK.effects.map((e) => {'),
  'mkAutoText 按类型');
rep(
  "function mkDescHtml () {\n  if (!MK.effects.length) return \"<span class=\\\"mkdim\\\">（还没有效果）</span>\";",
  L('function mkDescHtml () {',
    "  if (MK.type !== 'Joker') return mkTypeDescHtml();",
    '  if (!MK.effects.length) return "<span class=\\"mkdim\\">（还没有效果）</span>";'),
  'mkDescHtml 按类型');

/* ③ 改类型专属字段时预览也要跟着变（现在只刷新 Lua 与描述） */
rep(
  "      MK.t[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) || 0 : el.value);\n      refresh();",
  L("      MK.t[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) || 0 : el.value);",
    '      /* 名称行的胶囊与描述都跟类型设置有关，所以整块刷新一次（不是只刷 Lua） */',
    '      redraw();'),
  '类型字段改动刷新预览');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');

/* ④ 场景断言：换类型时预览信息必须跟着变 */
const CDP = path.join(__dirname, 'verify', 'cdp.js');
let cdp = fs.readFileSync(CDP, 'utf8').replace(/\r\n/g, '\n');
const from = "    r.soulControls={ on:!!q('#mkSoulOn'), atlas:!!q('#mkSoulAtlas'), up:!!q('#mkSoulUp'), pick:!!q('#mkSoulPick') },";
const to = L(
  "    r.soulControls={ on:!!q('#mkSoulOn'), atlas:!!q('#mkSoulAtlas'), up:!!q('#mkSoulUp'), pick:!!q('#mkSoulPick') },",
  "    /* 预览信息卡必须随类型变（换类型不能永远是同一段文本） */",
  "    r.perType={};",
  "    for (const ty of ['Joker','Blind','Booster','Back','Tag','Enhancement','Consumable']) {",
  "      B.maker.state.type=ty;",
  "      if (ty==='Blind' && !B.maker.state.t.boss_mult) B.maker.state.t={ boss_min:1, boss_max:10, blind_mult:2, blind_dollars:5, debuff_suit:'Spades', debuff_face:false };",
  "      if (ty==='Booster' && !B.maker.state.t.kind) B.maker.state.t={ kind:'Arcana', choose:1, extra:3, cost:4 };",
  "      if (ty==='Back' && !B.maker.state.t.hand_size) B.maker.state.t={ hand_size:8, hands:4, discards:3, dollars:4, joker_slot:5, consumable_slot:2 };",
  "      if (ty==='Tag' && !B.maker.state.t.tag_kind) B.maker.state.t={ tag_kind:'dollars', tag_val:5 };",
  "      if (ty==='Enhancement' ) B.maker.state.t={ chips:30, mult:4 };",
  "      if (ty==='Consumable' && !B.maker.state.set) B.maker.state.set='Tarot';",
  "      B.render(); await __V.wait(500);",
  "      r.perType[ty]={ tag:(q('.mkpvname')||{}).textContent||'', fx:((q('.mkpvfx')||{}).textContent||'').slice(0,70), desc:((q('#mkDesc')||{}).textContent||'').slice(0,60) };",
  "    }",
  "    B.maker.state.type='Joker'; B.render(); await __V.wait(400);",
  "    r.perTypeDistinct=Object.keys(r.perType).map((k)=>r.perType[k].fx).filter((v,i,a)=>a.indexOf(v)===i).length,");
if (cdp.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
fs.writeFileSync(CDP, cdp.replace(from, () => to));
console.log('  ✓ 场景加"按类型变化"断言');
