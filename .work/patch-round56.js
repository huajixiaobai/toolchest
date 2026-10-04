/* 第五十六轮：查清「Shift 点格子换图」到底哪儿没生效 —— 一次把三种点法都试出来 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const from = '    const cells2=qa(".mkcell:not(.on)");'
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点不唯一'); process.exit(1) }
s = s.replace(from, () => [
  '    const cells2=qa(".mkcell:not(.on)");',
  '    r.cellCount=cells2.length;',
  '    r.artTargetNow=(typeof artTarget!=="undefined")?artTarget:"(取不到)";',
].join('\n'))
/* 三种点法逐个试：合成事件 / 直接调 onclick / 真鼠标（真鼠标留给场景 driver，这里先看前两种） */
const anchor2 = '    r.stillCloned=B.maker.state.cloneFrom;'
if (s.split(anchor2).length - 1 !== 1) { console.error('❌ 锚点 2 不唯一'); process.exit(1) }
s = s.replace(anchor2, () => [
  '    /* 点法二：直接调 onclick 并带 shiftKey */',
  '    if(cells2.length){',
  '      const posB2=JSON.stringify(B.maker.state.art.pos);',
  '      try { cells2[cells2.length-2>=0?cells2.length-2:0].onclick({shiftKey:true}) } catch(e){ r.onclickErr=String(e&&e.message||e) }',
  '      await __V.wait(400);',
  '      r.editArtViaOnclick=(JSON.stringify(B.maker.state.art.pos)!==posB2);',
  '      r.posNow=JSON.stringify(B.maker.state.art.pos);',
  '    }',
  '    /* 点法三：不带 shift 点一个格子（应当触发「照这张牌做」） */',
  '    {',
  '      const c3=qa(".mkcell")[qa(".mkcell").length-1];',
  '      const luaB3=B.maker.lua();',
  '      if(c3){ c3.onclick({shiftKey:false}); await __V.wait(400) }',
  '      r.plainClickDidSomething=(B.maker.lua()!==luaB3);',
  '    }',
  '    r.stillCloned=B.maker.state.cloneFrom;',
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 场景补三种点法诊断')
