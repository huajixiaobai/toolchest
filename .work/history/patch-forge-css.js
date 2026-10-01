/* Forge layout CSS: collapsible groups, jump bar, compact always-visible preview. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.css')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`/* ---------- forge ---------- */
.forge{display:grid;grid-template-columns:320px 1fr;gap:18px;align-items:start}
.forge .preview{position:sticky;top:0;text-align:center;background:#131c24;border:1px solid var(--line);border-radius:10px;padding:16px}
.forge .preview canvas{image-rendering:pixelated;filter:drop-shadow(0 12px 26px #000b)}
.forge .opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.opt{background:#141d26;border:1px solid var(--line);border-radius:8px;padding:10px}
.opt h4{margin:0 0 8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--fg3)}`,
  `/* ---------- forge ---------- */
.forge{display:grid;grid-template-columns:320px 1fr;gap:18px;align-items:start}
.forge .preview{position:sticky;top:0;text-align:center;background:#131c24;border:1px solid var(--line);border-radius:10px;padding:14px 12px}
.forge .preview canvas{image-rendering:pixelated;filter:drop-shadow(0 12px 26px #000b)}
.forge .opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:14px;align-content:start}
.opt{background:#141d26;border:1px solid var(--line);border-radius:8px;padding:0;overflow:hidden}
.opt h4{
  display:flex;align-items:center;gap:8px;margin:0;padding:9px 11px;cursor:pointer;user-select:none;
  font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--fg3);background:#18222c
}
.opt h4:hover{color:var(--fg2)}
.opt h4 .ocur{
  margin-left:auto;max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font-size:11px;letter-spacing:0;text-transform:none;color:var(--accent)
}
.opt h4 .chev{color:var(--fg3);transition:transform .15s;font-size:10px}
.opt.collapsed h4 .chev{transform:rotate(-90deg)}
.opt .obody{padding:10px 11px 11px}
.opt.collapsed .obody{display:none}
.pick .pickmod{
  font-size:8.5px;font-style:normal;letter-spacing:.4px;padding:0 4px;border-radius:7px;margin-left:2px;
  background:#2b2140;border:1px solid var(--purple);color:#cbb8ee
}
/* jump bar */
.forgenav{
  grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;align-items:center;
  position:sticky;top:0;z-index:6;padding:6px 0 8px;
  background:linear-gradient(180deg,var(--bg) 72%,transparent)
}
.forgenav .nv{
  padding:4px 10px;font-size:11.5px;border-radius:99px;border:1px solid var(--line2);
  background:#141c25;color:var(--fg3);transition:.12s
}
.forgenav .nv:hover{border-color:var(--accent);color:var(--fg)}
.forgenav .nv.on{border-color:var(--accent);color:var(--accent);background:#12352b}
.forgenav .nv.act{border-style:dashed}
.forgenav .nvsep{flex:1;min-width:4px}
/* one-line current combination under the preview */
.pvnow{
  margin-top:9px;font-size:11.5px;color:var(--fg2);line-height:1.5;text-align:center;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden
}
.pvsummary table{width:100%}
/* the codex source chip */
.tbtn.srcchip{border-color:var(--accent);color:var(--accent);background:#12352b}
.tbtn.srcchip .x{opacity:.7;margin-left:2px}`,
  'forge css')

rep(`  .forge{grid-template-columns:1fr}
  .forge .preview{position:static}`,
  `  .forge{grid-template-columns:1fr;gap:10px}
  /* keep the preview in view: picking a layer always shows its effect right above */
  .forge .preview{position:sticky;top:0;z-index:9;padding:10px 8px;background:#131c24;box-shadow:0 10px 18px #0009}
  .forge .preview .btns{margin-top:6px!important}
  .forge .preview .pvbox{padding:8px!important}
  .forge .preview canvas{filter:drop-shadow(0 6px 12px #0009)}
  .forge .opts{grid-template-columns:1fr}
  .forgenav{position:sticky;top:0;padding:4px 0 7px;max-height:none;overflow-x:auto;flex-wrap:nowrap}
  .forgenav .nv{flex:0 0 auto}
  .forgenav .nvsep{display:none}
  .opt h4{padding:11px 12px}
  .opt h4 .ocur{max-width:44%}`,
  'forge mobile css')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES' : 'done')
