/* 第三十一轮补丁 2：
   - 把 blindRules 暴露到 __BALATRO__.score（mod / 控制台登记自己盲注效果的入口）
   - siteRemember 场景补上"关闭按钮"的断言
   - 新增 blindAudit / playJuice 两个场景 */
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

patch('app.js', [
  [
    "      /* 调试/扫描用：某张牌的描述 HTML（含内联控件）与它的动态值清单 */",
    "      /* mod / 控制台登记自己盲注效果的入口：\n" +
    "         B.score.blindRules['bl_myboss'] = { halfBase: true, note: '…' } */\n" +
    "      blindRules: SC_BLIND_RULES_EXTRA, blindRulesBuiltin: SC_BLIND_RULES,\n" +
    "      blind: () => scBlindItem(), blindNote: () => scBlindNoteHtml(), debuffed: (c) => scCardDebuffed(c),\n" +
    "      /* 调试/扫描用：某张牌的描述 HTML（含内联控件）与它的动态值清单 */",
    '暴露 blindRules'
  ],
]);

const BLIND_AUDIT = [
  "  /* BOSS 盲注 + 被削弱的牌：声明式规则（mod 同样走这条）+ 代码规则 + 手动开关 */",
  "  blindAudit: `(async()=>{",
  "    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1200);",
  "    const q=(s)=>document.querySelector(s);",
  "    S.tab='score'; B.render(); await __V.wait(900);",
  "    const jokers=[B.score.jokerFromItem(B.byId['j_joker'])];",
  "    const setBlind=(v)=>{ const s=q('#scBlind'); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})) };",
  "    /* ① 五张梅花：选 The Club 后应当整张不参与算分 */",
  "    B.score.setHand(['2','3','4','5','6'].map((k)=>B.score.card(k,'C')), jokers); await __V.wait(900);",
  "    r.base=(()=>{const c=B.score.compute(); return {chips:c.chips, mult:c.mult, score:c.score}})();",
  "    setBlind('bl_club'); await __V.wait(900);",
  "    r.club=(()=>{const c=B.score.compute(); return {chips:c.chips, mult:c.mult, score:c.score,",
  "      debuffRows:c.rows.filter((x)=>x.op==='debuff').length, note:((q('#scBlindNote')||{}).textContent||'').slice(0,60)}})();",
  "    /* ② The Plant：人头牌被削弱 */",
  "    setBlind('bl_plant'); await __V.wait(700);",
  "    B.score.setHand(['J','Q','K','2','3'].map((k)=>B.score.card(k,'C')), jokers); await __V.wait(900);",
  "    r.plant=(()=>{const c=B.score.compute(); return {debuffRows:c.rows.filter((x)=>x.op==='debuff').length, chips:c.chips}})();",
  "    /* ③ The Arm：牌型等级 −1（先把等级调到 3） */",
  "    setBlind(''); await __V.wait(600);",
  "    const lv=q('#scLevel'); lv.value='3'; lv.dispatchEvent(new Event('input',{bubbles:true})); await __V.wait(700);",
  "    r.lvl3=(()=>{const c=B.score.compute(); return {lvl:c.lvl, chips:c.chips}})();",
  "    setBlind('bl_arm'); await __V.wait(800);",
  "    r.arm=(()=>{const c=B.score.compute(); return {lvl:c.lvl, chips:c.chips, hasRow:c.rows.some((x)=>/盲注/.test(x.label))}})();",
  "    /* ④ The Flint：基础筹码与倍率减半 */",
  "    setBlind('bl_flint'); await __V.wait(800);",
  "    r.flint=(()=>{const c=B.score.compute(); return {chips:c.chips, hasRow:c.rows.some((x)=>/Flint/.test(x.label))}})();",
  "    /* ⑤ Verdant Leaf：所有牌被削弱 */",
  "    setBlind('bl_final_leaf'); await __V.wait(800);",
  "    r.leaf=(()=>{const c=B.score.compute(); return {debuffRows:c.rows.filter((x)=>x.op==='debuff').length, chips:c.chips}})();",
  "    /* ⑥ 手动：卡牌弹窗里的「被削弱」胶囊 */",
  "    setBlind(''); await __V.wait(800);",
  "    const tile=q('#scPlayed .sctile');",
  "    if (tile) { tile.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})); await __V.wait(800) }",
  "    const pill=[].slice.call(document.querySelectorAll('#scPanel [data-pick=\"debuff\"]')).filter((e)=>/削弱/.test(e.textContent))[0];",
  "    r.cardPillFound=!!pill;",
  "    if (pill) { pill.click(); await __V.wait(800) }",
  "    const done=q('#scPanelDone'); if (done) { done.click(); await __V.wait(400) }",
  "    r.manualCard=(()=>{const c=B.score.compute(); return {cardDebuff:!!B.score.state.played[0].debuff, debuffRows:c.rows.filter((x)=>x.op==='debuff').length}})();",
  "    /* ⑦ 小丑牌弹窗里的「被禁用」胶囊 */",
  "    const jt=q('#scJokers .sctile');",
  "    if (jt) { jt.click(); await __V.wait(800) }",
  "    const jpill=[].slice.call(document.querySelectorAll('#scPanel [data-pick=\"debuff\"]')).filter((e)=>/被禁用/.test(e.textContent))[0];",
  "    r.jokerPillFound=!!jpill;",
  "    if (jpill) { jpill.click(); await __V.wait(800) }",
  "    const done2=q('#scPanelDone'); if (done2) { done2.click(); await __V.wait(400) }",
  "    r.manualJoker=(()=>{const c=B.score.compute(); return {jokerDebuff:!!B.score.state.jokers[0].debuff, debuffRows:c.rows.filter((x)=>x.op==='debuff').length}})();",
  "    /* ⑧ mod 路径：塞一个只有数据声明的盲注（没有任何代码改动），它应该自动出现在下拉里并生效 */",
  "    B.items.push({ id:'bl_test_x', key:'bl_test_x', cat:'Blind', set:'Blind', name:'Test Boss',",
  "      i18n:{'en-us':'Test Boss', zh_CN:'测试盲注'}, text:{'en-us':['All Hearts are debuffed'], zh_CN:['所有红桃牌都被削弱']},",
  "      raw:{ boss:true, debuff:{ suit:'Hearts' } }, source:'testmod', sourceName:'TestMod' });",
  "    S.tab='codex'; B.render(); await __V.wait(600); S.tab='score'; B.render(); await __V.wait(900);",
  "    r.modBlindListed=[].slice.call(q('#scBlind').options).some((o)=>o.value==='bl_test_x');",
  "    B.score.setHand(['2','3','2','3','4'].map((k,i)=>B.score.card(k, i<2?'H':'S')), jokers); await __V.wait(900);",
  "    const beforeMod=B.score.compute();",
  "    setBlind('bl_test_x'); await __V.wait(900);",
  "    r.modBlind=(()=>{const c=B.score.compute(); return {debuffRows:c.rows.filter((x)=>x.op==='debuff').length, before:beforeMod.chips, after:c.chips}})();",
  "    /* ⑨ 扩展钩子：mod 自己登记代码效果（这里模拟 halfBase） */",
  "    B.score.blindRules['bl_test_x']={ halfBase:true, note:'测试：基础减半' };",
  "    setBlind(''); await __V.wait(600); setBlind('bl_test_x'); await __V.wait(900);",
  "    r.hook=(()=>{const c=B.score.compute(); return {hasRow:c.rows.some((x)=>/减半/.test(x.label)), chips:c.chips}})();",
  "    r.errors=window.__V.errors.length;",
  "    return r })()`,",
].join('\n');

const PLAY_JUICE = [
  "  /* 播放动画：帧率 / 长任务 / 数字确实在滚动 */",
  "  playJuice: `(async()=>{",
  "    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1200);",
  "    S.tab='score'; B.render(); await __V.wait(900);",
  "    B.score.setHand(['2','3','4','5','6'].map((k)=>B.score.card(k,'H')),",
  "      [B.score.jokerFromItem(B.byId['j_joker']), B.score.jokerFromItem(B.byId['j_steel_joker'])]);",
  "    await __V.wait(900);",
  "    const frames=[]; const gaps=[]; let last=performance.now(); let stop=false; const t0=last;",
  "    const loop=(now)=>{ frames.push(now); gaps.push(now-last); last=now; if(!stop) requestAnimationFrame(loop) };",
  "    requestAnimationFrame(loop);",
  "    const scoreEl=document.querySelector('.scscore b');",
  "    const seen={};",
  "    document.querySelector('#scToggle').click();",
  "    for (let i=0;i<42;i++){ await __V.wait(100); if(scoreEl) seen[scoreEl.textContent]=(seen[scoreEl.textContent]||0)+1 }",
  "    stop=true;",
  "    const total=performance.now()-t0;",
  "    const sorted=gaps.slice(1).sort((a,b)=>b-a);",
  "    r.fps=+(frames.length/(total/1000)).toFixed(1);",
  "    r.maxGap=Math.round(sorted[0]||0);",
  "    r.p95Gap=Math.round(sorted[Math.floor(sorted.length*0.05)]||0);",
  "    r.distinctScoreTexts=Object.keys(seen).length;",
  "    r.scoreText=(scoreEl||{}).textContent||null;",
  "    r.stepShown=(document.querySelector('#scStep')||{}).value;",
  "    r.highlight=document.querySelectorAll('#scJokers .sctile.on, #scHand .sctile.on, #scPlayed .sctile.on').length;",
  "    r.popClass=!!document.querySelector('.scchips b.pop, .scmult b.pop, .scscore b.pop');",
  "    r.playing=B.score.state.playing===true;",
  "    r.errors=window.__V.errors.length;",
  "    return r })()`,",
].join('\n');

patch('verify/cdp.js', [
  [
    "  /* 全量扫描：① 描述里有动态值的牌是否都给出了内联控件  ② 哪些条目缺中文 */",
    BLIND_AUDIT + "\n" + PLAY_JUICE + "\n" +
    "  /* 全量扫描：① 描述里有动态值的牌是否都给出了内联控件  ② 哪些条目缺中文 */",
    '新增 blindAudit / playJuice 场景'
  ],
  [
    "    r.hasClearBtn=!!__V.byText('.bootcacheacts .btn','清除已存素材');",
    "    r.hasClearBtn=!!__V.byText('.bootcacheacts .btn','清除已存素材');\n" +
    "    /* 关闭按钮：点一下这条提示就没了（用户报过它自己不会关） */\n" +
    "    r.hasCloseBtn=!!document.querySelector('.bootcachex');\n" +
    "    r.barBeforeClose=!!document.querySelector('.bootcache');\n" +
    "    const x=document.querySelector('.bootcachex');\n" +
    "    if(x){ x.click(); await __V.wait(700) }\n" +
    "    r.barAfterClose=!!document.querySelector('.bootcache');\n" +
    "    r.cacheKeptAfterClose=(()=>{ try { return !!document.querySelector('#boot') } catch(e){ return null } })();",
    'siteRemember 断言关闭按钮'
  ],
]);

console.log('共 ' + n + ' 处改动');
