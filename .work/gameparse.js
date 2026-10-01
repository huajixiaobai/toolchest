/* ============================================================================
 * gameparse.js — build the viewer's dataset from the user's own copy of the game,
 * inside the page.
 *
 * Two inputs:
 *   · Balatro.exe (or any zip that holds the LÖVE project)   -> parseGameExe(buf)
 *   · an extracted game folder (game.lua + resources/…)      -> parseGameFiles(list)
 *
 * Nothing is uploaded. Only the files the builder actually needs are read:
 * game.lua / globals.lua / challenges.lua / version.jkr, localization/*.lua,
 * resources/textures/**.png and resources/shaders/*.fs.
 *
 * Exposes window.__GAMEPARSE__ = { parseGameExe, parseGameFiles, zipEntries,
 *                                  pngSize, loveRoot, NEEDED }
 * ==========================================================================*/
(function () {
  'use strict'

  const LUA = (typeof window !== 'undefined' && window.__LUA__) || (typeof require !== 'undefined' ? require('./lua') : null)
  const BUILDER = (typeof window !== 'undefined' && window.__DATABUILD__) || (typeof require !== 'undefined' ? require('./databuild') : null)

  /** Only these are read out of the archive; everything else stays untouched. */
  const NEEDED = [
    /^game\.lua$/,
    /^globals\.lua$/,
    /^challenges\.lua$/,
    /^version\.jkr$/,
    /^localization\/[^/]+\.lua$/,
    /^resources\/textures\/.*\.png$/i,
    /^resources\/shaders\/[^/]+\.fs$/,
  ]
  const needed = (p) => NEEDED.some((re) => re.test(p))

  /* ------------------------------------------------------------ deflate */
  async function inflateRaw (u8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('这个浏览器不支持 DecompressionStream，无法解压（请用较新的 Chrome / Edge / Safari）')
    }
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  /* ------------------------------------------------------------ zip */
  /**
   * Read a zip that may be appended to something else (the fused Balatro.exe is a LÖVE
   * runtime with the project zip glued on). Every offset in a zip is relative to the zip
   * itself, so the real position is base + offset, with
   *   base = EOCD position − central-directory size − central-directory offset.
   * For a plain zip that base is 0, so this covers both cases.
   */
  const zipEntries = (buf) => {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
    let eocd = -1
    const lowest = Math.max(0, u8.length - 70000)
    for (let i = u8.length - 22; i >= lowest; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
    }
    if (eocd < 0) throw new Error('这不是一个 zip / 融合 exe（找不到 zip 尾部标记）')
    let count = dv.getUint16(eocd + 10, true)
    let cdOff = dv.getUint32(eocd + 16, true)
    let cdSize = dv.getUint32(eocd + 12, true)
    if (cdOff === 0xffffffff || count === 0xffff || cdSize === 0xffffffff) {
      const loc = eocd - 20
      if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
        const z = Number(dv.getBigUint64(loc + 8, true))
        if (dv.getUint32(z, true) === 0x06064b50) {
          count = Number(dv.getBigUint64(z + 32, true))
          cdSize = Number(dv.getBigUint64(z + 40, true))
          cdOff = Number(dv.getBigUint64(z + 48, true))
        }
      }
    }
    const base = eocd - cdSize - cdOff
    const out = new Map()
    let p = base + cdOff
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break
      const method = dv.getUint16(p + 10, true)
      let csize = dv.getUint32(p + 20, true)
      let usize = dv.getUint32(p + 24, true)
      const nameLen = dv.getUint16(p + 28, true)
      const extraLen = dv.getUint16(p + 30, true)
      const cmtLen = dv.getUint16(p + 32, true)
      let lho = dv.getUint32(p + 42, true)
      const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen))
      if (usize === 0xffffffff || csize === 0xffffffff || lho === 0xffffffff) {
        let e = p + 46 + nameLen
        const end = e + extraLen
        while (e + 4 <= end) {
          const id = dv.getUint16(e, true); const sz = dv.getUint16(e + 2, true)
          if (id === 0x0001) {
            let q = e + 4
            if (usize === 0xffffffff) { usize = Number(dv.getBigUint64(q, true)); q += 8 }
            if (csize === 0xffffffff) { csize = Number(dv.getBigUint64(q, true)); q += 8 }
            if (lho === 0xffffffff) { lho = Number(dv.getBigUint64(q, true)); q += 8 }
            break
          }
          e += 4 + sz
        }
      }
      p += 46 + nameLen + extraLen + cmtLen
      if (name.endsWith('/')) continue
      const lnameLen = dv.getUint16(base + lho + 26, true)
      const lextraLen = dv.getUint16(base + lho + 28, true)
      const start = base + lho + 30 + lnameLen + lextraLen
      out.set(name, { method, start, csize, usize, u8 })
    }
    return out
  }

  /** Inflate one entry, lazily and once. */
  async function entryBytes (ent) {
    if (ent._data) return ent._data
    const raw = ent.u8.subarray(ent.start, ent.start + ent.csize)
    ent._data = ent.method === 0 ? new Uint8Array(raw) : await inflateRaw(raw)
    return ent._data
  }

  /* ------------------------------------------------------------ png size (IHDR only) */
  function pngSize (bytes) {
    if (!bytes || bytes.length < 33) return { width: 0, height: 0 }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (dv.getUint32(0) !== 0x89504e47) return { width: 0, height: 0 }
    // IHDR is always the first chunk: length(4) type(4) width(4) height(4) …
    return { width: dv.getUint32(16), height: dv.getUint32(20) }
  }

  /** The LÖVE project root inside a set of paths: the folder holding game.lua. */
  function loveRoot (paths) {
    const hits = [...paths].filter((p) => p === 'game.lua' || p.endsWith('/game.lua'))
    if (!hits.length) return null
    // shallowest wins (a pack may nest Balatro/ or love/)
    hits.sort((a, b) => a.split('/').length - b.split('/').length)
    return hits[0].replace(/game\.lua$/, '').replace(/\/$/, '')
  }

  /* ------------------------------------------------------------ environment */
  /** Wrap a lazy {path -> bytes} source in the interface databuild.js expects. */
  function makeEnv (source, opts) {
    const { getBytes, names, sourceLabel, now } = opts
    const rel = (p) => (source ? source + '/' + p : p)
    return {
      read: (p) => {
        const b = getBytes(rel(p))
        if (!b) throw new Error('缺少文件：' + p)
        return new TextDecoder('utf-8').decode(b)
      },
      bytes: (p) => getBytes(rel(p)) || null,
      exists: (p) => !!getBytes(rel(p)),
      listTree: (dir) => {
        const pre = rel(dir).replace(/\/$/, '') + '/'
        return names()
          .filter((n) => n.startsWith(pre))
          .map((n) => n.slice(pre.length))
      },
      pngSize,
      textBytes: (s) => new TextEncoder().encode(s).length,
      source: sourceLabel,
      now,
    }
  }

  /* ------------------------------------------------------------ public API */
  /**
   * Parse a fused Balatro.exe (or a plain zip of the project).
   * Every entry is inflated on demand, so a 60 MB exe only materialises what is needed.
   */
  async function parseGameExe (buf, label) {
    const entries = zipEntries(buf)
    const all = [...entries.keys()]
    const root = loveRoot(all)
    const wanted = all.filter((n) => (!root || n.startsWith(root + '/')) && needed(root ? n.slice(root.length + 1) : n))
    const byPath = new Map()
    for (const n of wanted) byPath.set(root ? n.slice(root.length + 1) : n, entries.get(n))
    // Inflate the needed entries up front (about 160 files / a few MB, even out of a 60 MB exe);
    // buildData itself is synchronous.
    const map = new Map()
    await Promise.all([...byPath.entries()].map(async ([p, ent]) => { map.set(p, await entryBytes(ent)) }))
    const env = makeEnv(null, {
      getBytes: (p) => map.get(p) || null,
      names: () => [...map.keys()],
      sourceLabel: label || 'Balatro.exe',
      now: new Date().toISOString(),
    })
    const res = BUILDER.buildData(env)
    return { ...res, root, entries: map.size }
  }

  /**
   * Parse an extracted game folder (the tree that contains game.lua / resources/).
   * \`files\` may be a FileList from <input webkitdirectory> or an array of {path, bytes}.
   */
  async function parseGameFiles (files, label) {
    const list = []
    for (const f of files) {
      const p = (f.__rel || f.webkitRelativePath || f.name || f.path || '').replace(/\\/g, '/')
      if (!p) continue
      list.push({
        path: p,
        get: () => (f.bytes
          ? Promise.resolve(f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes))
          : f.arrayBuffer().then((b) => new Uint8Array(b))),
      })
    }
    const root = loveRoot(list.map((x) => x.path))
    if (root === null) throw new Error('这个文件夹里找不到 game.lua —— 请选择 Balatro 的游戏目录（里面有 game.lua 和 resources/）')
    const map = new Map()
    const jobs = []
    for (const x of list) {
      const rel = x.path.startsWith(root + '/') ? x.path.slice(root.length + 1) : x.path
      if (!needed(rel)) continue
      jobs.push((async () => { map.set(rel, await x.get()) })())
    }
    await Promise.all(jobs)
    const env = makeEnv(null, {
      getBytes: (p) => map.get(p) || null,
      names: () => [...map.keys()],
      sourceLabel: label || (root ? root.split('/').pop() : 'Balatro'),
      now: new Date().toISOString(),
    })
    const res = BUILDER.buildData(env)
    return { ...res, root, entries: map.size }
  }

  const api = { parseGameExe, parseGameFiles, zipEntries, pngSize, loveRoot, NEEDED, needed, inflateRaw, entryBytes }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  if (typeof window !== 'undefined') window.__GAMEPARSE__ = api
})();
