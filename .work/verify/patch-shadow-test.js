// Improve the soulArt scenario: prove the drop shadow exists by diffing against a
// soulNoShadow render, and check it sits below the artwork.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(f, 'utf8')

const from = `     let dark=0, minY=1e9, maxY=-1;
     for(let y=0;y<H;y++)for(let x=0;x<W;x++){
       const i=(y*W+x)*4;
       const isDark = dw[i]<24 && dw[i+1]<24 && dw[i+2]<24 && dw[i+3]>120;
       const wasDark = db[i]<24 && db[i+1]<24 && db[i+2]<24;
       if(isDark && !wasDark){ dark++; if(y<minY)minY=y; if(y>maxY)maxY=y }
     }
     r.shadow={darkPixels:dark, yRange:[minY,maxY]};`

const to = `     // render the same card without the shadow pass and diff, so the shadow is isolated
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
     r.diffWithShadow=__V.diff(withSoul,noShadow);`

if (!s.includes(from)) { console.log('shadow block not found'); process.exit(1) }
s = s.replace(from, to)
fs.writeFileSync(f, s)
try { new Function(s); console.log('✅ patched, syntax OK') } catch (e) { console.log('❌ syntax:', e.message) }
