/* README: the web build (route A) — what it is, how to build it, what it contains. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, '..', '..', 'README.md')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`## 五、目录结构`,
  `## 五、在线版（网站）

这个项目同时能作为**网站**跑，而且公开站点里**不含任何游戏素材**：页面只带代码，访客选择自己电脑上的 \`Balatro.exe\`（或已解压的游戏文件夹），**解析全部在浏览器里完成**，素材不上传、不落地、不进仓库。

### 怎么构建

\`\`\`powershell
cd .work
node build-lite.js          # → dist/lite/   纯代码，298 KB，无任何游戏数据
node build-lite.js --pack   # → dist/web/    额外打包 assets/（自建部署用，含素材）
\`\`\`

| 产物 | 内容 | 体积 | 用途 |
|---|---|---|---|
| \`dist/lite/\` | index.html + boot.js + app.js + manifest + sw.js | **298 KB**（首屏 gzip 约 90 KB） | 公开托管：访客自带游戏文件 |
| \`dist/web/\` | 同上 + \`assets/data.json\` + \`assets/atlas.bin\` | 约 2.6 MB | 自建/私有部署：访问即用 |
| \`Balatro素材图鉴.html\` | 单文件、全内联 | 4.0 MB | 离线收藏、本地使用 |

\`dist/lite\` 直接从 \`file://\` 双击打开也能用（只有 Service Worker 注册需要 http(s)）。

### 访客那边发生什么

1. 打开页面 → 出现「选择 Balatro.exe / 选择游戏文件夹 / 拖进来」的启动界面（此时页面里没有任何游戏数据）
2. 选择文件 → 页面自己解开 LÖVE 包（\`DecompressionStream\` 解 deflate）、读 \`game.lua\` / \`globals.lua\` / \`challenges.lua\` / \`localization/*.lua\` / \`resources/textures/**/*.png\` / \`resources/shaders/*.fs\`
3. 用同一套 \`databuild.js\` 生成与本地构建**逐字节相同**的数据（527 个条目、69 个图集、136 张贴图）
4. 贴图变成 \`blob:\` URL 喂给查看器，然后用同一个 \`app.js\` 正常浏览、预览、导出

也就是说：**同一个构建核心，跑在两种环境里**（Node 构建离线单文件 / 浏览器里给访客用）。实测两者输出完全一致，136 张贴图字节也全部一致。

### 深链接分享

状态会写进 URL 片段，打开的链接直接定位到那个条目：

\`\`\`
#c=Joker&i=j_cry_mosaic&l=zh_CN      分类 / 条目 / 语言
#t=forge                             直接进合成台
#s=testmod&q=mult                    来源筛选 + 搜索词
\`\`\`

复制按钮在条目详情的「导出」一栏（\`⧉ 复制链接\`），\`file://\` 下同样可用。

### 版权与仓库边界

- 公开仓库 / 站点里**只有代码**：\`dist/lite\` 构建产物验证过不含任何游戏素材与游戏数据
- 游戏素材版权归 LocalThunk / Playstack，本项目只提供"查看你自己拥有的游戏"的工具
- 完整单文件版（含素材）请自行本地构建、自己留存，不要当作公开下载发布

---

## 六、目录结构`,
  'web build section')

rep(`## 六、重新构建`, `## 七、重新构建`, 'renumber rebuild')
rep(`## 七、实现要点`, `## 八、实现要点`, 'renumber internals')
rep(`## 八、更新记录`, `## 九、更新记录`, 'renumber changelog')
rep(`## 九、导入 Mod 素材的实现说明`, `## 十、导入 Mod 素材的实现说明`, 'renumber mods')

rep(`├── modimport.js             页面内的 Mod 解析器（zip 解压 / lua 扫描 / 图集与本地化）`,
  `├── databuild.js            可移植的数据构建核心（Node 与浏览器共用，输出逐字节一致）
├── gameparse.js            浏览器端解析游戏文件（融合 exe / 游戏文件夹 / zip）
├── boot.js                 在线版的启动界面（选择你的游戏文件 → 注入素材 → 加载查看器）
├── boot.css                启动界面的样式
├── build-lite.js           在线版构建（dist/lite 无素材，dist/web 带素材包）
├── modimport.js             页面内的 Mod 解析器（zip 解压 / lua 扫描 / 图集与本地化）`,
  'tree')

rep(`**第十一轮（全息影像 / mod 着色器 / 动图与瘦身）**`,
  `**第十二轮（在线版：自带游戏文件的网站）**
- 重构：**把数据构建核心抽成可移植模块** \`databuild.js\`（原来 \`build.js\` 里 684 行只有 28 行是 Node 专属）。Node 构建与浏览器解析共用同一份代码，并验证输出**逐字节一致**。
- 新：**\`gameparse.js\`** —— 在浏览器里解析用户自己的游戏文件：\`Balatro.exe\`（融合 LÖVE 包，按 EOCD/中央目录反推 zip 起始偏移）、游戏文件夹、或它们的 zip；只解需要的约 170 个文件，其余不动。
- 新：**在线版构建** \`node build-lite.js\` → \`dist/lite\`（**298 KB，完全不含游戏素材**）+ Service Worker + manifest；\`--pack\` 变体额外打包自建部署用的素材包。
- 新：**启动界面**：选择/拖入你的 \`Balatro.exe\` 或游戏文件夹 → 页面内解析 → 注入素材 → 加载查看器。全程不出浏览器（贴图用 \`blob:\` URL）。
- 新：**深链接分享**：\`#c=Joker&i=j_cry_mosaic&l=zh_CN\`，详情页有「⧉ 复制链接」，\`file://\` 下同样可用。
- 验证：新增 \`liteBoot\`（真浏览器里跑通"给 exe → 527 条 → 0 空白 → 导出可用"）、\`deepLink\` / \`deepLinkOpen\`（写入与还原）三个场景。

**第十一轮（全息影像 / mod 着色器 / 动图与瘦身）**`,
  'changelog round 12')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES ' + fails : 'done')
