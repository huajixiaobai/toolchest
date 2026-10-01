/* 3/3 — wire the remaining forge groups into the collapse machinery, add mod badges, make the
   summary mod-aware, and give the codex a one-tap way back to "all sources". */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

/* ------------------------------------------------ sticker colour list */
rep('app.js',
  `/* ---------------------------------------------------------------- forge */`,
  `/* ---------------------------------------------------------------- forge */
/** The eight coloured stake stickers (they all share one sprite sheet position family). */
const STICKER_COLORS = ['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'].map((k) => ({ key: k }));`,
  'STICKER_COLORS')

rep('app.js',
  `  for (const c of ['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold']) mkColor(c, c);`,
  `  for (const c of STICKER_COLORS) mkColor(c.key, c.key);`,
  'use STICKER_COLORS')

/* ------------------------------------------------ mod badge on forge chips */
rep('app.js',
  `        const s = document.createElement('span'); s.textContent = nm(it); b.appendChild(s);
        const v = valueOf(it);`,
  `        const s = document.createElement('span'); s.textContent = nm(it); b.appendChild(s);
        if (it.source) {
          const md = document.createElement('i'); md.className = 'pickmod'; md.textContent = 'MOD';
          md.title = it.sourceName || it.source;
          b.appendChild(md);
        }
        const v = valueOf(it);`,
  'mod badge on chips')

/* ------------------------------------------------ base type section */
rep('app.js',
  `  const gBaseType = document.createElement('div'); gBaseType.className = 'opt';
  gBaseType.innerHTML = '<h4>牌型</h4>';
  const typeSel = document.createElement('select'); typeSel.className = 'tbtn'; typeSel.style.width = '100%';
  for (const t of FORGE_TYPES) { const o = document.createElement('option'); o.value = t.id; o.textContent = t.label; typeSel.appendChild(o); }
  typeSel.value = S.forge.baseType;
  gBaseType.appendChild(typeSel);
  const baseSearch = document.createElement('input');
  baseSearch.className = 'tbtn'; baseSearch.placeholder = '筛选…（名称 / id）';
  baseSearch.style.cssText = 'width:100%;margin-top:8px;padding:5px 8px';
  gBaseType.appendChild(baseSearch);
  const baseHint = document.createElement('div'); baseHint.className = 'hint';
  gBaseType.appendChild(baseHint);
  right.appendChild(gBaseType);

  const gBase = group('主体', [], () => S.forge.base, (v) => { S.forge.base = v; }, { key: null });
  gBase.box.querySelector('h4').textContent = '选择主体';
  right.appendChild(gBase.box);`,
  `  const typeSec = section('basetype', '牌型');
  typeSec.cur.textContent = forgeType(S.forge.baseType).name;
  const typeSel = document.createElement('select'); typeSel.className = 'tbtn'; typeSel.style.width = '100%';
  for (const t of FORGE_TYPES) { const o = document.createElement('option'); o.value = t.id; o.textContent = t.label; typeSel.appendChild(o); }
  typeSel.value = S.forge.baseType;
  typeSec.body.appendChild(typeSel);
  const baseSearch = document.createElement('input');
  baseSearch.className = 'tbtn'; baseSearch.placeholder = '筛选…（名称 / id / source:Cryptid）';
  baseSearch.style.cssText = 'width:100%;margin-top:8px;padding:5px 8px';
  typeSec.body.appendChild(baseSearch);
  const baseHint = document.createElement('div'); baseHint.className = 'hint';
  typeSec.body.appendChild(baseHint);
  right.appendChild(typeSec.box);

  const gBase = group('选择主体', [], () => S.forge.base, (v) => { S.forge.base = v; }, {
    key: null, gkey: 'base',
    cur: () => nm(forgeBaseItem()) + (forgeBaseItem().source ? ' · MOD' : ''),
  });
  right.appendChild(gBase.box);`,
  'base type section')

rep('app.js',
  `    baseHint.textContent = \`\${total} 项\${list.length !== total ? \`（筛出 \${list.length}）\` : ''}\`;
    gBase.fill(list.slice(0, 240));`,
  `    const mods = list.filter((i) => i.source).length;
    baseHint.textContent = \`\${total} 项\${mods ? \`（其中 \${mods} 项来自 Mod）\` : ''}\${list.length !== total ? \` · 筛出 \${list.length}\` : ''}\`;
    gBase.fill(list);`,
  'base hint + no 240 cap')

rep('app.js',
  `  typeSel.onchange = () => {
    S.forge.baseType = typeSel.value;
    S.forge.baseQuery = ''; baseSearch.value = '';
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    S.forge.base = first ? first.id : S.forge.base;
    build(); refreshBase(); draw(); updateChips();
  };`,
  `  typeSel.onchange = () => {
    S.forge.baseType = typeSel.value;
    S.forge.baseQuery = ''; baseSearch.value = '';
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    S.forge.base = first ? first.id : S.forge.base;
    typeSec.cur.textContent = forgeType(S.forge.baseType).name;
    build(); refreshBase(); draw(); updateChips();
  };`,
  'type change updates header')

/* ------------------------------------------------ group call sites */
rep('app.js',
  `  const gEnh = group('强化 Enhancement（改变卡体外观）', FORGE_ENH, () => S.forge.enhancement, (v) => { S.forge.enhancement = v; }, { allowNone: true, key: 'enhancement' });
  const gEd = group('版本 Edition（原版 GLSL 特效）', FORGE_EDITIONS, () => S.forge.edition, (v) => { S.forge.edition = v; }, { allowNone: true, key: 'edition' });
  const gSeal = group('蜡封 Seal（仅扑克牌）', FORGE_SEALS, () => S.forge.seal, (v) => { S.forge.seal = v; }, { allowNone: true, key: 'seal', value: (it) => it.key });`,
  `  const gEnh = group('强化 Enhancement（改变卡体外观）', FORGE_ENH, () => S.forge.enhancement, (v) => { S.forge.enhancement = v; }, {
    allowNone: true, key: 'enhancement', gkey: 'enh',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.enhancement) return '不适用';
      const v = S.forge.enhancement; const it = v && BY_ID[v];
      return (!v || v === 'none') ? '无' : (it ? nm(it) : v);
    },
  });
  const gEd = group('版本 Edition（原版 GLSL 特效）', FORGE_EDITIONS, () => S.forge.edition, (v) => { S.forge.edition = v; }, {
    allowNone: true, key: 'edition', gkey: 'ed',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.edition) return '不适用';
      const v = S.forge.edition; const it = v && BY_ID[v];
      return v ? (it ? nm(it) : v) : '无';
    },
  });
  const gSeal = group('蜡封 Seal（仅扑克牌）', FORGE_SEALS, () => S.forge.seal, (v) => { S.forge.seal = v; }, {
    allowNone: true, key: 'seal', gkey: 'seal', value: (it) => it.key,
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.seal) return '不适用';
      if (!S.forge.seal) return '无';
      const it = BY_ID['seal_' + S.forge.seal];
      return it ? nm(it) : S.forge.seal;
    },
  });`,
  'enh/ed/seal labels')

/* ------------------------------------------------ sticker section */
rep('app.js',
  `  const gStick = document.createElement('div'); gStick.className = 'opt';
  gStick.innerHTML = '<h4>贴纸 Sticker（仅小丑牌 · 可同时存在）</h4>';
  const stickChips = document.createElement('div'); stickChips.className = 'chips';`,
  `  const stickSec = section('stick', '贴纸 Sticker（仅小丑牌 · 可同时存在）');
  const gStick = stickSec.box;
  const stickChips = document.createElement('div'); stickChips.className = 'chips';`,
  'sticker section')

rep('app.js',
  `  gStick.appendChild(colorRow);
  gStick.appendChild(stickNote);
  right.appendChild(gStick);`,
  `  stickSec.body.appendChild(colorRow);
  stickSec.body.appendChild(stickNote);
  right.appendChild(gStick);
  groups.push({
    box: gStick, body: stickSec.body, buttons: [], getValue: () => null, key: 'sticker', gkey: 'stick', note: stickNote, cur: stickSec.cur,
    label: () => {
      if (!forgeType(S.forge.baseType).allows.sticker) return '不适用';
      const st = S.forge.stickers;
      const p = [st.eternal && '永恒', st.perishable && '易腐', st.rental && '租用', st.color].filter(Boolean);
      return p.length ? p.join(' + ') : '无';
    },
  });`,
  'sticker section registration')

/* ------------------------------------------------ back group */
rep('app.js',
  `  const gBack = group('牌背 Deck（翻到牌背时生效）', FORGE_BACKS, () => S.forge.back, (v) => { S.forge.back = v; }, { key: 'back' });`,
  `  const gBack = group('牌背 Deck（翻到牌背时生效）', FORGE_BACKS, () => S.forge.back, (v) => { S.forge.back = v; }, {
    key: 'back', gkey: 'back',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.back) return '不适用';
      if (S.forge.showFront) return '显示正面';
      const it = BY_ID[S.forge.back];
      return it ? nm(it) : '无';
    },
  });`,
  'back label')

/* ------------------------------------------------ display options section */
rep('app.js',
  `  const gToggle = document.createElement('div'); gToggle.className = 'opt';
  gToggle.innerHTML = '<h4>显示选项</h4>';
  const row = document.createElement('div'); row.className = 'chips';`,
  `  const viewSec = section('view', '显示选项');
  const gToggle = viewSec.box;
  const row = document.createElement('div'); row.className = 'chips';`,
  'view section')

rep('app.js',
  `  gToggle.appendChild(row);
  groups.push({ buttons: [], getValue: () => null, box: gToggle, key: null, note: null, sync: () => { bBack._sync(); bHC._sync(); } });
  right.appendChild(gToggle);`,
  `  viewSec.body.appendChild(row);
  groups.push({
    buttons: [], getValue: () => null, box: gToggle, body: viewSec.body, key: null, gkey: 'view', note: null,
    cur: viewSec.cur,
    label: () => [S.forge.showFront ? '正面' : '牌背', S.forge.variants ? '高对比' : null].filter(Boolean).join(' · '),
    sync: () => { bBack._sync(); bHC._sync(); },
  });
  right.appendChild(gToggle);`,
  'view section registration')

/* ------------------------------------------------ summary is mod-aware */
rep('app.js',
  `    rows.push(['牌型', type.label]);
    rows.push(['主体', \`\${nm(base)}（\${base.id}）\`]);`,
  `    rows.push(['牌型', type.label]);
    rows.push(['主体', \`\${nm(base)}（\${base.id}）\`]);
    if (base.source) rows.push(['来源', \`\${base.sourceName || base.source}（\${base.source}）\`]);
    if (!base.atlas || !base.pos) rows.push(['提示', '这个条目本身没有卡图，预览只会显示叠加层']);`,
  'summary source row')

rep('app.js',
  `    rows.push(['版本', !a.edition ? '不适用' : (F.edition && BY_ID[F.edition] ? label(BY_ID[F.edition]) : (F.edition || '无'))]);`,
  `    rows.push(['版本', !a.edition ? '不适用' : (F.edition && BY_ID[F.edition] ? label(BY_ID[F.edition]) + (BY_ID[F.edition].shader ? '（自定义着色器 ' + BY_ID[F.edition].shader + '，未移植）' : '') : (F.edition || '无'))]);`,
  'edition shader note in summary')

/* ------------------------------------------------ mod base without art */
rep('app.js',
  `  } else {
    spec.center = { atlas: base.atlas, pos: base.pos };
    if (base.setShader) spec.setShader = base.setShader;`,
  `  } else {
    spec.center = (base.atlas && base.pos) ? { atlas: base.atlas, pos: base.pos } : null;
    if (base.setShader) spec.setShader = base.setShader;`,
  'mod base without art')

/* ------------------------------------------------ codex: one-tap way back */
rep('app.js',
  `  const sel = document.createElement('select'); sel.className = 'tbtn';
  for (const [v, t] of [['order', '游戏顺序'], ['orderDesc', '逆序'], ['name', '名称'], ['cost', '费用'], ['rarity', '稀有度'], ['id', 'ID'], ['atlas', '图集位置']]) {`,
  `  if (S.source !== 'all') {
    // the source filter is a shortcut, so make the way back just as short
    const mod = MODS.find((m) => m.id === S.source);
    const chip = document.createElement('button');
    chip.className = 'tbtn srcchip';
    chip.innerHTML = \`来源：<b>\${esc(S.source === 'vanilla' ? '原版 Balatro' : (mod ? mod.name : S.source))}</b> <span class="x">✕</span>\`;
    chip.title = '清除来源筛选，显示全部条目';
    chip.onclick = () => { S.source = 'all'; S.cat = 'all'; render(); toast('已显示全部来源') };
    head.appendChild(chip);
  }
  const sel = document.createElement('select'); sel.className = 'tbtn';
  for (const [v, t] of [['order', '游戏顺序'], ['orderDesc', '逆序'], ['name', '名称'], ['cost', '费用'], ['rarity', '稀有度'], ['id', 'ID'], ['atlas', '图集位置']]) {`,
  'codex source chip')

/* detail panel: the same button toggles back */
rep('app.js',
  `    const b1 = document.createElement('button'); b1.className = 'btn';
    b1.textContent = '只看这个 Mod 的内容';
    b1.onclick = () => { S.source = it.source; S.cat = 'all'; S.tab = 'codex'; render() };`,
  `    const b1 = document.createElement('button'); b1.className = 'btn';
    const filtered = S.source === it.source;
    b1.textContent = filtered ? '← 显示全部来源' : '只看这个 Mod 的内容';
    b1.title = filtered ? '当前就在只显示这个 Mod，点一下恢复全部来源' : '把图鉴筛选到这个 Mod 的内容';
    b1.onclick = () => {
      S.source = filtered ? 'all' : it.source;
      S.cat = 'all'; S.tab = 'codex';
      render();
      toast(filtered ? '已显示全部来源' : '只看 ' + (it.sourceName || it.source));
    };`,
  'detail source toggle')

console.log(fails ? 'FAILURES ' : 'done ')
