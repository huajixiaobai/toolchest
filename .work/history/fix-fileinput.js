/* The real bug behind "导入说找不到": input.files is a live FileList, and the handler cleared
   input.value (to allow re-picking the same file) before importBatch read it — so the import
   got an empty list. Snapshot the files first. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
const from = `  dirIn.onchange = () => { const f = dirIn.files; dirIn.value = ''; importBatch(f) };
  zipIn.onchange = () => { const f = zipIn.files; zipIn.value = ''; importBatch(f) };`.split('\n').join(NL)
const to = `  // NOTE: input.files is a live FileList — clearing the input first would empty it, which is
  // why the picker used to report "没有读到文件". Snapshot before resetting.
  dirIn.onchange = () => { const f = Array.from(dirIn.files); dirIn.value = ''; importBatch(f) };
  zipIn.onchange = () => { const f = Array.from(zipIn.files); zipIn.value = ''; importBatch(f) };`.split('\n').join(NL)
const n = s.split(from).length - 1
if (n !== 1) { console.log('FAIL ' + n); process.exit(1) }
s = s.replace(from, to)
fs.writeFileSync(F, s)
new Function(s)
console.log('fixed, syntax OK')
