/* Compile every vanilla shader (and every Cryptid shader) with the new translator. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const SCENARIO = `
  shaderCompile: \`(async()=>{
    const B = window.__BALATRO__;
    const G = window.__GLSHADERS__;
    const r = {};
    const gl2 = document.createElement('canvas').getContext('webgl2');
    const gl1 = gl2 || document.createElement('canvas').getContext('webgl');
    r.webgl2 = !!gl2;
    // the page's own context (what the viewer really uses)
    const pageGl = B.webgl ? (document.querySelector('canvas') && null) : null;
    void pageGl;
    const sources = B.data.shaders.map((s) => ({ name: s.name, source: s.source }));
    r.vanilla = G.selftest(gl1, !!gl2, sources);
    r.vanillaFail = r.vanilla.results.filter((x) => !x.ok).map((x) => x.name + ': ' + x.log.replace(/\\n/g, ' | ').slice(0, 160));

    // shaders that came with an imported mod, if any
    const mod = B.mods && B.mods[0];
    r.modName = mod ? mod.id : null;
    const modSources = window.__MODSHADERS__ || null;
    r.mod = modSources ? G.selftest(gl1, !!gl2, modSources) : null;
    if (r.mod) r.modFail = r.mod.results.filter((x) => !x.ok).map((x) => x.name + ': ' + x.log.replace(/\\n/g, ' | ').slice(0, 200));
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
/* inject the mod's shader sources before the scenario runs */
s = s.replace(`      const local = path.join(__dirname, 'cryptid-test.zip')`,
  `      try { await c.eval('window.__MODSHADERS__ = ' + JSON.stringify(collectModShaders())) } catch (e) { /* ignore */ }
      const local = path.join(__dirname, 'cryptid-test.zip')`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
