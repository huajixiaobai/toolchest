/* 第七十一轮：修扫描器（上一轮证明它会假阳性）
   旧做法的毛病：一次性收集所有元素引用，之后逐个改 —— 中途有控件触发重绘，后面的引用就失效了，
   于是"改了没反应"变成了假的死控件（定点探针已证明工程字段其实是好的）。
   新做法：① 每步用选择器重新查元素；② 改完断言"编辑确实落到了状态"（state / project / t）；
          ③ 没落地的记为"没测到"，不混进死控件名单。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
let n = 0
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}
/* 旧扫描的结果挪到 r.deadOld，避免和新结果混在一起 */
rep('    r.deadControls=[]; r.controlsChecked=0;', '    r.deadOld=[]; r.controlsOldChecked=0;', '旧扫描改名（1）')
rep('      r.controlsChecked++;', '      r.controlsOldChecked++;', '旧扫描改名（2）')
rep('      if (afterSig === beforeSig) r.deadControls.push(labelOf(el));', '      if (afterSig === beforeSig) r.deadOld.push(labelOf(el));', '旧扫描改名（3）')
/* 新扫描：插在汇总之前 */
rep(
  '    r.deadControlsSummary = r.deadControls.length ? r.deadControls.join(" ; ") : "没有死的控件";',
  [
    '    /* 新扫描：每步重新查元素 + 断言编辑落到状态 */',
    '    r.deadControls=[]; r.controlsChecked=0; r.controlsUntested=[];',
    '    const SPECS=[["[data-mk]","mk"],["[data-mkt]","mkt"],["[data-mkp]","mkp"],["[data-mkflag]","mkflag"]];',
    '    for (const spec of SPECS) {',
    '      const total0=qa(spec[0]).length;',
    '      for (let idx=0; idx<total0; idx++) {',
    '        const before=sig();',
    '        const el=qa(spec[0])[idx];',
    '        if(!el){ r.controlsUntested.push(spec[1]+"["+idx+"] 元素已消失"); continue }',
    '        const key=el.dataset.mk||el.dataset.mkt||el.dataset.mkp||el.dataset.mkflag;',
    '        if(!key) continue;',
    '        let newVal=null;',
    '        if (el.tagName==="SELECT") { if(el.options.length<2) continue; el.selectedIndex=(el.selectedIndex+1)%el.options.length; el.dispatchEvent(new Event("change",{bubbles:true})); newVal=el.value }',
    '        else if (el.type==="checkbox") { el.checked=!el.checked; el.dispatchEvent(new Event("change",{bubbles:true})); newVal=el.checked }',
    '        else if (el.type==="number") { newVal=String((Number(el.value)||0)+3); el.value=newVal; el.dispatchEvent(new Event("input",{bubbles:true})) }',
    '        else { newVal=String(el.value||"")+"x"; el.value=newVal; el.dispatchEvent(new Event("input",{bubbles:true})) }',
    '        await __V.wait(280);',
    '        const st=B.maker.state, pr=B.maker.project;',
    '        let landed=true;',
    '        if (spec[1]==="mkp") landed=(String(pr[key])===String(newVal));',
    '        else if (spec[1]==="mkflag") landed=(!!st[key]===!!newVal);',
    '        else if (spec[1]==="mkt") landed=(String(((st.t||{})[key]))===String(newVal));',
    '        else if (typeof st[key]!=="undefined") landed=(String(st[key])===String(newVal));',
    '        r.controlsChecked++;',
    '        const after=sig();',
    '        if (after===before) {',
    '          if (landed) r.deadControls.push(labelOf(el));',
    '          else r.controlsUntested.push(labelOf(el)+"（编辑没落地）");',
    '        }',
    '      }',
    '    }',
    '    r.deadControlsSummary = r.deadControls.length ? r.deadControls.join(" ; ") : "没有死的控件";',
    '    r.controlsUntestedSummary = r.controlsUntested.length ? r.controlsUntested.join(" ; ") : "全部测到了";',
  ].join('\n'),
  '新扫描器'
)
fs.writeFileSync(F, s)
console.log('共 ' + n + ' 处')
