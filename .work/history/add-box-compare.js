// Append a visual comparison for the cards whose box the game resizes.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')
const anchor = '  export: `(async()=>{'
if (!s.includes(anchor)) { console.log('anchor missing'); process.exit(1) }

const block = [
  '  boxCompare: `(async()=>{',
  '     await __V.wait(1800);',
  '     const A=window.__BALATRO__;',
  '     if(!A) return {fatal:"no handle"};',
  '     const host=document.createElement("div");',
  '     host.id="boxcmp";',
  '     host.style.cssText="position:fixed;inset:0;z-index:9999;background:#12181e;padding:24px;overflow:auto;display:flex;flex-wrap:wrap;gap:20px;align-content:flex-start";',
  '     const mk=(label,cv,sub)=>{',
  '       const box=document.createElement("div"); box.style.cssText="text-align:center";',
  '       const h=document.createElement("div");',
  '       h.style.cssText="padding:12px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px;display:flex;align-items:flex-end;min-height:230px";',
  '       cv.style.cssText="display:block;image-rendering:pixelated;margin:auto";',
  '       h.appendChild(cv); box.appendChild(h);',
  '       const t=document.createElement("div"); t.style.cssText="color:#dfe7ee;font-size:12px;margin-top:8px;font-weight:600"; t.textContent=label; box.appendChild(t);',
  '       const s2=document.createElement("div"); s2.style.cssText="color:#6d7d8d;font-size:10.5px"; s2.textContent=sub||""; box.appendChild(s2);',
  '       return box;',
  '     };',
  '     const ids=["j_joker","j_wee","j_half","j_photograph","j_square","p_buffoon_normal_1"];',
  '     A.state.rawSize=false;',
  '     for(const id of ids){',
  '       const it=A.byId[id]; if(!it) continue;',
  '       const onRaw=A.compose(Object.assign({},A.specForItem(it),{box:null}),3,0);',
  '       const on=A.compose(A.specForItem(it),3,0);',
  '       onRaw.style.width="120px"; onRaw.style.height="auto";',
  '       on.style.width=(120*on.width/onRaw.width)+"px"; on.style.height="auto";',
  '       const col=document.createElement("div"); col.style.cssText="display:flex;gap:10px;align-items:flex-end";',
  '       col.appendChild(mk(it.name+" 原版尺", on, it.box? "box "+it.box.w.toFixed(3)+" x "+it.box.h.toFixed(3) : "默认"));',
  '       col.appendChild(mk(it.name+" 原始贴图", onRaw, "142x190"));',
  '       col.appendChild(mk(it.name+" 原尺寸开关", null, ""));',
  '       col.removeChild(col.lastChild);',
  '       host.appendChild(col);',
  '     }',
  '     document.body.appendChild(host);',
  '     await __V.wait(700);',
  '     return {view:"boxCompare", groups:host.children.length};',
  '  })()`,',
].join('\n') + '\n'

s = s.replace(anchor, block + anchor)
s = s.replace("'showcase', 'mobile', 'soulCompare'", "'showcase', 'mobile', 'soulCompare', 'boxCompare'")
fs.writeFileSync(f, s)
try { new Function(s); console.log('✅ boxCompare added, syntax OK') } catch (e) { console.log('❌ syntax:', e.message) }
