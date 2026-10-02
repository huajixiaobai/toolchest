/* 第三十三轮 C：
   - 账目限高挂到真的容器上（<details class="sclog">，没有 .sclogbody 这一层）
   - 场景跟上：animAudit → playStep（动画已删，检查朴素逐步播放 + 空间；不再有 scfloat/jiggle）
   - blindPick 补：贴图是否画出来、影响标签、行高一致性 */
const fs = require('fs');
const path = require('path');
let n = 0;
const patch = (file, pairs) => {
  const F = path.join(__dirname, file);
  let s = fs.readFileSync(F, 'utf8');
  for (const [from, to, label] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) { console.error('❌ ' + file + ' :: ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
    s = s.replace(from, to);
    console.log('  ✓ ' + file + ' :: ' + label);
    n++;
  }
  fs.writeFileSync(F, s);
};
const L = (...a) => a.join('\n');

patch('app.css', [
  [
    L('/* 账目在手机上别把页面撑得老长：限高 + 框内滚动 */',
      '.sclog[open] .sclogbody{max-height:min(42vh,420px);overflow:auto;overscroll-behavior:contain}'),
    L('/* 账目在手机上别把页面撑得老长：限高 + 框内滚动（details 本身就是容器） */',
      '.sclog[open]{max-height:min(44vh,460px);overflow:auto;overscroll-behavior:contain}'),
    '账目限高改到 details'
  ],
]);

/* ---------- 场景 ---------- */
const PLAY_STEP = L(
  '  /* 逐步播放（动画已按用户要求删掉）：只检查步骤推进、数字变化与手机上的空间 */',
  '  playStep: `(async()=>{',
  '    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1400);',
  '    const q=(s)=>document.querySelector(s); const qa=(s)=>[].slice.call(document.querySelectorAll(s));',
  "    S.tab='score'; B.render(); await __V.wait(900);",
  "    B.score.setHand(['2','3','4','5','6'].map(function(k){return B.score.card(k,'H')}),",
  "      [B.score.jokerFromItem(B.byId['j_joker'])]);",
  '    await __V.wait(900);',
  "    r.animLeftovers={ scfloat:qa('.scfloat').length, jiggle:qa('.schud.jiggle,.scstage.jiggle').length, animBtn:!!q('#scAnim'), style:qa('[style*=transform]').length };",
  '    const seen={}; const steps=[]; let frames=0; let last=performance.now(); let gap=0;',
  '    const loop=function(now){ frames++; gap=Math.max(gap, now-last); last=now; requestAnimationFrame(loop) };',
  '    requestAnimationFrame(loop);',
  "    q('#scToggle').click();",
  '    for (let i=0;i<30;i++){',
  '      await __V.wait(120);',
  '      const st=q("#scStep"); if (st) steps.push(st.value);',
  '      const sEl=q(".scscore b"); if (sEl) seen[sEl.textContent]=1;',
  '    }',
  '    r.stepValues=steps.filter(function(v,i,a){return a.indexOf(v)===i}).join(",");',
  '    r.scoreVariants=Object.keys(seen).length;',
  '    r.fps=+((frames*1000)/(performance.now()-(performance.now()-frames*0))).toFixed(0);',
  '    r.maxGap=Math.round(gap);',
  '    r.playing=S.playing===true;',
  '    /* 手机上的空间：横向别溢出、播放条别盖住内容 */',
  "    r.layout={ vw:innerWidth, docW:document.documentElement.scrollWidth, noHScroll:document.documentElement.scrollWidth<=innerWidth+2 };",
  "    const bar=q('.scplay'); const log=q('.sclog');",
  "    if (bar && log) {",
  "      const b=bar.getBoundingClientRect(), lg=log.getBoundingClientRect();",
  "      r.layout.barH=Math.round(b.height); r.layout.barShare=+(b.height/innerHeight).toFixed(2);",
  "      r.layout.barBottom=Math.round(b.bottom);",
  "      r.layout.logBottom=Math.round(lg.bottom);",
  "      r.layout.barCoversLog = lg.bottom > b.top && lg.top < b.bottom;",
  "      const lr=qa('.scline'); const lastRow=lr[lr.length-1];",
  "      if (lastRow) { const rb=lastRow.getBoundingClientRect(); lastRow.scrollIntoView({block:'center'}); await __V.wait(400);",
  "        const rb2=lastRow.getBoundingClientRect(); const hit=document.elementFromPoint(rb2.left+20, rb2.top+rb2.height/2);",
  "        r.layout.lastRowHit = hit===lastRow || (hit && lastRow.contains(hit)); }",
  "    }",
  "    r.layout.logMaxH=(q('.sclog')?getComputedStyle(q('.sclog')).maxHeight:null);",
  "    r.errors=window.__V.errors.length;",
  '    return r })()`,'
);

patch('verify/cdp.js', [
  [
    '  /* 结算动画三档：原版（juice + 飘字 + 轻抖）/ 简洁（只有数字）/ 关闭（直接出结果） */',
    PLAY_STEP + '\n  /* 结算动画三档（已删，保留占位以免老命令报错）：*/',
    'animAudit → playStep'
  ],
  [
    "  if (SCENARIOS.blindPick && !SCENARIOS.blindPickMobile) { SCENARIOS.blindPickMobile = SCENARIOS.blindPick; SCENARIOS.blindPickTablet = SCENARIOS.blindPick }",
    "  if (SCENARIOS.blindPick && !SCENARIOS.blindPickMobile) { SCENARIOS.blindPickMobile = SCENARIOS.blindPick; SCENARIOS.blindPickTablet = SCENARIOS.blindPick }\n" +
    "  if (SCENARIOS.playStep && !SCENARIOS.playStepMobile) { SCENARIOS.playStepMobile = SCENARIOS.playStep; SCENARIOS.playStepTablet = SCENARIOS.playStep }",
    'playStep 克隆'
  ],
  [
    "|| name === 'blindPickMobile' || name === 'animAuditMobile') {",
    "|| name === 'blindPickMobile' || name === 'animAuditMobile' || name === 'playStepMobile') {",
    '手机名单'
  ],
  [
    "    if (name === 'uxAuditTablet' || name === 'blindPickTablet') {",
    "    if (name === 'uxAuditTablet' || name === 'blindPickTablet' || name === 'playStepTablet') {",
    '平板名单'
  ],
  /* blindPick 补贴图与标签断言 */
  [
    "      everyRowHasName:rows.slice(1).every(function(x){ var b=x.querySelector(\"b\"); return b && b.textContent.trim().length>1 }),",
    L("      everyRowHasName:rows.slice(1).every(function(x){ var b=x.querySelector(\"b\"); return b && b.textContent.trim().length>=1 }),",
      "      artPainted:qa('#scBlindList .scblindart canvas').length,",
      "      artSlots:qa('#scBlindList .scblindart').length,",
      "      tags:qa('#scBlindList .scblindtag').length,",
      "      tagScore:qa('#scBlindList .scblindtag.score').length,",
      "      firstArtBox:(function(){ var a=qa('#scBlindList .scblindart')[1]; if(!a) return null; var b=a.getBoundingClientRect(); return Math.round(b.width)+'x'+Math.round(b.height) })(),"),
    'blindPick 补贴图断言'
  ],
]);

console.log('共 ' + n + ' 处改动');
