const fs = require('fs')
const path = require('path')
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp-report.json'), 'utf8'))
const rep = (R.cryptidEditions || {}).rep || {}
const OUT = path.join(__dirname, 'shots', 'cryptid')
fs.mkdirSync(OUT, { recursive: true })
for (const [k, v] of Object.entries(rep)) {
  if (typeof v !== 'string' || !v.startsWith('data:image/png;base64,')) continue
  fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(v.split(',')[1], 'base64'))
  console.log('wrote', k + '.png')
}
console.log('sample:', rep.sampleId || '-')
