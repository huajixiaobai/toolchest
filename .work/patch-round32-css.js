/* 补上第三十一/三十二轮的 CSS：上一次的补丁在 boot.js 那一步退出，app.css 从没写进去。
   这里一次性补齐（盲注块、选择弹窗、飘字、轻抖、账目配色、触屏尺寸）。 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.css');
let s = fs.readFileSync(F, 'utf8');
const ANCHOR = '.scrowhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}';
if (s.split(ANCHOR).length - 1 !== 1) { console.error('❌ 锚点不唯一，放弃'); process.exit(1) }

const CSS = [
  '/* ---- BOSS 盲注：当前那一块（名字 + 效果直接写出来）+ 选择弹窗 ---- */',
  '.scblindbox{background:#313b3d;border-radius:var(--g-r);padding:10px 12px;margin-bottom:8px}',
  '.scblindcur{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
  '.scblindcur.none .scblindname{color:var(--c-jgrey)}',
  '.scblindrowmain{flex:1 1 260px;min-width:0}',
  '.scblindname{font-size:16px;font-weight:700;color:#fff;text-shadow:var(--g-txt)}',
  '.scblindname .mod,.scblindrow b .mod{font-style:normal;font-size:10px;letter-spacing:.5px;background:var(--c-purple);color:#fff;border-radius:4px;padding:1px 5px;vertical-align:2px}',
  '.scblindfx{font-size:12.5px;line-height:1.6;color:#cfd8de;margin-top:3px}',
  '.scblinda{display:inline-block;margin-left:8px;color:#ffb4ad;font-weight:700}',
  '.scblindpick,.scblindclear{flex:0 0 auto;min-height:38px}',
  '.scblindlist{display:flex;flex-direction:column;gap:6px;padding:10px}',
  '.scblindrow{display:flex;flex-direction:column;gap:3px;text-align:left;width:100%;min-height:56px;',
  '  background:#18232d;border:1px solid var(--line2);border-radius:8px;padding:9px 12px;cursor:pointer;transition:.12s}',
  '.scblindrow:hover{border-color:var(--accent);background:#1d2a35}',
  '.scblindrow.on{border-color:var(--accent);background:#12352b}',
  '.scblindrow b{font-size:14px;color:#fff;font-weight:700}',
  '.scblindrow b .cur{font-style:normal;font-size:10px;background:#4bc292;color:#0d2118;border-radius:4px;padding:1px 5px;vertical-align:2px}',
  '.scblindrow span{font-size:12px;line-height:1.5;color:#b9c6cf}',
  '.scblindrow.none b{color:var(--c-jgrey)}',
  '/* 账目：被削弱 / 盲注那几行用红色调，一眼看出这一手为什么少分 */',
  '.scline.debuff,.scline.blind{color:#ffb4ad}',
  '/* 结算飘字（原版 card_eval_status_text / attention_text）：带同色底框，向上浮起淡出 */',
  '.scfloat{position:fixed;transform:translate(-50%,0);color:#fff;font-weight:700;padding:2px 7px;border-radius:6px;',
  '  pointer-events:none;z-index:900;white-space:nowrap;box-shadow:0 3px 0 rgba(0,0,0,.35);text-shadow:0 1px 0 rgba(0,0,0,.35);',
  '  opacity:.96;transition:transform .7s cubic-bezier(.2,.7,.3,1),opacity .7s ease-out}',
  '.scfloat.rise{transform:translate(-50%,-42px);opacity:0}',
  '/* pop（「简洁」模式仍会用到的老样式） */',
  '.scchips b,.scmult b,.scscore b{display:inline-block}',
  '@keyframes scpop{0%{transform:scale(1)}35%{transform:scale(1.16)}100%{transform:scale(1)}}',
  '.scchips b.pop,.scmult b.pop,.scscore b.pop{animation:scpop .24s ease-out}',
  '/* 整屏轻抖（原版 G.ROOM.jiggle += 0.7） */',
  '@keyframes scjiggle{0%{transform:translate(0,0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}',
  '  60%{transform:translate(-1px,2px)}80%{transform:translate(1px,-1px)}100%{transform:translate(0,0)}}',
  '.scstage.jiggle{animation:scjiggle .26s linear}',
  '/* 触屏 / 平板：盲注行与按钮按手指尺寸放大 */',
  '@media (hover:none){',
  '  .scblindrow{min-height:68px;padding:12px 14px}',
  '  .scblindrow b{font-size:15px}',
  '  .scblindrow span{font-size:12.5px}',
  '  .scblindpick,.scblindclear{min-height:46px;font-size:14px}',
  '  .scblindname{font-size:17px}',
  '}',
  '@media (prefers-reduced-motion: reduce){',
  '  .scfloat{transition:none}',
  '  .scstage.jiggle{animation:none}',
  '  .scchips b.pop,.scmult b.pop,.scscore b.pop{animation:none}',
  '}',
].join('\n');

s = s.replace(ANCHOR, CSS + '\n' + ANCHOR);
fs.writeFileSync(F, s);
let d = 0; for (const ch of s) { if (ch === '{') d++; if (ch === '}') d-- }
console.log('app.css 已补 ' + CSS.split('\n').length + ' 行，花括号平衡: ' + (d === 0 ? '✓' : '差 ' + d));
