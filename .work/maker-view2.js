/* Mod 制作器视图（重写版）：一个函数、一层作用域、按顺序建。
   之前两次失败都出在"跨块共享变量/跨块塞 DOM"，这一版原则上不那样做：
   所有元素引用都是本函数的 const，谁的块里用就在谁的块里建。
   结构：顶栏 → 左栏（预览 + 导出）→ 右栏五段：
     ① 做什么（类型胶囊 + 来源与贴图：照现成的牌 / 取图集格子 / 上传自己的图 / 悬浮立绘）
     ② 它做什么（预设库 + 句子式效果行 + 游戏内描述预览）
     ③ 名字与描述   ④ 数值与兼容性   ⑤ 高级 */
function viewMaker (root) {
  const MKEL = {};
  let artTarget = 'art';        /* 网格在给谁选格子：art / soul */

  /* ---------- 顶栏 ---------- */
  const head = document.createElement('div'); head.className = 'mkhead';
  const hchips = MK_TYPES.map((t) => '<button class="mkhchip' + (t[0] === MK.type ? ' on' : '') + '" data-mktype="' + t[0] + '">' + t[1] + '</button>').join('');
  head.innerHTML = '<div class="mkhtitle"><b>Mod 制作器</b><span>不用写代码，选一选就能出一个能用的 mod</span></div>' +
    '<div class="mkhchips">' + hchips + '</div>' +
    '<div class="mkhsum" id="mkSum">' + mkSummaryHtml() + '</div>';
  head.onclick = (e) => { const b = e.target.closest('[data-mktype]'); if (b) mkSet({ type: b.dataset.mktype }) };
  root.appendChild(head);

  const wrap = document.createElement('div'); wrap.className = 'maker';
  const left = document.createElement('div'); left.className = 'mkleft';
  const right = document.createElement('div'); right.className = 'mkright';
  wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);

  /* ---------- 左栏：预览 + 导出 ---------- */
  const pv = document.createElement('div'); pv.className = 'mkpv';
  const pvBox = document.createElement('div'); pvBox.className = 'mkpvbox';
  MKEL.pvBox = pvBox;
  const repo = (cv, px) => {
    if (!cv) return;
    cv.style.width = px + 'px';
    cv.style.height = Math.round(px * CARD_H / CARD_W) + 'px';
    pvBox.appendChild(cv);
  };
  repo(mkPreviewCanvas(), 142);
  pv.appendChild(pvBox);
  const pvLine = document.createElement('div'); pvLine.className = 'mkpvline';
  pvLine.innerHTML = '<div class="mkpvname"><b>' + esc(MK.nameZh || MK.key) + '</b>' + mkTag() + '</div>' +
    '<div class="mkpvfx">' + esc(mkAutoText('zh') || '（还没有效果 —— 到右边第 ② 段选一个预设）') + '</div>';
  pv.appendChild(pvLine);
  left.appendChild(pv);

  const io = document.createElement('div'); io.className = 'mkio opt';
  io.innerHTML = '<h4><span class="otitle">导出</span></h4><div class="obody">' +
    '<div class="mkrow"><label>mod id<input class="tbtn" data-mk="modId"></label>' +
    '<label>前缀<input class="tbtn" data-mk="prefix" title="Steamodded 会自动给 key 加这个前缀"></label></div>' +
    '<div class="mkrow"><label>作者<input class="tbtn" data-mk="author"></label>' +
    '<label>版本<input class="tbtn" data-mk="version"></label></div>' +
    '<div class="mkbtnrow"><button class="btn primary" id="mkZip">⬇ 下载 mod zip</button>' +
    '<button class="btn" id="mkCheck">✓ 自检并导入</button>' +
    '<button class="btn" id="mkCopy">📋 复制 Lua</button></div>' +
    '<div class="hint" id="mkStatus">生成的是能直接丢进 <code>Mods/</code> 的 mod：manifest + Lua + 1x/2x 贴图。</div></div>';
  left.appendChild(io);

  /* ---------- 段工具 ---------- */
  const section = (title) => {
    const box = document.createElement('section'); box.className = 'opt';
    const h = document.createElement('h4');
    h.innerHTML = '<span class="otitle">' + title + '</span><span class="chev">▾</span>';
    const body = document.createElement('div'); body.className = 'obody';
    h.onclick = () => box.classList.toggle('collapsed');
    box.appendChild(h); box.appendChild(body);
    right.appendChild(box);
    return body;
  };
  const field = (label, inner, cls) => {
    const lab = document.createElement('label');
    if (cls) lab.className = cls;
    lab.innerHTML = '<span>' + label + '</span>';
    if (typeof inner === 'string') lab.insertAdjacentHTML('beforeend', inner);
    else lab.appendChild(inner);
    return lab;
  };

  /* ---------- ① 做什么（含：来源与贴图，全在这一段里） ---------- */
  {
    const body = section('① 做什么（也决定预览长什么样）');
    const chips = document.createElement('div'); chips.className = 'chips';
    MK_TYPES.forEach((t) => {
      const b = document.createElement('button');
      b.className = 'pick' + (t[0] === MK.type ? ' on' : '');
      b.textContent = t[1];
      b.onclick = () => mkSet({ type: t[0] });
      chips.appendChild(b);
    });
    body.appendChild(chips);

    const src = document.createElement('div'); src.className = 'mksrc';
    src.innerHTML = '<div class="mklabel">来源与贴图 —— 三条路任选：照现成的牌做 / 从图集里取一格 / 上传自己的图</div>';
    /* 1) 照现成的牌做（原版 + mod） */
    const clone = document.createElement('label'); clone.className = 'mkwide';
    const pickable = ['Joker', 'Consumable', 'Voucher', 'Booster', 'Deck', 'Enhancement', 'Edition', 'Seal', 'Tag', 'Blind'];
    const allItems = ITEMS.filter((i) => pickable.indexOf(i.cat) >= 0);
    const vanilla = allItems.filter((i) => !i.source);
    const modGroups = {};
    allItems.filter((i) => i.source).forEach((i) => { (modGroups[i.source] = modGroups[i.source] || []).push(i) });
    clone.innerHTML = '<span>① 照现成的牌做一个（原版 + 已导入的 mod 全都在这里）</span>' +
      '<select class="tbtn" id="mkClone"><option value="">（不复制，自己从头做）</option>' +
      '<optgroup label="原版 Balatro（' + vanilla.length + '）">' + vanilla.map((i) => '<option value="' + i.id + '">' + esc(i.cat + ' · ' + nm(i)) + '</option>').join('') + '</optgroup>' +
      Object.keys(modGroups).map((k) => '<optgroup label="' + esc(modGroups[k][0].sourceName || k) + '（' + modGroups[k].length + '）">' +
        modGroups[k].map((i) => '<option value="' + i.id + '">' + esc(i.cat + ' · ' + nm(i)) + '</option>').join('') + '</optgroup>').join('') +
      '</select>';
    src.appendChild(clone);
    /* 2) 从图集里取一格 + 上传自己的图 */
    const atlasNames = Object.keys(D.atlases);
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('② 从哪个图集取图', '<select class="tbtn" id="mkAtlas">' +
      atlasNames.map((x) => '<option value="' + x + '"' + (MK.art.atlas === x ? ' selected' : '') + '>' + mkAtlasLabel(x) + '</option>').join('') + '</select>'));
    row.appendChild(field('③ 或上传自己的图', '<input type="file" id="mkUpload" accept="image/*">', 'mkfile'));
    src.appendChild(row);
    src.insertAdjacentHTML('beforeend', '<div class="hint">' + MK_IMG_TIP + '</div><div class="hint" id="mkArtHint"></div>');
    const grid = document.createElement('div'); grid.className = 'mkartgrid'; grid.id = 'mkArtGrid';
    src.appendChild(grid);
    /* 3) 悬浮立绘：自己的图集 / 自己的文件 */
    if (MK.type === 'Joker') {
      const soul = document.createElement('div'); soul.className = 'mksoul';
      const row2 = document.createElement('div'); row2.className = 'mkrow';
      row2.appendChild(field('立绘从哪个图集取', '<select class="tbtn" id="mkSoulAtlas">' +
        atlasNames.map((x) => '<option value="' + x + '"' + (MK.soul.atlas === x ? ' selected' : '') + '>' + mkAtlasLabel(x) + '</option>').join('') + '</select>'));
      row2.appendChild(field('或上传立绘文件', '<input type="file" id="mkSoulUp" accept="image/*">', 'mkfile'));
      const pickBtn = document.createElement('button');
      pickBtn.className = 'btn'; pickBtn.type = 'button'; pickBtn.id = 'mkSoulPick';
      pickBtn.textContent = '在下面的网格里选立绘的格子';
      row2.appendChild(pickBtn);
      soul.innerHTML = '<label class="mkck"><input type="checkbox" id="mkSoulOn"' + (MK.soul.on ? ' checked' : '') + '>给这张牌加一层「悬浮立绘」（传奇牌那种飘在半空的画）</label>';
      soul.appendChild(row2);
      soul.insertAdjacentHTML('beforeend', '<div class="hint" id="mkSoulHint">' + (MK.soul.uploadName ? ('立绘用的是你上传的文件：' + esc(MK.soul.uploadName)) : ('立绘取 ' + esc(MK.soul.atlas) + ' 的 x' + MK.soul.pos.x + ' y' + MK.soul.pos.y)) + '；开启后预览里会立刻叠出来（有帧序列时会飘着动）。</div>');
      src.appendChild(soul);
    }
    body.appendChild(src);

    /* 网格：滚到才画；点格子给 art 或 soul */
    const paintCell = (cell, x, y) => {
      if (cell.__painted) return;
      cell.__painted = true;
      const a = D.atlases[MK.art.atlas];
      if (!a) return;
      const sc = a.scale || 1;
      const cv = newCanvas(34, 46);
      const c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = false;
      const sw = a.px * sc, sh = a.py * sc;
      const r = Math.min(cv.width / sw, cv.height / sh);
      try { c2.drawImage(IMG[a.file], x * sw, y * sh, sw, sh, (cv.width - sw * r) / 2, (cv.height - sh * r) / 2, sw * r, sh * r) } catch (e) { /* 图没解码完 */ }
      cell.appendChild(cv);
    };
    const a = D.atlases[MK.art.atlas];
    if (a) {
      const sc = a.scale || 1;
      const cols = a.cols || Math.max(1, Math.floor(a.w / (a.px * sc)));
      const rows = a.rows || Math.max(1, Math.floor(a.h / (a.py * sc)));
      const total = Math.min(cols * rows, 240);
      for (let i = 0; i < total; i++) {
        const x = i % cols, y = Math.floor(i / cols);
        const cell = document.createElement('button');
        const cur = artTarget === 'soul' ? MK.soul : MK.art;
        cell.className = 'mkcell' + (!cur.upload && cur.pos.x === x && cur.pos.y === y ? ' on' : '');
        cell.title = 'x=' + x + ' y=' + y + (artTarget === 'soul' ? '（给立绘）' : '');
        cell.onclick = () => {
          if (artTarget === 'soul') mkSet({ soul: Object.assign({}, MK.soul, { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null }) });
          else mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null, animated: false } });
        };
        grid.appendChild(cell);
        if (IO) { cell._paint = () => paintCell(cell, x, y); IO.observe(cell) } else paintCell(cell, x, y);
      }
    }
    const hint = src.querySelector('#mkArtHint');
    if (hint) hint.textContent = MK.art.uploadName ? ('主体用的是你上传的图：' + MK.art.uploadName + (MK.art.frames ? '（动图 ' + MK.art.frames.length + ' 帧）' : '')) : (a ? (a.file + ' · ' + (a.cols || '?') + '×' + (a.rows || '?') + ' 格 · 当前 x=' + MK.art.pos.x + ' y=' + MK.art.pos.y + (artTarget === 'soul' ? '（网格现在给立绘选）' : '')) : '这个图集没有贴图信息');

    /* 类型专属设置（盲注/补充包/牌组/标签/优惠券/强化/版本/蜡封） */
    if (MK_TYPE_FIELDS[MK.type]) {
      const tf = document.createElement('div'); tf.className = 'mktfields';
      tf.innerHTML = '<div class="mklabel">这个类型专属的设置</div>';
      const rowT = document.createElement('div'); rowT.className = 'mkrow';
      MK_TYPE_FIELDS[MK.type].forEach((f) => {
        const key = f[0], label = f[1], kind = f[2], opt = f[3];
        const cur = MK.t[key] !== undefined ? MK.t[key] : opt;
        if (kind === 'num') {
          rowT.appendChild(field(label, '<input class="tbtn mkn" type="number" step="0.5" data-mkt="' + key + '" value="' + cur + '">'));
        } else if (kind === 'bool') {
          rowT.appendChild(field(label, '<input type="checkbox" data-mkt="' + key + '"' + (cur ? ' checked' : '') + '>', 'mkck'));
        } else if (kind === 'sel') {
          rowT.appendChild(field(label, '<select class="tbtn" data-mkt="' + key + '">' + opt.map((o) => '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>'));
        } else {
          rowT.appendChild(field(label, '<span class="hint">' + opt + '</span>', 'mkwide'));
        }
      });
      tf.appendChild(rowT);
      body.appendChild(tf);
    }
  }

  /* ---------- ② 它做什么 ---------- */
  {
    const body = section(MK.type === 'Joker' ? '② 它做什么（选择式，不用写代码）' : '② 它做什么');
    if (MK.type === 'Joker') {
      const pres = document.createElement('div'); pres.className = 'mkpresets';
      pres.innerHTML = '<div class="mklabel">常用预设（点一下就是一整套效果）</div>' +
        MK_PRESETS.map((p, i) => '<button class="mkpreset" data-preset="' + i + '">' + p[0] + '</button>').join('');
      body.appendChild(pres);
      const list = document.createElement('div'); list.className = 'mkfxlist';
      MK.effects.forEach((e, i) => {
        const row = document.createElement('div'); row.className = 'mkfx mkfx-' + e.eff;
        const opts = (arr, cur) => arr.map((o) => '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('');
        let condVal = '';
        if (e.cond === 'suit') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_SUITS, e.condVal) + '</select>';
        else if (e.cond === 'enh') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_ENH, e.condVal) + '</select>';
        else if (e.cond === 'edition') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_EDITION, e.condVal) + '</select>';
        else if (e.cond === 'seal') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_SEAL, e.condVal) + '</select>';
        else if (e.cond === 'rank') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_RANKS, e.condVal) + '</select>';
        else if (e.cond === 'hand') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(D.hands.slice().sort((x, y) => (y.order || 0) - (x.order || 0)).map((h) => [h.name, handCN(h)]), e.condVal) + '</select>';
        else if (e.cond === 'count' || e.cond === 'deckcount') condVal = '<input class="tbtn mkn" type="number" min="1" max="99" data-fx="' + i + '" data-f="condVal" value="' + (e.condVal || (e.cond === 'count' ? 5 : 40)) + '">';
        row.innerHTML = '<i class="mknum">' + (i + 1) + '</i>' +
          '<span class="mkword">当</span><select class="tbtn" data-fx="' + i + '" data-f="when">' + opts(MK_WHEN, e.when) + '</select>' +
          '<span class="mkword">且</span><select class="tbtn" data-fx="' + i + '" data-f="cond">' + opts(MK_COND, e.cond) + '</select>' + condVal +
          '<span class="mkword">则给</span><select class="tbtn" data-fx="' + i + '" data-f="eff">' + opts(MK_EFF, e.eff) + '</select>' +
          '<input class="tbtn mkn" type="number" step="0.5" data-fx="' + i + '" data-f="val" value="' + e.val + '">' +
          '<button class="btn warn mkx" data-del="' + i + '" title="删掉这一行">✕</button>';
        list.appendChild(row);
      });
      body.appendChild(list);
      const descBox = document.createElement('div'); descBox.className = 'mkdescbox';
      descBox.innerHTML = '<div class="mklabel">游戏里会显示成（跟着上面的选择实时变）</div><div class="mkdesc" id="mkDesc">' + mkDescHtml() + '</div>';
      body.appendChild(descBox);
      const addRow = document.createElement('div'); addRow.className = 'mkbtnrow';
      addRow.innerHTML = '<button class="btn" id="mkAddFx">＋ 加一条效果</button>' +
        '<button class="btn" id="mkAutoText">按上面的效果生成描述</button>';
      body.appendChild(addRow);
    } else {
      const row = document.createElement('div'); row.className = 'mkrow';
      row.appendChild(field('属于哪一类', '<select class="tbtn" id="mkSet">' + MK_SETS.map((x) => '<option value="' + x[0] + '"' + (MK.set === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>'));
      row.appendChild(field('使用效果', '<select class="tbtn" id="mkUse">' + MK_USE.map((u) => '<option value="' + u[0] + '"' + (MK.useKind === u[0] ? ' selected' : '') + '>' + u[1] + '</option>').join('') + '</select>'));
      row.appendChild(field('数值', '<input class="tbtn mkn" type="number" id="mkUseVal" value="' + MK.useVal + '">'));
      body.appendChild(row);
      body.insertAdjacentHTML('beforeend', '<div class="hint">非小丑牌类型这一版做「外观 + 文案 + 类型专属设置 + 一个使用效果」，更细的逻辑到第 ⑤ 段的高级里补。</div>');
    }
  }

  /* ---------- ③ 名字与描述 ---------- */
  {
    const body = section('③ 名字与描述');
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('名字（中文）', '<input class="tbtn" data-mk="nameZh">'));
    row.appendChild(field('名字（英文）', '<input class="tbtn" data-mk="nameEn">'));
    body.appendChild(row);
    const row2 = document.createElement('div'); row2.className = 'mkrow';
    row2.appendChild(field('描述（中文，留空按效果自动生成）', '<input class="tbtn" data-mk="textZh" id="mkTextZh">', 'mkwide'));
    body.appendChild(row2);
  }

  /* ---------- ④ 数值与兼容性 ---------- */
  {
    const body = section('④ 数值与兼容性');
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('稀有度', '<select class="tbtn" data-mk="rarity">' + MK_RARITY.map((r) => '<option value="' + r[0] + '"' + (MK.rarity === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select>'));
    row.appendChild(field('价格', '<input class="tbtn mkn" type="number" data-mk="cost">'));
    row.appendChild(field('出现权重', '<input class="tbtn mkn" type="number" data-mk="weight">'));
    row.appendChild(field('排序', '<input class="tbtn mkn" type="number" data-mk="order">'));
    body.appendChild(row);
    const row2 = document.createElement('div'); row2.className = 'mkrow';
    [['eternal', '可以永恒'], ['perishable', '可以易腐'], ['blueprint', '可被蓝图复制']].forEach((f) => {
      row2.appendChild(field(f[1], '<input type="checkbox" data-mkflag="' + f[0] + '"' + (MK[f[0]] ? ' checked' : '') + '>', 'mkck'));
    });
    body.appendChild(row2);
  }

  /* ---------- ⑤ 高级 ---------- */
  {
    const body = section('⑤ 高级（可跳过）');
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('条目 key', '<input class="tbtn" data-mk="key">'));
    row.appendChild(field('mod 名称', '<input class="tbtn" data-mk="modName">'));
    body.appendChild(row);
    const row2 = document.createElement('div'); row2.className = 'mkrow';
    row2.appendChild(field('config 覆盖（JSON，可留空）', '<input class="tbtn mono" data-mk="config" placeholder="（不用填）">', 'mkwide'));
    body.appendChild(row2);
    body.insertAdjacentHTML('beforeend', '<div class="hint">生成的 Lua（可以直接改；改了就不再被上面的选项覆盖，点「重新生成」会覆盖你的改动）：</div>');
    const ta = document.createElement('textarea'); ta.id = 'mkLua'; ta.className = 'mklua'; ta.spellcheck = false;
    body.appendChild(ta);
    const row3 = document.createElement('div'); row3.className = 'mkbtnrow';
    row3.innerHTML = '<button class="btn" id="mkRegen">↻ 按上面的选项重新生成</button><button class="btn" id="mkApplyCfg">把 config JSON 写进 Lua</button>';
    body.appendChild(row3);
  }

  /* ---------- 事件（都在同一个作用域里按 id 找） ---------- */
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => [].slice.call(root.querySelectorAll(sel));
  const status = (t, cls) => { const el = q('#mkStatus'); if (el) { el.textContent = t; el.className = 'hint' + (cls ? ' ' + cls : '') } };
  MKEL.status = status;
  const refresh = () => {
    const sum = q('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml();
    const d = q('#mkDesc'); if (d) d.innerHTML = mkDescHtml();
    const line = q('.mkpvline');
    if (line) line.innerHTML = '<div class="mkpvname"><b>' + esc(MK.nameZh || MK.key) + '</b>' + mkTag() + '</div>' +
      '<div class="mkpvfx">' + esc(mkAutoText('zh') || '（还没有效果 —— 到右边第 ② 段选一个预设）') + '</div>';
    if (!MK.luaDirty) { const ta2 = q('#mkLua'); if (ta2) ta2.value = mkLua() }
  };
  MKEL.refresh = refresh;
  const redraw = () => render();
  MKEL.redraw = redraw;

  /* 基本输入 */
  qa('[data-mk]').forEach((el) => {
    const k = el.dataset.mk;
    const val = MK[k];
    if (el.tagName === 'SELECT') el.value = val == null ? '' : val;
    else el.value = val == null ? '' : val;
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      MK[k] = el.type === 'number' ? Number(el.value) : el.value;
      if (el.tagName === 'SELECT' || el.type === 'number') { redraw(); return }
      refresh();
    });
  });
  qa('[data-mkflag]').forEach((el) => el.addEventListener('change', () => mkSet({ [el.dataset.mkflag]: el.checked })));
  qa('[data-mkt]').forEach((el) => {
    const k = el.dataset.mkt;
    const ev = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(ev, () => {
      MK.t[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) || 0 : el.value);
      refresh();
    });
  });
  const luaEl = q('#mkLua'); if (luaEl) luaEl.addEventListener('input', () => { MK.lua = luaEl.value; MK.luaDirty = true });
  const rg = q('#mkRegen'); if (rg) rg.onclick = () => { MK.luaDirty = false; MK.lua = null; redraw() };
  const ac = q('#mkApplyCfg'); if (ac) ac.onclick = () => { const l = q('#mkLua'); if (l && MK.config) { l.value = l.value.replace(/config = \{[\s\S]*?\n    \},/, 'config = ' + MK.config + ','); MK.lua = l.value; MK.luaDirty = true } };
  const af = q('#mkAddFx'); if (af) af.onclick = () => mkSet({ effects: MK.effects.concat([{ when: 'card', cond: '', condVal: '', eff: 'mult', val: 4 }]) });
  const at = q('#mkAutoText'); if (at) at.onclick = () => mkSet({ textZh: mkAutoText('zh'), textEn: mkAutoText('en') });

  /* 图集 / 上传 / 立绘 */
  const as = q('#mkAtlas'); if (as) as.onchange = () => mkSet({ art: Object.assign({}, MK.art, { atlas: as.value, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false }) });
  const up = q('#mkUpload');
  if (up) up.onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const info = await mkReadImage(f);
    if (!info) { status('这张图读不了（格式不支持）'); return }
    const multi = info.frames.length > 1;
    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, uploadName: f.name }) });
    if (multi) { status('已使用「' + f.name + '」：动图拆出 ' + info.frames.length + ' 帧，预览会逐帧播放，导出会铺成横向帧序列。', 'ok'); mkStartAnim() }
    else status('已使用「' + f.name + '」（单帧）。动图拆帧需要浏览器支持；拆不出多帧时这里会说明。');
  };
  const so = q('#mkSoulOn');
  if (so) so.onchange = () => { mkSet({ soul: Object.assign({}, MK.soul, { on: so.checked }) }); if (so.checked && (MK.soul.frames || []).length > 1) mkStartAnim() };
  const sa = q('#mkSoulAtlas');
  if (sa) sa.onchange = () => mkSet({ soul: Object.assign({}, MK.soul, { atlas: sa.value, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null }) });
  const sp = q('#mkSoulPick');
  if (sp) sp.onclick = () => { artTarget = artTarget === 'soul' ? 'art' : 'soul'; status(artTarget === 'soul' ? '网格现在给「悬浮立绘」选格子（再点一次切回主体）' : '网格切回给主体选格子'); redraw() };
  const su = q('#mkSoulUp');
  if (su) su.onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const info = await mkReadImage(f);
    if (!info) { status('这张立绘图读不了'); return }
    const multi = info.frames.length > 1;
    mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, uploadName: f.name }) });
    status('立绘已换成「' + f.name + '」' + (multi ? '（动图 ' + info.frames.length + ' 帧，预览里会飘着动）' : '') + '，预览里现在就能看到。', 'ok');
    if (multi) mkStartAnim();
  };

  /* 效果行 / 预设 / 删除 */
  qa('[data-preset]').forEach((el) => el.addEventListener('click', () => {
    const p = MK_PRESETS[Number(el.dataset.preset)];
    mkSet({ effects: p[1].map((x) => Object.assign({}, x)), textZh: '', textEn: '' });
    status('已套用预设「' + p[0] + '」—— 数值和条件都能再改。');
  }));
  qa('[data-fx]').forEach((el) => {
    const i = Number(el.dataset.fx), f = el.dataset.f;
    el.addEventListener('change', () => {
      const list = MK.effects.slice();
      list[i] = Object.assign({}, list[i]);
      list[i][f] = el.type === 'number' ? Number(el.value) : el.value;
      if (f === 'cond' && el.value === 'suit') list[i].condVal = 'Hearts';
      if (f === 'cond' && el.value === 'enh') list[i].condVal = 'm_bonus';
      if (f === 'cond' && el.value === 'edition') list[i].condVal = 'e_foil';
      if (f === 'cond' && el.value === 'seal') list[i].condVal = 'Red';
      if (f === 'cond' && el.value === 'rank') list[i].condVal = 'King';
      if (f === 'cond' && el.value === 'hand') list[i].condVal = (D.hands[0] || {}).name;
      if (f === 'cond' && el.value === 'count') list[i].condVal = 5;
      if (f === 'cond' && el.value === 'deckcount') list[i].condVal = 40;
      if (f === 'eff' && el.value === 'reps' && !Number(list[i].val)) list[i].val = 1;
      mkSet({ effects: list });
    });
  });
  qa('[data-del]').forEach((el) => el.addEventListener('click', () => {
    const list = MK.effects.slice(); list.splice(Number(el.dataset.del), 1);
    mkSet({ effects: list });
  }));
  const us = q('#mkUse'); if (us) us.onchange = () => mkSet({ useKind: us.value });
  const uv = q('#mkUseVal'); if (uv) uv.oninput = () => { MK.useVal = Number(uv.value) || 0; refresh() };
  const st2 = q('#mkSet'); if (st2) st2.onchange = () => mkSet({ set: st2.value });

  /* 克隆：照现成的牌做一个（原版 + mod） */
  const cs = q('#mkClone');
  if (cs) cs.onchange = () => {
    const it = BY_ID[cs.value];
    if (!it) return;
    const cfg = it.config || {};
    const effects = [];
    const push = (when, kind, v) => { if (v) effects.push({ when, cond: '', condVal: '', eff: kind, val: v }) };
    push('hand', 'chips', cfg.t_chips); push('hand', 'mult', cfg.t_mult); push('hand', 'xmult', cfg.x_mult);
    if (cfg.extra && typeof cfg.extra === 'object') {
      push('card', 'chips', cfg.extra.chips); push('card', 'mult', cfg.extra.mult); push('card', 'xmult', cfg.extra.x_mult);
    }
    const rule = (typeof JOKER_RULES !== 'undefined' && JOKER_RULES.rules ? JOKER_RULES.rules : []).filter((r) => r.n === it.name)[0];
    if (rule && rule.e) {
      const seen = {};
      rule.e.forEach((ex) => {
        const f = ex.split('=')[0];
        const kind = /^x_mult|^Xmult_mod/.test(f) ? 'xmult' : /^mult|^t_mult|^mult_mod/.test(f) ? 'mult' : /^chips|^chip_mod|^t_chips/.test(f) ? 'chips' : /dollars/.test(f) ? 'dollars' : null;
        if (!kind || seen[kind]) return;
        seen[kind] = true;
        const num = (cfg.extra && (cfg.extra[f] || cfg.extra.chips || cfg.extra.mult || cfg.extra.x_mult)) || cfg[f] || (kind === 'xmult' ? 1.5 : 4);
        effects.push({ when: rule.r === 'individual' ? 'card' : (rule.r === 'repetition' ? 'repetition' : 'hand'), cond: '', condVal: '', eff: kind, val: typeof num === 'number' ? num : 4 });
      });
    }
    const zh = (it.text && it.text.zh_CN) || [];
    mkSet({
      cloneFrom: it.id,
      type: it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat),
      key: 'my' + String(it.key || it.id).replace(/^[a-z]+_/, ''),
      art: { atlas: it.atlas || MK.art.atlas, pos: it.pos || { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false },
      nameZh: nm(it, 'zh_CN'), nameEn: nm(it, 'en-us'), textZh: zh.join(' '), textEn: ((it.text && it.text['en-US']) || (it.text && it.text['en-us']) || []).join(' '),
      rarity: it.rarity || MK.rarity, cost: it.cost || MK.cost, order: it.order || MK.order, weight: it.weight || MK.weight,
      effects: effects.length ? effects : MK.effects,
    });
    status('已照「' + nm(it, 'zh_CN') + '」复制一份（类型/贴图/数值/文案/效果都进来了），改完导出就是你的新条目。', 'ok');
  };

  /* 导出 / 自检 / 复制 */
  const zb = q('#mkZip');
  if (zb) zb.onclick = async () => {
    status('正在打包…');
    try {
      const files = await mkBuildFiles();
      const bytes = zipStore(files);
      save(bytes, MK.modId + '.zip', 'application/zip');
      status('已生成 ' + MK.modId + '.zip（' + files.length + ' 个文件，' + Math.round(bytes.length / 1024) + ' KB）—— 解压到 %AppData%/Balatro/Mods/ 即可。', 'ok');
    } catch (e) { status('打包失败：' + e.message) }
  };
  const ck = q('#mkCheck');
  if (ck) ck.onclick = async () => {
    status('正在自检（用图鉴自己的解析器把这份 mod 读一遍）…');
    try {
      const files = await mkBuildFiles();
      const res = await importZipBuffer(zipStore(files), MK.modId);
      const mod = res && res.mod;
      const ok = res && res.ok !== false;
      status((ok ? '自检通过：' : '自检有问题：') + (mod ? (mod.items + ' 个条目 / ' + mod.atlases + ' 个图集 / ' + mod.warnings.length + ' 条警告') : JSON.stringify(res)) +
        (mod && mod.warnings.length ? ' —— ' + mod.warnings.slice(0, 2).join('；') : ' —— 它已经出现在「图鉴」里了（左侧来源可选到它）。'), ok ? 'ok' : '');
    } catch (e) { status('自检失败：' + e.message) }
  };
  const cp = q('#mkCopy');
  if (cp) cp.onclick = () => {
    const l = q('#mkLua');
    const txt = (l && MK.luaDirty) ? l.value : mkLua();
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => status('Lua 已复制到剪贴板。', 'ok'), () => status('复制失败，请手动选中文本框复制。'));
    else status('这个浏览器不给剪贴板权限，请手动选中文本框复制。');
  };

  /* 动图：每次渲染重新起播（旧定时器挂在旧 DOM 上会自杀） */
  if (mkAnimTimer) { clearInterval(mkAnimTimer); mkAnimTimer = null }
  if ((MK.art.frames && MK.art.frames.length > 1) || (MK.soul.frames && MK.soul.frames.length > 1)) mkStartAnim();
}
