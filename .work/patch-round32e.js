/* blindAudit / animAudit 跟上新界面：
   - 下拉换成了选择弹窗，脚本改成直接改状态（并在弹窗里核对 mod 盲注确实列出来了）
   - 抖动类现在挂在 HUD 上（.schud.jiggle） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
const pairs = [
  ["if (document.querySelector(\".scstage.jiggle\")) seen.jiggle++;",
   "if (document.querySelector(\".schud.jiggle, .scstage.jiggle\")) seen.jiggle++;",
   '抖动断言'],
  ["    const setBlind=(v)=>{ const s=q('#scBlind'); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})) };",
   L("    /* 界面上的下拉已经换成「选择盲注」弹窗，脚本直接改状态（弹窗另有 blindPick 场景在测） */",
     "    const setBlind=(v)=>{ B.score.state.blind=v; B.render() };"),
   'setBlind 改状态'],
  ["      debuffRows:c.rows.filter((x)=>x.op==='debuff').length, note:((q('#scBlindNote')||{}).textContent||'').slice(0,60)}})();",
   "      debuffRows:c.rows.filter((x)=>x.op==='debuff').length, note:((q('.scblindfx')||{}).textContent||'').slice(0,60)}})();",
   '说明选择器'],
  ["    r.modBlindListed=[].slice.call(q('#scBlind').options).some((o)=>o.value==='bl_test_x');",
   L("    q('.scblindpick').click(); await __V.wait(700);",
     "    r.modBlindListed=[].slice.call(document.querySelectorAll('#scBlindList [data-blind]')).some((o)=>o.dataset.blind==='bl_test_x');",
     "    const bd=q('#scBlindDone'); if (bd) { bd.click(); await __V.wait(400) }"),
   'mod 盲注在列表里'],
];
let n = 0;
for (const [from, to, label] of pairs) {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, to);
  console.log('  ✓ ' + label);
  n++;
}
fs.writeFileSync(F, s);
console.log('共 ' + n + ' 处改动');
