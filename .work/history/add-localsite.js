/* Verify the local site: open http://127.0.0.1:PORT/ and it must be usable immediately
   (pack mode, no file picking), with the service worker installed for offline use. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
if (s.includes('localSite: `')) { console.log('already present'); process.exit(0) }
const SCENARIO = `
  localSite: \`(async()=>{
    const r = { url: location.href };
    r.beforeReady = true;
    if (typeof window.__BALATRO__ === 'undefined') {
      r.fatal = 'viewer did not boot from the local site';
      r.bootStatus = (document.querySelector('#boot .bootstatus') || {}).textContent || '';
      return r;
    }
    const B = window.__BALATRO__;
    r.items = B.items.length;
    r.atlases = Object.keys(B.atlases).length;
    r.textureUrls = Object.keys(window.__BALATRO_ATLAS__).length;
    r.blobUrls = Object.keys(window.__BALATRO_ATLAS__).filter((k) => String(window.__BALATRO_ATLAS__[k]).startsWith('blob:')).length;
    r.bootHidden = (() => { const b = document.getElementById('boot'); return !b || getComputedStyle(b).display === 'none' })();
    r.pickedNothing = typeof window.__SOURCE_NOTE__ === 'undefined';
    r.version = B.data.meta.version;

    B.state.tab = 'codex'; B.state.cat = 'all'; B.render();
    await __V.wait(2500);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.blank = __V.blank();

    // deep link over http
    const dl = 'c=Tarot&i=c_fool';
    location.hash = '#' + dl;
    await __V.wait(1200);
    r.deepLink = { hash: location.hash, cat: B.state.cat, sel: B.state.sel, detail: (document.querySelector('#detail .dhead h3') || {}).textContent || '' };

    // a shader-heavy render, to be sure WebGL still works
    B.state.cat = 'Joker'; B.state.q = ''; B.state.source = 'all'; B.render();
    await __V.wait(1500);
    const holo = B.compose(B.specForItem(B.byId['j_hologram']), 2, 0);
    r.hologramBox = __V.bbox(holo);
    r.shaders = B.shaderPrograms.length;

    // service worker
    r.sw = { supported: 'serviceWorker' in navigator };
    if (r.sw.supported) {
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      r.sw.registered = !!reg;
      r.sw.scope = reg ? reg.scope : null;
      r.sw.state = reg && reg.active ? reg.active.state : (reg && reg.installing ? 'installing' : null);
      r.sw.controlled = !!navigator.serviceWorker.controller;
      r.sw.caches = await caches.keys().catch(() => []);
    }
    r.pageErrors = window.__V.errors.slice();
    return r })()\`,

  localOffline: \`(async()=>{
    // second visit: the service worker should be serving from its cache, and a hard reload
    // must still produce a working viewer with no network at all
    const r = { url: location.href };
    const B = window.__BALATRO__;
    if (typeof B === 'undefined') { r.fatal = 'no viewer after reload'; return r }
    r.items = B.items.length;
    r.controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    r.caches = await caches.keys().catch(() => []);
    const names = await (async () => {
      const out = [];
      for (const n of await caches.keys()) {
        const c = await caches.open(n);
        for (const req of await c.keys()) out.push(new URL(req.url).pathname);
      }
      return out;
    })().catch(() => []);
    r.cachedPaths = names.sort();
    r.cachedCore = ['/index.html', '/boot.js', '/app.js'].every((p) => names.includes(p));
    r.cachedPack = names.includes('/assets/data.json') && names.includes('/assets/atlas.bin');
    B.state.tab = 'codex'; B.state.cat = 'all'; B.render();
    await __V.wait(2200);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.blank = __V.blank();
    r.pageErrors = window.__V.errors.slice();
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
s = s.replace(`    if (name === 'liteBoot') {`,
  `    if (name === 'localSite' || name === 'localOffline') {
      const port = process.env.SITE_PORT || 8137
      await c.send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' })
      await sleep(1500)
      await c.eval(HELPERS)
    }
    if (name === 'liteBoot') {`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
