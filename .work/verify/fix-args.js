'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `  // BALATRO_STRICT_FILE=1 emulates a plain double-click: no file:// cross-access help.
  // The viewer must not depend on it — every texture is inlined, and mod art uses blob: URLs.
  if (process.env.BALATRO_STRICT_FILE !== '1') ARGS.push('--allow-file-access-from-files')
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-crash-reporter', '--hide-scrollbars',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle',
    '--user-data-dir=' + profile, '--remote-debugging-port=' + PORT,
    '--window-size=1720,1150', 'about:blank',
  ], { stdio: 'ignore' })`
const to = `  const args = [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-crash-reporter', '--hide-scrollbars',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle',
    '--user-data-dir=' + profile, '--remote-debugging-port=' + PORT,
    '--window-size=1720,1150', 'about:blank',
  ]
  // BALATRO_STRICT_FILE=1 emulates a plain double-click: no file:// cross-access help.
  // The viewer must not depend on it — every texture is inlined, and mod art uses blob: URLs.
  if (process.env.BALATRO_STRICT_FILE !== '1') args.push('--allow-file-access-from-files')
  console.log('file access:', process.env.BALATRO_STRICT_FILE === '1' ? 'strict (no --allow-file-access-from-files)' : 'permissive')
  const chrome = spawn(CHROME, args, { stdio: 'ignore' })`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
fs.writeFileSync(F, s)
new Function(s)
console.log('fixed, syntax OK')
