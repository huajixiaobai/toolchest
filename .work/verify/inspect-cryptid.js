/* What is inside Cryptid.zip, and why did the importer find nothing? */
'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')
const FILE = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const buf = fs.readFileSync(FILE)

global.window = { __BALATRO_DATA__: JSON.parse(fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8')) }
new Function(fs.readFileSync(path.join(W, 'lua.js'), 'utf8'))()
new Function(fs.readFileSync(path.join(W, 'modimport.js'), 'utf8'))()

;(async () => {
  const files = await window.__MODIMPORT__.readZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const dec = (u8) => Buffer.from(u8).toString('utf8')

  console.log('=== Cryptid.json ===')
  const meta = [...files.keys()].find((k) => /\.json$/i.test(k))
  for (const k of [...files.keys()].filter((x) => /\.json$/i.test(x))) {
    console.log('--', k)
    console.log(dec(files.get(k)).slice(0, 900))
  }

  console.log('\n=== every .lua file ===')
  for (const k of [...files.keys()].filter((x) => x.toLowerCase().endsWith('.lua'))) console.log('  ', k, files.get(k).length)

  console.log('\n=== root-level files ===')
  for (const k of [...files.keys()]) if (k.split('/').length === 2) console.log('  ', k, files.get(k).length)

  const main = [...files.keys()].find((k) => /Cryptid\.lua$/i.test(k))
  if (main) {
    const src = dec(files.get(main))
    console.log('\n=== head of', main, '===')
    console.log(src.slice(0, 1200))
    console.log('\n... total', src.length, 'chars,', src.split('\n').length, 'lines')
    const hits = src.match(/SMODS\s*\.\s*[A-Za-z_][A-Za-z0-9_]*\s*\{/g) || []
    console.log('raw SMODS.{ hits:', hits.length, JSON.stringify([...new Set(hits)].slice(0, 12)))
    const decls = window.__LUA__.extractDecls(src)
    console.log('extractDecls:', decls.length, decls.slice(0, 6).map((d) => d.type + ':' + (d.table && d.table.key)).join(', '))
  }

  console.log('\n=== decl scan over every lua file ===')
  let total = 0
  for (const k of [...files.keys()].filter((x) => x.toLowerCase().endsWith('.lua'))) {
    const src = dec(files.get(k))
    const raw = (src.match(/SMODS\s*\.\s*[A-Za-z_][A-Za-z0-9_]*\s*\{/g) || []).length
    let d = []
    try { d = window.__LUA__.extractDecls(src) } catch (e) { d = ['THREW: ' + e.message] }
    total += Array.isArray(d) ? d.length : 0
    if (raw || (Array.isArray(d) && d.length)) console.log('  ', String(raw).padStart(3), String(Array.isArray(d) ? d.length : d).padStart(3), k)
  }
  console.log('total declarations:', total)
})()
