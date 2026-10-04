/* 第六十一轮：让场景自己吐一行「按类型克隆」的汇总，别再靠截 JSON 猜 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const a = '    r.errText=document.body.innerText.indexOf("出错")>=0;'
if (s.split(a).length - 1 !== 1) { console.error('❌ 锚点'); process.exit(1) }
s = s.replace(a, () => [
  '    r.cloneSummary=(r.cloneByType||[]).map(function(x){ return (x.cat||"?")+"→"+(x.typeAfter||"?")+" 专属"+x.tKeys+" 效果"+x.effects+" cost进Lua:"+(x.luaHasCost?"是":"否")+" "+String(x.tSample||"") }).join("  ||  ");',
  '    r.perTypeEdit=[];',
  '    /* ③ 的验证：每种类型改一个专属字段，Lua 必须跟着变 */',
  '    const TEDIT=[["Blind","blind_mult","9"],["Booster","choose","3"],["Back","hand_size","9"],["Voucher","voucher_val","42"]];',
  '    for (const te of TEDIT) {',
  '      const ty=te[0], key=te[1], val=te[2];',
  '      B.maker.select(0); B.maker.typeChip(ty); await __V.wait(250);',
  '      const inp=q(\'[data-mkt="\'+key+\'"]\');',
  '      if(!inp){ r.perTypeEdit.push({type:ty,key:key,noInput:true}); continue }',
  '      const before=B.maker.lua();',
  '      inp.value=val; fire(inp,"input"); await __V.wait(400);',
  '      const after=B.maker.lua();',
  '      r.perTypeEdit.push({ type:ty, key:key, changed:after!==before, inLua:after.indexOf(val)>=0, inState:(JSON.stringify(B.maker.state.t||{}).indexOf(\'"\'+key+\'":"\')>=0||JSON.stringify(B.maker.state.t||{}).indexOf(\'"\'+key+\'":\')>=0) });',
  '    }',
  '    r.perTypeEditSummary=(r.perTypeEdit||[]).map(function(x){ return x.type+"."+x.key+(x.noInput?"(没有这个输入框)":(x.changed?" 改了":" 没变")+(x.inLua?" 进Lua":" 没进Lua")) }).join("  ||  ");',
  a,
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 场景加了 cloneSummary / perTypeEditSummary')
