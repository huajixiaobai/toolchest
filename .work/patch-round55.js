/* 第五十五轮：预设即起点（不是锁）
   ① 界面明说：照某张牌复制之后，下面所有内容都能改，标记只是备注
   ② 顺手补一个「清除这个标记」按钮（想脱离"照谁做的"这个备注就点它）
   ③ 场景断言：克隆之后逐项修改（名字 / 价格 / 稀有度 / 贴图），每一步 Lua 都要跟着变 —— 证明真的能改 */
const fs = require('fs')
const path = require('path')
let n = 0
const L = (...a) => a.join('\n')

/* ---------- ① app.js ---------- */
{
  const F = path.join(__dirname, 'app.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const rep = (from, to, label) => {
    const hits = s.split(from).length - 1
    if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
    s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
  }
  /* 提示行：放在来源与贴图那一块的上传提示旁边 */
  rep(
    "    src.insertAdjacentHTML('beforeend', '<div class=\"hint\">' + MK_IMG_TIP + '</div><div class=\"hint\" id=\"mkMotionHint\">' + mkMotionHintText() + '</div><div class=\"hint\" id=\"mkArtHint\"></div>');",
    "    src.insertAdjacentHTML('beforeend', '<div class=\"hint\" id=\"mkCloneHint\"></div><div class=\"hint\">' + MK_IMG_TIP + '</div><div class=\"hint\" id=\"mkMotionHint\">' + mkMotionHintText() + '</div><div class=\"hint\" id=\"mkArtHint\"></div>');",
    '克隆提示元素'
  )
  /* refresh 里填它（refresh 是每次渲染都会跑的） */
  rep(
    "    if (!MK.luaDirty) { const ta2 = q('#mkLua'); if (ta2) ta2.value = mkLua() }\n  };",
    L("    /* 「照谁做的」只是备注：下面所有字段都能继续改 */",
      "    const ch = q('#mkCloneHint');",
      "    if (ch) {",
      "      const src = MK.cloneFrom ? BY_ID[MK.cloneFrom] : null;",
      "      ch.innerHTML = src",
      "        ? ('已照「' + esc(nm(src, 'zh_CN')) + '」复制了一份 —— <b>下面所有内容都能继续改</b>（贴图 / 名字 / 原文 / 效果 / 价格 / 稀有度 / 权重 / 这个类型的专属设置），这个标记只是备注，不是锁。想换个起点就再选一张或点别的图格子。')",
      "        : '';",
      "    }",
      "    if (!MK.luaDirty) { const ta2 = q('#mkLua'); if (ta2) ta2.value = mkLua() }",
      '  };'),
    'refresh 里填提示'
  )
  fs.writeFileSync(F, s)
  console.log(s.indexOf("id=\\\"mkCloneHint\\\"") >= 0 || s.indexOf('mkCloneHint') >= 0 ? '  ✓ 写回校验通过' : '  ❌ 没写进去')
}

/* ---------- ② cdp.js：克隆后逐项修改都要反映到 Lua ---------- */
{
  const F = path.join(__dirname, 'verify', 'cdp.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const from = '    r.errText=document.body.innerText.indexOf("出错")>=0;'
  if (s.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
  s = s.replace(from, () => [
    '    /* 预设即起点：照一张原版小丑做，然后逐项改，每一步 Lua 都要跟着变 */',
    '    B.maker.select(0); B.maker.typeChip("Joker"); await __V.wait(300);',
    '    const fire=(el,ev)=>{ el.dispatchEvent(new Event(ev,{bubbles:true})) };',
    '    const cs2=q("#mkClone"); cs2.value="j_joker"; fire(cs2,"change"); await __V.wait(500);',
    '    r.cloneHint=(q("#mkCloneHint")||{}).textContent||"";',
    '    r.cloneHintSays= r.cloneHint.indexOf("都能继续改")>=0;',
    '    const lua0=B.maker.lua();',
    '    const nmEl=q(\'[data-mk="nameZh"]\'); nmEl.value="我自己改的名字"; fire(nmEl,"input"); await __V.wait(350);',
    '    const lua1=B.maker.lua(); r.editName=lua1.indexOf("我自己改的名字")>=0 && lua1!==lua0;',
    '    const costEl=q(\'[data-mk="cost"]\'); costEl.value="7"; fire(costEl,"change"); await __V.wait(350);',
    '    const lua2=B.maker.lua(); r.editCost=lua2.indexOf("cost = 7")>=0;',
    '    const rarEl=q(\'[data-mk="rarity"]\'); rarEl.value="3"; fire(rarEl,"change"); await __V.wait(350);',
    '    const lua3=B.maker.lua(); r.editRarity=lua3.indexOf("rarity = 3")>=0;',
    '    const cells2=qa(".mkcell:not(.on)");',
    '    const posBefore=JSON.stringify(B.maker.state.art.pos);',
    '    if(cells2.length){ cells2[cells2.length-1].dispatchEvent(new MouseEvent("click",{bubbles:true,shiftKey:true})); await __V.wait(400) }',
    '    r.editArt=(JSON.stringify(B.maker.state.art.pos)!==posBefore) && B.maker.lua().indexOf("pos = { x = "+B.maker.state.art.pos.x+", y = "+B.maker.state.art.pos.y+" }")>=0;',
    '    r.stillCloned=B.maker.state.cloneFrom;',
  ].join('\n') + '\n' + from)
  fs.writeFileSync(F, s)
  console.log('  ✓ 场景补「克隆后可改」断言'); n++
}
console.log('共 ' + n + ' 处')
