const L = require(require('path').join(__dirname, '..', 'lua.js'))
const lines = [
  'local x = { object_type = "Joker", key = "a" }',
  'SMODS.Atlas({ key = "k", path = "p.png", px = 71, py = 95 })',
  'SMODS.Joker{ key = "j", pos = {x=0,y=0} }',
  'SMODS.Joker { key = "k2" }',
  'SMODS.Voucher({ key = "v" })',
]
for (const l of lines) {
  console.log(JSON.stringify(l))
  console.log('   →', JSON.stringify(L.extractDecls(l).map((d) => d.ns + '.' + d.type + ':' + String((d.table || {}).key))))
}
const all = lines.join('\n')
console.log('\nall together →', JSON.stringify(L.extractDecls(all).map((d) => d.ns + '.' + d.type + ':' + String((d.table || {}).key))))
const re = /(?:^|[^\w.])([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\{|\()\s*\{/g
let m
while ((m = re.exec(all))) console.log('raw match @' + m.index + ':', JSON.stringify(m[0]))
