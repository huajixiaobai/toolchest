/* Finish the Cryptid scenario on the joker codex (so the screenshot shows mod content), and
   hide the folder button on browsers without directory picking (phones). */
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

rep(path.join('verify', 'cdp.js'),
  `    r.exported = blobs.map((b) => ({ name: b.name, size: b.size, magic: b.magic })).slice(-3);

    r.blank = __V.blank();
    return r })()\`,`,
  `    r.exported = blobs.map((b) => ({ name: b.name, size: b.size, magic: b.magic })).slice(-3);

    // leave the page on Cryptid's jokers so the screenshot shows mod content
    B.state.tab = 'codex'; B.state.source = mod.id; B.state.cat = 'Joker'; B.state.sel = null;
    B.render();
    await __V.wait(2200);
    r.blank = __V.blank();
    return r })()\`,`,
  'end on the joker codex')

rep('app.js',
  `  v.querySelector('#modPickDir').onclick = () => dirIn.click();`,
  `  // phones have no directory picker, so do not offer a button that cannot do anything
  const dirPicker = 'webkitdirectory' in document.createElement('input');
  const pickDirBtn = v.querySelector('#modPickDir');
  if (!dirPicker) {
    pickDirBtn.disabled = true;
    pickDirBtn.title = '这个浏览器的文件选择器不支持选文件夹，请改用 zip 或直接拖进来';
    pickDirBtn.textContent = '选择 Mod 文件夹（此浏览器不支持）';
  } else pickDirBtn.onclick = () => dirIn.click();`,
  'hide folder picker when unsupported')

console.log(fails ? 'FAILURES' : 'done')
