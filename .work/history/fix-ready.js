/* Expose a readiness flag: __BALATRO__ is created before the first paint (which waits for the
   atlas images), so tests that keyed off it could run against an empty grid. */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

rep('app.js',
  `  ALL_READY.then(() => {
    if (S.tab === 'codex' || S.tab === 'hands' || S.tab === 'atlas') render();`,
  `  ALL_READY.then(() => {
    // the handle exists before the first paint (which waits for every sheet to decode)
    window.__BALATRO_READY__ = false;
    if (S.tab === 'codex' || S.tab === 'hands' || S.tab === 'atlas') render();
    window.__BALATRO_READY__ = true;`,
  'ready flag')

rep(path.join('verify', 'cdp.js'),
  `        try { if (await c.eval("typeof window.__BALATRO__ !== 'undefined'")) break } catch (e) { /* still navigating */ }`,
  `        try { if (await c.eval('window.__BALATRO_READY__ === true')) break } catch (e) { /* still navigating */ }`,
  'driver waits for ready')

console.log(fails ? 'FAILURES' : 'done')
