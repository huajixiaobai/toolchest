// Append a side-by-side before/after comparison for the floating-art shadow + pose.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')
const anchor = '  export: `(async()=>{'
if (!s.includes(anchor)) { console.log('anchor missing'); process.exit(1) }

const block = [
  '  soulCompare: `(async()=>{',
  '     await __V.wait(1800);',
  '     const A=window.__BALATRO__;',
  '     if(!A) return {fatal:"no handle"};',
  '     const r={view:"soulCompare"};',
  '     const host=document.createElement("div");',
  '     host.id="soulcmp";',
  '     host.style.cssText="position:fixed;inset:0;z-index:9999;background:#12181e;padding:26px;overflow:auto;display:flex;gap:26px;align-items:flex-start";',
  '     const mk=(label,cv,sub)=>{',
  '       const box=document.createElement("div"); box.style.cssText="text-align:center";',
  '       const h=document.createElement("div");',
  '       h.style.cssText="padding:14px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px";',
  '       cv.style.cssText="display:block;image-rendering:pixelated";',
  '       h.appendChild(cv); box.appendChild(h);',
  '       const t=document.createElement("div"); t.style.cssText="color:#dfe7ee;font-size:13px;margin-top:9px;font-weight:600"; t.textContent=label; box.appendChild(t);',
  '       const s2=document.createElement("div"); s2.style.cssText="color:#6d7d8d;font-size:11px"; s2.textContent=sub||""; box.appendChild(s2);',
  '       return box;',
  '     };',
  '     for(const id of ["j_caino","j_perkeo","c_soul"]){',
  '       const it=A.byId[id];',
  '       const sp=A.specForItem(it);',
  '       const shadowsOn=A.compose(sp,3,0);',
  '       const shadowsOff=A.compose(Object.assign({},sp,{soulNoShadow:true}),3,0);',
  '       shadowsOn.style.width="150px"; shadowsOn.style.height="auto";',
  '       shadowsOff.style.width="150px"; shadowsOff.style.height="auto";',
  '       const col=document.createElement("div"); col.style.cssText="display:flex;gap:12px";',
  '       col.appendChild(mk(it.name+" · 相位0（当前）", shadowsOn, "立绘摆正 + 原版投影"));',
  '       col.appendChild(mk(it.name+" · 无投影对照", shadowsOff, "仅用于对比"));',
  '       host.appendChild(col);',
  '     }',
  '     document.body.appendChild(host);',
  '     await __V.wait(700);',
  '     return {view:"soulCompare", tiles:host.children.length};',
  '  })()`,',
].join('\n') + '\n'

s = s.replace(anchor, block + anchor)
fs.writeFileSync(f, s)
const shot = s.includes("'showcase', 'mobile'")
if (shot) s = s.replace("'showcase', 'mobile'", "'showcase', 'mobile', 'soulCompare'")
fs.writeFileSync(f, s)
try { new Function(s); console.log('✅ added soulCompare, syntax OK; screenshot hook:', shot) } catch (e) { console.log('❌ syntax:', e.message) }
