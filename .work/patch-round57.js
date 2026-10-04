/* 第五十七轮（目标②）：克隆要把「那张牌的专属内容」搬过来
   现状：MK_TYPE_FIELDS 每种类型都有字段组，UI 从 MK.t[key] 取值 —— 缺的是**克隆时根本不往 t 里写**，
   所以照一张原版盲注/补充包/牌组做完，专属设置还是空默认值。
   原则：能读到的才搬，读不到的留默认（不编）。
   顺带把 applyClone / itemsByCat 暴露给测试脚本，好按类型真的验证一遍。 */
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
  rep(
    "  const zh2 = (it.text && it.text.zh_CN) || [];",
    L('  /* ② 把这张牌的专属内容搬进 MK.t（该类型的字段组直接读它）—— 能读到才搬，读不到留默认，不编 */',
      '  const t2 = Object.assign({}, MK.t);',
      '  const cfgx = Object.assign({}, (it.config || {}), ((it.config && it.config.extra) || {}));',
      '  const rawx = it.raw || {};',
      '  let setOut = MK.set;',
      "  if (it.cat === 'Tarot' || it.cat === 'Planet' || it.cat === 'Spectral') setOut = it.cat;",
      "  if (typeOut === 'Blind') {",
      '    const boss = rawx.boss || (it.config && it.config.boss) || {};',
      '    if (typeof boss.min === \'number\') t2.boss_min = boss.min;',
      '    if (typeof boss.max === \'number\') t2.boss_max = boss.max;',
      '    if (typeof cfgx.mult === \'number\') t2.blind_mult = cfgx.mult;',
      '    if (typeof cfgx.dollars === \'number\') t2.blind_dollars = cfgx.dollars;',
      '    const db = (it.config && it.config.debuff) || rawx.debuff || {};',
      '    if (db && db.suit) t2.debuff_suit = db.suit;',
      '    if (db && db.is_face) t2.debuff_face = true;',
      "  } else if (typeOut === 'Booster') {",
      '    const kk = rawx.kind || cfgx.kind;',
      '    if (kk) t2.kind = kk;',
      '    if (typeof cfgx.choose === \'number\') t2.choose = cfgx.choose;',
      '    if (typeof cfgx.extra === \'number\') t2.extra = cfgx.extra;',
      "  } else if (typeOut === 'Back') {",
      "    ['hand_size', 'hands', 'discards', 'dollars', 'joker_slot', 'consumable_slot', 'joker_slots'].forEach((k) => {",
      '      const v = (typeof cfgx[k] === \'number\') ? cfgx[k] : (typeof rawx[k] === \'number\' ? rawx[k] : null);',
      "      if (typeof v === 'number') t2[(k === 'joker_slots' ? 'joker_slot' : k)] = v;",
      '    });',
      "  } else if (typeOut === 'Voucher') {",
      "    if (typeof cfgx.voucher_val === 'number') t2.voucher_val = cfgx.voucher_val;",
      '  }',
      '  /* 兜底：config 里的数字 / 字符串 / 开关，同名键原样搬进 t（UI 里同名键会直接显示出来） */',
      '  Object.keys(cfgx).forEach((k) => {',
      "    const v = cfgx[k];",
      "    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') { if (t2[k] === undefined) t2[k] = v }",
      '  });',
      '  const tCount = Object.keys(t2).length;',
      "  const zh2 = (it.text && it.text.zh_CN) || [];"),
    '克隆时搬专属内容进 t'
  )
  /* typeOut 变量（mkSet 里用的是表达式，这里先算出来复用） */
  rep(
    "    cloneFrom: it.id,\n    type: it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat),",
    "    cloneFrom: it.id,\n    type: typeOut,",
    'mkSet 用算好的 typeOut'
  )
  rep(
    "  const push2 = (when, kind, v) => { if (v) effects.push({ when: when, cond: cond2, condVal: condVal2, eff: kind, val: v }) };",
    L("  const push2 = (when, kind, v) => { if (v) effects.push({ when: when, cond: cond2, condVal: condVal2, eff: kind, val: v }) };",
      "  const typeOut = it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat);"),
    '算 typeOut'
  )
  rep(
    '    effects: effects.length ? effects : MK.effects,\n  });\n  return effects.length ? effects.length : 0;',
    '    effects: effects.length ? effects : MK.effects,\n    set: setOut,\n    t: t2,\n  });\n  return { effects: effects.length, tKeys: tCount };',
    'mkSet 写回 set/t'
  )
  rep(
    "      const cnt = mkApplyCloneFrom(mate.id);\n            status('已照「' + nm(mate, 'zh_CN') + '」做了一份：图、名字、原文、数值都进来了' + (cnt ? '（' + cnt + ' 条效果）' : '（这张牌的效果没法自动拆成数值，原文已放进描述，请自己挑一条效果）') + ' —— 想只换图就按住 Shift 点同一格。', 'ok');",
    "      const rr2 = mkApplyCloneFrom(mate.id);\n            status('已照「' + nm(mate, 'zh_CN') + '」做了一份：图、名字、原文、数值都进来了（' + rr2.effects + ' 条效果 / ' + rr2.tKeys + ' 项专属设置）' + (rr2.effects ? '' : '，这张牌的效果没法自动拆成数值，请在「它做什么」里挑一条') + ' —— 想只换图就按住 Shift 点同一格。', 'ok');",
    '格子提示带上项数'
  )
  /* 暴露给测试 */
  rep(
    'project: MKR, addItem: mkAddItem,',
    'project: MKR, addItem: mkAddItem, applyClone: (id) => mkApplyCloneFrom(id), itemsByCat: (cat) => ITEMS.filter((i) => i.cat === cat).map((i) => i.id),',
    '暴露 applyClone / itemsByCat'
  )
  fs.writeFileSync(F, s)
  const b = fs.readFileSync(F, 'utf8')
  const must = ['applyClone: (id) => mkApplyCloneFrom(id)', 't: t2,', 'const typeOut =', 'set: setOut,']
  const miss = must.filter((m) => b.indexOf(m) < 0)
  console.log(miss.length ? '  ❌ 写回后找不到：' + miss.join(' | ') : '  ✓ 写回校验：' + must.length + ' 个标识都在')
}

/* ---------- ② cdp.js：按类型真的克隆一张原版牌，断言专属字段进去了、并且能改 ---------- */
{
  const F = path.join(__dirname, 'verify', 'cdp.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const from = '    r.errText=document.body.innerText.indexOf("出错")>=0;'
  if (s.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
  s = s.replace(from, () => [
    '    /* ② 克隆要把专属内容搬过来：每种类型都真的选一张原版牌试 */',
    '    r.cloneByType=[];',
    '    const TYPES2=[["Joker","Joker"],["Consumable","Tarot"],["Consumable","Planet"],["Voucher","Voucher"],["Booster","Booster"],["Back","Back"],["Blind","Blind"],["Tag","Tag"]];',
    '    for (const pair of TYPES2) {',
    '      const ty=pair[0], cat=pair[1];',
    '      const ids=B.maker.itemsByCat(cat);',
    '      if(!ids.length){ r.cloneByType.push({type:ty,cat:cat,none:true}); continue }',
    '      B.maker.select(0); B.maker.typeChip(ty); await __V.wait(200);',
    '      const res=B.maker.applyClone(ids[0]); await __V.wait(400);',
    '      const st=B.maker.state;',
    '      const lua=B.maker.lua();',
    '      r.cloneByType.push({ type:ty, cat:cat, id:ids[0], effects:res?res.effects:null, tKeys:res?res.tKeys:null,',
    '        tSample:JSON.stringify(st.t).slice(0,120), nameZh:st.nameZh, cost:st.cost,',
    '        luaHasCost:lua.indexOf("cost = "+st.cost)>=0 });',
    '    }',
  ].join('\n') + '\n' + from)
  fs.writeFileSync(F, s)
  console.log('  ✓ 场景补按类型克隆断言'); n++
}
console.log('共 ' + n + ' 处')
