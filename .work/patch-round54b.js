/* 第五十四轮（补）：场景断言跟上 —— 黄框在最底部、格子带牌名且点击=照这张牌做、动图默认 2× 速度 */
const fs = require('fs')
const path = require('path')
let n = 0
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}

/* ① 黄框位置：必须在最后一个 .opt 段之后 */
rep(
  '    r.needLinksOk=r.needHrefs.indexOf("https://github.com/Steamodded/smods")>=0 && r.needHrefs.indexOf("https://github.com/Steamopollys/Steamodded/wiki")>=0;',
  [
    '    r.needLinksOk=r.needHrefs.indexOf("https://github.com/Steamodded/smods")>=0 && r.needHrefs.indexOf("https://github.com/Steamopollys/Steamodded/wiki")>=0;',
    '    /* 位置：必须排在所有功能段之后（用户要求别占主要位置） */',
    '    const opts=qa(".mkright .opt");',
    '    r.needIsLast=(function(){ if(!need||!opts.length) return false; const last=opts[opts.length-1];',
    '      return (last.compareDocumentPosition(need) & Node.DOCUMENT_POSITION_FOLLOWING)!==0 })();',
    '    /* 图格子：带牌名的格子要有，点它 = 照这张牌做 */',
    '    const withItem=qa(".mkcell.hasitem");',
    '    r.cellsWithItem=withItem.length;',
    '    r.cellTitleHasName=withItem.length?withItem[0].title.indexOf("这张图是")>=0:false;',
    '    const beforeName=(q(\'[data-mk="nameZh"]\')||{}).value;',
    '    if(withItem.length){ withItem[0].click(); await __V.wait(500) }',
    '    r.gridClone={ cloneFrom:B.maker.state.cloneFrom, nameChanged:(q(\'[data-mk="nameZh"]\')||{}).value!==beforeName };;',
    '    /* 播放速度控件 */',
    '    r.speedControl={ el:!!q("#mkSpeed"), value:B.maker.state.art.speed };',
  ].join('\n'),
  '黄框位置 / 格子复用 / 速度控件'
)

/* ② 动图导入：默认 2× → APNG 的 fps 从 17 变 8，逐帧倍数不变 */
rep(
  '    r.fpsFromDelays=lua.indexOf("fps = 17")>=0;',
  '    r.fpsFromDelays=lua.indexOf("fps = 8")>=0;   /* 60ms 基准 × 默认 2× 慢放 = 120ms → 8fps */\n    r.importSpeed=B.maker.state.art.speed;',
  'APNG fps 断言跟上默认 2×'
)
fs.writeFileSync(F, s)
console.log('共 ' + n + ' 处')
