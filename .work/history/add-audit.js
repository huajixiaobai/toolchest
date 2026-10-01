/* Automated audit pass: every view, every vanilla item, the mod import path, and the console
   for errors. Complements the scenario suite by walking things the scenarios do not. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
if (s.includes('audit: `')) { console.log('already present'); process.exit(0) }
const SCENARIO = `
  audit: \`(async()=>{
    const B = window.__BALATRO__;
    const r = { errors: [] };
    const fail = (m) => r.errors.push(m);
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    // 1) every view renders without throwing and without blank canvases
    const views = ['codex', 'forge', 'atlas', 'hands', 'shaders', 'data', 'mods'];
    r.views = {};
    for (const v of views) {
      try {
        B.state.tab = v; B.render();
        await sleep(v === 'forge' ? 2600 : 1200);
        const b = __V.blank();
        r.views[v] = { canvases: b.total, blank: b.blank, forced: document.body.getAttribute('data-forced') || null };
        if (b.blank) fail('view ' + v + ' has ' + b.blank + ' blank canvases: ' + b.sample.join(', '));
      } catch (e) { fail('view ' + v + ' threw: ' + e.message) }
    }

    // 2) every vanilla item composes to something non-empty and every atlas resolves
    let noSpec = 0; let blank = 0;
    const blankSample = [];
    for (const it of B.items) {
      const sp = B.specForItem(it);
      if (!sp) { noSpec++; continue }
      const cv = B.compose(sp, 1, 0);
      const box = __V.bbox(cv);
      if (!box) { blank++; if (blankSample.length < 8) blankSample.push(it.id) }
    }
    r.items = { total: B.items.length, noSpec, blank, blankSample };
    if (blank) fail(blank + ' items compose to a blank canvas: ' + blankSample.join(', '));

    // 3) referenced atlases must exist
    const missingAtlas = [];
    for (const it of B.items) {
      if (it.atlas && !B.atlases[it.atlas]) missingAtlas.push(it.id + '→' + it.atlas);
      if (it.soul && it.soul.atlas && !B.atlases[it.soul.atlas]) missingAtlas.push(it.id + ' soul→' + it.soul.atlas);
    }
    r.missingAtlas = missingAtlas.slice(0, 10);
    if (missingAtlas.length) fail(missingAtlas.length + ' items point at a missing atlas');

    // 4) export helpers round-trip
    try {
      const cv = B.compose(B.specForItem(B.byId['j_joker']), 2, 0);
      const png = await B.canvasBytes(cv);
      r.png = { bytes: png.length, sig: [].slice.call(png.slice(1, 4)).map((x) => String.fromCharCode(x)).join('') };
      if (r.png.sig !== 'PNG') fail('canvasBytes did not produce a PNG');
      const z = B.zipStore([{ name: 'a.png', data: png }]);
      r.zip = { bytes: z.length, magic: [].slice.call(z.slice(0, 2)).map((x) => String.fromCharCode(x)).join('') };
      if (r.zip.magic !== 'PK') fail('zipStore did not produce a zip');
      const csv = B.toCSV([B.byId['j_joker']]);
      r.csv = csv.split('\\n').length;
      const js = JSON.stringify(B.itemJSON(B.byId['j_joker']));
      r.json = js.length;
    } catch (e) { fail('export helpers threw: ' + e.message) }

    // 5) the shader programs must all be usable (no missing uniform crashes)
    r.shaders = B.shaderPrograms.length;
    for (const name of B.shaderPrograms) {
      try { const o = B.shadeTile({ atlas: 'Joker', pos: { x: 0, y: 0 } }, 71, 95, name, 1.7); if (!o) fail('shadeTile returned nothing for ' + name) } catch (e) { fail('shader ' + name + ' threw: ' + e.message) }
    }

    // 6) the loop detector must be deterministic and cached
    const sp = B.specForItem(B.byId['j_caino']);
    const t0 = performance.now(); const p1 = B.detectPeriod(sp); const t1 = performance.now();
    const p2 = B.detectPeriod(sp); const t2 = performance.now();
    r.loop = { period: p1, firstMs: Math.round(t1 - t0), cachedMs: Math.round(t2 - t1) };
    if (p1 !== p2) fail('detectPeriod is not deterministic');
    if (t2 - t1 > 5) fail('detectPeriod is not cached (second call took ' + Math.round(t2 - t1) + 'ms)');

    // 7) page-level errors
    r.pageErrors = window.__V.errors.slice();
    if (r.pageErrors.length) fail('page errors: ' + r.pageErrors.join(' | '));
    r.ok = r.errors.length === 0;
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
