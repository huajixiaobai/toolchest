/* 第六十七轮（设计清理 1）：
   ④ 预览卡片：验「换类型/换牌之后预览真的跟着变」（非小丑类型以前只验过导出，没验过预览）
   ③ 蜡封：原来只有一句说明、一个可选项都没有 —— 改成说清「这个类型只能做贴图/名字/描述，效果必须自己写 Lua」，
      并给一个"说明用"的备注字段（用户可写自己要实现的效果，导出时会作为注释带进 Lua，不假装已实现）
   ① 界面上把「通用字段」和「类型专属字段」讲清（价格/稀有度是所有类型通用，专属设置只影响该类型） */
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

/* ③ 蜡封：给一个能写字的备注 + 说清边界 */
rep(
  "  Seal: [['seal_note', '蜡封没有数值字段 —— 它的效果由玩家拿它做什么决定', 'text', '']],",
  L("  Seal: [['seal_note', '你想让它做什么（只会作为注释写进 Lua，不会自动实现）', 'str', '']],"),
  '蜡封备注字段'
)
rep(
  "        } else {\n          rowT.appendChild(field(label, '<span class=\"hint\">' + opt + '</span>', 'mkwide'));",
  L("        } else if (kind === 'str') {",
    "          rowT.appendChild(field(label, '<input class=\"tbtn mkwide\" data-mkt=\"' + key + '\" value=\"' + esc(cur == null ? '' : cur) + '\">'));",
    "        } else {",
    "          rowT.appendChild(field(label, '<span class=\"hint\">' + opt + '</span>', 'mkwide'));"),
  '支持字符串字段'
)
rep(
  "      tf.innerHTML = '<div class=\"mklabel\">这个类型专属的设置</div>';",
  L("      tf.innerHTML = '<div class=\"mklabel\">这个类型专属的设置（上面「名字/价格/稀有度」是所有类型通用的，这里只影响「' + mkType()[1] + '」）</div>';",
    "      if (MK.type === 'Seal') {",
    "        /* 蜡封的诚实说明：原版蜡封的效果是代码，制作器不假装能配置它 */",
    "        tf.insertAdjacentHTML('beforeend', '<div class=\"hint\">蜡封在原版里没有数值参数 —— 它的行为取决于「玩家拿它做什么」（计分时再触发一次、生成一张牌、给钱…），这段逻辑在游戏源码里是代码。' +",
    "          '所以这个类型在这里只能做<b>贴图 / 名字 / 描述</b>；效果请写下面的备注（会作为注释带进 Lua），或直接在「高级」里改生成的 Lua。</div>');",
    "      }"),
  '蜡封说明 + 通用/专属讲清'
)

/* ④ 预览跟着类型走：换类型/换牌后，预览画布内容必须变 */
const G = path.join(__dirname, 'verify', 'cdp.js')
let t = fs.readFileSync(G, 'utf8').replace(/\r\n/g, '\n')
const a = '    r.cloneSummary=(r.cloneByType||[]).map(function(x){'
if (t.split(a).length - 1 !== 1) { console.error('❌ 场景锚点'); process.exit(1) }
t = t.replace(a, () => [
  '    /* ④ 预览是否真的跟着类型/选的牌变：依次克隆不同类型，抓预览画布哈希，必须互不相同 */',
  '    r.previewByType=[];',
  '    for (const cat2 of ["Joker","Tarot","Booster","Blind"]) {',
  '      const ids2=B.maker.itemsByCat(cat2); if(!ids2.length) continue;',
  '      B.maker.select(0); B.maker.applyClone(ids2[0]); B.render(); await __V.wait(500);',
  '      const cv2=q(".mkpvbox canvas");',
  '      let h2=null;',
  '      if(cv2){ const d2=cv2.getContext("2d").getImageData(0,0,cv2.width,cv2.height).data; h2=0; for(let i2=0;i2<d2.length;i2+=97) h2=(h2*31+d2[i2])>>>0 }',
  '      r.previewByType.push({ cat:cat2, hash:h2, atlas:B.maker.state.art.atlas, pos:B.maker.state.art.pos.x+","+B.maker.state.art.pos.y });',
  '    }',
  '    r.previewDistinct=new Set(r.previewByType.map(function(x){return x.hash})).size;',
  '    r.previewByTypeSummary=r.previewByType.map(function(x){ return x.cat+"@"+x.atlas+" "+x.pos }).join("  ||  ");',
  a,
].join('\n'))
fs.writeFileSync(G, t)
console.log('  ✓ 场景加了 previewByType')
fs.writeFileSync(F, s)
const b = fs.readFileSync(F, 'utf8')
const must = ["'str'", 'data-mkt=\\"\' + key + \'"', '蜡封在原版里没有数值参数', '所有类型通用的']
const miss = must.filter((m) => b.indexOf(m.replace(/\\"/g, '"')) < 0)
console.log(miss.length ? '  ❌ 写回后找不到：' + miss.join(' | ') : '  ✓ 写回校验：' + must.length + ' 个标识都在')
