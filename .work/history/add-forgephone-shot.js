/* Screenshot the phone forge (the driver only screenshots scenarios on its list). */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const from = `'soulCompare', 'boxCompare', 'modImport', 'modView', 'modCryptid', 'forgeUx', 'modForge', 'srcBack']`
const to = `'soulCompare', 'boxCompare', 'modImport', 'modView', 'modCryptid', 'forgeUx', 'modForge', 'srcBack', 'forgePhone']`
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to))
new Function(fs.readFileSync(F, 'utf8'))
console.log('ok, syntax OK')
