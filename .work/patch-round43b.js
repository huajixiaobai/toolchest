/* 第四十三轮（精简版）：只做三件确定的事
   ① 渲染加"重入保护"：render() 递归时直接返回 —— 用户点第一条效果的 ✕ 时爆栈就没了
   ② 报错不再被吞：把堆栈打到控制台（验证器收得到）并在界面显示前几行
   ③ 场景加"删掉第一行"的断言 */
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

rep("  const redraw = () => render();",
  L('  /* 重入保护：render() 里如果再触发一次 render（点某些按钮时会发生），直接返回，',
    '     否则会一路递归到爆栈（用户报告：点第一条效果的 ✕ 就 Maximum call stack size exceeded） */',
    '  let redrawing = false;',
    '  const redraw = () => {',
    '    if (redrawing) return;',
    '    redrawing = true;',
    '    try { render() } finally { redrawing = false }',
    '  };'),
  'render 重入保护');

rep("  else if (S.tab === 'maker') { try { viewMaker(content) } catch (e) { content.innerHTML = '<div class=\"hint\">Mod 制作器出错：' + esc(e.message) + '</div>' } }",
  L("  else if (S.tab === 'maker') {",
    '    try { viewMaker(content) } catch (e) {',
    "      console.error('[Mod 制作器] 渲染出错:', (e && e.stack) || e);",
    "      content.innerHTML = '<div class=\"hint\">Mod 制作器出错：' + esc(e.message) +",
    "        '<br><br>' + esc(String((e && e.stack) || '').split('\\n').slice(0, 6).join('\\n')) + '</div>';",
    '    }',
    '  }'),
  '报错带堆栈');

fs.writeFileSync(F, s);
const chk = fs.readFileSync(F, 'utf8');
['let redrawing = false;', 'if (redrawing) return;', '[Mod 制作器] 渲染出错'].forEach((m) => console.log('  核对 ' + m + ': ' + (chk.split(m).length - 1)));
console.log('共 ' + n + ' 处改动');

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
  "    r.delFirst={ hadButton:!!xb, left:B.maker.state.effects.length, stillOk:!!q('.maker'), noErrorText:(q('#content')?q('#content').textContent.indexOf('出错')<0:false) };");
if (cdp.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
fs.writeFileSync(CDP, cdp.replace(from, () => to));
console.log('  ✓ 场景加"删除第一行"断言');
