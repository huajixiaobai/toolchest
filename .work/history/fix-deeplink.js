/* The copy-link button belongs in the always-present export row, not inside the Mod-only
   "来源" section. Also let the driver open a deep link directly. */
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

rep('app.js',
  `  mk('⧉ 复制 JSON', () => navigator.clipboard?.writeText(JSON.stringify(itemJSON(it), null, 2)).then(() => toast('已复制 JSON'), () => toast('复制失败')));`,
  `  mk('⧉ 复制链接', copyLink);
  mk('⧉ 复制 JSON', () => navigator.clipboard?.writeText(JSON.stringify(itemJSON(it), null, 2)).then(() => toast('已复制 JSON'), () => toast('复制失败')));`,
  'copy link in export row')

rep('app.js',
  `    const bl = document.createElement('button'); bl.className = 'btn';
    bl.textContent = '⧉ 复制链接';
    bl.title = '这个条目的直达链接（可分享，打开就定位到这里）';
    bl.onclick = copyLink;
    const b1 = document.createElement('button'); b1.className = 'btn';`,
  `    const b1 = document.createElement('button'); b1.className = 'btn';`,
  'drop the misplaced one')

rep('app.js',
  `    btns.appendChild(b1);
    btns.appendChild(bl);
    s0.appendChild(btns);`,
  `    btns.appendChild(b1);
    s0.appendChild(btns);`,
  'drop append')

/* driver: open the single-file viewer with a deep link already in the URL */
rep(path.join('verify', 'cdp.js'),
  `    if (name === 'liteBoot') {`,
  `    if (name === 'deepLinkOpen') {
      const base = PAGE.replace(/#.*$/, '')
      await c.send('Page.navigate', { url: base + '#c=Joker&i=j_joker&l=en-us' })
      await sleep(1500)
      await c.eval(HELPERS)
    }
    if (name === 'liteBoot') {`,
  'deep link navigation')

console.log(fails ? 'FAILURES' : 'done')
