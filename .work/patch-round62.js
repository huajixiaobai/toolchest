/* 第六十二轮：把「改专属字段 → Lua 跟不跟」的扫描扩到全部类型，并修正优惠券那条的走法
   上轮结论修正：优惠券的 voucher_val **确实**写进 Lua，但只有「效果」(voucher_kind) 选了用得上数值的那种才写；
   我上轮只填了数字没选效果，所以看着像"没进 Lua"—— 是我的测试没走完整路径，不是产品缺口。
   现在：优惠券那行先选 dollars 再填数值；其余类型用自己的专属键；没有对应输入框的如实标 noInput。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const a = '    const TEDIT=[["Blind","blind_mult","9"],["Booster","choose","3"],["Back","hand_size","9"],["Voucher","voucher_val","42"]];'
if (s.split(a).length - 1 !== 1) { console.error('❌ 锚点'); process.exit(1) }
s = s.replace(a, () => [
  '    const TEDIT=[["Blind","blind_mult","9",null],["Booster","choose","3",null],["Back","hand_size","9",null],',
  '      ["Voucher","voucher_val","42",["voucher_kind","dollars"]],["Tag","tag_val","7",null],',
  '      ["Enhanced","chips","33",null],["Edition","xmult","2.5",null],["Seal","seal_val","5",null],',
  '      ["Consumable","max_highlighted","3",null],["Joker","weight","2",null]];',
].join('\n'))
const b = '      const inp=q(\'[data-mkt="\'+key+\'"]\');'
if (s.split(b).length - 1 !== 1) { console.error('❌ 锚点 2'); process.exit(1) }
s = s.replace(b, () => [
  '      /* 有的类型要先选"效果"才会用到数值（优惠券就是这样），按需先走一步 */',
  '      if (te[3]) { const pre=q(\'[data-mkt="\'+te[3][0]+\'"]\'); if (pre) { pre.value=te[3][1]; fire(pre,"change"); await __V.wait(300) } }',
  b,
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 扫描扩到全部类型 + 优惠券先选效果')
