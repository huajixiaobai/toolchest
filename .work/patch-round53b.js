/* 第五十三轮（补）：说明块的样式 + 场景断言（说明块必须在、链接和关键提醒都在） */
const fs = require('fs');
const path = require('path');
let n = 0;

/* ① CSS */
{
  const F = path.join(__dirname, 'app.css');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const anchor = '.mkweights .hint{flex-basis:100%;margin:0}';
  if (s.split(anchor).length - 1 !== 1) { console.error('❌ CSS 锚点不唯一'); process.exit(1) }
  s = s.replace(anchor, () => [
    anchor,
    '/* 前置要求 / 安装说明 */',
    '.mkneed{margin:10px 0;padding:10px 12px;border:1px solid #f3b95855;border-left:3px solid #f3b958;border-radius:8px;background:#231c10;font-size:12.5px;line-height:1.65}',
    '.mkneed ol{margin:6px 0 6px 18px;padding:0}',
    '.mkneed li{margin:3px 0}',
    '.mkneed code{background:#101820;border:1px solid var(--line2);border-radius:4px;padding:1px 4px;font-size:11.5px;word-break:break-all}',
    '.mkneed a{color:var(--accent2,#009dff)}',
    '.mkneed .mkneedtip{opacity:.75}',
  ].join('\n'));
  fs.writeFileSync(F, s);
  console.log(fs.readFileSync(F, 'utf8').indexOf('.mkneed{') >= 0 ? '  ✓ 说明块样式' : '  ❌ 样式没写进去'); n++;
}

/* ② 场景断言 */
{
  const F = path.join(__dirname, 'verify', 'cdp.js');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const from = "    r.errText=document.body.innerText.indexOf(\"出错\")>=0;";
  if (s.split(from).length - 1 !== 1) { console.error('❌ 场景锚点不唯一'); process.exit(1) }
  s = s.replace(from, () => from + [
    '',
    '    /* 前置要求说明块：必须在，而且链接 / 关键提醒都得在 */',
    '    const need=q("#mkNeedLoader");',
    '    r.needBox=!!need;',
    '    const nt=need?need.innerText:"";',
    '    r.needMentions={ lovely:nt.indexOf("Lovely")>=0, smods:nt.indexOf("Steamodded")>=0,',
    '      link:nt.indexOf("github.com/Steamodded/smods")>=0, wiki:nt.indexOf("Steamodded/wiki")>=0,',
    '      unzip:nt.indexOf("解压")>=0, noZip:nt.indexOf("别把 zip 直接丢进去")>=0, log:nt.indexOf("lovely")>=0 && nt.indexOf("log")>=0, restart:nt.indexOf("重启游戏")>=0 };',
    '    r.needLinkHref=(need&&need.querySelector("a"))?need.querySelector("a").getAttribute("href"):null;',
  ].join('\n'));
  fs.writeFileSync(F, s);
  console.log('  ✓ 场景补说明块断言'); n++;
}
console.log('共 ' + n + ' 处');
