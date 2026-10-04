/* 第七十轮：定点查清「工程字段被标记为死控件」这件事
   探针只做一件事：改一次 modId，然后同时看 (a) 处理器有没有跑（maker.project.modId 变没变）
   (b) manifest() 变没变 (c) 元素还在不在。三种结果指向三种不同的原因，不猜。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const a = '    r.deadControlsSummary = r.deadControls.length ? r.deadControls.join(" ; ") : "没有死的控件";'
if (s.split(a).length - 1 !== 1) { console.error('❌ 锚点'); process.exit(1) }
s = s.replace(a, () => [
  a,
  '    /* 定点探针：工程字段（modId）为什么被算成"没反应" */',
  '    {',
  '      const mB=B.maker.manifest();',
  '      const el=q(\'[data-mkp="modId"]\');',
  '      const vb=el?el.value:null;',
  '      if(el){ el.value="zzzprobe"; el.dispatchEvent(new Event("input",{bubbles:true})); await __V.wait(500) }',
  '      const mA=B.maker.manifest();',
  '      r.projProbe={ found:!!el, valBefore:vb, valAfterEl:el?el.value:null,',
  '        stateValue:B.maker.project.modId, handlerRan:(B.maker.project.modId==="zzzprobe"),',
  '        manifestChanged:mB!==mA, mBeforeHead:mB.slice(0,70), mAfterHead:mA.slice(0,70) };',
  '    }',
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 加入工程字段定点探针')
