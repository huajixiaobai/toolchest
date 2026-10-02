/* ================================================================ 得分计算器
 * 界面照游戏里那套来：真实的卡图排成行（小丑在上、打出的牌在中、留手在下面），
 * 中间是游戏同款的「筹码 × 倍率」，底下是逐步播放 —— 每一步会高亮贡献它的那张牌
 * 或那张小丑，并把它们的贡献浮在旁边。纯数字看不出所以然，这样才一眼明白分从哪来。 */

/** 一张扑克牌的真实卡图（中心框 + 牌面 + 强化 + 版本 + 蜡封） */
function scoreCardCanvas (c, scale) {
  const id = c.suit + '_' + (c.rank === '10' ? 'T' : c.rank);
  const face = BY_ID[id];
  const enh = c.enh ? BY_ID[c.enh] : null;
  const spec = {
    center: enh ? { atlas: 'centers', pos: enh.pos, stoneNoFront: enh.id === 'm_stone' } : { atlas: 'centers', pos: COM.baseCenter.pos },
    front: face ? { atlas: face.atlas, pos: face.pos } : null,
    edition: c.ed ? editionShaderOf(BY_ID[c.ed]) : null,
    seal: c.seal || null,
  };
  return compose(spec, scale, S.phase);
}

/** 一张小丑牌的真实卡图 */
function scoreJokerCanvas (j, scale) {
  const it = BY_ID[j.id];
  if (!it) return null;
  const spec = Object.assign({}, specForItem(it));
  if (j.ed) spec.edition = editionShaderOf(BY_ID[j.ed]);
  return compose(spec, scale, S.phase);
}

/** 把 canvas 包成一个可以点的小卡位 */
function spriteTile (cv, cls, title) {
  const d = document.createElement('div');
  d.className = 'sctile' + (cls ? ' ' + cls : '');
  if (title) d.title = title;
  if (cv) d.appendChild(cv);
  return d;
}

const SC_UI = { edit: null, step: -1, playing: false, timer: null, picker: null };

function scStopPlay () {
  SC_UI.playing = false;
  if (SC_UI.timer) { clearInterval(SC_UI.timer); SC_UI.timer = null }
}

function viewScore (host) {
  const r = scoreCompute();
  const step = (SC_UI.step >= 0 && SC_UI.step < r.rows.length) ? SC_UI.step : -1;
  const shown = step >= 0 ? r.rows[step] : { chips: r.chips, mult: r.mult };
  const active = step >= 0 ? r.rows[step].ref : null;
  /* 这一步之前处理过的牌算"已结算"，之后的算"还没轮到" */
  const reached = (kind, i) => {
    if (step < 0) return true;
    for (let k = 0; k <= step; k++) {
      const ref = r.rows[k].ref;
      if (ref && ref.kind === kind && ref.i === i) return true;
    }
    return false;
  };

  const head = document.createElement('div');
  head.className = 'listhead';
  head.innerHTML = `<h2>得分计算器</h2><span class="sub">牌型 → 打出的牌 → 留手 → 小丑 → 得分 = ⌊筹码 × 倍率⌋　·　点卡图可以改，按 ▶ 逐步看每一步</span>`;
  host.appendChild(head);

  const board = document.createElement('div');
  board.className = 'scboard';
  board.innerHTML = `
    <div class="scbar">
      <select id="scHand" title="牌型">${D.hands.map((h) => `<option value="${h.name}"${h.name === SC.hand ? ' selected' : ''}>${h.name}</option>`).join('')}</select>
      <label class="sclvl">Lv <input id="scLevel" type="number" min="1" max="99" value="${SC.level}" title="牌型等级（每级的成长见下方读数）"></label>
      <span class="scbase">基础 ${r.hand.chips} × ${r.hand.mult}　每级 +${r.hand.chipsPerLevel || 0} / +${r.hand.multPerLevel || 0}</span>
      <button class="btn" id="scReset" title="清空所有牌">清空</button>
    </div>

    <div class="scrailbox">
      <div class="scraillabel">小丑牌 <em>结算顺序从左到右</em></div>
      <div class="scrail" id="scJokers"></div>
    </div>

    <div class="scrailbox">
      <div class="scraillabel">打出的牌 <em id="scPlayedNote"></em></div>
      <div class="scrail" id="scPlayed"></div>
    </div>

    <div class="scrailbox">
      <div class="scraillabel">留在手里 <em>钢铁牌等"持有"效果</em></div>
      <div class="scrail" id="scHeld"></div>
    </div>

    <div class="scmath">
      <div class="scchips"><span>筹码</span><b>${Math.round(shown.chips)}</b></div>
      <div class="scx">×</div>
      <div class="scmult"><span>倍率</span><b>${+shown.mult.toFixed(2)}</b></div>
      <div class="sceq">=</div>
      <div class="sctotal"><span>得分</span><b>${Math.floor(shown.chips * shown.mult).toLocaleString()}</b></div>
    </div>

    <div class="scplay">
      <button class="btn" id="scFirst" title="回到开头">⏮</button>
      <button class="btn" id="scPrev" title="上一步">◀</button>
      <button class="btn primary" id="scToggle">${SC_UI.playing ? '⏸ 暂停' : '▶ 逐步播放'}</button>
      <button class="btn" id="scNext" title="下一步">▶</button>
      <button class="btn" id="scLast" title="直接看结果">⏭</button>
      <input type="range" id="scStep" min="-1" max="${r.rows.length - 1}" value="${step}" title="结算进度">
      <span class="scstepn">${step < 0 ? '结果' : (step + 1) + ' / ' + r.rows.length}</span>
      <span class="scnow">${step < 0 ? '最终得分' : r.rows[step].label}</span>
    </div>

    <div class="scpickers" id="scPickers"></div>
  `;
  host.appendChild(board);

  /* ---- 卡图行 ---- */
  const railJ = board.querySelector('#scJokers');
  if (!SC.jokers.length) railJ.appendChild(Object.assign(document.createElement('div'), { className: 'scempty', textContent: '点下面「＋ 小丑牌」加一张' }));
  SC.jokers.forEach((j, i) => {
    const t = spriteTile(scoreJokerCanvas(j, 1), 'scj' + (active && active.kind === 'joker' && active.i === i ? ' on' : (step >= 0 && !reached('joker', i) ? ' todo' : '')), '点一下移除');
    t.style.zIndex = String(100 - i);
    const badge = document.createElement('i');
    badge.className = 'scbadge';
    badge.textContent = j.name;
    t.appendChild(badge);
    if (SC.jokers.length > 1) {
      const mv = document.createElement('span');
      mv.className = 'scmv';
      mv.innerHTML = `<button data-mv="${i}" data-dir="-1" title="往前挪">◀</button><button data-mv="${i}" data-dir="1" title="往后挪">▶</button>`;
      t.appendChild(mv);
    }
    t.onclick = (e) => {
      if (e.target.closest('.scmv')) return;
      scStopPlay(); SC.jokers.splice(i, 1); render();
    };
    railJ.appendChild(t);
  });

  const railP = board.querySelector('#scPlayed');
  board.querySelector('#scPlayedNote').textContent = SC.played.length ? SC.played.length + ' 张 · 点卡图改 / 再点一次移除' : '';
  if (!SC.played.length) railP.appendChild(Object.assign(document.createElement('div'), { className: 'scempty', textContent: '点下面「＋ 牌」加一张打出去的牌' }));
  SC.played.forEach((c, i) => {
    const t = spriteTile(scoreCardCanvas(c, 1), 'scc' + (active && active.kind === 'played' && active.i === i ? ' on' : (step >= 0 && !reached('played', i) ? ' todo' : '')), '点一下编辑，双击移除');
    t.style.zIndex = String(100 - i);
    if (c.seal === 'Red') t.appendChild(Object.assign(document.createElement('i'), { className: 'scred', textContent: '红' }));
    t.onclick = () => { scStopPlay(); SC_UI.edit = (SC_UI.edit && SC_UI.edit.kind === 'played' && SC_UI.edit.i === i) ? null : { kind: 'played', i }; render() };
    t.ondblclick = () => { scStopPlay(); SC.played.splice(i, 1); SC_UI.edit = null; render() };
    railP.appendChild(t);
  });

  const railH = board.querySelector('#scHeld');
  if (!SC.held.length) railH.appendChild(Object.assign(document.createElement('div'), { className: 'scempty', textContent: '（可选）手里留着的牌' }));
  SC.held.forEach((c, i) => {
    const t = spriteTile(scoreCardCanvas(c, 1), 'scc' + (active && active.kind === 'held' && active.i === i ? ' on' : ''), '点一下编辑，双击移除');
    t.style.zIndex = String(100 - i);
    t.onclick = () => { scStopPlay(); SC_UI.edit = (SC_UI.edit && SC_UI.edit.kind === 'held' && SC_UI.edit.i === i) ? null : { kind: 'held', i }; render() };
    t.ondblclick = () => { scStopPlay(); SC.held.splice(i, 1); SC_UI.edit = null; render() };
    railH.appendChild(t);
  });

  /* ---- 卡牌编辑面板 / 选择器 ---- */
  const pick = board.querySelector('#scPickers');
  if (SC_UI.edit) {
    const which = SC_UI.edit.kind === 'held' ? SC.held : SC.played;
    const c = which[SC_UI.edit.i];
    if (!c) { SC_UI.edit = null; render(); return }
    const grid = (label, list, cur, field) => `<div class="scpkrow"><span>${label}</span>${
      list.map((x) => `<button class="scpk${x[0] === cur ? ' on' : ''}" data-pick="${field}" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>`;
    const ranks = Object.keys(RANK_CHIPS).map((k) => [k, k]);
    const suits = Object.keys(SUIT_SYM).map((k) => [k, SUIT_SYM[k]]);
    const enhs = [['', '无']].concat(ITEMS.filter((x) => x.cat === 'Enhancement').map((x) => [x.id, x.name || x.id]));
    const eds = [['', '无']].concat(ITEMS.filter((x) => x.cat === 'Edition' && !x.shader).map((x) => [x.id, x.name || x.id]));
    const seals = [['', '无'], ['Red', '红'], ['Gold', '金'], ['Blue', '蓝'], ['Purple', '紫']];
    pick.innerHTML = `<div class="scpkh">改这张牌 <button class="btn scx" id="scDel">移除</button><button class="btn scx" id="scClose">收起</button></div>` +
      grid('点数', ranks, c.rank, 'rank') + grid('花色', suits, c.suit, 'suit') +
      grid('强化', enhs, c.enh, 'enh') + grid('版本', eds, c.ed, 'ed') + grid('蜡封', seals, c.seal, 'seal');
  } else {
    pick.innerHTML = `
      <button class="btn" id="scAddCard">＋ 牌</button>
      <button class="btn" id="scAddHeld">＋ 留手牌</button>
      <button class="btn" id="scAddJoker">＋ 小丑牌</button>
      <input id="scJokerSearch" placeholder="搜索小丑牌（含已导入的 mod）…" autocomplete="off">
      <div class="scjres" id="scJokerRes"></div>`;
  }

  /* ---- 账目（折叠，播放时跟着高亮） ---- */
  const log = document.createElement('details');
  log.className = 'sclog';
  log.open = step >= 0;
  log.innerHTML = `<summary>结算账目（${r.rows.length} 步）</summary>` +
    r.rows.map((x, k) => `<div class="scline ${x.op}${k === step ? ' on' : ''}" data-step="${k}"><span>${x.label}</span><i>${Math.round(x.chips)} × ${+x.mult.toFixed(2)}</i></div>`).join('');
  host.appendChild(log);

  if (r.warns.length) {
    const w = document.createElement('div');
    w.className = 'scwarn';
    w.innerHTML = `<b>这些没自动算</b>（依赖运行时状态或条件无法判定；可以在账目里手填修正）：
      ${r.warns.map((x) => `<div>· ${x.n} <em>${x.why}</em></div>`).join('')}`;
    host.appendChild(w);
  }
  const foot = document.createElement('div');
  foot.className = 'scfoot';
  foot.innerHTML = `规则取自游戏自己的 <code>card.lua</code>（Card:calculate_joker）：<b>${(JOKER_RULES.rules || []).length}</b> 条具名规则 + 4 条通用配置规则。
    概率类（幸运牌、8 球、骰子…）不参与计算。手牌上限 8 张、出牌最多 5 张这些规则由你自己把握。`;
  host.appendChild(foot);

  /* ---- 事件 ---- */
  const q = (sel) => board.querySelector(sel);
  const stepTo = (v) => { SC_UI.step = Math.max(-1, Math.min(r.rows.length - 1, v)); render() };
  q('#scHand').onchange = (e) => { scStopPlay(); SC.hand = e.target.value; render() };
  q('#scLevel').onchange = (e) => { scStopPlay(); SC.level = Math.max(1, +e.target.value || 1); render() };
  q('#scReset').onclick = () => { scStopPlay(); SC.played = []; SC.held = []; SC.jokers = []; SC_UI.edit = null; SC_UI.step = -1; render() };
  q('#scFirst').onclick = () => { scStopPlay(); stepTo(-1) };
  q('#scPrev').onclick = () => { scStopPlay(); stepTo(SC_UI.step < 0 ? r.rows.length - 2 : SC_UI.step - 1) };
  q('#scNext').onclick = () => { scStopPlay(); stepTo(SC_UI.step < 0 ? 0 : SC_UI.step + 1) };
  q('#scLast').onclick = () => { scStopPlay(); stepTo(r.rows.length - 1) };
  q('#scStep').oninput = (e) => { scStopPlay(); stepTo(+e.target.value) };
  q('#scToggle').onclick = () => {
    if (SC_UI.playing) { scStopPlay(); render(); return }
    SC_UI.playing = true;
    SC_UI.step = -1;
    render();
    SC_UI.timer = setInterval(() => {
      const rr = scoreCompute();
      if (SC_UI.step >= rr.rows.length - 1) { scStopPlay(); render(); return }
      SC_UI.step += 1;
      render();
    }, 520);
  };
  log.addEventListener('click', (e) => {
    const row = e.target.closest('[data-step]');
    if (row) { scStopPlay(); stepTo(+row.dataset.step) }
  });
  board.addEventListener('click', (e) => {
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const i = +mv.dataset.mv, d = +mv.dataset.dir, k = i + d;
      if (k >= 0 && k < SC.jokers.length) { const t = SC.jokers[i]; SC.jokers[i] = SC.jokers[k]; SC.jokers[k] = t; render() }
      return;
    }
    const pk = e.target.closest('[data-pick]');
    if (pk && SC_UI.edit) {
      const which = SC_UI.edit.kind === 'held' ? SC.held : SC.played;
      which[SC_UI.edit.i][pk.dataset.pick] = pk.dataset.v;
      render(); return;
    }
    if (e.target.id === 'scClose') { SC_UI.edit = null; render(); return }
    if (e.target.id === 'scDel' && SC_UI.edit) {
      (SC_UI.edit.kind === 'held' ? SC.held : SC.played).splice(SC_UI.edit.i, 1);
      SC_UI.edit = null; render(); return;
    }
    if (e.target.id === 'scAddCard') { scStopPlay(); SC.played.push(scCard('10', 'S')); SC_UI.edit = { kind: 'played', i: SC.played.length - 1 }; render(); return }
    if (e.target.id === 'scAddHeld') { scStopPlay(); SC.held.push(scCard('K', 'D', 'm_steel')); SC_UI.edit = { kind: 'held', i: SC.held.length - 1 }; render(); return }
    if (e.target.id === 'scAddJoker') {
      scStopPlay();
      const j = jokerFromItem(BY_ID['j_joker']) || jokerFromItem(ITEMS.find((x) => x.cat === 'Joker'));
      if (j) SC.jokers.push(j);
      render(); return;
    }
    const jr = e.target.closest('[data-jid]');
    if (jr) { scStopPlay(); SC.jokers.push(jokerFromItem(BY_ID[jr.dataset.jid])); render() }
  });
  const srch = q('#scJokerSearch');
  if (srch) {
    srch.oninput = () => {
      const s = srch.value.trim().toLowerCase();
      const res = q('#scJokerRes');
      if (!s) { res.innerHTML = ''; return }
      const hits = ITEMS.filter((x) => x.cat === 'Joker' && (x.id + ' ' + (x.name || '') + ' ' + (x.source || '')).toLowerCase().includes(s)).slice(0, 24);
      res.innerHTML = hits.map((x) => `<button class="btn" data-jid="${x.id}" title="${x.id}">${x.name || x.id}${x.source ? ' ★' : ''}</button>`).join('') || '<span class="scempty">没找到</span>';
    };
  }
}
