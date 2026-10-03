/* 第三十六轮 B：把读图/帧序列暴露给脚本，并给场景加断言
   （贴图网格真的画了图、上传的图生效、动图拆帧后导出的是横向帧序列） */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const rep = (text, from, to, label) => {
  const hits = text.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  console.log('  ✓ ' + label); n++;
  return text.replace(from, () => to);
};

/* ① 暴露 reader / sheet / presets */
const F = path.join(__dirname, 'app.js');
let app = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
app = rep(app,
  '    maker: { state: MK, lua: () => mkLua(), manifest: () => mkManifest(), files: () => mkBuildFiles(), types: MK_TYPES, when: MK_WHEN, eff: MK_EFF },',
  L('    maker: { state: MK, lua: () => mkLua(), manifest: () => mkManifest(), files: () => mkBuildFiles(), types: MK_TYPES, when: MK_WHEN, eff: MK_EFF,',
    '      presets: MK_PRESETS, cond: MK_COND, readImage: mkReadImage, sheet: (scale, which) => mkSheetCanvas(scale, which || "art"),',
    '      atlasLabel: mkAtlasLabel },   /* 脚本/控制台都能用：读图（含动图拆帧）、取帧序列画布 */'),
  '暴露 reader/sheet');
fs.writeFileSync(F, app);

/* ② 场景补断言 */
const CDP = path.join(__dirname, 'verify', 'cdp.js');
let cdp = fs.readFileSync(CDP, 'utf8').replace(/\r\n/g, '\n');
cdp = rep(cdp,
  "    r.view={ hasView:!!q('.maker'), sections:qa('.mkright .opt').length, cells:qa('#mkArtGrid .mkcell').length, hasLua:!!q('#mkLua'), buttons:qa('.mkbtnrow .btn').map(function(b){return b.textContent.trim()}) };",
  L("    r.view={ hasView:!!q('.maker'), sections:qa('.mkright .opt').length, cells:qa('#mkArtGrid .mkcell').length, hasLua:!!q('#mkLua'), buttons:qa('.mkbtnrow .btn').map(function(b){return b.textContent.trim()}) };",
    "    /* 贴图网格必须真的画出图（以前全是黑格子） */",
    "    r.thumbs={ cells:qa('#mkArtGrid .mkcell').length, painted:qa('#mkArtGrid .mkcell canvas').length,",
    "      presets:qa('.mkpreset').length, typeChips:qa('.mkhchip').length, header:!!q('.mkhead'), summary:(q('#mkSum')||{}).textContent ? true : false };",
    "    /* 预设库点一下要能填好效果行 */",
    "    { const p=qa('.mkpreset')[0]; if(p){ p.click(); await __V.wait(600) } }",
    "    r.afterPreset={ effects:B.maker.state.effects.length, first:B.maker.state.effects[0] };",
    "    /* 动图：页面内自己编一个 3 帧 GIF，再走上传那条路读它 */",
    "    try {",
    "      const frames=[];",
    "      for (let i=0;i<3;i++){ const cv=document.createElement('canvas'); cv.width=32; cv.height=32; const c2=cv.getContext('2d');",
    "        c2.fillStyle=['#ff0000','#00ff00','#0000ff'][i]; c2.fillRect(0,0,32,32); frames.push(cv) }",
    "      const gif=B.encodeGIF(frames, 20);",
    "      const file=new File([gif], 'anim.gif', { type:'image/gif' });",
    "      const info=await B.maker.readImage(file);",
    "      r.gif={ frames:info?info.frames.length:0, firstW:info&&info.frames[0]?info.frames[0].width:null };",
    "      B.maker.state.art={ atlas:B.maker.state.art.atlas, pos:B.maker.state.art.pos, upload:info.frames[0], frames:info.frames, animated:true, uploadName:'anim.gif' };",
    "      const sheet=B.maker.sheet(2,'art');",
    "      r.sheet={ w:sheet.width, h:sheet.height, expect:71*2*3 };",
    "      const files2=await B.maker.files();",
    "      const png=files2.filter(function(f){return f.name==='assets/2x/sheet.png'})[0];",
    "      r.sheetPng={ bytes:png?png.data.length:0, width:png?(png.data[16]*16777216+png.data[17]*65536+png.data[18]*256+png.data[19]):0 };",
    "      const lua2=B.maker.lua();",
    "      r.framesDeclared=lua2.indexOf('frames = 3')>=0;",
    "    } catch(e){ r.gifErr=String(e.message).slice(0,120) }",
    "    B.maker.state.art={ atlas:'Joker', pos:{x:0,y:0}, upload:null, frames:null, animated:false, uploadName:'' };"),
  '场景补贴图/动图断言');
fs.writeFileSync(CDP, cdp);
console.log('共 ' + n + ' 处改动');
