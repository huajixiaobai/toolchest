/* 第五十三轮（补 2）：wiki 那条断言改成查 href（链接文字是「Steamodded Wiki」，/wiki 在 href 里） */
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'verify', 'cdp.js')
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
const from = '      link:nt.indexOf("github.com/Steamodded/smods")>=0, wiki:nt.indexOf("Steamodded/wiki")>=0,'
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点不唯一'); process.exit(1) }
s = s.replace(from, () => '      link:nt.indexOf("github.com/Steamodded/smods")>=0,')
const from2 = '    r.needLinkHref=(need&&need.querySelector("a"))?need.querySelector("a").getAttribute("href"):null;'
if (s.split(from2).length - 1 !== 1) { console.error('❌ 锚点 2 不唯一'); process.exit(1) }
s = s.replace(from2, () => [
  '    r.needHrefs=need?[].slice.call(need.querySelectorAll("a")).map(function(a){return a.getAttribute("href")}):[];',
  '    r.needLinksOk=r.needHrefs.indexOf("https://github.com/Steamodded/smods")>=0 && r.needHrefs.indexOf("https://github.com/Steamopollys/Steamodded/wiki")>=0;',
].join('\n'))
fs.writeFileSync(F, s)
console.log('  ✓ 断言改成查 href')
