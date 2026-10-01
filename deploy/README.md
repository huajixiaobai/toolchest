# 把它变成你自己的网站

## 结论先说

**这是一个纯静态站 —— 不需要服务器程序、不需要数据库、不需要任何后端。**

站点成品就在仓库的 **`docs/`** 目录（首页 + `viewer/` 查看器 + PWA + 分享图 + 404），它是构建产物，直接就是 GitHub Pages 的内容。

同时有一条硬边界：**公开站上只能放代码。**
`dist/web`（含 2 MB 游戏贴图）和 `Balatro素材图鉴.html`（4.21 MB 含全部素材）**只给自己留存 / 局域网用**，不要推到公开仓库或域名上——那等于用自己的名义公开分发游戏资源。`.gitignore` 已经把它们挡在外面了。详见最后一节。

---

## 站点结构

```
docs/
├── index.html              首页（工具箱：现在 1 个工具 + 1 个占位）
├── viewer/                 查看器（Balatro 素材图鉴）
│   ├── index.html          启动界面：让你选自己的 Balatro.exe
│   ├── boot.js app.js      启动逻辑 + 查看器主体
│   ├── manifest.webmanifest icon.svg og.png
├── sw.js                   根 Service Worker：首页 + 查看器一起离线可开
├── manifest.webmanifest    整站 PWA
├── icon.svg og.png         代码画的品牌图标与分享卡片（不含游戏美术）
├── robots.txt sitemap.xml  搜索引擎
├── 404.html _headers .nojekyll
└── (dist/site.zip 是它的打包)
```

**加第二个工具时**：在 `.work/home.js` 的 `tools` 数组里加一条，把新工具构建到 `docs/<名字>/`，
再把它的入口文件加进 `.work/site.js` 里的 `CORE` 列表（Service Worker 预缓存）—— 三处，就这些。

### 一条命令重建整站

```powershell
node .work/site.js --site-name "百宝箱" --site-url https://huajixiaobai.github.io/toolchest/ --repo-url https://github.com/huajixiaobai/toolchest
```

`--site-url` 决定 canonical / `og:url` / `og:image` / sitemap 里的绝对地址。
**不填也能跑**（页面全是相对路径，放子目录、放 `file://` 都不坏），只是分享出去没有缩略图。

首页标题与副标题也可以临时改：

```powershell
node .work/site.js --site-name "我的工具箱" --tagline "……" --repo-url https://github.com/你/仓库
```

---

## 路线 ① GitHub Pages（当前采用这一条）

已经按它的要求准备好了：`docs/` 里是成品、`.nojekyll` 也在、`.gitignore` 排除了所有游戏数据。

### 有 git 的话

仓库已经在本机 `git init` 过了（分支 `main`，内容已暂存），所以只需要：

```bash
git config --global user.name  "huajixiaobai"          # 只做一次
git config --global user.email "3195464424@qq.com"     # 只做一次
git commit -m "百宝箱：Balatro 素材图鉴 + 工具箱站点"
git remote add origin https://github.com/huajixiaobai/toolchest.git
git push -u origin main
```

然后仓库 **Settings → Pages → Source** 选 `Deploy from a branch`，分支 `main`，目录 **`/docs`**，保存。
等一两分钟即可访问 https://huajixiaobai.github.io/toolchest/

> **提交会算到谁头上**：GitHub 是按邮箱认人的。`3195464424@qq.com` 必须已经加到
> GitHub 的 **Settings → Emails** 里并验证过，提交才会显示成你的头像和链接；
> 否则会是一个灰色的"未关联"提交。不想暴露 QQ 邮箱的话，用 GitHub 给你的
> `huajixiaobai@users.noreply.github.com` 当邮箱（在同一个设置页能看到）。

### 没有 git 也行（网页上传）

1. 在 GitHub 上新建仓库（Public）
2. 仓库页 → **Add file → Upload files**
3. 把 `docs/` 里的**内容**拖进去（注意：要的是 `index.html` 等在仓库根……**不**，见下）
   —— 更省事的做法：用命令行或 GitHub Desktop 把整个仓库推上去；纯网页上传无法保留 `docs/` 这一层目录结构时，
   就把上传目标目录写成 `docs/`（GitHub 网页上传支持拖入文件夹，会保留文件名里的路径）。
4. 上传完成后同样去 Settings → Pages 选 `main` + `/docs`

> 只上传 `docs/` 一个目录也能跑：此时 Pages 的目录要选 `/ (root)`。
> 两种都行，选一种别混。

### 自定义域名（可选）

仓库 **Settings → Pages → Custom domain** 填你的域名 → 在你的 DNS 里加：
- 子域名（`tools.example.com`）：一条 `CNAME` → `你的用户名.github.io`
- 根域名：四条 `A` 记录 → `185.199.108.153` / `185.199.109.153` / `185.199.110.153` / `185.199.111.153`

勾上 **Enforce HTTPS**（GitHub 会自动签证书，免费）。域名在国内注册且服务器在境外时不需要备案；
但**如果日后换到中国大陆的服务器**，域名就必须 ICP 备案，否则 80/443 会被拦。

---

## 路线 ② 拖拽上传（最省事，不用 git）

| 平台 | 怎么操作 | 得到 |
|---|---|---|
| **Netlify Drop** | 打开 `app.netlify.com/drop`，把 `docs/` 文件夹或 `dist/site.zip` 拖进去 | `随机名.netlify.app` |
| **Cloudflare Pages** | 面板 → Create project → **Direct Upload** → 拖 `docs/` | `项目名.pages.dev` |

两家的免费额度对本项目完全够用（站点只有 400 多 KB，且素材不走你的带宽），也都能绑自己的域名。

---

## 路线 ③ 自己的云服务器 + 自己的域名

```bash
scp -r docs/* user@你的服务器:/var/www/toolbox/
sudo cp deploy/nginx.conf /etc/nginx/conf.d/toolbox.conf   # 改 server_name 与 root 两行
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的域名                            # 免费 HTTPS，自动续期
```

⚠️ **服务器在中国大陆的话**：域名必须完成 **ICP 备案**，否则对外提供网页服务会被拦截；
不想备案就把站放境外（GitHub Pages / Cloudflare Pages 等），或者只监听非标准端口给自己用。

也就是说这一档**技术上可行但最贵**：同样的东西在路线 ① ② 里是免费 + 自动 HTTPS + 全球 CDN。
除非你已经有服务器要放别的东西，否则没必要为这个站单独买。

---

## 路线 ④ 只给自己 / 局域网用（不花一分钱、不需要域名）

```powershell
双击 启动本地站点.cmd   →  回答 y   →  手机浏览器打开 http://192.168.x.x:8137/
```

想让地址固定：在路由器里给这台电脑绑一个静态 IP。
想要好记的名字：在路由器（或 `hosts`）里映射一个本地域名，例如 `toolbox.home` → `192.168.31.207`。

---

## 上线前检查清单

- [ ] **构建产物里没有任何游戏素材**：`node .work/verify/check-offline.js` 全绿；`docs/` 只有 14 个文件、400 多 KB
- [ ] 首页能开、卡片能点进查看器（`siteHome` / `siteViewer` 两个场景已验证 **子路径挂载** 也没问题）
- [ ] 选择游戏文件后能出 **527 个条目**（`liteBoot` 场景已验证）
- [ ] 手机浏览器打开正常、能点（`mobile` / `forgePhone` 场景已在 390×844 下验证 8/8 可点）
- [ ] 手机可「添加到主屏幕」，二次访问断网也能开（根 Service Worker 会缓存首页 + 查看器）
- [ ] 分享链接到聊天软件 → 出现标题、描述和卡片图（需要 `--site-url` 才会带**绝对**图片地址）
- [ ] 「? 帮助 → 关于本站」与启动界面里的非官方声明还在
- [ ] 仓库里**没有** `dist/`、没有 `Balatro素材图鉴.html`、没有 `.work/out/`、没有 `.work/love/`

---

## 版权边界（重要）

| 产物 | 能不能公开 | 理由 |
|---|---|---|
| `docs/`（约 460 KB） | ✅ **只有它能公开** | 纯代码 + 代码画的图标/分享图 |
| `dist/lite`、`dist/site.zip` | ✅ | 同上 |
| `dist/web`（约 3.6 MB） | ❌ | 内含 2 MB 游戏贴图 = 分发游戏资源 |
| `Balatro素材图鉴.html`（4.21 MB） | ❌ | 内含全部素材与数据 |
| `.work/love/`、`.work/out/` | ❌ | 解包出来的游戏工程与解析结果 |

- 站名、图标、分享图都按「非官方粉丝工具」来做（`icon.svg` 与 `og.png` 都是代码画的，没用官方素材），页面上也写明了非官方声明。
- 不要在站名 / 域名 / 图标里使用官方 logo，也不要暗示官方关联。
- 想放到公开站的内容 = **代码**。素材永远由访客本地提供：这既是版权上最干净的做法，也让你的带宽消耗接近 0。
