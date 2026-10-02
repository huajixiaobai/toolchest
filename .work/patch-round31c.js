/* 第三十一轮补丁 3：
   - scBlindItem 在 BY_ID 里找不到时回退搜 ITEMS（mod 运行期新增条目也能选）
   - 盲注说明：游戏自己的描述已经写了就不重复列 spec 注解
   - playJuice 场景修正取样方式（render 会重建 DOM，必须每次重新取元素） */
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
    "function scBlindItem () { return SC.blind ? BY_ID[SC.blind] : null }",
    "function scBlindItem () {\n" +
    "  if (!SC.blind) return null;\n" +
    "  /* BY_ID 是加载时建好的索引；运行期新加的条目（比如刚导入的 mod）可能还没进去，回退搜一遍 */\n" +
    "  return BY_ID[SC.blind] || ITEMS.find((i) => i.id === SC.blind) || null;\n" +
    "}",
    '盲注条目查找回退'
  ],
  [
    "  const bits = [];\n  if (desc) bits.push(desc);\n  if (spec.suit) bits.push('所有' + scSuitName(spec.suit) + '牌被削弱');\n" +
    "  if (spec.is_face === 'face') bits.push('所有人头牌（J/Q/K）被削弱');\n" +
    "  if (spec.value) bits.push('点数 ' + spec.value + ' 的牌被削弱');\n" +
    "  if (spec.nominal) bits.push('点数 ' + spec.nominal + ' 的牌被削弱');\n" +
    "  if (spec.h_size_ge) bits.push('必须打出至少 ' + spec.h_size_ge + ' 张牌');\n" +
    "  if (spec.h_size_le) bits.push('最多打出 ' + spec.h_size_le + ' 张牌');\n",
    "  const bits = [];\n  if (desc) bits.push(desc);\n" +
    "  /* 游戏自己的描述已经写了就不重复（例如 The Club 的「所有梅花牌都被削弱」） */\n" +
    "  if (!desc && spec.suit) bits.push('所有' + scSuitName(spec.suit) + '牌被削弱');\n" +
    "  if (!desc && spec.is_face === 'face') bits.push('所有人头牌（J/Q/K）被削弱');\n" +
    "  if (!desc && spec.value) bits.push('点数 ' + spec.value + ' 的牌被削弱');\n" +
    "  if (!desc && spec.nominal) bits.push('点数 ' + spec.nominal + ' 的牌被削弱');\n" +
    "  if (spec.h_size_ge) bits.push('必须打出至少 ' + spec.h_size_ge + ' 张牌');\n" +
    "  if (spec.h_size_le) bits.push('最多打出 ' + spec.h_size_le + ' 张牌');\n",
    '说明不重复'
  ],
]);

patch('verify/cdp.js', [
  [
    "    const scoreEl=document.querySelector('.scscore b');\n" +
    "    const seen={};\n" +
    "    document.querySelector('#scToggle').click();\n" +
    "    for (let i=0;i<42;i++){ await __V.wait(100); if(scoreEl) seen[scoreEl.textContent]=(seen[scoreEl.textContent]||0)+1 }\n" +
    "    stop=true;\n" +
    "    const total=performance.now()-t0;\n" +
    "    const sorted=gaps.slice(1).sort((a,b)=>b-a);\n" +
    "    r.fps=+(frames.length/(total/1000)).toFixed(1);\n" +
    "    r.maxGap=Math.round(sorted[0]||0);\n" +
    "    r.p95Gap=Math.round(sorted[Math.floor(sorted.length*0.05)]||0);\n" +
    "    r.distinctScoreTexts=Object.keys(seen).length;\n" +
    "    r.scoreText=(scoreEl||{}).textContent||null;",
    "    const seen={}; let popSeen=false; let chipsSeen={};\n" +
    "    document.querySelector('#scToggle').click();\n" +
    "    /* 每一步都会 render()（重建 DOM），所以取样时必须重新查元素 */\n" +
    "    for (let i=0;i<32;i++){\n" +
    "      await __V.wait(90);\n" +
    "      const sEl=document.querySelector('.scscore b');\n" +
    "      if (sEl) seen[sEl.textContent]=(seen[sEl.textContent]||0)+1;\n" +
    "      const cEl=document.querySelector('.scchips b');\n" +
    "      if (cEl) chipsSeen[cEl.textContent]=(chipsSeen[cEl.textContent]||0)+1;\n" +
    "      if (document.querySelector('.scchips b.pop, .scmult b.pop, .scscore b.pop')) popSeen=true;\n" +
    "    }\n" +
    "    stop=true;\n" +
    "    const total=performance.now()-t0;\n" +
    "    const sorted=gaps.slice(1).sort((a,b)=>b-a);\n" +
    "    r.fps=+(frames.length/(total/1000)).toFixed(1);\n" +
    "    r.maxGap=Math.round(sorted[0]||0);\n" +
    "    r.p95Gap=Math.round(sorted[Math.floor(sorted.length*0.05)]||0);\n" +
    "    r.distinctScoreTexts=Object.keys(seen).length;\n" +
    "    r.distinctChipsTexts=Object.keys(chipsSeen).length;\n" +
    "    r.popSeenDuringPlay=popSeen;\n" +
    "    r.scoreText=(document.querySelector('.scscore b')||{}).textContent||null;",
    '播放取样方式修正'
  ],
  [
    "    r.popClass=!!document.querySelector('.scchips b.pop, .scmult b.pop, .scscore b.pop');\n    r.playing=B.score.state.playing===true;",
    "    r.popClassNow=!!document.querySelector('.scchips b.pop, .scmult b.pop, .scscore b.pop');\n    r.playing=B.score.state.playing===true;",
    'popClass 改名'
  ],
]);

console.log('共 ' + n + ' 处改动');
