/* 第六十八轮（设计清理 2）：自动扫描「改了看不出变化」的控件
   做法：把制作器里所有交互控件（data-mk / data-mkt / data-mkp / data-mkflag / 各 id 下拉）逐个改一次，
   每次都与「改之前的 Lua 文本 + 预览画布哈希」比较；两者都没变 = 这个控件是死的（或纯装饰），如实列出来。
   这是 ⑤ 的可验证版本：不靠手点、不靠感觉。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const a = '    r.cloneSummary=(r.cloneByType||[]).map(function(x){'
if (s.split(a).length - 1 !== 1) { console.error('❌ 锚点'); process.exit(1) }
s = s.replace(a, () => [
  '    /* ⑤ 扫描所有控件：改一次，Lua 或预览必须有反应 */',
  '    r.deadControls=[]; r.controlsChecked=0;',
  '    const pvHash=()=>{ const cv=q(".mkpvbox canvas"); if(!cv) return null; const d=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data; let h=0; for(let i=0;i<d.length;i+=97) h=(h*31+d[i])>>>0; return h };',
  '    const labelOf=(el)=>{ const f=el.closest?el.closest("label"):null; const t=f?(f.textContent||"").replace(/\\s+/g," ").trim().slice(0,28):""; return (el.dataset.mk||el.dataset.mkt||el.dataset.mkp||el.dataset.mkflag||el.id||el.tagName)+"("+t+")" };',
  '    const controls=[];',
  '    qa("[data-mk],[data-mkt],[data-mkp],[data-mkflag]").forEach(function(el){ const ty=(el.type||"").toLowerCase();',
  '      if(el.tagName==="SELECT"||el.tagName==="INPUT") controls.push(el) });',
  '    ["mkType0"].forEach(function(){});',
  '    for (const el of controls) {',
  '      if (el.type === "file") continue;',
  '      const beforeLua=B.maker.lua(), beforePv=pvHash();',
  '      let acted=false;',
  '      if (el.tagName === "SELECT") {',
  '        if (el.options.length > 1) { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event("change",{bubbles:true})); acted=true }',
  '      } else if (el.type === "checkbox") { el.checked = !el.checked; el.dispatchEvent(new Event("change",{bubbles:true})); acted=true }',
  '      else if (el.type === "number") { el.value = String((Number(el.value)||0) + 3); el.dispatchEvent(new Event("input",{bubbles:true})); acted=true }',
  '      else { el.value = String(el.value||"") + "x"; el.dispatchEvent(new Event("input",{bubbles:true})); acted=true }',
  '      if (!acted) continue;',
  '      await __V.wait(260);',
  '      const afterLua=B.maker.lua(), afterPv=pvHash();',
  '      r.controlsChecked++;',
  '      if (afterLua === beforeLua && afterPv === beforePv) r.deadControls.push(labelOf(el));',
  '    }',
  '    r.deadControlsSummary = r.deadControls.length ? r.deadControls.join(" ; ") : "没有死的控件";',
  a,
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 场景加了控件扫描')
