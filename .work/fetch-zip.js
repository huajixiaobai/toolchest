// Download a GitHub source archive into the workspace (binary-safe, no external tools).
'use strict'
const fs = require('fs')
const path = require('path')

const url = process.argv[2]
const out = process.argv[3]
if (!url || !out) { console.log('usage: node fetch-zip.js <url> <outfile>'); process.exit(1) }

async function main () {
  console.log('GET', url)
  const r = await fetch(url, { headers: { 'User-Agent': 'dsh' }, redirect: 'follow', signal: AbortSignal.timeout(120000) })
  if (!r.ok) { console.log('HTTP', r.status, r.statusText); process.exit(1) }
  const buf = Buffer.from(await r.arrayBuffer())
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, buf)
  console.log('saved', out, (buf.length / 1048576).toFixed(2), 'MB')
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
