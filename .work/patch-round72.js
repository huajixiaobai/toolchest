/* 第七十二轮：给 sig() 打桩，定位「编辑落到状态了、签名却不动」的矛盾
   只做一件事：改一次 modId，把 lua / manifest / 预览三段各自的长短与前 60 字都打出来，
   顺便看页面上到底有几个 [data-mkp="modId"]（排除"改到了另一份元素"）。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const a = '    r.deadControlsSummary = r.deadControls.length ? r.deadControls.join(" ; ") : "没有死的控件";'
if (s.split(a).length - 1 !== 1) { console.error('❌ 锚点'); process.exit(1) }
s = s.replace(a, () => [
  '    /* sig 打桩 */',
  '    {',
  '      const snap=()=>({ luaLen:B.maker.lua().length, manLen:B.maker.manifest().length, pv:pvHash() });',
  '      const els=qa(\'[data-mkp="modId"]\');',
  '      const s1=snap();',
  '      let v0=null, v1=null;',
  '      if(els.length){ v0=els[0].value; els[0].value=v0+"Q"; els[0].dispatchEvent(new Event("input",{bubbles:true})); await __V.wait(450); v1=els[0].value }',
  '      const s2=snap();',
  '      r.sigTrace={ elCount:els.length, v0:v0, v1:v1,',
  '        luaChanged:s1.luaLen!==s2.luaLen, manChanged:s1.manLen!==s2.manLen, pvChanged:s1.pv!==s2.pv,',
  '        s1:s1, s2:s2, stateNow:B.maker.project.modId,',
  '        manHead:B.maker.manifest().slice(0,50), luaHead:B.maker.lua().slice(0,50) };',
  '    }',
  a,
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 加入 sig 打桩')
