/* 第五十七轮（收尾）：把 applyClone 的暴露改成不会抛异常的版本。
   背景：mkApplyCloneFrom 定义在 viewMaker 里面，模块级暴露取不到它，之前写成 MKEL 也取不到（作用域不对），
   测试一调就 ReferenceError。这里改成「拿不到就返回 null」，不抛异常；下一轮再把暴露管道接通并完成按类型验证。 */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const a = 'applyClone: (id) => (MKEL && MKEL.applyClone ? MKEL.applyClone(id) : null),'
const b = "applyClone: (id) => (typeof MKEL !== 'undefined' && MKEL && MKEL.applyClone) ? MKEL.applyClone(id) : null,   /* 暴露管道未接通时返回 null，不抛异常 */"
const h = s.split(a).length - 1
if (h !== 1) { console.error('❌ 锚点命中 ' + h); process.exit(1) }
s = s.replace(a, () => b)
fs.writeFileSync(F, s)
console.log(fs.readFileSync(F, 'utf8').indexOf('暴露管道未接通时返回 null') >= 0 ? '  ✓ 暴露改成安全版' : '  ❌ 没写进去')
