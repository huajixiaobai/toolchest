/* 第三十二轮验证：盲注选择器（大块 + 效果可见 + 弹窗列表）与结算动画三档 */
const fs = require('fs');
const path = require('path');
let n = 0;
const patch = (file, pairs) => {
  const F = path.join(__dirname, file);
  let s = fs.readFileSync(F, 'utf8');
  for (const [from, to, label] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) { console.error('❌ ' + file + ' :: ' + label + ' 命中 ' + hits + ' 次，放弃'); process.exit(1); }
    s = s.replace(from, to);
    console.log('  ✓ ' + file + ' :: ' + label);
    n++;
  }
  fs.writeFileSync(F, s);
};
const L = (...a) => a.join('\n');

const BLIND_PICK = L(
  '  /* 盲注选择器：大块 + 效果直接可见 + 弹窗列表（每一行都要有名字和效果） */',
  '  blindPick: `(async()=>{',
  '    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1400);',
  '    const q=(s)=>document.querySelector(s); const qa=(s)=>[].slice.call(document.querySelectorAll(s));',
  '    const px=(e,p)=>e?getComputedStyle(e)[p]:null; const box=(e)=>{ if(!e) return null; const b=e.getBoundingClientRect(); return {w:Math.round(b.width),h:Math.round(b.height)} };',
  "    S.tab='score'; S.blind=''; B.render(); await __V.wait(1000);",
  "    r.viewport={w:innerWidth,h:innerHeight,hoverNone:matchMedia('(hover:none)').matches};",
  '    /* ① 没选盲注时也要有说明，不是只有一个名字 */',
  "    r.emptyBox={ name:(q('.scblindname')||{}).textContent, fx:((q('.scblindfx')||{}).textContent||'').slice(0,40), pickBtn:box(q('.scblindpick')) };",
  "    r.nameFont=px(q('.scblindname'),'fontSize'); r.fxFont=px(q('.scblindfx'),'fontSize');",
  '    /* ② 旧的那个没用的勾选应该没了 */',
  "    r.oldCheckbox=qa('[data-envflag=bossBlind]').length;",
  '    /* ③ 打开选择弹窗：每一行都要同时有名字和效果 */',
  "    q('.scblindpick').click(); await __V.wait(600);",
  "    const rows=qa('#scBlindList .scblindrow');",
  '    r.picker={ rows:rows.length, search:!!q("#scBlindQ"),',
  '      rowHeights:rows.map(function(x){return Math.round(x.getBoundingClientRect().height)}).slice(0,6),',
  '      everyRowHasEffect:rows.slice(1).every(function(x){ var s=x.querySelector("span"); return s && s.textContent.trim().length>4 }),',
  '      everyRowHasName:rows.slice(1).every(function(x){ var b=x.querySelector("b"); return b && b.textContent.trim().length>1 }),',
  '      club:(function(){ var x=rows.filter(function(y){return /梅花|Club/i.test(y.textContent)})[0]; return x?x.textContent.replace(/\\s+/g," ").slice(0,60):null })(),',
  '      nameFont:(function(){ var b=rows[1]&&rows[1].querySelector("b"); return b?getComputedStyle(b).fontSize:null })(),',
  '      effectFont:(function(){ var s=rows[1]&&rows[1].querySelector("span"); return s?getComputedStyle(s).fontSize:null })() };',
  '    /* ④ 搜索要能按效果搜 */',
  "    const qi=q('#scBlindQ'); qi.value='梅花'; qi.dispatchEvent(new Event('input',{bubbles:true})); await __V.wait(400);",
  "    r.searchHits=qa('#scBlindList .scblindrow').length;",
  "    qi.value=''; qi.dispatchEvent(new Event('input',{bubbles:true})); await __V.wait(300);",
  '    /* ⑤ 点一行：选中 + 大块里显示效果 + bossBlind 自动为真 */',
  "    const club=qa('#scBlindList .scblindrow').filter(function(y){return /梅花|Club/i.test(y.textContent)})[0];",
  "    if (club) club.click(); await __V.wait(900);",
  "    r.afterPick={ blind:SC.blind, bossBlind:S.env.bossBlind, name:(q('.scblindname')||{}).textContent,",
  "      fx:((q('.scblindfx')||{}).textContent||'').slice(0,50), pickerClosed:!q('#scBlindPick') };",
  '    /* ⑥ 取消按钮 */',
  "    const cx=q('.scblindclear'); if (cx) { cx.click(); await __V.wait(700) }",
  "    r.afterClear={ blind:SC.blind, bossBlind:S.env.bossBlind, name:(q('.scblindname')||{}).textContent };",
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);

const ANIM_AUDIT = L(
  '  /* 结算动画三档：原版（juice + 飘字 + 轻抖）/ 简洁（只有数字）/ 关闭（直接出结果） */',
  '  animAudit: `(async()=>{',
  '    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1400);',
  '    const q=(s)=>document.querySelector(s);',
  "    S.tab='score'; B.render(); await __V.wait(900);",
  "    B.score.setHand(['2','3','4','5','6'].map(function(k){return B.score.card(k,'H')}),",
  "      [B.score.jokerFromItem(B.byId['j_joker'])]);",
  '    await __V.wait(900);',
  '    const runOnce=async function(){',
  '      const seen={floats:0, juice:0, jiggle:0, scoreTexts:{}, frames:0};',
  '      let last=performance.now(); let stop=false;',
  '      const loop=function(now){ seen.frames++; seen.gaps=seen.gaps||[]; seen.gaps.push(now-last); last=now; if(!stop) requestAnimationFrame(loop) };',
  '      requestAnimationFrame(loop);',
  "      q('#scToggle').click();",
  '      for (let i=0;i<26;i++){',
  '        await __V.wait(90);',
  '        if (document.querySelectorAll(".scfloat").length) seen.floats++;',
  '        const cEl=document.querySelector(".scchips"), mEl=document.querySelector(".scmult");',
  '        if ((cEl&&cEl.style.transform) || (mEl&&mEl.style.transform)) seen.juice++;',
  '        if (document.querySelector(".scstage.jiggle")) seen.jiggle++;',
  '        const sEl=document.querySelector(".scscore b"); if (sEl) seen.scoreTexts[sEl.textContent]=1;',
  '      }',
  '      stop=true;',
  '      seen.scoreVariants=Object.keys(seen.scoreTexts).length;',
  '      seen.fps=+(seen.frames/((performance.now()-last+ (seen.gaps||[]).reduce(function(a,b){return a+b},0))/1000)).toFixed(1);',
  '      seen.maxGap=Math.round(Math.max.apply(null,(seen.gaps||[0]).slice(1)));',
  '      delete seen.gaps; return seen };',
  '    /* 原版档 */',
  "    r.modeLabel=(q('#scAnim')||{}).textContent;",
  '    r.game=await runOnce(); await __V.wait(900);',
  '    /* 切到简洁 */',
  "    q('#scAnim').click(); await __V.wait(700);",
  "    r.plainLabel=(q('#scAnim')||{}).textContent;",
  '    r.plain=await runOnce(); await __V.wait(900);',
  '    /* 切到关闭：点播放应当直接到结果 */',
  "    q('#scAnim').click(); await __V.wait(700);",
  "    r.offLabel=(q('#scAnim')||{}).textContent;",
  "    q('#scToggle').click(); await __V.wait(700);",
  "    r.off={ step:q('#scStep').value, max:q('#scStep').max, playing:B.score.state.playing===true, floats:document.querySelectorAll('.scfloat').length };",
  "    q('#scAnim').click(); await __V.wait(500);",
  "    r.cycleBack=(q('#scAnim')||{}).textContent;",
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);

patch('verify/cdp.js', [
  [
    '  /* BOSS 盲注 + 被削弱的牌：声明式规则（mod 同样走这条）+ 代码规则 + 手动开关 */',
    BLIND_PICK + '\n' + ANIM_AUDIT + '\n  /* BOSS 盲注 + 被削弱的牌：声明式规则（mod 同样走这条）+ 代码规则 + 手动开关 */',
    '新增 blindPick / animAudit'
  ],
  [
    "  if (SCENARIOS.uxAudit && !SCENARIOS.uxAuditMobile) { SCENARIOS.uxAuditMobile = SCENARIOS.uxAudit; SCENARIOS.uxAuditTablet = SCENARIOS.uxAudit }",
    "  if (SCENARIOS.uxAudit && !SCENARIOS.uxAuditMobile) { SCENARIOS.uxAuditMobile = SCENARIOS.uxAudit; SCENARIOS.uxAuditTablet = SCENARIOS.uxAudit }\n" +
    "  if (SCENARIOS.blindPick && !SCENARIOS.blindPickMobile) { SCENARIOS.blindPickMobile = SCENARIOS.blindPick; SCENARIOS.blindPickTablet = SCENARIOS.blindPick }",
    '注册手机/平板克隆'
  ],
  [
    "|| name === 'bootMobile' || name === 'uiFixMobile' || name === 'uxAuditMobile') {",
    "|| name === 'bootMobile' || name === 'uiFixMobile' || name === 'uxAuditMobile' || name === 'blindPickMobile' || name === 'animAuditMobile') {",
    '手机名单'
  ],
  [
    "    if (name === 'uxAuditTablet') {",
    "    if (name === 'uxAuditTablet' || name === 'blindPickTablet') {",
    '平板名单'
  ],
]);

console.log('共 ' + n + ' 处改动');
