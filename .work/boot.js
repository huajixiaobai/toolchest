/* ============================================================================
 * boot.js — the "bring your own game" start screen used by the web build.
 *
 * The published site contains no game assets. On first visit this asks for the
 * user's own Balatro files, parses them entirely in the page (gameparse.js), and
 * only then loads the viewer. Nothing is uploaded; everything stays in memory.
 *
 * Requires window.__LUA__, window.__DATABUILD__, window.__GAMEPARSE__.
 * ==========================================================================*/
(function () {
  'use strict'

  const el = (tag, cls, text) => {
    const e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined) e.textContent = text
    return e
  }
  const MB = (n) => (n / 1048576).toFixed(1) + ' MB'

  /** Walk a dropped directory entry, tagging every File with its relative path. */
  function filesFromEntry (entry, out, prefix) {
    return new Promise((resolve) => {
      if (!entry) return resolve()
      if (entry.isFile) {
        entry.file((f) => {
          try { Object.defineProperty(f, '__rel', { value: (prefix || '') + f.name, configurable: true }) } catch (e) { /* ignore */ }
          out.push(f); resolve()
        }, () => resolve())
        return
      }
      if (!entry.isDirectory) return resolve()
      const reader = entry.createReader()
      const acc = []
      const next = () => reader.readEntries((ents) => {
        if (!ents.length) {
          Promise.all(acc.map((en) => filesFromEntry(en, out, (prefix || '') + entry.name + '/'))).then(() => resolve())
          return
        }
        for (const en of ents) acc.push(en)
        next()
      }, () => resolve())
      next()
    })
  }
  async function filesFromDrop (dt) {
    const out = []
    const items = dt && dt.items ? Array.from(dt.items) : []
    const entries = []
    for (const it of items) if (it.kind === 'file' && typeof it.webkitGetAsEntry === 'function') { const en = it.webkitGetAsEntry(); if (en) entries.push(en) }
    if (entries.length) { await Promise.all(entries.map((en) => filesFromEntry(en, out, ''))); if (out.length) return out }
    return Array.from((dt && dt.files) || [])
  }

  /** The status box lives in the start screen; these work before/after it exists. */
  function statusBox () {
    const root = document.getElementById('boot')
    if (!root) return null
    let box = root.querySelector('.bootstatus')
    if (!box) {
      const card = root.querySelector('.bootcard')
      if (!card) return null
      box = el('div', 'bootstatus')
      box.style.display = 'none'
      card.appendChild(box)
    }
    return box
  }
  function setStatus (kind, text) {
    const box = statusBox()
    if (!box) return
    box.style.display = 'block'
    box.className = 'bootstatus ' + kind
    box.textContent = text
  }
  function progress (pct, text) {
    const box = statusBox()
    if (!box) return
    box.style.display = 'block'
    box.className = 'bootstatus busy'
    box.innerHTML = ''
    const t = el('div', null, text)
    const bar = el('div', 'bootbar')
    const fill = el('div', 'bootfill')
    fill.style.width = Math.max(2, Math.min(100, pct)) + '%'
    bar.appendChild(fill)
    box.appendChild(t); box.appendChild(bar)
  }

  const STATUS = {
    read: '正在读取文件…',
    unzip: '正在解压 LÖVE 包…',
    build: '正在解析游戏数据（game.lua / 贴图 / 着色器）…',
    pack: '正在准备贴图…',
    app: '正在启动查看器…',
  }

  /* ------------------------------------------------------------------ 记住上次
   * 访客第一次选完游戏文件后，把解析结果存进**他自己浏览器**的 IndexedDB。下次打开
   * 这个站点就直接进图鉴，不用再选一次 —— 素材始终没离开过他的设备，也不算本站分发。
   * 隐私模式 / 配额不足时所有失败都被吞掉，功能照常（只是不会记得）。 */
  const DB_NAME = 'balatro-local-cache'
  const STORE = 'parsed'
  const KEY = 'last'
  function idbOpen () {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('no indexedDB'))
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => { try { req.result.createObjectStore(STORE) } catch (e) { /* ignore */ } }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error || new Error('indexedDB open failed'))
    })
  }
  async function cachePut (rec) {
    const db = await idbOpen()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(rec, KEY)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  }
  async function cacheGet () {
    const db = await idbOpen()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const g = tx.objectStore(STORE).get(KEY)
      g.onsuccess = () => resolve(g.result || null)
      g.onerror = () => reject(g.error)
    })
  }
  async function cacheDrop () {
    try {
      const db = await idbOpen()
      await new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch (e) { /* ignore */ }
  }

  /** Turn {data, atlas bytes} into the globals the viewer expects. Shared by the
   *  self-hosted pack, the "remembered" cache and (indirectly) the parse path. */
  function applyPack (data, bin) {
    window.__BALATRO_DATA__ = data
    window.__BALATRO_ATLAS__ = {}
    for (const p of data.pack || []) {
      window.__BALATRO_ATLAS__[p.file] = URL.createObjectURL(new Blob([bin.subarray(p.off, p.off + p.len)], { type: 'image/png' }))
    }
  }

  /** A slim bar that says "this came from your own browser", plus a way out. */
  function showCacheBar (meta) {
    const bar = el('div', 'bootcache')
    const txt = el('div', 'bootcachetext')
    txt.appendChild(el('b', null, '已载入上次解析的素材'))
    txt.appendChild(el('span', null, '（' + (meta && meta.version ? meta.version : '?') + ' · ' + (meta && meta.items ? meta.items : '?') + ' 个条目 · 存在你自己的浏览器里，没有上传）'))
    const acts = el('div', 'bootcacheacts')
    const swap = el('button', 'btn', '换一个游戏文件')
    const drop2 = el('button', 'btn', '清除已存素材')
    const close = el('button', 'bootcachex', '✕')
    close.title = '收起这条提示（素材还留着，下次照旧）'
    close.setAttribute('aria-label', '关闭')
    close.style.cssText = 'background:none;border:0;color:#cfd8de;font-size:15px;line-height:1;padding:6px 8px;cursor:pointer;border-radius:6px'
    acts.appendChild(swap); acts.appendChild(drop2); acts.appendChild(close)
    bar.appendChild(txt); bar.appendChild(acts)
    document.body.appendChild(bar)
    swap.onclick = async () => { await cacheDrop(); location.reload() }
    drop2.onclick = async () => { await cacheDrop(); bar.remove(); }
    /* 自己也会收起：20 秒后淡出；鼠标停在上面就先不计时（正在看的时候别抢走） */
    const hide = () => { bar.classList.add('gone'); setTimeout(() => bar.remove(), 260) }
    let hideTimer = setTimeout(hide, 20000)
    bar.addEventListener('mouseenter', () => clearTimeout(hideTimer))
    bar.addEventListener('mouseleave', () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 6000) })
    close.onclick = () => { clearTimeout(hideTimer); hide() }
  }

  /* ------------------------------------------------------------------ 预览区的互动
   * 三件小事，全部不需要任何图片或库：换卡面样式的胶囊、真的下载一张代码画的 PNG、
   * 以及一块 canvas（图集切分 + 逐帧 + 循环点）。 */
  function startDemo () {
    const chips = document.getElementById('dForgeChips')
    const forgeCard = document.getElementById('dForgeCard')
    if (chips && forgeCard) {
      chips.addEventListener('click', (e) => {
        const b = e.target.closest('button')
        if (!b) return
        for (const x of chips.querySelectorAll('button')) x.classList.remove('on')
        b.classList.add('on')
        forgeCard.className = 'dcard' + (b.dataset.v ? ' ' + b.dataset.v : '')
      })
    }

    const dl = document.getElementById('dDlPng')
    const note = document.getElementById('dDlNote')
    if (dl) {
      dl.addEventListener('click', () => {
        const S = 4, W = 71 * S, H = 95 * S
        const cv = document.createElement('canvas')
        cv.width = W; cv.height = H
        const g = cv.getContext('2d')
        const grd = g.createLinearGradient(0, 0, W, H)
        grd.addColorStop(0, '#2a3a48'); grd.addColorStop(1, '#141c24')
        g.fillStyle = grd; g.fillRect(0, 0, W, H)
        g.strokeStyle = '#4bc292'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6)
        g.textAlign = 'center'; g.fillStyle = '#4bc292'
        g.font = 'bold ' + (10 * S) + 'px sans-serif'
        g.fillText('DEMO', W / 2, H / 2 - 6 * S)
        g.font = (7 * S) + 'px sans-serif'; g.fillStyle = '#9fb0c0'
        g.fillText('code-drawn', W / 2, H / 2 + 8 * S)
        g.fillText(W + 'x' + H, W / 2, H / 2 + 20 * S)
        const a = document.createElement('a')
        a.href = cv.toDataURL('image/png')
        a.download = 'toolchest-demo-' + W + 'x' + H + '.png'
        a.click()
        if (note) note.textContent = '已下载一张 ' + W + '×' + H + ' 的示例 PNG（真实导出还有 1x/2x/4x/6x 与透明背景）'
      })
    }

    const c = document.getElementById('dCanvas')
    if (!c || !c.getContext) return
    const ctx = c.getContext('2d')
    const FRAMES = 21, LOOP_AT = 12
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    /* 画布按**实际显示宽度**来画（不是画在 900px 里再被缩小 —— 那样字和线会一起糊掉）。
       三档布局：窄屏（手机）竖排、中屏并排、宽屏完整 21 帧。 */
    let W = 900, H = 240, narrow = false, mid = false
    const fit = () => {
      /* 用 getBoundingClientRect 的**小数**宽度（clientWidth 是取整的，会差出 1px 的缩放） */
      const rect = c.getBoundingClientRect()
      const cssW = Math.max(260, Math.round((rect.width || c.clientWidth || 900) * 100) / 100)
      narrow = cssW < 420
      mid = !narrow && cssW < 700
      W = cssW
      H = narrow ? 352 : 244
      c.width = Math.round(W * DPR)
      c.height = Math.round(H * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    const draw = (now) => {
      const t = (now - t0) / 1000
      ctx.clearRect(0, 0, W, H)
      ctx.textAlign = 'left'

      /* ---- 左：图集，逐格高亮 + 取出这一格 ---- */
      const PAD = narrow ? 12 : 14
      const GAP = narrow ? 6 : 5
      const COLS = narrow ? 3 : 5, ROWS = 4
      const gridW = narrow ? W * 0.46 : Math.min(W * 0.34, 172)
      const CELL = Math.max(18, Math.floor((gridW - (COLS - 1) * GAP) / COLS))
      const gw = COLS * CELL + (COLS - 1) * GAP
      const gh = ROWS * CELL + (ROWS - 1) * GAP
      const ox = PAD, oy = 34
      const idx = Math.floor(t * 1.6) % (COLS * ROWS)

      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#7d8d9d'
      ctx.fillText(narrow ? '图集（贴图按格子切开）' : '图集（贴图）', ox, 20)

      for (let i = 0; i < COLS * ROWS; i++) {
        const cx = ox + (i % COLS) * (CELL + GAP)
        const cy = oy + Math.floor(i / COLS) * (CELL + GAP)
        const hot = i === idx
        ctx.fillStyle = hot ? '#1d3b34' : '#1b242e'
        ctx.strokeStyle = hot ? '#4bc292' : '#2f3d4a'
        ctx.lineWidth = hot ? 2 : 1
        roundRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1, 4); ctx.fill(); ctx.stroke()
      }

      /* ---- 中：把这一格"取出来"放大成一张卡 ---- */
      const cardW = narrow ? 58 : 64, cardH = narrow ? 78 : 86
      const dx = ox + gw + (narrow ? 26 : 34)
      const dy = oy + Math.max(0, (gh - cardH) / 2)
      if (dx + cardW <= W - PAD) {
        ctx.strokeStyle = '#33414f'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(ox + gw + 6, oy + gh / 2)
        ctx.lineTo(dx - 6, oy + gh / 2)
        ctx.stroke()
        ctx.fillStyle = '#1b242e'; ctx.strokeStyle = '#4bc292'; ctx.lineWidth = 2
        roundRect(dx, dy, cardW, cardH, 7); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#4bc292'
        ctx.fillRect(dx + 9, dy + 11, cardW - 18, 3)
        ctx.fillRect(dx + 9, dy + 21, cardW - 26, 3)
        ctx.fillStyle = '#33414f'
        ctx.fillRect(dx + 9, dy + cardH - 18, cardW - 18, 9)
        ctx.fillStyle = '#7d8d9d'
        ctx.font = '10px sans-serif'
        ctx.fillText('取出这一格', dx, dy + cardH + 13)
      }

      /* ---- 右/下：21 帧动画条，播放头 + 循环点按比例摆放（所以永远放得下）---- */
      const stripTop = narrow ? oy + gh + 46 : oy
      const stripLeft = narrow ? PAD : dx + cardW + 30
      const stripW = W - stripLeft - PAD
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#7d8d9d'
      ctx.fillText(narrow ? '盲注动画 21 帧 · 黄线 = 自动找到的循环点' : '盲注动画（21 帧）· 循环点标在接缝最小处', stripLeft, stripTop - 14)

      const fh = narrow ? 52 : 62
      const n = Math.max(6, Math.min(FRAMES, Math.floor((stripW + 3) / (narrow ? 22 : 17))))
      const fw = (stripW - (n - 1) * 3) / n
      const play = Math.floor(t * 9) % FRAMES
      const posOf = (f) => stripLeft + (f / (FRAMES - 1)) * (stripW - fw)
      for (let k = 0; k < n; k++) {
        const f = Math.round(k * (FRAMES - 1) / (n - 1))
        const fx = posOf(f)
        const on = f === play
        const isLoop = f === LOOP_AT
        ctx.fillStyle = on ? '#1d3b34' : '#1b242e'
        ctx.strokeStyle = on ? '#4bc292' : (isLoop ? '#f3b958' : '#2f3d4a')
        ctx.lineWidth = isLoop ? 2 : 1
        roundRect(fx + 0.5, stripTop + 0.5, fw - 1, fh - 1, 3); ctx.fill(); ctx.stroke()
        ctx.fillStyle = on ? '#4bc292' : '#38485a'
        const barH = 6 + ((f * 7) % (fh - 18))
        ctx.fillRect(fx + 3, stripTop + fh - 5 - barH, Math.max(2, fw - 6), barH)
      }
      /* 循环点：黄线钉在那一帧上 */
      const loopX = posOf(LOOP_AT) + fw / 2
      ctx.fillStyle = '#f3b958'
      ctx.fillRect(loopX - fw / 2, stripTop - 6, Math.max(3, fw), 2)
      ctx.font = '10px sans-serif'
      ctx.fillText('循环', Math.min(loopX - 10, W - PAD - 24), stripTop + fh + 14)
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#7d8d9d'
      ctx.fillText('当前帧 ' + (play + 1) + ' / ' + FRAMES, stripLeft + stripW - 78, stripTop + fh + 14)
    }

    fit()
    /* 宽度一变就重算，保证 backing 与显示尺寸的比值恰好等于 DPR（否则字会糊）。
       用 ResizeObserver 而不是 window.resize：卡片宽度是布局决定的，不一定跟窗口同步。 */
    if (window.ResizeObserver) {
      let last = c.getBoundingClientRect().width
      new ResizeObserver(() => {
        const w = c.getBoundingClientRect().width
        if (Math.abs(w - last) < 0.5) return
        last = w
        fit()
        if (still) draw(performance.now())
      }).observe(c)
    }
    if (still) draw(t0 + 1200)
    else {
      const tick = (now) => { draw(now); requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    }
  }

  function build () {
    const root = document.getElementById('boot')
    root.innerHTML = ''

    const card = el('div', 'bootcard')
    card.appendChild(el('h1', null, 'Balatro 素材图鉴'))
    card.appendChild(el('p', 'lead', '这是一个纯代码的浏览器工具：把游戏里的美术素材与数据解出来，做成可检索、可预览、可导出的图鉴。'))
    card.appendChild(el('p', 'lead strong', '网站本身不包含任何游戏素材 —— 请选择你自己电脑上的 Balatro 游戏文件，解析全部在这个页面里完成，不会上传任何东西。'))

    /* 宽屏左右分栏：左＝导入（主操作），右＝预览（它能做什么）。
       DOM 顺序是导入在前，所以窄屏叠成一列时导入自然在上面。 */
    const cols = el('div', 'bootcols')
    const imp = el('div', 'bootimp')
    const prev = el('div', 'bootprev')
    cols.appendChild(imp); cols.appendChild(prev)
    card.appendChild(cols)

    const buttons = el('div', 'bootbtns')
    /* 用 <label for> 包成按钮：手机上是"原生"触发选择器，比 JS 调 .click() 稳得多 */
    const bExe = el('label', 'btn primary', '选择 Balatro.exe')
    bExe.setAttribute('for', 'bootFileExe')
    const bDir = el('label', 'btn', '选择游戏文件夹')
    bDir.setAttribute('for', 'bootFileDir')
    buttons.appendChild(bExe); buttons.appendChild(bDir)
    imp.appendChild(buttons)

    /* 就放在按钮下面：说清"为什么要你自己选文件"，而不是让人以为这站少做了功能 */
    imp.appendChild(el('p', 'bootdisc',
      '为什么要你自己选文件？因为游戏素材的版权不属于本站，这里不能替你分发 —— ' +
      '页面只是把你自己那份游戏里的内容读出来给你看。全程在本地完成，不上传任何数据；' +
      '选过一次之后本站会记住它（存在你自己的浏览器里），下次打开直接就是图鉴。'))

    /* 关键：**不能** display:none —— iOS/Safari 和部分安卓浏览器对不可见的 file input
       调 .click()（或点绑定的 label）时不会打开选择器，表现就是"点了没反应"。
       放到屏幕外但保持可见即可。另外**不要**写 accept：安卓的文件选择器会把不认识的
       .exe 变灰、点不动（这正是"点某个文件夹里的 exe 没反应"的另一个原因）。 */
    const inExe = el('input', 'bootfile'); inExe.type = 'file'; inExe.id = 'bootFileExe'
    const inDir = el('input', 'bootfile'); inDir.type = 'file'; inDir.id = 'bootFileDir'; inDir.multiple = true
    if ('webkitdirectory' in inDir) { inDir.webkitdirectory = true; inDir.setAttribute('webkitdirectory', '') } else { bDir.classList.add('off'); bDir.title = '这个浏览器不支持选文件夹，请用 exe，或先把游戏目录压成 zip' }
    imp.appendChild(inExe); imp.appendChild(inDir)

    const drop = el('div', 'bootdrop')
    drop.appendChild(el('div', 'big', '⬇'))
    drop.appendChild(el('div', null, '也可以把 Balatro.exe / 游戏文件夹 / 已经解好的 .zip 拖到这里'))
    imp.appendChild(drop)

    /* 触屏上没有拖放这回事：手机显示这段能真正照做的提示（CSS 按 hover 能力二选一） */
    const tap = el('div', 'boottap')
    tap.appendChild(el('div', null, '点上面的按钮选择文件。'))
    tap.appendChild(el('div', null, '手机上「选择游戏文件夹」最省事；如果系统不让选文件夹，就把游戏目录压成一个 .zip 再选。'))
    tap.appendChild(el('div', null, '如果点了按钮没反应：把系统文件列表右上角的类型切成「所有文件」—— 安卓默认会把 .exe 当成未知类型藏起来。'))
    imp.appendChild(tap)

    /* 进度/错误提示放在按钮下方，解析时一定看得见 */
    const status = el('div', 'bootstatus')
    status.style.display = 'none'
    imp.appendChild(status)

    /* 先检查这台设备到底能不能解压：不支持就当场说清楚，别等选完文件才失败 */
    if (typeof DecompressionStream === 'undefined' || typeof File === 'undefined' || !File.prototype.arrayBuffer) {
      const warn = el('div', 'bootwarn',
        '⚠️ 这个浏览器缺少解压能力（DecompressionStream），选了游戏文件也解不开。' +
        '请换成较新的 Chrome / Edge / Safari（iOS 16.4+）打开本站，在电脑上则可以用自带的 local/ 版。')
      imp.appendChild(warn)
      bExe.classList.add('off'); bDir.classList.add('off')
    }

    /* ------------------------------------------------------------------ 预览区（右栏）
     * 「它能做什么」属于这个工具自己：桌面分栏时它在导入右侧，窄屏时堆在导入下面。
     * 全部由代码绘制，不含任何游戏素材。 */
    const demo = el('div', 'bootdemo')
    demo.innerHTML =
      '<h2 class="demohead">它能做什么</h2>' +
      '<div class="demo">' +
        '<div class="dcell"><div class="dhead"><span class="dtag">1</span> 图鉴与搜索</div>' +
          '<div class="dscreen"><div class="dsbar"><span class="dsq"></span>' +
          '<span class="dsc">527 个条目 · 27 个分类 · 5 种语言</span></div>' +
          '<div class="dgrid">' +
          Array.from({ length: 18 }, (_, i) => '<div class="dtile' + (i === 7 ? ' hot' : '') + '"></div>').join('') +
          '</div></div>' +
          '<p>按分类浏览，按 ID / 名称 / 描述 / 数值 / 图集坐标搜索；<code>cat:Joker rarity:1 cost&gt;=4</code> 这种字段筛选也能用。</p></div>' +

        '<div class="dcell"><div class="dhead"><span class="dtag">2</span> 卡牌合成台（可以点）</div>' +
          '<div class="dscreen dforge"><div class="dcard" id="dForgeCard"></div>' +
          '<div class="dchips" id="dForgeChips">' +
          '<button data-v="" class="on">不叠加</button><button data-v="foil">闪箔</button>' +
          '<button data-v="holo">镭射</button><button data-v="poly">多彩</button><button data-v="neg">负片</button>' +
          '</div></div>' +
          '<p>选一张牌，叠加强化 / 蜡封 / 贴纸 / 版本。版本特效是<b>游戏自己的 GLSL</b> 在浏览器里跑，不是画的假效果。</p></div>' +

        '<div class="dcell"><div class="dhead"><span class="dtag">3</span> 导出（PNG 可以点）</div>' +
          '<div class="dscreen dexport">' +
          '<button class="live" id="dDlPng">PNG</button><button>SVG</button><button>ZIP</button>' +
          '<button>JSON</button><button>CSV</button><button>GIF / APNG</button>' +
          '<div class="dnote" id="dDlNote">点一下 PNG：会下载一张由代码画出来的示例</div></div>' +
          '<p>单张导出 PNG（1x–6x，透明背景）/ SVG / ZIP / JSON / CSV / Markdown；盲注动画还能导出 GIF、APNG、帧序列。</p></div>' +

        '<div class="dcell wide"><div class="dhead"><span class="dtag">4</span> 图集切分 · 逐帧动画 · 自动找循环点</div>' +
          '<canvas id="dCanvas" width="900" height="230" role="img" aria-label="图集切分与逐帧动画的示意"></canvas>' +
          '<p>左边：一张图集被切成格子，逐格取出（真实数据是 68 张贴图 / 69 个图集）。' +
          '右边：21 帧的盲注动画循环播放，程序会算出「接缝最小」的那一帧当循环点，导出的动图才不会跳。</p></div>' +
      '</div>' +
      '<div class="dfoot">上面全是<b>代码画的示意</b>（这个站里没有任何游戏素材）；真实内容来自你自己电脑上的那份游戏文件。</div>'
    prev.appendChild(demo)

    const notes = el('ul', 'bootnotes')
    for (const t of [
      '支持的输入：Balatro.exe（融合了 LÖVE 工程的那个 exe）、游戏文件夹（里面有 game.lua 与 resources/）、或者它们的 zip。',
      '外层是 .7z 的话浏览器解不了（需要 LZMA），请先解压，或者直接给 Balatro.exe。',
      '想看 mod 内容？启动后在左侧「导入 Mod」里拖入 mod 的文件夹或 zip，同样不上传。',
      '解析结果只存在这个页面里，刷新就没了；想离线长期使用可以下载单文件版。',
      '本站是非官方粉丝工具，与 LocalThunk / Playstack 没有任何关联；游戏素材与数据的版权归原作者所有。',
    ]) notes.appendChild(el('li', null, t))
    imp.appendChild(notes)

    root.appendChild(card)
    /* 预览区的互动必须在卡片**进入文档之后**再接：startDemo 里用 getElementById 找
       胶囊和 canvas，游离的子树里是找不到的（这个坑踩过一次）。 */
    startDemo()

    let busy = false
    async function run (kind, payload) {
      if (busy) return
      busy = true
      bExe.disabled = true; bDir.disabled = true
      try {
        progress(8, STATUS.read)
        let res
        if (kind === 'exe') {
          const f = payload
          if (f.size > 400 * 1048576) throw new Error('文件太大（' + MB(f.size) + '），Balatro.exe 一般不超过 100 MB')
          progress(20, STATUS.read + ' ' + MB(f.size))
          const buf = await f.arrayBuffer()
          progress(45, STATUS.unzip)
          res = await window.__GAMEPARSE__.parseGameExe(buf, f.name)
        } else {
          progress(25, STATUS.read + ' ' + payload.length + ' 个文件')
          res = await window.__GAMEPARSE__.parseGameFiles(payload, kind)
        }
        progress(72, STATUS.build + ' 条目 ' + res.stats.items)
        progress(88, STATUS.pack + ' ' + res.textures.length + ' 张贴图')
        await useGameFonts(res)
        window.__BALATRO_DATA__ = res.data
        window.__BALATRO_ATLAS__ = {}
        for (const t of res.textures) {
          window.__BALATRO_ATLAS__[t.file] = URL.createObjectURL(new Blob([t.bytes], { type: 'image/png' }))
        }
        window.__SOURCE_NOTE__ = { source: res.data.meta.source, version: res.data.meta.version, root: res.root, warnings: res.warnings }
        /* 顺手记下来：下次打开本站就不用再选一次文件了（存在访客自己的浏览器里） */
        try {
          const total = res.textures.reduce((a, t) => a + t.bytes.length, 0)
          const bin = new Uint8Array(total)
          const pack = []
          let off = 0
          for (const t of res.textures) { bin.set(t.bytes, off); pack.push({ file: t.file, off, len: t.bytes.length }); off += t.bytes.length }
          const rec = {
            v: 1,
            data: Object.assign({}, res.data, { pack }),
            bin: bin.buffer,
            meta: { version: res.data.meta.version, source: res.data.meta.source, items: res.stats.items, savedAt: Date.now() },
          }
          await cachePut(rec)
        } catch (e) { /* 隐私模式 / 配额不足：不记就是了，不影响使用 */ }
        progress(96, STATUS.app)
        await loadApp()
        root.style.display = 'none'
      } catch (e) {
        busy = false
        bExe.disabled = false; bDir.disabled = false
        setStatus('bad', '解析失败：' + (e && e.message ? e.message : e))
        console.error(e)
      }
    }

    /* label 已经会原生触发，这里只在"点了没反应"时兜底（有些内嵌浏览器不吃 label） */
    bExe.onclick = (e) => { if (!inExe.files || !inExe.files.length) { /* 交给 label 的原生行为 */ } }
    inExe.onchange = () => {
      const f = inExe.files && inExe.files[0]
      inExe.value = ''
      if (!f) { setStatus('bad', '没有选到文件。如果系统的文件列表里 exe 是灰的，把文件类型切成「所有文件」再试，或者改用手机上的「文件」App 里的 Balatro.exe。'); return }
      setStatus('', '已选：' + f.name + '（' + MB(f.size) + '），正在读取…')
      run('exe', f)
    }
    inDir.onchange = () => {
      const f = Array.from(inDir.files || [])
      inDir.value = ''
      if (!f.length) { setStatus('bad', '没有选到文件。有的手机不让选文件夹，可以先把游戏目录压成一个 .zip 再选。'); return }
      run('dir', f)
    }

    for (const ev of ['dragenter', 'dragover']) window.addEventListener(ev, (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return
      e.preventDefault(); drop.classList.add('over')
    })
    for (const ev of ['dragleave', 'dragend']) window.addEventListener(ev, () => drop.classList.remove('over'))
    window.addEventListener('drop', (e) => {
      if (!e.dataTransfer) return
      e.preventDefault(); drop.classList.remove('over')
      filesFromDrop(e.dataTransfer).then((files) => {
        if (!files.length) return setStatus('bad', '没有读到文件')
        const one = files[0]
        const name = one.__rel || one.name || ''
        if (files.length === 1 && /\.(exe|zip)$/i.test(name)) run('exe', one)
        else run('dir', files)
      })
    })
  }

  /** 把访客游戏文件里的字体注册进来 —— 界面用游戏自己的像素字体才像原版。
   *  公开站不内嵌这个字体（属于游戏素材），所以从访客自己的文件里读。 */
  async function useGameFonts (res) {
    try {
      if (!res || !res.fonts || !res.fonts.length || typeof FontFace === 'undefined') return null
      const want = res.fonts.find((f) => /m6x11/i.test(f.file)) || res.fonts[0]
      if (!want) return null
      const bytes = want.bytes
      /* 和 fontcss.js 里内嵌版的 @font-face 描述符保持一致（weight 700），
         这样「内嵌字体的自用版」和「从访客文件读字体的公开版」排版一模一样。 */
      const face = new FontFace('BalatroPixel',
        bytes.buffer ? bytes.buffer.slice(bytes.byteOffset || 0, (bytes.byteOffset || 0) + bytes.byteLength) : bytes,
        { weight: '700', style: 'normal' })
      await face.load()
      document.fonts.add(face)
      document.documentElement.style.setProperty('--pix', 'BalatroPixel,"Cascadia Mono",Consolas,monospace')
      console.log('[Balatro 素材图鉴] 已启用游戏自带字体：' + want.file)
      return want.file
    } catch (e) { console.warn('字体注册失败（界面退回等宽字体）：', e); return null }
  }

  /** Load the viewer script (once) and let the app boot itself. */
  let appPromise = null
  function loadApp () {
    if (appPromise) return appPromise
    appPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = (window.__APP_SRC__ || 'app.js')
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('无法加载查看器脚本 ' + s.src))
      document.head.appendChild(s)
    })
    return appPromise
  }

  /** A pre-packed copy of the assets on the same server (self-hosted variant). */
  async function tryLocalPack () {
    const base = window.__PACK__ || null
    if (!base) return false
    progress(10, '正在读取本站预置素材…')
    const [dataRes, binRes] = await Promise.all([fetch(base + 'data.json'), fetch(base + 'atlas.bin')])
    if (!dataRes.ok || !binRes.ok) throw new Error('预置素材不可用（HTTP ' + dataRes.status + '/' + binRes.status + '）')
    const data = await dataRes.json()
    const bin = new Uint8Array(await binRes.arrayBuffer())
    // atlas.bin = concatenated PNGs; the index in data.pack says where each one starts
    applyPack(data, bin)
    progress(96, STATUS.app)
    await loadApp()
    const root = document.getElementById('boot')
    if (root) root.style.display = 'none'
    return true
  }

  /** Same thing, but the bytes come from this browser's own IndexedDB. */
  async function tryRemembered () {
    const rec = await cacheGet()
    if (!rec || !rec.data || !rec.bin || !rec.data.pack) return false
    progress(12, '正在读取上次解析的素材…')
    applyPack(rec.data, new Uint8Array(rec.bin))
    window.__SOURCE_NOTE__ = { source: (rec.meta && rec.meta.source) || '上次选择的游戏文件', version: (rec.meta && rec.meta.version) || '', root: '', warnings: [] }
    progress(96, STATUS.app)
    await loadApp()
    const root = document.getElementById('boot')
    if (root) root.style.display = 'none'
    showCacheBar(rec.meta || {})
    return true
  }

  window.addEventListener('DOMContentLoaded', async () => {
    if (window.__BALATRO_DATA__) return   // single-file build: the app boots by itself
    build()
    if (window.__PACK__) {
      tryLocalPack().catch((e) => { console.warn(e); setStatus('bad', String(e.message || e)) })
      return
    }
    /* 上次在这个浏览器里解析过 → 直接进图鉴，不再让你选一次 */
    try {
      if (await tryRemembered()) return
    } catch (e) { console.warn('记住的素材不可用，改为重新选择文件：', e) }
  })

})();
