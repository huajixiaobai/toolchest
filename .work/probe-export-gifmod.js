const { spawn } = require('child_process')
const fs = require('fs'); const path = require('path')
const ROOT = path.join(__dirname, '..')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9341
const GIF = 'C:/Users/18878/Desktop/2ab90f8671834c56befd349c4ba69b81.gif'
const DEST = path.join(process.env.APPDATA, 'Balatro', 'Mods', 'gifjoker')
const PAGE = 'file:///' + path.join(ROOT, 'Balatro素材图鉴.html').replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const ch = spawn(CHROME, ['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+path.join(__dirname,'tmp-probe-gifmod'),'--no-first-run','--no-default-browser-check','--disable-gpu','--allow-file-access-from-files',PAGE], { stdio: 'ignore' })
  let target = null
  for (let i=0;i<60 && !target;i++){ try { const l = await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json(); target = l.find(t=>t.type==='page'&&t.webSocketDebuggerUrl) } catch(e){} if(!target) await sleep(400) }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=()=>rej(new Error('ws')) })
  let id=0; const pending=new Map()
  ws.onmessage=(ev)=>{ const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result)} }
  const send=(method,params)=>new Promise((res,rej)=>{const i=++id;pending.set(i,{res,rej});ws.send(JSON.stringify({id:i,method,params:params||{}}))})
  const ev=async(expr,awaitP)=>{const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:!!awaitP,returnByValue:true});return r.exceptionDetails?{__err:String((r.exceptionDetails.exception&&r.exceptionDetails.exception.description)||r.exceptionDetails.text).slice(0,400)}:(r.result?r.result.value:null)}
  try {
    await send('Runtime.enable')
    for(let i=0;i<40;i++){ if(await ev('typeof window.__BALATRO__ === "object"')) break; await sleep(500) }
    await ev("(()=>{const B=window.__BALATRO__;B.state.tab='maker';B.render();return 1})()")
    await sleep(1200)
    const doc = await send('DOM.getDocument',{depth:-1})
    const inp = await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#mkUpload'})
    await send('DOM.setFileInputFiles',{files:[GIF],nodeId:inp.nodeId})
    await sleep(2500)
    const built = await ev(`(async()=>{
      const B=window.__BALATRO__; const P=B.maker.project; const S=B.state;
      const a=P.items[0];
      P.modId='gifjoker'; P.modName='GIF 小丑（图鉴制作器生成）'; P.author='huajixiaobai'; P.version='1.0.0'; P.prefix='gifjoker';
      P.desc='用桌面那张 GIF 做的动图小丑牌';
      a.type='Joker'; a.key='gifjoker'; a.nameZh='跳舞小猫'; a.nameEn='Dancing Cat';
      a.textZh='测试：用 GIF 拆出的 24 帧做动图'; a.rarity=2; a.cost=6;
      a.soul.on=false;
      B.maker.select(0); B.render(); await new Promise(r=>setTimeout(r,500));
      const files=await B.maker.files(); const out=[];
      for(const f of files){ let s2=''; const d=f.data; for(let i=0;i<d.length;i++) s2+=String.fromCharCode(d[i]); out.push({name:f.name,b64:btoa(s2),bytes:d.length}) }
      return JSON.stringify({frames:a.frames?a.frames.length:0, nameZh:a.nameZh, files:out.map(x=>x.name+'('+x.bytes+')'), payload:out})
    })()`, true)
    if(!built||built.__err){ console.error('❌ 导出失败 '+JSON.stringify(built).slice(0,300)); return }
    const o = typeof built==='string'?JSON.parse(built):built
    console.log('拆出的帧数: '+o.frames+'  名字: '+o.nameZh)
    console.log('文件: '+o.files.join(', '))
    fs.mkdirSync(DEST,{recursive:true})
    for(const f of o.payload){ const p=path.join(DEST,f.name.replace(/\//g,path.sep)); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,Buffer.from(f.b64,'base64')) }
    console.log('已写入 '+DEST)
  } catch(e){ console.error('❌ '+e.message) } finally { try{ws.close()}catch(e){}; try{ch.kill()}catch(e){} }
})()
