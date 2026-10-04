/* 第七十四轮：① 补第 66–73 轮记账  ② config 输入框把依赖写进标签
   查清了：config 那个输入框是 <input data-mk="config">（没有 id，所以我上次的 #mkCfg 提示锚点没命中），
   真正的写入按钮是 #mkApplyCfg。改法最省事也最诚实：把"要按按钮"直接写进它的标签。 */
const fs = require('fs')
const path = require('path')
let out = []

/* ① app.js：标签里说清依赖 */
{
  const F = path.join(__dirname, 'app.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const a = "field('config 覆盖（JSON，可留空）',"
  const hits = s.split(a).length - 1
  if (hits !== 1) { out.push('app.js：锚点命中 ' + hits + '，跳过') } else {
    s = s.replace(a, () => "field('config 覆盖（JSON，可留空）—— 填完要点右边「把 config JSON 写进 Lua」，点了才进 Lua',")
    fs.writeFileSync(F, s)
    out.push('app.js：config 标签写清依赖 ✓')
  }
}

/* ② DEVELOPMENT.md：补第 66–73 轮 */
{
  const F = path.join(__dirname, '..', 'DEVELOPMENT.md')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const anchor = '**第六十五轮（收尾：结构自检升级到"产物里真有该类型的专属字段"，并写清验证边界）**'
  const hits = s.split(anchor).length - 1
  if (hits !== 1) { out.push('DEVELOPMENT.md：锚点命中 ' + hits + '，跳过') } else {
    const E = [
      '**第七十四轮（补账 + config 输入框的依赖写进标签）**',
      '- 第 66–73 轮的账一次性补在下面几条里（之前连着 8 轮在赶功能/修工具，没记）。',
      '- 查清一件小事：`config` 那个输入框是 `<input data-mk="config">`、**没有 id**（所以我上一轮想加的提示锚点没命中），真正的写入按钮是 `#mkApplyCfg`。现在把依赖写进它的标签：「config 覆盖（JSON，可留空）—— 填完要点右边「把 config JSON 写进 Lua」，点了才进 Lua」，省得用户以为填了没反应。',
      '',
      '**第七十三轮（把不可信的扫描降级为参考；设计清理逐条结账）**',
      '- 那个「自动扫描所有控件、找改了没反应的」工具**连续三轮假阳性**：它把 `modId` 标成死控件，而给签名打桩实测改 `modId` **确实**同时改变了 Lua（2741→2745）与 manifest（291→293），元素也只有一个。',
      '- 处理：输出改名 `scanAdvisory_*` 并自带「参考用：含已知假阳性，不作为结论」；**可信结论一律以定向断言为准**（`perTypeEditSummary` / `typeLuaChecks` / `cloneSummary`）。不修它了 —— 再花轮次修量具不如把账结清。',
      '- 设计清理结账：①通用/专属已在界面写明（代码层合并未做，风险高，留后）；②删死代码**未做**；③蜡封 ✅（诚实说明 + 可写字的备注字段，实测 `sealFieldIsText: true`）；④预览跟类型走 ✅（`previewDistinct: 4`）；⑤**部分**（关键字段有定向断言，全量名单没有可信版本）；⑥文档本轮才补上。',
      '',
      '**第七十二轮（给签名打桩，钉死矛盾）**',
      '- 改一次 `modId` 前后：`luaChanged: true`（2741→2745）、`manChanged: true`（291→293）、`elCount: 1`、状态确实落到 `mymodxxQ`。',
      '- 结论：`modId` 不该被判死 → 那份 15 个的名单**至少有假阳性**，因此不作结论。宁可不给名单，也不给错名单。',
      '',
      '**第七十一轮（重做扫描器：每步重查元素 + 断言编辑落到状态）**',
      '- 旧毛病猜测：一次性收集元素引用，中途控件触发重绘后引用失效 → 把"有反应"误判成没反应。',
      '- 新版每个控件都重新查一次，改完再断言"编辑确实落到 state / project / t"上，没落地的记「没测到」。结果 `controlsUntested: 全部测到了`，但仍标记同样 15 个 → 引出下一轮的打桩。',
      '',
      '**第七十轮（定点探针：工程字段到底是不是死控件）**',
      '- `found: true`、`valAfterEl: zzzprobe`、`stateValue: zzzprobe`、`handlerRan: true`、`manifestChanged: true`（`id` 由 `mymodx` 变 `zzzprobe`）。',
      '- 结论：**工程字段完全正常，是扫描器在骗我** —— 这条把上一轮我当成"真问题"报给用户的 `rarity/cost/weight/order` 那组也一起打上了问号。',
      '',
      '**第六十九轮（把检查扩到整包产物）**',
      '- 签名从「Lua + 预览哈希」扩成「Lua + manifest + 预览」，标记数 18→15（掉的是重复项）。这一步**没解决问题**，假阳性依旧，直到第七十轮才查清是工具自己的问题。',
      '',
      '**第六十八轮（自动扫描"改了看不出变化的控件"）**',
      '- 做法：每个可交互控件逐个改一次（数字 +3、下拉换项、勾选翻转、文本追加），与改之前的 Lua + 预览哈希比较，都没变就记为可疑。第一次：29 个控件、18 个被标记。',
      '- 思路对、实现不可靠 —— 见第七十至七十三轮。',
      '',
      '**第六十七轮（设计清理：④③①）**',
      '- ④ 预览是否跟类型走：依次克隆小丑/塔罗/补充包/盲注，四次预览画布哈希互不相同（`previewDistinct: 4`），图集解析正确（盲注 → `blind_chips`）。**以前只验过导出、没验过预览。**',
      '- ③ 蜡封：说清「原版蜡封没有数值参数，行为取决于玩家拿它做什么，这段逻辑是代码」，并给一个**可写字的备注字段**（作为注释带进 Lua，不假装实现了效果）。',
      '- ① 界面讲清「名字/价格/稀有度是所有类型通用，类型专属设置只影响本类型」。',
      '',
      '**第六十六轮（修「其他类型的素材都不对」——用户反馈的真 bug）**',
      '- 根因：图鉴里条目的贴图信息**存放在两个地方** —— 有的在 `it.atlas`/`it.pos`，有的在 `it.sprite{kind, atlas, atlas2, pos}`。克隆时我只读了前者，取不到就 `|| MK.art.atlas`（**沿用上一条的图集**）→ 照塔罗/补充包/盲注做出来素材全错。',
      '- 顺带修同一类没逻辑处：新建条目也沿用当前条目的图集（新建盲注却拿到小丑图集）→ 改成按类型找一张原版同类条目用它的图集。',
      '- 实测六种类型 `artOk` 全部「一致」。',
      '',
    ].join('\n')
    s = s.replace(anchor, () => E + anchor)
    fs.writeFileSync(F, s)
    out.push('DEVELOPMENT.md：补第 66–73 轮 ✓')
  }
}
console.log(out.join('\n'))
