/* Let the driver run Chrome without --allow-file-access-from-files, which is how a real user's
   browser behaves when they double-click the HTML. Blob-URL mod art must still be readable. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}
rep(`  const chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-crash-reporter', '--allow-file-access-from-files', '--hide-scrollbars',`,
  `  const chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-crash-reporter', '--hide-scrollbars',`,
  'drop the flag from the base args')
rep(`    '--window-size=1720,1150', 'about:blank',
  ], { stdio: 'ignore' })`,
  `    '--window-size=1720,1150', 'about:blank',
  ], { stdio: 'ignore' })`,
  'noop')
rep(`  const chrome = spawn(CHROME, [`, `  // BALATRO_STRICT_FILE=1 emulates a plain double-click: no file:// cross-access help.
  // The viewer must not depend on it — every texture is inlined, and mod art uses blob: URLs.
  if (process.env.BALATRO_STRICT_FILE !== '1') ARGS.push('--allow-file-access-from-files')
  const chrome = spawn(CHROME, [`, 'env gate')
fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done')
