/* 探针：这个内核到底有没有 ImageDecoder？WebP 动图能不能拆？
   无头模式实测没有 ImageDecoder，但用户平时用的是有界面的 Chrome —— 所以这里可以开一个
   （默认放在屏幕外、探完自己关）有界面的窗口再问一次，把「无头的限制」和「用户的真实情况」分开。
   用法：node .work/probe-imagedecoder.js [headed] */
'use strict'
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9337
const HEADED = (process.argv[2] || '') === 'headed'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const args = [
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + path.join(__dirname, 'tmp-probe-id'),
    '--no-first-run', '--no-default-browser-check',
    '--window-position=-32000,-32000', '--window-size=420,320',
    'about:blank',
  ]
  if (!HEADED) args.unshift('--headless=new', '--disable-gpu')
  const ch = spawn(CHROME, args, { stdio: 'ignore' })
  let target = null
  for (let i = 0; i < 60 && !target; i++) {
    try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); target = l.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) } catch (e) {}
    if (!target) await sleep(400)
  }
  if (!target) { console.error('❌ Chrome 没起来'); process.exit(1) }
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
    console.log('模式: ' + (HEADED ? '有界面（模拟用户平时用的 Chrome）' : '无头'))
    console.log('UA: ' + await ev('navigator.userAgent'))
    console.log(await ev(`(() => {
      const out = { hasImageDecoder: typeof ImageDecoder !== 'undefined', hasDecompressionStream: typeof DecompressionStream !== 'undefined' };
      if (out.hasImageDecoder) {
        out.supported = {};
        for (const t of ['image/gif', 'image/png', 'image/webp', 'image/apng', 'image/avif']) {
          try { out.supported[t] = ImageDecoder.isTypeSupported(t) } catch (e) { out.supported[t] = 'error:' + e.message }
        }
      }
      return JSON.stringify(out)
    })()`))
    /* 顺手在这里生成一张静态 WebP（Chrome 编码 WebP 是内核能力），用来测「单帧 WebP」那条提示 */
    const b64 = await ev(`(async () => {
      const cv = new OffscreenCanvas(8, 8); const c = cv.getContext('2d');
      c.fillStyle = '#2a6'; c.fillRect(0, 0, 8, 8); c.fillStyle = '#f80'; c.fillRect(2, 2, 4, 4);
      const b = await cv.convertToBlob({ type: 'image/webp' });
      const arr = new Uint8Array(await b.arrayBuffer());
      let s = ''; for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
      return btoa(s);
    })()`, true)
    if (b64 && !b64.__err) {
      const out = path.join(__dirname, 'verify', 'gifdump', 'static-sample.webp')
      fs.mkdirSync(path.dirname(out), { recursive: true })
      fs.writeFileSync(out, Buffer.from(b64, 'base64'))
      console.log('已生成静态 WebP 测试图: ' + out + '（' + fs.statSync(out).size + ' 字节）')
    } else console.log('生成 WebP 失败: ' + JSON.stringify(b64))
  } catch (e) { console.error('❌ ' + e.message) } finally { try { ws.close() } catch (e) {} try { ch.kill() } catch (e) {} }
})()
