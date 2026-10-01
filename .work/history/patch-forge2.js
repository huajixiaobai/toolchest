/* 2/3 — forge layout: collapsible groups with the current pick in the header, a jump bar,
   quick actions, and a compact always-visible preview (sticky on phones). */
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

/* ---------- collapse machinery + nav, right after the two columns are created ---------- */
rep('app.js',
  `  const wrap = document.createElement('div'); wrap.className = 'forge';
  const left = document.createElement('div'); left.className = 'preview';
  const right = document.createElement('div'); right.className = 'opts';
  wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);`,
  `  const wrap = document.createElement('div'); wrap.className = 'forge';
  const left = document.createElement('div'); left.className = 'preview';
  const right = document.createElement('div'); right.className = 'opts';
  const nav = document.createElement('div'); nav.className = 'forgenav';
  wrap.appendChild(left); wrap.appendChild(right); right.appendChild(nav); root.appendChild(wrap);

  /* ---- collapsing: a long column is fine as long as you can put things away ---- */
  const NAV_GROUPS = [
    ['basetype', '牌型'], ['base', '主体'], ['enh', '强化'], ['ed', '版本'], ['seal', '蜡封'],
    ['stick', '贴纸'], ['back', '牌背'], ['view', '显示'],
  ];
  const openState = () => {
    if (!S.forge.open) {
      // first visit: keep only what most people reach for, so the column is not endless
      const all = { basetype: true, base: true, enh: true, ed: true, seal: true, stick: false, back: false, view: false, summary: !isNarrow(), export: true, anim: false };
      S.forge.open = isNarrow()
        ? Object.assign({}, all, { enh: false, ed: false, seal: false, summary: false, export: false, anim: false })
        : all;
    }
    return S.forge.open;
  };
  const isOpen = (key) => !!openState()[key];
  const applyOpen = (box, key) => { box.classList.toggle('collapsed', !isOpen(key)) };
  const syncNav = () => {
    for (const b of nav.querySelectorAll('.nv[data-gkey]')) b.classList.toggle('on', isOpen(b.dataset.gkey));
    for (const g of groups) if (g.label && g.cur) g.cur.textContent = g.label();
  };
  const toggleOpen = (key, force) => {
    const o = openState();
    o[key] = force === undefined ? !o[key] : !!force;
    for (const el of document.querySelectorAll('#content .opt[data-gkey="' + key + '"]')) applyOpen(el, key);
    syncNav();
  };
  /** A collapsible box: header shows the current pick, body holds the chips. */
  const section = (key, title) => {
    const box = document.createElement('section');
    box.className = 'opt'; box.dataset.gkey = key;
    const head = document.createElement('h4');
    const ttl = document.createElement('span'); ttl.className = 'otitle'; ttl.textContent = title;
    const cur = document.createElement('span'); cur.className = 'ocur';
    const chev = document.createElement('span'); chev.className = 'chev'; chev.textContent = '▾';
    head.appendChild(ttl); head.appendChild(cur); head.appendChild(chev);
    head.onclick = () => toggleOpen(key);
    box.appendChild(head);
    const body = document.createElement('div'); body.className = 'obody';
    box.appendChild(body);
    applyOpen(box, key);
    return { box, body, cur, key, head };
  };`,
  'collapse machinery')

/* ---------- group() rewritten to use the collapsible section ---------- */
rep('app.js',
  `  /* ---- option groups ---- */
  const groups = [];
  const group = (title, items, getValue, onPick, opts) => {
    const box = document.createElement('div'); box.className = 'opt';
    const h = document.createElement('h4'); h.textContent = title; box.appendChild(h);
    const chips = document.createElement('div'); chips.className = 'chips';
    const buttons = [];`,
  `  /* ---- option groups ---- */
  const groups = [];
  const group = (title, items, getValue, onPick, opts) => {
    const sec = section((opts && opts.gkey) || title, title);
    const box = sec.box;
    const chips = document.createElement('div'); chips.className = 'chips';
    const buttons = [];`,
  'group uses section')

rep('app.js',
  `    fill(items);
    box.appendChild(chips);
    const note = document.createElement('div'); note.className = 'hint'; note.style.display = 'none';
    box.appendChild(note);
    const g = { box, buttons, getValue, fill, note, key: opts && opts.key };
    groups.push(g);
    return g;
  };`,
  `    fill(items);
    sec.body.appendChild(chips);
    const note = document.createElement('div'); note.className = 'hint'; note.style.display = 'none';
    sec.body.appendChild(note);
    const g = { box, body: sec.body, buttons, getValue, fill, note, cur: sec.cur, label: (opts && opts.cur) || null, key: opts && opts.key, gkey: sec.key };
    groups.push(g);
    return g;
  };`,
  'group body')

/* updateChips also refreshes the per-group "current value" text */
rep('app.js',
  `    // the sticker block is built separately (multi-select), so refresh its gating too
    updateStickers();
  }`,
  `    // the sticker block is built separately (multi-select), so refresh its gating too
    updateStickers();
    if (typeof syncNav === 'function') syncNav();
  }`,
  'updateChips syncs headers')

/* ---------- preview column rebuilt with sections ---------- */
rep('app.js',
  `    const btns = document.createElement('div'); btns.className = 'btns'; btns.style.cssText = 'justify-content:center;margin-top:14px';
    const mk = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns.appendChild(b); return b; };
    mk('⤓ PNG 1x', () => saveCanvas(1));
    mk('⤓ PNG 2x', () => saveCanvas(2));
    mk('⤓ PNG 4x', () => saveCanvas(4));
    mk('⤓ SVG', () => saveSVG());
    mk('⧉ 复制组合 JSON', () => copyCombo());
    left.appendChild(btns);

    const btns2 = document.createElement('div'); btns2.className = 'btns'; btns2.style.cssText = 'justify-content:center;margin-top:8px';
    const mk2 = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns2.appendChild(b); return b; };
    mk2('🎞 GIF 动图', () => exportAnim('gif'), ' primary');
    mk2('🎞 APNG 动图', () => exportAnim('apng'));
    mk2('🎞 帧序列 ZIP', () => exportAnim('frames'));
    left.appendChild(btns2);

    const row = document.createElement('div'); row.className = 'btns'; row.style.cssText = 'justify-content:center;margin-top:8px;align-items:center';`,
  `    const exSec = section('export', '导出图片 / 数据');
    exSec.cur.textContent = 'PNG · SVG · JSON';
    const btns = document.createElement('div'); btns.className = 'btns'; btns.style.cssText = 'justify-content:center;margin-top:2px';
    const mk = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns.appendChild(b); return b; };
    mk('⤓ PNG 1x', () => saveCanvas(1));
    mk('⤓ PNG 2x', () => saveCanvas(2));
    mk('⤓ PNG 4x', () => saveCanvas(4));
    mk('⤓ SVG', () => saveSVG());
    mk('⧉ 复制组合 JSON', () => copyCombo());
    exSec.body.appendChild(btns);
    left.appendChild(exSec.box);

    const anSec = section('anim', '动图与动画');
    const btns2 = document.createElement('div'); btns2.className = 'btns'; btns2.style.cssText = 'justify-content:center;margin-top:2px';
    const mk2 = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns2.appendChild(b); return b; };
    mk2('🎞 GIF 动图', () => exportAnim('gif'), ' primary');
    mk2('🎞 APNG 动图', () => exportAnim('apng'));
    mk2('🎞 帧序列 ZIP', () => exportAnim('frames'));
    anSec.body.appendChild(btns2);
    left.appendChild(anSec.box);

    const row = document.createElement('div'); row.className = 'btns'; row.style.cssText = 'justify-content:center;margin-top:2px;align-items:center';`,
  'export/anim sections')

rep('app.js',
  `    row.appendChild(bgSel);
    left.appendChild(row);`,
  `    row.appendChild(bgSel);
    anSec.body.appendChild(row);`,
  'gif bg row')

rep('app.js',
  `    row2.appendChild(loopBtn);
    left.appendChild(row2);
    const seam = document.createElement('div'); seam.className = 'hint mono'; seam.style.minHeight = '16px';
    left.appendChild(seam);`,
  `    row2.appendChild(loopBtn);
    anSec.body.appendChild(row2);
    const seam = document.createElement('div'); seam.className = 'hint mono'; seam.style.minHeight = '16px';
    anSec.body.appendChild(seam);`,
  'anim rows')

/* the summary table becomes a collapsible section inside the left column */
rep('app.js',
  `  const paintSummary = () => {
    const box = left.querySelector('.pvsummary');
    if (!box) return;`,
  `  const paintSummary = () => {
    const box = left.querySelector('.pvsummary');
    if (!box) return;
    box.innerHTML = '';`,
  'paintSummary clears')

rep('app.js',
  `    box.innerHTML = '<h4>当前组合</h4>';
    const tb = document.createElement('table');`,
  `    const tb = document.createElement('table');`,
  'paintSummary no heading')

/* the one-line summary + the summary section are created in build() */
rep('app.js',
  `    const holder = document.createElement('div'); holder.className = 'pvbox';`,
  `    const nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    left.appendChild(nowLine);
    const sumSec = section('summary', '当前组合详情');
    const summaryBox = document.createElement('div'); summaryBox.className = 'pvsummary';
    sumSec.body.appendChild(summaryBox);
    left.appendChild(sumSec.box);
    const holder = document.createElement('div'); holder.className = 'pvbox';`,
  'summary section')

rep('app.js',
  `    paintSummary();
  };
  const draw = paintPreview;`,
  `    paintSummary();
    const one = [];
    const F2 = S.forge;
    const t2 = forgeType(F2.baseType);
    one.push('主体 ' + nm(forgeBaseItem()));
    if (t2.allows.enhancement && F2.enhancement && BY_ID[F2.enhancement]) one.push('强化 ' + nm(BY_ID[F2.enhancement]));
    if (t2.allows.edition && F2.edition && BY_ID[F2.edition]) one.push('版本 ' + nm(BY_ID[F2.edition]));
    if (t2.allows.seal && F2.seal) one.push('蜡封 ' + F2.seal);
    if (t2.allows.sticker) {
      const st = [F2.stickers.eternal && '永恒', F2.stickers.perishable && '易腐', F2.stickers.rental && '租用', F2.stickers.color].filter(Boolean);
      if (st.length) one.push('贴纸 ' + st.join('+'));
    }
    if (t2.allows.back && !F2.showFront) one.push('牌背');
    nowLine.textContent = one.join(' · ');
    if (sumSec && sumSec.cur) sumSec.cur.textContent = one.length > 2 ? one.length + ' 层叠加' : one.slice(1).join(' · ') || '未叠加';
  };
  const draw = paintPreview;`,
  'one-line summary')

/* preview scale: small on phones so the sticky block stays short */
rep('app.js',
  `      shown.style.cssText = \`width:\${Math.min(320, previewWidth(base, 200))}px;height:auto;image-rendering:pixelated;display:block;pointer-events:none;-webkit-user-drag:none\`;`,
  `      const maxW = isNarrow() ? 116 : 320;
      shown.style.cssText = \`width:\${Math.min(maxW, previewWidth(base, 200))}px;height:auto;image-rendering:pixelated;display:block;pointer-events:none;-webkit-user-drag:none\`;`,
  'preview width')

/* ---------- nav bar contents + quick actions, appended after the groups exist ---------- */
rep('app.js',
  `  build();
  typeSel.value = S.forge.baseType;
  refreshBase();
  draw();
  updateChips();`,
  `  /* ---- jump bar: tap a chip to open a group and scroll to it ---- */
  const navChip = (key, label) => {
    const b = document.createElement('button');
    b.className = 'nv'; b.dataset.gkey = key; b.textContent = label;
    b.onclick = () => {
      const open = !isOpen(key);
      toggleOpen(key, true);
      const target = document.querySelector('#content .opt[data-gkey="' + key + '"]');
      if (target && !open) target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    nav.appendChild(b);
  };
  for (const [key, label] of NAV_GROUPS) navChip(key, label);
  const navSep = document.createElement('span'); navSep.className = 'nvsep'; nav.appendChild(navSep);
  const openAll = document.createElement('button'); openAll.className = 'nv act'; openAll.textContent = '全部展开';
  openAll.onclick = () => { for (const [k] of NAV_GROUPS) toggleOpen(k, true); for (const k of ['summary', 'export', 'anim']) toggleOpen(k, true) };
  const closeAll = document.createElement('button'); closeAll.className = 'nv act'; closeAll.textContent = '收起';
  closeAll.onclick = () => { for (const [k] of NAV_GROUPS) toggleOpen(k, false); for (const k of ['summary', 'export', 'anim']) toggleOpen(k, false) };
  const randBtn = document.createElement('button'); randBtn.className = 'nv act'; randBtn.textContent = '🎲 随机搭配';
  randBtn.onclick = () => {
    const pickFrom = (list, noneChance) => (list.length && Math.random() > (noneChance || 0)) ? list[Math.floor(Math.random() * list.length)] : null;
    const t = forgeType(S.forge.baseType);
    const base = pickFrom(ITEMS.filter((i) => i.cat === S.forge.baseType));
    if (base) S.forge.base = base.id;
    if (t.allows.enhancement) { const e = pickFrom(FORGE_ENH, 0.35); S.forge.enhancement = e ? e.id : 'none' }
    if (t.allows.edition) { const e = pickFrom(FORGE_EDITIONS, 0.4); S.forge.edition = e ? e.id : '' }
    if (t.allows.seal) { const s = pickFrom(FORGE_SEALS, 0.5); S.forge.seal = s ? s.key : '' }
    if (t.allows.sticker) {
      const st = S.forge.stickers;
      st.eternal = Math.random() < 0.25; st.perishable = false; st.rental = Math.random() < 0.2;
      st.color = Math.random() < 0.25 && STICKER_COLORS.length ? STICKER_COLORS[Math.floor(Math.random() * STICKER_COLORS.length)].key : '';
    }
    if (t.allows.back) { const b = pickFrom(FORGE_BACKS, 0.5); if (b) S.forge.back = b.id }
    build(); typeSel.value = S.forge.baseType; refreshBase(); draw(); updateChips();
    toast('已随机搭配一组');
  };
  const resetBtn = document.createElement('button'); resetBtn.className = 'nv act'; resetBtn.textContent = '↺ 重置';
  resetBtn.onclick = () => {
    S.forge.enhancement = 'none'; S.forge.edition = ''; S.forge.seal = '';
    S.forge.stickers = { eternal: false, perishable: false, rental: false, color: '' };
    S.forge.showFront = true; S.forge.variants = false;
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    if (first) S.forge.base = first.id;
    build(); typeSel.value = S.forge.baseType; refreshBase(); draw(); updateChips();
    toast('已重置叠加层');
  };
  nav.appendChild(openAll); nav.appendChild(closeAll); nav.appendChild(randBtn); nav.appendChild(resetBtn);

  build();
  typeSel.value = S.forge.baseType;
  refreshBase();
  draw();
  updateChips();
  syncNav();`,
  'nav bar + quick actions')

console.log(fails ? 'FAILURES' : 'done')
