/* The atlas loop runs before the entry loop, so its bookkeeping arrays must be declared first. */
'use strict'
const fs = require('fs')
let s = fs.readFileSync('modimport.js', 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

const DECL = `  // bookkeeping for the report: things this parser had to guess or could not place
  const implicitPos = [];   // objects that fall back to SMODS' pos = {x=0,y=0}
  const implicitAtlas = []; // objects with no atlas at all
  const missingAtlas = [];  // objects naming an atlas that is not in the mod nor in the base game
  const inferredAtlas = []; // atlases found by file name instead of at the declared path
`

rep(`  const root = findRoot(files);
  const rel = reRoot(files, root);`,
  `  const root = findRoot(files);
  const rel = reRoot(files, root);

` + DECL,
  'hoist bookkeeping arrays')

rep(`  const items = [];
  const implicitPos = [];   // objects that fall back to SMODS' pos = {x=0,y=0}
  const implicitAtlas = []; // objects with no atlas at all
  const missingAtlas = [];  // objects naming an atlas that is not in the mod nor in the base game
  const inferredAtlas = []; // atlases found by file name instead of at the declared path`,
  `  const items = [];`,
  'drop the late declarations')

fs.writeFileSync('modimport.js', s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
