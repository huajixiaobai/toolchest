// List the scenario keys still present in cdp.js.
'use strict'
const fs = require('fs')
const path = require('path')
const s = fs.readFileSync(path.join(__dirname, 'cdp.js'), 'utf8')
const start = s.indexOf('const SCENARIOS')
const end = s.indexOf('async function main')
const body = s.slice(start, end)
const keys = []
for (const line of body.split('\n')) {
  const m = /^ {2}([A-Za-z0-9_]+): `/.exec(line)
  if (m) keys.push(m[1])
}
console.log('scenarios (' + keys.length + '):', keys.join(', '))
