/* 探针：这个内核的 ImageDecoder 到底能不能拆出多帧？（决定「上传动图」要不要自己解 GIF）
   用法：node .work/probe-gif.js [图片路径] */
'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9334
const GIF = process.argv[2] || 'C:/Users/18878/Desktop/2ab90f8671834c56befd349c4ba69b81.gif'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const b64 = fs.readFileSync(GIF).toString('base64')
  const userDir = path.join(__dirname, 'tmp-probe-chrome')
  const ch = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' })

  let target = null
  for (let i = 0; i < 50 && !target; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json()
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
    } catch (e) { /* 还没起来 */ }
    if (!target) await sleep(400)
  }
  if (!target) { console.error('❌ Chrome 没起来'); process.exit(1) }

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result) }
  }
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })) })

  const page = fs.readFileSync(GIF)
  const script = `(async () => {
    const b64 = '${b64}';
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const out = { bytes: u8.length, hasImageDecoder: typeof ImageDecoder !== 'undefined' };
    const cv = new OffscreenCanvas(4, 4);
    out.offscreen2d = !!cv.getContext('2d');
    out.imageDataCtor = typeof ImageData !== 'undefined';
    if (out.hasImageDecoder) {
      try {
        const dec = new ImageDecoder({ data: u8.buffer, type: 'image/gif' });
        await dec.completed;
        const tr = dec.tracks.selectedTrack;
        out.frameCount = tr ? tr.frameCount : null;
        out.repetition = tr ? tr.repetitionCount : null;
        out.animated = tr ? tr.animated : null;
        const n = Math.min(out.frameCount || 1, 24);
        const frames = [];
        for (let i = 0; i < n; i++) {
          const r = await dec.decode({ frameIndex: i });
          const bmp = r.image;
          const w = bmp.displayWidth || bmp.codedWidth, h = bmp.displayHeight || bmp.codedHeight;
          const c = new OffscreenCanvas(w, h);
          const x = c.getContext('2d');
          x.drawImage(bmp, 0, 0);
          const d = x.getImageData(0, 0, w, h).data;
          let opaque = 0, sum = 0;
          for (let k = 0; k < d.length; k += 4) { if (d[k + 3] > 0) opaque++; sum += d[k] * 3 + d[k + 1] * 5 + d[k + 2] * 7 }
          frames.push({ w: w, h: h, opaque: opaque, sum: sum, dur: bmp.duration });
          bmp.close && bmp.close();
        }
        out.frames = frames;
        out.distinctFrames = new Set(frames.map((f) => f.sum)).size;
      } catch (e) { out.err = String((e && e.message) || e) }
    }
    return JSON.stringify(out);
  })()`

  try {
    await send('Runtime.enable')
    const r = await send('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true })
    const v = r.result && r.result.value
    console.log(v || JSON.stringify(r))
  } finally {
    try { ws.close() } catch (e) {}
    try { ch.kill() } catch (e) {}
  }
})().catch((e) => { console.error('❌ ' + e.message); process.exit(1) })
