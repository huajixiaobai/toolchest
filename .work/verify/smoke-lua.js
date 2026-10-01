const L = require(require('path').join(__dirname, '..', 'lua.js'))
const s = [
  'local x = { object_type = "Joker", key = "a", atlas = "z", pos = { x = 1, y = 2 } }',
  'SMODS.Atlas({ key = "k", path = "p.png", px = 71, py = 95 })',
  'SMODS.Joker{ key = "j", pos = {x=0,y=0} }',
  'local y = { object_type = "Tag", key = "t", --[[ object_type = "Nope" ]] pos = {x=3,y=2} }',
  'CardSleeves.Sleeve({ key = "s", name = "S", atlas = "sa", pos = {x=0,y=0} })',
  'local z = { not_an_item = true, nested = { object_type = "Blind" } }',
].join('\n')
console.log('decls:', JSON.stringify(L.extractDecls(s).map((d) => d.ns + '.' + d.type + ':' + String((d.table || {}).key))))
console.log('items:', JSON.stringify(L.extractItemTables(s).map((d) => d.ns + '.' + d.type + ':' + JSON.stringify(d.table))))
