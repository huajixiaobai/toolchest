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
    acts.appendChild(swap); acts.appendChild(drop2)
    bar.appendChild(txt); bar.appendChild(acts)
    document.body.appendChild(bar)
    swap.onclick = async () => { await cacheDrop(); location.reload() }
    drop2.onclick = async () => { await cacheDrop(); bar.remove(); }
  }

  function build () {
    const root = document.getElementById('boot')
    root.innerHTML = ''

    const card = el('div', 'bootcard')
    card.appendChild(el('h1', null, 'Balatro 素材图鉴'))
    card.appendChild(el('p', 'lead', '这是一个纯代码的浏览器工具：把游戏里的美术素材与数据解出来，做成可检索、可预览、可导出的图鉴。'))
    card.appendChild(el('p', 'lead strong', '网站本身不包含任何游戏素材 —— 请选择你自己电脑上的 Balatro 游戏文件，解析全部在这个页面里完成，不会上传任何东西。'))

    const buttons = el('div', 'bootbtns')
    const bExe = el('button', 'btn primary', '选择 Balatro.exe')
    const bDir = el('button', 'btn', '选择游戏文件夹')
    buttons.appendChild(bExe); buttons.appendChild(bDir)
    card.appendChild(buttons)

    /* 就放在按钮下面：说清"为什么要你自己选文件"，而不是让人以为这站少做了功能 */
    card.appendChild(el('p', 'bootdisc',
      '为什么要你自己选文件？因为游戏素材的版权不属于本站，这里不能替你分发 —— ' +
      '页面只是把你自己那份游戏里的内容读出来给你看。全程在本地完成，不上传任何数据；' +
      '选过一次之后本站会记住它（存在你自己的浏览器里），下次打开直接就是图鉴。'))

    const inExe = el('input'); inExe.type = 'file'; inExe.accept = '.exe,.zip,application/octet-stream'; inExe.style.display = 'none'
    const inDir = el('input'); inDir.type = 'file'; inDir.multiple = true; inDir.style.display = 'none'
    if ('webkitdirectory' in inDir) { inDir.webkitdirectory = true; inDir.setAttribute('webkitdirectory', '') } else { bDir.disabled = true; bDir.title = '这个浏览器不支持选文件夹，请用 exe 或直接拖进来' }
    card.appendChild(inExe); card.appendChild(inDir)

    const drop = el('div', 'bootdrop')
    drop.appendChild(el('div', 'big', '⬇'))
    drop.appendChild(el('div', null, '也可以把 Balatro.exe / 游戏文件夹 / 已经解好的 .zip 拖到这里'))
    card.appendChild(drop)

    /* 触屏上没有拖放这回事：手机显示这段能真正照做的提示（CSS 按 hover 能力二选一） */
    const tap = el('div', 'boottap')
    tap.appendChild(el('div', null, '点上面的按钮选择文件。'))
    tap.appendChild(el('div', null, '手机上「选择游戏文件夹」最省事；如果系统不让选文件夹，就把游戏目录压成一个 .zip 再选。'))
    card.appendChild(tap)

    const notes = el('ul', 'bootnotes')
    for (const t of [
      '支持的输入：Balatro.exe（融合了 LÖVE 工程的那个 exe）、游戏文件夹（里面有 game.lua 与 resources/）、或者它们的 zip。',
      '外层是 .7z 的话浏览器解不了（需要 LZMA），请先解压，或者直接给 Balatro.exe。',
      '想看 mod 内容？启动后在左侧「导入 Mod」里拖入 mod 的文件夹或 zip，同样不上传。',
      '解析结果只存在这个页面里，刷新就没了；想离线长期使用可以下载单文件版。',
      '本站是非官方粉丝工具，与 LocalThunk / Playstack 没有任何关联；游戏素材与数据的版权归原作者所有。',
    ]) notes.appendChild(el('li', null, t))
    card.appendChild(notes)

    card.appendChild(el('div', 'bootstatus')).style.display = 'none'

    root.appendChild(card)

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

    bExe.onclick = () => inExe.click()
    bDir.onclick = () => inDir.click()
    inExe.onchange = () => { const f = inExe.files[0]; inExe.value = ''; if (f) run('exe', f) }
    inDir.onchange = () => { const f = Array.from(inDir.files); inDir.value = ''; if (f.length) run('dir', f) }

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
