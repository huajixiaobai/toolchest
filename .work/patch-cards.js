/* 第二十八轮补丁：
 *  ① 52 张扑克牌的中文名（花色表直接从游戏本地化里读出来，按当前语言走；nm() 统一接管，
 *     图鉴 / 合成台 / 计分器 / 详情面板一次全好）
 *  ② 计分器里小丑牌也能改"版本"（闪箔 / 镭射 / 多彩 / 负片）
 *  ③ 小按钮组补齐：小丑牌 ◀ ▶ ⧉ ✕，扑克牌也一样（⧉ = 复制这一张）
 *  ④ 手牌排成原版那种弧形（角度 ±0.2*(k-n/2-0.5)/n，两端按 |0.5(-n/2+k-0.5)/n| 下沉）
 * 用法： node .work/patch-cards.js
 */
'use strict'
const fs = require('fs')
const path = require('path')
const APP = path.join(__dirname, 'app.js')
const CSS = path.join(__dirname, 'app.css')
const rep = (file, from, to, label, soft) => {
  let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  if (!s.includes(from)) { if (soft) { console.log('· 跳过（已经打过）: ' + label); return } console.error('❌ ' + label); process.exit(1) }
  fs.writeFileSync(file, s.replace(from, to)); console.log('✓ ' + label)
}

/* ---------- ① 从游戏本地化里读出各语言的花色表 ---------- */
const locDir = path.join(__dirname, 'love', 'localization')
const suits = {}
for (const f of fs.readdirSync(locDir)) {
  if (!/\.lua$/i.test(f)) continue
  const lang = f.replace(/\.lua$/i, '')
  const src = fs.readFileSync(path.join(locDir, f), 'utf8')
  const m = /suits_plural\s*=\s*\{([\s\S]*?)\}/.exec(src)
  if (!m) continue
  const o = {}
  for (const mm of m[1].matchAll(/(\w+)\s*=\s*"([^"]+)"/g)) o[mm[1]] = mm[2]
  if (Object.keys(o).length) suits[lang] = o
}
if (!suits['en-us']) suits['en-us'] = { Spades: 'Spades', Hearts: 'Hearts', Diamonds: 'Diamonds', Clubs: 'Clubs' }
console.log('✓ ① 读到', Object.keys(suits).length, '种语言的花色表：', JSON.stringify(suits.zh_CN || {}))

rep(APP,
  `const SUIT_EN = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };`,
  `const SUIT_EN = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
/* 花色的各语言名字 —— 直接从游戏本地化文件的 suits_plural 里读出来（由 patch-cards.js 生成），
   所以 52 张扑克牌的名字是"红桃A / 方片10 / 黑桃K"这种，和游戏里一致。 */
const PC_SUITS = ` + JSON.stringify(suits) + `;
/** 一张扑克牌的名字：<花色><点数>（按当前语言；没有该语言的花色表就退回英文） */
function pcName (item, lang) {
  const L = lang || S.lang;
  const t = PC_SUITS[L] || PC_SUITS['en-us'];
  const suit = item.suit || 'Spades';
  const rank = String(item.value == null ? '' : item.value);
  if (L === 'en-us') return rank + ' of ' + (t[suit] || suit);
  return (t[suit] || suit) + rank;      /* 中文/日文/韩文都是"花色在前" */
}`,
  '① 花色表 + pcName()', 1)

rep(APP,
  `function nm (item, lang) {`,
  `function nm (item, lang) {
  /* 扑克牌的名字由花色 + 点数拼出来（游戏数据里没有给它们本地化名） */
  if (item && item.cat === 'PlayingCard' && item.suit && item.value != null) return pcName(item, lang);`,
  '① nm() 接管扑克牌', 1)

/* ---------- ② 小丑牌也能改版本 ---------- */
rep(APP,
  `      (fields.length
        ? '<div class="scgrowbox"><div class="scgrowtitle">记录值（原版里这张牌自己累计的数，填了它才算得对）</div><div class="scgrowfs">' + fields.map(fieldInput).join('') + '</div></div>'
        : '<div class="scgrowbox"><div class="scgrowtitle">这张牌没有累计值 —— 它只看牌型和你选的牌</div></div>') +`,
  `      '<div class="scgrowbox"><div class="scgrowtitle">版本（影响这张牌的结算：闪箔 +50 筹码 / 镭射 +10 倍率 / 多彩 ×1.5 / 负片）</div>' +
      scPillGrid('版本', [['', '无']].concat(ITEMS.filter((x) => x.cat === 'Edition' && !x.shader).map((x) => [x.id, nm(x)])), j.ed, 'ed') +
      '</div>' +
      (fields.length
        ? '<div class="scgrowbox"><div class="scgrowtitle">记录值（原版里这张牌自己累计的数，填了它才算得对）</div><div class="scgrowfs">' + fields.map(fieldInput).join('') + '</div></div>'
        : '<div class="scgrowbox"><div class="scgrowtitle">这张牌没有累计值 —— 它只看牌型和你选的牌</div></div>') +`,
  '② 小丑牌弹窗加版本', 1)

/* 版本胶囊的点击要能作用在小丑牌上 */
rep(APP,
  `  scroll.onclick = null;
  scroll.oninput = (e) => {
    const jj = SC_UI.joker;`,
  `  scroll.onclick = (e) => {
    const pk = e.target.closest('[data-pick]');
    if (pk && SC_UI.joker) { SC_UI.joker[pk.dataset.pick] = pk.dataset.v; scAfterEditJoker(); return }
  };
  scroll.oninput = (e) => {
    const jj = SC_UI.joker;`,
  '② 小丑牌胶囊点击', 1)

/* ---------- ③ 小按钮组：小丑牌 / 扑克牌都能挪、复制、删 ---------- */
rep(APP,
  `/* ---- 拖拽排序（游戏里牌的位置就是结算顺序，这里可以直接拖） ---- */`,
  `/** 一排小按钮：◀ ▶ 挪位置、⧉ 复制一张、✕ 移除（小丑牌与扑克牌共用） */
function scTileActions (kind, arr, i, dup) {
  const mv = document.createElement('span');
  mv.className = 'scmv';
  const btn = (dir, label, title) => '<button data-mv="' + i + '" data-mvkind="' + kind + '" data-dir="' + dir + '" title="' + title + '">' + label + '</button>';
  mv.innerHTML =
    (i > 0 ? btn('-1', '◀', '往前挪') : '') +
    (i < arr.length - 1 ? btn('1', '▶', '往后挪') : '') +
    btn('dup', '⧉', '复制一张') +
    btn('del', '✕', '移除');
  return mv;
}

/** 小丑牌：就地复制一张（插在它后面） */
function scDupJoker (j) {
  const i = SC.jokers.indexOf(j);
  if (i < 0) return;
  const c = jokerFromItem(BY_ID[j.id]);
  c.ed = j.ed;
  c.state = Object.assign({}, j.state);
  SC.jokers.splice(i + 1, 0, c);
}

/** 扑克牌：就地复制一张（留在同一侧、插在它后面） */
function scDupCard (c) {
  const copy = scCard(c.rank, c.suit, c.enh, c.ed, c.seal);
  const oi = SC_UI.order.indexOf(c);
  if (oi >= 0) SC_UI.order.splice(oi + 1, 0, copy);
  const pi = SC.played.indexOf(c);
  if (pi >= 0) { SC.played.splice(pi + 1, 0, copy); return }
  const hi = SC.held.indexOf(c);
  if (hi >= 0) SC.held.splice(hi + 1, 0, copy);
}

/* ---- 拖拽排序（游戏里牌的位置就是结算顺序，这里可以直接拖） ---- */`,
  '③ 小按钮组 + 复制函数')

rep(APP,
  `    const mv = document.createElement('span');
    mv.className = 'scmv';
    mv.innerHTML = (i > 0 ? '<button data-mv="' + i + '" data-dir="-1" title="往前挪">◀</button>' : '') +
      (i < SC.jokers.length - 1 ? '<button data-mv="' + i + '" data-dir="1" title="往后挪">▶</button>' : '') +
      '<button data-mv="' + i + '" data-dir="del" title="移除">✕</button>';
    t.appendChild(mv);`,
  `    t.appendChild(scTileActions('joker', SC.jokers, i, scDupJoker));`,
  '③ 小丑牌用小按钮组')

rep(APP,
  `    if (c.seal === 'Red') t.appendChild(Object.assign(document.createElement('i'), { className: 'scred', textContent: '红' }));
    t.draggable = true;
    t.addEventListener('dragstart', scDragStart('hand', c, i));`,
  `    if (c.seal === 'Red') t.appendChild(Object.assign(document.createElement('i'), { className: 'scred', textContent: '红' }));
    t.appendChild(scTileActions('hand', order, i));
    t.draggable = true;
    t.addEventListener('dragstart', scDragStart('hand', c, i));`,
  '③ 扑克牌用小按钮组')

/* 4 处 data-mv 的处理：小丑牌 / 扑克牌都在 stage 的 click 里统一处理 */
rep(APP,
  `    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const i = +mv.dataset.mv;
      if (mv.dataset.dir === 'del') SC.jokers.splice(i, 1);
      else {
        const k = i + (+mv.dataset.dir);
        if (k >= 0 && k < SC.jokers.length) { const t = SC.jokers[i]; SC.jokers[i] = SC.jokers[k]; SC.jokers[k] = t }
      }
      scStopPlay(); render(); return;
    }`,
  `    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const i = +mv.dataset.mv;
      const kind = mv.dataset.mvkind || 'joker';
      const arr = kind === 'hand' ? SC_UI.order : SC.jokers;
      const dir = mv.dataset.dir;
      if (dir === 'del') {
        if (kind === 'hand') scRemoveCard(arr[i]);
        else arr.splice(i, 1);
      } else if (dir === 'dup') {
        if (kind === 'hand') scDupCard(arr[i]);
        else scDupJoker(arr[i]);
      } else {
        const k = i + (+dir);
        if (k >= 0 && k < arr.length) { const t2 = arr[i]; arr[i] = arr[k]; arr[k] = t2 }
      }
      scStopPlay(); render(); return;
    }`,
  '③ 小按钮统一处理')

/* ---------- ④ 手牌弧形 ---------- */
rep(APP,
  `    t.style.marginRight = (i === order.length - 1 ? 0 : handPitch(order.length) - CARDW) + 'px';
    if (c.seal === 'Red') t.appendChild(Object.assign(document.createElement('i'), { className: 'scred', textContent: '红' }));
    t.appendChild(scTileActions('hand', order, i));`,
  `    t.style.marginRight = (i === order.length - 1 ? 0 : handPitch(order.length) - CARDW) + 'px';
    /* 原版手牌是弧形（CardArea:align_cards）：角度 ±0.2*(k-n/2-0.5)/n，
       两端按 |0.5*(-n/2+k-0.5)/n| 下沉一点，中间最高。 */
    const n2 = order.length;
    const kk = i + 1;
    const ar = 0.2 * (kk - n2 / 2 - 0.5) / n2 * 57.2958;
    const ay = Math.abs(0.5 * (-n2 / 2 + kk - 0.5) / n2) * 34.65;
    t.style.setProperty('--ar', ar.toFixed(2) + 'deg');
    t.style.setProperty('--ay', ay.toFixed(1) + 'px');
    if (c.seal === 'Red') t.appendChild(Object.assign(document.createElement('i'), { className: 'scred', textContent: '红' }));
    t.appendChild(scTileActions('hand', order, i));`,
  '④ 手牌按原版公式排成弧形')

rep(CSS,
  `.sctile{position:relative;cursor:pointer;border-radius:var(--g-r);line-height:0;margin-right:-20px;transition:transform .12s,box-shadow .12s,filter .12s}`,
  `.sctile{position:relative;cursor:pointer;border-radius:var(--g-r);line-height:0;margin-right:-20px;
  /* --ay / --ar 是每张牌自己的弧形偏移与角度（JS 按原版公式算好塞进来） */
  transform:translateY(var(--ay,0px)) rotate(var(--ar,0deg));
  transform-origin:50% 100%;
  transition:transform .12s,box-shadow .12s,filter .12s}`,
  '④ 弧形位移/角度变量')

rep(CSS,
  `.sctile:hover{transform:scale(1.05);z-index:200 !important}`,
  `.sctile:hover{transform:translateY(calc(var(--ay,0px) - 7px)) rotate(var(--ar,0deg)) scale(1.05);z-index:200 !important}`,
  '④ 悬停时保持弧形')

rep(CSS,
  `.sctile.sel{transform:translateY(-19px)}`,
  `.sctile.sel{transform:translateY(calc(var(--ay,0px) - 19px)) rotate(var(--ar,0deg))}`,
  '④ 选中时保持弧形')

rep(CSS,
  `.sctile.on{transform:translateY(-19px);z-index:210 !important}
.sctile.sel:hover,.sctile.on:hover{transform:translateY(-19px) scale(1.05)}`,
  `.sctile.on{transform:translateY(calc(var(--ay,0px) - 19px)) rotate(var(--ar,0deg));z-index:210 !important}
.sctile.sel:hover,.sctile.on:hover{transform:translateY(calc(var(--ay,0px) - 19px)) rotate(var(--ar,0deg)) scale(1.05)}`,
  '④ 高亮态保持弧形')

console.log('完成')
