/* 探针：在 Mod 制作器里真的去选「照现成的牌做一个」，看名字/描述/预览到底变没变
   用法：node .work/probe-clone.js [itemId1 itemId2 ...] */
'use strict'
const { spawn } = require('child_process')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9338
const PAGE = 'file:///' + path.join(ROOT, 'Balatro素材图鉴.html').replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c))
const IDS = process.argv.slice(2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(__dirname, 'tmp-probe-clone'), '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--allow-file-access-from-files', PAGE], { stdio: 'ignore' })
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
    return r.exceptionDetails ? { __err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 300) } : (r.result ? r.result.value : null)
  }
  try {
    await send('Runtime.enable')
    for (let i = 0; i < 40; i++) { if (await ev('typeof window.__BALATRO__ === "object"')) break; await sleep(500) }
    await ev("(()=>{const B=window.__BALATRO__; B.state.tab='maker'; B.render(); return 1})()")
    await sleep(1200)
    console.log('初始: ' + await ev("JSON.stringify({nameZh:window.__BALATRO__.maker.state.nameZh, key:window.__BALATRO__.maker.state.key})"))
    /* 下拉里到底有哪些值可选（顺便看第一项是不是特殊值） */
    console.log('下拉项数: ' + await ev("document.querySelectorAll('#mkClone option').length"))
    const ids = IDS.length ? IDS : (await ev("JSON.stringify([].slice.call(document.querySelectorAll('#mkClone option')).map(function(o){return o.value}).filter(function(v){return v}).slice(0,4))"))
    const list = typeof ids === 'string' ? JSON.parse(ids) : ids
    for (const one of list) {
      const out = await ev("(async()=>{ const B=window.__BALATRO__; const sel=document.querySelector('#mkClone');" +
        " if(!sel) return 'no-select';" +
        " sel.value=" + JSON.stringify(one) + ";" +
        " sel.dispatchEvent(new Event('change',{bubbles:true}));" +
        " await new Promise(function(r){setTimeout(r,400)});" +
        " const q=function(s){return document.querySelector(s)};" +
        " const qq=function(s){return document.querySelector(s)}; const qqa=function(s){return [].slice.call(document.querySelectorAll(s))};" +
        " const lua=B.maker.lua();" +
        " return JSON.stringify({ id:" + JSON.stringify(one) + ", nameZh:B.maker.state.nameZh, key:B.maker.state.key," +
        "  nameInput:(qq('[data-mk=\"nameZh\"]')||{}).value, textInput:(qq('[data-mk=\"textZh\"]')||{}).value," +
        "  pvLine:(qq('.mkpvline')||{}).innerText, tags:qqa('.mktag').map(function(x){return x.textContent})," +
        "  pvText:(qq('.mkpv')||{}).innerText.replace(/\\n/g,' | ').slice(0,70), status:(qq('#mkStatus')||{}).textContent.slice(0,60)," +
        "  effects: (B.maker.state.effects||[]).map(function(e){return e.when+'/'+e.eff+'='+e.val+(e.cond?('@'+e.cond+e.condVal):'')}).join(' ') }) })()", true)
      console.log(JSON.stringify(out && out.__err ? out : (typeof out === 'string' ? JSON.parse(out) : out)))
    }
  } catch (e) { console.error('❌ ' + e.message) } finally { try { ws.close() } catch (e) {} try { ch.kill() } catch (e) {} }
})()
