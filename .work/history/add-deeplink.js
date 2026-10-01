/* Deep links: write state to the hash, restore it from a URL, and offer the copy button. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
if (s.includes('deepLink: `')) { console.log('already present'); process.exit(0) }
const SCENARIO = `
  deepLink: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    B.state.tab = 'codex'; B.state.cat = 'Joker'; B.state.sel = 'j_cry_mosaic'; B.state.lang = 'en-us';
    B.render();
    await __V.wait(1200);
    B.state.sel = 'j_joker'; B.render();
    await __V.wait(900);
    r.hash = location.hash;
    r.parsed = B.hashString();
    r.share = B.shareUrl();
    r.cellsStillRight = document.querySelectorAll('#content .cell').length;

    // the copy button lives in the detail panel
    r.copyBtn = ([].slice.call(document.querySelectorAll('#detail .btn')).filter((b) => /复制链接/.test(b.textContent))[0] || {}).textContent || null;

    // now simulate opening that link in a fresh page
    const target = location.href.replace(/#.*$/, '') + B.hashString();
    location.href = target;
    return r })()\`,

  deepLinkOpen: \`(async()=>{
    const B = window.__BALATRO__;
    const r = { url: decodeURIComponent(location.hash) };
    // applyHash ran during init, so the state must already match the URL
    r.state = { tab: B.state.tab, cat: B.state.cat, sel: B.state.sel, lang: B.state.lang };
    await __V.wait(1600);
    r.title = (document.querySelector('#content .listhead h2') || {}).textContent || '';
    r.detail = (document.querySelector('#detail .dhead h3') || {}).textContent || '';
    r.cells = document.querySelectorAll('#content .cell').length;
    r.selected = (document.querySelector('#content .cell.on') || {}).dataset ? document.querySelector('#content .cell.on').dataset.id : null;
    r.blank = __V.blank();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
