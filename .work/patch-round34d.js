/* 给 modMaker 场景补一张局部截图（制作器页面），三档机型各一份 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const L = (...a) => a.join('\n');
const from = L(
  "    r.newItem=mine.length?{ id:mine[0].id, name:mine[0].i18n&&mine[0].i18n.zh_CN, cat:mine[0].cat, atlas:mine[0].atlas, pos:mine[0].pos, text:((mine[0].text&&mine[0].text.zh_CN)||[]).join(' ') }:null;",
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);
const to = L(
  "    r.newItem=mine.length?{ id:mine[0].id, name:mine[0].i18n&&mine[0].i18n.zh_CN, cat:mine[0].cat, atlas:mine[0].atlas, pos:mine[0].pos, text:((mine[0].text&&mine[0].text.zh_CN)||[]).join(' ') }:null;",
  '    /* 截图：制作器整页（数字看不出界面长啥样） */',
  "    S.tab='maker'; B.render(); await __V.wait(900);",
  "    const SUF3 = innerWidth < 600 ? '-ph' : (innerWidth < 1000 ? '-tab' : '');",
  '    r.__hover=[',
  "      { at:'#mkArtGrid .mkcell', name:'mkHover', ms:500, shot:'ui-maker'+SUF3, clip:'.maker' },",
  '    ];',
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点命中 ' + (s.split(from).length - 1) + ' 次'); process.exit(1) }
fs.writeFileSync(F, s.replace(from, () => to));
console.log('  ✓ modMaker 补截图');
