/* 第五十八轮：接通「克隆函数」的暴露管道 + 按类型验证
   上一轮失败原因：mkApplyCloneFrom 定义在 viewMaker 内部，模块级取不到（MKEL 也不是模块级对象）。
   这次用我自己在模块级加过的变量（mkNeedBoxEl / mkSectionParent 旁边）当中转，不再猜作用域。 */
const fs = require('fs')
const path = require('path')
let n = 0
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}
rep(
  'let mkNeedBoxEl = null; let mkSectionParent = null;',
  'let mkNeedBoxEl = null; let mkSectionParent = null;\nlet mkApplyCloneImpl = null;   /* viewMaker 内部的「照某张牌做」函数挂在这里，供模块级暴露给测试调用 */',
  '模块级中转变量'
)
rep(
  '  MKEL.applyClone = mkApplyCloneFrom;   /* 函数定义在 viewMaker 里，从这里挂到模块级对象上给外部用 */',
  '  mkApplyCloneImpl = mkApplyCloneFrom;   /* 挂到模块级变量，外部就能调到了 */',
  'viewMaker 里挂上去'
)
rep(
  "applyClone: (id) => (typeof MKEL !== 'undefined' && MKEL && MKEL.applyClone) ? MKEL.applyClone(id) : null,   /* 暴露管道未接通时返回 null，不抛异常 */",
  'applyClone: (id) => (mkApplyCloneImpl ? mkApplyCloneImpl(id) : null),',
  '暴露改用中转变量'
)
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const must = ['let mkApplyCloneImpl = null;', 'mkApplyCloneImpl = mkApplyCloneFrom;', 'applyClone: (id) => (mkApplyCloneImpl']
const miss = must.filter((m) => b.indexOf(m) < 0)
console.log(miss.length ? '  ❌ 写回后找不到：' + miss.join(' | ') : '  ✓ 写回校验：' + must.length + ' 个标识都在')
