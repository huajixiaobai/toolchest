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
rep(`    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts, refreshForgeLists,`,
  `    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts, refreshForgeLists, forgeSpec,`,
  'expose forgeSpec')
rep(`    // repeat renders must be cheap: the period is cached, and the forge re-render should not
    // re-run the whole search`,
  `    r.specs = {
      item: JSON.stringify(B.specForItem(B.byId['j_caino'])),
      forge: JSON.stringify(B.forgeSpec()),
    };
    r.itemPeriod = B.detectPeriod(B.specForItem(B.byId['j_caino']));
    r.forgePeriod = B.detectPeriod(B.forgeSpec());
    r.forgeOpts = JSON.stringify(B.animOpts(B.forgeSpec()));
    // repeat renders must be cheap: the period is cached, and the forge re-render should not
    // re-run the whole search`,
  'probe both specs')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
