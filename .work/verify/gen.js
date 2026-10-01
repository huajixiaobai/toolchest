// Generates instrumented copies of the built viewer that drive the UI head-lessly,
// capture runtime errors and report whether any canvas came out blank.
'use strict'
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', '..', 'Balatro素材图鉴.html')
const OUT = __dirname
let html = fs.readFileSync(SRC, 'utf8')

const CATCH = `<script>
window.__ERRORS__=[];
window.addEventListener('error',function(e){window.__ERRORS__.push(String(e.message)+' @'+(e.filename||'')+':'+(e.lineno||0));});
window.addEventListener('unhandledrejection',function(e){window.__ERRORS__.push('promise: '+String(e.reason&&e.reason.message||e.reason));});
(function(){var w=console.warn,c=console.error;console.warn=function(){window.__ERRORS__.push('warn: '+[].join.call(arguments,' '));w.apply(console,arguments)};console.error=function(){window.__ERRORS__.push('error: '+[].join.call(arguments,' '));c.apply(console,arguments)}})();
</script>
`;

const DRIVER = (state) => `<script>
(function(){
function byText(sel,txt){return [].slice.call(document.querySelectorAll(sel)).filter(function(e){return e.textContent.indexOf(txt)>=0})[0]}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
function blankCanvases(){
  var out=[],n=0,total=0;
  [].slice.call(document.querySelectorAll('canvas')).forEach(function(cv){
    total++;
    if(!cv.width||!cv.height){out.push('zero-size');return}
    try{
      var d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
      var nz=0; for(var i=3;i<d.length;i+=4){ if(d[i]>8){nz++; if(nz>40)break} }
      if(nz<=40){ out.push(cv.className+'|'+cv.width+'x'+cv.height) } else n++;
    }catch(e){ out.push('tainted:'+e.message) }
  });
  return {painted:n, blank:out.slice(0,8), blankCount:out.length, total:total};
}
async function run(){
  await wait(1500);
  var state=${JSON.stringify(state)};
  var rep={state:state, steps:[]};
  var S={
    codex:function(){ var c=byText('.cat','小丑牌'); c&&c.click(); },
    detail:function(){ var c=byText('.cat','小丑牌'); c&&c.click(); },
    tarot:function(){ var c=byText('.cat','塔罗牌'); c&&c.click(); },
    cards:function(){ var c=byText('.cat','扑克牌'); c&&c.click(); },
    forge:function(){ var c=byText('.cat','卡牌合成台'); c&&c.click(); },
    forgeEdition:function(){ var c=byText('.cat','卡牌合成台'); c&&c.click(); },
    atlas:function(){ var c=byText('.cat','图集浏览'); c&&c.click(); },
    hands:function(){ var c=byText('.cat','牌型数据'); c&&c.click(); },
    data:function(){ var c=byText('.cat','数据总表'); c&&c.click(); },
    search:function(){ var s=document.getElementById('search'); s.value='cat:Joker rarity:1 cost>=4'; s.dispatchEvent(new Event('input')); }
  };
  try{ S[state]&&S[state](); }catch(e){ rep.stepError=String(e) }
  await wait(state==='atlas'?1200:2200);
  if(state==='detail'||state==='cards'||state==='tarot'){
    var cell=document.querySelector('.cell');
    if(cell){ cell.click(); await wait(2200); }
    rep.detailText=(document.getElementById('detail').textContent||'').replace(/\\s+/g,' ').slice(0,420);
    rep.detailButtons=[].slice.call(document.querySelectorAll('#detail .btn')).map(function(b){return b.textContent});
    rep.detailCanvases=document.querySelectorAll('#detail canvas').length;
  }
  if(state==='forge'){
    // cycle the edition options to force every shader through the WebGL path
    var picks=[].slice.call(document.querySelectorAll('.opt'))[2];
    rep.editionChips=picks?picks.querySelectorAll('.pick').length:0;
    var btns=picks?[].slice.call(picks.querySelectorAll('.pick')):[];
    for(var i=0;i<btns.length;i++){ btns[i].click(); await wait(320); }
    rep.forgeChips=document.querySelectorAll('.pick').length;
    rep.forgePreview=document.querySelectorAll('.preview canvas').length;
  }
  if(state==='forgeEdition'){
    var opts=[].slice.call(document.querySelectorAll('.opt'));
    var btns=opts[2]?[].slice.call(opts[2].querySelectorAll('.pick')):[];
    for(var i=0;i<btns.length;i++){ btns[i].click(); await wait(400); }
    await wait(600);
  }
  if(state==='atlas'){
    var h=document.querySelectorAll('.atahead')[4]||document.querySelectorAll('.atahead')[0];
    if(h){ h.click(); await wait(2000) }
  }
  if(state==='search'){ await wait(2000); rep.cells=document.querySelectorAll('.cell').length }
  if(state==='hands'){ rep.rows=document.querySelectorAll('table.data tbody tr').length; rep.handCanvas=document.querySelectorAll('table.data canvas').length }
  if(state==='data'){ rep.rows=document.querySelectorAll('table.data tbody tr').length }
  if(state==='codex'||state==='detail'||state==='tarot'||state==='cards'){ rep.cells=document.querySelectorAll('.cell').length }
  rep.canvas=blankCanvases();
  rep.errors=window.__ERRORS__;
  var pre=document.createElement('pre'); pre.id='__report'; pre.textContent=JSON.stringify(rep,null,1);
  document.body.appendChild(pre);
  document.title='REPORT_READY';
}
run();
})();
</script>
`;

const states = process.argv.slice(2)
for (const st of states) {
  // error capture must be installed before the app script (the last <script> in the file)
  const idx = html.lastIndexOf('<script>')
  let out = html.slice(0, idx) + CATCH + html.slice(idx)
  out = out.replace(/<\/body>/, DRIVER(st) + '</body>')
  const f = path.join(OUT, `v-${st}.html`)
  fs.writeFileSync(f, out)
}
console.log('generated', states.map((s) => 'v-' + s + '.html').join(', '))
