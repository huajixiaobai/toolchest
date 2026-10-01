const fs = require('fs')
const path = require('path')
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp-report.json'), 'utf8'))
const rep = (R.holoShot || {}).rep || {}
const OUT = path.join(__dirname, 'shots', 'holo')
fs.mkdirSync(OUT, { recursive: true })
let n = 0
for (const [k, v] of Object.entries(rep)) {
  if (typeof v !== 'string' || !v.startsWith('data:image/png;base64,')) continue
  fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(v.split(',')[1], 'base64'))
  console.log('wrote', k + '.png')
  n++
}
console.log(n, 'files ->', OUT)
