'use strict'
const fs = require('fs')
const path = require('path')
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'out', 'data.json'), 'utf8'))
for (const s of D.shaders) {
  const body = s.source.replace(/vec4 effect\([^)]*\)\s*\{/, '')
  const usesScreen = /[^_a-zA-Z]screen_coords[^_a-zA-Z]/.test(body)
  const consts = [...s.source.matchAll(/const\s+int\s+(\w+)\s*=\s*([^;]+);/g)].map((m) => m[1] + '=' + m[2].trim())
  const ints = [...s.source.matchAll(/^\s*int\s+(\w+)\s*=\s*([^;]+);/gm)].map((m) => m[1] + '=' + m[2].trim())
  console.log(s.name.padEnd(16), 'screen_coords-used=' + (usesScreen ? 'YES' : 'no'), consts.length ? 'const:' + consts.join(',') : '', ints.length ? 'int:' + ints.join(',') : '')
}
