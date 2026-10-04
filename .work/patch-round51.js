/* 第五十一轮：把工程场景补全 —— 重导入条目数、窄屏不溢出、切换条目立刻生效，并给 uniqueRefs 加诊断
   + 注册 mkProjectMobile / mkProjectTablet 两个视口变体 */
const fs = require('fs');
const path = require('path');
let n = 0;
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

rep(
  '    r.overview=(q("#mkProjOverview")||{}).textContent||"";',
  [
    '    r.overview=(q("#mkProjOverview")||{}).textContent||"";',
    '    /* 每个图集 key 被引用了几次（诊断用：应当都是 1） */',
    '    r.refCounts=r.atlasKeys.map(function(k){ return k+":"+(lua.split("atlas = \'"+k+"\'").length-1) });',
    '    /* 把导出的 zip 直接喂回图鉴的导入器：识别出来的条目数应当等于工程条目数 */',
    '    let reimp=null;',
    '    try { reimp=await B.importZipBuffer(B.zipStore(files), B.maker.project.modId) } catch(e) { r.reimportErr=String(e&&e.message||e) }',
    '    r.reimportItems=reimp&&reimp.mod&&reimp.mod.items!=null?reimp.mod.items:null;',
    '    r.reimportOk=reimp&&reimp.ok!==false;',
    '    r.reimportWarn=reimp&&reimp.mod&&reimp.mod.warnings?reimp.mod.warnings.length:0;',
    '    /* 窄屏安全：这两块都不能横向溢出 */',
    '    const wrap=q(".maker")||q("#content")||document.body;',
    '    const itm=q("#mkItems");',
    '    r.wrapOverflow={ scroll:wrap.scrollWidth, client:wrap.clientWidth, ok:wrap.scrollWidth<=wrap.clientWidth+2 };',
    '    r.itemsOverflow=itm?{ scroll:itm.scrollWidth, client:itm.clientWidth, ok:itm.scrollWidth<=itm.clientWidth+2 }:null;',
    '    /* 切换条目：预览与 Lua 必须立刻跟着换 */',
    '    const luaBefore=B.maker.lua();',
    '    const nameBefore=(q(\'[data-mk="nameZh"]\')||{}).value;',
    '    const rows=qa(".mki");',
    '    if(rows.length>1){ rows[1].click(); await __V.wait(500) }',
    '    r.switch={ cur:B.maker.project.cur, luaChanged:B.maker.lua()!==luaBefore, nameChanged:(q(\'[data-mk="nameZh"]\')||{}).value!==nameBefore,',
    '      nameNow:(q(\'[data-mk="nameZh"]\')||{}).value, pvLine:(q(".mkpvline")||{}).innerText||"" };',
  ].join('\n'),
  '工程场景补充断言'
);
rep(
  '  if (SCENARIOS.modMaker && !SCENARIOS.modMakerMobile) { SCENARIOS.modMakerMobile = SCENARIOS.modMaker; SCENARIOS.modMakerTablet = SCENARIOS.modMaker }',
  '  if (SCENARIOS.modMaker && !SCENARIOS.modMakerMobile) { SCENARIOS.modMakerMobile = SCENARIOS.modMaker; SCENARIOS.modMakerTablet = SCENARIOS.modMaker }\n  if (SCENARIOS.mkProject && !SCENARIOS.mkProjectMobile) { SCENARIOS.mkProjectMobile = SCENARIOS.mkProject; SCENARIOS.mkProjectTablet = SCENARIOS.mkProject }',
  '注册 mkProject 视口变体'
);
fs.writeFileSync(F, s);
console.log('  ✓ cdp.js 已更新（' + n + ' 处）');
