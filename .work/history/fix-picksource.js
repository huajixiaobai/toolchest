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
/* a source filter is still a codex filter: clicking it must leave the mod tool panel */
rep('app.js',
  `  const pickSource = (src) => () => { S.source = src; S.cat = 'all'; closeDrawers(); render() };`,
  `  const pickSource = (src) => () => { S.source = src; S.cat = 'all'; S.tab = 'codex'; S.sel = null; closeDrawers(); render() };`,
  'pickSource switches to the codex')
console.log(fails ? 'FAILURES' : 'done')
