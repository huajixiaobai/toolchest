// Dependency-free Chrome DevTools Protocol driver: loads the built viewer, drives the
// UI through every view, evaluates in-page assertions and grabs screenshots.
'use strict'
const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const CHROME = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9333
const PAGE = process.env.BALATRO_PAGE || ('file:///' + path.join(ROOT, 'Balatro素材图鉴.html').replace(/\\/g, '/').replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c)))
const SHOTS = path.join(__dirname, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const safeLabel = (s) => String(s).replace(/[\\/:*?"<>|（）()]/g, '').replace(/\\s+/g, '_')

/** Kill anything still listening on the CDP port (a Chrome leaked by an earlier crashed run). */
function freePort (port) {
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'latin1', maxBuffer: 8 << 20 })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes(':' + port)) continue
      if (!/LISTENING/i.test(line)) continue
      const m = /\s(\d+)\s*$/.exec(line.trim())
      if (m) pids.add(m[1])
    }
    for (const pid of pids) {
      try { execSync('taskkill /F /PID ' + pid, { stdio: 'ignore' }); console.log('freed port ' + port + ' (killed stale pid ' + pid + ')') } catch { /* ignore */ }
    }
    if (pids.size) return true
  } catch { /* netstat unavailable — not fatal */ }
  return false
}

async function getJSON (url) {
  const r = await fetch(url)
  return r.json()
}

class CDP {
  constructor (ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [] }
  static async connect (url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error('ws error')) })
    const c = new CDP(ws)
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && c.pending.has(msg.id)) {
        const { res, rej } = c.pending.get(msg.id); c.pending.delete(msg.id)
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
      } else if (msg.method) c.events.push(msg)
    }
    return c
  }
  send (method, params) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej })
      this.ws.send(JSON.stringify({ id, method, params: params || {} }))
    })
  }
  async eval (expression, awaitPromise) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: !!awaitPromise, returnByValue: true })
    if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails))
    return r.result.value
  }
  async shot (name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'))
    return name + '.png'
  }
}

/* ------------------------------------------------------------- in-page helpers */
const HELPERS = `
window.__V = {
  errors: [],
  byText(sel, txt){ return [].slice.call(document.querySelectorAll(sel)).filter(e => e.textContent.indexOf(txt) >= 0)[0] },
  wait(ms){ return new Promise(r => setTimeout(r, ms)) },
  blank(){
    const out=[]; let painted=0;
    [].slice.call(document.querySelectorAll('canvas')).forEach(cv=>{
      if(!cv.width||!cv.height){out.push('zero');return}
      try{
        const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
        let nz=0; for(let i=3;i<d.length;i+=4){ if(d[i]>8){nz++; if(nz>40) break} }
        if(nz<=40) out.push((cv.className||'?')+' '+cv.width+'x'+cv.height); else painted++;
      }catch(e){ out.push('tainted') }
    });
    return {painted:painted, blank:out.length, sample:out.slice(0,6), total:document.querySelectorAll('canvas').length};
  },
  async click(sel, txt, ms){ const e = txt ? window.__V.byText(sel,txt) : document.querySelector(sel); if(!e) return false; e.click(); await window.__V.wait(ms||400); return true },
  hash(cv){ if(!cv) return 0; const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let h=2166136261; for(let i=0;i<d.length;i+=13){ h^=d[i]; h=Math.imul(h,16777619)>>>0 } return h },
  diff(a,b){ if(!a||!b||a.width!==b.width||a.height!==b.height) return -1;
    const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data;
    const y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
    let d=0; for(let i=0;i<x.length;i+=4) d+=Math.abs(x[i]-y[i])+Math.abs(x[i+3]-y[i+3]);
    return +(d/(x.length/4*510)).toFixed(4) },
  bbox(cv){ const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
    let x0=1e9,y0=1e9,x1=-1,y1=-1;
    for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){ if(d[(y*cv.width+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y } }
    return x1<0?null:{x0,y0,x1,y1} }
};
window.addEventListener('error', function(e){ window.__V.errors.push(String(e.message)+' @line '+e.lineno) });
window.addEventListener('unhandledrejection', function(e){ window.__V.errors.push('rejection: '+String(e.reason && e.reason.message || e.reason)) });
/* capture every exported blob instead of relying on real downloads */
window.__CAPTURED__ = [];
(function(){
  var origCreate = URL.createObjectURL;
  URL.createObjectURL = function(blob){ window.__CAPTURED__.push({ name: '', blob: blob }); return origCreate.call(URL, blob) };
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){
    // createObjectURL runs first, so the newest capture belongs to this download
    var n = this.getAttribute('download') || '';
    var last = window.__CAPTURED__[window.__CAPTURED__.length - 1];
    if (last && !last.name) last.name = n;
    return origClick.call(this)
  };
})();
window.__GRAB__ = async function(){
  var out=[];
  for (var i=0;i<window.__CAPTURED__.length;i++){
    var rec=window.__CAPTURED__[i];
    var u8=new Uint8Array(await rec.blob.arrayBuffer());
    var b64='';
    if (u8.length < 1600000){
      var s=''; for(var k=0;k<u8.length;k+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(k,k+0x8000));
      b64=btoa(s);
    }
    out.push({name:rec.name, size:u8.length, magic:[u8[0],u8[1],u8[2],u8[3]], tail:[u8[u8.length-22],u8[u8.length-21],u8[u8.length-20],u8[u8.length-19]], b64:b64});
  }
  return out;
};
`;

const SCENARIOS = {
  codex: `(async()=>{
     await __V.wait(1200);
     const r={view:'codex'};
     r.cells=document.querySelectorAll('.cell').length;
     r.sidebarCats=document.querySelectorAll('.cat').length;
     r.canvas=__V.blank();
     return r })()`,
  jokers: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','小丑牌',2200);
     const r={view:'jokers'};
     r.cells=document.querySelectorAll('.cell').length;
     r.canvas=__V.blank();
     document.querySelector('.cell').click(); await __V.wait(2200);
     r.detail=document.getElementById('detail').textContent.replace(/\\s+/g,' ').slice(0,400);
     r.detailCanvas=document.querySelectorAll('#detail canvas').length;
     r.detailButtons=[].slice.call(document.querySelectorAll('#detail .btn')).map(b=>b.textContent);
     r.canvas2=__V.blank();
     return r })()`,
  tarot: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','塔罗牌',1800);
     document.querySelector('.cell').click(); await __V.wait(1800);
     const r={view:'tarot', cells:document.querySelectorAll('.cell').length};
     r.detail=document.getElementById('detail').textContent.replace(/\\s+/g,' ').slice(0,400);
     r.marks=[].slice.call(document.querySelectorAll('#detail .desc .x')).length;
     r.colored=[].slice.call(document.querySelectorAll('#detail .desc span[style*="color"]')).length;
     r.canvas=__V.blank();
     return r })()`,
  cards: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','扑克牌',1800);
     document.querySelector('.cell').click(); await __V.wait(1800);
     const r={view:'cards', cells:document.querySelectorAll('.cell').length};
     r.detail=document.getElementById('detail').textContent.replace(/\\s+/g,' ').slice(0,300);
     r.canvas=__V.blank();
     return r })()`,
  forge: `(async()=>{
     await __V.wait(1200);
     const clicked=await __V.click('.cat','卡牌合成台',2600);
     const r={view:'forge', clicked:clicked};
     r.groups=[].slice.call(document.querySelectorAll('.opt')).map(o=>o.querySelector('h4')?o.querySelector('h4').textContent:'?');
     r.chips=document.querySelectorAll('.pick').length;
     r.preview=document.querySelectorAll('.preview canvas').length;
     r.canvas=__V.blank();
     if(!r.groups.length) return r;
     const opts=[].slice.call(document.querySelectorAll('.opt'));
     const ed=opts.filter(o=>o.querySelector('h4') && /版本/.test(o.querySelector('h4').textContent))[0];
     if(ed){
       const btns=[].slice.call(ed.querySelectorAll('.pick'));
       r.editions=btns.length;
       for(const b of btns){ b.click(); await __V.wait(430) }
       r.canvasAfterEditions=__V.blank();
     }
     const enh=opts.filter(o=>o.querySelector('h4') && /强化/.test(o.querySelector('h4').textContent))[0];
     if(enh){
       const ebtns=[].slice.call(enh.querySelectorAll('.pick'));
       r.enhancements=ebtns.length;
       for(const b of ebtns){ b.click(); await __V.wait(220) }
       r.canvasAfterEnh=__V.blank();
     }
     const tg=[].slice.call(document.querySelectorAll('.pick')).filter(b=>/牌背|高对比/.test(b.textContent));
     for(const b of tg){ b.click(); await __V.wait(350) }
     r.toggles=tg.length; r.canvasAfterToggles=__V.blank();
     for(const b of tg){ b.click(); await __V.wait(300) }
     return r })()`,
  atlas: `(async()=>{
     await __V.wait(1500);
     await __V.click('.cat','图集浏览',1800);
     const r={view:'atlas'};
     r.rows=document.querySelectorAll('.atarow').length;
     const h=document.querySelectorAll('.atahead')[0]; if(h){h.click(); await __V.wait(1500)}
     r.openedBody=document.querySelectorAll('.atabody').length;
     r.imgs=document.querySelectorAll('.atabody img').length;
     r.gridCells=document.querySelectorAll('.atabody .gridov i').length;
     r.buttons=[].slice.call(document.querySelectorAll('.atabody .btn')).map(b=>b.textContent);
     return r })()`,
  hands: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','牌型数据',2000);
     const r={view:'hands'};
     r.rows=document.querySelectorAll('table.data tbody tr').length;
     r.mini=document.querySelectorAll('table.data canvas').length;
     r.first=document.querySelector('table.data tbody tr').textContent.replace(/\\s+/g,' ').slice(0,120);
     r.canvas=__V.blank();
     return r })()`,
  data: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','数据总表',2000);
     const r={view:'data'};
     r.rows=document.querySelectorAll('table.data tbody tr').length;
     r.heads=document.querySelectorAll('table.data th').length;
     r.buttons=[].slice.call(document.querySelectorAll('.listhead .tbtn')).map(b=>b.textContent);
     return r })()`,
  /* Audit the sidebar itself: which categories exist, what a cell looks like, and what
     happens after clicking one — used to tell a stale test selector from a real UI bug. */
  /* The toolbox site: homepage at /, viewer mounted at /viewer/. These two verify the
     generated site (docs/) — including that the viewer really works from a sub-path. */
  siteHome: `(async()=>{
     await __V.wait(800);
     const r={view:'siteHome',path:location.pathname,title:document.title,lang:document.documentElement.lang};
     r.h1=(document.querySelector('h1')||{}).textContent;
     r.tools=document.querySelectorAll('.tool').length;
     r.openable=document.querySelectorAll('a.tool').length;
     r.planned=document.querySelectorAll('.tool.planned').length;
     r.tags=document.querySelectorAll('.tag').length;
     r.hrefs=[].slice.call(document.querySelectorAll('a.tool')).map(a=>a.getAttribute('href'));
     r.manifest=!!document.querySelector('link[rel=manifest]');
     r.ogTitle=(document.querySelector('meta[property="og:title"]')||{}).content||null;
     r.ogImage=(document.querySelector('meta[property="og:image"]')||{}).content||null;
     r.aboutSections=document.querySelectorAll('.about li').length;
     /* 功能演示区：静态示意 + 可点交互 + canvas 动效 */
     r.demoCells=document.querySelectorAll('.demo .dcell').length;
     r.demotiles=document.querySelectorAll('.dtile').length;
     const chip=__V.byText('#dForgeChips button','闪箔');
     if(chip){ chip.click(); await __V.wait(300) }
     r.forgeCardClass=(document.getElementById('dForgeCard')||{}).className||null;
     const dc=document.getElementById('dCanvas');
     if(dc){
       const g=dc.getContext('2d').getImageData(0,0,dc.width,dc.height).data;
       let nz=0; for(let i=3;i<g.length;i+=4) if(g[i]>8){ nz++; if(nz>200) break }
       r.demoCanvas={w:dc.width,h:dc.height,painted:nz>200};
     }
     r.hasExportBtn=!!document.getElementById('dDlPng');
     /* 只算真正会被加载的东西：script src / 样式表、图标、manifest、预加载 / img src。
        canonical 与 og:url 是元数据，指向自己的域名不算外部请求。 */
     r.noExternal=[].slice.call(document.querySelectorAll('script[src],img[src]'))
        .map(e=>e.getAttribute('src'))
        .concat([].slice.call(document.querySelectorAll('link[href]'))
          .filter(l=>/stylesheet|icon|manifest|preload|prefetch/.test(l.getAttribute('rel')||''))
          .map(l=>l.getAttribute('href')))
        .filter(u=>u&&/^(https?:)?\\/\\//.test(u)&&u.indexOf(location.origin)!==0);
     return r })()`,
  siteViewer: `(async()=>{
     for(let i=0;i<60 && !document.querySelector('#boot .bootcard');i++) await __V.wait(250);
     const r={view:'siteViewer',path:location.pathname};
     r.hasBootScreen=!!document.querySelector('#boot .bootcard');
     r.buttons=[].slice.call(document.querySelectorAll('#boot .btn')).map(b=>b.textContent);
     r.inlineData=typeof window.__BALATRO_DATA__!=='undefined';
     r.pack=(typeof window.__PACK__==='undefined')?'undefined':String(window.__PACK__);
     r.glshaders=!!window.__GLSHADERS__;
     r.modimport=!!window.__MODIMPORT__;
     r.disclaimer=(document.querySelector('#boot .bootnotes')||{}).textContent||'';
     r.hasDisclaimer=/非官方/.test(r.disclaimer);
     /* 回工具箱的入口：应该只在站点构建里出现 */
     const hb=document.querySelector('#status .homebtn');
     r.homeBtn=hb?{text:hb.textContent.trim(),href:hb.getAttribute('href')}:null;
     r.title=document.title;
     r.errors=window.__V.errors.length;
     return r })()`,
  /* The public, deployed site: a real visitor picks their own game file and the whole
     viewer must come up. The driver hands fake-balatro.exe to the start screen. */
  liveBoot: `(async()=>{
     for(let i=0;i<60 && !document.querySelector('#boot .bootcard');i++) await __V.wait(250);
     const r={view:'liveBoot',url:location.href};
     r.hasBootScreen=!!document.querySelector('#boot .bootcard');
     // the driver has put the exe on the input by now; wait for the parse + app boot
     for(let i=0;i<300 && typeof window.__BALATRO__==='undefined';i++) await __V.wait(300);
     r.appBooted=typeof window.__BALATRO__!=='undefined';
     if(!r.appBooted){ r.bootStatus=(document.querySelector('#boot .bootstatus')||{}).textContent||''; r.errors=window.__V.errors.length; return r }
     const B=window.__BALATRO__;
     r.items=B.items.length;
     r.atlases=Object.keys(B.atlases).length;
     r.textureUrls=Object.keys(window.__BALATRO_ATLAS__).length;
     r.blobUrls=Object.keys(window.__BALATRO_ATLAS__).filter(k=>String(window.__BALATRO_ATLAS__[k]).startsWith('blob:')).length;
     r.version=B.data.meta.version;
     r.shaders=B.shaderPrograms.length;
     r.bootHidden=(()=>{const b=document.getElementById('boot');return b&&getComputedStyle(b).display==='none'})();
     r.cells=document.querySelectorAll('.cell').length;
     /* 应用起来之后，状态栏里应该有回工具箱的入口 */
     const hb=document.querySelector('#status .homebtn');
     r.homeBtn=hb?{text:hb.textContent.trim(),href:hb.getAttribute('href')}:null;
     r.siteHomeVar=(typeof window.__SITE_HOME__==='undefined')?null:String(window.__SITE_HOME__);
     r.blank=__V.blank();
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 公开站点版（docs/，不含任何游戏素材）**不内嵌**游戏字体：字体必须由 boot.js
     从访客自己的 Balatro.exe 里读出来注册。这一项就跑那条路：把真游戏文件交给
     /viewer/，然后量「像素字体 / 等宽 / 无衬线」三种字体下同一串数字的宽度 ——
     三种宽度互不相同，才算真的用上了访客游戏里的字体。 */
  siteFontLive: `(async()=>{
     for(let i=0;i<480 && window.__BALATRO_READY__!==true;i++) await __V.wait(250);
     const r={view:'siteFontLive',path:location.pathname,ready:window.__BALATRO_READY__===true};
     const q=(s)=>document.querySelector(s);
     const B=window.__BALATRO__;
     r.appBooted=!!B;
     if(!B){ r.bootStatus=(q('#boot .bootstatus')||{}).textContent||''; return r }
     r.items=B.items.length;
     /* 公开构建里不该存在内嵌字体：这条断言保证「素材只来自访客的文件」 */
     r.embeddedFontInCss=(()=>{ try{ return [].slice.call(document.styleSheets).some((sh)=>{ try{ return [].slice.call(sh.cssRules).some((ru)=>ru.cssText&&ru.cssText.indexOf('data:font/')>=0) }catch(e){ return false } }) }catch(e){ return 'err' } })();
     r.pixVarBefore=getComputedStyle(document.documentElement).getPropertyValue('--pix').trim();
     r.faces=[].slice.call(document.fonts).map((f)=>f.family+'/'+f.weight+'/'+f.status);
     const probe=(family)=>{ const cx=document.createElement('canvas').getContext('2d'); cx.font='700 32px '+family; return +cx.measureText('0123456789').width.toFixed(2) };
     r.font={ check700:(()=>{try{return document.fonts.check('700 32px BalatroPixel')}catch(e){return 'err'}})(),
       pixVar:getComputedStyle(document.documentElement).getPropertyValue('--pix').trim(),
       wPix:probe('BalatroPixel'), wMono:probe('monospace'), wSans:probe('sans-serif') };
     /* 计分器上真正落地的样式 */
     B.state.tab='score'; B.render();
     for(let i=0;i<40 && !q('.scboard');i++) await __V.wait(250);
     r.scoreBoard=!!q('.scstage');
     if(q('.scchips b')){
       r.chipsFamily=getComputedStyle(q('.scchips b')).fontFamily;
       r.chipsWeight=getComputedStyle(q('.scchips b')).fontWeight;
       r.palette={panel:getComputedStyle(q('.schud')).backgroundColor,chips:getComputedStyle(q('.scchips')).backgroundColor,
         mult:getComputedStyle(q('.scmult')).backgroundColor,total:getComputedStyle(q('.scscore')).backgroundColor};
     }
     /* 记下计分板位置，driver 会裁一张 2× 的图 —— 公开站点版也要肉眼确认字是真的像素字体 */
     r.board=(()=>{ const b=q('.scboard'); if(!b) return null; const rc=b.getBoundingClientRect();
       return { t:Math.round(rc.top+(window.scrollY||0)), w:Math.round(rc.width), h:Math.round(rc.height) } })();
     r.blank=__V.blank();
     r.errors=window.__V.errors.length;
     return r })()`,
  /* The site built with --with-assets: the viewer carries its own asset pack, so it must
     come up like the standalone HTML — no start screen at all. */
  sitePack: `(async()=>{
     for(let i=0;i<160 && window.__BALATRO_READY__!==true;i++) await __V.wait(250);
     const r={view:'sitePack',path:location.pathname,ready:window.__BALATRO_READY__===true};
     const B=window.__BALATRO__;
     r.appBooted=!!B;
     if(B){
       r.items=B.items.length;
       r.atlases=Object.keys(B.atlases).length;
       r.textureUrls=Object.keys(window.__BALATRO_ATLAS__).length;
       r.blobUrls=Object.keys(window.__BALATRO_ATLAS__).filter(k=>String(window.__BALATRO_ATLAS__[k]).startsWith('blob:')).length;
       r.version=B.data.meta.version;
       r.shaders=B.shaderPrograms.length;
     }
     r.pack=String(window.__PACK__);
     r.bootVisible=(()=>{const b=document.getElementById('boot');return !!(b&&getComputedStyle(b).display!=='none')})();
     r.cells=document.querySelectorAll('.cell').length;
     r.blank=__V.blank();
     r.errors=window.__V.errors.length;
     return r })()`,
  /* The start screen on a phone: visitors land here, so it has to be readable and tappable
     without pinching or sideways scrolling. Measured, not eyeballed. */
  /* Second visit on the public site: the browser remembered the parsed assets, so the
     viewer must come up by itself — no start screen. This is what makes the deployed
     site feel like the offline HTML without hosting any game assets. */
  siteRemember: `(async()=>{
     for(let i=0;i<200 && window.__BALATRO_READY__!==true;i++) await __V.wait(250);
     const r={view:'siteRemember',path:location.pathname,ready:window.__BALATRO_READY__===true};
     const B=window.__BALATRO__;
     r.appBooted=!!B;
     if(B){ r.items=B.items.length; r.atlases=Object.keys(B.atlases).length; r.version=B.data.meta.version; r.shaders=B.shaderPrograms.length }
     r.bootVisible=(()=>{const b=document.getElementById('boot');return !!(b&&getComputedStyle(b).display!=='none')})();
     r.cacheBar=(()=>{const b=document.querySelector('.bootcache');return b?b.textContent.replace(/\\s+/g,' ').trim():null})();
     r.hasChangeBtn=!!__V.byText('.bootcacheacts .btn','换一个游戏文件');
     r.hasClearBtn=!!__V.byText('.bootcacheacts .btn','清除已存素材');
     r.cells=document.querySelectorAll('.cell').length;
     r.blank=__V.blank();
     r.errors=window.__V.errors.length;
     return r })()`,
  bootPhone: `(async()=>{
     for(let i=0;i<50 && !document.querySelector('#boot .bootcard');i++) await __V.wait(200);
     const R=e=>{ if(!e) return null; const b=e.getBoundingClientRect(); return {t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height)} };
     const r={view:'bootPhone',vw:innerWidth,vh:innerHeight};
     r.card=R(document.querySelector('#boot .bootcard'));
     r.docW=document.documentElement.scrollWidth;
     r.noHScroll=document.documentElement.scrollWidth<=innerWidth+2;
     r.btns=[].slice.call(document.querySelectorAll('#boot .btn')).map(b=>({t:b.textContent.trim(),...R(b)}));
     r.tapOK=r.btns.length>0 && r.btns.every(b=>b.h>=44);
     r.drop=R(document.querySelector('.bootdrop'));
     r.notes=R(document.querySelector('.bootnotes'));
     r.noteLines=(document.querySelectorAll('.bootnotes li')||[]).length;
     r.h1=R(document.querySelector('#boot .bootcard h1'));
     const scroll=document.getElementById('boot');
     r.contentH=scroll?scroll.scrollHeight:0;
     r.fitsOneScreen=r.contentH<=innerHeight+2;
     const pb=document.querySelector('#boot .btn.primary');
     r.primaryOnScreen=!!pb && pb.getBoundingClientRect().bottom<=innerHeight && pb.getBoundingClientRect().top>=0;
     // smallest font size actually used in the card, to catch "too small to read on a phone"
     const sizes=[].slice.call(document.querySelectorAll('#boot .bootcard *')).map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(n=>n>0);
     r.minFont=Math.round(Math.min.apply(null,sizes)*10)/10;
     r.disc=((document.querySelector('.bootdisc')||{}).textContent||'').replace(/\\s+/g,' ').trim().slice(0,120);
     r.firstNote=((document.querySelector('.bootnotes li')||{}).textContent||'').slice(0,40);
     /* 预览区（在启动页，不在工具箱首页） */
     r.demoCells=document.querySelectorAll('.bootdemo .dcell').length;
     r.demoTiles=document.querySelectorAll('.bootdemo .dtile').length;
     const chip=__V.byText('.bootdemo .dchips button','闪箔');
     if(chip){ chip.click(); await __V.wait(250) }
     r.forgeClass=(document.getElementById('dForgeCard')||{}).className||null;
     const dc=document.getElementById('dCanvas');
     if(dc){
       const g=dc.getContext('2d').getImageData(0,0,dc.width,dc.height).data;
       let nz=0; for(let i=3;i<g.length;i+=4) if(g[i]>8){ nz++; if(nz>200) break }
       r.demoCanvas={w:dc.width,h:dc.height,painted:nz>200};
     }
     r.demoBottom=(()=>{const f=document.querySelector('.bootdemo .dfoot');if(!f)return null;const b=f.getBoundingClientRect();return {t:Math.round(b.top),b:Math.round(b.bottom)}})();
     const RR=(e)=>{if(!e)return null;const b=e.getBoundingClientRect();return {t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width)}};
     r.impRect=RR(document.querySelector('#boot .bootimp'));
     r.prevRect=RR(document.querySelector('#boot .bootprev'));
     r.sameRow=!!(r.impRect&&r.prevRect)&&r.prevRect.t<r.impRect.b-10;
     r.errors=window.__V.errors.length;
     return r })()`,
  probeCats: `(async()=>{
     await __V.wait(1500);
     const cats=[].slice.call(document.querySelectorAll('.cat')).map(e=>e.textContent.trim());
     const c=document.querySelector('.cell');
     const r={view:'probeCats', catCount:cats.length, cats, cellsAtStart:document.querySelectorAll('.cell').length};
     r.cellClasses = c ? [].slice.call(c.querySelectorAll('*')).map(e=>String(e.className)).slice(0,14) : null;
     r.hasNm = !!document.querySelector('.cell .nm');
     r.nmSel  = (()=>{ const el=document.querySelector('.cell'); if(!el) return null;
       const t=[].slice.call(el.querySelectorAll('*')).filter(e=>e.textContent && e.textContent.trim()==='小丑').map(e=>e.className);
       return t })();
     for (const name of ['小丑牌','盲注','蜡封','塔罗牌']) {
       const b=__V.byText('.cat',name);
       r['found_'+name]=!!b;
       if(!b) continue;
       b.click(); await __V.wait(1400);
       r['cells_'+name]=document.querySelectorAll('.cell').length;
       r['sel_'+name]=(window.__BALATRO__ && window.__BALATRO__.state || {}).cat;
     }
     return r })()`,
  search: `(async()=>{
     await __V.wait(1200);
     const s=document.getElementById('search');
     const probe=async(q)=>{ s.value=q; s.dispatchEvent(new Event('input')); await __V.wait(700); return document.querySelectorAll('.cell').length };
     const out={view:'search'};
     out.all=await probe('');
     out.q1=await probe('joker');
     out.q2=await probe('cat:Joker rarity:1 cost>=4');
     out.q3=await probe('钢');
     out.q4=await probe('atlas:Joker pos:0,0');
     out.q5=await probe('zzzznotfound');
     out.q6=await probe('cat:Tarot');
     out.canvas=__V.blank();
     return out })()`,
  editions: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','卡牌合成台',2600);
     const opts=[].slice.call(document.querySelectorAll('.opt'));
     const ed=opts.filter(o=>o.querySelector('h4') && /版本/.test(o.querySelector('h4').textContent))[0];
     if(!ed) return {error:'edition group missing'};
     window.__EDBTNS__ = [].slice.call(ed.querySelectorAll('.pick'));
     return {count:window.__EDBTNS__.length, labels:window.__EDBTNS__.map(b=>b.textContent.trim())} })()`,
  langs: `(async()=>{
     await __V.wait(1200);
     const clicked=await __V.click('.cat','小丑牌',1600); const nm0=document.querySelector('.cell .nm'); if(!nm0) return {view:'langs',fatal:'点击「小丑牌」后没有条目格子',clicked,cells:document.querySelectorAll('.cell').length,tab:(window.__BALATRO__&&window.__BALATRO__.state||{}).tab,hash:location.hash};
     const first=()=>document.querySelector('.cell .nm').textContent;
     const r={view:'langs'};
     r.zh=first();
     const sel=document.getElementById('langSel');
     for(const code of ['en-us','zh_TW','ja','ko','zh_CN']){
       sel.value=code; sel.dispatchEvent(new Event('change')); await __V.wait(1500);
       r[code]=first();
     }
     r.canvas=__V.blank();
     return r })()`,
  sort: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','小丑牌',1800);
     const names=()=>[].slice.call(document.querySelectorAll('.cell .nm')).slice(0,4).map(e=>e.textContent);
     const r={view:'sort'};
     const sel=document.querySelector('.listhead select');
     r.options=[].slice.call(sel.options).map(o=>o.value);
     for(const v of ['cost','rarity','name','id','order']){
       sel.value=v; sel.dispatchEvent(new Event('change')); await __V.wait(1600);
       r[v]=names();
     }
     return r })()`,
  atlasExport: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','图集浏览',1800);
     const heads=[].slice.call(document.querySelectorAll('.atahead'));
     const target=heads.filter(h=>h.textContent.indexOf('chips.png')>=0)[0];
     if(!target) return {error:'chips.png row missing'};
     target.click(); await __V.wait(1200);
     const row=target.parentElement;
     const btn=[].slice.call(row.querySelectorAll('.btn')).filter(b=>/切片/.test(b.textContent))[0];
     const r={view:'atlasExport', hasBtn:!!btn};
     if(btn){ btn.click(); await __V.wait(4000) }
     r.blobs=await window.__GRAB__();
     r.canvas=__V.blank();
     return r })()`,
  shaders: `(async()=>{
     await __V.wait(1200);
     await __V.click('.cat','着色器',2000);
     const rows=[].slice.call(document.querySelectorAll('.atarow'));
     const r={view:'shaders', rows:rows.length};
     const live=rows.filter(x=>/实时预览/.test(x.textContent));
     r.liveRows=live.length;
     // expand every shader row so each source is parsed
     for(const x of rows){ const h=x.querySelector('.atahead'); if(h){h.click(); await __V.wait(160)} }
     r.opened=document.querySelectorAll('.atabody pre').length;
     r.sourceBytes=[].slice.call(document.querySelectorAll('.atabody pre')).reduce((a,p)=>a+p.textContent.length,0);
     r.previews=document.querySelectorAll('.atabody canvas').length;
     r.exportBtns=document.querySelectorAll('.atabody .btn').length;
     r.hashes=[].slice.call(document.querySelectorAll('.atabody canvas')).map(c=>__V.hash(c));
     r.canvas=__V.blank();
     // export one shader source
     const b=[].slice.call(document.querySelectorAll('.atabody .btn')).filter(x=>/导出 \\.fs/.test(x.textContent))[0];
     if(b){ b.click(); await __V.wait(1200) }
     r.blobs=await window.__GRAB__();
     return r })()`,
  blind: `(async()=>{
     await __V.wait(1200);
     const clicked=await __V.click('.cat','盲注',1800); const r={view:'blind',clicked,cells:document.querySelectorAll('.cell').length}; const c0=document.querySelector('.cell'); if(!c0) return Object.assign(r,{fatal:'点击「盲注」后没有条目格子',tab:(window.__BALATRO__&&window.__BALATRO__.state||{}).tab,hash:location.hash}); c0.click(); await __V.wait(1800);
     const sl=document.querySelector('#detail input[type=range]');
     r.hasSlider=!!sl;
     r.max=sl?sl.max:null;
     const pv=()=>document.querySelector('#detail .row1 canvas');
     r.f0=__V.hash(pv());
     const hashes=[];
     for(const v of [1,5,10,15,20]){ sl.value=String(v); sl.dispatchEvent(new Event('input')); await __V.wait(350); hashes.push([v,__V.hash(pv())]) }
     r.frames=hashes;
     r.distinct=new Set(hashes.map(x=>x[1])).size;
     const play=[].slice.call(document.querySelectorAll('#detail .btn')).filter(b=>/播放/.test(b.textContent))[0];
     r.hasPlay=!!play;
     if(play){ play.click(); await __V.wait(900); play.click(); await __V.wait(200) }
     r.label=document.querySelector('#detail .mono').textContent;
     // export the current frame
     const png=[].slice.call(document.querySelectorAll('#detail .btn')).filter(b=>/PNG 2x/.test(b.textContent))[0];
     if(png){ png.click(); await __V.wait(1500) }
     r.blobs=await window.__GRAB__();
     r.canvas=__V.blank();
     return r })()`,
  // ---- regression tests for the reported bugs -----------------------------
  sealSticker: `(async()=>{
     await __V.wait(1500);
     const A=window.__BALATRO__;
     const r={view:'sealSticker'};
     if(!A) return {fatal:'no __BALATRO__ handle'};
     const paint=()=>{const cv=document.querySelector('.preview canvas'); return cv?__V.hash(cv):0};
     await __V.click('.cat','卡牌合成台',2600);
     const opts=[].slice.call(document.querySelectorAll('.opt'));
     const grp=(re)=>opts.filter(o=>o.querySelector('h4')&&re.test(o.querySelector('h4').textContent))[0];
     const seal=grp(/蜡封/), stick=grp(/贴纸/);
     r.sealChips=seal?seal.querySelectorAll('.pick').length:0;
     r.stickerChips=stick?stick.querySelectorAll('.pick').length:0;
     // walk every seal option, the preview must change each time
     const sh=[]; for(const b of [].slice.call(seal.querySelectorAll('.pick'))){ b.click(); await __V.wait(420); sh.push([b.textContent.trim(), paint()]) }
     r.sealHashes=sh; r.sealDistinct=new Set(sh.map(x=>x[1])).size;
     const th=[]; for(const b of [].slice.call(stick.querySelectorAll('.pick'))){ b.click(); await __V.wait(330); th.push([b.textContent.trim(), paint()]) }
     r.stickerHashesOnCard=th; r.stickerDistinctOnCard=new Set(th.map(x=>x[1])).size;
     r.stickerDisabledOnCard=[].slice.call(stick.querySelectorAll('.pick')).every(b=>b.disabled);
     // stickers are joker-only, so repeat the walk with a joker as the base
     const tsel=document.querySelector('.opt select');
     tsel.value='Joker'; tsel.dispatchEvent(new Event('change')); await __V.wait(2400);
     const opts2=[].slice.call(document.querySelectorAll('.opt'));
     const stick2=opts2.filter(o=>o.querySelector('h4')&&/贴纸/.test(o.querySelector('h4').textContent))[0];
     const seal2=opts2.filter(o=>o.querySelector('h4')&&/蜡封/.test(o.querySelector('h4').textContent))[0];
     r.stickerDisabledOnJoker=[].slice.call(stick2.querySelectorAll('.pick')).every(b=>b.disabled);
     r.sealDisabledOnJoker=[].slice.call(seal2.querySelectorAll('.pick')).every(b=>b.disabled);
     const jh=[]; for(const b of [].slice.call(stick2.querySelectorAll('.pick'))){ b.click(); await __V.wait(330); jh.push([b.textContent.trim(), paint()]) }
     r.stickerHashesOnJoker=jh; r.stickerDistinctOnJoker=new Set(jh.map(x=>x[1])).size;
     // the data model must agree: compose attaches these keys
     const spec=A.compose;
     const sealItem=A.byId['seal_Gold'], stickItem=A.byId['sticker_eternal'];
     r.composition=A.data.composition && Object.keys(A.data.composition.sealPos).join(',');
     r.stickerPos=Object.keys(A.data.composition.stickerPos).join(',');
     // direct check: card alone vs card + gold seal must differ
     const base=A.compose({center:{atlas:'centers',pos:A.data.composition.baseCenter.pos},front:{atlas:'cards_1',pos:{x:12,y:3}}},2,12);
     const withSeal=A.compose({center:{atlas:'centers',pos:A.data.composition.baseCenter.pos},front:{atlas:'cards_1',pos:{x:12,y:3}},seal:'Gold'},2,12);
     r.sealDelta=diffRatio(base,withSeal);
     const withSticker=A.compose({center:{atlas:'centers',pos:A.data.composition.baseCenter.pos},front:{atlas:'cards_1',pos:{x:12,y:3}},sticker:'eternal'},2,12);
     r.stickerDelta=diffRatio(base,withSticker);
     r.sealItemKey=sealItem.key; r.stickItemKey=stickItem.key;
     function diffRatio(a,b){ const A1=a.getContext('2d').getImageData(0,0,a.width,a.height).data, B1=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
       let n=0,t=0; for(let i=0;i<A1.length;i+=4){ t++; if(Math.abs(A1[i]-B1[i])>8||Math.abs(A1[i+3]-B1[i+3])>8) n++ } return +(n/t).toFixed(3) }
     return r })()`,
  legendary: `(async()=>{
     await __V.wait(1500);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const r={view:'legendary'};
     const ids=['j_caino','j_triboulet','j_yorick','j_chicot','j_perkeo','j_hologram','c_soul','j_joker','c_black_hole'];
     r.items=[];
     const diff=(a,b)=>{ const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data, y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
       let n=0,t=0; for(let i=0;i<x.length;i+=4){ t++; if(Math.abs(x[i]-y[i])>8||Math.abs(x[i+3]-y[i+3])>8) n++ } return +(n/t).toFixed(3) };
     for(const id of ids){
       const it=A.byId[id]; if(!it){ r.items.push({id,missing:true}); continue }
       const spec=A.specForItem(it);
       const withSoul=A.compose(spec,2,12);
       const noSoul=A.compose(Object.assign({},spec,{soul:null}),2,12);
       r.items.push({ id, hasSoul:!!spec.soul, soulPos:spec.soul?spec.soul.pos:null, setShader:spec.setShader||null,
                      soulContribution: spec.soul?diff(withSoul,noSoul):0, anim:A.hasAnim(it) });
     }
     r.overlayItems=A.items.filter(i=>i.cat==='Overlay').map(i=>i.id);
     r.soulCarriers=A.data.composition.soulCarriers.map(c=>c.key);
     // the soul sprite must differ from the base card, and shader programs must include the new ones
     r.programs=A.shaderPrograms;
     return r })()`,
  forgeTypes: `(async()=>{
     await __V.wait(1500);
     await __V.click('.cat','卡牌合成台',2600);
     const sel=document.querySelector('#content .opt[data-gkey="basetype"] select');
     const r={view:'forgeTypes', options:[].slice.call(sel.options).map(o=>o.value)};
     const paint=()=>{const cv=document.querySelector('.preview canvas'); return cv?__V.hash(cv):0};
     const walks=[];
     for(const t of ['Joker','Spectral','Voucher','Booster','Tarot','Collab','PlayingCard']){
       sel.value=t; sel.dispatchEvent(new Event('change')); await __V.wait(2200);
       const opts=[].slice.call(document.querySelectorAll('.opt'));
       const grp=(re)=>opts.filter(o=>o.querySelector('h4')&&re.test(o.querySelector('h4').textContent))[0];
       const sealBox=document.querySelector('#content .opt[data-gkey="seal"]'), stickBox=document.querySelector('#content .opt[data-gkey="stick"]');
       const disabled=(box)=>box?[].slice.call(box.querySelectorAll('.pick')).every(b=>b.disabled):null;
       walks.push({ type:t, hash:paint(), baseChips:document.querySelectorAll('#content .opt[data-gkey="base"] .pick').length,
                    sealDisabled:disabled(sealBox), stickerDisabled:disabled(stickBox) });
     }
     r.walks=walks;
     r.distinctTypes=new Set(walks.map(w=>w.hash)).size;
     r.canvas=__V.blank();
     return r })()`,
  animExport: `(async()=>{
     await __V.wait(1500);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const r={view:'animExport'};
     // 1) APNG of a foil card
     const spec=A.specForItem(A.byId['j_joker']);
     const foil=Object.assign({},spec,{edition:'e_foil'});
     const frames=[]; for(let i=0;i<12;i++) frames.push(A.compose(foil,1,i/10));
     const bytes=await A.encodeAPNG(frames,80);
     r.apngSize=bytes?bytes.length:0;
     r.apngSig=[].slice.call(bytes.slice(0,8));
     // parse chunk list to prove APNG structure
     const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
     const chunks=[]; let p=8; while(p+8<=bytes.length){ const len=dv.getUint32(p); const type=String.fromCharCode(bytes[p+4],bytes[p+5],bytes[p+6],bytes[p+7]); chunks.push(type+':'+len); p+=12+len; if(type==='IEND')break }
     r.chunks=chunks;
     r.hasActl=chunks.some(c=>c.startsWith('acTL'));
     r.fctl=chunks.filter(c=>c.startsWith('fcTL')).length;
     r.fdat=chunks.filter(c=>c.startsWith('fdAT')).length;
     // 2) frames really differ
     const h=frames.map(f=>__V.hash(f));
     r.frameDistinct=new Set(h).size;
     // 3) blind 21-frame animation
     const blind=A.byId['bl_small'];
     const bf=[]; for(let i=0;i<21;i++) bf.push(A.compose({standalone:{atlas:'blind_chips',pos:{x:i,y:blind.pos.y}}},1,0));
     r.blindDistinct=new Set(bf.map(f=>__V.hash(f))).size;
     // 4) UI export buttons exist
     A.state.tab='codex'; A.state.cat='Joker'; A.state.q='caino'; A.render();
     await __V.wait(1200);
     document.querySelector('.cell').click(); await __V.wait(1600);
     r.detailButtons=[].slice.call(document.querySelectorAll('#detail .btn')).map(b=>b.textContent.trim());
     const apngBtn=[].slice.call(document.querySelectorAll('#detail .btn')).filter(b=>/APNG/.test(b.textContent))[0];
     if(apngBtn){ apngBtn.click(); await __V.wait(6000) }
     const gifBtn=[].slice.call(document.querySelectorAll('#detail .btn')).filter(b=>/GIF/.test(b.textContent))[0];
     if(gifBtn){ gifBtn.click(); await __V.wait(9000) }
     r.blobs=await window.__GRAB__();
     return r })()`,
  showcase: `(async()=>{
     await __V.wait(1600);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const ids=['j_caino','j_triboulet','j_yorick','j_chicot','j_perkeo','j_hologram','c_soul','c_black_hole','v_hone','p_buffoon_mega_1'];
     const host=document.createElement('div');
     host.id='showcase';
     host.style.cssText='position:fixed;inset:0;z-index:9999;background:#12181e;padding:24px;overflow:auto;display:flex;flex-wrap:wrap;gap:22px;align-content:flex-start';
     const mk=(label,cv,sub)=>{
       const box=document.createElement('div'); box.style.cssText='text-align:center';
       const holder=document.createElement('div');
       holder.style.cssText='padding:12px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
       cv.style.cssText='display:block;image-rendering:pixelated';
       holder.appendChild(cv); box.appendChild(holder);
       const t=document.createElement('div'); t.style.cssText='color:#dfe7ee;font-size:12px;margin-top:8px'; t.textContent=label; box.appendChild(t);
       if(sub){const s=document.createElement('div');s.style.cssText='color:#6d7d8d;font-size:10.5px';s.textContent=sub;box.appendChild(s)}
       return box;
     };
     for(const id of ids){
       const it=A.byId[id]; if(!it) continue;
       const cv=A.compose(A.specForItem(it),3,12);
       cv.style.width='142px'; cv.style.height='auto';
       host.appendChild(mk(it.name, cv, id+(it.soul?' · 含悬浮立绘':'')+(it.setShader?' · '+it.setShader:'') ));
     }
     // seal + sticker composites
     const base={center:{atlas:'centers',pos:A.data.composition.baseCenter.pos},front:{atlas:'cards_1',pos:{x:12,y:3}}};
     for(const s of ['Gold','Red','Blue','Purple']){
       const cv=A.compose(Object.assign({},base,{seal:s}),3,12); cv.style.width='142px'; cv.style.height='auto';
       host.appendChild(mk(s+' Seal', cv, '扑克牌 + 蜡封'));
     }
     for(const s of ['eternal','perishable','rental','White','Gold']){
       const cv=A.compose({center:{atlas:'Joker',pos:{x:0,y:0}},sticker:s},3,12); cv.style.width='142px'; cv.style.height='auto';
       host.appendChild(mk(s+' Sticker', cv, '小丑牌 + 贴纸'));
     }
     document.body.appendChild(host);
     await __V.wait(600);
     return {view:'showcase', tiles:host.children.length};
  })()`,
  shaderProbe: `(async()=>{
     await __V.wait(1500);
     const A=window.__BALATRO__;
     const live=A.data.shaders.filter(s=>s.live).map(s=>s.name);
     const out=[];
     for(const n of live){
       const c=A.shaderPreview(n);
       const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
       let nz=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) nz++;
       const h=__V.hash(c);
       out.push({name:n, opaquePct:+(nz/(c.width*c.height)).toFixed(3), hash:h});
     }
     const distinct=new Set(out.map(o=>o.hash)).size;
     return {view:'shaderProbe', previews:out, distinct:distinct};
  })()`,
  allItems: `(async()=>{
     await __V.wait(2000);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const blank=[], missing=[], cats={};
     for(const it of A.items){
       const spec=A.specForItem(it);
       if(!spec){ missing.push(it.id); cats[it.cat+':nospec']=(cats[it.cat+':nospec']||0)+1; continue }
       let cv;
       try{ cv=A.compose(spec,2,12) }catch(e){ blank.push(it.id+'(throw:'+e.message.slice(0,40)+')'); continue }
       const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
       let nz=0; for(let i=3;i<d.length;i+=4){ if(d[i]>8){ nz++; if(nz>40) break } }
       if(nz<=40){ blank.push(it.id+' ['+it.cat+'->'+it.atlas+']'); cats[it.cat]=(cats[it.cat]||0)+1 }
     }
     return { view:'allItems', total:A.items.length, blankCount:blank.length, blank:blank.slice(0,40),
              blankByCat:cats, noSpec:missing.length, noSpecSample:missing.slice(0,10) };
  })()`,
  apngTest: `(async()=>{
     await __V.wait(1500);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const r={view:'apngTest'};
     const b64=(u8)=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
     // 1) tiny two-frame APNG with obviously different colours
     const mk=(col)=>{const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,64,64);return c};
     const tiny=await A.encodeAPNG([mk('#ff0000'),mk('#0000ff')],200);
     r.tinySize=tiny.length; r.tinyB64=b64(tiny);
     // 2) do the j_caino frames actually differ?
     const spec=A.specForItem(A.byId['j_caino']);
     const fr=[]; for(let i=0;i<6;i++) fr.push(A.compose(spec,2,i/20));
     r.cainoHashes=fr.map(f=>__V.hash(f));
     r.cainoDistinct=new Set(r.cainoHashes).size;
     // 3) same for a foil card
     const foil=Object.assign({},A.specForItem(A.byId['j_joker']),{edition:'e_foil'});
     const ff=[]; for(let i=0;i<6;i++) ff.push(A.compose(foil,2,i/20));
     r.foilDistinct=new Set(ff.map(f=>__V.hash(f))).size;
     // 4) full UI export for comparison
     const full=await A.encodeAPNG(fr,50);
     r.fullSize=full.length;
     return r })()`,
  gif3d: `(async()=>{
     await __V.wait(1600);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const r={view:'gif3d'};
     const b64=(u8)=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
     // ---- GIF (transparent) ----
     const spec=Object.assign({},A.specForItem(A.byId['j_caino']));
     const fr=[]; for(let i=0;i<16;i++) fr.push(A.compose(spec,1,i/16));
     r.frameDistinct=new Set(fr.map(f=>__V.hash(f))).size;
     const gifT=A.encodeGIF(fr,60,null);
     r.gifTransparentSize=gifT.length; r.gifTransparentB64=b64(gifT);
     r.gifMagic=String.fromCharCode(gifT[0],gifT[1],gifT[2],gifT[3],gifT[4],gifT[5]);
     // ---- GIF (dark background) ----
     const gifB=A.encodeGIF(fr,60,[18,24,30]);
     r.gifDarkSize=gifB.length; r.gifDarkB64=b64(gifB);
     // ---- GIF of a foil card (heavy gradients -> exercises quantisation) ----
     const foil=[]; const fspec=Object.assign({},A.specForItem(A.byId['j_joker']),{edition:'e_foil'});
     for(let i=0;i<16;i++) foil.push(A.compose(fspec,1,i/16));
     const gifF=A.encodeGIF(foil,60,null);
     r.gifFoilSize=gifF.length; r.gifFoilB64=b64(gifF);
     // ---- the 3D preview was removed: the original game has no multi-angle view ----
     r.hasTilt = typeof A.tiltRender;
     return r })()`,
  stickers: `(async()=>{
     await __V.wait(1600);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const r={view:'stickers'};
     const base=(o)=>A.compose(Object.assign({center:{atlas:"Joker",pos:{x:0,y:0}}},o),2,12);
     const combos={none:[],eternal:["eternal"],perishable:["perishable"],rental:["rental"],
                   eternal_rental:["eternal","rental"],perishable_rental:["perishable","rental"],
                   eternal_rental_gold:["eternal","rental","Gold"],
                   eternal_perishable_rental_gold:["eternal","perishable","rental","Gold"]};
     const canvases={}; r.combos={};
     for(const k of Object.keys(combos)){ canvases[k]=base({stickers:combos[k]}); r.combos[k]=__V.hash(canvases[k]) }
     r.distinctCombos=new Set(Object.values(r.combos)).size;
     r.comboTotal=Object.keys(combos).length;
     r.deltaVsNone={}; for(const k of Object.keys(combos)) if(k!=="none") r.deltaVsNone[k]=__V.diff(canvases.none,canvases[k]);
     r.eternalVsPerishable=__V.diff(canvases.eternal,canvases.perishable);
     // eternal and perishable are painted into the same slot on the card — which is
     // exactly why the game forbids them from coexisting.
     const tiles={}; for(const k of ["eternal","perishable","rental","Gold","White"]){
       const t=A.tileLayer({atlas:"stickers",pos:A.data.composition.stickerPos[k]},142,190); tiles[k]=__V.bbox(t) }
     r.slots={ tiles, sameSlotEternalPerishable: !!(tiles.eternal&&tiles.perishable&&tiles.eternal.x0===tiles.perishable.x0&&tiles.eternal.y0===tiles.perishable.y0),
                rentalSeparate: !!(tiles.rental&&tiles.eternal&&tiles.rental.y0!==tiles.eternal.y0),
                colouredSeparate: !!(tiles.Gold&&tiles.eternal&&(tiles.Gold.x0!==tiles.eternal.x0)) };
     // per-sticker pixel contribution
     r.perStickerDelta={};
     for(const k of ["eternal","perishable","rental","White","Gold"]) r.perStickerDelta[k]=__V.diff(canvases.none, base({stickers:[k]}));
     // UI: multi-select with eternal/perishable as a radio pair
     A.state.tab="forge"; A.state.forge.baseType="Joker"; A.state.forge.base="j_joker";
     A.state.forge.stickers={eternal:true,perishable:false,rental:false,color:""}; A.render();
     await __V.wait(2400);
     const opts=[].slice.call(document.querySelectorAll(".opt"));
     const box=opts.filter(o=>o.querySelector("h4")&&/贴纸/.test(o.querySelector("h4").textContent))[0];
     r.stickerBoxFound=!!box;
     if(box){
       const flags=[].slice.call(box.querySelectorAll(".pick[data-kind=flag]"));
       r.flagChips=flags.map(b=>b.dataset.key);
       const et=flags.find(b=>b.dataset.key==="eternal"), pe=flags.find(b=>b.dataset.key==="perishable");
       r.initial={eternal:et.classList.contains("on"),perishable:pe.classList.contains("on")};
       pe.click(); await __V.wait(350);
       r.afterPerishableClick={eternalOn:et.classList.contains("on"), perishableOn:pe.classList.contains("on")};
       et.click(); await __V.wait(350);
       r.afterEternalClick={eternalOn:et.classList.contains("on"), perishableOn:pe.classList.contains("on")};
       const gold=[].slice.call(box.querySelectorAll(".pick[data-kind=color]")).find(b=>b.dataset.key==="Gold");
       gold.click(); await __V.wait(350);
       r.goldOn=gold.classList.contains("on");
       // rental must be able to coexist with the flag + colour
       const re=flags.find(b=>b.dataset.key==="rental"); re.click(); await __V.wait(350);
       r.finalState=JSON.parse(JSON.stringify(A.state.forge.stickers));
       const rentalHash=__V.hash(document.querySelector(".preview canvas"));
       re.click(); await __V.wait(350);
       r.rentalChangesPreview = rentalHash !== __V.hash(document.querySelector(".preview canvas"));
     }
     return r })()`,
  stickerProbe: `(async()=>{
     await __V.wait(1600);
     const A=window.__BALATRO__;
     const out={};
     const C={center:{atlas:"Joker",pos:{x:0,y:0}}};
     out.tiles={};
     for(const k of ["eternal","perishable","rental","Gold","White","Red","Blue","Purple","Orange","Green","Black"]){
       const t=A.tileLayer({atlas:"stickers",pos:A.data.composition.stickerPos[k]},142,190);
       const d=t.getContext("2d").getImageData(0,0,142,190).data;
       let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) n++;
       out.tiles[k]={pos:A.data.composition.stickerPos[k], nonzeroPixels:n, bbox:__V.bbox(t)};
     }
     const shot=(arr)=>A.compose(Object.assign({},C,{stickers:arr}),2,12);
     const seq=[["none",[]],["eternal",["eternal"]],["eternal+rental",["eternal","rental"]],
                ["eternal+rental+Gold",["eternal","rental","Gold"]]];
     out.chain=[]; let prev=null;
     for(const [label,arr] of seq){ const cv=shot(arr);
       out.chain.push({label, hash:__V.hash(cv), stepDiff: prev?__V.diff(prev,cv):null}); prev=cv }
     out.stickerCount=Object.keys(A.data.composition.stickerPos).length;
     return out })()`,
  loops: `(async()=>{
     await __V.wait(1600);
     const A=window.__BALATRO__;
     if(!A) return {fatal:'no handle'};
     const r={view:'loops'};
     const probe=(label,spec)=>{
       const out={label};
       for(const pp of [true,false]){
         const f=A.buildAnimFrames(spec,1,{speed:4,seconds:2.5,pingpong:pp}).frames;
         const m=A.loopSeamRatio(f);
         out[pp?"pingpong":"forward"]={frames:f.length, seam:+m.seam.toFixed(5), avg:+m.avg.toFixed(5), ratio:+m.ratio.toFixed(2)};
       }
       const slow=A.buildAnimFrames(spec,1,{speed:1,seconds:2.5,pingpong:true}).frames;
       out.speed1AvgStep=+A.loopSeamRatio(slow).avg.toFixed(5);
       return out;
     };
     r.caino=probe("j_caino float", A.specForItem(A.byId["j_caino"]));
     r.foil=probe("foil", Object.assign({},A.specForItem(A.byId["j_joker"]),{edition:"e_foil"}));
     r.holo=probe("holo", Object.assign({},A.specForItem(A.byId["j_joker"]),{edition:"e_holo"}));
     r.soul=probe("The Soul", A.specForItem(A.byId["c_soul"]));
     const ff=A.buildAnimFrames(Object.assign({},A.specForItem(A.byId["j_joker"]),{edition:"e_foil"}),1,{speed:4,seconds:2.5,pingpong:false}).frames;
     const d=(a,b)=>{const x=a.getContext("2d").getImageData(0,0,a.width,a.height).data,y=b.getContext("2d").getImageData(0,0,b.width,b.height).data;let s=0;for(let i=0;i<x.length;i+=4)s+=Math.abs(x[i]-y[i]);return +(s/(x.length/4*255)).toFixed(4)};
     r.foilTravel={startToMid:d(ff[0],ff[Math.floor(ff.length/2)]), startToEnd:d(ff[0],ff[ff.length-1])};
     return r })()`,
  mobile: `(async()=>{
     await __V.wait(2000);
     const r={view:"mobile"};
     r.viewport={w:innerWidth,h:innerHeight};
     r.navToggleVisible=(()=>{const b=document.getElementById("navToggle");return !!b && getComputedStyle(b).display!=="none"})();
     r.sidebarOffscreen=(()=>document.getElementById("sidebar").getBoundingClientRect().left < 0)();
     document.getElementById("navToggle").click();
     await __V.wait(600);
     r.navOpen=document.body.classList.contains("nav-open");
     r.sidebarOnScreen=(()=>{const b=document.getElementById("sidebar").getBoundingClientRect();return b.left>=-2 && b.right<=innerWidth+2})();
     r.backdropOpacity=getComputedStyle(document.getElementById("backdrop")).opacity;
     const c=[].slice.call(document.querySelectorAll(".cat")).filter(e=>e.textContent.indexOf("小丑牌")>=0)[0];
     c.click(); await __V.wait(1500);
     r.navClosedAfterPick=!document.body.classList.contains("nav-open");
     r.cells=document.querySelectorAll(".cell").length;
     document.querySelector(".cell").click(); await __V.wait(1600);
     r.detailOpen=document.body.classList.contains("detail-open");
     r.detailOnScreen=(()=>{const b=document.getElementById("detail").getBoundingClientRect();return b.left<innerWidth && b.width>0})();
     r.closeBtnVisible=(()=>{const b=document.getElementById("detailClose");return !!b && getComputedStyle(b).display!=="none"})();
     const cb=document.getElementById("detailClose"); if(cb){cb.click(); await __V.wait(700)}
     r.detailClosedAfterX=!document.body.classList.contains("detail-open");
     r.docWidth=document.documentElement.scrollWidth;
     r.noHScroll=document.documentElement.scrollWidth <= innerWidth+2;
     const A=window.__BALATRO__; A.state.tab="forge"; A.render(); await __V.wait(2400);
     r.forgeCols=getComputedStyle(document.querySelector(".forge")).gridTemplateColumns.split(" ").length;
     r.forgeLayout=getComputedStyle(document.querySelector(".forge")).display;
     r.forgeBar=(()=>{const b=document.querySelector(".pvtop");if(!b)return null;const r0=b.getBoundingClientRect();return {h:Math.round(r0.height),pos:getComputedStyle(b).position,share:+(r0.height/innerHeight).toFixed(2)}})();
     r.forgeHeavyBelowOpts=(()=>{const o=document.querySelector(".forge .opts").getBoundingClientRect().top;return ["summary","export","anim"].every(k=>document.querySelector('#content .opt[data-gkey="'+k+'"]').getBoundingClientRect().top>=o-2)})();
     r.oversizedControls=[].slice.call(document.querySelectorAll("#topbar .tbtn, #topbar select, .forge .btn")).filter(e=>e.getBoundingClientRect().width>innerWidth).length;
     r.toolbarScrollable=(()=>{const t=document.querySelector(".tbtools");return t.scrollWidth>=t.clientWidth})();
     // --- forge on a phone: the preview must stay in view and the groups must be collapsible
     A.state.tab='forge'; A.state.forge.open=null; A.render(); await __V.wait(2600);
     const fc=document.querySelector('#content');
     const opts=()=>[].slice.call(document.querySelectorAll('#content .opt[data-gkey]'));
     r.forge={ sticky:getComputedStyle(document.querySelector('.forge .preview')).position,
               navSticky:getComputedStyle(document.querySelector('.forgenav')).position,
               collapsedAtStart:opts().filter(e=>e.classList.contains('collapsed')).map(e=>e.dataset.gkey),
               groups:opts().length, heightStart:fc.scrollHeight, cols:getComputedStyle(document.querySelector('.forge')).gridTemplateColumns,
               canvasW:Math.round((document.querySelector('.preview canvas')||{getBoundingClientRect:()=>({width:0})}).getBoundingClientRect().width) };
     __V.byText('.forgenav .nv','全部展开').click(); await __V.wait(900);
     r.forge.heightExpanded=fc.scrollHeight;
     __V.byText('.forgenav .nv','收起').click(); await __V.wait(700);
     r.forge.heightCollapsed=fc.scrollHeight;
     __V.byText('.forgenav .nv','牌型').click(); await __V.wait(700);
     r.forge.afterNavClick=opts().filter(e=>!e.classList.contains('collapsed')).map(e=>e.dataset.gkey);
     r.forge.oversized=fc.scrollWidth>innerWidth+2;
     r.canvas=__V.blank();
     r.errors=window.__V.errors;
     return r })()`,
  soulArt: `(async()=>{
     await __V.wait(1600);
     const A=window.__BALATRO__;
     if(!A) return {fatal:"no handle"};
     const r={view:"soulArt"};
     const W=142,H=190;
     // orientation of the floating art via second moments of the difference mask
     const orient=(a,b)=>{
       const da=a.getContext("2d").getImageData(0,0,W,H).data;
       const db=b.getContext("2d").getImageData(0,0,W,H).data;
       let n=0,sx=0,sy=0,m20=0,m02=0,m11=0;
       for(let y=0;y<H;y++)for(let x=0;x<W;x++){
         const i=(y*W+x)*4;
         const d=Math.abs(da[i]-db[i])+Math.abs(da[i+1]-db[i+1])+Math.abs(da[i+2]-db[i+2])+Math.abs(da[i+3]-db[i+3]);
         if(d>60){ n++; sx+=x; sy+=y }
       }
       if(!n) return null;
       const cx=sx/n, cy=sy/n;
       for(let y=0;y<H;y++)for(let x=0;x<W;x++){
         const i=(y*W+x)*4;
         const d=Math.abs(da[i]-db[i])+Math.abs(da[i+1]-db[i+1])+Math.abs(da[i+2]-db[i+2])+Math.abs(da[i+3]-db[i+3]);
         if(d>60){ const dx=x-cx, dy=y-cy; m20+=dx*dx; m02+=dy*dy; m11+=dx*dy }
       }
       m20/=n; m02/=n; m11/=n;
       const theta=0.5*Math.atan2(2*m11, m20-m02);
       return { deg:+(theta*180/Math.PI).toFixed(3), px:n };
     };
     // base card alone (no floating layer) is the reference
     const caino=A.specForItem(A.byId["j_caino"]);
     const baseOnly=A.compose(Object.assign({},caino,{soul:null}),2,0);
     r.orient={};
     for(const t of [0, 1.288, 3.865]){
       const withSoul=A.compose(caino,2,t);
       r.orient["t="+t]=orient(withSoul,baseOnly);
     }
     // expected rotations: 0.05*sin(1.219t) radians
     r.expectedDeg={};
     for(const t of [0,1.288,3.865]) r.expectedDeg["t="+t]=+(0.05*Math.sin(1.219*t)*180/Math.PI).toFixed(3);
     // drop shadow: near-black pixels that the base card did not have
     const withSoul=A.compose(caino,2,0);
     const dw=withSoul.getContext("2d").getImageData(0,0,W,H).data;
     const db=baseOnly.getContext("2d").getImageData(0,0,W,H).data;
     // render the same card without the shadow pass and diff, so the shadow is isolated
     const noShadow=A.compose(Object.assign({},caino,{soulNoShadow:true}),2,0);
     const ns=noShadow.getContext("2d").getImageData(0,0,W,H).data;
     let shPx=0, shSumY=0, artPx=0, artSumY=0, maxD=0;
     for(let y=0;y<H;y++)for(let x=0;x<W;x++){
       const i=(y*W+x)*4;
       const d=Math.abs(dw[i]-ns[i])+Math.abs(dw[i+1]-ns[i+1])+Math.abs(dw[i+2]-ns[i+2])+Math.abs(dw[i+3]-ns[i+3]);
       if(d>12){ shPx++; shSumY+=y; if(d>maxD)maxD=d }
       const e=Math.abs(ns[i]-db[i])+Math.abs(ns[i+1]-db[i+1])+Math.abs(ns[i+2]-db[i+2])+Math.abs(ns[i+3]-db[i+3]);
       if(e>60){ artPx++; artSumY+=y }
     }
     r.shadow={ pixelsDiffFromNoShadow:shPx, meanY: shPx? +(shSumY/shPx).toFixed(1):null,
                artPixels:artPx, artMeanY: artPx? +(artSumY/artPx).toFixed(1):null, maxDelta:maxD };
     r.shadowBelowArtwork = !!(shPx && artPx && (shSumY/shPx) > (artSumY/artPx));
     r.diffWithShadow=__V.diff(withSoul,noShadow);
     // expected shadow offset at t=0: 0.1 world units = 0.1*190/2.7512 px
     r.expectedShadowOffsetPx=+(0.1*H/2.7512).toFixed(2);
     // the composed art must be bigger than the raw tile (scale_mod 0.07)
     const soulTile=A.tileLayer(caino.soul,142,190);
     const bboxOf=(cv)=>{const d=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data;
       let x0=1e9,y0=1e9,x1=-1,y1=-1;
       for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){ if(d[(y*cv.width+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y } }
       return x1<0?null:{w:x1-x0+1,h:y1-y0+1};};
     r.soulTileBox=bboxOf(soulTile);
     r.soulScaledBox=bboxOf(A.compose({center:{atlas:"centers",pos:A.data.composition.baseCenter.pos},soul:caino.soul},2,0));
     // phase 0 must be the neutral pose for every carrier
     r.neutral={};
     for(const id of ["j_caino","j_triboulet","j_yorick","j_chicot","j_perkeo","j_hologram","c_soul"]){
       const it=A.byId[id]; const sp=A.specForItem(it);
       const a=A.compose(sp,2,0); const b=A.compose(sp,2,1.288);
       r.neutral[id]=__V.diff(a,b);
     }
     return r })()`,
  forgeSummary: `(async()=>{
     await __V.wait(1600);
     const A=window.__BALATRO__;
     const r={view:"forgeSummary"};
     A.state.tab="forge"; A.state.forge.baseType="PlayingCard"; A.state.forge.base="S_A";
     A.state.forge.enhancement="m_glass"; A.state.forge.edition="e_foil"; A.state.forge.seal="Gold";
     A.state.forge.stickers={eternal:false,perishable:false,rental:false,color:""};
     A.render(); await __V.wait(2400);
     const read=()=>{ const box=document.querySelector(".pvsummary"); if(!box) return null;
       return [].slice.call(box.querySelectorAll("tr")).map(tr=>[tr.children[0].textContent, tr.children[1].textContent]) };
     r.rowsCard=read();
     r.hasHeader=!!document.querySelector('#content .opt[data-gkey="summary"] h4');
     // switch to a legendary joker and check the panel follows
     A.state.forge.baseType="Joker"; A.state.forge.base="j_perkeo";
     A.state.forge.stickers={eternal:true,perishable:false,rental:true,color:"Gold"};
     A.render(); await __V.wait(2400);
     r.rowsJoker=read();
     // and it must update live when a chip is clicked
     const opts=[].slice.call(document.querySelectorAll(".opt"));
     const ed=opts.filter(o=>o.querySelector("h4")&&/版本/.test(o.querySelector("h4").textContent))[0];
     const none=[].slice.call(ed.querySelectorAll(".pick")).filter(b=>/无/.test(b.textContent))[0];
     none.click(); await __V.wait(600);
     r.rowsAfterNoEdition=read();
     const box=document.querySelector(".pvsummary");
     r.summaryInsidePreviewColumn=!!(box && box.closest(".preview"));
     r.summaryWidth=box?Math.round(box.getBoundingClientRect().width):0;
     r.canvas=__V.blank();
     return r })()`,
  soulCompare: `(async()=>{
     await __V.wait(1800);
     const A=window.__BALATRO__;
     if(!A) return {fatal:"no handle"};
     const r={view:"soulCompare"};
     const host=document.createElement("div");
     host.id="soulcmp";
     host.style.cssText="position:fixed;inset:0;z-index:9999;background:#12181e;padding:26px;overflow:auto;display:flex;gap:26px;align-items:flex-start";
     const mk=(label,cv,sub)=>{
       const box=document.createElement("div"); box.style.cssText="text-align:center";
       const h=document.createElement("div");
       h.style.cssText="padding:14px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px";
       cv.style.cssText="display:block;image-rendering:pixelated";
       h.appendChild(cv); box.appendChild(h);
       const t=document.createElement("div"); t.style.cssText="color:#dfe7ee;font-size:13px;margin-top:9px;font-weight:600"; t.textContent=label; box.appendChild(t);
       const s2=document.createElement("div"); s2.style.cssText="color:#6d7d8d;font-size:11px"; s2.textContent=sub||""; box.appendChild(s2);
       return box;
     };
     for(const id of ["j_caino","j_perkeo","c_soul"]){
       const it=A.byId[id];
       const sp=A.specForItem(it);
       const shadowsOn=A.compose(sp,3,0);
       const shadowsOff=A.compose(Object.assign({},sp,{soulNoShadow:true}),3,0);
       shadowsOn.style.width="150px"; shadowsOn.style.height="auto";
       shadowsOff.style.width="150px"; shadowsOff.style.height="auto";
       const col=document.createElement("div"); col.style.cssText="display:flex;gap:12px";
       col.appendChild(mk(it.name+" · 相位0（当前）", shadowsOn, "立绘摆正 + 原版投影"));
       col.appendChild(mk(it.name+" · 无投影对照", shadowsOff, "仅用于对比"));
       host.appendChild(col);
     }
     document.body.appendChild(host);
     await __V.wait(700);
     return {view:"soulCompare", tiles:host.children.length};
  })()`,
  cardBox: `(async()=>{
     await __V.wait(1800);
     const A=window.__BALATRO__;
     if(!A) return {fatal:"no handle"};
     const r={view:"cardBox"};
     const bbox=(cv)=>{const d=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data;
       let x0=1e9,y0=1e9,x1=-1,y1=-1;
       for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){ if(d[(y*cv.width+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y } }
       return x1<0?null:{w:x1-x0+1,h:y1-y0+1};};
     r.items={};
     const ids=["j_joker","j_wee","j_half","j_photograph","j_square","j_caino","p_buffoon_normal_1","p_arcana_mega_1","c_fool"];
     for(const id of ids){
       const it=A.byId[id]; if(!it) continue;
       const sp=A.specForItem(it);
       const on=A.compose(sp,2,0);
       const off=A.compose(Object.assign({},sp,{box:null}),2,0);
       r.items[id]={box:it.box||null, boxed:bbox(on), raw:bbox(off), diff:__V.diff(on,off)};
     }
     // expected fractions
     r.expected={ "j_wee":"0.700 x 0.700", "j_half":"1.000 x 0.588", "j_photograph":"1.000 x 0.833",
                  "j_square":"1.000 x 0.745", "p_buffoon_normal_1":"1.270 x 1.270", "j_joker":"1.000 x 1.000" };
     // the raw-size toggle must restore the full box
     A.state.rawSize=true;
     const wee=A.byId["j_wee"];
     r.rawToggle={ boxedWithToggle: bbox(A.compose(A.specForItem(wee),2,0)) };
     A.state.rawSize=false;
     r.rawToggle.boxedWithoutToggle=bbox(A.compose(A.specForItem(wee),2,0));
     // animation settings are exposed
     r.anim={fps:A.state.anim.fps, speed:A.state.anim.speed, seconds:A.state.anim.seconds, pingpong:A.state.anim.pingpong};
     const fr=A.buildAnimFrames(A.specForItem(A.byId["j_joker"]),1,{fps:20,speed:4,seconds:2.5,pingpong:true});
     r.framesAt20={n:fr.frames.length, delay:fr.delay};
     const fr30=A.buildAnimFrames(A.specForItem(A.byId["j_joker"]),1,{fps:30,speed:4,seconds:2.5,pingpong:true});
     r.framesAt30={n:fr30.frames.length, delay:fr30.delay};
     const frSlow=A.buildAnimFrames(A.specForItem(A.byId["j_joker"]),1,{fps:20,speed:0.5,seconds:2.5,pingpong:true});
     r.framesAtHalfSpeed={n:frSlow.frames.length, delay:frSlow.delay};
     return r })()`,
  boxCompare: `(async()=>{
     await __V.wait(1800);
     const A=window.__BALATRO__;
     if(!A) return {fatal:"no handle"};
     const host=document.createElement("div");
     host.id="boxcmp";
     host.style.cssText="position:fixed;inset:0;z-index:9999;background:#12181e;padding:24px;overflow:auto;display:flex;flex-wrap:wrap;gap:20px;align-content:flex-start";
     const mk=(label,cv,sub)=>{
       const box=document.createElement("div"); box.style.cssText="text-align:center";
       const h=document.createElement("div");
       h.style.cssText="padding:12px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px;display:flex;align-items:flex-end;min-height:230px";
       cv.style.cssText="display:block;image-rendering:pixelated;margin:auto";
       h.appendChild(cv); box.appendChild(h);
       const t=document.createElement("div"); t.style.cssText="color:#dfe7ee;font-size:12px;margin-top:8px;font-weight:600"; t.textContent=label; box.appendChild(t);
       const s2=document.createElement("div"); s2.style.cssText="color:#6d7d8d;font-size:10.5px"; s2.textContent=sub||""; box.appendChild(s2);
       return box;
     };
     const ids=["j_joker","j_wee","j_half","j_photograph","j_square","p_buffoon_normal_1"];
     A.state.rawSize=false;
     for(const id of ids){
       const it=A.byId[id]; if(!it) continue;
       const onRaw=A.compose(Object.assign({},A.specForItem(it),{box:null}),3,0);
       const on=A.compose(A.specForItem(it),3,0);
       onRaw.style.width="120px"; onRaw.style.height="auto";
       on.style.width=(120*on.width/onRaw.width)+"px"; on.style.height="auto";
       const col=document.createElement("div"); col.style.cssText="display:flex;gap:10px;align-items:flex-end";
       col.appendChild(mk(it.name+" 原版尺", on, it.box? "box "+it.box.w.toFixed(3)+" x "+it.box.h.toFixed(3) : "默认"));
       col.appendChild(mk(it.name+" 原始贴图", onRaw, "142x190"));

       host.appendChild(col);
     }
     document.body.appendChild(host);
     await __V.wait(700);
     return {view:"boxCompare", groups:host.children.length};
  })()`,
  export: `(async()=>{
     await __V.wait(1800);
     const r={};
     r.clicked=await __V.click('.cat','蜡封',1500);
     r.cells=document.querySelectorAll('.cell').length;
     const c0=document.querySelector('.cell');
     if(!c0) return Object.assign(r,{fatal:'点击「蜡封」后没有条目格子', tab:(window.__BALATRO__&&window.__BALATRO__.state||{}).tab, hash:location.hash});
     c0.click(); await __V.wait(1500);
     const btns=[].slice.call(document.querySelectorAll('#detail .btn'));
     r.detailBtns=btns.map(b=>b.textContent.trim());
     const png=btns.filter(b=>/PNG 2x/.test(b.textContent))[0]; if(png){png.click(); await __V.wait(1800)}
     const zip=btns.filter(b=>/单张 ZIP/.test(b.textContent))[0]; if(zip){zip.click(); await __V.wait(1800)}
     const svg=btns.filter(b=>/SVG/.test(b.textContent))[0]; if(svg){svg.click(); await __V.wait(1800)}
     await __V.wait(500);
     const bulk=__V.byText('.listhead .tbtn','导出当前结果'); if(bulk){bulk.click(); await __V.wait(4000)}
     await __V.click('.cat','数据总表',1500);
     const csv=__V.byText('.listhead .tbtn','CSV'); if(csv){csv.click(); await __V.wait(2000)}
     const json=__V.byText('.listhead .tbtn','JSON'); if(json){json.click(); await __V.wait(2000)}
     const md=__V.byText('.listhead .tbtn','Markdown'); if(md){md.click(); await __V.wait(2000)}
     r.done=true;
     r.blobs=await window.__GRAB__();
     return r })()`,
  modImport: `(async()=>{
    const r = {};
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    r.baseline = { items: B.items.length, atlases: Object.keys(B.atlases).length };

    // ---- the panel exists and is reachable from the sidebar
    B.state.tab = 'mods'; B.render();
    await __V.wait(300);
    r.panel = { drop: !!document.querySelector('#modDrop'), pickDir: !!document.querySelector('#modPickDir'), log: !!document.querySelector('#modLogBox') };
    r.panelShot = true;

    // ---- 1) folder import
    const folder = await B.importBatch(mkFiles(TM.folder), 'TestMod');
    r.folder = folder && { ok: folder.ok, items: folder.items, atlases: folder.atlases, id: folder.mod.id, prefix: folder.mod.prefix, warnings: folder.mod.warnings.length, stats: folder.mod.stats };
    await __V.wait(400);
    r.afterFolder = { items: B.items.length, mods: B.mods.length, atlases: Object.keys(B.atlases).length };
    r.modItems = B.items.filter((i) => i.source === 'testmod').length;

    // ---- 2) every mod entry must paint something (or be a knowingly artless one)
    const painted = { ok: 0, blank: [], noArt: [] };
    for (const it of B.items.filter((i) => i.source === 'testmod')) {
      const sp = B.specForItem(it);
      if (!sp) { painted.noArt.push(it.id); continue }
      const cv = B.compose(sp, 2, 0);
      const box = __V.bbox(cv);
      if (box) painted.ok++; else painted.blank.push(it.id);
    }
    r.painted = painted;

    // ---- 3) sidebar shows the mod source + the new category
    const sbText = document.getElementById('sidebar').textContent;
    r.sidebar = { hasSource: sbText.indexOf('测试 Mod') >= 0, hasType: sbText.indexOf('Mod 新增类型') >= 0, hasMusical: sbText.indexOf('Musical') >= 0, hasTool: sbText.indexOf('导入 Mod') >= 0 };

    // ---- 4) filtering by source
    const srcBtn = __V.byText('#sidebar .cat', '测试 Mod');
    if (srcBtn) { srcBtn.click(); await __V.wait(500) }
    r.sourceView = { state: B.state.source, cells: document.querySelectorAll('#content .cell').length, head: (document.querySelector('.listhead h2')||{}).textContent };
    r.sourceBadges = document.querySelectorAll('#content .cell .modtag').length;

    // ---- 5) switching to the mod's own category
    const catBtn = __V.byText('#sidebar .cat', 'Musical');
    if (catBtn) { catBtn.click(); await __V.wait(500) }
    r.typeView = { cat: B.state.cat, cells: document.querySelectorAll('#content .cell').length, names: [].slice.call(document.querySelectorAll('#content .cell .nm')).map((e) => e.textContent) };

    // ---- 6) detail panel of a mod card
    B.state.tab = 'codex'; B.state.cat = 'all'; B.state.source = 'testmod'; B.render();
    await __V.wait(400);
    const alpha = document.querySelector('#content .cell[data-id="j_tm_alpha"]');
    if (alpha) { alpha.click(); await __V.wait(600) }
    const dt = document.getElementById('detail').textContent;
    r.detail = { open: B.state.sel, hasMod: dt.indexOf('MOD') >= 0, hasSource: dt.indexOf('测试 Mod') >= 0, hasFile: dt.indexOf('TestMod.lua') >= 0, title: (document.querySelector('#detail .dhead h3')||{}).textContent };

    // ---- 7) search operators see mod entries
    B.state.q = 'source:testmod'; B.state.source = 'all'; B.render();
    await __V.wait(400);
    r.search = { hits: document.querySelectorAll('#content .cell').length };
    B.state.q = 'cat:Musical'; B.render();
    await __V.wait(400);
    r.searchType = { hits: document.querySelectorAll('#content .cell').length };
    B.state.q = ''; B.state.cat = 'all'; B.render();
    await __V.wait(300);

    // ---- 8) categories that only exist because of the mod
    B.state.tab = 'mods'; B.render();
    await __V.wait(300);
    r.blankAfterAll = __V.blank();

    // ---- 9) remove, then re-import through the zip path
    B.removeMod('testmod');
    await __V.wait(500);
    r.afterRemove = { items: B.items.length, mods: B.mods.length, atlases: Object.keys(B.atlases).length };
    const zipFile = new File([u8(TM.zip)], 'TestMod.zip');
    Object.defineProperty(zipFile, '__rel', { value: 'TestMod.zip' });
    const zres = await B.importBatch([zipFile]);
    await __V.wait(500);
    r.zip = zres && { ok: zres.ok, items: zres.items, atlases: zres.atlases, root: zres.mod.root, id: zres.mod.id };
    r.afterZip = { items: B.items.length, mods: B.mods.length, atlases: Object.keys(B.atlases).length };

    // ---- 10) the mod atlas actually decodes to the pixels we put in it
    const a = B.atlases['mod_jokers'];
    r.modAtlas = a && { file: a.file, w: a.w, h: a.h, px: a.px, py: a.py, scale: a.scale, cols: a.cols, rows: a.rows, kind: a.kind };
    const noteAtlas = B.atlases['mod_notes'];
    r.noteAtlas = noteAtlas && { w: noteAtlas.w, h: noteAtlas.h, scale: noteAtlas.scale, cols: noteAtlas.cols, rows: noteAtlas.rows };

    // ---- 11) export a mod category as a ZIP (every blob is captured by the harness)
    B.state.tab = 'codex'; B.state.source = 'testmod'; B.state.cat = 'Joker'; B.render();
    await __V.wait(400);
    const zipBtn = document.getElementById('btnZip');
    if (zipBtn) { zipBtn.click(); await __V.wait(2500) }
    r.exported = (await window.__GRAB__()).map((b) => ({ name: b.name, size: b.size, magic: b.magic }));

    // ---- 12) the mod card renders through the shader path too (edition overlay)
    const beta = B.byId['j_tm_beta'];
    const sp = B.specForItem(beta); sp.edition = 'e_polychrome';
    const cv1 = B.compose(sp, 2, 0);
    sp.edition = null;
    const cv0 = B.compose(sp, 2, 0);
    r.editionDiff = __V.diff(cv0, cv1);

    // ---- 13) soul art of a mod legendary
    r.soul = !!beta.soul && beta.soul.pos.x === 0 && beta.soul.pos.y === 1;

    // final screenshot of the panel with a mod loaded
    B.state.tab = 'mods'; B.render();
    await __V.wait(300);
    r.final = { mods: B.mods.map((m) => m.id + ':' + m.items), logLines: (document.getElementById('modLogBox')||{}).textContent.split('\\n').length };
    r.blank = __V.blank();
    return r })()`,
  modProbe: `(async()=>{
    const r = {};
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(600);

    const px = (cv, x, y) => { const d = cv.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0],d[1],d[2],d[3]] };
    const opaque = (cv) => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) n++; return n };
    const test = (label, tile) => {
      const sh = B.shade(tile, 'polychrome', 6);
      return { label, tileOpaque: opaque(tile), shadeOpaque: sh ? opaque(sh) : -1, diff: sh ? __V.diff(tile, sh) : -1,
        tilePx: px(tile, 70, 95), shadePx: sh ? px(sh, 70, 95) : null };
    };

    // mod tile and vanilla tile built the same way
    const modTile = B.tileLayer({ atlas: 'mod_jokers', pos: { x: 1, y: 0 } }, 142, 190);
    const vanTile = B.tileLayer({ atlas: 'Joker', pos: { x: 0, y: 0 } }, 142, 190);
    r.modTile = test('mod', modTile);
    r.vanTile = test('van', vanTile);

    // is the mod image itself decoded?
    const file = B.atlases['mod_jokers'].file;
    const im = document.querySelector('img'); // just to touch the DOM
    r.atlasFile = file;
    r.imgLoaded = await new Promise((res) => {
      const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res('error'); i.src = B.atlases['mod_jokers'] && '' ;
      res('skipped');
    });

    // a shader over a plain opaque canvas (no atlas involved at all)
    const flat = document.createElement('canvas'); flat.width = 142; flat.height = 190;
    const g = flat.getContext('2d'); g.fillStyle = '#c86432'; g.fillRect(0,0,142,190);
    r.flat = test('flat', flat);

    // canvas-tainting check: read a blob-url image straight into a canvas
    const raw = document.createElement('canvas'); raw.width = 142; raw.height = 190;
    const rg = raw.getContext('2d');
    let taint = 'n/a';
    try {
      const im2 = new Image();
      await new Promise((res) => { im2.onload = res; im2.onerror = res; im2.src = B.atlases['mod_jokers'].file.startsWith('blob:') ? '' : '' });
      taint = 'skipped';
    } catch (e) { taint = String(e.message) }
    r.taint = taint;

    // the gloss must land on mod art too — use the artless-soul joker, because a full-card
    // soul sprite legitimately covers the edition layer (checked separately below)
    const modIt = B.byId['j_tm_alpha'];
    const spA = B.specForItem(modIt);
    const spB = B.specForItem(modIt); spB.edition = 'e_polychrome';
    r.composeMod = { diff: __V.diff(B.compose(spA,2,6), B.compose(spB,2,6)) };
    const vanIt = B.byId['j_joker'];
    const vA = B.specForItem(vanIt);
    const vB = B.specForItem(vanIt); vB.edition = 'e_polychrome';
    r.composeVan = { diff: __V.diff(B.compose(vA,2,6), B.compose(vB,2,6)) };
    r.specs = { mod: JSON.stringify(B.specForItem(modIt)), van: JSON.stringify(B.specForItem(vanIt)) };

    // the legendary's floating art is an overlay on top of the card
    const beta = B.byId['j_tm_beta'];
    const withSoul = B.compose(B.specForItem(beta), 2, 0);
    const noSoulSp = B.specForItem(beta); noSoulSp.soul = null;
    const noSoul = B.compose(noSoulSp, 2, 0);
    r.soulOverlay = { diff: __V.diff(noSoul, withSoul), box: __V.bbox(withSoul) };
    return r })()`,
  modView: `(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    const r = {};
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(700);

    // narrow-width sanity for the import panel (the mobile media query only trims padding)
    B.state.tab = 'mods'; B.render();
    await __V.wait(400);
    const content = document.getElementById('content');
    const keep = content.style.maxWidth;
    content.style.maxWidth = '340px';
    await __V.wait(250);
    const v = document.querySelector('.modsview');
    r.narrow = v ? { view: v.scrollWidth, box: v.clientWidth, overflow: v.scrollWidth - v.clientWidth } : null;
    const btns = document.querySelector('.dropbtns');
    r.narrow.btnsWrapped = btns ? (btns.scrollWidth <= btns.clientWidth + 2) : null;
    content.style.maxWidth = keep;
    await __V.wait(250);

    // land on the codex filtered to the mod, so the final screenshot shows mod entries
    B.state.tab = 'codex'; B.state.source = 'testmod'; B.state.cat = 'Joker'; B.state.q = ''; B.state.sel = null;
    B.render();
    await __V.wait(1600);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.badges = document.querySelectorAll('#content .cell .modtag').length;
    r.catBadges = [].slice.call(document.querySelectorAll('#content .cell .badge')).map((e) => e.textContent);
    r.crumbs = (document.querySelector('.listhead h2')||{}).textContent;
    r.sidebar = [].slice.call(document.querySelectorAll('#sidebar .catgroup')).map((e) => e.textContent);
    r.blank = __V.blank();
    return r })()`,
  modDrop: `(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const r = {};
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mk = (p, b64) => {
      const f = new File([u8(b64)], p.split('/').pop());
      try { Object.defineProperty(f, '__rel', { value: p, configurable: true }) } catch (e) { /* ignore */ }
      return f;
    };

    // ---- 1) folder-picker path: webkitRelativePath is what <input webkitdirectory> provides
    const rel = Object.keys(TM.folder).map((p) => {
      const f = mk(p, TM.folder[p]);
      Object.defineProperty(f, 'webkitRelativePath', { value: p, configurable: true });
      return f;
    });
    const res = await B.importBatch(rel, 'picker');
    r.picker = res && { ok: res.ok, items: res.items, root: res.mod.root, id: res.mod.id };
    await __V.wait(400);
    B.removeMod('testmod');
    await __V.wait(300);

    // ---- 2) real drop on the import panel's drop zone
    B.state.tab = 'mods'; B.render();
    await __V.wait(400);
    let dt = null;
    try { dt = new DataTransfer() } catch (e) { r.noDataTransfer = String(e.message) }
    if (dt) {
      for (const p of Object.keys(TM.folder)) dt.items.add(mk(p, TM.folder[p]));
      r.dtItems = dt.items.length;
      r.dtFiles = dt.files.length;
      let entry = null;
      try { entry = dt.items[0].webkitGetAsEntry() } catch (e) { entry = null }
      r.syntheticEntry = entry ? (entry.isDirectory ? 'dir' : 'file') : 'null';
      const zone = document.querySelector('#modDrop');
      r.zoneFound = !!zone;
      zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      await __V.wait(2200);
      r.afterPanelDrop = { mods: B.mods.map((m) => m.id + ':' + m.items), items: B.items.length };
      r.overlayGone = !document.body.classList.contains('dropping');
    }

    // ---- 3) drop somewhere else entirely: must import, not navigate away
    if (dt) {
      const zipFile = mk('TestMod.zip', TM.zip);
      try { zipFile.__rel = 'TestMod.zip' } catch (e) { Object.defineProperty(zipFile, '__rel', { value: 'TestMod.zip' }) }
      const dt2 = new DataTransfer();
      dt2.items.add(zipFile);
      const before = B.mods.length;
      document.getElementById('content').dispatchEvent(new DragEvent('drop', { dataTransfer: dt2, bubbles: true, cancelable: true }));
      await __V.wait(2200);
      r.globalDrop = { modsBefore: before, modsAfter: B.mods.map((m) => m.id + ':' + m.items), tab: B.state.tab, duplicateRefused: B.mods.length === before };
    }

    // ---- 4) dragover shows the full-page hint and never leaves the page
    const dt3 = new DataTransfer(); dt3.items.add(mk('manifest.json', TM.folder['TestMod/manifest.json']));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt3, bubbles: true, cancelable: true }));
    await __V.wait(150);
    r.hintOn = document.body.classList.contains('dropping');
    window.dispatchEvent(new DragEvent('dragleave', { dataTransfer: dt3, bubbles: true, cancelable: true }));
    await __V.wait(150);
    r.hintOff = !document.body.classList.contains('dropping');

    r.log = (document.getElementById('modLogBox') || {}).textContent || '';
    r.logHasPanel = r.log.indexOf('已导入') >= 0;
    return r })()`,
  modFlat: `(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const r = {};
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    // strip every folder: exactly what an odd distribution looks like
    const flat = Object.keys(TM.folder).map((p) => new File([u8(TM.folder[p])], p.split('/').pop()));
    const res = await B.importBatch(flat, 'flat');
    await __V.wait(800);
    r.imported = res && { ok: res.ok, items: res.items, atlases: res.atlases };
    r.stats = res && res.mod.stats;
    r.warnings = res && res.mod.warnings;
    r.modAtlas = B.atlases['mod_jokers'] && { w: B.atlases['mod_jokers'].w, h: B.atlases['mod_jokers'].h, scale: B.atlases['mod_jokers'].scale, cols: B.atlases['mod_jokers'].cols, rows: B.atlases['mod_jokers'].rows };
    const painted = { ok: 0, blank: [], noArt: [] };
    for (const it of B.items.filter((i) => i.source === 'testmod')) {
      const sp = B.specForItem(it);
      if (!sp) { painted.noArt.push(it.id); continue }
      if (__V.bbox(B.compose(sp, 2, 0))) painted.ok++; else painted.blank.push(it.id);
    }
    r.painted = painted;
    r.blank = __V.blank();
    return r })()`,
  modCryptid: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    // the input's change handler started the import; wait for it to land (or fail)
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    r.logText = (document.getElementById('modLogBox') || {}).textContent || '';
    r.toast = (document.getElementById('toast') || {}).textContent || '';
    const mod = B.mods[0];
    if (!mod) return { fatal: 'no mod registered', logText: r.logText, toast: r.toast };
    r.mod = { id: mod.id, name: mod.name, version: mod.version, author: mod.author, items: mod.items, atlases: mod.atlasKeys.length, warnings: mod.warnings.length, stats: mod.stats };
    r.warnings = mod && mod.warnings;

    const mine = B.items.filter((i) => i.source === mod.id);
    r.total = mine.length;
    const byCat = {};
    for (const i of mine) byCat[i.cat] = (byCat[i.cat] || 0) + 1;
    r.byCat = byCat;

    const painted = { ok: 0, blank: [], noArt: [] };
    for (const it of mine) {
      const sp = B.specForItem(it);
      if (!sp) { painted.noArt.push(it.id + '(' + it.cat + ')'); continue }
      const cv = B.compose(sp, 2, 0);
      if (__V.bbox(cv)) painted.ok++; else painted.blank.push(it.id + '(' + it.cat + ')');
    }
    r.painted = { ok: painted.ok, blank: painted.blank.length, blankList: painted.blank.slice(0, 8), noArt: painted.noArt.length, noArtList: painted.noArt.slice(0, 8) };

    const sample = ['j_cry_dropshot', 'j_cry_CodeJoker', 'bl_cry_oldox', 'v_cry_copies', 'p_cry_code_normal_1', 'sleeve_cry_very_fair_sleeve', 'b_cry_encoded', 'tag_cry_console', 'c_cry_crash', 'stk_cry_pink'];
    r.sampleHashes = sample.map((id) => {
      const it = B.byId[id];
      if (!it) return id + ':MISSING';
      return id + ':' + __V.hash(B.compose(B.specForItem(it), 2, 0));
    });
    r.distinctSamples = new Set(r.sampleHashes.map((x) => x.split(':')[1])).size;

    const a = B.atlases['atlasone'];
    r.atlas = a && { w: a.w, h: a.h, px: a.px, py: a.py, scale: a.scale, cols: a.cols, rows: a.rows };

    B.state.tab = 'codex'; B.state.source = mod.id; B.state.cat = 'Joker'; B.state.q = ''; B.state.sel = null;
    B.render();
    await __V.wait(2200);
    r.codex = { cells: document.querySelectorAll('#content .cell').length, badges: document.querySelectorAll('#content .cell .modtag').length };
    r.sidebar = [].slice.call(document.querySelectorAll('#sidebar .cat')).map((e) => e.textContent.replace(/\\s+/g, ' ').trim()).filter((t) => /Cryptid|Code|Sleeve|Tier|Meme|Food|Unique|新增/.test(t));

    const cell = document.querySelector('#content .cell[data-id="j_cry_dropshot"]');
    if (cell) { cell.click(); await __V.wait(1000) }
    const dt = document.getElementById('detail').textContent;
    r.detail = { title: (document.querySelector('#detail .dhead h3') || {}).textContent, hasMod: dt.indexOf('Cryptid') >= 0, hasFile: dt.indexOf('misc_joker.lua') >= 0 };

    B.state.cat = 'Blind'; B.render();
    await __V.wait(1200);
    const btn = document.getElementById('btnZip');
    if (btn) { btn.click(); await __V.wait(3000) }
    const blobs = await window.__GRAB__();
    r.exported = blobs.map((b) => ({ name: b.name, size: b.size, magic: b.magic })).slice(-3);

    // can Cryptid entries actually be used in the forge?
    B.state.tab = 'forge'; B.state.forge.open = null; B.render();
    await __V.wait(2600);
    const ftypes = [].slice.call(document.querySelectorAll('#content .opt[data-gkey="basetype"] option')).map((o) => o.value);
    r.forge = { types: ftypes.slice(0, 20), hasCode: ftypes.indexOf('Code') >= 0, hasSleeve: ftypes.indexOf('Sleeve') >= 0 };
    const fsel = document.querySelector('#content .opt[data-gkey="basetype"] select');
    fsel.value = 'Code'; fsel.dispatchEvent(new Event('change'));
    await __V.wait(1600);
    const picks = document.querySelectorAll('#content .opt[data-gkey="base"] .pick');
    r.forge.picks = picks.length;
    r.forge.modBadges = document.querySelectorAll('#content .opt[data-gkey="base"] .pickmod').length;
    if (picks.length) { picks[0].click(); await __V.wait(1400) }
    const pcv = document.querySelector('.preview canvas');
    r.forge.previewBox = pcv ? __V.bbox(pcv) : null;
    r.forge.nowLine = (document.querySelector('.pvnow') || {}).textContent || '';
    r.forge.header = (document.querySelector('#content .opt[data-gkey="base"] h4') || {}).textContent || '';
    r.forge.height = document.querySelector('#content').scrollHeight;
    r.forge.blank = __V.blank();

    // leave the page on Cryptid's jokers so the screenshot shows mod content
    B.state.tab = 'codex'; B.state.source = mod.id; B.state.cat = 'Joker'; B.state.sel = null;
    B.render();
    await __V.wait(2200);
    r.blank = __V.blank();
    return r })()`,
  modPicker: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};

    // ---- the zip input (this is the path that reported "没有读到文件")
    for (let i = 0; i < 40 && !B.mods.length; i++) await __V.wait(400);
    r.afterZip = { mods: B.mods.map((m) => m.id + ':' + m.items), items: B.items.length };
    r.zipToast = (document.getElementById('toast') || {}).textContent || '';

    B.removeMod('testmod');
    await __V.wait(500);

    // ---- the folder input
    const dir = document.getElementById('modDirInput');
    r.dirInputExists = !!dir;
    dir.click();                       // opens nothing in headless, but proves the handler is wired
    await __V.wait(200);
    for (let i = 0; i < 40 && !B.mods.length; i++) await __V.wait(400);
    r.afterDir = { mods: B.mods.map((m) => m.id + ':' + m.items), items: B.items.length };
    const m = B.mods[0];
    r.dirStats = m && m.stats;
    r.dirWarnings = m && m.warnings;
    r.dirLog = (document.getElementById('modLogBox') || {}).textContent.split('\\n').slice(-6).join(' | ');
    return r })()`,
  forgeUx: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.click('.cat', '卡牌合成台', 2600);
    const q = (sel) => document.querySelector(sel);
    const groups = () => [].slice.call(document.querySelectorAll('#content .opt[data-gkey]'));
    r.groupKeys = groups().map((e) => e.dataset.gkey);
    r.collapsedAtStart = groups().filter((e) => e.classList.contains('collapsed')).map((e) => e.dataset.gkey);
    r.navChips = [].slice.call(document.querySelectorAll('.forgenav .nv')).map((e) => e.textContent);
    r.previewSticky = getComputedStyle(q('.forge .preview')).position;
    r.navSticky = getComputedStyle(q('.forgenav')).position;

    // headers carry the current pick
    r.headers = [].slice.call(document.querySelectorAll('#content .opt[data-gkey] h4')).map((h) => h.textContent.replace(/\\s+/g, ' ').trim());
    r.nowLine = (q('.pvnow') || {}).textContent;

    // collapsing really hides the body and survives a repaint
    const enh = q('#content .opt[data-gkey="enh"]');
    enh.querySelector('h4').click();
    await __V.wait(250);
    r.enhCollapsed = enh.classList.contains('collapsed');
    r.enhBodyHidden = getComputedStyle(enh.querySelector('.obody')).display === 'none';
    const navEnh = __V.byText('.forgenav .nv', '强化');
    navEnh.click(); await __V.wait(300);
    r.enhReopened = !q('#content .opt[data-gkey="enh"]').classList.contains('collapsed');

    // quick actions
    const rand = __V.byText('.forgenav .nv', '随机搭配');
    const before = __V.hash(q('.preview canvas'));
    rand.click(); await __V.wait(900);
    r.randomChanged = __V.hash(q('.preview canvas')) !== before;
    const reset = __V.byText('.forgenav .nv', '重置');
    reset.click(); await __V.wait(900);
    r.resetNow = (q('.pvnow') || {}).textContent;

    // collapse everything, then check the page is short
    __V.byText('.forgenav .nv', '收起').click();
    await __V.wait(400);
    r.allCollapsed = groups().every((e) => e.classList.contains('collapsed'));
    r.tallAfterCollapse = q('#content').scrollHeight;
    __V.byText('.forgenav .nv', '全部展开').click();
    await __V.wait(500);
    r.tallAfterExpand = q('#content').scrollHeight;
    r.optCount = document.querySelectorAll('#content .opt[data-gkey]').length;
    r.canvas = __V.blank();
    return r })()`,

  modForge: `(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    const r = {};
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(800);
    await __V.click('.cat', '卡牌合成台', 2600);

    // the mod's new category must be offered as a forge subject
    const types = [].slice.call(document.querySelectorAll('#content .opt[data-gkey="basetype"] option')).map((o) => o.value);
    r.types = types;
    r.hasModType = types.includes('Musical');
    r.jokerCount = (document.querySelector('#content .opt[data-gkey="basetype"] option[value="Joker"]') || {}).textContent;

    // pick the mod category, then a mod card
    const sel = document.querySelector('#content .opt[data-gkey="basetype"] select');
    sel.value = 'Musical'; sel.dispatchEvent(new Event('change'));
    await __V.wait(1200);
    const picks = document.querySelectorAll('#content .opt[data-gkey="base"] .pick');
    r.musicalPicks = picks.length;
    r.picksHaveModBadge = document.querySelectorAll('#content .opt[data-gkey="base"] .pick .pickmod').length;
    if (picks.length) { picks[0].click(); await __V.wait(900) }
    r.nowLine = (document.querySelector('.pvnow') || {}).textContent;
    const cv = document.querySelector('.preview canvas');
    r.previewBox = cv ? __V.bbox(cv) : null;
    r.baseHeader = (document.querySelector('#content .opt[data-gkey="base"] h4') || {}).textContent.replace(/\\s+/g, ' ').trim();
    r.summary = [].slice.call(document.querySelectorAll('.pvsummary tr')).map((tr) => tr.textContent.replace(/\\s+/g, ' ').trim()).slice(0, 6);
    r.canvas = __V.blank();
    return r })()`,

  srcBack: `(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p });
      return f;
    });
    const r = {};
    await B.importBatch(mkFiles(TM.folder));
    await __V.wait(700);
    B.state.tab = 'codex'; B.state.source = 'testmod'; B.state.cat = 'all'; B.render();
    await __V.wait(1200);
    const chip = document.querySelector('.listhead .srcchip');
    r.chip = chip ? chip.textContent.replace(/\\s+/g, ' ').trim() : null;
    r.filtered = { source: B.state.source, cells: document.querySelectorAll('#content .cell').length };
    if (chip) { chip.click(); await __V.wait(1000) }
    r.afterChip = { source: B.state.source, cells: document.querySelectorAll('#content .cell').length, chipGone: !document.querySelector('.listhead .srcchip') };

    // the detail-panel button is a two-way toggle
    B.state.source = 'testmod'; B.state.cat = 'Joker'; B.render();
    await __V.wait(900);
    const cell = document.querySelector('#content .cell[data-id="j_tm_alpha"]');
    if (cell) { cell.click(); await __V.wait(800) }
    const btn = [].slice.call(document.querySelectorAll('#detail .btn')).filter((b) => /只看这个 Mod|显示全部来源/.test(b.textContent))[0];
    r.detailBtn = btn ? btn.textContent : null;
    if (btn) { btn.click(); await __V.wait(1000) }
    r.afterDetailBtn = { source: B.state.source, btn: ([].slice.call(document.querySelectorAll('#detail .btn')).filter((b) => /只看这个 Mod|显示全部来源/.test(b.textContent))[0] || {}).textContent };
    return r })()`,
  forgePhone: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.wait(1600);
    B.state.tab='forge'; B.state.forge.open=null; B.render();
    await __V.wait(2600);
    const content = document.getElementById('content');
    const rect = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), h: Math.round(b.height) } };
    r.viewport = { w: innerWidth, h: innerHeight };
    r.display = getComputedStyle(document.querySelector('.forge')).display;
    r.bar = Object.assign(rect(document.querySelector('.pvtop')), { pos: getComputedStyle(document.querySelector('.pvtop')).position });
    r.barShare = +(r.bar.h / innerHeight).toFixed(2);
    r.canvas = rect(document.querySelector('.preview canvas'));
    r.opts = rect(document.querySelector('.forge .opts'));
    r.scrollHeight = content.scrollHeight;

    /* order in the DOM flow: the three heavy sections must come after the options on a phone */
    const order = [].slice.call(document.querySelectorAll('.forge .pvtop, .forge .opts, .forge .preview > .opt'))
      .map((e) => (e.dataset.gkey || e.className.split(' ')[0]) + '#' + getComputedStyle(e).order);
    r.visualOrder = order;

    /* every option group must be reachable: scroll its header under the bar and tap-test it */
    const groups = [].slice.call(document.querySelectorAll('#content .opts .opt'));
    const reach = [];
    for (const g of groups) {
      const barH = document.querySelector('.pvtop').getBoundingClientRect().height;
      const cTop = content.getBoundingClientRect().top;
      const top = g.getBoundingClientRect().top - cTop + content.scrollTop - barH - 8;
      content.scrollTop = Math.max(0, top);
      await __V.wait(140);
      const h = g.querySelector('h4');
      const b = h.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(b.left + 24), Math.round(b.top + b.height / 2));
      reach.push({ g: g.dataset.gkey, y: Math.round(b.top), ok: !!(hit && h.contains(hit)) });
    }
    r.reachable = reach;
    r.unreachable = reach.filter((x) => !x.ok).map((x) => x.g);
    r.maxScroll = Math.round(content.scrollTop);

    /* the last option group must still be usable near the bottom */
    content.scrollTop = content.scrollHeight;
    await __V.wait(300);
    const last = groups[groups.length - 1].querySelector('h4');
    const lb = last.getBoundingClientRect();
    const lhit = document.elementFromPoint(Math.round(lb.left + 24), Math.round(lb.top + lb.height / 2));
    r.lastGroup = { key: groups[groups.length - 1].dataset.gkey, y: Math.round(lb.top), clickable: !!(lhit && last.contains(lhit)) };

    /* the three heavy sections must be below the options */
    const sec = ['summary', 'export', 'anim'].map((k) => ({ k, ...rect(document.querySelector('#content .opt[data-gkey="' + k + '"]')) }));
    r.heavySections = sec;
    r.heavyBelowOpts = sec.every((x) => x.t >= r.opts.t - 2);

    /* tapping the bar zooms the preview instead of breaking anything */
    const bar = document.querySelector('.pvtop');
    const before = Math.round(document.querySelector('.preview canvas').getBoundingClientRect().width);
    bar.click(); await __V.wait(500);
    r.zoom = { before, after: Math.round(document.querySelector('.preview canvas').getBoundingClientRect().width) };
    bar.click(); await __V.wait(400);

    content.scrollTop = 0;
    await __V.wait(300);
    r.blank = __V.blank();
    return r })()`,
  holoProbe: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    const opaque = (cv) => { if(!cv) return -1; const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) n++; return n };
    const meanA = (cv) => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let s=0,n=0; for(let i=3;i<d.length;i+=4){ if(d[i]>8){s+=d[i];n++} } return n? +(s/n).toFixed(1) : 0 };

    const holo = B.byId['j_hologram'];
    r.hologramItem = { id: holo.id, atlas: holo.atlas, pos: holo.pos, soul: holo.soul, setShader: holo.setShader, soulHologramInSpec: B.specForItem(holo).soulHologram };

    // the raw floating tile, its shader pass, and the full composite with / without the overlay
    const rawTile = B.tileLayer({ atlas: 'Joker', pos: { x: 2, y: 9 } }, 142, 190);
    const shaded = B.shade(rawTile, 'hologram', 0, B.uvRectOf({ atlas: 'Joker', pos: { x: 2, y: 9 } }));
    r.holoRaw = { opaque: opaque(rawTile), meanA: meanA(rawTile) };
    r.holoShaded = shaded ? { opaque: opaque(shaded), meanA: meanA(shaded), diff: __V.diff(rawTile, shaded) } : null;

    const withSoul = B.compose(B.specForItem(holo), 2, 0);
    const noSoulSpec = B.specForItem(holo); noSoulSpec.soul = null;
    const noSoul = B.compose(noSoulSpec, 2, 0);
    r.hologramComposite = { withSoul: opaque(withSoul), withoutSoul: opaque(noSoul), diff: __V.diff(noSoul, withSoul), box: __V.bbox(withSoul) };

    // a legendary, for comparison
    const caino = B.byId['j_caino'];
    const cw = B.compose(B.specForItem(caino), 2, 0);
    const cs = B.specForItem(caino); cs.soul = null;
    r.cainoComposite = { diff: __V.diff(B.compose(cs, 2, 0), cw), box: __V.bbox(cw) };

    // raw tiles of all six floating sprites
    r.tiles = ['j_hologram','j_caino','j_triboulet','j_yorick','j_chicot','j_perkeo'].map((id) => {
      const it = B.byId[id];
      const t = B.tileLayer(it.soul, 142, 190);
      const sh = B.shade(t, id === 'j_hologram' ? 'hologram' : 'dissolve', 0, B.uvRectOf(it.soul));
      return id + ' raw=' + opaque(t) + ' meanA=' + meanA(t) + (sh ? ' shaded=' + opaque(sh) : ' shaded=null');
    });

    // the Overlay category entries
    r.overlays = B.items.filter((i) => i.cat === 'Overlay').map((i) => {
      const sp = B.specForItem(i);
      const cv = sp ? B.compose(sp, 2, 0) : null;
      return i.id + ' spec=' + JSON.stringify(sp) + ' opaque=' + opaque(cv) + ' box=' + JSON.stringify(__V.bbox(cv));
    });
    r.blank = __V.blank();
    return r })()`,
  holoShot: `(async()=>{
    const B = window.__BALATRO__;
    const holo = B.byId['j_hologram'];
    const caino = B.byId['j_caino'];
    const shot = (spec, scale) => B.compose(spec, scale || 4, 0).toDataURL('image/png');
    const out = {
      hologramFull: shot(B.specForItem(holo)),
      hologramNoSoul: (() => { const sp = B.specForItem(holo); sp.soul = null; return shot(sp) })(),
      hologramSoulOnly: (() => { const t = B.tileLayer(holo.soul, 284, 380); return t.toDataURL('image/png') })(),
      hologramSoulShaded: (() => { const t = B.tileLayer({ atlas: 'Joker', pos: { x: 2, y: 9 } }, 284, 380); const sh = B.shade(t, 'hologram', 0, B.uvRectOf({ atlas: 'Joker', pos: { x: 2, y: 9 } })) || t; return sh.toDataURL('image/png') })(),
      cainoFull: shot(B.specForItem(caino)),
      overlayHolo: shot(B.specForItem(B.byId['overlay_j_hologram'])),
    };
    return out })()`,
  shaderCompile: `(async()=>{
    const B = window.__BALATRO__;
    const G = window.__GLSHADERS__;
    if (!G) return { fatal: 'window.__GLSHADERS__ missing' };
    const r = {};
    const gl2 = document.createElement('canvas').getContext('webgl2');
    const gl = gl2 || document.createElement('canvas').getContext('webgl');
    r.webgl2 = !!gl2;
    r.vanilla = G.selftest(gl, !!gl2, B.data.shaders.map((x) => ({ name: x.name, source: x.source })));
    r.vanillaFail = r.vanilla.results.filter((x) => !x.ok).map((x) => x.name + ' :: ' + x.log.replace(/\s+/g, ' ').slice(0, 150));
    const mod = window.__MODSHADERS__ || [];
    r.modCount = mod.length;
    r.mod = G.selftest(gl, !!gl2, mod);
    r.modFail = r.mod.results.filter((x) => !x.ok).map((x) => x.name + ' :: ' + x.log.replace(/\s+/g, ' ').slice(0, 200));
    r.flavour = mod.map((m) => m.name + '→' + String(G.flavourUniform(m.source)));
    return r })()`,
  holoDebug: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    const holo = B.byId['j_hologram'];
    const sp = B.specForItem(holo);
    r.spec = { center: sp.center, soul: sp.soul, soulHologram: sp.soulHologram, box: sp.box || null };
    const opaque = (cv) => { if (!cv) return -1; const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let n = 0; for (let i=3;i<d.length;i+=4) if (d[i]>8) n++; return n };
    const t = B.shadeTile(sp.soul, 142, 190, 'hologram', 0);
    r.shaded = t ? { w: t.width, h: t.height, opaque: opaque(t) } : null;
    r.tile = { opaque: opaque(B.tileLayer(sp.soul, 142, 190)) };
    const withSoul = B.compose(sp, 2, 0);
    const sp2 = B.specForItem(holo); sp2.soul = null;
    const noSoul = B.compose(sp2, 2, 0);
    r.composite = { withSoul: opaque(withSoul), withoutSoul: opaque(noSoul), diff: __V.diff(noSoul, withSoul), urlSame: withSoul.toDataURL() === noSoul.toDataURL() };
    // does the legendary path work?
    const caino = B.byId['j_caino'];
    const c1 = B.compose(B.specForItem(caino), 2, 0);
    const c2s = B.specForItem(caino); c2s.soul = null;
    const c2 = B.compose(c2s, 2, 0);
    r.caino = { diff: __V.diff(c2, c1), box: __V.bbox(c1) };
    // and the dissolve shadow for the legendaries
    const sil = B.shadeTile(B.byId['j_caino'].soul, 142, 190, 'dissolve', 0, { shadow: true });
    r.shadow = sil ? { opaque: opaque(sil) } : null;
    r.programs = B.shaderPrograms;
    return r })()`,
  modShader: `(async()=>{
    const B = window.__BALATRO__;
    const TM = window.__TESTMOD__;
    const r = {};
    const u8 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u };
    const mkFiles = (pack) => Object.keys(pack).map((p) => {
      const f = new File([u8(pack[p])], p.split('/').pop());
      Object.defineProperty(f, '__rel', { value: p, configurable: true });
      return f;
    });
    B.state.tab = 'mods'; B.render(); await __V.wait(400);
    const res = await B.importBatch(mkFiles(TM.folder));
    await __V.wait(900);
    r.logText = (document.getElementById("modLogBox") || {}).textContent || "";
    r.toast = (document.getElementById("toast") || {}).textContent || "";
    r.imported = res && { ok: res.ok, items: res.items, atlases: res.atlases };
    r.shaderFiles = res && res.mod.stats.shaders;
    r.shaders = res && res.mod.shaders ? res.mod.shaders.map((x) => x.key) : [];
    r.modShaders = Object.keys(B.modShaders);
    r.programs = B.shaderPrograms.filter((n) => /tint/.test(n));
    r.warnings = res && res.mod.warnings.filter((w) => /着色器/.test(w));

    // the edition must resolve to the mod shader and change the card
    const ed = B.byId['e_tm_tinted'] || B.items.filter((i) => i.cat === 'Edition' && i.source === 'testmod')[0];
    r.editionItem = ed ? { id: ed.id, shader: ed.shader, resolved: B.editionShaderOf(ed) } : null;
    if (ed) {
      const plain = B.byId['S_A'];
      const specPlain = { center: { atlas: 'centers', pos: B.data.composition.baseCenter.pos }, front: { atlas: 'cards_1', pos: plain.pos } };
      const withEd = Object.assign({}, specPlain, { edition: B.editionShaderOf(ed) });
      const a = B.compose(specPlain, 2, 0);
      const c = B.compose(withEd, 2, 0);
      r.editionDiff = __V.diff(a, c);
      r.editionHash = __V.hash(c);
      r.editionOpaque = (() => { const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8)n++; return n })();
    }
    // and it must be usable in the forge
    B.state.tab = 'forge'; B.state.forge.open = null; B.render();
    await __V.wait(1800);
    const sel = document.querySelector('#content .opt[data-gkey="basetype"] select');
    sel.value = 'Edition'; sel.dispatchEvent(new Event('change'));
    await __V.wait(1400);
    const picks = [].slice.call(document.querySelectorAll('#content .opt[data-gkey="ed"] .pick'));
    r.forgeEditions = picks.map((b) => b.textContent.replace(/\s+/g, ' ').trim()).slice(0, 8);
    const modPick = picks.filter((b) => /Tinted|染色/.test(b.textContent))[0];
    r.forgeHasModEdition = !!modPick;
    if (modPick) {
      const before = __V.hash(document.querySelector('.preview canvas'));
      modPick.click(); await __V.wait(900);
      r.forgePreviewChanged = __V.hash(document.querySelector('.preview canvas')) !== before;
    }
    r.canvas = __V.blank();
    return r })()`,
  cryptidEditions: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.wait(2000);
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    if (!B.mods.length) return { skipped: 'Cryptid.zip not available' };
    const gl = window.__GLSHADERS__;
    void gl;
    const eds = B.items.filter((i) => i.cat === 'Edition' && i.source);
    r.count = eds.length;
    r.list = eds.map((it) => {
      const key = B.editionShaderOf(it);
      const prog = B.shaderPrograms.indexOf(key) >= 0;
      const base = { center: { atlas: 'centers', pos: B.data.composition.baseCenter.pos }, front: { atlas: 'cards_1', pos: B.byId['S_A'].pos } };
      const a = B.compose(base, 2, 0);
      const c = B.compose(Object.assign({}, base, { edition: key }), 2, 0);
      return it.id + ' shader=' + it.shader + ' → ' + key + (prog ? ' [compiled]' : ' [MISSING]') + ' diff=' + __V.diff(a, c) + ' note=' + (it.note ? 'yes' : 'no');
    });
    r.missing = r.list.filter((x) => x.indexOf('MISSING') >= 0);
    r.allDiff = r.list.every((x) => !/diff=0( |$)/.test(x));
    r.canvas = __V.blank();
    // a sample render of one Cryptid edition, for a visual check
    const one = eds[0];
    if (one) {
      const base = { center: { atlas: 'centers', pos: B.data.composition.baseCenter.pos }, front: { atlas: 'cards_1', pos: B.byId['S_A'].pos } };
      r.samplePng = B.compose(Object.assign({}, base, { edition: B.editionShaderOf(one) }), 4, 6).toDataURL('image/png');
      r.plainPng = B.compose(base, 4, 6).toDataURL('image/png');
      r.sampleId = one.id;
    }
    return r })()`,
  /* Cryptid 的 "星界"(astral) 版本过曝调查：量像素，并把渲染结果导出来肉眼确认。
     关键指标：近白像素占比、平均亮度、以及和「无版本」「原版闪箔」对比。 */
  astralProbe: `(async()=>{
    const B = window.__BALATRO__;
    const r = { view: 'astralProbe' };
    await __V.wait(2000);
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    if (!B.mods.length) return { skipped: 'Cryptid.zip 没导入' };
    const stats = (cv) => {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, sum = 0, white = 0, bright = 0, opaque = 0, sat = 0;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]; if (a < 8) continue;
        const R = d[i] / 255, G = d[i + 1] / 255, Bl = d[i + 2] / 255;
        const mx = Math.max(R, G, Bl), mn = Math.min(R, G, Bl);
        n++; sum += (R + G + Bl) / 3; opaque++;
        if (mn > 0.94) white++;                    // 近白
        if (mx > 0.94) bright++;                   // 至少一个通道打满
        if (mx - mn < 0.06 && mx > 0.6) sat++;     // 发灰/发白（低饱和且亮）
      }
      return { px: opaque, meanRGB: +(sum / Math.max(1, n)).toFixed(3),
        nearWhite: +(white / Math.max(1, n) * 100).toFixed(1),
        clipped: +(bright / Math.max(1, n) * 100).toFixed(1),
        washed: +(sat / Math.max(1, n) * 100).toFixed(1) };
    };
    const spec = () => Object.assign({}, B.specForItem(B.byId['j_joker']));
    const astral = B.items.filter((i) => i.cat === 'Edition' && i.source && /astral|星界/i.test((i.id||'') + (i.name||'') + (i.shader||'')))[0];
    r.astralId = astral ? astral.id : null;
    r.astralShader = astral ? B.editionShaderOf(astral) : null;
    const variants = {
      plain: spec(),
      astral: astral ? Object.assign(spec(), { edition: B.editionShaderOf(astral) }) : null,
      foil: Object.assign(spec(), { edition: 'e_foil' }),
      holo: Object.assign(spec(), { edition: 'e_holo' }),
      polychrome: Object.assign(spec(), { edition: 'e_polychrome' }),
    };
    r.stats = {}; r.png = {};
    for (const k of Object.keys(variants)) {
      if (!variants[k]) continue;
      const cv = B.compose(variants[k], 4, 6);
      r.stats[k] = stats(cv);
      r.png[k] = cv.toDataURL('image/png');
    }
    r.note = 'meanRGB 是平均亮度；nearWhite 是整块都接近 255 的像素比例；clipped 是至少一个通道打满的比例';
    r.errors = window.__V.errors.length;
    return r })()`,
  /* 合成台里给「小丑牌」叠「星界」版本 —— 用户描述的就是这个操作。
     合成台的预览走的是 shadeCanvas（画布）而不是 shadeTile（图集格子），
     两条路径的 texture_details 不一样，所以要单独量。 */
  astralForge: `(async()=>{
    const B = window.__BALATRO__;
    const r = { view: 'astralForge' };
    await __V.wait(1500);
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    if (!B.mods.length) return { skipped: 'Cryptid.zip 没导入' };
    const stats = (cv) => {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, sum = 0, white = 0, clipped = 0, blue = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const R = d[i] / 255, G = d[i + 1] / 255, Bl = d[i + 2] / 255;
        const mx = Math.max(R, G, Bl), mn = Math.min(R, G, Bl);
        n++; sum += (R + G + Bl) / 3;
        if (mn > 0.94) white++;
        if (mx > 0.94) clipped++;
        if (Bl > 0.9 && Bl - R > 0.25) blue++;
      }
      return { px: n, meanRGB: +(sum / Math.max(1, n)).toFixed(3),
        nearWhite: +(white / Math.max(1, n) * 100).toFixed(1),
        clipped: +(clipped / Math.max(1, n) * 100).toFixed(1),
        blueWash: +(blue / Math.max(1, n) * 100).toFixed(1) };
    };
    const pv = () => document.querySelector('.preview canvas');
    const grp = (re) => [].slice.call(document.querySelectorAll('.opt')).filter((o) => o.querySelector('h4') && re.test(o.querySelector('h4').textContent))[0];
    const chipsOf = (re) => { const g = grp(re); return g ? [].slice.call(g.querySelectorAll('.pick')) : [] };
    await __V.click('.cat', '卡牌合成台', 2600);
    __V.byText('.forgenav .nv', '全部展开').click(); await __V.wait(800);

    // 1) 牌型选「小丑牌」
    const typeChip = chipsOf(/牌型/).filter((c) => /小丑牌|^Joker/.test(c.textContent.trim()))[0];
    r.typeChip = typeChip ? typeChip.textContent.trim() : null;
    if (typeChip) { typeChip.click(); await __V.wait(1500) }

    // 2) 主体选一张真正的小丑牌
    const subj = chipsOf(/主体/);
    r.subjectChips = subj.slice(0, 6).map((c) => c.textContent.trim().slice(0, 16));
    const joker = subj.filter((c) => /小丑|Joker/i.test(c.textContent))[0] || subj[0];
    r.baseChip = joker ? joker.textContent.trim().slice(0, 40) : null;
    if (joker) { joker.click(); await __V.wait(1600) }

    r.beforeEdition = pv() ? stats(pv()) : null;
    r.pngPlain = pv() ? pv().toDataURL('image/png') : null;

    const chips = chipsOf(/版本/);
    r.editionChips = chips.map((c) => c.textContent.trim().slice(0, 18));
    r.png = {};
    for (const name of ['星界', '过曝', '灰质琉璃']) {
      const chip = chips.filter((c) => c.textContent.indexOf(name) >= 0)[0];
      if (!chip) continue;
      chip.click(); await __V.wait(2200);
      r.stats = r.stats || {};
      r.stats[name] = pv() ? stats(pv()) : null;
      r.png[name] = pv() ? pv().toDataURL('image/png') : null;
    }
    const none = chips.filter((c) => /不叠加|无/.test(c.textContent))[0];
    if (none) { none.click(); await __V.wait(1500) }
    r.canvasSize = pv() ? pv().width + 'x' + pv().height : null;
    r.errors = window.__V.errors.length;
    return r })()`,
  /* 版本效果的整体保真度：换一批图集行号差别很大的小丑牌，
     逐张量 astral 的亮度。修好坐标之前，行号越大越白（screen_coords 用图集像素）。 */
  astralRows: `(async()=>{
    const B = window.__BALATRO__;
    const r = { view: 'astralRows' };
    await __V.wait(2000);
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    if (!B.mods.length) return { skipped: 'Cryptid.zip 没导入' };
    const astral = B.items.filter((i) => i.cat === 'Edition' && i.source && /astral|星界/i.test((i.id||'') + (i.name||'') + (i.shader||'')))[0];
    if (!astral) return { skipped: '没有 astral 版本' };
    const key = B.editionShaderOf(astral);
    const stat = (cv) => {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, sum = 0, white = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const R = d[i] / 255, G = d[i + 1] / 255, Bl = d[i + 2] / 255;
        n++; sum += (R + G + Bl) / 3;
        if (Math.min(R, G, Bl) > 0.94) white++;
      }
      return { mean: +(sum / Math.max(1, n)).toFixed(3), nearWhite: +(white / Math.max(1, n) * 100).toFixed(1) };
    };
    // 挑行号分散的小丑牌（图集 Joker 是 5 列，行越靠下 y 越大）
    const jokers = B.items.filter((i) => i.cat === 'Joker' && i.pos && i.atlas === 'Joker');
    const byRow = {};
    for (const j of jokers) if (!byRow[j.pos.y]) byRow[j.pos.y] = j;
    const picked = Object.keys(byRow).map((k) => byRow[k]).sort((a, b) => a.pos.y - b.pos.y);
    r.rows = [];
    for (const j of picked.slice(0, 14)) {
      const cv = B.compose(Object.assign({}, B.specForItem(j), { edition: key }), 2, 6);
      const s = stat(cv);
      r.rows.push({ id: j.id, row: j.pos.y, col: j.pos.x, ...s });
    }
    const means = r.rows.map((x) => x.mean);
    r.spread = { min: Math.min.apply(null, means), max: Math.max.apply(null, means), delta: +(Math.max.apply(null, means) - Math.min.apply(null, means)).toFixed(3) };
    r.maxNearWhite = Math.max.apply(null, r.rows.map((x) => x.nearWhite));
    r.note = '行号不同但同为 astral：亮度和近白比例应当一致（delta 越小越好）';
    r.errors = window.__V.errors.length;
    return r })()`,
  /* 全量扫：150 张小丑牌 × 几个 Cryptid 版本，把"近白到看不见"的挑出来。
     如果一张都没有 → 修复到位；如果还有一批 → 说明还剩别的原因。 */
  astralSweep: `(async()=>{
    const B = window.__BALATRO__;
    const r = { view: 'astralSweep' };
    await __V.wait(2000);
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    if (!B.mods.length) return { skipped: 'Cryptid.zip 没导入' };
    const nearWhiteOf = (cv) => {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, white = 0, sum = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        n++;
        const R = d[i] / 255, G = d[i + 1] / 255, Bl = d[i + 2] / 255;
        sum += (R + G + Bl) / 3;
        if (Math.min(R, G, Bl) > 0.9) white++;
      }
      return { white: +(white / Math.max(1, n) * 100).toFixed(1), mean: +(sum / Math.max(1, n)).toFixed(3) };
    };
    const eds = B.items.filter((i) => i.cat === 'Edition' && i.source);
    r.editions = eds.map((e) => ({ id: e.id, key: B.editionShaderOf(e), name: e.name }));
    const jokers = B.items.filter((i) => i.cat === 'Joker');
    r.jokerCount = jokers.length;
    const pick = ['astral', 'oversat', 'mosaic', 'gold'];
    r.byEdition = {};
    for (const name of pick) {
      const ed = eds.filter((e) => (B.editionShaderOf(e) || '') === name)[0];
      if (!ed) continue;
      const key = B.editionShaderOf(ed);
      let worst = [], whitish = 0;
      for (const j of jokers) {
        const sp = B.specForItem(j);
        if (!sp) continue;
        const cv = B.compose(Object.assign({}, sp, { edition: key }), 2, 6);
        const s = nearWhiteOf(cv);
        if (s.white > 60) whitish++;
        worst.push({ id: j.id, ...s });
      }
      worst.sort((a, b) => b.white - a.white);
      r.byEdition[name] = { whitishCount: whitish, top: worst.slice(0, 6) };
    }
    // 对照：不带任何版本时，本身就近白的小丑牌有多少
    let plainWhitish = 0
    const plainTop = []
    for (const j of jokers) {
      const sp = B.specForItem(j);
      if (!sp) continue;
      const s = nearWhiteOf(B.compose(sp, 2, 6));
      if (s.white > 60) plainWhitish++
      plainTop.push({ id: j.id, ...s })
    }
    plainTop.sort((a, b) => b.white - a.white)
    r.plain = { whitishCount: plainWhitish, top: plainTop.slice(0, 6) };
    r.errors = window.__V.errors.length;
    return r })()`,
  /* 同一张牌 × 多个版本，各导一张图，用来肉眼对比"到底是哪个版本在发白"。 */
  astralShots: `(async()=>{
    const B = window.__BALATRO__;
    const r = { view: 'astralShots' };
    await __V.wait(2000);
    for (let i = 0; i < 240 && !B.mods.length; i++) await __V.wait(400);
    if (!B.mods.length) return { skipped: 'Cryptid.zip 没导入' };
    const eds = B.items.filter((i) => i.cat === 'Edition' && i.source);
    const pick = [null, 'astral', 'oversat', 'mosaic', 'gold', 'glitched_b'];
    r.which = {};
    r.png = {};
    const j = B.byId['j_joker'] || B.items.filter((i) => i.cat === 'Joker')[0];
    r.card = j.id;
    for (const key of pick) {
      const name = key === null ? 'plain' : key;
      if (key) {
        const ed = eds.filter((e) => B.editionShaderOf(e) === key)[0];
        if (!ed) { r.which[name] = '没有这个版本'; continue }
        r.which[name] = ed.name + ' (' + ed.id + ')';
      } else r.which[name] = '不叠加';
      const spec = Object.assign({}, B.specForItem(j), key ? { edition: key } : {});
      const cv = B.compose(spec, 4, 6);
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, sum = 0, white = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const R = d[i] / 255, G = d[i + 1] / 255, Bl = d[i + 2] / 255;
        n++; sum += (R + G + Bl) / 3;
        if (Math.min(R, G, Bl) > 0.9) white++;
      }
      r.png[name] = cv.toDataURL('image/png');
      r.stats = r.stats || {};
      r.stats[name] = { mean: +(sum / Math.max(1, n)).toFixed(3), nearWhite: +(white / Math.max(1, n) * 100).toFixed(1) };
    }
    r.build = window.__APP_BUILD__ || '(无构建号)';
    r.errors = window.__V.errors.length;
    return r })()`,
  /* 启动页预览区的诊断：胶囊点击有没有生效、canvas 到底画没画。 */
  demoDebug: `(async()=>{
     for(let i=0;i<50 && !document.querySelector('#boot .bootcard');i++) await __V.wait(200);
     const r={view:'demoDebug'};
     r.path=location.pathname;
     const chips=document.querySelectorAll('.bootdemo .dchips button');
     r.chipTexts=[].slice.call(chips).map(b=>b.textContent.trim());
     const card=document.getElementById('dForgeCard');
     r.cardBefore=card?card.className:null;
     const foil=[].slice.call(chips).filter(b=>b.textContent.indexOf('闪箔')>=0)[0];
     r.foilFound=!!foil;
     if(foil){
       foil.click();
       r.cardSync=card.className;
       await __V.wait(600);
       r.cardAfter=card.className;
       r.foilIsOn=foil.classList.contains('on');
     }
     const dc=document.getElementById('dCanvas');
     r.canvasFound=!!dc;
     if(dc){
       r.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
       // 数一下 rAF 有没有在跑
       window.__rafN=0;
       const cnt=()=>{ window.__rafN++; requestAnimationFrame(cnt) };
       requestAnimationFrame(cnt);
       const px=()=>{ const d=dc.getContext('2d').getImageData(0,0,dc.width,dc.height).data; let nz=0; for(let i=3;i<d.length;i+=4) if(d[i]>8){ nz++; if(nz>300) break } return nz };
       r.nz0=px();
       await __V.wait(1200);
       r.rafFrames=window.__rafN;
       r.nz1=px();
       r.canvasSize=dc.width+'x'+dc.height;
       r.canvasBox=(()=>{const b=dc.getBoundingClientRect();return {t:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)}})();
     }
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 只做一件事：把预览区的矩形交出来，交给驱动去裁图（肉眼看排版）。 */
  demoRect: `(async()=>{
     for(let i=0;i<50 && !document.querySelector('#boot .bootcard');i++) await __V.wait(200);
     const d=document.querySelector('.bootdemo');
     if(!d) return {fatal:'没有预览区'};
     const b=d.getBoundingClientRect();
     const cells=[].slice.call(document.querySelectorAll('.bootdemo .dcell')).map(x=>{const r=x.getBoundingClientRect();return {t:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width)}});
     const cv=document.getElementById('dCanvas');
     return {view:'demoRect',vw:innerWidth,vh:innerHeight,
       demo:{t:Math.round(b.top),h:Math.round(b.height),w:Math.round(b.width)},
       cells, canvas:cv?{css:Math.round(cv.getBoundingClientRect().width)+'x'+Math.round(cv.getBoundingClientRect().height),backing:cv.width+'x'+cv.height}:null,
       errors:window.__V.errors.length} })()`,
  /* 预览区的排版体检：溢出、字号、点击尺寸、画布清晰度 —— 数值比"看着丑"可定位。 */
  demoLayout: `(async()=>{
     for(let i=0;i<50 && !document.querySelector('#boot .bootcard');i++) await __V.wait(200);
     const root=document.querySelector('.bootdemo');
     if(!root) return {fatal:'没有预览区'};
     const R=(e)=>{const b=e.getBoundingClientRect();return {t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height)}};
     const r={view:'demoLayout',vw:innerWidth,vh:innerHeight};
     const box=R(root);
     r.box=box;
     // 1) 文本溢出 / 元素超出容器
     const out=[], tiny=[], overflow=[];
     for(const e of root.querySelectorAll('*')){
       const s=getComputedStyle(e);
       if(s.display==='none') continue;
       const b=e.getBoundingClientRect();
       if(b.width<1||b.height<1) continue;
       if(b.right>box.r+1.5||b.left<box.l-1.5) out.push((e.className||e.tagName)+' → 右 '+Math.round(b.right)+' > '+box.r);
       if(e.scrollWidth-e.clientWidth>1 && s.overflowX!=='visible') overflow.push((e.className||e.tagName)+' 横向溢出 '+ (e.scrollWidth-e.clientWidth)+'px');
       const fs=parseFloat(s.fontSize);
       if(e.children.length===0 && (e.textContent||'').trim() && fs<11) tiny.push((e.className||e.tagName)+' '+fs+'px');
     }
     r.stickingOut=out.slice(0,8); r.hOverflow=overflow.slice(0,8); r.tinyText=tiny.slice(0,8);
     // 2) 可点元素够不够大（触屏 44px 是舒适线，34px 是底线）
     r.taps=[].slice.call(root.querySelectorAll('button')).map(b=>({t:b.textContent.trim().slice(0,6),h:Math.round(b.getBoundingClientRect().height),w:Math.round(b.getBoundingClientRect().width)}));
     r.tapMin=r.taps.length?Math.min.apply(null,r.taps.map(x=>x.h)):null;
     // 3) 画布：backing / css 比例（1 才清晰；小于 1 就是被放大糊掉）
     const cv=document.getElementById('dCanvas');
     if(cv){ const b=cv.getBoundingClientRect(); const dpr=window.devicePixelRatio||1;
       const ratio=+(cv.width/b.width).toFixed(3);
       r.canvas={css:Math.round(b.width)+'x'+Math.round(b.height),backing:cv.width+'x'+cv.height,dpr,
         ratio,crisp:ratio>=dpr*0.98};
       r.canvasRect={t:Math.round(b.top),l:Math.round(b.left),w:Math.round(b.width),h:Math.round(b.height)};
     }
     // 4) 各列的宽度是否一致（栅格有没有塌）
     r.cellWidths=[].slice.call(root.querySelectorAll('.dcell')).map(x=>Math.round(x.getBoundingClientRect().width));
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 桌面短窗口（就是用户遇到的那种：卡片比屏幕高）—— 必须满足：
     ① 导入按钮一开始就在视口里（顶部没被顶出去）
     ② 万一要滚，滚到最顶也能看到按钮；滚不动 = 不可达就是 bug
     ③ 预览在右栏（左右分栏生效） */
  bootShort: `(async()=>{
     for(let i=0;i<50 && !document.querySelector('#boot .bootcard');i++) await __V.wait(200);
     const sc=document.getElementById('boot');
     const btn=document.querySelector('#boot .bootbtns .btn');
     const card=document.querySelector('#boot .bootcard');
     const imp=document.querySelector('#boot .bootimp');
     const prev=document.querySelector('#boot .bootprev');
     const R=e=>{ if(!e) return null; const b=e.getBoundingClientRect(); return {t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height)} };
     const r={view:'bootShort',vw:innerWidth,vh:innerHeight};
     r.scrollTop0=sc.scrollTop;
     r.canScroll=sc.scrollHeight>sc.clientHeight+1;
     r.scrollH=sc.scrollHeight; r.clientH=sc.clientHeight;
     r.card=R(card); r.imp=R(imp); r.prev=R(prev);
     r.btn0=R(btn);
     r.btnVisible0=!!r.btn0 && r.btn0.t>=0 && r.btn0.b<=innerHeight;
     /* 滚到最顶，看按钮是否可达 */
     sc.scrollTop=0; await __V.wait(120);
     r.btnAtTop=R(btn);
     r.btnReachable=r.btnAtTop && r.btnAtTop.t>=-1 && r.btnAtTop.b<=innerHeight;
     /* 能不能滚到卡片最底部（说明整页可达） */
     sc.scrollTop=sc.scrollHeight; await __V.wait(150);
     r.reachedBottom=Math.abs(sc.scrollTop+sc.clientHeight-sc.scrollHeight)<3;
     r.demoVisible=(()=>{const d=document.querySelector('.bootdemo');if(!d)return null;const b=d.getBoundingClientRect();return b.width>50})();
     /* 左右分栏：导入在左、预览在右（同一行） */
     r.twoCols=!!(r.imp&&r.prev) && r.prev.l>=r.imp.r-2;
     r.overlap=!!(r.imp&&r.prev) && r.imp.r>r.prev.l+2 && Math.min(r.imp.b,r.prev.b)-Math.max(r.imp.t,r.prev.t)>10;
     sc.scrollTop=0;
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 得分计算器：先验算能手算的例子，再打开界面看渲染。 */
  scoreCalc: `(async()=>{
     const B = window.__BALATRO__;
     const r = { view: 'scoreCalc' };
     if (!B || !B.score) return { fatal: '没有 score 接口' };
     const S = B.score.state, C = B.score.card;
     const reset = () => { S.hand = 'Pair'; S.level = 1; S.played = []; S.held = []; S.jokers = []; S.manual = { chips: 0, mult: 0, xmult: 1 } };
     const J = (id, growth) => { const o = B.score.jokerFromItem(B.byId[id]); if (growth !== undefined) o.growth = growth; return o };

     // ① 一对 J：牌型 10×2 + 两张 J 各 10 筹码 + 小丑 +4 倍率 → 30 × 6 = 180
     reset();
     S.played = [C('J','S'), C('J','H')];
     S.jokers = [J('j_joker')];
     let res = B.score.compute();
     r.case1 = { chips: res.chips, mult: +res.mult.toFixed(2), score: res.score, expect: 180 };

     // ② 一对 A + 贪吃鬼（每张方块 +3 倍率）→ (10+11+11) × 5 = 160
     reset();
     S.played = [C('A','D'), C('A','C')];
     S.jokers = [J('j_greedy_joker')];
     res = B.score.compute();
     r.case2 = { chips: res.chips, mult: +res.mult.toFixed(2), score: res.score, expect: 160 };

     // ③ 强化 + 版本：奖励牌(+30 筹码) 且闪箔(+50 筹码) → (10+10+30+50+10) × 2 = 220
     reset();
     S.played = [C('10','S','m_bonus','e_foil'), C('10','H')];
     res = B.score.compute();
     r.case3 = { chips: res.chips, mult: +res.mult.toFixed(2), score: res.score, expect: 220 };

     // ④ 红蜡封重复 + 留手钢铁 ×1.5 → (10+5+5+5) × 3 = 75
     reset();
     S.played = [C('5','S','','','Red'), C('5','H')];
     S.held = [C('K','D','m_steel')];
     res = B.score.compute();
     r.case4 = { chips: res.chips, mult: +res.mult.toFixed(2), score: res.score, expect: 75 };

     const rules = B.score.rules();
     r.rules = rules ? { total: rules.rules.length, generic: rules.generic.length,
       byKind: rules.rules.reduce((a, x) => { a[x.k] = (a[x.k] || 0) + 1; return a }, {}) } : null;
     /* 诊断：贪吃鬼这条为什么没生效 */
     const git = B.byId['j_greedy_joker'];
     const gj = J('j_greedy_joker');
     r.debug = { itemEffect: git && git.effect, cfgEffect: gj.cfg.effect, cfgExtra: gj.cfg.extra,
       suitOfD: 'Diamonds', ruleFound: !!jokerRuleSafe(B, gj), hasScore: !!B.score };
     function jokerRuleSafe (BB, j) { return BB.score.rules().rules.find((x) => x.n === j.name) || null }

     reset();
     S.played = [C('K','S'), C('K','H')];
     S.jokers = [J('j_joker'), J('j_cavendish')];
     B.state.tab = 'score'; B.render();
     await __V.wait(1200);
     const q = (s) => document.querySelector(s);
     r.ui = {
       jokerTiles: document.querySelectorAll('#scJokers .sctile').length,
       playedTiles: document.querySelectorAll('#scPlayed .sctile').length,
       heldTiles: document.querySelectorAll('#scHand .sctile:not(.sel)').length,
       paintedTiles: [].slice.call(document.querySelectorAll('.sctile canvas')).filter((cv) => {
         const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
         for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return true;
         return false;
       }).length,
       chips: (q('.scchips b') || {}).textContent,
       mult: (q('.scmult b') || {}).textContent,
       total: (q('.scscore b') || {}).textContent,
       logLines: document.querySelectorAll('.scline').length,
       hasSlider: !!q('#scStep'),
     };
     /* 字体：分数该用游戏自带的像素字体（单文件版内嵌；站点版由 boot.js 从访客游戏文件注册）。
        光看 font-family 不算数 —— 把 "0123456789" 在像素字体 / 等宽 / 无衬线三种字体下各量一次宽度，
        三种宽度互不相同才证明游戏字体真的生效（否则说明悄悄回退了）。 */
     r.font = (() => {
       const faces = [].slice.call(document.fonts).map((f) => f.family + '/' + f.weight + '/' + f.status);
       const el = q('.scchips b');
       const probe = (family) => { const cx = document.createElement('canvas').getContext('2d'); cx.font = '700 32px ' + family; return +cx.measureText('0123456789').width.toFixed(2) };
       return {
         faces, check700: (() => { try { return document.fonts.check('700 32px BalatroPixel') } catch (e) { return 'err' } })(),
         pixVar: getComputedStyle(document.documentElement).getPropertyValue('--pix').trim(),
         computed: getComputedStyle(el).fontFamily, weight: getComputedStyle(el).fontWeight, size: getComputedStyle(el).fontSize,
         wPix: probe('BalatroPixel'), wMono: probe('monospace'), wSans: probe('sans-serif'),
         palette: { panel: getComputedStyle(q('.schud')).backgroundColor, chips: getComputedStyle(q('.scchips')).backgroundColor, mult: getComputedStyle(q('.scmult')).backgroundColor, total: getComputedStyle(q('.scscore')).backgroundColor },
       }
     })();
     /* 记下整块计分板的位置，跑完由 driver 裁下来放大看排版（数值断言看不出好不好看） */
     r.board = (() => {
       const b = q('.scboard');
       if (!b) return null;
       const rc = b.getBoundingClientRect();
       return { x: Math.round(rc.left), t: Math.round(rc.top + (window.scrollY || 0)), w: Math.round(rc.width), h: Math.round(rc.height) };
     })();
     r.vw = window.innerWidth;
     /* 逐步播放：走到第 3 步，检查高亮与数值是否跟着变 */
     q('#scNext').click(); await __V.wait(300);
     q('#scNext').click(); await __V.wait(300);
     q('#scNext').click(); await __V.wait(400);
     r.step = {
       now: (q('.scnow') || {}).textContent,
       stepn: (q('.scstepn') || {}).textContent,
       chips: (q('.scchips b') || {}).textContent,
       highlightedRow: document.querySelectorAll('.scline.on').length,
       highlightedTile: document.querySelectorAll('.sctile.on').length,
       todoTiles: document.querySelectorAll('.sctile.todo').length,
     };
     /* 点第一张打出的牌 → 出现编辑面板；选「方块」 */
     const t0 = document.querySelectorAll('#scPlayed .sctile')[0];
     t0.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})); await __V.wait(500);
     r.edit = { hasPanel: !!document.querySelector('.scpkh'), pkRows: document.querySelectorAll('.scpkrow').length };
     const suitBtn = [].slice.call(document.querySelectorAll('.scpk')).filter((b) => b.dataset.pick === 'suit' && b.dataset.v === 'D')[0];
     if (suitBtn) { suitBtn.click(); await __V.wait(500) }
     r.edit.suitAfter = B.score.state.played[0].suit;
     r.errors = window.__V.errors.length;
     return r })()`,
  /* 新版计分页 + 卡牌选择器：一次点几张就加几张 */
  scorePickNew: `(async()=>{
     const B=window.__BALATRO__; const r={view:'scorePickNew'};
     if(!B||!B.score) return {fatal:'no score api'};
     B.state.tab='score'; B.render();
     await __V.wait(1200);
     const q=(s)=>document.querySelector(s);
     r.stage=!!q('.scstage');
     r.hud={name:(q('.schandname b')||{}).textContent, lvl:(q('.schandname i')||{}).textContent,
            chips:(q('.scchips b')||{}).textContent, mult:(q('.scmult b')||{}).textContent,
            score:(q('.scscore b')||{}).textContent, x:(q('.scx')||{}).textContent};
     r.empty=[].slice.call(document.querySelectorAll('.scrail .scempty')).map(e=>e.textContent.slice(0,12));
     q('#scAddJoker').click(); await __V.wait(700);
     r.picker={open:!!q('#scPick'), cats:[].slice.call(document.querySelectorAll('.scpickcat')).map(b=>b.textContent.trim()),
               cells:document.querySelectorAll('#scPickGrid .scpkcell').length, search:!!q('#scPickQ')};
     const cells=[].slice.call(document.querySelectorAll('#scPickGrid .scpkcell'));
     for(let i=0;i<3;i++){ if(cells[i]){ cells[i].click(); await __V.wait(180) } }
     r.afterJokers={jokerTiles:document.querySelectorAll('#scJokers .sctile').length, count:(q('.scpickcount')||{}).textContent};
     __V.byText('.scpickcat','扑克牌').click(); await __V.wait(800);
     r.cardTab={cells:document.querySelectorAll('#scPickGrid .scpkcell').length, suits:document.querySelectorAll('.scpicksuit').length};
     const cc=[].slice.call(document.querySelectorAll('#scPickGrid .scpkcell'));
     for(let i=0;i<5;i++){ if(cc[i]){ cc[i].click(); await __V.wait(180) } }
     r.afterCards={handTiles:document.querySelectorAll('#scHand .sctile').length,
                   selTiles:document.querySelectorAll('#scHand .sctile.sel').length,
                   playedTiles:document.querySelectorAll('#scPlayed .sctile').length,
                   chips:(q('.scchips b')||{}).textContent, score:(q('.scscore b')||{}).textContent};
     q('#scPickDone').click(); await __V.wait(400);
     r.closed=!q('#scPick');
     document.querySelectorAll('#scHand .sctile')[0].click(); await __V.wait(400);
     r.toggleOff={sel:document.querySelectorAll('#scHand .sctile.sel').length, played:document.querySelectorAll('#scPlayed .sctile').length};
     document.querySelectorAll('#scHand .sctile')[0].click(); await __V.wait(400);
     r.toggleOn={sel:document.querySelectorAll('#scHand .sctile.sel').length, played:document.querySelectorAll('#scPlayed .sctile').length};
     const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});
     document.querySelectorAll('#scHand .sctile')[0].dispatchEvent(ev);
     await __V.wait(500);
     r.focusPanel={open:!!q('.scfocus'), rows:document.querySelectorAll('.scpkrow').length,
                   pills:document.querySelectorAll('.scpk').length};
     if(q('.scpk[data-pick="suit"][data-v="H"]')){ q('.scpk[data-pick="suit"][data-v="H"]').click(); await __V.wait(400) }
     const st=B.score.state;
     r.suitAfter=(st.played[0]||{}).suit;
     r.painted=[].slice.call(document.querySelectorAll('#scHand .sctile canvas')).filter(cv=>{
        const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
        for(let i=3;i<d.length;i+=4) if(d[i]>8) return true; return false }).length;
     r.palette={chips:getComputedStyle(q('.scchips')).backgroundColor, mult:getComputedStyle(q('.scmult')).backgroundColor,
                stage:getComputedStyle(q('.scstage')).backgroundColor};
     r.board=(()=>{const b=q('.scstage'); if(!b) return null; const rc=b.getBoundingClientRect();
        return {t:Math.round(rc.top+(window.scrollY||0)),w:Math.round(rc.width),h:Math.round(rc.height)}})();
     r.errors=window.__V.errors.length;
     /* 量一下真实排版：卡距/重叠/抬起高度，跟原版的数字对一下 */
     r.geom=(()=>{
       const R=(el)=>{ if(!el) return null; const b=el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)} };
       const tiles=[].slice.call(document.querySelectorAll('#scHand .sctile'));
       const rd=(t)=>Math.round(t.getBoundingClientRect().x);
       const xs=tiles.map(rd), ys=tiles.map(t=>Math.round(t.getBoundingClientRect().y));
       const played=[].slice.call(document.querySelectorAll('#scPlayed .sctile')).map(rd);
       const jok=[].slice.call(document.querySelectorAll('#scJokers .sctile')).map(rd);
       return {hud:R(q('.schud')), chips:R(q('.scchips')), mult:R(q('.scmult')), score:R(q('.scscore')),
               stage:R(q('.scstage')), handRail:R(q('#scHand')), playedRail:R(q('#scPlayed')),
               cardW:tiles[0]?Math.round(tiles[0].getBoundingClientRect().width):null,
               handStep:xs.length>1?xs[1]-xs[0]:null,
               playedStep:played.length>1?played[1]-played[0]:null,
               jokerStep:jok.length>1?jok[1]-jok[0]:null,
               ysRange:ys.length?[Math.min.apply(null,ys),Math.max.apply(null,ys)]:null};
     })();
     return r })()`,
  bootErr: `(async()=>{
     const r={};
     r.ready=window.__BALATRO_READY__;
     r.hasB=typeof window.__BALATRO__;
     r.hasShell=!!document.getElementById('shell');
     r.topbarKids=document.getElementById('topbar')?document.getElementById('topbar').children.length:-1;
     r.cats=document.querySelectorAll('.cat').length;
     r.cells=document.querySelectorAll('.cell').length;
     r.vErr=(window.__V&&window.__V.errors)||null;
     r.scripts=[].slice.call(document.scripts).map(s=>s.textContent.length);
     return r })()`,
  /* 只把选择器打开，好截图看它像不像原版的收藏页 */
  scorePickOpen: `(async()=>{
     const B=window.__BALATRO__;
     B.state.tab='score'; B.render();
     await __V.wait(1000);
     document.querySelector('#scAddJoker').click();
     await __V.wait(1500);
     const r={open:!!document.querySelector('#scPick'),
       cells:document.querySelectorAll('#scPickGrid .scpkcell').length,
       painted:[].slice.call(document.querySelectorAll('#scPickGrid .scpkart canvas')).length,
       grid:getComputedStyle(document.querySelector('#scPickGrid')).gridTemplateColumns.split(' ').length,
       panel:getComputedStyle(document.querySelector('.scpickpanel')).backgroundColor,
       errors:window.__V.errors.length};
     /* 悬停第一格 → 原版那样的说明框（G.UIDEF.card_h_popup） */
     const c0=document.querySelector('#scPickGrid .scpkcell');
     if(c0){ c0.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false})); await __V.wait(300); }
     const tip=document.querySelector('#scPickTip');
     r.tip=tip?{shown:getComputedStyle(tip).display!=='none', text:(tip.textContent||'').slice(0,60), w:Math.round(tip.getBoundingClientRect().width)}:null;
     return r })()`,
  /* 主题体检：把原版配方该落地的地方量一遍（背景/圆角/阴影/字色） */
  themeAudit: `(async()=>{
     const B=window.__BALATRO__; const r={};
     const cs=(sel,prop)=>{ const el=document.querySelector(sel); return el?getComputedStyle(el)[prop]:null };
     const box=(sel)=>{ const el=document.querySelector(sel); if(!el) return null; const s=getComputedStyle(el);
       return {bg:s.backgroundColor,bgImg:s.backgroundImage.slice(0,30),r:s.borderRadius,shadow:s.boxShadow.slice(0,40),color:s.color,font:s.fontFamily.split(",")[0],txtShadow:s.textShadow.slice(0,30)} };
     r.body={bg:getComputedStyle(document.body).backgroundColor, font:getComputedStyle(document.body).fontFamily.split(",")[0]};
     r.topbar=box("#topbar"); r.tab=box("#tabs button"); r.tabOn=box("#tabs button.on");
     r.cat=box(".cat"); r.catOn=box(".cat.on"); r.tbtn=box(".tbtn");
     r.varAccent=cs(":root","--accent");
     r.vars={accent:getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
             bg:getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
             line:getComputedStyle(document.documentElement).getPropertyValue("--line").trim(),
             pix:getComputedStyle(document.documentElement).getPropertyValue("--pix").trim().slice(0,30)};
     /* 图鉴网格里的卡位 */
     r.cell=box(".cell"); r.cellOn=box(".cell.on");
     B.state.tab='score'; B.render(); await __V.wait(900);
     r.stage=box(".scstage"); r.hud=box(".schud"); r.chips=box(".scchips"); r.mult=box(".scmult");
     r.btnPrimary=box(".btn.primary"); r.btnOrange=box(".btn.orange"); r.btnPlain=box(".btn");
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 一键示例之后的计分页：截图给肉眼看（2× 裁切由 driver 做） */
  scoreNewPreset: `(async()=>{
     const B=window.__BALATRO__; const r={view:'scoreNewPreset'};
     B.state.tab='score'; B.render(); await __V.wait(800);
     const sel=document.querySelector('#scPreset');
     sel.value='同花五张'; sel.onchange({target:sel});
     await __V.wait(1400);
     const q=(s)=>document.querySelector(s);
     r.hud={name:(q('.schandname b')||{}).textContent, chips:(q('.scchips b')||{}).textContent,
            mult:(q('.scmult b')||{}).textContent, score:(q('.scscore b')||{}).textContent};
     r.rows={jokers:document.querySelectorAll('#scJokers .sctile').length,
             played:document.querySelectorAll('#scPlayed .sctile').length,
             hand:document.querySelectorAll('#scHand .sctile').length,
             sel:document.querySelectorAll('#scHand .sctile.sel').length};
     r.note=(q('#scNote')||{}).textContent;
     r.board=(()=>{const b=q('.scstage').getBoundingClientRect(); return {x:Math.round(b.left),t:Math.round(b.top+(window.scrollY||0)),w:Math.round(b.width),h:Math.round(b.height)}})();
     r.stage=r.board;
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 原版算分涉及的状态：局面数值 + 小丑牌记录值 + 拖拽 + 选择器滚动/撤销 */
  scoreState: `(async()=>{
     const B=window.__BALATRO__; const r={view:'scoreState'};
     const SC=B.score.state;
     SC.played=[]; SC.held=[]; SC.jokers=[]; B.render();
     B.state.tab='score'; B.render(); await __V.wait(1200);
     const q=(s)=>document.querySelector(s), qa=(s)=>[].slice.call(document.querySelectorAll(s));
     /* ① 首次进入应当自动发 8 张 */
     r.deal={hand:qa('#scHand .sctile').length, sel:qa('#scHand .sctile.sel').length};
     /* ② 牌型下拉是中文 */
     const sel=q('#scHandType');
     r.handOptions={count:sel.options.length, first:sel.options[0].textContent, flushFive:(sel.options[sel.options.length-1]||{}).textContent};
     r.hudName=(q('.schandname b')||{}).textContent;
     /* ③ 局面：牌堆张数 → Blue Joker 的筹码 */
     SC.jokers.push(B.score.jokerFromItem(B.byId['j_blue_joker']));
     B.render(); await __V.wait(600);
     const envDeck=q('[data-env="deckCards"]');
     r.envFields=qa('[data-env]').length;
     envDeck.value='10'; envDeck.dispatchEvent(new Event('input',{bubbles:true})); await __V.wait(500);
     const chips10=q('.scchips b').textContent;
     envDeck.value='40'; envDeck.dispatchEvent(new Event('input',{bubbles:true})); await __V.wait(500);
     r.blueJoker={deckCards:SC.env.deckCards, chipsAt10:chips10, chipsAt40:q('.scchips b').textContent};
     /* ④ 记录值：Fortune Teller 看已用塔罗牌张数 */
     SC.jokers=[]; SC.jokers.push(B.score.jokerFromItem(B.byId['j_fortune_teller']), B.score.jokerFromItem(B.byId['j_ride_the_bus']));
     B.render(); await __V.wait(600);
     const tq=q('[data-env="tarotUsed"]');
     tq.value='7'; tq.dispatchEvent(new Event('input',{bubbles:true})); await __V.wait(500);
     r.fortune={mult:q('.scmult b').textContent, rows:qa('.scline').length, warned:qa('.scwarn div').map(d=>d.textContent.slice(0,30))};
     /* ⑤ 小丑牌面板：点开 → 改它自己的记录值 */
     const jt=q('#scJokers .sctile:nth-child(2)')||q('#scJokers .sctile'); jt.click(); await __V.wait(500);
     r.jokerPanel={open:!!q('.scfocus'), growthInputs:qa('[data-jstate]').length, manualInputs:qa('[data-jman]').length,
                   title:(q('.scpkh .gtitle')||{}).textContent};
     const gm=q('[data-jstate="mult"]');
     if(gm){ gm.value='3'; gm.dispatchEvent(new Event('input',{bubbles:true})); await __V.wait(500) }
     r.afterGrowth={mult:q('.scmult b').textContent, state:JSON.stringify(SC.jokers[1].state)};
     /* ⑥ 拖拽换结算顺序 */
     SC.jokers=[]; ['j_joker','j_greedy_joker','j_cavendish'].forEach(id=>SC.jokers.push(B.score.jokerFromItem(B.byId[id])));
     B.render(); await __V.wait(700);
     const before=SC.jokers.map(j=>j.id).join('|');
     const tiles=qa('#scJokers .sctile');
     const dt=new DataTransfer();
     tiles[0].dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));
     const rect=tiles[2].getBoundingClientRect();
     tiles[2].dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer:dt,clientX:rect.right-2}));
     tiles[2].dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt,clientX:rect.right-2}));
     await __V.wait(600);
     r.drag={before, after:SC.jokers.map(j=>j.id).join('|')};
     /* ⑦ 选择器：能滚动 + 撤销 + 已选反馈 */
     q('#scAddJoker').click(); await __V.wait(1200);
     const grid=q('#scPickGrid');
     r.picker={scrollable:grid.scrollHeight>grid.clientHeight+4, scrollH:grid.scrollHeight, clientH:grid.clientHeight,
               panelH:Math.round(q('.scpickpanel').getBoundingClientRect().height), winH:window.innerHeight};
     const cells=qa('#scPickGrid .scpkcell');
     cells[0].click(); cells[1].click(); await __V.wait(700);
     r.added={jokers:SC.jokers.length, logChips:qa('#scPickLog .scpicklogchip').length,
              pickedBadges:qa('.scpkcell .scpkpick').length, undoDisabled:q('#scPickUndo').disabled};
     q('#scPickUndo').click(); await __V.wait(600);
     r.afterUndo={jokers:SC.jokers.length, logChips:qa('#scPickLog .scpicklogchip').length};
     q('#scPickClear').click(); await __V.wait(600);
     r.afterClear={jokers:SC.jokers.length, undoDisabled:q('#scPickUndo').disabled};
     q('#scPickDone').click();
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 覆盖率：150 张小丑牌逐张单独上一次，看有多少能真算出来 */
  scoreCoverage: `(async()=>{
     const B=window.__BALATRO__; const SC=B.score.state;
     const saved={played:SC.played, held:SC.held, jokers:SC.jokers, hand:SC.hand, env:JSON.stringify(SC.env)};
     SC.hand='Pair'; SC.played=[B.score.card('K','S'),B.score.card('K','H')]; SC.held=[];
     const items=B.items.filter(x=>x.cat==='Joker');
     const out={computed:[], manual:[], nothing:[], error:[], hasRule:[], noRule:[]};
     for(const it of items){
       let j=null; try{ j=B.score.jokerFromItem(it) }catch(e){ out.error.push(it.name+' ('+e.message+')'); continue }
       if(!j){ out.error.push(it.name+' (no cfg)'); continue }
       SC.jokers=[j];
       /* 三手牌都试一遍：对子 / 同花 / 顺子，尽量让按牌判定的规则有触发机会 */
       const hands=[['Pair',[['K','S'],['K','H']],[]],['Flush',[['A','S'],['K','S'],['Q','S'],['J','S'],['9','S']],[]],
                    ['Straight Flush',[['2','H'],['3','H'],['4','H'],['5','H'],['6','H']],[]]];
       let r=null, anyRow=false, anyWarn=false;
       for(const [hn,cs,hd] of hands){
         SC.hand=hn; SC.played=cs.map(x=>B.score.card(x[0],x[1])); SC.held=hd.map(x=>B.score.card(x[0],x[1]));
         let rr=null; try{ rr=B.score.compute() }catch(e){ out.error.push(it.name+' ('+e.message+')'); break }
         if(rr.rows.some(x=>x.ref&&x.ref.kind==='joker'&&x.ref.i===0&&x.op!=='note')) anyRow=true;
         if(rr.warns.some(w=>w.i===0)) anyWarn=true;
         r=rr;
       }
       if(!r) continue;
       const hasRule=!!B.score.rules().rules.find(x=>x.n===it.name);
       (hasRule?out.hasRule:out.noRule).push(it.name);
       const hasJokerRow=r.rows.some(x=>x.ref&&x.ref.kind==='joker'&&x.ref.i===0&&x.op!=='note');
       const warned=r.warns.some(w=>w.i===0);
       if(hasJokerRow) out.computed.push(it.name); else if(warned) out.manual.push(it.name); else out.nothing.push(it.name);
     }
     SC.played=saved.played; SC.held=saved.held; SC.jokers=saved.jokers; SC.hand=saved.hand; SC.env=JSON.parse(saved.env);
     B.render();
     return {total:items.length, computed:out.computed.length, manual:out.manual.length, nothing:out.nothing.length, hasRule:out.hasRule.length, noRule:out.noRule.length, noRuleList:out.noRule,
             manualList:out.manual.slice(0,40), nothingList:out.nothing.slice(0,25), errorList:out.error.slice(0,10),
             errors:window.__V.errors.length} })()`,
  scoreDebug: `(async()=>{
     const B=window.__BALATRO__; const SC=B.score.state;
     const out={};
     for(const id of ['j_jolly','j_duo','j_sly','j_greedy_joker','j_stencil','j_blackboard','j_hologram','j_blueprint']) {
       SC.jokers=[B.score.jokerFromItem(B.byId[id])];
       if(id==='j_blueprint') SC.jokers.push(B.score.jokerFromItem(B.byId['j_jolly']));
       SC.hand='Pair'; SC.played=[B.score.card('K','S'),B.score.card('K','H')]; SC.held=[];
       const r=B.score.compute();
       out[id]={chips:r.chips, mult:+r.mult.toFixed(2),
                rows:r.rows.filter(x=>x.op!=='base'&&x.op!=='card').map(x=>x.label).slice(0,4),
                warns:r.warns.map(w=>w.n+'：'+w.why.slice(0,20)),
                rule:(B.score.rules().rules.find(x=>x.n===B.byId[id].name)||{}).k||'（无）'};
     }
     return {out, errors:window.__V.errors.length} })()`,
  scoreProbe: `(async()=>{
     const B=window.__BALATRO__;
     const keys=Object.keys(B.byId).filter(k=>/jolly|duo|stencil|sly|greedy|hologram|blueprint|blackboard/.test(k));
     const ids=B.items.filter(x=>x.cat==='Joker').slice(0,8).map(x=>x.id);
     return {keys, ids, hasJolly:!!B.byId['j_jolly'], n:Object.keys(B.byId).length} })()`,
  scorePickScrollMobile: `(async()=>{
     const B=window.__BALATRO__;
     B.state.tab='score'; B.render(); await __V.wait(900);
     document.querySelector('#scAddJoker').click(); await __V.wait(1200);
     const g=document.querySelector('#scPickGrid'), p=document.querySelector('.scpickpanel');
     const pr=p.getBoundingClientRect(), gr=g.getBoundingClientRect();
     /* 真滚一下，看内容有没有跟着动 */
     const before=g.scrollTop; g.scrollTop=400; const after=g.scrollTop;
     return {win:{w:window.innerWidth,h:window.innerHeight}, panelH:Math.round(pr.height), panelBottom:Math.round(pr.bottom),
             gridClientH:g.clientHeight, gridScrollH:g.scrollHeight, canScroll:g.scrollHeight>g.clientHeight+4,
             scrolled:after>before, gridBottom:Math.round(gr.bottom), fitsInWin:gr.bottom<=window.innerHeight+1,
             errors:window.__V.errors.length} })()`,
  /* 这一轮的五件事：牌型自动判定 / 改牌弹窗 / 播放条贴底 / 中文名 / 手机适配 */
  scoreUi2: `(async()=>{
     const B=window.__BALATRO__; const SC=B.score.state; const r={view:'scoreUi2'};
     const q=(s)=>document.querySelector(s), qa=(s)=>[].slice.call(document.querySelectorAll(s));
     const C=(rk,su,enh,ed,seal)=>({rank:rk,suit:su,enh:enh||'',ed:ed||'',seal:seal||''});
     const setHand=(cards,jokers)=>{ B.state.tab='score'; B.score.setHand(cards.map(c=>[c[0],c[1],c[2]]), jokers||[]); };
     /* ① 牌型自动判定（含 mod 会改规则的那几张） */
     const cases={};
     const t1=[['A','S'],['K','S'],['Q','S'],['J','S'],['10','S']];
     const t2=[['K','S'],['K','H'],['K','D'],['K','C']];
     const t3=[['2','H'],['3','H'],['4','H'],['5','H'],['7','H']];
     const t4=[['A','S'],['2','S'],['3','S'],['4','S'],['5','S']];
     const t5=[['7','C'],['7','D'],['7','H'],['9','S'],['9','C']];
     const t6=[['A','H'],['K','H'],['Q','H'],['J','H'],['10','H']];
     setHand(t1); await __V.wait(200); cases.royal=t0=SC.hand;
     setHand(t2); await __V.wait(150); cases.four=SC.hand;
     setHand(t5); await __V.wait(150); cases.fullHouse=SC.hand;
     setHand(t6); await __V.wait(150); cases.straightFlush=SC.hand;
     setHand(t3); await __V.wait(150); cases.flushOnly6=SC.hand;
     setHand(t3,['j_four_fingers']); await __V.wait(200); cases.fourFingers=SC.hand;
     setHand(t4); await __V.wait(150); cases.aceLowStraight=SC.hand;
     setHand([[2,2]].map(x=>['2','S'])); await __V.wait(150); cases.pair=SC.hand;
     /* 手动指定还管用吗 */
     const sel=q('#scHandType'); sel.value='Flush'; sel.onchange({target:sel});
     await __V.wait(400); cases.manual=SC.hand+'/'+SC.handMode;
     sel.value=''; sel.onchange({target:sel}); await __V.wait(400); cases.backToAuto=SC.hand+'/'+SC.handMode;
     r.handDetect=cases;
     /* ② 改牌弹窗（右键打开）+ 中文名 */
     setHand([['K','S'],['3','H']]); await __V.wait(300);
     const tile=qa('#scHand .sctile')[0];
     tile.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
     await __V.wait(600);
     const pillNames=qa('#scPanel .scpk').map(b=>b.textContent).filter(x=>/[一-龥]/.test(x));
     r.cardEditor={open:!!q('#scPanel'), pills:qa('#scPanel .scpk').length, chinese:[].concat(pillNames).length,
       scrollable:(()=>{const s=q('#scPanel .scpanelscroll'); return s?s.scrollHeight>s.clientHeight:null})(),
       sample:pillNames.slice(0,8)};
     /* 点一个强化胶囊 → 牌真的变了，且是中文名 */
     const enhPill=qa('#scPanel .scpk[data-pick="enh"]')[1];
     if(enhPill){ enhPill.click(); await __V.wait(500) }
     r.afterPill={enh:SC.played[0].enh, painted:(()=>{const cv=q('#scPanel .scmodalart canvas'); return !!cv})()};
     { const d=q('#scPanelDone'); if(d){ d.click(); await __V.wait(300) } }
     r.editorClosed=!q('#scPanel');
     /* ③ 播放条：贴底 + 实时数值 */
     const bar=q('.scplay'); const bs=getComputedStyle(bar);
     r.playBar={position:bs.position, sticky:bs.position==='sticky',
       hasMath:!!q('.scplaymath'), chips:(q('.scpchips')||{}).textContent, score:(q('.scpscore')||{}).textContent,
       barTop:Math.round(bar.getBoundingClientRect().top), winH:window.innerHeight};
     q('#scNext').click(); await __V.wait(400);
     q('#scNext').click(); await __V.wait(400);
     r.playBar.afterSteps={chips:(q('.scpchips')||{}).textContent, score:(q('.scpscore')||{}).textContent,
       step:(q('.scstepn')||{}).textContent, barVisible:(()=>{const b=bar.getBoundingClientRect(); return b.bottom<=window.innerHeight+2&&b.top>=0})()};
     /* ④ 小丑牌弹窗里的记录值（手机上也要能滚） */
     SC.jokers=[B.score.jokerFromItem(B.byId['j_ride_the_bus'])]; B.render(); await __V.wait(400);
     const jt0=q('#scJokers .sctile'); if(jt0) jt0.click(); await __V.wait(600);
     const gs=q('#scPanel .scpanelscroll');
     r.jokerEditor={open:!!q('#scPanel'), recordInputs:qa('#scPanel [data-jstate]').length,
       manualInputs:qa('#scPanel [data-jman]').length, scrollable:gs?gs.scrollHeight>gs.clientHeight:null};
     q('#scPanelDone').click();
     r.errors=window.__V.errors.length;
     return r })()`,
  /* 编辑性能：连点强化胶囊 + 连改记录值，看每次耗时会不会越点越慢（监听器叠加会指数爆炸） */
  scorePerf: `(async()=>{
     const B=window.__BALATRO__; const SC=B.score.state; const r={view:'scorePerf'};
     const q=(s)=>document.querySelector(s), qa=(s)=>[].slice.call(document.querySelectorAll(s));
     const H=window.__V;
     H.busy=0; /* 统计页面里挂了多少个 DOM 事件监听器 */
     const countListeners=()=>{ try{ return getEventListeners?0:0 }catch(e){ return 0 } };
     B.state.tab='score'; B.render(); await H.wait(700);
     B.score.setHand([['K','S'],['3','H'],['5','D']]); await H.wait(700);
     /* 打开改牌弹窗 */
     qa('#scHand .sctile')[0].dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
     await H.wait(500);
     const perf={opened:!!q('#scPanel')};
     /* 连续点强化胶囊 12 次（以前这里会越点越卡） */
     const t0=performance.now(); const times=[];
     const enh=qa('#scPanel .scpk[data-pick="enh"]');
     for(let i=0;i<12;i++){ const a=performance.now(); enh[1+(i%6)].click(); times.push(Math.round(performance.now()-a)); }
     perf.enhClicks={n:times.length, list:times, totalMs:Math.round(performance.now()-t0), maxMs:Math.max.apply(null,times)};
     await H.wait(300);
     /* 连续改小丑牌记录值 12 次 */
     q('#scPanelDone')&&q('#scPanelDone').click(); await H.wait(200);
     SC.jokers=[B.score.jokerFromItem(B.byId['j_ride_the_bus'])]; B.render(); await H.wait(400);
     q('#scJokers .sctile').click(); await H.wait(500);
     const inp=q('#scPanel [data-jstate]');
     const t1=performance.now(); const t2=[];
     for(let i=0;i<12;i++){ const a=performance.now(); inp.value=String(i); inp.dispatchEvent(new Event('input',{bubbles:true})); t2.push(Math.round(performance.now()-a)); }
     perf.jokerInputs={n:t2.length, list:t2, totalMs:Math.round(performance.now()-t1), maxMs:Math.max.apply(null,t2)};
     /* 关键断言：轮次不能越点越慢（最后 4 次 / 前 4 次 的比值） */
     const ratio=(list)=>{ const a=list.slice(0,4).reduce((x,y)=>x+y,0)/4, b=list.slice(-4).reduce((x,y)=>x+y,0)/4; return a>0?+(b/a).toFixed(2):0 };
     perf.enhRatio=ratio(times); perf.jokerRatio=ratio(t2);
     perf.state=JSON.stringify(SC.jokers[0]&&SC.jokers[0].state);
     /* 弹窗里"改成…"按钮应该已经删掉、手填修正也不该在 */
     perf.removed={toggleBtn:!q('#scCardToggle'), manualInputs:qa('[data-jman]').length};
     /* 整体修改字段数（轻量化后） */
     perf.envFields=qa('[data-env]').length;
     perf.ftEnv=qa('#scPanel [data-jenv]').length;
     /* 占卜师：它的"已用塔罗牌"应该出现在它自己的弹窗里（不再占整体修改的格子） */
     { const d=q('#scPanelDone'); if(d) d.click(); await H.wait(200);
       SC.jokers=[B.score.jokerFromItem(B.byId['j_fortune_teller'])]; B.render(); await H.wait(400);
       q('#scJokers .sctile').click(); await H.wait(500);
       const env=qa('#scPanel [data-jenv]');
       perf.fortuneEnv={inputs:env.length, key:env[0]?env[0].dataset.jenv:null, label:env[0]?env[0].closest('.scgrowf').querySelector('span').textContent:null};
       if(env[0]){ env[0].value='7'; env[0].dispatchEvent(new Event('input',{bubbles:true})); await H.wait(500) }
       perf.fortuneMult=q('.scmult b')?q('.scmult b').textContent:null;
       perf.jokerNameCN=(q('#scJokers .scbadge')||{}).textContent;
       const d2=q('#scPanelDone'); if(d2) d2.click(); }
     perf.errors=window.__V.errors.length;
     r.perf=perf;
     return r })()`,
  gifQuality: `(async()=>{
    const A = window.__BALATRO__;
    const r = {};
    const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s) };
    const frames = [];
    const spec = Object.assign({}, A.specForItem(A.byId['j_joker']), { edition: 'e_polychrome' });
    for (let i = 0; i < 3; i++) frames.push(A.compose(spec, 2, i * 3));
    r.src = frames.map((f) => f.toDataURL('image/png'));
    const t0 = performance.now();
    const plain = A.encodeGIF(frames, 60, null, { dither: false, colors: 256 });
    const t1 = performance.now();
    const dith = A.encodeGIF(frames, 60, null, { dither: true, colors: 256 });
    const t2 = performance.now();
    const d128 = A.encodeGIF(frames, 60, null, { dither: true, colors: 128 });
    const t3 = performance.now();
    const d64 = A.encodeGIF(frames, 60, null, { dither: true, colors: 64 });
    r.times = { plain: Math.round(t1 - t0), dither: Math.round(t2 - t1), d128: Math.round(t3 - t2) };
    r.plain = { size: plain.length, b64: b64(plain) };
    r.dither = { size: dith.length, b64: b64(dith) };
    r.c128 = { size: d128.length, b64: b64(d128) };
    r.c64 = { size: d64.length, b64: b64(d64) };
    return r })()`,
  previewSpeed: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.click('.cat', '卡牌合成台', 2600);
    // open the animation section and start the live preview
    __V.byText('.forgenav .nv', '全部展开').click();
    await __V.wait(600);
    const animBtn = __V.byText('.btn', '实时动画预览');
    r.hasAnimBtn = !!animBtn;
    if (!animBtn) return r;
    const measure = async (speed) => {
      B.state.anim.speed = speed;
      if (!B.state.anim.on) animBtn.click();
      await __V.wait(300);
      const t0 = B.state.anim.t;
      await __V.wait(1200);
      const dt = B.state.anim.t - t0;
      return +dt.toFixed(2);
    };
    r.dt1 = await measure(1);
    r.dt4 = await measure(4);
    r.dt8 = await measure(8);
    r.ratio8 = +(r.dt8 / Math.max(0.001, r.dt1)).toFixed(2);
    r.ratio4 = +(r.dt4 / Math.max(0.001, r.dt1)).toFixed(2);
    // and the preview canvas must actually be repainting
    // paintPreview() swaps in a fresh canvas each frame, so re-query before hashing
    const h1 = __V.hash(document.querySelector('.preview canvas'));
    await __V.wait(400);
    r.repainting = __V.hash(document.querySelector('.preview canvas')) !== h1;
    if (B.state.anim.on) animBtn.click();
    // a legendary joker animates its floating art with a real short period
    B.state.forge.baseType = 'Joker'; B.state.forge.base = 'j_caino';
    B.state.forge.stickers = { eternal: false, perishable: false, rental: false, color: '' };
    const t0 = performance.now();
    B.render();
    r.forgeRenderMs = Math.round(performance.now() - t0);
    await __V.wait(5000);
    r.legendaryReadout = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.detected = (() => {
      const sp = B.specForItem(B.byId['j_caino']);
      return typeof B.detectPeriod === 'function' ? B.detectPeriod(sp) : 'not exposed';
    })();
    // with the leftover foil edition the card really has no short loop — that is the honest
    // answer; clear it to see the detector's positive case
    r.withFoil = B.detectPeriod(B.forgeSpec());
    B.state.forge.edition = '';
    B.render();
    await __V.wait(2600);
    r.legendaryReadoutNoEd = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.specs = {
      item: JSON.stringify(B.specForItem(B.byId['j_caino'])),
      forge: JSON.stringify(B.forgeSpec()),
    };
    r.itemPeriod = B.detectPeriod(B.specForItem(B.byId['j_caino']));
    r.forgePeriod = B.detectPeriod(B.forgeSpec());
    r.forgeOpts = JSON.stringify(B.animOpts(B.forgeSpec()));
    // repeat renders must be cheap: the period is cached, and the forge re-render should not
    // re-run the whole search
    const t1 = performance.now();
    B.render();
    r.secondRenderMs = Math.round(performance.now() - t1);
    await __V.wait(2500);
    r.legendaryReadout2 = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    // the loop readout should mention the detected loop point when there is one
    r.readout = (document.querySelector('.preview .hint.mono') || {}).textContent || '';
    r.loopLabel = ([].slice.call(document.querySelectorAll('.btn')).filter((b) => /循环/.test(b.textContent))[0] || {}).textContent || '';
    return r })()`,
  audit: `(async()=>{
    const B = window.__BALATRO__;
    const r = { errors: [] };
    const fail = (m) => r.errors.push(m);
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    // 1) every view renders without throwing and without blank canvases
    const views = ['codex', 'forge', 'atlas', 'hands', 'shaders', 'data', 'mods', 'scorePickOpen', 'scorePickNew', 'scoreNewPreset'];
    r.views = {};
    for (const v of views) {
      try {
        B.state.tab = v; B.render();
        await sleep(v === 'forge' ? 2600 : 1200);
        const b = __V.blank();
        r.views[v] = { canvases: b.total, blank: b.blank, forced: document.body.getAttribute('data-forced') || null };
        if (b.blank) fail('view ' + v + ' has ' + b.blank + ' blank canvases: ' + b.sample.join(', '));
      } catch (e) { fail('view ' + v + ' threw: ' + e.message) }
    }

    // 2) every vanilla item composes to something non-empty and every atlas resolves
    let noSpec = 0; let blank = 0;
    const blankSample = [];
    for (const it of B.items) {
      const sp = B.specForItem(it);
      if (!sp) { noSpec++; continue }
      const cv = B.compose(sp, 1, 0);
      const box = __V.bbox(cv);
      if (!box) { blank++; if (blankSample.length < 8) blankSample.push(it.id) }
    }
    r.items = { total: B.items.length, noSpec, blank, blankSample };
    if (blank) fail(blank + ' items compose to a blank canvas: ' + blankSample.join(', '));

    // 3) referenced atlases must exist
    const missingAtlas = [];
    for (const it of B.items) {
      if (it.atlas && !B.atlases[it.atlas]) missingAtlas.push(it.id + '→' + it.atlas);
      if (it.soul && it.soul.atlas && !B.atlases[it.soul.atlas]) missingAtlas.push(it.id + ' soul→' + it.soul.atlas);
    }
    r.missingAtlas = missingAtlas.slice(0, 10);
    if (missingAtlas.length) fail(missingAtlas.length + ' items point at a missing atlas');

    // 4) export helpers round-trip
    try {
      const cv = B.compose(B.specForItem(B.byId['j_joker']), 2, 0);
      const png = await B.canvasBytes(cv);
      r.png = { bytes: png.length, sig: [].slice.call(png.slice(1, 4)).map((x) => String.fromCharCode(x)).join('') };
      if (r.png.sig !== 'PNG') fail('canvasBytes did not produce a PNG');
      const z = B.zipStore([{ name: 'a.png', data: png }]);
      r.zip = { bytes: z.length, magic: [].slice.call(z.slice(0, 2)).map((x) => String.fromCharCode(x)).join('') };
      if (r.zip.magic !== 'PK') fail('zipStore did not produce a zip');
      const csv = B.toCSV([B.byId['j_joker']]);
      r.csv = csv.split('\\n').length;
      const js = JSON.stringify(B.itemJSON(B.byId['j_joker']));
      r.json = js.length;
    } catch (e) { fail('export helpers threw: ' + e.message) }

    // 5) the shader programs must all be usable (no missing uniform crashes)
    r.shaders = B.shaderPrograms.length;
    for (const name of B.shaderPrograms) {
      try { const o = B.shadeTile({ atlas: 'Joker', pos: { x: 0, y: 0 } }, 71, 95, name, 1.7); if (!o) fail('shadeTile returned nothing for ' + name) } catch (e) { fail('shader ' + name + ' threw: ' + e.message) }
    }

    // 6) the loop detector must be deterministic and cached
    const sp = B.specForItem(B.byId['j_caino']);
    const t0 = performance.now(); const p1 = B.detectPeriod(sp); const t1 = performance.now();
    const p2 = B.detectPeriod(sp); const t2 = performance.now();
    r.loop = { period: p1, firstMs: Math.round(t1 - t0), cachedMs: Math.round(t2 - t1) };
    if (p1 !== p2) fail('detectPeriod is not deterministic');
    if (t2 - t1 > 5) fail('detectPeriod is not cached (second call took ' + Math.round(t2 - t1) + 'ms)');

    // 7) page-level errors
    r.pageErrors = window.__V.errors.slice();
    if (r.pageErrors.length) fail('page errors: ' + r.pageErrors.join(' | '));
    r.ok = r.errors.length === 0;
    return r })()`,
  liteBoot: `(async()=>{
    const r = { view: 'liteBoot' };
    // 1) the start screen must be there and the page must have NO game data
    for (let i = 0; i < 40 && !document.querySelector('#boot .bootcard'); i++) await __V.wait(200);
    r.hasBootScreen = !!document.querySelector('#boot .bootcard');
    r.buttons = [].slice.call(document.querySelectorAll('#boot .btn')).map((b) => b.textContent);
    r.hasInlineData = typeof window.__BALATRO_DATA__ !== 'undefined';
    r.hasAppHandle = typeof window.__BALATRO__ !== 'undefined';
    r.hiddenShell = getComputedStyle(document.getElementById('shell')).display !== 'none';
    r.bootVisible = (() => { const b = document.getElementById('boot'); return b && getComputedStyle(b).display !== 'none' })();
    r.statusAtStart = (document.querySelector('#boot .bootstatus') || {}).textContent || '';

    // 2) the driver has put a game exe on the input by now; wait for the parse + app boot
    for (let i = 0; i < 300 && typeof window.__BALATRO__ === 'undefined'; i++) await __V.wait(300);
    r.appBooted = typeof window.__BALATRO__ !== 'undefined';
    if (!r.appBooted) {
      r.status = (document.querySelector('#boot .bootstatus') || {}).textContent || '(none)';
      r.pageErrors = window.__V.errors.slice();
      return r;
    }
    const B = window.__BALATRO__;
    r.items = B.items.length;
    r.atlases = Object.keys(B.atlases).length;
    r.textureUrls = Object.keys(window.__BALATRO_ATLAS__).length;
    r.blobUrls = Object.keys(window.__BALATRO_ATLAS__).filter((k) => String(window.__BALATRO_ATLAS__[k]).startsWith('blob:')).length;
    r.meta = { version: B.data.meta.version, source: B.data.meta.source, generated: !!B.data.meta.generated };
    r.bootHidden = getComputedStyle(document.getElementById('boot')).display === 'none';

    // 3) the catalogue must actually render
    B.state.tab = 'codex'; B.state.cat = 'all'; B.render();
    await __V.wait(2500);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.blank = __V.blank();
    r.firstCell = (document.querySelector('#content .cell .nm') || {}).textContent || '';

    // 4) a category with a shader-heavy card, and the atlas page
    B.state.cat = 'Joker'; B.render(); await __V.wait(1800);
    const holo = document.querySelector('#content .cell[data-id="j_hologram"]');
    r.hasHologram = !!holo;
    if (holo) { holo.click(); await __V.wait(1200) }
    r.detailTitle = (document.querySelector('#detail .dhead h3') || {}).textContent || '';
    r.detailHasSprite = !!document.querySelector('#detail .dhead canvas');
    r.shaders = B.shaderPrograms.length;

    // 5) one export, to be sure canvas → bytes still works with blob-backed textures
    try {
      const cv = B.compose(B.specForItem(B.byId['j_joker']), 2, 0);
      const png = await B.canvasBytes(cv);
      r.exported = { bytes: png.length, ok: png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47 };
    } catch (e) { r.exportError = e.message }

    r.pageErrors = window.__V.errors.slice();
    return r })()`,
  deepLink: `(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    B.state.tab = 'codex'; B.state.cat = 'Joker'; B.state.sel = 'j_cry_mosaic'; B.state.lang = 'en-us';
    B.render();
    await __V.wait(1200);
    B.state.sel = 'j_joker'; B.render();
    await __V.wait(900);
    r.hash = location.hash;
    r.parsed = B.hashString();
    r.share = B.shareUrl();
    r.cellsStillRight = document.querySelectorAll('#content .cell').length;

    // the copy button lives in the detail panel
    r.copyBtn = ([].slice.call(document.querySelectorAll('#detail .btn')).filter((b) => /复制链接/.test(b.textContent))[0] || {}).textContent || null;

    // now simulate opening that link in a fresh page
    const target = location.href.replace(/#.*$/, '') + B.hashString();
    location.href = target;
    return r })()`,

  deepLinkOpen: `(async()=>{
    const B = window.__BALATRO__;
    const r = { url: decodeURIComponent(location.hash) };
    // applyHash ran during init, so the state must already match the URL
    r.state = { tab: B.state.tab, cat: B.state.cat, sel: B.state.sel, lang: B.state.lang };
    await __V.wait(1600);
    r.title = (document.querySelector('#content .listhead h2') || {}).textContent || '';
    r.detail = (document.querySelector('#detail .dhead h3') || {}).textContent || '';
    r.cells = document.querySelectorAll('#content .cell').length;
    r.selected = (document.querySelector('#content .cell.on') || {}).dataset ? document.querySelector('#content .cell.on').dataset.id : null;
    r.blank = __V.blank();
    return r })()`,
  localSite: `(async()=>{
    const r = { url: location.href };
    r.beforeReady = true;
    if (typeof window.__BALATRO__ === 'undefined') {
      r.fatal = 'viewer did not boot from the local site';
      r.bootStatus = (document.querySelector('#boot .bootstatus') || {}).textContent || '';
      r.scripts = [].slice.call(document.scripts).map((x) => x.src || '(inline)');
      r.appScriptPresent = !!document.querySelector('script[src*="app.js"]');
      r.globals = {
        data: !!window.__BALATRO_DATA__,
        atlas: window.__BALATRO_ATLAS__ ? Object.keys(window.__BALATRO_ATLAS__).length : 0,
        lua: !!window.__LUA__,
        glshaders: !!window.__GLSHADERS__,
        modimport: !!window.__MODIMPORT__,
        databuild: !!window.__DATABUILD__,
        gameparse: !!window.__GAMEPARSE__,
      };
      r.pageErrors = window.__V.errors.slice();
      return r;
    }
    const B = window.__BALATRO__;
    r.items = B.items.length;
    r.atlases = Object.keys(B.atlases).length;
    r.textureUrls = Object.keys(window.__BALATRO_ATLAS__).length;
    r.blobUrls = Object.keys(window.__BALATRO_ATLAS__).filter((k) => String(window.__BALATRO_ATLAS__[k]).startsWith('blob:')).length;
    r.bootHidden = (() => { const b = document.getElementById('boot'); return !b || getComputedStyle(b).display === 'none' })();
    r.pickedNothing = typeof window.__SOURCE_NOTE__ === 'undefined';
    r.version = B.data.meta.version;

    B.state.tab = 'codex'; B.state.cat = 'all'; B.render();
    await __V.wait(2500);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.blank = __V.blank();

    // deep link over http
    const dl = 'c=Tarot&i=c_fool';
    location.hash = '#' + dl;
    await __V.wait(1200);
    r.deepLink = { hash: location.hash, cat: B.state.cat, sel: B.state.sel, detail: (document.querySelector('#detail .dhead h3') || {}).textContent || '' };

    // a shader-heavy render, to be sure WebGL still works
    B.state.cat = 'Joker'; B.state.q = ''; B.state.source = 'all'; B.render();
    await __V.wait(1500);
    const holo = B.compose(B.specForItem(B.byId['j_hologram']), 2, 0);
    r.hologramBox = __V.bbox(holo);
    r.shaders = B.shaderPrograms.length;

    // service worker
    r.sw = { supported: 'serviceWorker' in navigator };
    if (r.sw.supported) {
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      r.sw.registered = !!reg;
      r.sw.scope = reg ? reg.scope : null;
      r.sw.state = reg && reg.active ? reg.active.state : (reg && reg.installing ? 'installing' : null);
      r.sw.controlled = !!navigator.serviceWorker.controller;
      r.sw.caches = await caches.keys().catch(() => []);
    }
    r.pageErrors = window.__V.errors.slice();
    return r })()`,

  localOffline: `(async()=>{
    // second visit: the service worker should be serving from its cache, and a hard reload
    // must still produce a working viewer with no network at all
    const r = { url: location.href };
    const B = window.__BALATRO__;
    if (typeof B === 'undefined') { r.fatal = 'no viewer after reload'; return r }
    r.items = B.items.length;
    r.controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    r.caches = await caches.keys().catch(() => []);
    const names = await (async () => {
      const out = [];
      for (const n of await caches.keys()) {
        const c = await caches.open(n);
        for (const req of await c.keys()) out.push(new URL(req.url).pathname);
      }
      return out;
    })().catch(() => []);
    r.cachedPaths = names.sort();
    r.cachedCore = ['/index.html', '/boot.js', '/app.js'].every((p) => names.includes(p));
    r.cachedPack = names.includes('/assets/data.json') && names.includes('/assets/atlas.bin');
    B.state.tab = 'codex'; B.state.cat = 'all'; B.render();
    await __V.wait(2200);
    r.cells = document.querySelectorAll('#content .cell').length;
    r.blank = __V.blank();
    r.pageErrors = window.__V.errors.slice();
    return r })()`,
}

async function main () {
  /* demoRect 的同一个场景需要一个"手机尺寸"的别名，好让 runner 按名字切换视口 */
  if (SCENARIOS.demoRect && !SCENARIOS.demoRectMobile) SCENARIOS.demoRectMobile = SCENARIOS.demoRect
  if (SCENARIOS.demoLayout && !SCENARIOS.demoLayoutMobile) SCENARIOS.demoLayoutMobile = SCENARIOS.demoLayout
  if (SCENARIOS.scoreCalc && !SCENARIOS.scoreCalcMobile) SCENARIOS.scoreCalcMobile = SCENARIOS.scoreCalc
  if (SCENARIOS.scoreNewPreset && !SCENARIOS.scoreNewPresetMobile) SCENARIOS.scoreNewPresetMobile = SCENARIOS.scoreNewPreset
  if (SCENARIOS.scoreUi2 && !SCENARIOS.scoreUi2Mobile) { SCENARIOS.scoreUi2Mobile = SCENARIOS.scoreUi2; SCENARIOS.scoreUi2Phone = SCENARIOS.scoreUi2 }
  if (SCENARIOS.scorePickOpen && !SCENARIOS.scorePickOpenMobile) { SCENARIOS.scorePickOpenMobile = SCENARIOS.scorePickOpen; SCENARIOS.scorePickOpenMobilePhone = SCENARIOS.scorePickOpen }
  const want = process.argv.slice(2)
  const list = want.length ? want : Object.keys(SCENARIOS)
  const profile = path.join(__dirname, '..', 'chromeprofile-cdp')
  fs.mkdirSync(profile, { recursive: true })
  freePort(PORT)
  const args = [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-crash-reporter', '--hide-scrollbars',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle',
    '--user-data-dir=' + profile, '--remote-debugging-port=' + PORT,
    '--window-size=1720,1150', 'about:blank',
  ]
  // BALATRO_STRICT_FILE=1 emulates a plain double-click: no file:// cross-access help.
  // The viewer must not depend on it — every texture is inlined, and mod art uses blob: URLs.
  if (process.env.BALATRO_STRICT_FILE !== '1') args.push('--allow-file-access-from-files')
  console.log('file access:', process.env.BALATRO_STRICT_FILE === '1' ? 'strict (no --allow-file-access-from-files)' : 'permissive')
  const chrome = spawn(CHROME, args, { stdio: 'ignore' })

  let version = null
  for (let i = 0; i < 60; i++) {
    try { version = await getJSON(`http://127.0.0.1:${PORT}/json/version`); break } catch { await sleep(400) }
  }
  if (!version) { console.log('❌ chrome did not expose CDP'); chrome.kill(); process.exit(1) }
  console.log('chrome', version.Browser)

  const targets = await getJSON(`http://127.0.0.1:${PORT}/json/list`)
  const page = targets.find((t) => t.type === 'page')
  const c = await CDP.connect(page.webSocketDebuggerUrl)
  // let exports land in a folder we can inspect
  const DL = path.join(__dirname, 'downloads')
  fs.rmSync(DL, { recursive: true, force: true })
  fs.mkdirSync(DL, { recursive: true })
  const browserWs = version.webSocketDebuggerUrl
  if (browserWs) {
    const b = await CDP.connect(browserWs)
    await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true }).catch(() => {})
    b.ws.close()
  }
  await c.send('Runtime.enable')
  await c.send('Page.enable')
  await c.send('Log.enable').catch(() => {})
  await c.send('Page.navigate', { url: PAGE })
  await sleep(2500)
  await c.eval(HELPERS)
  const gpu = await c.eval(`(()=>{const c=document.createElement('canvas');const g=c.getContext('webgl');
     if(!g) return {webgl:false};
     const d=g.getExtension('WEBGL_debug_renderer_info');
     return {webgl:true, vendor:g.getParameter(g.VENDOR), renderer:g.getParameter(g.RENDERER), dbg: d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):null}})()`)
  console.log('webgl:', JSON.stringify(gpu))

  const results = {}
  let MobileMode = false
  let LongMode = false
  for (const name of list) {
    if (!SCENARIOS[name]) continue
    /* Each scenario must start from a *clean* visit. A plain location.reload() is not enough:
       the app mirrors its state into the URL hash (#c=…&t=…&q=…), so a scenario that ends on
       another tab would be restored into that tab after the reload — and the next scenario
       would find no .cell anywhere. Navigate to the hash-less URL instead. */
    const clean = PAGE.replace(/#.*$/, '')
    /* Also wipe this origin's storage: the viewer now remembers the visitor's own parsed
       assets in IndexedDB, so without this a scenario would silently inherit the previous
       one's cache and skip the start screen. `siteRemember` sets up its own cache on purpose. */
    try {
      const origin = (() => { try { const u = new URL(clean); return u.protocol === 'file:' ? 'file://' : u.origin } catch { return null } })()
      if (origin) await c.send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' })
    } catch (e) { /* not every origin supports it */ }
    await c.send('Page.navigate', { url: clean }).catch(() => {})
    await sleep(1200)
    // a 4.2 MB self-contained page is not guaranteed to be parsed in a fixed sleep; wait for the
    // viewer handle (Lite boots from a start screen; the site scenarios have their own waits)
    if (name !== 'liteBoot' && name !== 'siteHome' && name !== 'siteViewer' && name !== 'liveBoot' && name !== 'sitePack' && name !== 'bootPhone' && name !== 'siteRemember' && name !== 'siteFontLive') {
      for (let i = 0; i < 80; i++) {
        await sleep(250)
        try { if (await c.eval('window.__BALATRO_READY__ === true')) break } catch (e) { /* still navigating */ }
      }
    } else {
      await sleep(1000)
    }
    await c.eval(HELPERS)
    await c.eval('window.__V.errors=[]')
    let rep
    const clipShots = []
    if (name === 'bootShort') {
      /* 用户遇到的就是这种窗口：比卡片矮很多（1280×560，非手机） */
      await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 560, deviceScaleFactor: 1, mobile: false })
      LongMode = true
    }
    if (name === 'forgePhone' || name === 'mobile' || name === 'bootPhone' || name === 'demoRectMobile' || name === 'demoLayoutMobile' || name === 'scoreCalcMobile' || name === 'scoreNewPresetMobile' || name === 'scorePickOpenMobilePhone' || name === 'scorePickScrollMobile' || name === 'scoreUi2Phone') {
      // emulate a phone viewport (bootPhone tests the start screen visitors land on)
      await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
      await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {})
      MobileMode = true
    } else if (MobileMode) {
      await c.send('Emulation.clearDeviceMetricsOverride').catch(() => {})
      await c.send('Emulation.setTouchEmulationEnabled', { enabled: false }).catch(() => {})
      MobileMode = false
    } else if (LongMode && name !== 'bootShort') {
      await c.send('Emulation.clearDeviceMetricsOverride').catch(() => {})
      LongMode = false
    }
    try {
    if (name === 'shaderCompile') {
      const payload = fs.readFileSync(path.join(__dirname, 'mod-shaders.json'), 'utf8')
      await c.eval('window.__MODSHADERS__ = ' + payload + ';')
    }
    if (name === 'modPicker') {
      // a real file, delivered the same way the browser delivers a picked one
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")
      await sleep(600)
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const zi = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#modZipInput' })
      await c.send('DOM.setFileInputFiles', { files: [path.join(__dirname, 'testmod.zip')], nodeId: zi.nodeId })
      console.log('             injected testmod.zip into #modZipInput')
      await sleep(2500)
      const di = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#modDirInput' })
      await c.send('DOM.setFileInputFiles', { files: [path.join(__dirname, 'testmod')], nodeId: di.nodeId })
      console.log('             injected the testmod folder into #modDirInput')
    }
    if (name === 'deepLinkOpen') {
      const base = PAGE.replace(/#.*$/, '')
      await c.send('Page.navigate', { url: base + '#c=Joker&i=j_joker&l=en-us' })
      await sleep(1500)
      await c.eval(HELPERS)
    }
    /* Several scenarios live on the viewer page, one level below the site root. */
    const viewerUrl = (u) => (/\/viewer\/?$/.test(u) ? u.replace(/\/?$/, '/') : u.replace(/\/?$/, '/') + 'viewer/')
    if (name === 'siteRemember') {      /* First visit: hand over the game file so the page caches the parsed result.
         Then reload — the second visit must come up without any start screen. */
      const exe = path.join(__dirname, 'fake-balatro.exe')
      const first = await c.send('Page.navigate', { url: clean.replace(/\/?$/, '/') + 'viewer/' }).catch(() => null)
      void first
      await sleep(2500)
      await c.eval(HELPERS)
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const inp = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#boot input[type=file]' })
      if (inp && inp.nodeId) {
        await c.send('DOM.setFileInputFiles', { files: [exe], nodeId: inp.nodeId })
        console.log('             第一次访问：交给它 fake-balatro.exe（应当被记进浏览器缓存）')
      } else console.log('❌ siteRemember: 第一次访问没有文件输入框')
      for (let i = 0; i < 300; i++) {
        await sleep(300)
        try { if (await c.eval('typeof window.__BALATRO__ !== "undefined"')) break } catch (e) { /* ignore */ }
      }
      await sleep(1200)   // let the IndexedDB write finish
      await c.send('Page.navigate', { url: clean.replace(/\/?$/, '/') + 'viewer/' }).catch(() => {})
      await sleep(1500)
      await c.eval(HELPERS)
      console.log('             第二次访问：直接重载，不该再出现选择界面')
    }
    if (name === 'liveBoot' || name === 'siteFontLive') {
      // the viewer lives at /viewer/ and boots only after a file is picked
      await c.send('Page.navigate', { url: clean.replace(/\/?$/, '/') + 'viewer/' }).catch(() => {})
      await sleep(2500)
      await c.eval(HELPERS)
      // a visitor's own game file, delivered the way the browser delivers a picked one
      /* BALATRO_EXE 指到真的 Balatro.exe 时，这条就是端到端真测（真文件 → 真字体）；
         不指就用合成的假 exe（里面没有字体，只能测流程跑得通）。 */
      const exe = process.env.BALATRO_EXE || path.join(__dirname, 'fake-balatro.exe')
      if (!fs.existsSync(exe)) console.log('❌ ' + path.basename(exe) + ' missing — run verify/test-gameparse.js first')
      else if (process.env.BALATRO_EXE) console.log('             using real game file: ' + exe + ' (' + (fs.statSync(exe).size / 1048576).toFixed(1) + ' MB)')
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const inp = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#boot input[type=file]' })
      if (inp && inp.nodeId) {
        await c.send('DOM.setFileInputFiles', { files: [exe], nodeId: inp.nodeId })
        console.log('             handed ' + path.basename(exe) + ' to the live start screen')
      } else console.log('❌ no file input on the live start screen')
    }
    if (name === 'siteViewer' || name === 'bootPhone' || name === 'demoDebug' || name === 'demoRect' || name === 'demoRectMobile' || name === 'demoLayout' || name === 'demoLayoutMobile' || name === 'bootShort') {
      // the viewer lives one level down; navigate from the driver so the eval isn't killed
      await c.send('Page.navigate', { url: viewerUrl(clean) }).catch(() => {})
      await sleep(1800)
      await c.eval(HELPERS)
    }
    if (name === 'localSite' || name === 'localOffline') {
      const port = process.env.SITE_PORT || 8137
      // a preview server must never serve a stale page to the test
      await c.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {})
      // a previous visit may have installed a service worker that would serve the old build
      await c.send('Storage.clearDataForOrigin', { origin: 'http://127.0.0.1:' + port, storageTypes: 'all' }).catch(() => {})
      await c.send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' })
      await sleep(1800)
      try { await c.eval('location.reload()') } catch { /* ignore */ }
      await sleep(1200)
      // the site boots the viewer itself (pack mode), so wait for it before running the scenario
      for (let i = 0; i < 80; i++) {
        await sleep(250)
        try { if (await c.eval('window.__BALATRO_READY__ === true')) break } catch (e) { /* navigating */ }
      }
      await c.eval(HELPERS)
    }
    if (name === 'liteBoot') {
      const liteDir = path.join(ROOT, 'dist', 'lite')
      const exe = path.join(__dirname, 'fake-balatro.exe')
      if (!fs.existsSync(exe)) { console.log('❌ fake-balatro.exe missing — run verify/test-gameparse.js first') }
      await c.send('Page.navigate', { url: 'file:///' + path.join(liteDir, 'index.html').replace(/\\/g, '/') })
      await sleep(1500)
      await c.eval(HELPERS)
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const inp = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#boot input[type=file]' })
      if (inp && inp.nodeId) {
        await c.send('DOM.setFileInputFiles', { files: [exe], nodeId: inp.nodeId })
        console.log('             handed fake-balatro.exe to the Lite start screen')
      } else console.log('❌ no file input on the start screen')
    }
    if (name === 'modCryptid' || name === 'cryptidEditions' || name === 'astralProbe' || name === 'astralForge' || name === 'astralRows' || name === 'astralSweep' || name === 'astralShots') {
      const localZip = path.join(__dirname, 'cryptid-test.zip')
      const srcZip = fs.existsSync(localZip) ? localZip : path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
      if (!fs.existsSync(srcZip)) {
        results[name] = { rep: { skipped: 'Cryptid.zip 不在（' + srcZip + '）——把 mod 的 zip 放到桌面或 verify/cryptid-test.zip 就能跑这一项' }, errors: [] }
        console.log(name.padEnd(12), '⚠️  skipped — Cryptid.zip not found')
        c.events.length = 0
        continue
      }
      // drive the real <input type=file>, the same way picking the zip in the browser does
      await c.eval("window.__BALATRO__.state.tab='mods'; window.__BALATRO__.render();")
      await sleep(600)
      const doc = await c.send('DOM.getDocument', { depth: -1 })
      const found = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#modZipInput' })
      if (!found || !found.nodeId) { console.log('❌ #modZipInput not found'); results[name] = { rep: { fatal: 'no input' }, errors: [] }; continue }
      await c.send('DOM.setFileInputFiles', { files: [srcZip], nodeId: found.nodeId })
      console.log('             injected Cryptid.zip into #modZipInput')
    }
    if (name === 'modForge' || name === 'srcBack') {
      const payload = fs.readFileSync(path.join(__dirname, 'testmod.json'), 'utf8')
      await c.eval('window.__TESTMOD__ = ' + payload + ';')
    }
    if (name === 'modShader' || name.indexOf('mod') === 0 || name === 'modImport') {
      const payload = fs.readFileSync(path.join(__dirname, 'testmod.json'), 'utf8')
      await c.eval('window.__TESTMOD__ = ' + payload + ';')
    }
    } catch (e) {
      console.log('             driver hook failed:', String(e.message).slice(0, 200))
    }
    if (name === 'editions') {
      // step through each edition chip one at a time so the capture cannot race the UI
      rep = await c.eval(SCENARIOS[name], true).catch((e) => ({ fatal: String(e.message).slice(0, 400) }))
      const labels = (rep && rep.labels) || []
      for (let i = 0; i < labels.length; i++) {
        await c.eval(`window.__EDBTNS__[${i}].click()`)
        await sleep(900)
        const info = await c.eval(`(()=>{const cv=document.querySelector('.preview canvas');if(!cv)return null;const r=cv.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`)
        if (!info) continue
        const pad = 20
        const shot = await c.send('Page.captureScreenshot', {
          format: 'png',
          clip: { x: Math.max(0, Math.round(info.x - pad)), y: Math.max(0, Math.round(info.y - pad)), width: Math.round(info.w + pad * 2), height: Math.round(info.h + pad * 2), scale: 2 },
        }).catch(() => null)
        if (shot) {
          const f = `edition-${i}-${safeLabel(labels[i])}.png`
          fs.writeFileSync(path.join(SHOTS, f), Buffer.from(shot.data, 'base64'))
          clipShots.push(f)
        }
      }
      const blank = await c.eval('__V.blank()')
      rep = Object.assign({}, rep, { blank })
    } else {
      try {
        rep = await c.eval(SCENARIOS[name], true)
      } catch (e) {
        rep = { fatal: String(e.message).slice(0, 600) }
      }
    }
    let errs = []
    try { errs = await c.eval('window.__V.errors') } catch { /* ignore */ }
    /* 页面自己抛的异常走 Runtime.exceptionThrown，不是 console —— 漏掉它就会「静默白屏」 */
    const thrown = c.events.filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => { const d = e.params.exceptionDetails || {}; return 'UNCAUGHT ' + (d.text || '') + ' ' + ((d.exception && (d.exception.description || d.exception.value)) || '') + ' @' + ((d.url || '') + ':' + (d.lineNumber != null ? d.lineNumber + 1 : '?')) })
    const consoleMsgs = c.events.filter((e) => e.method === 'Runtime.consoleAPICalled' || e.method === 'Log.entryAdded').slice(-8)
      .map((e) => e.method === 'Log.entryAdded' ? e.params.entry.text : (e.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' '))
      .filter(Boolean)
    if (thrown.length) console.log('             ❗页面异常:\n' + thrown.map((m) => '               · ' + String(m).slice(0, 300)).join('\n'))
    c.events.length = 0
    results[name] = { rep, errors: errs, consoleMsgs, clipShots }
    if (['codex', 'jokers', 'forge', 'atlas', 'hands', 'tarot', 'shaders', 'blind', 'cards', 'data', 'showcase', 'mobile', 'soulCompare', 'boxCompare', 'modImport', 'modView', 'modCryptid', 'forgeUx', 'modForge', 'srcBack', 'forgePhone', 'siteHome', 'siteViewer', 'bootPhone', 'scoreCalc', 'siteFontLive', 'scorePickOpen', 'scorePickNew', 'scoreState'].includes(name)) {
      try { await c.shot(name) } catch (e) { /* ignore */ }
    }
    /* 计分板：裁一张整块的图，用来肉眼看配色和排版（桌面/手机各一张；站点版再放大 2×） */
    if ((name === 'scoreCalc' || name === 'scoreCalcMobile' || name === 'siteFontLive' || name === 'scorePickNew' || name === 'scoreNewPreset' || name === 'scoreNewPresetMobile') && rep && rep.board) {
      try {
        const big = (name === 'siteFontLive' || name === 'scoreNewPreset')
        const clip = big
          ? { x: Math.max(0, (rep.board.x || 0) - 6), y: Math.max(0, rep.board.t - 8), width: Math.max(320, rep.board.w + 12), height: Math.min(rep.board.h + 16, 900), scale: 2 }
          : { x: Math.max(0, (rep.board.x || 0) - 6), y: Math.max(0, rep.board.t - 8), width: Math.max(320, rep.board.w + 12), height: rep.board.h + 16, scale: 1 }
        const shot = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })
        const f = (name === 'siteFontLive' ? 'score-fonts-site.png' : ((name === 'scorePickNew' || name === 'scoreNewPreset' || name === 'scoreNewPresetMobile') ? 'score-new-' + (MobileMode ? 'mobile' : 'desktop') + '.png' : 'score-board-' + (MobileMode ? 'mobile' : 'desktop') + '.png'))
        fs.writeFileSync(path.join(SHOTS, f), Buffer.from(shot.data, 'base64'))
        console.log('             clip:', f, Math.round(clip.width) + 'x' + Math.round(clip.height) + ' @' + clip.scale + 'x')
      } catch (e) { console.log('             clip 失败:', String(e.message).slice(0, 120)) }
    }
    /* demoRect：把预览区整块裁下来存成图片，用来肉眼看排版（数值看不出丑不丑） */
    if ((name === 'demoRect' || name === 'demoRectMobile') && rep && rep.demo) {
      const mobile = MobileMode ? 'mobile' : 'desktop'
      const scale = MobileMode ? 2 : 1
      const pad = 6
      try {
        const shot = await c.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
          clip: { x: 0, y: Math.max(0, rep.demo.t - pad), width: Math.max(320, Math.min(rep.vw, rep.demo.w + 40)), height: rep.demo.h + pad * 2, scale },
        })
        const f = 'demo-' + mobile + '.png'
        fs.writeFileSync(path.join(SHOTS, f), Buffer.from(shot.data, 'base64'))
        console.log('             clip:', f, rep.demo.w + 'x' + rep.demo.h)
        /* 再单独裁一张画布，方便看清示意图本身是否清晰 */
        const cr = await c.eval('(()=>{const cv=document.getElementById("dCanvas");if(!cv)return null;const b=cv.getBoundingClientRect();return {t:Math.round(b.top),l:Math.round(b.left),w:Math.round(b.width),h:Math.round(b.height)}})()')
        if (cr) {
          const s2 = await c.send('Page.captureScreenshot', {
            format: 'png', captureBeyondViewport: true,
            clip: { x: cr.l - 4, y: cr.t - 4, width: cr.w + 8, height: cr.h + 8, scale },
          })
          fs.writeFileSync(path.join(SHOTS, 'demo-canvas-' + mobile + '.png'), Buffer.from(s2.data, 'base64'))
          console.log('             clip: demo-canvas-' + mobile + '.png', cr.w + 'x' + cr.h)
        }
      } catch (e) { console.log('             clip 失败:', String(e.message).slice(0, 120)) }
    }
    console.log(name.padEnd(12), errs.length ? '❌ errors ' + JSON.stringify(errs) : '✅', JSON.stringify(rep).slice(0, 380))
    if (consoleMsgs.length) console.log('             console:\n' + consoleMsgs.map((m) => '               · ' + m.replace(/\n/g, ' | ')).join('\n'))
    if (clipShots.length) console.log('             clips:', clipShots.join(', '))
  }
  fs.writeFileSync(path.join(__dirname, 'cdp-report.json'), JSON.stringify(results, null, 1))
  try { c.ws.close() } catch { /* ignore */ }
  try { chrome.kill() } catch { /* ignore */ }
  await sleep(400)
  console.log('\nshots ->', SHOTS)
}

main().catch((e) => {
  console.error('FATAL', e)
  // never leave a headless Chrome holding the debug port
  try { freePort(PORT) } catch { /* ignore */ }
  process.exit(1)
})
