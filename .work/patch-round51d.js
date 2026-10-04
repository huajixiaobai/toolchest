/* 第五十一轮（补 3）：再补一条「逐条目能力没退化」的断言 —— 工程 Lua 里该有几段动图图集、立绘、逐帧时长 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const from = "    r.reimportWarn=reimp&&reimp.mod&&reimp.mod.warnings?reimp.mod.warnings.length:0;";
const hits = s.split(from).length - 1;
if (hits !== 1) { console.error('❌ 锚点命中 ' + hits); process.exit(1) }
s = s.replace(from, () => from + [
  '',
  '    /* 逐条目能力没退化：小丑(主体+立绘) + 消耗品 + 优惠券 = 4 段动图图集；立绘 1 段；逐帧时长至少 1 段 */',
  '    r.animAtlases=lua.split("atlas_table = \'ANIMATION_ATLAS\'").length-1;',
  '    r.soulAtlases=lua.split("soul_atlas = \'soul_").length-1;',
  '    r.frameDurationsInLua=lua.split("frame_durations").length-1;',
  '    r.perItemAbilities=r.animAtlases>=4 && r.soulAtlases>=1 && r.frameDurationsInLua>=1;',
].join('\n'));
fs.writeFileSync(F, s);
console.log('  ✓ 已加入逐条目能力断言');
