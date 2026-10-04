/* 第六十六轮：修「其他类型的素材都不对」+ 新条目的默认图集不合逻辑
   两个原因（都指向同一处设计缺陷）：
   ① 图鉴里条目的贴图信息有的在 it.atlas/it.pos，有的在 it.sprite{kind,atlas,atlas2,pos} —— 克隆时我只读了前者，
      取不到就沿用 MK.art.atlas（上一条的图集）→ 照一张塔罗/补充包/盲注做出来，素材是错的。
   ② 新建条目时默认图集直接沿用当前条目的图集 → 新建一个盲注却拿到小丑的图集，同样没道理。
   改法：统一用 mkItemArt(it) 解析贴图；新条目按类型找一张原版同类条目，用它的图集。 */
const fs = require('fs')
const path = require('path')
let n = 0
const L = (...a) => a.join('\n')
const F = path.join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++
}

/* ① 统一的贴图解析 + 按类型的默认图集 */
rep(
  'function mkSlug (it) {',
  L('/** 图鉴条目的贴图信息：有的在 it.atlas/it.pos，有的在 it.sprite 里 —— 统一从这里取 */',
    'function mkItemArt (it) {',
    '  if (!it) return null;',
    '  const sp = it.sprite || {};',
    '  const atlas = sp.atlas || it.atlas || \'\';',
    '  if (!atlas) return null;',
    '  const p = sp.pos || it.pos || {};',
    '  return { atlas: atlas, pos: { x: Number(p.x) || 0, y: Number(p.y) || 0 } };',
    '}',
    '/** 新条目的默认图集：按类型找一张原版同类条目用它 —— 不能沿用上一条的（新建盲注却拿到小丑图集就没道理） */',
    'function mkDefaultArtForType (type) {',
    "  const want = (type === 'Consumable') ? ['Tarot', 'Planet', 'Spectral'] : (type === 'Back' ? ['Deck', 'Back'] : [type]);",
    '  for (const it of ITEMS) {',
    '    if (want.indexOf(it.cat) < 0) continue;',
    '    const a = mkItemArt(it);',
    '    if (a) return a;',
    '  }',
    '  return null;',
    '}',
    'function mkSlug (it) {'),
  '贴图解析与默认图集'
)

/* ② 新条目按类型给默认图集 */
rep(
  "  const d = MK_DEFAULT_NAME[ty] || ['新条目', 'newitem'];",
  "  const d = MK_DEFAULT_NAME[ty] || ['新条目', 'newitem'];\n  const defArt = mkDefaultArtForType(ty) || { atlas: MK.art.atlas, pos: { x: 0, y: 0 } };",
  '新条目取默认图集'
)
rep(
  "    art: { atlas: MK.art.atlas, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },",
  "    art: { atlas: defArt.atlas, pos: { x: defArt.pos.x, y: defArt.pos.y }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },",
  '新条目 art 用默认图集'
)

/* ③ 克隆时用统一解析（关键修复） */
rep(
  "    art: { atlas: it.atlas || MK.art.atlas, pos: it.pos || { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },",
  "    art: { atlas: (mkItemArt(it) || { atlas: MK.art.atlas, pos: { x: 0, y: 0 } }).atlas, pos: Object.assign({ x: 0, y: 0 }, (mkItemArt(it) || {}).pos || {}), upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },",
  '克隆用统一解析贴图'
)

/* ④ 暴露里带上解析后的贴图，方便测试对照 */
rep(
  'itemData: (id) => { const it = BY_ID[id]; if (!it) return null; return {',
  'itemData: (id) => { const it = BY_ID[id]; if (!it) return null; return { art: mkItemArt(it),',
  'itemData 带上 art'
)
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const must = ['function mkItemArt (it)', 'function mkDefaultArtForType (type)', 'const defArt = mkDefaultArtForType(ty)', '(mkItemArt(it) || { atlas: MK.art.atlas', 'art: mkItemArt(it),']
const miss = must.filter((m) => b.indexOf(m) < 0)
console.log(miss.length ? '  ❌ 写回后找不到：' + miss.join(' | ') : '  ✓ 写回校验：' + must.length + ' 个标识都在')

/* ⑤ 场景：断言克隆后的图集就是这个条目的图集（别再沿用上一条） */
const G = path.join(__dirname, 'verify', 'cdp.js')
let t = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n')
const a = '        data: B.maker.itemData(ids[0]),'
if (t.split(a).length - 1 !== 1) { console.error('❌ 场景锚点'); process.exit(1) }
t = t.replace(a, () => [
  a,
  '        artOk: (function(){ const d2=B.maker.itemData(ids[0]); if(!d2||!d2.art) return "条目本身没有图集信息";',
  '          const a2=B.maker.state.art; return (a2.atlas===d2.art.atlas && a2.pos.x===d2.art.pos.x && a2.pos.y===d2.art.pos.y) ? "一致" : ("不一致 用了 "+a2.atlas+" "+a2.pos.x+","+a2.pos.y+" 应为 "+d2.art.atlas+" "+d2.art.pos.x+","+d2.art.pos.y) })(),',
].join('\n'))
fs.writeFileSync(G, t)
console.log('  ✓ 场景加了 artOk 断言')
