/* Adds the in-page mod import panel, the 来源 filter, and mod-aware UI bits. */
const fs = require('fs');
const path = require('path');
const W = __dirname;
const rd = (f) => fs.readFileSync(path.join(W, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(W, f), s);

let fails = 0;
function rep (file, from, to, label) {
  let s = rd(file);
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log('FAIL [' + label + '] occurrences=' + n); fails++; return }
  wr(file, s.replace(from, to));
  console.log('ok   ' + label);
}

/* ------------------------------------------------------------------ CSS */
const CSS = `
/* ---------- mod import ---------- */
.modsview{display:flex;flex-direction:column;gap:12px;padding:14px 16px 44px;max-width:940px}
.modsview h2{margin:0;font-size:16px;font-weight:600}
.modsview .lead{margin:0;font-size:12.5px;line-height:1.75;color:var(--fg3)}
.modsview .lead b{color:var(--fg)}
.modsview code{font-family:var(--mono);font-size:11.5px;background:#0d1319;border:1px solid var(--line);border-radius:4px;padding:0 4px}
.modsview .glabel{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--fg3);margin-top:4px}
.drop{
  border:1.5px dashed var(--line2);border-radius:12px;padding:20px 18px 18px;text-align:center;
  background:linear-gradient(180deg,#18222c,#141c25);transition:.15s
}
.drop.over{border-color:var(--accent);background:#152a29;box-shadow:inset 0 0 0 1px #4bc29255}
.drop .big{font-size:26px;line-height:1;color:var(--accent);opacity:.85}
.drop .t{font-size:13px;margin-top:9px}
.drop .s{font-size:11.5px;color:var(--fg3);margin-top:5px}
.dropbtns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:13px}
.modlist{display:flex;flex-direction:column;gap:10px}
.modcard{border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(180deg,#18222c,#141c25);padding:11px 13px}
.modcard .mh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.modcard .mh b{font-size:13.5px}
.modcard .mh .mid{font-family:var(--mono);font-size:11px;color:var(--fg3)}
.modcard .mh .sp{flex:1;min-width:6px}
.modcard .meta{font-size:11.5px;color:var(--fg3);margin-top:7px;display:flex;gap:14px;flex-wrap:wrap}
.modcard .meta b{color:var(--fg2)}
.modwarns{margin-top:8px;font-size:11.5px;line-height:1.6;color:#f3b958;background:#2a2312;border:1px solid #4a3c17;border-radius:6px;padding:7px 9px}
.modlog{font-family:var(--mono);font-size:11px;color:var(--fg3);white-space:pre-wrap;word-break:break-word;max-height:190px;overflow:auto;border:1px solid var(--line);border-radius:var(--radius);padding:9px 11px;background:#0b0d11}
.modlog .ok{color:#7fe0a0}.modlog .bad{color:#ff8b8b}.modlog .warn{color:#f3b958}
.cell .modtag{
  position:absolute;top:5px;right:5px;font-size:9px;letter-spacing:.4px;padding:1px 5px;border-radius:9px;
  background:#2b2140;border:1px solid var(--purple);color:#cbb8ee
}
@media(max-width:820px){
  .modsview{padding:12px 10px 100px}
  .drop{padding:16px 12px}
}
`;
{
  let s = rd('app.css');
  if (s.includes('.modsview')) { console.log('skip app.css (already patched)') }
  else { wr('app.css', s.replace(/\s*$/, '\n') + CSS); console.log('ok   app.css +mod styles') }
}

/* -------------------------------------------------------------- modimport */
rep('modimport.js', "const rel = f.webkitRelativePath || f.name;", "const rel = f.__rel || f.webkitRelativePath || f.name;", 'readFileList accepts __rel');

/* ----------------------------------------------------------------- app.js */

// 1. accept FileList / File[] as well as a Map
rep('app.js',
  `async function importModFiles (files, fallbackName) {
  const parsed = window.__MODIMPORT__.parseMod(files, fallbackName);`,
  `async function importModFiles (files, fallbackName) {
  const map = files instanceof Map ? files : await window.__MODIMPORT__.readFileList(files);
  const parsed = window.__MODIMPORT__.parseMod(map, fallbackName);`,
  'importModFiles accepts FileList');

// 2. big block: import helpers + viewMods, inserted before phaseNow
const BLOCK = `/* ---------------------------------------------------------- mod dropzone */
const MOD_LOG = [];
function modLog (kind, text) { MOD_LOG.push({ kind: kind || 'info', text: String(text) }); if (MOD_LOG.length > 240) MOD_LOG.shift() }

/** Walk a dropped directory entry, tagging every File with its relative path. */
function filesFromEntry (entry, out, prefix) {
  return new Promise((resolve) => {
    if (!entry) return resolve();
    if (entry.isFile) {
      entry.file((f) => {
        try { Object.defineProperty(f, '__rel', { value: (prefix || '') + f.name, configurable: true }) } catch (e) { /* ignore */ }
        out.push(f); resolve();
      }, () => resolve());
      return;
    }
    if (!entry.isDirectory) return resolve();
    const reader = entry.createReader();
    const acc = [];
    const next = () => reader.readEntries((ents) => {
      if (!ents.length) {
        Promise.all(acc.map((en) => filesFromEntry(en, out, (prefix || '') + entry.name + '/'))).then(() => resolve());
        return;
      }
      for (const en of ents) acc.push(en);
      next();
    }, () => resolve());
    next();
  });
}
/** Collect the files of a drop; folders are walked through the entries API. */
async function filesFromDrop (dt) {
  const out = [];
  const items = dt && dt.items ? Array.from(dt.items) : [];
  const entries = [];
  for (const it of items) if (it.kind === 'file' && typeof it.webkitGetAsEntry === 'function') { const en = it.webkitGetAsEntry(); if (en) entries.push(en) }
  if (entries.length) { await Promise.all(entries.map((en) => filesFromEntry(en, out, ''))); if (out.length) return out }
  return Array.from((dt && dt.files) || []);
}
const isZipName = (n) => /\\.(zip|balatro|mod)$/i.test(String(n || ''));

/** Import from a folder picker / drop (Files) or from a single .zip. */
async function importBatch (input, fallbackName) {
  const files = Array.from(input || []);
  if (!files.length) { toast('没有读到文件'); return null }
  const first = files[0].__rel || files[0].webkitRelativePath || files[0].name;
  let res = null;
  try {
    if (files.length === 1 && isZipName(first)) {
      modLog('info', '读取压缩包 ' + first + ' …');
      res = await importModZip(await files[0].arrayBuffer(), first.replace(/\\.[^.]+$/, ''));
    } else {
      res = await importModFiles(files, fallbackName);
    }
  } catch (e) {
    modLog('bad', '解析出错：' + (e && e.message ? e.message : e));
    toast('解析出错，详见导入面板的日志');
    render();
    return null;
  }
  if (!res || !res.ok) {
    const why = (res && res.reason) || '未知错误';
    modLog('bad', '导入失败：' + why);
    toast('导入失败：' + why);
  } else {
    const st = (res.mod && res.mod.stats) || {};
    modLog('ok', \`已导入「\${res.mod.name}」：条目 \${res.items} · 图集 \${res.atlases} · 扫描 \${st.decls || 0} 条声明（跳过 \${st.skipped || 0}）\`);
    for (const w of res.warnings || []) modLog('warn', '· ' + w);
    toast(\`已导入 \${res.mod.name}：\${res.items} 个条目\`);
  }
  render();
  return res;
}
async function importZipBuffer (buf, name) {
  try {
    const res = await importModZip(buf, name);
    if (!res || !res.ok) modLog('bad', '导入失败：' + ((res && res.reason) || '未知错误'));
    else { modLog('ok', \`已导入「\${res.mod.name}」：条目 \${res.items} · 图集 \${res.atlases}\`); for (const w of res.warnings || []) modLog('warn', '· ' + w) }
    render();
    return res;
  } catch (e) {
    modLog('bad', '压缩包解析出错：' + (e && e.message ? e.message : e));
    render();
    return null;
  }
}

function viewMods (root) {
  const v = document.createElement('div');
  v.className = 'modsview';
  const modItems = MODS.reduce((a, m) => a + m.items, 0);
  v.innerHTML = \`
    <h2>导入 Mod 素材</h2>
    <p class="lead">支持 <b>Steamodded（SMODS）格式</b> 的 Mod：把整个 Mod 文件夹拖进来，或者选它的 <code>.zip</code>。
      解析完全在本页进行——<b>不联网、不上传任何文件</b>。导入后，Mod 的小丑牌 / 消耗品 / 它自己新增的类型会直接进入图鉴，
      可以预览、搜索、合成，并导出 PNG / GIF / APNG / ZIP。</p>
    <div class="drop" id="modDrop">
      <div class="big">⊕</div>
      <div class="t">把 Mod 文件夹或 .zip 拖到这里</div>
      <div class="s">文件夹里需要有 <code>manifest.json</code> 和入口 lua，图集放在 <code>assets/2x/</code> 或 <code>assets/1x/</code></div>
      <div class="dropbtns">
        <button class="btn primary" id="modPickDir">选择 Mod 文件夹</button>
        <button class="btn" id="modPickZip">选择 Mod zip</button>
        \${MODS.length ? \`<button class="btn" id="modClear">全部卸载（\${MODS.length}）</button>\` : ''}
      </div>
      <input type="file" id="modDirInput" webkitdirectory directory multiple style="display:none">
      <input type="file" id="modZipInput" accept=".zip,.balatro,.mod,application/zip" style="display:none">
    </div>
    <div class="glabel">已导入（\${MODS.length} 个 Mod · \${modItems} 个条目）</div>
    <div class="modlist" id="modList"></div>
    <div class="glabel">导入日志</div>
    <div class="modlog" id="modLogBox"></div>
    <p class="lead" style="margin-top:2px">说明：解析器直接扫描 lua 里的 <code>SMODS.XXX{ ... }</code> 声明，并按 Mod 的 key 前缀（默认取 mod id 前 4 个小写字符，或 manifest 里的 <code>prefix</code>）去匹配 atlas / 本地化条目。
      如果某个 Mod 的牌是运行时循环生成的，解析不到的条目会写进日志；把日志发给作者就能补规则。</p>\`;

  const list = v.querySelector('#modList');
  if (!MODS.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = '还没有导入任何 Mod。';
    list.appendChild(h);
  }
  for (const m of MODS) {
    const c = document.createElement('div');
    c.className = 'modcard';
    const warns = m.warnings || [];
    const shown = warns.slice(0, 5);
    c.innerHTML = \`
      <div class="mh"><b>\${esc(m.name)}</b><span class="mid">\${esc(m.id)}</span><span class="sp"></span>
        <button class="btn" data-act="view">在图鉴中查看</button>
        <button class="btn" data-act="del">卸载</button></div>
      <div class="meta">
        <span>版本 <b>\${esc(m.version || '—')}</b></span>
        <span>作者 <b>\${esc(m.author || '—')}</b></span>
        <span>条目 <b>\${m.items}</b></span>
        <span>图集 <b>\${m.atlasKeys.length}</b></span>
        \${m.stats ? \`<span>声明 <b>\${m.stats.decls || 0}</b></span><span>文件 <b>\${m.stats.files || 0}</b></span>\` : ''}
        \${m.warnings.length ? \`<span>警告 <b>\${m.warnings.length}</b></span>\` : ''}
      </div>
      \${shown.length ? \`<div class="modwarns">\${shown.map((w) => '· ' + esc(w)).join('<br>')}\${warns.length > shown.length ? \`<br>…还有 \${warns.length - shown.length} 条，见下方日志\` : ''}</div>\` : ''}\`;
    c.querySelector('[data-act="view"]').onclick = () => { S.source = m.id; S.cat = 'all'; S.tab = 'codex'; render() };
    c.querySelector('[data-act="del"]').onclick = () => { removeMod(m.id); toast('已卸载 ' + m.name) };
    list.appendChild(c);
  }
  const logBox = v.querySelector('#modLogBox');
  if (!MOD_LOG.length) logBox.textContent = '（暂无）';
  else logBox.innerHTML = MOD_LOG.map((l) => \`<span class="\${l.kind === 'info' ? '' : l.kind}">\${esc(l.text)}</span>\`).join('\\n');
  logBox.scrollTop = logBox.scrollHeight;

  const drop = v.querySelector('#modDrop');
  const dirIn = v.querySelector('#modDirInput');
  const zipIn = v.querySelector('#modZipInput');
  v.querySelector('#modPickDir').onclick = () => dirIn.click();
  v.querySelector('#modPickZip').onclick = () => zipIn.click();
  const clear = v.querySelector('#modClear');
  if (clear) clear.onclick = () => { for (const m of MODS.slice()) removeMod(m.id); toast('已卸载全部 Mod') };
  dirIn.onchange = () => { const f = dirIn.files; dirIn.value = ''; importBatch(f) };
  zipIn.onchange = () => { const f = zipIn.files; zipIn.value = ''; importBatch(f) };

  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.add('over') });
  for (const ev of ['dragleave', 'dragend']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over') });
  drop.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.remove('over');
    filesFromDrop(e.dataTransfer).then((files) => importBatch(files));
  });
  // a drop anywhere else in the content area would otherwise be handled by the browser
  for (const ev of ['dragover', 'drop']) root.addEventListener(ev, (e) => { if (e.target === root || e.target === v) { e.preventDefault(); e.stopPropagation() } });
  root.appendChild(v);
}

/** Value fed to compose() as the game's G.TIMERS.REAL: live animation clock or the static slider. */`;

rep('app.js',
  `/** Value fed to compose() as the game's G.TIMERS.REAL: live animation clock or the static slider. */`,
  BLOCK,
  'insert mod dropzone + viewMods');

// 3. sidebar
rep('app.js',
  `function renderSidebar () {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  const groups = [['图鉴', CATS.slice(0, 1)], ['卡牌与消耗品', CATS.slice(1, 6)], ['牌组与强化', CATS.slice(6, 13)], ['其它资源', CATS.slice(13)]];
  for (const [label, cats] of groups) {
    const g = document.createElement('div'); g.className = 'catgroup'; g.textContent = label; sb.appendChild(g);
    for (const [key, name, icon] of cats) {
      const n = key === 'all' ? ITEMS.length : (D.counts[key] || 0);
      if (key !== 'all' && n === 0) continue;
      const el = document.createElement('div');
      el.className = 'cat' + (S.cat === key ? ' on' : '');
      el.innerHTML = \`<span class="k">\${icon}</span><span>\${name}</span><span class="cnt">\${n}</span>\`;
      el.onclick = () => { S.cat = key; S.tab = 'codex'; closeDrawers(); render(); };
      sb.appendChild(el);
    }
  }
  const g = document.createElement('div'); g.className = 'catgroup'; g.textContent = '工具'; sb.appendChild(g);
  for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤']]) {
    const el = document.createElement('div');
    el.className = 'cat' + (S.tab === k ? ' on' : '');
    el.innerHTML = \`<span class="k">\${icon}</span><span>\${label}</span>\`;
    el.onclick = () => { S.tab = k; closeDrawers(); render(); };
    sb.appendChild(el);
  }
}`,
  `function renderSidebar () {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  const group = (label) => { const g = document.createElement('div'); g.className = 'catgroup'; g.textContent = label; sb.appendChild(g) };
  const row = (name, icon, n, active, onclick, title) => {
    const el = document.createElement('div');
    el.className = 'cat' + (active ? ' on' : '');
    el.innerHTML = \`<span class="k">\${icon}</span><span>\${esc(name)}</span>\${n == null ? '' : \`<span class="cnt">\${n}</span>\`}\`;
    if (title) el.title = title;
    el.onclick = onclick;
    sb.appendChild(el);
    return el;
  };
  const pickCat = (key) => () => { S.cat = key; S.tab = 'codex'; closeDrawers(); render() };
  const pickTool = (k) => () => { S.tab = k; closeDrawers(); render() };
  const pickSource = (src) => () => { S.source = src; S.cat = 'all'; closeDrawers(); render() };

  const base = sourceItems();
  const per = (k) => base.filter((i) => i.cat === k).length;
  const knownCat = new Set(CATS.map((c) => c[0]));

  group('图鉴');
  row('全部', '✦', base.length, S.cat === 'all', pickCat('all'));
  for (const [label, cats] of [['卡牌与消耗品', CATS.slice(1, 6)], ['牌组与强化', CATS.slice(6, 13)], ['其它资源', CATS.slice(13)]]) {
    const visible = cats.filter(([k]) => per(k) > 0);
    if (!visible.length) continue;
    group(label);
    for (const [key, name, icon] of visible) row(name, icon, per(key), S.cat === key, pickCat(key));
  }
  const extra = [...new Set(base.map((i) => i.cat))].filter((k) => !knownCat.has(k)).sort();
  if (extra.length) {
    group('Mod 新增类型');
    for (const k of extra) row(categoryLabel(k), '◇', per(k), S.cat === k, pickCat(k), k);
  }
  if (MODS.length) {
    group('来源');
    row('全部来源', '∑', ITEMS.length, S.source === 'all', pickSource('all'));
    row('原版 Balatro', '◈', ITEMS.filter((i) => !i.source).length, S.source === 'vanilla', pickSource('vanilla'));
    for (const m of MODS) row(m.name, '⊕', ITEMS.filter((i) => i.source === m.id).length, S.source === m.id, pickSource(m.id), m.id);
  }
  group('工具');
  for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤'], ['mods', '导入 Mod', '⊕']]) {
    row(label, icon, k === 'mods' && MODS.length ? MODS.length : null, S.tab === k, pickTool(k));
  }
}`,
  'renderSidebar');

// 4. render dispatch
rep('app.js',
  `  else if (S.tab === 'data') viewData(content);`,
  `  else if (S.tab === 'data') viewData(content);
  else if (S.tab === 'mods') viewMods(content);`,
  'render dispatch');

// 5. search field: source
rep('app.js',
  `    case 'cat': case 'set': case 'id': case 'atlas': case 'effect': case 'kind':`,
  `    case 'cat': case 'set': case 'id': case 'atlas': case 'effect': case 'kind': case 'source':`,
  'matchFilter source');

// 6. cell badge + mod tag
rep('app.js',
  `  const b = document.createElement('div'); b.className = 'badge'; b.textContent = it.cat;
  el.appendChild(n); el.appendChild(m); el.appendChild(b);
  if (it.boss_colour) {
    const e = document.createElement('div'); e.className = 'eyebrow'; e.textContent = 'BOSS';
    e.style.color = it.boss_colour.hex || ''; el.appendChild(e);
  }`,
  `  const b = document.createElement('div'); b.className = 'badge'; b.textContent = categoryLabel(it.cat);
  el.appendChild(n); el.appendChild(m); el.appendChild(b);
  if (it.source) {
    const md = document.createElement('div'); md.className = 'modtag';
    md.textContent = 'MOD'; md.title = (it.sourceName || it.source) + ' · ' + it.id;
    el.appendChild(md);
  }
  if (it.boss_colour) {
    const e = document.createElement('div'); e.className = 'eyebrow'; e.textContent = 'BOSS';
    e.style.color = it.boss_colour.hex || ''; if (it.source) e.style.top = '22px'; el.appendChild(e);
  }`,
  'cellEl badge + mod tag');

// 7. detail: tag + source section
rep('app.js',
  `  addTag(it.cat);
  if (it.rarity) addTag(RARITY[it.rarity], D.colors.palette.rarity[it.rarity - 1]);`,
  `  addTag(categoryLabel(it.cat));
  if (it.source) addTag('MOD · ' + (it.sourceName || it.source), '#a782d1');
  if (it.rarity) addTag(RARITY[it.rarity], D.colors.palette.rarity[it.rarity - 1]);`,
  'detail tag');

rep('app.js',
  `  const sect = (title) => { const s = document.createElement('div'); s.className = 'sect'; if (title) { const h = document.createElement('h4'); h.textContent = title; s.appendChild(h); } d.appendChild(s); return s; };

  const s1 = sect('描述');`,
  `  const sect = (title) => { const s = document.createElement('div'); s.className = 'sect'; if (title) { const h = document.createElement('h4'); h.textContent = title; s.appendChild(h); } d.appendChild(s); return s; };

  if (it.source) {
    const s0 = sect('来源');
    const box = document.createElement('div'); box.className = 'names';
    box.innerHTML = \`<div class="n"><i>Mod</i><span>\${esc(it.sourceName || it.source)}</span></div>
      <div class="n"><i>Mod ID</i><span class="mono">\${esc(it.source)}</span></div>\` +
      (it.modFile ? \`<div class="n"><i>声明于</i><span class="mono">\${esc(it.modFile)}\${it.modLine ? ':' + it.modLine : ''}</span></div>\` : '') +
      \`<div class="n"><i>原始键</i><span class="mono">\${esc(it.set || '')}\${it.cat && it.set && it.set !== it.cat ? ' / ' + esc(it.cat) : ''}</span></div>\`;
    s0.appendChild(box);
    const btns = document.createElement('div'); btns.className = 'btns'; btns.style.marginTop = '9px';
    const b1 = document.createElement('button'); b1.className = 'btn';
    b1.textContent = '只看这个 Mod 的内容';
    b1.onclick = () => { S.source = it.source; S.cat = 'all'; S.tab = 'codex'; render() };
    btns.appendChild(b1);
    s0.appendChild(btns);
  }

  const s1 = sect('描述');`,
  'detail source section');

// 8. status bar
rep('app.js',
  `    <span>语言 <b>\${D.meta.locales.length}</b></span><span style="margin-left:auto">`,
  `    <span>语言 <b>\${D.meta.locales.length}</b></span>\${MODS.length ? \`<span>Mod <b>\${MODS.length}</b> · \${MODS.reduce((a, m) => a + m.items, 0)} 条</span>\` : ''}<span style="margin-left:auto">`,
  'status bar mods');

// 9. help section
rep('app.js',
  `  <div class="sect"><h4>数据来源</h4>`,
  `  <div class="sect"><h4>导入 Mod</h4><div class="desc">
    左侧「<b>导入 Mod</b>」可以直接读 <b>Steamodded（SMODS）格式</b> 的 Mod：拖入整个 Mod 文件夹或它的 zip，
    解析器会读 <code>manifest.json</code>、入口 lua、<code>assets/{{1x,2x}}</code> 图集与 <code>localization/</code>，
    把 Mod 的小丑牌 / 消耗品 / 自定义类型接进图鉴，并单独标上 <b>MOD</b> 角标。<br>
    全程在本地完成，不联网、不上传文件。若某个牌是运行时循环生成的，会写进导入日志的警告里。
  </div></div>
  <div class="sect"><h4>数据来源</h4>`,
  'help mod section');

// 10. console API
rep('app.js',
  `    webgl: !!GL, shaderPrograms: GL ? Object.keys(GL.programs) : [],
  };`,
  `    webgl: !!GL, shaderPrograms: GL ? Object.keys(GL.programs) : [],
    // --- mod import ---
    mods: MODS, importModZip, importModFiles, importBatch, importZipBuffer, filesFromDrop, removeMod, sourceItems,
    modImport: window.__MODIMPORT__, categoryLabel,
  };`,
  'console API');

// 11. boot log mentions mods
rep('app.js',
  `      GL ? Object.keys(GL.programs).length + ' 个着色器就绪' : '无 WebGL');`,
  `      GL ? Object.keys(GL.programs).length + ' 个着色器就绪' : '无 WebGL');
    if (MODS.length) console.log('[Balatro 素材图鉴] 已导入', MODS.length, '个 Mod');`,
  'boot log');

console.log(fails ? '\nPATCH FAILURES: ' + fails : '\nall patches applied');
