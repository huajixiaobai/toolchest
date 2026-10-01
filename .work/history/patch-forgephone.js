/* Mobile forge fix. The whole preview column was sticky, so a 436px block stayed pinned and the
   option groups scrolled underneath it (6 of 8 were unreachable). Now only a compact preview bar
   is pinned, and the summary / export / animation sections move BELOW the pickers on phones. */
'use strict'
const fs = require('fs')
const path = require('path')
let fails = 0
function rep (file, from, to, label) {
  const F = path.join(__dirname, file)
  let s = fs.readFileSync(F, 'utf8')
  if (s.includes('\r\n')) { from = from.replace(/\r?\n/g, '\r\n'); to = to.replace(/\r?\n/g, '\r\n') }
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  fs.writeFileSync(F, s.replace(from, to)); console.log('ok   ' + label)
}

/* ---------- wrap the preview head + canvas + one-liner in their own sticky bar ---------- */
rep('app.js',
  `  function build () {
    left.innerHTML = '';
    const t = document.createElement('div'); t.className = 'pvhead';
    t.dataset.role = 'pvhead';
    t.style.cssText = 'font-size:12px;color:var(--fg3);margin-bottom:10px';
    left.appendChild(t);
    const holder = document.createElement('div'); holder.className = 'pvbox';
    holder.style.cssText = 'display:inline-block;padding:18px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    left.appendChild(holder);
    nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    left.appendChild(nowLine);`,
  `  function build () {
    left.innerHTML = '';
    /* The pinned part on phones: preview + one-line combination, side by side and short.
       Everything else (details / export / animation) goes BELOW the option groups so it can
       never cover them. */
    const pvtop = document.createElement('div'); pvtop.className = 'pvtop';
    left.appendChild(pvtop);
    pvtop.onclick = () => pvtop.classList.toggle('zoom');
    const t = document.createElement('div'); t.className = 'pvhead';
    t.dataset.role = 'pvhead';
    t.style.cssText = 'font-size:12px;color:var(--fg3);margin-bottom:10px';
    pvtop.appendChild(t);
    const holder = document.createElement('div'); holder.className = 'pvbox';
    holder.style.cssText = 'display:inline-block;padding:18px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    pvtop.appendChild(holder);
    nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    pvtop.appendChild(nowLine);`,
  'pvtop wrapper')

/* the phone preview is a thumbnail; tapping the bar zooms it */
rep('app.js',
  `      const maxW = isNarrow() ? 116 : 320;`,
  `      const maxW = isNarrow() ? 88 : 320;`,
  'smaller phone preview')

/* ---------- mobile CSS ---------- */
rep('app.css',
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
  `  /* Phones: stack everything, pin ONLY a short preview bar, and send the details / export /
     animation sections to the bottom so the pickers are never covered. */
  .forge{display:flex;flex-direction:column;gap:10px}
  .forge .preview{display:contents}
  .forge .pvtop{
    order:0;position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;text-align:left;
    background:#131c24;border:1px solid var(--line);border-radius:10px;padding:8px 10px;box-shadow:0 8px 16px #0009
  }
  .forge .pvtop .pvhead{display:none}
  .forge .pvtop .pvbox{padding:5px!important;margin:0;flex:0 0 auto;transition:.15s}
  .forge .pvtop .pvnow{margin:0;text-align:left;flex:1 1 auto;min-width:0;-webkit-line-clamp:4;font-size:11.5px;color:var(--fg2)}
  .forge .pvtop::after{content:'⤢';color:var(--fg3);font-size:12px;flex:0 0 auto}
  .forge .pvtop.zoom .pvbox{padding:10px!important}
  .forge .pvtop.zoom .pvbox canvas{width:190px!important}
  .forge .preview > .opt{order:4}
  .forge .opts{order:3;grid-template-columns:1fr}
  .forgenav{position:static;padding:2px 0 8px;overflow-x:auto;flex-wrap:nowrap}
  .forgenav .nv{flex:0 0 auto}
  .forgenav .nvsep{display:none}
  .opt h4{padding:11px 12px}
  .opt h4 .ocur{max-width:44%}`,
  'mobile forge layout')

console.log(fails ? 'FAILURES' : 'done')
