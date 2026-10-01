const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `    if (typeof window.__BALATRO__ === 'undefined') {
      r.fatal = 'viewer did not boot from the local site';
      r.bootStatus = (document.querySelector('#boot .bootstatus') || {}).textContent || '';
      return r;
    }`
const to = `    if (typeof window.__BALATRO__ === 'undefined') {
      r.fatal = 'viewer did not boot from the local site';
      r.bootStatus = (document.querySelector('#boot .bootstatus') || {}).textContent || '';
      r.scripts = [].slice.call(document.scripts).map((x) => x.src || '(inline)');
      r.appScriptPresent = !!document.querySelector('script[src*="app.js"]');
      r.globals = {
        data: !!window.__BALATRO_DATA__,
        atlas: window.__BALATRO_ATLAS__ ? Object.keys(window.__BALATRO_ATLAS__).length : 0,
        lua: !!window.__LUA__,
        glshaders: !!window.__GLSHADERS__,
        modimport: !!window.__MODIMPORT__,
        databuild: !!window.__DATABUILD__,
        gameparse: !!window.__GAMEPARSE__,
      };
      r.pageErrors = window.__V.errors.slice();
      return r;
    }`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
