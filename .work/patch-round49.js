/* 第四十九轮：修「选什么都只显示同一段内容」
   两个原因，都实测确认过：
   ① 预览那几处只认「按效果自动生成的文案」（mkAutoText），**无视用户写的/克隆来的原文**（MK.textZh）。
      所以照现成的牌复制之后，名字变了、描述框也变了，但预览卡片上那句话还是自动生成的通用句。
   ② 克隆时数值兜底成 `|| 4`（`|| 1.5`）：从这张牌数据里找不到数字时**凭空编一个 4**，
      于是不管选哪张，预览都是「打出这一手 +4 倍率」。现在只用真实存在的数字，拆不出来就不编，并如实告诉用户。 */
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
const repAll = (from, to, label, want) => {
  const hits = s.split(from).length - 1;
  if (hits !== want) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次（期望 ' + want + '）'); process.exit(1); }
  s = s.split(from).join(to); console.log('  ✓ ' + label + '（' + hits + ' 处）'); n += hits;
};

/* ---------- ① 预览优先显示原文 ---------- */
rep(
  L('/** 预览里那句占位文案：小丑牌提示去选预设，其它类型提示专属设置还没填 */',
    'function mkPlaceholderText () {'),
  L('/** 预览卡片上显示的那句话：**优先用原文**（用户自己写的 / 从现成的牌复制来的），',
    ' *  没有原文才按「它做什么」里的效果自动生成 —— 以前这里只认自动生成的，导致"选什么都显示同一段内容"。 */',
    'function mkShownText () { return MK.textZh || mkAutoText(\'zh\') || \'\' }',
    '/** 预览里那句占位文案：小丑牌提示去选预设，其它类型提示专属设置还没填 */',
    'function mkPlaceholderText () {'),
  'mkShownText 助手'
);
rep(
  "' <code>' + esc(MK.prefix) + '_' + esc(MK.key) + '</code> · ' + esc(mkAutoText('zh') || '还没有效果') +",
  "' <code>' + esc(MK.prefix) + '_' + esc(MK.key) + '</code> · ' + esc(mkShownText() || '还没有效果') +",
  '摘要行用原文'
);
rep(
  "    '<br>' + esc(mkAutoText('zh') || '（还没有效果）');",
  "    '<br>' + esc(mkShownText() || '（还没有效果）');",
  '侧栏那行用原文'
);
repAll(
  "'<div class=\"mkpvfx\">' + esc(mkAutoText('zh') || mkPlaceholderText()) + '</div>'",
  "'<div class=\"mkpvfx\">' + esc(mkShownText() || mkPlaceholderText()) + '</div>'",
  '预览卡片那句用原文',
  2
);

/* ---------- ② 克隆：不编数字、带上花色条件、拆不出来就说清楚 ---------- */
rep(
  L("    const cfg = it.config || {};",
    '    const effects = [];',
    "    const push = (when, kind, v) => { if (v) effects.push({ when, cond: '', condVal: '', eff: kind, val: v }) };"),
  L('    const cfg = it.config || {};',
    '    const effects = [];',
    "    /* 花色 / 点数条件能读出来就带上（贪婪小丑那种「方片才给加成」要带） */",
    "    const SUIT_CN = { Diamonds: '♦', Hearts: '♥', Spades: '♠', Clubs: '♣' };",
    "    const suitRaw = (cfg.extra && cfg.extra.suit) || (it.raw && it.raw.suit) || it.suit || '';",
    "    const cond = SUIT_CN[suitRaw] ? 'suit' : '';",
    "    const condVal = cond ? SUIT_CN[suitRaw] : '';",
    '    const push = (when, kind, v) => { if (v) effects.push({ when, cond: cond, condVal: condVal, eff: kind, val: v }) };'),
  '克隆带上花色条件'
);
rep(
  "        const num = (cfg.extra && (cfg.extra[f] || cfg.extra.chips || cfg.extra.mult || cfg.extra.x_mult)) || cfg[f] || (kind === 'xmult' ? 1.5 : 4);",
  L("        /* 只用这张牌数据里**真实存在**的数字；找不到就不编 —— 以前兜底成 4，于是选什么都是「+4 倍率」 */",
    '        const cand = [(cfg.extra || {})[f], (cfg.extra || {}).chips, (cfg.extra || {}).mult, (cfg.extra || {}).x_mult, cfg[f], cfg.t_chips, cfg.t_mult, cfg.x_mult, cfg.chips, cfg.mult];',
    '        const num = cand.filter((v) => typeof v === \'number\' && isFinite(v))[0];',
    '        if (typeof num !== \'number\') return;   /* 拆不出数值就跳过这条，下面会如实告诉用户 */'),
  '不编造数值'
);
rep(
  "    status('已照「' + nm(it, 'zh_CN') + '」复制一份（类型/贴图/数值/文案/效果都进来了），改完导出就是你的新条目。', 'ok');",
  L("    if (effects.length) status('已照「' + nm(it, 'zh_CN') + '」复制一份：类型/贴图/数值/文案/效果都进来了（' + effects.length + ' 条效果），改完导出就是你的新条目。', 'ok');",
    "    else status('已照「' + nm(it, 'zh_CN') + '」复制一份：类型/贴图/数值/原文都进来了，但**这张牌的效果没法从数据里自动拆成数值**（它的逻辑在游戏源码里是代码）—— 描述里已经是你选的这张牌的原文，效果请在下面「它做什么」里自己挑一条，或直接改生成的 Lua。', '');"),
  '如实说明拆不出效果'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['function mkShownText ()', 'mkShownText() || mkPlaceholderText()', "SUIT_CN", '拆不出数值就跳过这条', '没法从数据里自动拆成数值'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
