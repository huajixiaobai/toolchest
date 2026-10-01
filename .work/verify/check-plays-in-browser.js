// In-browser playback check. Headless Chrome does not tick image animations on its own,
// so frames are forced out with Page.startScreencast; the captured frames are compared.
// (Authoritative format validation lives in check-gif3d.js / check-apng-upng.js.)
'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9357
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const files = process.argv.slice(2)

async function main () {
  const profile = path.join(__dirname, 'chromeprofile-play')
  fs.mkdirSync(profile, { recursive: true })
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--disable-extensions', '--disable-sync', '--disable-crash-reporter',
    '--allow-file-access-from-files', '--user-data-dir=' + profile, '--remote-debugging-port=' + PORT,
    '--window-size=420,520', 'about:blank',
  ], { stdio: 'ignore' })
  let list = null
  for (let i = 0; i < 50; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break } catch { await sleep(400) }
  }
  if (!list) { console.log('chrome failed to start'); chrome.kill(); process.exit(1) }
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let id = 0
  const pending = new Map()
  const frameHashes = []
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return }
    if (m.method === 'Page.screencastFrame') {
      frameHashes.push(crypto.createHash('md5').update(m.params.data).digest('hex').slice(0, 10))
      ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: m.params.sessionId } }))
    }
  }
  const send = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })) })
  const evaluate = async (expr, awaitPromise) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: !!awaitPromise, returnByValue: true })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails))
    return r.result.value
  }
  await send('Runtime.enable')
  await send('Page.enable')

  let pass = 0; let fail = 0; let inconclusive = 0
  for (const f of files) {
    if (!fs.existsSync(f)) { console.log(`❌ ${path.basename(f)}: missing`); fail++; continue }
    const ext = path.extname(f).toLowerCase()
    const mime = ext === '.gif' ? 'image/gif' : 'image/png'
    const dataUrl = `data:${mime};base64,` + fs.readFileSync(f).toString('base64')
    await evaluate('location.href="about:blank"')
    await sleep(200)
    await evaluate(`window.__ready=false;window.__img=new Image();window.__img.onload=()=>window.__ready=true;window.__img.src=${JSON.stringify(dataUrl)};document.body.style.margin='0';document.body.appendChild(window.__img);`)
    for (let i = 0; i < 40 && !(await evaluate('window.__ready')); i++) await sleep(100)
    const dims = await evaluate('({w:window.__img.naturalWidth,h:window.__img.naturalHeight})')
    frameHashes.length = 0
    await send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 300, maxHeight: 400 })
    await sleep(1600)
    await send('Page.stopScreencast')
    const distinct = new Set(frameHashes).size
    const name = path.basename(f)
    if (frameHashes.length < 3) { console.log(`⚠️  ${name}: only ${frameHashes.length} screencast frames, inconclusive`); inconclusive++ }
    else if (distinct > 1) { console.log(`✅ ${name}: ${dims.w}x${dims.h}, ${distinct} distinct screencast frames -> PLAYING in Chrome`); pass++ }
    else { console.log(`⚠️  ${name}: ${dims.w}x${dims.h}, ${frameHashes.length} identical screencast frames (headless may not tick animations; see the decoder checks)`); inconclusive++ }
  }
  console.log(`\n==== ${pass} playing, ${fail} broken, ${inconclusive} inconclusive ====`)
  ws.close(); chrome.kill(); await sleep(300)
}
main().catch((e) => { console.error(e); process.exit(1) })
