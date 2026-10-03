/* 第三十七轮 B：
   ② 「做什么」+「长什么样」合并；③ 类型专属字段界面；④ 描述预览框；⑤ 类型专属 Lua；⑥ 真实 GIF 的端到端测试 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const rep = (text, from, to, label) => {
  const hits = text.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  console.log('  ✓ ' + label); n++;
  return text.replace(from, () => to);
};

/* ---------- app.js：合并两段 + 类型字段 + 描述框 + 类型专属 Lua ---------- */
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');

/* ② 把「长什么样」的内容并进「① 做什么」那一段 */
s = rep(s,
  "    right.appendChild(sec('① 做什么', b, 'type').box);",
  L("    const secType = sec('① 做什么（也决定预览长什么样）', b, 'type');",
    "    right.appendChild(secType.box);",
    "    window.__mkTypeBody = secType.body;   /* 「长什么样」并进这一段 */"),
  '合并段落（占位）');

s = rep(s,
  "    right.appendChild(sec('② 长什么样', b, 'art').box);",
  L("    right.appendChild((function () {",
    "      const box = document.createElement('div');",
    "      box.className = 'mkartwrap';",
    "      box.innerHTML = '<div class=\"mklabel\">贴图（点格子换图，或上传自己的图）</div>';",
    "      box.appendChild(b);",
    "      const host = window.__mkTypeBody || right;",
    "      host.appendChild(box);",
    "      return document.createElement('span');",
    "    })());"),
  '「长什么样」并进①');

/* ③ 类型专属字段：接在贴图之后 */
s = rep(s,
  "    right.appendChild((function () {",
  L("    /* 类型专属字段（盲注的底注与削弱、补充包的张数、牌组的起手配置…） */",
    "    if (MK_TYPE_FIELDS[MK.type]) {",
    "      const box = document.createElement('div'); box.className = 'mktfields';",
    "      box.innerHTML = '<div class=\"mklabel\">这个类型专属的设置</div><div class=\"mkrow\" id=\"mkTFields\"></div>';",
    "      (window.__mkTypeBody || right).appendChild(box);",
    "      const wrap = box.querySelector('#mkTFields');",
    "      MK_TYPE_FIELDS[MK.type].forEach((f) => {",
    "        const [key, label, kind, opt] = f;",
    "        const cur = MK.t[key] !== undefined ? MK.t[key] : opt;",
    "        const lab = document.createElement('label');",
    "        lab.innerHTML = '<span>' + label + '</span>';",
    "        if (kind === 'num') {",
    "          const inp = document.createElement('input'); inp.className = 'tbtn mkn'; inp.type = 'number'; inp.step = '0.5'; inp.value = cur;",
    "          inp.oninput = () => { MK.t[key] = Number(inp.value) || 0; mkRefreshLuaAndPreview(); const d = document.querySelector('#mkDesc'); if (d) d.innerHTML = mkDescHtml() };",
    "          lab.appendChild(inp);",
    "        } else if (kind === 'bool') {",
    "          const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!cur;",
    "          inp.onchange = () => { MK.t[key] = inp.checked; mkRefreshLuaAndPreview(); const d = document.querySelector('#mkDesc'); if (d) d.innerHTML = mkDescHtml() };",
    "          lab.classList.add('mkck'); lab.appendChild(inp);",
    "        } else if (kind === 'sel') {",
    "          const sel2 = document.createElement('select'); sel2.className = 'tbtn';",
    "          sel2.innerHTML = opt.map((o) => '<option value=\"' + o[0] + '\"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('');",
    "          sel2.onchange = () => { MK.t[key] = sel2.value; mkRefreshLuaAndPreview() };",
    "          lab.appendChild(sel2);",
    "        } else {",
    "          const p = document.createElement('span'); p.className = 'hint'; p.textContent = opt;",
    "          lab.classList.add('mkwide'); lab.appendChild(p);",
    "        }",
    "        wrap.appendChild(lab);",
    "      });",
    "    }",
    "    right.appendChild((function () {"),
  '类型字段界面');

/* ④ 描述预览框（放在效果行下面） */
s = rep(s,
  "    const addRow = document.createElement('div'); addRow.className = 'mkbtnrow';",
  L("    const descBox = document.createElement('div'); descBox.className = 'mkdescbox';",
    "    descBox.innerHTML = '<div class=\"mklabel\">游戏里会显示成（跟着上面的选择实时变）</div><div class=\"mkdesc\" id=\"mkDesc\">' + mkDescHtml() + '</div>';",
    "    b.appendChild(descBox);",
    "    const addRow = document.createElement('div'); addRow.className = 'mkbtnrow';"),
  '描述预览框');
s = rep(s,
  "      mkRefreshLuaAndPreview();\n      const sum = document.querySelector('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml();",
  L("      mkRefreshLuaAndPreview();",
    "      const sum = document.querySelector('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml();",
    "      const d = document.querySelector('#mkDesc'); if (d) d.innerHTML = mkDescHtml();"),
  '输入时刷新描述');

/* ⑤ 类型专属 Lua */
s = rep(s,
  "  } else {\n    const cls = t[2];",
  L("  } else if (MK.type === 'Blind') {",
    "    const t2 = MK.t;",
    "    L.push('SMODS.Blind {');",
    "    L.push(\"    key = '\" + key + \"',\");",
    "    L.push.apply(L, loc);",
    "    L.push('    boss = { min = ' + (t2.boss_min || 1) + ', max = ' + (t2.boss_max || 10) + ' },');",
    "    L.push('    mult = ' + (t2.blind_mult || 2) + ',');",
    "    L.push('    dollars = ' + (t2.blind_dollars || 5) + ',');",
    "    L.push('    atlas = \\'sheet\\',');",
    "    L.push('    pos = { x = 0, y = 0 },');",
    "    const db = [];",
    "    if (t2.debuff_suit) db.push(\"suit = '\" + t2.debuff_suit + \"'\");",
    "    if (t2.debuff_face) db.push(\"is_face = 'face'\");",
    "    L.push('    debuff = { ' + db.join(', ') + ' },   -- 声明式削弱：图鉴与本页都会按它算');",
    "    L.push('    loc_debuff_text = { \\'\\' },');",
    "    L.push('    unlocked = true,');",
    "    L.push('    discovered = true');",
    "    L.push('}');",
    "  } else if (MK.type === 'Booster') {",
    "    const t2 = MK.t;",
    "    L.push('SMODS.Booster {');",
    "    L.push(\"    key = '\" + key + \"',\");",
    "    L.push.apply(L, loc);",
    "    L.push(\"    kind = '\" + (t2.kind || 'Arcana') + \"',\");",
    "    L.push('    config = { choose = ' + (t2.choose || 1) + ', extra = ' + (t2.extra || 3) + ' },');",
    "    L.push('    cost = ' + (t2.cost || 4) + ',');",
    "    L.push(\"    atlas = 'sheet',\");",
    "    L.push('    pos = { x = 0, y = 0 },');",
    "    L.push('    unlocked = true,');",
    "    L.push('    discovered = true');",
    "    L.push('}');",
    "  } else if (MK.type === 'Back') {",
    "    const t2 = MK.t;",
    "    L.push('SMODS.Back {');",
    "    L.push(\"    key = '\" + key + \"',\");",
    "    L.push.apply(L, loc);",
    "    L.push('    config = {');",
    "    L.push('        hand_size = ' + (t2.hand_size || 8) + ',');",
    "    L.push('        hands = ' + (t2.hands || 4) + ',');",
    "    L.push('        discards = ' + (t2.discards || 3) + ',');",
    "    L.push('        dollars = ' + (t2.dollars || 4) + ',');",
    "    L.push('        joker_slot = ' + (t2.joker_slot || 5) + ',');",
    "    L.push('        consumable_slot = ' + (t2.consumable_slot || 2));",
    "    L.push('    },');",
    "    L.push(\"    atlas = 'sheet',\");",
    "    L.push('    pos = { x = 0, y = 0 },');",
    "    L.push('    unlocked = true,');",
    "    L.push('    discovered = true');",
    "    L.push('}');",
    "  } else if (MK.type === 'Tag') {",
    "    const t2 = MK.t;",
    "    L.push('SMODS.Tag {');",
    "    L.push(\"    key = '\" + key + \"',\");",
    "    L.push.apply(L, loc);",
    "    L.push(\"    atlas = 'sheet',\");",
    "    L.push('    pos = { x = 0, y = 0 },');",
    "    L.push('    config = { ' + (t2.tag_kind || 'dollars') + ' = ' + (t2.tag_val || 5) + ' },');",
    "    L.push('    apply = function(self, tag, context)');",
    "    L.push('        if context.type == \\'immediate\\' then');",
    "    if ((t2.tag_kind || 'dollars') === 'dollars') L.push('            ease_dollars(' + (t2.tag_val || 5) + ')');",
    "    else if ((t2.tag_kind || '') === 'tarot' || (t2.tag_kind || '') === 'planet') L.push(\"            local c = create_card('\" + (t2.tag_kind === 'tarot' ? 'Tarot' : 'Planet') + \"', G.play); c:add_to_deck(); G.consumeables:emplace(c)\");",
    "    else L.push('            G.GAME.round_resets.free_rerolls = (G.GAME.round_resets.free_rerolls or 0) + ' + (t2.tag_val || 1));",
    "    L.push('            tag:yep(\\'+\\', G.C.GOLD)');",
    "    L.push('            return true');",
    "    L.push('        end');",
    "    L.push('    end');",
    "    L.push('}');",
    "  } else if (MK.type === 'Enhanced' || MK.type === 'Edition') {",
    "    const t2 = MK.t;",
    "    L.push('SMODS.' + (MK.type === 'Enhanced' ? 'Enhancement' : 'Edition') + ' {');",
    "    L.push(\"    key = '\" + key + \"',\");",
    "    L.push.apply(L, loc);",
    "    L.push('    config = { ' + ['chips', 'mult', 'xmult'].filter((k) => Number(t2[k])).map((k) => (k === 'xmult' ? 'x_mult' : k) + ' = ' + t2[k]).join(', ') + ' },');",
    "    L.push(\"    atlas = 'sheet',\");",
    "    L.push('    pos = { x = 0, y = 0 },');",
    "    L.push('    unlocked = true,');",
    "    L.push('    discovered = true');",
    "    L.push('}');",
    "  } else if (MK.type === 'Seal') {",
    "    L.push('-- 蜡封本身没有数值字段：它的效果写在卡牌被它影响时的逻辑里');",
    "    L.push('SMODS.Seal {');",
    "    L.push(\"    key = '\" + key + \"',\");",
    "    L.push.apply(L, loc);",
    "    L.push(\"    atlas = 'sheet',\");",
    "    L.push('    pos = { x = 0, y = 0 }');",
    "    L.push('}');",
    "  } else {\n    const cls = t[2];"),
  '类型专属 Lua');

/* 优惠券也给一点成品感：把效果写进 redeem */
s = rep(s,
  "    if (MK.type === 'Voucher') L.push('    cost = ' + MK.cost + ',');",
  L("    if (MK.type === 'Voucher') {",
    "      L.push('    cost = ' + MK.cost + ',');",
    "      const t2 = MK.t;",
    "      L.push('    redeem = function(self, card)');",
    "      if ((t2.voucher_kind || 'none') === 'dollars') L.push('        ease_dollars(' + (t2.voucher_val || 10) + ')');",
    "      else if ((t2.voucher_kind || '') === 'handsize') L.push('        G.hand:change_size(1)');",
    "      else if ((t2.voucher_kind || '') === 'discards') L.push('        G.GAME.round_resets.discards = G.GAME.round_resets.discards + 1');",
    "      else if ((t2.voucher_kind || '') === 'slot') L.push('        G.jokers.config.card_limit = (G.jokers.config.card_limit or 5) + 1');",
    "      else L.push('        -- 想做点什么就改这里');",
    "      L.push('    end,');",
    "    }"),
  '优惠券 redeem');

fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动（app.js）');

/* ---------- 场景：真实 GIF 的端到端测试 ---------- */
const CDP = path.join(__dirname, 'verify', 'cdp.js');
let cdp = fs.readFileSync(CDP, 'utf8').replace(/\r\n/g, '\n');
cdp = rep(cdp,
  '  /* Mod 制作器：做一张小丑牌 → 打包 → 用图鉴自己的解析器再导入一遍（端到端） */',
  L('  /* 真实 GIF 上传：拆帧 → 预览会动 → 导出横向帧序列（driver 会把桌面那张 gif 塞进 #mkUpload） */',
    '  mkGif: `(async()=>{',
    '    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1600);',
    "    S.tab='maker'; B.render(); await __V.wait(900);",
    "    r.hasInput=!!document.querySelector('#mkUpload');",
    '    const before=B.maker.state.art && B.maker.state.art.frames ? B.maker.state.art.frames.length : 0;',
    '    for (let i=0;i<60 && (!B.maker.state.art.frames);i++) await __V.wait(200);',
    '    const st=B.maker.state.art;',
    '    r.frames=st.frames?st.frames.length:0; r.name=st.uploadName; r.animated=!!st.animated;',
    '    /* 预览是否真的在动：隔 400ms 抓两次画布像素哈希 */',
    '    const hash=()=>{ const cv=document.querySelector(".mkpvbox canvas"); if(!cv) return null; const c2=cv.getContext("2d");',
    '      const d=c2.getImageData(0,0,cv.width,cv.height).data; let h=0; for(let i=0;i<d.length;i+=97) h=(h*31+d[i])>>>0; return h };',
    '    const h1=hash(); await __V.wait(400); const h2=hash(); await __V.wait(400); const h3=hash();',
    '    r.previewChanges=(h1!==h2)||(h2!==h3); r.hashes=[h1,h2,h3];',
    '    const files=await B.maker.files();',
    '    const png=files.filter(function(f){return f.name==="assets/2x/sheet.png"})[0];',
    '    r.sheetWidth=png?(png.data[16]*16777216+png.data[17]*65536+png.data[18]*256+png.data[19]):0;',
    '    r.expectWidth=142*Math.max(1,r.frames);',
    '    r.framesInLua=B.maker.lua().indexOf("frames = "+r.frames)>=0;',
    '    r.errors=window.__V.errors.length;',
    '    return r })()`,'
  ),
  'mkGif 场景');

/* driver：把桌面的 gif 塞进上传框 */
cdp = rep(cdp,
  "    if (name === 'liveBoot' || name === 'siteFontLive') {",
  L("    if (name === 'mkGif') {",
    "      /* 走的就是访客点在「上传自己的图」上那条路：真的把文件交给 input */",
    "      await c.send('Page.navigate', { url: PAGE }).catch(() => {})",
    "      await sleep(2200)",
    "      await c.eval(HELPERS)",
    "      await c.eval(\"(()=>{const B=window.__BALATRO__; B.state.tab='maker'; B.render(); return 1})()\")",
    "      await sleep(1200)",
    "      const gif = process.env.MK_GIF || 'C:/Users/18878/Desktop/2ab90f8671834c56befd349c4ba69b81.gif'",
    "      if (!fs.existsSync(gif)) console.log('❌ 找不到测试用的 GIF: ' + gif)",
    "      else console.log('             把 ' + path.basename(gif) + ' 交给 #mkUpload（' + (fs.statSync(gif).size / 1024).toFixed(0) + ' KB）')",
    "      const doc0 = await c.send('DOM.getDocument', { depth: -1 })",
    "      const inp0 = await c.send('DOM.querySelector', { nodeId: doc0.root.nodeId, selector: '#mkUpload' })",
    "      if (inp0 && inp0.nodeId && fs.existsSync(gif)) await c.send('DOM.setFileInputFiles', { files: [gif], nodeId: inp0.nodeId })",
    "      await sleep(1500)",
    "    }",
    "    if (name === 'liveBoot' || name === 'siteFontLive') {"),
  'driver：真实 GIF 注入');

/* 注册进手机/平板名单要放在 body 里（这里只注册桌面即可，手机另跑 modMaker） */
fs.writeFileSync(CDP, cdp);
console.log('共 ' + n + ' 处改动（含场景）');
