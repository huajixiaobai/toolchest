/* The "else palette = medianCutPalette(...)" line sits at a different indent than assumed.
   Replace it by line number, and drop the other two unused declarations. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'app.js')
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n'
let lines = fs.readFileSync(F, 'utf8').split(/\r?\n/)

/* 1) refinePalette wiring */
const i = lines.findIndex((l) => /^\s*else palette = medianCutPalette\(list, maxColors\);$/.test(l))
if (i < 0) { console.log('FAIL: medianCut line'); process.exit(1) }
const indent = lines[i].match(/^\s*/)[0]
lines.splice(i, 1,
  `${indent}else {`,
  `${indent}  palette = medianCutPalette(list, maxColors);`,
  `${indent}  // k-means polish: median-cut boxes are axis-aligned, this pulls the entries onto the`,
  `${indent}  // real colour clusters`,
  `${indent}  if (refine !== false && palette.length > 2) palette = refinePalette(list, palette, 4);`,
  `${indent}}`)
console.log('ok   refinePalette wired')

/* 2) unused functions/consts, located by name and removed with their body */
function dropBlock (name) {
  const start = lines.findIndex((l) => new RegExp('^(?:async )?function ' + name + '\\b').test(l) || new RegExp('^const ' + name + '\\s*=').test(l))
  if (start < 0) { console.log('FAIL: ' + name + ' not found'); return }
  // walk to the end of the declaration (brace balance, or the closing "];" for an array const)
  let depth = 0
  let end = start
  for (; end < lines.length; end++) {
    for (const ch of lines[end]) {
      if (ch === '{' || ch === '[' || ch === '(') depth++
      else if (ch === '}' || ch === ']' || ch === ')') depth--
    }
    if (end > start && depth <= 0) break
    if (/;\s*$/.test(lines[end]) && depth <= 0) break
  }
  lines.splice(start, end - start + 1)
  console.log('ok   dropped ' + name + ' (' + (end - start + 1) + ' lines)')
}
dropBlock('lazyCanvas')
dropBlock('FORGE_FRONTS')

fs.writeFileSync(F, lines.join(NL))
const out = fs.readFileSync(F, 'utf8')
new Function(out)
console.log('done, syntax OK; app.js now', (out.length / 1024).toFixed(1), 'KB /', out.split(/\r?\n/).length, 'lines')
