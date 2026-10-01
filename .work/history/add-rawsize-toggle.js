// Add the "raw size" toggle to the top bar (some cards have a resized box in game).
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, '..', 'app.js')
let s = fs.readFileSync(f, 'utf8')

const btnOld = '      <button class="tbtn" id="btnZip">⤓ 导出当前分类 ZIP</button>'
const btnNew = '      <button class="tbtn" id="btnRawSize" title="小小丑 / 半张小丑 / 拍立得 / 方块小丑 / 补充包在原版里卡框尺寸被改过；点这里改成按原始贴图尺寸渲染与导出">📐 原尺寸</button>\n' + btnOld
if (!s.includes(btnOld)) { console.log('button anchor missing'); process.exit(1) }
s = s.replace(btnOld, btnNew)

const wireOld = "  document.getElementById('btnZip').onclick = () => exportList(currentList());"
const wireNew = `  const rawBtn = document.getElementById('btnRawSize');
  rawBtn.classList.toggle('on', S.rawSize);
  rawBtn.onclick = () => {
    S.rawSize = !S.rawSize;
    rawBtn.classList.toggle('on', S.rawSize);
    toast(S.rawSize ? '已切换为原始贴图尺寸（忽略原版卡框缩放）' : '已恢复原版卡框尺寸');
    render();
  };
` + wireOld
if (!s.includes(wireOld)) { console.log('wiring anchor missing'); process.exit(1) }
s = s.replace(wireOld, wireNew)

fs.writeFileSync(f, s)
try { new Function(s); console.log('✅ raw-size toggle wired, syntax OK') } catch (e) { console.log('❌ syntax:', e.message) }
