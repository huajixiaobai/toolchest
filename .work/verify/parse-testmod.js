'use strict'
const fs = require('fs')
const path = require('path')
const W = path.join(__dirname, '..')
global.window = { __BALATRO_DATA__: JSON.parse(fs.readFileSync(path.join(W, 'out', 'data.json'), 'utf8')) }
new Function(fs.readFileSync(path.join(W, 'lua.js'), 'utf8'))()
new Function(fs.readFileSync(path.join(W, 'modimport.js'), 'utf8'))()
const ROOT = path.join(__dirname, 'testmod')
const files = new Map()
;(function walk (dir, prefix) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, prefix + e.name + '/')
    else files.set(prefix + e.name, new Uint8Array(fs.readFileSync(p)))
  }
})(ROOT, '')
try {
  const P = window.__MODIMPORT__.parseMod(files, 'TestMod')
  console.log('id', P.id, '| items', P.items.length, '| atlases', P.atlases.length)
  console.log('shaders:', JSON.stringify(P.shaders.map((s) => ({ key: s.key, path: s.path, bytes: s.source.length }))))
  console.log('stats:', JSON.stringify(P.stats))
  const ed = P.items.filter((i) => i.cat === 'Edition')
  console.log('editions:', JSON.stringify(ed.map((i) => ({ id: i.id, shader: i.shader, note: i.note }))))
  console.log('warnings:', JSON.stringify(P.warnings))
} catch (e) {
  console.log('THREW:', e.message)
  console.log(e.stack.split('\n').slice(0, 6).join('\n'))
}
