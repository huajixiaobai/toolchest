/* 一次性小补丁：把 databuild.js 里名字相关的三处收尾改掉。
   必须逐个断言锚点存在，找不到就报错退出（不猜、不写半截文件）。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'databuild.js');
let s = fs.readFileSync(F, 'utf8');
const once = (from, to, label) => {
  const n = s.split(from).length - 1;
  if (n !== 1) { console.error('❌ 锚点 ' + label + ' 命中 ' + n + ' 次，放弃'); process.exit(1); }
  s = s.replace(from, to);
  console.log('  ✓ ' + label);
};

/* ① 点数：P_CARDS 的 value 是字符串（"2" / "Jack"），不是数字 */
once(
  "const RANK_TXT = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }",
  "const RANK_TXT = {\n" +
  "  1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',\n" +
  "  Ace: 'A', Jack: 'J', Queen: 'Q', King: 'K',\n" +
  "  Two: '2', Three: '3', Four: '4', Five: '5', Six: '6', Seven: '7', Eight: '8', Nine: '9', Ten: '10',\n" +
  "}",
  '点数表（字符串形态）');

/* ② 手工名字：补 soul（灵魂虚影，P_CENTERS.soul 是那张幽灵贴图）与 c_base 的英文名 */
once(
  "const MANUAL_NAMES = {\n  c_base: { zh_CN: '默认牌面底框', zh_TW: '預設牌面底框', ja: '既定のカード本体', ko: '기본 카드 본체' },\n}",
  "const MANUAL_NAMES = {\n" +
  "  c_base: { 'en-us': 'Default Base', zh_CN: '默认牌面底框', zh_TW: '預設牌面底框', ja: '既定のカード本体', ko: '기본 카드 본체' },\n" +
  "  soul: { 'en-us': 'Soul Sprite', zh_CN: '灵魂虚影', zh_TW: '靈魂虛影', ja: 'ソウルの亡霊', ko: '소울 유령' },\n" +
  "}",
  '手工名字表');

/* ③ 联动牌：英文里花色和点之间要有空格（Spades J / 黑桃J） */
once(
  "if (base) i18n[code] = base + ' · ' + (locData[code].misc.suits_plural?.[suit] || suit) + ({ Jack: 'J', Queen: 'Q', King: 'K' })[rank]",
  "if (base) i18n[code] = base + ' · ' + (locData[code].misc.suits_plural?.[suit] || suit) + (code === 'en-us' ? ' ' : '') + ({ Jack: 'J', Queen: 'Q', King: 'K' })[rank]",
  '联动牌名字空格');

fs.writeFileSync(F, s);
console.log('已写入 ' + F);
