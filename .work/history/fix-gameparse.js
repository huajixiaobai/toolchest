/* Two fixes: inflate the needed entries up front (databuild is synchronous), and accept both
   File objects and {path, bytes} in parseGameFiles. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'gameparse.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`    const byPath = new Map()
    for (const n of wanted) byPath.set(root ? n.slice(root.length + 1) : n, entries.get(n))
    const cache = new Map()
    const env = makeEnv(null, {
      getBytes: (p) => {
        const ent = byPath.get(p)
        if (!ent) return null
        return ent._data || null
      },
      names: () => [...byPath.keys()],
      sourceLabel: label || 'Balatro.exe',
      now: new Date().toISOString(),
    })
    // read everything the builder will ask for, in parallel
    await Promise.all([...byPath.values()].map(entryBytes))
    for (const [p, ent] of byPath) cache.set(p, ent._data)
    const res = BUILDER.buildData(env)
    return { ...res, root, entries: byPath.size, textures: res.textures }`,
  `    const byPath = new Map()
    for (const n of wanted) byPath.set(root ? n.slice(root.length + 1) : n, entries.get(n))
    // Inflate the needed entries up front (about 160 files / a few MB, even out of a 60 MB exe);
    // buildData itself is synchronous.
    const map = new Map()
    await Promise.all([...byPath.entries()].map(async ([p, ent]) => { map.set(p, await entryBytes(ent)) }))
    const env = makeEnv(null, {
      getBytes: (p) => map.get(p) || null,
      names: () => [...map.keys()],
      sourceLabel: label || 'Balatro.exe',
      now: new Date().toISOString(),
    })
    const res = BUILDER.buildData(env)
    return { ...res, root, entries: map.size }`,
  'inflate up front')

rep(`    const list = []
    for (const f of files) {
      const p = (f.__rel || f.webkitRelativePath || f.name || '').replace(/\\\\/g, '/')
      if (p) list.push({ path: p, file: f })
    }`,
  `    const list = []
    for (const f of files) {
      const p = (f.__rel || f.webkitRelativePath || f.name || f.path || '').replace(/\\\\/g, '/')
      if (!p) continue
      list.push({
        path: p,
        get: () => (f.bytes
          ? Promise.resolve(f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes))
          : f.arrayBuffer().then((b) => new Uint8Array(b))),
      })
    }`,
  'file normalising')

rep(`      jobs.push((async () => {
        const buf = x.file.bytes ? x.file.bytes : new Uint8Array(await x.file.arrayBuffer())
        map.set(rel, buf)
      })())`,
  `      jobs.push((async () => { map.set(rel, await x.get()) })())`,
  'folder read')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
