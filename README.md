# 百宝箱 · Toolchest

一堆**在浏览器里跑**的小工具：把你自己电脑上那份游戏里的美术与数据解出来，看清、检索、拿走想要的素材。

**全程离线、零依赖、什么都不上传。** 站点里只有代码 —— 没有任何游戏素材或游戏数据。

> 🔗 在线使用：https://huajixiaobai.github.io/toolchest/
> 📖 开发笔记、实现细节、每一轮的改动记录：见 [`DEVELOPMENT.md`](DEVELOPMENT.md)
> 🚀 想部署自己的站点：见 [`deploy/README.md`](deploy/README.md)

---

## 现在有什么

### ♣ Balatro 素材图鉴 · `viewer/`

把 Balatro 的 `Balatro.exe` / 游戏文件夹 / 已解压的 zip 交给它，就能得到一份**可检索、可预览、可导出**的图鉴。

| | |
|---|---|
| **527 个条目** | 小丑牌 150、塔罗 22、星球 12、幽灵 18、优惠券 32、补充包 32、牌组 16、强化 8、版本 5、蜡封 4、贴纸 11、标签 24、盲注 30、底注 8、扑克牌 52、联动牌面 72、叠加层 7、挑战 20、牌型 12… |
| **69 个图集 / 68 张贴图** | 2x 原始分辨率，图集格子坐标可反查 |
| **5 种语言** | 简体中文 / 繁體中文 / English / 日本語 / 한국어 的名称与描述 |
| **卡牌合成台** | 强化牌 + 蜡封 + 贴纸 + 版本（闪箔/镭射/多彩/负片）自由叠加，外观与原版一致 |
| **原版着色器** | 直接编译游戏自己的 `.fs`（含 Steamodded 的 GLSL ES 修复规则），19 个着色器里 17 个片元着色器全部可用 |
| **动图与动画** | 盲注 21 帧逐帧查看；导出 GIF / APNG / 帧序列，自动找循环点（避免来回跳变） |
| **Mod 导入** | 读 Steamodded（SMODS）格式的 mod：文件夹或 zip 拖进去即可，原版数字不会被改写，mod 条目单独标角标 |
| **导出** | PNG（1x/2x/4x/6x）/ SVG / ZIP / JSON / CSV / Markdown / 着色器源码 |
| **手机可用** | 响应式布局，390×844 下也点得到、看得清，可「添加到主屏幕」 |

这是一个**非官方粉丝工具**，与 LocalThunk / Playstack 没有任何关联。素材与数据的版权归原作者 —— 详见 [`NOTICE`](NOTICE)。

---

## 三种用法

| 想怎么用 | 怎么做 |
|---|---|
| **在线用**（给访客） | 打开站点 → 选择**你自己**的 `Balatro.exe` 或游戏文件夹 → 解析在你的浏览器里完成 |
| **自己用 · 打开就是图鉴** | 双击 `启动本地站点.cmd`（会问要不要让手机也能看）—— 服务的是带素材包的 `local/`，**不出现选择界面**，手机同 Wi-Fi 直接打开就是完整图鉴 |
| **完全离线单文件** | 自己构建 `Balatro素材图鉴.html`（4.21 MB，内嵌素材，双击即用）—— 构建方法见下 |

两套站点是刻意分开的：

| | `docs/`（公开站） | `local/`（自己用） |
|---|---|---|
| 内容 | **只有代码**（约 466 KB） | 代码 + 游戏素材包（约 3.8 MB） |
| 首屏 | 让你选择自己的游戏文件 | **直接就是图鉴**（527 个条目） |
| 放哪儿 | GitHub Pages / 任何静态托管 | 只有你自己电脑；`启动本地站点.cmd` 起服务，手机同 Wi-Fi 可用 |
| 进仓库吗 | 是 | **否**（`.gitignore` 挡着，含游戏贴图） |

**为什么公开站不放素材？** 那等于用你自己的名义公开分发游戏资源。想要"打开即用"的体验，就自己用 `local/`（见 [`NOTICE`](NOTICE)）。

---

## 自己构建

需要 Node.js 18+（推荐 20+）与你自己拥有的 Balatro 游戏文件。

```powershell
# ── 两份一起构建（推荐）──────────────────────────────────────────────
node .work/site.js --also-local    # docs/ 公开站（纯代码）+ local/ 自用站（含素材）
                                   # 站点身份读 site.config.json（站名 / 地址 / 仓库 / 作者链接）

# ── 只构建公开站（不含任何游戏素材）─────────────────────────────────
node .work/site.js
#   → docs/            首页 + viewer/ 查看器 + PWA + 分享图 + 404 …
#   → dist/site.zip    打包好的整站，可直接拖进静态托管
#
# 自用站的打包会写成 dist/site-with-assets.zip（含素材，别拖到公开托管上）

# ── 只构建查看器（放在别处用）───────────────────────────────────────
node .work/build-lite.js                       # → dist/lite/   纯代码
node .work/build-lite.js --pack                # → dist/web/    额外打包素材包（自建/局域网，别公开）

# ── 单文件离线版（内嵌全部素材，需要游戏文件）───────────────────────
node .work/un7z.js          # 解开桌面的 Balatro.v1.0.1o.7z
node .work/unzip-love.js    # 从融合 exe 里取出 LÖVE 工程
node .work/build.js         # 解析 game.lua 等 → .work/out/data.json
node .work/bundle-atlas.js  # 贴图 → base64
node .work/bundle.js        # 拼装 → Balatro素材图鉴.html
```

> 没有游戏文件也能构建站点：仓库里带了 `site-meta.json`（只有版本号与数量，不含任何游戏数据），
> `build-lite.js` / `site.js` 在找不到 `.work/out/data.json` 时会用它。

### 部署到 GitHub Pages

1. 把仓库推到 GitHub（`docs/` 要一起推）
2. **Settings → Pages → Source**: `Deploy from a branch`，分支 `main`，目录 `/docs`
3. 等一两分钟，访问 https://huajixiaobai.github.io/toolchest/

不用 Actions、不用密钥、不用构建机 —— `docs/` 就是成品。（`.gitignore` 已经挡掉了所有游戏数据。）

> 改名 / 换域名：重跑一次上面那条 `site.js`（换 `--site-name` / `--site-url` / `--repo-url`）就行，
> 页面全是相对路径，换名字不会坏。

---

## 它怎么做到「不上传」

```
你的游戏文件 ──(本地读取)──▶ 浏览器内存
                              │
                    ┌─────────┴──────────┐
              解 LÖVE 融合包         解析 Lua 数据
         （EOCD/中央目录反推偏移）  （P_CENTERS / P_BLINDS / 本地化…）
                    └─────────┬──────────┘
                              ▼
                     贴图 → blob: URL → 查看器
```

- 浏览器端解压用原生 `DecompressionStream('deflate-raw')`，**不引入任何库**
- 数据解析与本地构建**共用同一份 `databuild.js`**，两条路径的输出逐字节一致（有测试守着）
- 全程没有对第三方的 `fetch`，也没有上传代码 —— `check-offline.js` 会审计所有产物

---

## 目录结构

```
docs/                站点成品（GitHub Pages 用的就是这个目录）
├── index.html         首页（工具箱）
├── viewer/            查看器
├── sw.js              Service Worker：首页 + 查看器一起离线
└── manifest.webmanifest  icon.svg  og.png  404.html  robots.txt  sitemap.xml
deploy/              部署指南 + nginx 配置
.work/               源码与构建脚本
├── app.js             查看器主体（图鉴 / 合成台 / 导出 / mod）
├── boot.js            启动界面（选择你的游戏文件）
├── databuild.js       数据构建核心（Node 与浏览器共用）
├── gameparse.js       浏览器端解析游戏文件
├── glshaders.js       把游戏 .fs 编译到 WebGL
├── modimport.js       Mod（SMODS）解析器
├── lua.js             纯 JS 的 Lua 子集解析器
├── png.js             纯 JS PNG 编解码
├── build-lite.js      查看器构建   site.js  整站构建   home.js  首页模板
├── ogimage.js         分享卡片绘制（代码画的，不含游戏美术）
├── serve.js           零依赖静态服务器（--open / --lan）
└── verify/            无头 Chrome 自动化验证（62 个场景）
LICENSE               MIT（只覆盖代码）
NOTICE                版权与边界：素材归属、为什么站点只放代码
```

---

## 许可

- **代码**：MIT，见 [`LICENSE`](LICENSE)
- **游戏素材与数据**：版权归 **LocalThunk / Playstack**，本仓库不含、不授权、不声称拥有（见 [`NOTICE`](NOTICE)）
- **GLSL ES 修复规则**：参考 Steamodded 的 `lovely/glsl_es_patches/*.toml` 复现，感谢其作者
- 被导入的第三方 mod 版权归各自的作者

请不要把解析出来的素材打包公开分发，也不要在站名/图标里使用官方素材或暗示官方关联。
