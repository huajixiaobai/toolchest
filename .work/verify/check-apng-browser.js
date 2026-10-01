// Opens the exported APNG in Chrome and proves the browser decodes it as an image.
'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9345
const FILE = path.join(__dirname, '..', '..', '动图示例', 'j_caino_动画.png')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main () {
  if (!fs.existsSync(FILE)) { console.log('sample APNG missing:', FILE); process.exit(1) }
  const profile = path.join(__dirname, 'chromeprofile-apng')
  fs.mkdirSync(profile, { recursive: true })
  const url = 'file:///' + FILE.replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c))
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--disable-extensions', '--disable-sync', '--disable-crash-reporter',
    '--allow-file-access-from-files', '--user-data-dir=' + profile, '--remote-debugging-port=' + PORT,
    '--window-size=900,700', url,
  ], { stdio: 'ignore' })

  let ready = null
  for (let i = 0; i < 50; i++) {
    try { ready = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break } catch { await sleep(400) }
  }
  if (!ready) { console.log('chrome did not start'); chrome.kill(); process.exit(1) }
  const page = ready.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  }
  const send = (method, params) => new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params: params || {} })) })

  await send('Runtime.enable')
  await sleep(1800)
  const r = await send('Runtime.evaluate', {
    expression: `(function(){var i=document.querySelector('img');if(!i)return {img:false,body:document.body.innerText.slice(0,80)};
      return {img:true, complete:i.complete, w:i.naturalWidth, h:i.naturalHeight, src:i.src.slice(0,30)}})()`,
    returnByValue: true,
  })
  const info = r.result.value
  console.log('APNG loaded in Chrome ->', JSON.stringify(info))
  const ok = info && info.img && info.w > 0 && info.h > 0
  console.log(ok ? `✅ Chrome decodes the exported APNG as a ${info.w}x${info.h} image` : '❌ Chrome could not decode it')

  if (process.argv.includes('--shot')) {
    await sleep(400)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(__dirname, 'shots', 'apng-in-browser.png'), Buffer.from(shot.data, 'base64'))
    console.log('screenshot -> shots/apng-in-browser.png')
  }
  ws.close(); chrome.kill(); await sleep(300)
  process.exit(ok ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
