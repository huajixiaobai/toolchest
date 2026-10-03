/* 探针：把 GIF 真的交给 Mod 制作器的「上传自己的图」，看每一步走到哪（卡住时能定位）
   用法：node .work/probe-maker-gif.js */
'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9335
const GIF = process.argv[2] || 'C:/Users/18878/Desktop/2ab90f8671834c56befd349c4ba69b81.gif'
const SEL = process.argv[3] || '#mkUpload'
const PAGE = 'file:///' + path.join(ROOT, 'Balatro素材图鉴.html').replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const userDir = path.join(__dirname, 'tmp-probe-app')
  const ch = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--allow-file-access-from-files', PAGE,
  ], { stdio: 'ignore' })

  let target = null
  for (let i = 0; i < 60 && !target; i++) {
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
  const logs = []
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result) } else if (m.method === 'Runtime.consoleAPICalled') {
      logs.push(m.params.args.map((a) => a.value === undefined ? a.description : a.value).join(' '))
    }
  }
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })) })
  const ev = async (expr, awaitP) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: !!awaitP, returnByValue: true })
    if (r.exceptionDetails) return { __err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 300) }
    return r.result ? r.result.value : null
  }

  try {
    await send('Runtime.enable')
    /* 等页面把 __BALATRO__ 挂上 */
    for (let i = 0; i < 40; i++) { if (await ev('typeof window.__BALATRO__ === "object"')) break; await sleep(500) }
    console.log('boot: ' + await ev('typeof window.__BALATRO__'))

    /* 非阻塞地把流程跑起来：每做完一步写一个标记，Node 这边轮询 */
    await ev(`(()=>{ window.__P={step:'start',log:[]}; const mark=(s)=>{window.__P.step=s; window.__P.log.push(Date.now()%100000+' '+s)}; window.__P.mark=mark;
      (async()=>{ try {
        const B=window.__BALATRO__;
        mark('render-前');
        B.state.tab='maker'; B.render();
        mark('render-后');
        await new Promise(r=>setTimeout(r,900));
        mark('等文件');
        for (let i=0;i<80 && !(B.maker.state.art.frames||B.maker.state.soul.frames);i++) await new Promise(r=>setTimeout(r,200));
        const st=B.maker.state.art, so=B.maker.state.soul;
        window.__P.art={frames:st.frames?st.frames.length:0,name:st.uploadName,delay:st.delay||0};
        window.__P.soul={frames:so.frames?so.frames.length:0,name:so.uploadName,delay:so.delay||0};
        mark('已拆帧 art='+window.__P.art.frames+' soul='+window.__P.soul.frames);
        const hash=()=>{ const cv=document.querySelector('.mkpvbox canvas'); if(!cv) return null; const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let h=0; for(let i=0;i<d.length;i+=97) h=(h*31+d[i])>>>0; return h };
        const h1=hash(); await new Promise(r=>setTimeout(r,450)); const h2=hash();
        window.__P.hashes=[h1,h2]; window.__P.previewChanges=h1!==h2;
        mark('预览哈希 '+h1+'→'+h2);
        mark('导出前');
        const t1=performance.now(); const s1=B.maker.sheet(1,'art'); const t2=performance.now(); const s2=B.maker.sheet(2,'art'); const t3=performance.now();
        window.__P.timing={sheet1:Math.round(t2-t1),sheet2:Math.round(t3-t2),sizes:[s1.width+'x'+s1.height,s2.width+'x'+s2.height]};
        mark('sheet 画好了');
        const lua0=B.maker.lua(); mark('lua 好了 长度='+lua0.length);
        const mf=B.maker.manifest(); mark('manifest 好了 长度='+(mf?mf.length:0));
        const files=await B.maker.files();
        window.__P.fileNames=files.map(f=>f.name);
        const png=files.filter(f=>f.name.indexOf('sheet.png')>=0||f.name.indexOf('soul.png')>=0);
        window.__P.widths=png.map(f=>({name:f.name,w:f.data[16]*16777216+f.data[17]*65536+f.data[18]*256+f.data[19],bytes:f.data.length}));
        try { const f0=png[0]; let bin=''; for (let i=0;i<f0.data.length;i++) bin+=String.fromCharCode(f0.data[i]); window.__P.b64=btoa(bin); window.__P.b64name=f0.name.split('/').join('_') } catch(e){ window.__P.b64err=String(e) }
        mark('导出后');
        /* 把导出的帧条再读回来：逐格数不透明像素，证明导出的图集里真的每一帧都有内容 */
        try {
          const p1=png[0]; const blob=new Blob([p1.data],{type:'image/png'}); const url=URL.createObjectURL(blob);
          const im=await new Promise((res,rej)=>{const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url});
          const cv=document.createElement('canvas'); cv.width=im.width; cv.height=im.height;
          const cx=cv.getContext('2d'); cx.drawImage(im,0,0);
          const d=cx.getImageData(0,0,im.width,im.height).data;
          const cells=[]; const cw=Math.round(im.width/24);
          for (let c=0;c<Math.max(1,Math.round(im.width/cw));c++){ let n=0; for(let y=0;y<im.height;y++) for(let x=0;x<cw;x++){ const o=(y*im.width+c*cw+x)*4; if(d[o+3]>0) n++ } cells.push(n) }
          window.__P.exportedCells=cells; window.__P.exportedSize=im.width+'x'+im.height;
          URL.revokeObjectURL(url);
        } catch(e){ window.__P.cellErr=String(e&&e.message||e) }
        const lua=B.maker.lua();
        window.__P.luaFrames=(lua.match(/frames = \\d+/g)||[]);
        window.__P.errors=(window.__V&&window.__V.errors)?window.__V.errors.length:'n/a';
        mark('完成');
      } catch(e){ window.__P.err=String(e&&e.stack||e).slice(0,500); mark('出错') } })();
      return 1 })()`)

    /* 把文件交给 input */
    console.log('把 ' + path.basename(GIF) + ' 交给 ' + SEL)
    const doc = await send('DOM.getDocument', { depth: -1 })
    const inp = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: SEL })
    if (!inp || !inp.nodeId) console.log('❌ 找不到 ' + SEL)
    else await send('DOM.setFileInputFiles', { files: [GIF], nodeId: inp.nodeId })

    /* 轮询步骤 */
    let last = ''
    for (let i = 0; i < 70; i++) {
      const p = await ev('JSON.stringify({step:window.__P.step,timing:window.__P.timing,art:window.__P.art,soul:window.__P.soul,pc:window.__P.previewChanges,widths:window.__P.widths,cells:window.__P.exportedCells,size:window.__P.exportedSize,cellErr:window.__P.cellErr,luaFrames:window.__P.luaFrames,errors:window.__P.errors,err:window.__P.err})')
      if (p && p !== last) { console.log('   ' + p); last = p }
      if (p && /"(完成|出错)"/.test(p)) break
      await sleep(1000)
    }
    console.log('\n页面控制台：')
    for (const l of logs.slice(-12)) console.log('   ' + l)
    console.log('\n最终：' + await ev('JSON.stringify(window.__P)'))
    const raw = await ev('JSON.stringify({b64:window.__P.b64||null,name:window.__P.b64name||null})')
    try {
      const o = JSON.parse(raw || '{}')
      if (o.b64) {
        const dir = path.join(__dirname, 'verify', 'gifdump')
        require('fs').mkdirSync(dir, { recursive: true })
        const out = path.join(dir, 'exported_' + o.name)
        require('fs').writeFileSync(out, Buffer.from(o.b64, 'base64'))
        console.log('导出的图集已落盘：' + out)
      }
    } catch (e) { console.log('落盘失败：' + e.message) }
  } catch (e) {
    console.error('❌ ' + e.message)
  } finally {
    try { ws.close() } catch (e) {}
    try { ch.kill() } catch (e) {}
  }
})()
