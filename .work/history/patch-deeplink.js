/* Deep links: encode the interesting part of the viewer state in the URL hash, restore it on
   load, and offer a "copy link" button. Works on file:// too (the hash is just a fragment). */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

/* --- the encoder/decoder, placed right before the i18n helpers --- */
rep(`/* ------------------------------------------------------------------ i18n */`,
  `/* ------------------------------------------------------------ deep links
 * #t=forge&c=Joker&s=testmod&i=j_cry_mosaic&q=mult&l=ja — only non-default values
 * are written, so a plain visit keeps a clean URL. Same code path on file://.
 * ------------------------------------------------------------------------- */
const HASH_KEYS = [['tab', 't'], ['cat', 'c'], ['source', 's'], ['sel', 'i'], ['q', 'q'], ['lang', 'l']];
function hashString () {
  const def = { tab: 'codex', cat: 'all', source: 'all', sel: null, q: '', lang: 'zh_CN' };
  const parts = [];
  for (const [key, short] of HASH_KEYS) {
    const v = S[key];
    if (v === undefined || v === null || v === '' || v === def[key]) continue;
    parts.push(short + '=' + encodeURIComponent(v));
  }
  return parts.length ? '#' + parts.join('&') : '#';
}
function syncHash () {
  const want = hashString();
  if (location.hash === want) return;
  try { history.replaceState(null, '', want) } catch (e) { location.hash = want.slice(1) }
}
/** Read the current hash into the state (validating against what actually exists). */
function applyHash () {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return false;
  const map = {};
  for (const kv of raw.split('&')) {
    const i = kv.indexOf('=');
    if (i < 0) continue;
    map[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  }
  let touched = false;
  for (const [key, short] of HASH_KEYS) {
    if (map[short] === undefined) continue;
    if (key === 'sel') { if (BY_ID[map[short]]) { S.sel = map[short]; touched = true } continue }
    if (key === 'lang') { if (D.meta.locales.some((l) => l.code === map[short])) { S.lang = map[short]; touched = true } continue }
    if (key === 'tab') {
      if (['codex', 'forge', 'atlas', 'hands', 'shaders', 'data', 'mods'].includes(map[short])) { S.tab = map[short]; touched = true }
      continue;
    }
    if (key === 'source') { S.source = map[short]; touched = true; continue }
    if (key === 'cat') { S.cat = map[short]; touched = true; continue }
    if (key === 'q') { S.q = map[short]; touched = true }
  }
  return touched;
}
/** The absolute URL for the current view, for「复制链接」. */
function shareUrl () {
  return location.origin === 'null' || !location.origin
    ? location.href.replace(/#.*$/, '') + hashString()
    : location.origin + location.pathname + location.search + hashString();
}
function copyLink () {
  const url = shareUrl();
  const done = () => toast('已复制链接：' + url.replace(/^https?:\\/\\/[^/]+/, ''));
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('复制这个链接：', url));
  else prompt('复制这个链接：', url);
}

/* ------------------------------------------------------------------ i18n */`,
  'deep link helpers')

/* --- restore before the first paint, and keep the hash in sync --- */
rep(`function init () {
  buildTopbar();
  buildStatus();
  render();`,
  `function init () {
  applyHash();
  buildTopbar();
  buildStatus();
  render();
  window.addEventListener('hashchange', () => { if (applyHash()) render() });`,
  'init applyHash')

rep(`  renderDetail();
  document.getElementById('statItems').textContent = ITEMS.length;`,
  `  renderDetail();
  syncHash();
  document.getElementById('statItems').textContent = ITEMS.length;`,
  'syncHash in render')

/* --- a copy-link button in the detail panel --- */
rep(`    const b1 = document.createElement('button'); b1.className = 'btn';
    const filtered = S.source === it.source;`,
  `    const bl = document.createElement('button'); bl.className = 'btn';
    bl.textContent = '⧉ 复制链接';
    bl.title = '这个条目的直达链接（可分享，打开就定位到这里）';
    bl.onclick = copyLink;
    const b1 = document.createElement('button'); b1.className = 'btn';
    const filtered = S.source === it.source;`,
  'detail copy link')

rep(`    btns.appendChild(b1);
    s0.appendChild(btns);`,
  `    btns.appendChild(b1);
    btns.appendChild(bl);
    s0.appendChild(btns);`,
  'append copy link')

/* --- the topbar gets one too, plus the console API --- */
rep(`    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts, refreshForgeLists, forgeSpec,`,
  `    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts, refreshForgeLists, forgeSpec,
    hashString, applyHash, syncHash, shareUrl, copyLink,`,
  'console API')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES ' + fails : 'done, syntax OK')
