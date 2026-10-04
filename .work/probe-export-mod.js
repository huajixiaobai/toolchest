/* 探针：真的从制作器导出一个 mod，并把每个文件按原样写到 Lovely 的 Mods 目录下（游戏要的是**文件夹**，不是 zip）
   用法：node .work/probe-export-mod.js [目标目录] */
'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9339
const DEFAULT_DEST = path.join(process.env.APPDATA, 'Balatro', 'Mods', 'testmod')
const DEST = process.argv[2] || DEFAULT_DEST
const PAGE = 'file:///' + path.join(ROOT, 'Balatro素材图鉴.html').replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(__dirname, 'tmp-probe-export'), '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--allow-file-access-from-files', PAGE], { stdio: 'ignore' })
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
    /* 造一个两条目的工程：一条小丑（动图 + 立绘），一条塔罗牌 */
    const built = await ev(`(async () => {
      const B=window.__BALATRO__; const S=B.state;
      S.tab='maker'; B.render();
      await new Promise(r=>setTimeout(r,900));
      const P=B.maker.project;
      P.modId='testmod'; P.modName='测试 Mod（图鉴制作器生成）'; P.author='huajixiaobai'; P.version='1.0.0'; P.prefix='testmod';
      P.desc='由 Balatro 素材图鉴的 Mod 制作器生成，用于验证加载';
      /* 第一条：小丑牌 */
      B.maker.select(0);
      const a=P.items[0];
      a.type='Joker'; a.key='testjoker'; a.nameZh='测试小丑'; a.nameEn='Test Joker';
      a.textZh='每张红桃牌 +50 筹码（测试用）'; a.rarity=2; a.cost=5;
      a.art={atlas:'Joker',pos:{x:0,y:0},upload:null,uploadName:'',frames:null,animated:false,gen:{kind:'float',n:6,fps:12,amp:3}};
      a.soul={on:true,atlas:'Joker',pos:{x:0,y:2},upload:null,uploadName:'',frames:null,animated:false,gen:{kind:'breathe',n:6,fps:12,amp:4}};
      a.effects=[{when:'card',cond:'suit',condVal:'Hearts',eff:'chips',val:50}];
      /* 第二条：塔罗牌 */
      B.maker.addItem('Consumable');
      const c=P.items[1];
      c.key='testtarot'; c.nameZh='测试塔罗'; c.nameEn='Test Tarot'; c.set='Tarot';
      c.textZh='测试用的消耗品'; c.cost=3;
      c.useKind='dollars'; c.useVal=4;
      c.art={atlas:'Tarot',pos:{x:0,y:0},upload:null,uploadName:'',frames:null,animated:false,gen:null};
      B.maker.select(0); B.render();
      await new Promise(r=>setTimeout(r,400));
      const files=await B.maker.files();
      const out=[];
      for (const f of files) { let s2=''; const d=f.data; for (let i=0;i<d.length;i++) s2+=String.fromCharCode(d[i]); out.push({name:f.name, b64:btoa(s2), bytes:d.length}) }
      return JSON.stringify({ items:P.items.length, files:out.map(function(x){return x.name+'('+x.bytes+')'}), payload:out });
    })()`, true)
    if (!built || built.__err) { console.error('❌ 页面里导出失败：' + JSON.stringify(built).slice(0, 300)); return }
    const o = typeof built === 'string' ? JSON.parse(built) : built
    console.log('工程条目数: ' + o.items)
    console.log('导出的文件: ' + o.files.join(', '))
    /* 按原样写成文件夹（游戏要的是文件夹，不是 zip） */
    fs.mkdirSync(DEST, { recursive: true })
    for (const f of o.payload) {
      const p = path.join(DEST, f.name.replace(/\//g, path.sep))
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, Buffer.from(f.b64, 'base64'))
      console.log('  写入 ' + p + '  (' + f.bytes + ' 字节)')
    }
    console.log('\n目标目录: ' + DEST)
  } catch (e) { console.error('❌ ' + e.message) } finally { try { ws.close() } catch (e) {} try { ch.kill() } catch (e) {} }
})()
