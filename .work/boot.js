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
    const pack = data.pack || []
    window.__BALATRO_DATA__ = data
    window.__BALATRO_ATLAS__ = {}
    for (const p of pack) {
      window.__BALATRO_ATLAS__[p.file] = URL.createObjectURL(new Blob([bin.subarray(p.off, p.off + p.len)], { type: 'image/png' }))
    }
    progress(96, STATUS.app)
    await loadApp()
    const root = document.getElementById('boot')
    if (root) root.style.display = 'none'
    return true
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (window.__BALATRO_DATA__) return   // single-file build: the app boots by itself
    build()
    if (window.__PACK__) tryLocalPack().catch((e) => { console.warn(e); setStatus('bad', String(e.message || e)) })
  })

})();
