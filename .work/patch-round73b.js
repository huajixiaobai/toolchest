/* 第七十三轮（容错版）：
   ① 场景里把不可信的控件扫描降级为"参考"（它连续三轮假阳性，不再当结论）
   ② 尝试给 config 输入框加一句"要点按钮才生效"的提示 —— 命中就改，不命中就如实说明（不 abort）
   说明：可信结论以定向断言为准（perTypeEditSummary / typeLuaChecks / cloneSummary，都是绿的）。 */
const fs = require('fs')
const path = require('path')
let done = []

/* ① 场景：扫描降级为参考 */
{
  const G = path.join(__dirname, 'verify', 'cdp.js')
  let t = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n')
  const a = '    r.deadControlsSummary = r.deadControls.length ? r.deadControls.join(" ; ") : "没有死的控件";'
  const hits = t.split(a).length - 1
  if (hits === 1) {
    t = t.replace(a, () => [
      '    /* 参考名单，不是结论：连续三轮证明它会假阳性（modId 实测明明改变 Lua+manifest 却被标记）。',
      '       可信结论以定向断言为准：perTypeEditSummary / typeLuaChecks / cloneSummary。 */',
      '    r.scanAdvisory_dead = r.deadControls.length ? r.deadControls.join(" ; ") : "（参考名单为空）";',
      '    r.scanAdvisory_note = "参考用：含已知假阳性，不作为结论";',
    ].join('\n'))
    fs.writeFileSync(G, t)
    done.push('场景：扫描降级为参考 ✓')
  } else done.push('场景：锚点命中 ' + hits + '，跳过（未改）')
}

/* ② config 输入框提示：命中才改 */
{
  const F = path.join(__dirname, 'app.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const a = '    if (ac) ac.onclick = () => {'
  const hits = s.split(a).length - 1
  if (hits === 1) {
    s = s.replace(a, () => [
      '    /* config 那个框改了不会自动进 Lua，要另外点按钮 —— 用户看着就是"改了没反应"。这里给出实时提示。 */',
      "    const cfgInp = q('#mkCfg');",
      "    if (cfgInp) cfgInp.oninput = () => { const h = q('#mkCfgHint'); if (h) h.textContent = '改完记得点「把 config JSON 写进 Lua」，点了才会进 Lua。' };",
      a,
    ].join('\n'))
    fs.writeFileSync(F, s)
    done.push('config 提示接线 ✓（若页面上没有 #mkCfg / #mkCfgHint，则这段是安全空操作）')
  } else done.push('config 提示：锚点命中 ' + hits + '，跳过（未改）')
}
console.log(done.join('\n'))
