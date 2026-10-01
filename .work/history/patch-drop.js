/* Dropping a mod anywhere on the page imports it, instead of letting the browser navigate
   to the folder/zip. The panel's own drop zone keeps its local highlight. */
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

rep('app.css',
  `.cell .modtag{`,
  `/* full-page hint while a folder / zip is dragged over the window */
body.dropping::after{
  content:'松开即可导入 mod（文件夹或 zip）';position:fixed;inset:0;z-index:200;pointer-events:none;
  display:flex;align-items:center;justify-content:center;
  background:#0b1119ee;color:var(--accent);font-size:17px;font-weight:600;
  box-shadow:inset 0 0 0 3px var(--accent)
}
.cell .modtag{`,
  'css drop overlay')

rep('app.js',
  `  // warm up every sheet, then repaint once they are decoded`,
  `  // a mod dropped anywhere on the page is imported instead of navigating the browser away
  let dragDepth = 0;
  const hasFiles = (e) => !!(e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0);
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; document.body.classList.add('dropping') });
  window.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dropping') });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0; document.body.classList.remove('dropping');
    S.tab = 'mods'; S.source = 'all'; render();   // land on the import panel so the log is visible
    filesFromDrop(e.dataTransfer).then((files) => importBatch(files));
  });

  // warm up every sheet, then repaint once they are decoded`,
  'global drop handler')

console.log(fails ? 'FAILURES' : 'done')
