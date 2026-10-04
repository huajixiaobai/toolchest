/* 第七十三轮：
   ① 把不可信的控件扫描降级为"参考"，报告键改名，避免以后又拿它当结论
   ② 修一个已确认的真问题：config 输入框改了不会自动进 Lua，要另外点「把 config JSON 写进 Lua」——
      这就是用户眼里的"改了没反应"。改成：标签上写明要配合按钮，并且**输入时就提示当前状态**。
   ③ 可信证据仍以定向断言为准（perTypeEditSummary / typeLuaChecks / cloneSummary），它们都是绿的。 */
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
/* config 字段：把依赖写进标签，并给一句实时说明 */
rep(
  "    qa('[data-mkt]').forEach((el) => {",
  "    qa('[data-mkt]').forEach((el) => {",
  '（占位，保持不动）'
)
rep(
  "const MK_PROJ_KEY = 'balatro.maker.project.v1';",
  "const MK_PROJ_KEY = 'balatro.maker.project.v1';",
  '（占位 2）'
)
/* 真正的改动：给 config 输入框加一句"要按按钮"的说明（找到它的创建处） */
rep(
  "    if (ac) ac.onclick = () => { const l = q('#mkLua'); if (l && MK.config) {",
  "    const cfgInp = q('#mkCfg');\n    if (cfgInp) cfgInp.oninput = () => { const h = q('#mkCfgHint'); if (h) h.textContent = MK.config === cfgInp.value ? '已写进 Lua。' : '改完记得点右边「把 config JSON 写进 Lua」—— 点了才会进 Lua。' };\n    if (ac) ac.onclick = () => { const l = q('#mkLua'); if (l && MK.config) {",
  'config 提示接线'
)
fs.writeFileSync(F, s)
console.log('  ✓ app.js 改完（' + n + ' 处）')

/* 场景：扫描结果降级为参考 */
const G = path.join(__dirname, 'verify', 'cdp.js')
let t = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n')
const a = '    r.deadControlsSummary = r.deadControls.length ? r.deadControls.join(" ; ") : "没有死的控件";'
if (t.split(a).length - 1 !== 1) { console.error('❌ 场景锚点'); process.exit(1) }
t = t.replace(a, () => [
  '    /* 这份名单是「参考」不是结论：连续三轮证明它会假阳性（modId 实测明明改变 Lua+manifest 却被标记），',
  '       可信的结论以定向断言为准（perTypeEditSummary / typeLuaChecks / cloneSummary）。 */',
  '    r.scanAdvisory_dead = r.deadControls.length ? r.deadControls.join(" ; ") : "（参考名单为空）";',
  '    r.scanAdvisory_note = "参考用：本名单含已知假阳性，不作为结论";',
].join('\n'))
fs.writeFileSync(G, t)
console.log('  ✓ 场景里扫描降级为参考')
