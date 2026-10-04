/* 第五十三轮：把「前置要求 + 安装说明 + 链接 + 排错」写进制作器，并修掉我之前那句错话
   （我曾在导出提示里写「直接丢进 %AppData%/Balatro/Mods/ 就行」—— Steamodded 只读文件夹，zip 不读。
     证据：本机日志 'No mod root found in zip ".../jieyuan_mod.zip"'。）
   链接来源（本机连不上 GitHub，所以只用能核实的）：Steamodded 自己的 manifest.json 里 website_url
   = https://github.com/Steamodded/smods；它的 README 里给了 wiki https://github.com/Steamopollys/Steamodded/wiki 与 Discord。
   Lovely 的仓库地址我在这台机器上核实不了，所以文案里只说「Lovely Injector（你机器上是 0.9.0）」，不编 URL。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

/* ① 修掉错话：导出提示要讲清楚「解压成文件夹」 */
rep(
  "'已生成 ' + MKR.modId + '.zip（' + files.length + ' 个文件 / ' + MKR.items.length + ' 个条目 / ' + Math.round(bytes.length / 1024) + ' KB）—— 直接丢进 %AppData%/Balatro/Mods/ 就行。'",
  "'已生成 ' + MKR.modId + '.zip（' + files.length + ' 个文件 / ' + MKR.items.length + ' 个条目 / ' + Math.round(bytes.length / 1024) + ' KB）—— 注意：**先解压**，把解压出来的文件夹整个放进 %AppData%/Balatro/Mods/ 再重启游戏。Steamodded 不读 zip（放 zip 进去游戏里不会有任何反应）。'",
  '导出提示改成解压成文件夹'
);

/* ② 前置要求与安装说明：放进 ⓪ 段（工程 JSON 那一排按钮下面） */
rep(
  "    body.appendChild(jrow);\n  }",
  L('    body.appendChild(jrow);',
    '    /* 用之前必须知道的：加载器是前置条件，页面自己没法替你装（网页读不到你的硬盘） */',
    "    const need = document.createElement('div'); need.className = 'mkneed'; need.id = 'mkNeedLoader';",
    "    need.innerHTML = '<b>⚠ 想让它真的进游戏，需要先装两样东西（本页只负责生成 mod，装加载器得你自己动手）</b>' +",
    "      '<ol>' +",
    "      '<li><b>Lovely Injector</b>（注入器）——把它的 <code>version.dll</code> 放进游戏根目录（和 <code>Balatro.exe</code> 同一个文件夹）。你机器上装的是 <b>Lovely 0.9.0</b>，位置在 <code>' + esc(GAME_DIR_HINT) + '</code>。</li>' +",
    "      '<li><b>Steamodded</b>（mod 框架，本页生成的 Lua 全靠它的 <code>SMODS.*</code> 接口）——解压后把整个 <code>smods</code> 文件夹放进 mod 目录。官网/下载：<a href=\"https://github.com/Steamodded/smods\" target=\"_blank\" rel=\"noopener\">github.com/Steamodded/smods</a>，说明与教程：<a href=\"https://github.com/Steamopollys/Steamodded/wiki\" target=\"_blank\" rel=\"noopener\">Steamodded Wiki</a>，遇到问题问人：<a href=\"https://discord.gg/kU8cqCqwy3\" target=\"_blank\" rel=\"noopener\">Discord</a>。</li>' +",
    "      '<li>mod 目录（Lovely 就看这里）：<code>%AppData%\\\\Balatro\\\\Mods</code>，本机就是 <code>' + esc(MODS_DIR_HINT) + '</code>。</li>' +",
    "      '</ol>' +",
    "      '<b>装 mod 的正确步骤</b>：点上面的「下载 mod zip」→ <b>解压</b> → 把解压出来的<b>文件夹</b>整个放进 mod 目录 → <b>重启游戏</b>。' +",
    "      '<br><b>别把 zip 直接丢进去</b>：Steamodded 只认文件夹。放进 zip 游戏里会毫无反应，日志里只有一句 <code>No mod root found in zip</code>。' +",
    "      '<br><b>出问题先看日志</b>：<code>%AppData%\\\\Balatro\\\\Mods\\\\lovely\\\\log\\\\</code> 里最新的那个 <code>.log</code>。' +",
    "      '常见两条：<code>No mod root found in zip</code> = 你把 zip 放进去没解压；<code>Valid JSON file found</code> = 框架认了这个 mod（正常）。' +",
    "      '<br><b>改完 mod 要重启游戏</b>才会重新加载。' +",
    "      '<br><span class=\"mkneedtip\">说明：原版 Balatro 没有官方 mod 接口，不装这两样东西，生成出来的 mod 是加载不了的（Lua 里的 SMODS 表根本不存在）。</span>';",
    '    body.appendChild(need);',
    '  }'),
  '前置要求说明块'
);

/* ③ 两个路径提示常量（页面读不到硬盘，只能给通用写法 + 本机常见位置） */
rep(
  'const MK_PROJ_KEY = \'balatro.maker.project.v1\';',
  L("const MK_PROJ_KEY = 'balatro.maker.project.v1';",
    "/* 给界面用的路径提示（网页读不到你的硬盘，这只是通用位置说明） */",
    "const GAME_DIR_HINT = '%SteamLibrary%\\\\steamapps\\\\common\\\\Balatro（Steam 里右键游戏 → 管理 → 浏览本地文件）';",
    "const MODS_DIR_HINT = '%AppData%\\\\Balatro\\\\Mods（把这一串粘到资源管理器地址栏就能打开）';"),
  '路径提示常量'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ["id = 'mkNeedLoader'", 'github.com/Steamodded/smods', 'Steamopollys/Steamodded/wiki', '别把 zip 直接丢进去', 'GAME_DIR_HINT', 'MODS_DIR_HINT', '先解压'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
