/* 探针：造一个「能数帧」的测试 mod —— 24 帧，每帧画一个大数字 + 不同颜色。
   用法：node .work/probe-export-frametest.js [目标目录]
   目的：把「帧数不够/提前循环」和「GIF 内容本身的观感」分开。
   如果游戏里数字从 1 数到 24 再回到 1 → 帧数与循环没问题；如果数到 6 就回到 1 → 是真的少算了帧，我去修。 */
'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9342
const DEST = process.argv[2] || path.join(process.env.APPDATA, 'Balatro', 'Mods', 'frametest')
const PAGE = 'file:///' + path.join(ROOT, 'Balatro素材图鉴.html').replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(__dirname, 'tmp-probe-frametest'), '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--allow-file-access-from-files', PAGE], { stdio: 'ignore' })
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
    return r.exceptionDetails ? { __err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 400) } : (r.result ? r.result.value : null)
  }
  try {
    await send('Runtime.enable')
    for (let i = 0; i < 40; i++) { if (await ev('typeof window.__BALATRO__ === "object"')) break; await sleep(500) }
    const built = await ev(`(async()=>{
      const B=window.__BALATRO__; const P=B.maker.project; const S=B.state;
      S.tab='maker'; B.render(); await new Promise(r=>setTimeout(r,900));
      P.modId='frametest'; P.modName='数帧测试'; P.author='huajixiaobai'; P.version='1.0.0'; P.prefix='frametest';
      P.desc='24 帧，每帧一个大数字，用来数游戏里到底播了几帧';
      const a=P.items[0];
      a.type='Joker'; a.key='frametest'; a.nameZh='数帧测试牌'; a.nameEn='Frame Count Test';
      a.textZh='看数字：1 → 24 再回到 1 就是正常的'; a.rarity=2; a.cost=4; a.soul.on=false;
      a.effects=[{when:'card',cond:'',condVal:'',eff:'mult',val:1}];
      /* 自己画 24 帧：颜色随帧号变，中间印一个大数字 */
      const N=24, W=71, H=95, frames=[];
      for(let i=0;i<N;i++){
        const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
        const c=cv.getContext('2d');
        const hue=Math.round(i*(360/N));
        c.fillStyle='hsl('+hue+',70%,45%)'; c.fillRect(0,0,W,H);
        c.fillStyle='#fff'; c.fillRect(3,3,W-6,H-6);
        c.fillStyle='hsl('+hue+',80%,35%)';
        c.font='bold 46px sans-serif'; c.textAlign='center'; c.textBaseline='middle';
        c.fillText(String(i+1), W/2, H/2);
        c.font='bold 12px sans-serif'; c.fillText('帧 '+(i+1)+'/'+N, W/2, H-14);
        frames.push(cv);
      }
      a.art={atlas:'Joker',pos:{x:0,y:0},upload:frames[0],uploadName:'自带 24 帧数字图',frames:frames,animated:true,weights:null,gen:null,delays:new Array(N).fill(60),speed:1};
      B.maker.select(0); B.render(); await new Promise(r=>setTimeout(r,500));
      const files=await B.maker.files(); const out=[];
      for(const f of files){ let s2=''; const d=f.data; for(let i=0;i<d.length;i++) s2+=String.fromCharCode(d[i]); out.push({name:f.name,b64:btoa(s2),bytes:d.length}) }
      const lua=B.maker.lua();
      return JSON.stringify({frames:frames.length, luaFrames:(lua.match(/frames = \\d+/g)||[]), files:out.map(x=>x.name+'('+x.bytes+')'), payload:out})
    })()`, true)
    if (!built || built.__err) { console.error('❌ 失败 ' + JSON.stringify(built).slice(0, 300)); return }
    const o = typeof built === 'string' ? JSON.parse(built) : built
    console.log('帧数: ' + o.frames + '   Lua 里: ' + o.luaFrames.join(' / '))
    console.log('文件: ' + o.files.join(', '))
    fs.mkdirSync(DEST, { recursive: true })
    for (const f of o.payload) { const p = path.join(DEST, f.name.replace(/\//g, path.sep)); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.from(f.b64, 'base64')) }
    console.log('已写入 ' + DEST)
  } catch (e) { console.error('❌ ' + e.message) } finally { try { ws.close() } catch (e) {} try { ch.kill() } catch (e) {} }
})()
