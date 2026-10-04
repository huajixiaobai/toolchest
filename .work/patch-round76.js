/* 第七十六轮（设计清理 ⑤ 的收尾）：把「哪些通用字段对当前类型其实无效」如实写在界面上
   依据是**静态读生成代码**（不是那个已降级的扫描器）：
     · rarity（稀有度）只在第 7333 行 —— 小丑牌那段
     · order / weight / eternal_compat / perishable_compat / blueprint_compat 只在 7337~7341 —— 同样是小丑牌那段
     · cost（价格）多处都有（小丑/消耗品/补充包/优惠券…）
   所以非小丑类型填 稀有度/权重/排序/三个兼容性开关 是"改了不进 Lua"的。这里给出明确提示，而不是让用户自己踩。
   选择"加提示"而不是"隐藏"：④ 那一段的布局我还没完整读过，隐藏有碰坏版面的风险，而提示是零风险且同样诚实。 */
const fs = require('fs')
const path = require('path')
let out = []
{
  const F = path.join(__dirname, 'app.js')
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
  const a = "    });\n    body.appendChild(row2);"
  const hits = s.split(a).length - 1
  if (hits !== 1) out.push('app.js：锚点命中 ' + hits + '，跳过（未改）')
  else {
    s = s.replace(a, () => [
      '    });',
      '    body.appendChild(row2);',
      '    if (MK.type !== \'Joker\') {',
      '      /* 静态核对过生成代码：稀有度/权重/排序/三个兼容性开关只写进小丑牌的注册里 */',
      '      body.insertAdjacentHTML(\'beforeend\', \'<div class="hint">注意：上面这几项里，<b>稀有度 / 出现权重 / 排序 / 三个兼容性开关</b>只对<b>小丑牌</b>有意义 —— 生成 Lua 时只有小丑牌那段会写它们。当前类型是「\' + esc(mkType()[1]) + \'」，填了也不会进 Lua（价格 cost 是有用的，多数类型都会写）。</div>\');',
      '    }',
    ].join('\n'))
    fs.writeFileSync(F, s)
    out.push('app.js：④ 区加了「哪些字段对本类型无效」的如实提示 ✓')
  }
}
console.log(out.join('\n'))
