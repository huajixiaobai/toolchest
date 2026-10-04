/* 第五十轮（D）：工程界面的样式 + 测试脚本跟上「一个工程一个 mod」的新文件名 + 新增 mkProject 场景 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');

/* ---------- ① app.css：条目列表样式 ---------- */
{
  const F = path.join(__dirname, 'app.css');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const anchor = '.mkweights .hint{flex-basis:100%;margin:0}';
  if (s.split(anchor).length - 1 !== 1) { console.error('❌ CSS 锚点不唯一'); process.exit(1) }
  s = s.replace(anchor, () => [
    anchor,
    '/* 工程：条目列表（按类型分组） */',
    '.mkitems{display:flex;flex-direction:column;gap:2px;margin:8px 0;max-height:280px;overflow:auto;border:1px solid var(--line2);border-radius:8px;background:#141d26;padding:6px}',
    '.mkigrp{font-size:11px;letter-spacing:.04em;opacity:.72;padding:6px 6px 2px;position:sticky;top:0;background:#141d26}',
    '.mki{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:6px;cursor:pointer;font-size:13px;min-height:38px}',
    '.mki:hover{background:#1c2833}',
    '.mki.on{background:#123123;box-shadow:inset 0 0 0 1px #4bc29266}',
    '.mki .mkin{min-width:18px;text-align:right;opacity:.55;font-size:11px}',
    '.mki .mkiname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mki code{font-size:11px;opacity:.6}',
    '@media (max-width:720px){.mkitems{max-height:220px}.mki{min-height:42px}}',
  ].join('\n'));
  fs.writeFileSync(F, s);
  const b = fs.readFileSync(F, 'utf8');
  console.log(b.indexOf('.mkitems{') >= 0 && b.indexOf('.mki.on{') >= 0 ? '  ✓ 工程列表样式' : '  ❌ 样式没写进去');
  n++;
}

/* ---------- ② cdp.js：文件名的断言跟上新命名（sheet.png → sheet_<slug>.png） ---------- */
{
  const F = path.join(__dirname, 'verify', 'cdp.js');
  let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
  const pairs = [
    ["f.name===\"assets/2x/sheet.png\"", "f.name.indexOf(\"assets/2x/sheet\")===0"],
    ["f.name==='assets/2x/sheet.png'", "f.name.indexOf('assets/2x/sheet')===0"],
    ["f.name==='assets/1x/sheet.png'", "f.name.indexOf('assets/1x/sheet')===0"],
    ["x.name==='assets/1x/sheet.png'", "x.name.indexOf('assets/1x/sheet')===0"],
    ["f.name==='assets/1x/soul.png'", "f.name.indexOf('assets/1x/soul')===0"],
  ];
  for (const [from, to] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits) { s = s.split(from).join(to); console.log('  ✓ 断言改名 ' + from + '（' + hits + ' 处）'); n += hits }
  }
  /* 新增 mkProject 场景 */
  const SC = [
    '  /* 一个工程多个条目：真的点按钮加条目、分组列表、逐条目打包、JSON 往返 */',
    '  mkProject: `(async()=>{',
    '    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1400);',
    '    const q=(s)=>document.querySelector(s); const qa=(s)=>[].slice.call(document.querySelectorAll(s));',
    "    S.tab='maker'; B.render(); await __V.wait(900);",
    "    r.ui={ list:!!q('#mkItems'), add:!!q('#mkAddItem'), dup:!!q('#mkDupItem'), del:!!q('#mkDelItem'), up:!!q('#mkUp'), down:!!q('#mkDown'), exp:!!q('#mkExpJson'), imp:!!q('#mkImpJson'), fields:qa('[data-mkp]').length };",
    '    r.rowsStart=qa(".mki").length;',
    '    /* 点「＋ 再加一个条目」三次 → 共 4 条 */',
    "    for(let i=0;i<3;i++){ q('#mkAddItem').click(); await __V.wait(350) }",
    '    r.rowsAfterAdd=qa(".mki").length;',
    '    r.groupHeads=qa(".mkigrp").map(function(x){return x.textContent});',
    '    /* 四条分别设成 小丑(带立绘+动效) / 消耗品(动图) / 优惠券(逐帧时长) / 盲注 */',
    "    const setItem=async(i,ty,fn)=>{ B.maker.select(i); B.maker.typeChip(ty); await __V.wait(200); if(fn) fn(); B.render(); await __V.wait(250) };",
    "    await setItem(0,'Joker',()=>{ B.maker.state.soul.on=true; B.maker.state.soul.gen={kind:'float',n:6,fps:12,amp:3}; B.maker.state.art.gen={kind:'breathe',n:6,fps:12,amp:4} });",
    "    await setItem(1,'Consumable',()=>{ B.maker.state.art.gen={kind:'float',n:8,fps:10,amp:3} });",
    "    await setItem(2,'Voucher',()=>{ B.maker.state.art.gen={kind:'blink',n:4,fps:8,amp:4}; B.maker.state.art.weights=[1,1,3,1] });",
    "    await setItem(3,'Blind',()=>{ B.maker.state.art.gen=null });",
    '    r.keys=B.maker.project.items.map(function(it){return it.key});',
    '    r.types=B.maker.project.items.map(function(it){return it.type});',
    '    /* 打包：每个条目自己的图集，名字唯一 */',
    '    const files=await B.maker.files();',
    '    r.fileNames=files.map(function(f){return f.name});',
    '    r.sheets=files.filter(function(f){return f.name.indexOf("assets/1x/sheet")===0}).map(function(f){return f.name});',
    '    r.uniqueSheets=new Set(r.sheets).size===r.sheets.length && r.sheets.length===4;',
    '    const lua=B.maker.lua();',
    '    r.luaBlocks=(lua.match(/SMODS\\./g)||[]).length;',
    '    r.atlasKeys=B.maker.project.items.map(function(it){return "sheet_"+it.key});',
    '    r.allAtlasDeclared=r.atlasKeys.every(function(k){ return lua.indexOf("key = \\u0027"+k+"\\u0027")>=0 });',
    '    r.atlasUnique=new Set(r.atlasKeys).size===4;',
    '    r.uniqueRefs=r.atlasKeys.every(function(k){ return lua.split("atlas = \\u0027"+k+"\\u0027").length-1===1 });',
    '    r.soulAtlas=lua.indexOf("soul_atlas = \\u0027soul_")>=0;',
    '    /* JSON 往返（含图片）+ 存/读 */',
    '    B.maker.saveProject();',
    '    const json=B.maker.projectJSON(true);',
    '    r.jsonItems=json.items.length;',
    '    r.jsonBytes=JSON.stringify(json).length;',
    '    const keepKeys=JSON.stringify(B.maker.project.items.map(function(it){return it.key}));',
    '    const ok=B.maker.applyProject(JSON.parse(JSON.stringify(json)));',
    '    r.applyOk=ok; r.keysAfter=JSON.stringify(B.maker.project.items.map(function(it){return it.key}));',
    '    r.roundTripKeys=keepKeys===r.keysAfter;',
    '    r.loaded=B.maker.loadProject();',
    '    B.render(); await __V.wait(400);',
    '    r.rowsAfterReload=qa(".mki").length;',
    '    r.overview=(q("#mkProjOverview")||{}).textContent||"";',
    '    r.errText=document.body.innerText.indexOf("出错")>=0;',
    '    r.errors=window.__V.errors.length;',
    '    return r })()`,',
    '',
  ].join('\n');
  const anchor = '  modMaker: `(async()=>{';
  if (s.split(anchor).length - 1 !== 1) { console.error('❌ 插入点不唯一'); process.exit(1) }
  s = s.replace(anchor, () => SC + anchor);
  console.log('  ✓ 新增 mkProject 场景'); n++;
  fs.writeFileSync(F, s);
}

console.log('共 ' + n + ' 处');
