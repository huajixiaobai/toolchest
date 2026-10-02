/* 第三十三轮 G：平板上的版面宽度要查清楚（.scenv 只有 214px，说明整块比分栏是窄的） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8');
const L = (...a) => a.join('\n');
const from = "    r.layout.envWidth=(function(){ var e=q('.scenv'); if(!e) return null; var p=e.parentElement;";
const to = L(
  "    r.layout.wide=(function(){",
  "      const w=(sel)=>{ const e=q(sel); return e?Math.round(e.getBoundingClientRect().width):null };",
  "      const grid=q('.scgrid');",
  "      return { innerW:innerWidth, content:w('#content'), stage:w('.scstage'), board:w('.scboard'), scgrid:w('.scgrid'),",
  "        gridCols:grid?getComputedStyle(grid).gridTemplateColumns:null,",
  "        mq860:matchMedia('(max-width:860px)').matches, mq900:matchMedia('(max-width:900px)').matches,",
  "        narrow:document.body.className };",
  '    })();',
  "    r.layout.envWidth=(function(){ var e=q('.scenv'); if(!e) return null; var p=e.parentElement;"
);
const hits = s.split(from).length - 1;
if (hits !== 1) { console.error('❌ 锚点命中 ' + hits + ' 次'); process.exit(1) }
fs.writeFileSync(F, s.replace(from, to));
console.log('  ✓ 加宽度诊断');
