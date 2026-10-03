/* 第四十一轮：把"换个类型还是同一段文本"彻底修干净
   ① 每种类型有各自的默认名字/key（换类型时若名字还是上一个类型的默认值就跟着换）
   ② 消耗品 / 蜡封 也有摘要行
   ③ 预览那行的占位文案按类型说人话
   ④ mkTag 整段重写（小丑牌给稀有度/价格/立绘；消耗品给牌组/价格；补充包给包型/价格；其它给类型名） */
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

/* ① 每个类型的默认名字/默认 key */
rep(
  "/** 类型专属设置的当前值 → 一行行读得懂的说明（盲注：底注 1–10 / 需求 ×2 / 削弱梅花…） */",
  L('/** 每种类型的默认名字与默认 key：换类型时若还没自己改过，就跟着换（不然永远是"阿尔法"） */',
    'const MK_DEFAULT_NAME = {',
    "  Joker: ['阿尔法', 'alpha'], Consumable: ['测试塔罗', 'testcard'], Voucher: ['测试优惠券', 'testvoucher'],",
    "  Booster: ['测试补充包', 'testpack'], Back: ['测试牌组', 'testdeck'], Enhanced: ['测试强化', 'testenh'],",
    "  Edition: ['测试版本', 'testedition'], Seal: ['测试蜡封', 'testseal'], Tag: ['测试标签', 'testtag'], Blind: ['测试盲注', 'testblind'],",
    '};',
    '/** 类型专属设置的当前值 → 一行行读得懂的说明（盲注：底注 1–10 / 需求 ×2 / 削弱梅花…） */'),
  '类型默认名表');
rep(
  "function mkSet (patch) {",
  L('/** 换类型时：名字 / key 若还是"上一个类型的默认值"，就一起换成新类型的默认值 */',
    'function mkApplyTypeDefaults (prevType) {',
    '  const prev = MK_DEFAULT_NAME[prevType] || null;',
    '  const next = MK_DEFAULT_NAME[MK.type] || null;',
    '  if (!next) return;',
    "  if (!MK.nameZh || (prev && MK.nameZh === prev[0])) MK.nameZh = next[0];",
    "  if (!MK.key || (prev && MK.key === prev[1])) MK.key = next[1];",
    "  if (!MK.nameEn || (prev && MK.nameEn === prev[0])) MK.nameEn = next[0];",
    '}',
    'function mkSet (patch) {'),
  '换类型改默认名');
rep(
  "function mkSet (patch) { Object.assign(MK, patch);",
  "function mkSet (patch) {\n  const prevType = MK.type;\n  Object.assign(MK, patch);\n  if (patch && patch.type && patch.type !== prevType) mkApplyTypeDefaults(prevType);",
  'mkSet 里应用默认');

/* ② 消耗品 / 蜡封 也有摘要 */
rep(
  "  const lines = mkTypeSummaryLines();\n  if (MK.type === 'Blind') {",
  L('  const lines = mkTypeSummaryLines();',
    "  if (MK.type === 'Consumable') {",
    "    const set = (MK_SETS.filter((x) => x[0] === MK.set)[0] || ['', '消耗品'])[1];",
    "    const use = (MK_USE.filter((x) => x[0] === MK.useKind)[0] || ['', ''])[1];",
    "    return ['属于：' + set, '使用时：' + use + (MK.useKind === 'none' ? '' : '（' + MK.useVal + '）'), '价格 $' + MK.cost];",
    '  }',
    "  if (MK.type === 'Seal') return ['蜡封本身没有数值字段：它的效果由「拿它做了什么」决定（原版逻辑）', '外观取自贴图'];",
    "  if (MK.type === 'Blind') {"),
  '消耗品/蜡封摘要');

/* ③ mkTag 整段重写 */
rep(
  L('/** 预览卡上的小标签：小丑牌是稀有度/价格/立绘，其它类型给类型专属摘要 */',
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
  L('/** 预览卡上的小标签（按类型给：小丑牌是稀有度/价格/立绘，消耗品是牌组/价格，补充包是包型/价格，其余是类型名） */',
    'function mkTag () {',
    '  const bits = [];',
    '  const t = MK.t || {};',
    "  if (MK.type === 'Joker') {",
    "    bits.push((MK_RARITY.filter((r) => r[0] === MK.rarity)[0] || ['', '普通'])[1]);",
    "    bits.push('$' + MK.cost);",
    "    if (MK.soul.on) bits.push('有立绘');",
    "  } else if (MK.type === 'Consumable') {",
    "    bits.push((MK_SETS.filter((x) => x[0] === MK.set)[0] || ['', '消耗品'])[1]);",
    "    bits.push('$' + MK.cost);",
    "  } else if (MK.type === 'Booster') {",
    "    const kinds = [['Arcana', '秘术包'], ['Celestial', '天界包'], ['Standard', '标准包'], ['Buffoon', '小丑包'], ['Spectral', '幽灵包']];",
    "    bits.push((kinds.filter((x) => x[0] === t.kind)[0] || ['', '补充包'])[1]);",
    "    bits.push('选 ' + (t.choose || 1) + ' / 给 ' + (t.extra || 3));",
    "    bits.push('$' + (t.cost || 4));",
    "  } else if (MK.type === 'Voucher') {",
    "    bits.push('$' + MK.cost);",
    "  } else if (MK.type === 'Blind') {",
    "    bits.push('底注 ' + (t.boss_min || 1) + '–' + (t.boss_max || 10));",
    "    bits.push('需求 ×' + (t.blind_mult || 2));",
    "  } else bits.push(mkType()[1]);",
    "  return bits.map((b) => '<i class=\"mktag\">' + esc(String(b)) + '</i>').join('');",
    '}'),
  'mkTag 重写');

/* ④ 预览那行的占位文案按类型说人话 */
rep(
  "esc(mkAutoText('zh') || '（还没有效果 —— 到右边第 ② 段选一个预设）')",
  "esc(mkAutoText('zh') || (MK.type === 'Joker' ? '（还没有效果 —— 到右边第 ② 段选一个预设）' : '（这个类型还有专属设置没填）'))",
  '占位文案按类型');
rep(
  "esc(mkAutoText('zh') || '（还没有效果 —— 到右边第 ② 段选一个预设）');\n  }",
  "esc(mkAutoText('zh') || (MK.type === 'Joker' ? '（还没有效果 —— 到右边第 ② 段选一个预设）' : '（这个类型还有专属设置没填）'));\n  }",
  '刷新时占位文案');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
