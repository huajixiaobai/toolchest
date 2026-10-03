/* 探针：toBlob 到底在哪一步不回来（帧条导出卡死的嫌疑点） */
'use strict'
const { spawn } = require('child_process')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9336
const PAGE = 'file:///' + path.join(ROOT, 'Balatro素材图鉴.html').replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(__dirname, 'tmp-probe-toblob'), '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--allow-file-access-from-files', PAGE], { stdio: 'ignore' })
  let target = null
  for (let i = 0; i < 60 && !target; i++) {
    try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); target = l.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) } catch (e) {}
    if (!target) await sleep(400)
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result) } }
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })) })
  const ev = async (expr, awaitP) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: !!awaitP, returnByValue: true })
    return r.exceptionDetails ? { __err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 200) } : (r.result ? r.result.value : null)
  }
  try {
    await send('Runtime.enable')
    for (let i = 0; i < 40; i++) { if (await ev('typeof window.__BALATRO__ === "object"')) break; await sleep(500) }
    const script = `(async()=>{
      const out = [];
      const test = async (label, w, h, useApp) => {
        const t0 = performance.now();
        let cv;
        if (useApp) cv = window.__BALATRO__.maker.sheet(2, 'art');
        else { cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); c.fillStyle = '#f00'; c.fillRect(0, 0, Math.min(50, w), Math.min(50, h)) }
        const p = new Promise((res) => {
          let called = false;
          cv.toBlob((b) => { called = true; res(b ? ('blob ' + b.size + ' 字节') : '回调给了 null') }, 'image/png');
          setTimeout(() => { if (!called) res('回调没被调用') }, 6000);
        });
        const r = await p;
        out.push(label + ' [' + cv.width + '×' + cv.height + '] → ' + r + '  用时 ' + Math.round(performance.now() - t0) + 'ms');
      };
      await test('小画布', 142, 190, false);
      await test('1x 帧条', 71, 95, false);
      await test('宽帧条（24 帧 2x）', 3408, 190, false);
      await test('超高画布', 100, 8000, false);
      return JSON.stringify(out);
    })()`
    console.log(await ev(script, true))
    console.log('app.sheet 2x 尺寸：' + await ev('(()=>{const c=window.__BALATRO__.maker.sheet(2,"art"); return c.width+"×"+c.height})()'))
  } catch (e) { console.error('❌ ' + e.message) } finally { try { ws.close() } catch (e) {} try { ch.kill() } catch (e) {} }
})()
