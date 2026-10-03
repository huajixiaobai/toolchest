/* 第四十三轮：修「点第一条效果的 ✕ 就 Maximum call stack size exceeded」
   ① 报错别再被吞掉：把堆栈打到控制台（验证器能收到）并在界面上显示前几行
   ② mkSet 加"重入保护"：万一渲染期间又被触发，直接忽略，不让它把栈撑爆
   ③ 顺手把删除/加行做成确定性的（按 index 过滤，而不是 splice） */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1) }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

/* ① 报错带堆栈 */
rep(
  "  else if (S.tab === 'maker') { try { viewMaker(content) } catch (e) { content.innerHTML = '<div class=\"hint\">Mod 制作器出错：' + esc(e.message) + '</div>' } }",
  L("  else if (S.tab === 'maker') {",
    "    try { viewMaker(content) } catch (e) {",
    "      console.error('[Mod 制作器] 渲染出错:', e && e.stack ? e.stack : e);",
    "      content.innerHTML = '<div class=\"hint\">Mod 制作器出错：' + esc(e.message) +",
    "        '<br><br>' + esc(String((e && e.stack) || '').split('\\n').slice(0, 6).join('\\n')) + '</div>';",
    '    }',
    '  }'),
  '报错带堆栈');

/* ② mkSet 重入保护 */
rep(
  "function mkSet (patch) {\n  const prevType = MK.type;\n  Object.assign(MK, patch);",
  L('let mkSetBusy = false;',
    'function mkSet (patch) {',
    '  /* 渲染期间又被触发就忽略：之前点「删掉这一行」会把调用栈撑爆 */',
    '  if (mkSetBusy) return;',
    '  mkSetBusy = true;',
    '  try { mkSetApply(patch); } finally { mkSetBusy = false }',
    '}',
    'function mkSetApply (patch) {',
    '  const prevType = MK.type;',
    '  Object.assign(MK, patch);'),
  'mkSet 重入保护');
rep(
  "  if (patch && ('type' in patch || 'key' in patch || 'art' in patch || 'effects' in patch)) MK.luaDirty = false;\n  mkRedraw();\n}",
  L("  if (patch && ('type' in patch || 'key' in patch || 'art' in patch || 'effects' in patch)) MK.luaDirty = false;",
    '  mkRedraw();',
    '}'),
  'mkSetApply 收尾');

/* ③ 删除/加行改成确定性写法 */
rep(
  "  qa('[data-del]').forEach((el) => el.addEventListener('click', () => {\n    const list = MK.effects.slice(); list.splice(Number(el.dataset.del), 1);\n    mkSet({ effects: list });\n  }));",
  L("  qa('[data-del]').forEach((el) => el.addEventListener('click', (ev) => {",
    '    ev.stopPropagation();',
    '    const idx = Number(el.dataset.del);',
    '    const list = MK.effects.filter((x, i) => i !== idx);',
    '    mkSet({ effects: list });',
    '  }));'),
  '删除按 index 过滤');

fs.writeFileSync(F, s);
const chk = fs.readFileSync(F, 'utf8');
['mkSetBusy', 'mkSetApply', "[Mod 制作器] 渲染出错"].forEach((m) => console.log('  核对 ' + m + ': ' + (chk.split(m).length - 1)));
console.log('共 ' + n + ' 处改动');

/* 场景：点第一条效果的 ✕，看能不能删掉且不报错 */
const CDP = path.join(__dirname, 'verify', 'cdp.js');
let cdp = fs.readFileSync(CDP, 'utf8').replace(/\r\n/g, '\n');
const from = "    r.afterPreset={ effects:B.maker.state.effects.length, first:B.maker.state.effects[0] };";
const to = L(
  "    r.afterPreset={ effects:B.maker.state.effects.length, first:B.maker.state.effects[0] };",
  "    /* 点第一条效果的 ✕：以前这里会 Maximum call stack size exceeded */",
  "    B.maker.state.effects=[{when:'card',cond:'',condVal:'',eff:'chips',val:10},{when:'hand',cond:'',condVal:'',eff:'mult',val:2}];",
  "    B.render(); await __V.wait(500);",
  "    const xb=q('.mkfx [data-del]');",
  "    if (xb) { xb.click(); await __V.wait(700) }",
  "    r.delFirst={ hadButton:!!xb, left:B.maker.state.effects.length, stillOk:!!q('.maker'), view:!q('#content')?false:(q('#content').textContent.indexOf('出错')<0) };",
  "    r.errorsAfterDel=window.__V.errors.length;");
if (cdp.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
fs.writeFileSync(CDP, cdp.replace(from, () => to));
console.log('  ✓ 场景加"删除第一行"断言');
