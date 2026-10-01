/* The forge scenarios selected elements positionally (`.opt select`, `.opt`[1]); now that the
   left column also uses .opt, select by the stable data-gkey instead. Also assert the new
   conveniences: collapse, jump bar, quick actions, sticky one-line summary, and the source
   chip that goes back to "all". */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`     const sel=document.querySelector('.opt select');`,
  `     const sel=document.querySelector('#content .opt[data-gkey="basetype"] select');`,
  'forgeTypes: stable select')

rep(`       const g=grp(/蜡封|贴纸/);
       const sealBox=grp(/蜡封/), stickBox=grp(/贴纸/);
       const disabled=(box)=>box?[].slice.call(box.querySelectorAll('.pick')).every(b=>b.disabled):null;
       walks.push({ type:t, hash:paint(), baseChips:document.querySelectorAll('.opt')[1].querySelectorAll('.pick').length,`,
  `       const sealBox=document.querySelector('#content .opt[data-gkey="seal"]'), stickBox=document.querySelector('#content .opt[data-gkey="stick"]');
       const disabled=(box)=>box?[].slice.call(box.querySelectorAll('.pick')).every(b=>b.disabled):null;
       walks.push({ type:t, hash:paint(), baseChips:document.querySelectorAll('#content .opt[data-gkey="base"] .pick').length,`,
  'forgeTypes: gkey lookups')

/* add a scenario for the new forge UX */
const SCENARIO = `
  forgeUx: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.click('.cat', '卡牌合成台', 2600);
    const q = (sel) => document.querySelector(sel);
    const groups = () => [].slice.call(document.querySelectorAll('#content .opt[data-gkey]'));
    r.groupKeys = groups().map((e) => e.dataset.gkey);
    r.collapsedAtStart = groups().filter((e) => e.classList.contains('collapsed')).map((e) => e.dataset.gkey);
    r.navChips = [].slice.call(document.querySelectorAll('.forgenav .nv')).map((e) => e.textContent);
    r.previewSticky = getComputedStyle(q('.forge .preview')).position;
    r.navSticky = getComputedStyle(q('.forgenav')).position;

    // headers carry the current pick
    r.headers = [].slice.call(document.querySelectorAll('#content .opt[data-gkey] h4')).map((h) => h.textContent.replace(/\\s+/g, ' ').trim());
    r.nowLine = (q('.pvnow') || {}).textContent;

    // collapsing really hides the body and survives a repaint
    const enh = q('#content .opt[data-gkey="enh"]');
    enh.querySelector('h4').click();
    await __V.wait(250);
    r.enhCollapsed = enh.classList.contains('collapsed');
    r.enhBodyHidden = getComputedStyle(enh.querySelector('.obody')).display === 'none';
    const navEnh = __V.byText('.forgenav .nv', '强化');
    navEnh.click(); await __V.wait(300);
    r.enhReopened = !q('#content .opt[data-gkey="enh"]').classList.contains('collapsed');

    // quick actions
    const rand = __V.byText('.forgenav .nv', '随机搭配');
    const before = __V.hash(q('.preview canvas'));
    rand.click(); await __V.wait(900);
    r.randomChanged = __V.hash(q('.preview canvas')) !== before;
    const reset = __V.byText('.forgenav .nv', '重置');
    reset.click(); await __V.wait(900);
    r.resetNow = (q('.pvnow') || {}).textContent;

    // collapse everything, then check the page is short
    __V.byText('.forgenav .nv', '收起').click();
    await __V.wait(400);
    r.allCollapsed = groups().every((e) => e.classList.contains('collapsed'));
    r.tallAfterCollapse = q('#content').scrollHeight;
    __V.byText('.forgenav .nv', '全部展开').click();
    await __V.wait(500);
    r.tallAfterExpand = q('#content').scrollHeight;
    r.optCount = document.querySelectorAll('#content .opt[data-gkey]').length;
    r.canvas = __V.blank();
    return r })()\`,

  modForge: \`(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    const r = {};
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(800);
    await __V.click('.cat', '卡牌合成台', 2600);

    // the mod's new category must be offered as a forge subject
    const types = [].slice.call(document.querySelectorAll('#content .opt[data-gkey="basetype"] option')).map((o) => o.value);
    r.types = types;
    r.hasModType = types.includes('Musical');
    r.jokerCount = (document.querySelector('#content .opt[data-gkey="basetype"] option[value="Joker"]') || {}).textContent;

    // pick the mod category, then a mod card
    const sel = document.querySelector('#content .opt[data-gkey="basetype"] select');
    sel.value = 'Musical'; sel.dispatchEvent(new Event('change'));
    await __V.wait(1200);
    const picks = document.querySelectorAll('#content .opt[data-gkey="base"] .pick');
    r.musicalPicks = picks.length;
    r.picksHaveModBadge = document.querySelectorAll('#content .opt[data-gkey="base"] .pick .pickmod').length;
    if (picks.length) { picks[0].click(); await __V.wait(900) }
    r.nowLine = (document.querySelector('.pvnow') || {}).textContent;
    const cv = document.querySelector('.preview canvas');
    r.previewBox = cv ? __V.bbox(cv) : null;
    r.baseHeader = (document.querySelector('#content .opt[data-gkey="base"] h4') || {}).textContent.replace(/\\s+/g, ' ').trim();
    r.summary = [].slice.call(document.querySelectorAll('.pvsummary tr')).map((tr) => tr.textContent.replace(/\\s+/g, ' ').trim()).slice(0, 6);
    r.canvas = __V.blank();
    return r })()\`,

  srcBack: \`(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    const r = {};
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(700);
    B.state.tab = 'codex'; B.state.source = 'testmod'; B.state.cat = 'all'; B.render();
    await __V.wait(1200);
    const chip = document.querySelector('.listhead .srcchip');
    r.chip = chip ? chip.textContent.replace(/\\s+/g, ' ').trim() : null;
    r.filtered = { source: B.state.source, cells: document.querySelectorAll('#content .cell').length };
    if (chip) { chip.click(); await __V.wait(1000) }
    r.afterChip = { source: B.state.source, cells: document.querySelectorAll('#content .cell').length, chipGone: !document.querySelector('.listhead .srcchip') };

    // the detail-panel button is a two-way toggle
    B.state.source = 'testmod'; B.state.cat = 'Joker'; B.render();
    await __V.wait(900);
    const cell = document.querySelector('#content .cell[data-id="j_tm_alpha"]');
    if (cell) { cell.click(); await __V.wait(800) }
    const btn = [].slice.call(document.querySelectorAll('#detail .btn')).filter((b) => /只看这个 Mod|显示全部来源/.test(b.textContent))[0];
    r.detailBtn = btn ? btn.textContent : null;
    if (btn) { btn.click(); await __V.wait(1000) }
    r.afterDetailBtn = { source: B.state.source, btn: ([].slice.call(document.querySelectorAll('#detail .btn')).filter((b) => /只看这个 Mod|显示全部来源/.test(b.textContent))[0] || {}).textContent };
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); fails++ } else {
  s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {'); console.log('ok   new scenarios')
}
s = s.replace(`    if (name.indexOf('mod') === 0 || name === 'modImport') {`,
  `    if (name === 'modForge' || name === 'srcBack') {
      const payload = fs.readFileSync(path.join(__dirname, 'testmod.json'), 'utf8')
      await c.eval('window.__TESTMOD__ = ' + payload + ';')
    }
    if (name.indexOf('mod') === 0 || name === 'modImport') {`)
console.log('ok   payload hook')
s = s.replace(`'soulCompare', 'boxCompare', 'modImport', 'modView', 'modCryptid']`,
  `'soulCompare', 'boxCompare', 'modImport', 'modView', 'modCryptid', 'forgeUx', 'modForge', 'srcBack']`)
console.log('ok   screenshot list')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
