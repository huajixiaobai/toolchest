// Append a scenario that measures the four specially-sized jokers and the boosters.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')
const anchor = '  export: `(async()=>{'
if (!s.includes(anchor)) { console.log('anchor missing'); process.exit(1) }

const block = [
  '  cardBox: `(async()=>{',
  '     await __V.wait(1800);',
  '     const A=window.__BALATRO__;',
  '     if(!A) return {fatal:"no handle"};',
  '     const r={view:"cardBox"};',
  '     const bbox=(cv)=>{const d=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data;',
  '       let x0=1e9,y0=1e9,x1=-1,y1=-1;',
  '       for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){ if(d[(y*cv.width+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y } }',
  '       return x1<0?null:{w:x1-x0+1,h:y1-y0+1};};',
  '     r.items={};',
  '     const ids=["j_joker","j_wee","j_half","j_photograph","j_square","j_caino","p_buffoon_normal_1","p_arcana_mega_1","c_fool"];',
  '     for(const id of ids){',
  '       const it=A.byId[id]; if(!it) continue;',
  '       const sp=A.specForItem(it);',
  '       const on=A.compose(sp,2,0);',
  '       const off=A.compose(Object.assign({},sp,{box:null}),2,0);',
  '       r.items[id]={box:it.box||null, boxed:bbox(on), raw:bbox(off), diff:__V.diff(on,off)};',
  '     }',
  '     // expected fractions',
  '     r.expected={ "j_wee":"0.700 x 0.700", "j_half":"1.000 x 0.588", "j_photograph":"1.000 x 0.833",',
  '                  "j_square":"1.000 x 0.745", "p_buffoon_normal_1":"1.270 x 1.270", "j_joker":"1.000 x 1.000" };',
  '     // the raw-size toggle must restore the full box',
  '     A.state.rawSize=true;',
  '     const wee=A.byId["j_wee"];',
  '     r.rawToggle={ boxedWithToggle: bbox(A.compose(A.specForItem(wee),2,0)) };',
  '     A.state.rawSize=false;',
  '     r.rawToggle.boxedWithoutToggle=bbox(A.compose(A.specForItem(wee),2,0));',
  '     // animation settings are exposed',
  '     r.anim={fps:A.state.anim.fps, speed:A.state.anim.speed, seconds:A.state.anim.seconds, pingpong:A.state.anim.pingpong};',
  '     const fr=A.buildAnimFrames(A.specForItem(A.byId["j_joker"]),1,{fps:20,speed:4,seconds:2.5,pingpong:true});',
  '     r.framesAt20={n:fr.frames.length, delay:fr.delay};',
  '     const fr30=A.buildAnimFrames(A.specForItem(A.byId["j_joker"]),1,{fps:30,speed:4,seconds:2.5,pingpong:true});',
  '     r.framesAt30={n:fr30.frames.length, delay:fr30.delay};',
  '     const frSlow=A.buildAnimFrames(A.specForItem(A.byId["j_joker"]),1,{fps:20,speed:0.5,seconds:2.5,pingpong:true});',
  '     r.framesAtHalfSpeed={n:frSlow.frames.length, delay:frSlow.delay};',
  '     return r })()`,',
].join('\n') + '\n'

s = s.replace(anchor, block + anchor)
fs.writeFileSync(f, s)
try { new Function(s); console.log('✅ cardBox scenario added, syntax OK') } catch (e) { console.log('❌ syntax:', e.message) }
