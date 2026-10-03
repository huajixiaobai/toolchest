/* 第三十四轮 B2：只补 cdp.js 的 modMaker 场景（CSS 上一轮已写入） */
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

const SCEN = L(
  '  /* Mod 制作器：做一张小丑牌 → 打包 → 用图鉴自己的解析器再导入一遍（端到端） */',
  '  modMaker: `(async()=>{',
  '    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1400);',
  '    const q=(s)=>document.querySelector(s); const qa=(s)=>[].slice.call(document.querySelectorAll(s));',
  "    S.tab='maker'; B.render(); await __V.wait(900);",
  "    r.view={ hasView:!!q('.maker'), sections:qa('.mkright .opt').length, cells:qa('#mkArtGrid .mkcell').length, hasLua:!!q('#mkLua'), buttons:qa('.mkbtnrow .btn').map(function(b){return b.textContent.trim()}) };",
  "    B.maker.state.effects=[{when:'card',cond:'suit',condVal:'Hearts',eff:'chips',val:50}];",
  "    B.maker.state.nameZh='阿尔法'; B.maker.state.nameEn='Alpha'; B.maker.state.key='alpha';",
  "    B.maker.state.textZh=''; B.maker.state.textEn='';",
  '    const lua=B.maker.lua();',
  "    r.lua={ isJoker:lua.indexOf('SMODS.Joker')>=0, hasCalc:lua.indexOf('calculate_joker')>=0,",
  "      hasAtlas:lua.indexOf('SMODS.Atlas')>=0, hasSuit:lua.indexOf('Hearts')>=0,",
  "      hasChips:lua.indexOf('chips = 50')>=0, hasLoc:lua.indexOf('阿尔法')>=0, bytes:lua.length };",
  '    const man=JSON.parse(B.maker.manifest());',
  '    r.manifest={ id:man.id, main:man.main_file, deps:(man.dependencies||[]).length };',
  '    const files=await B.maker.files();',
  "    r.files=files.map(function(f){return f.name+'('+f.data.length+'B)'});",
  '    const before=B.items.length;',
  '    const res=await B.importZipBuffer(B.zipStore(files), B.maker.state.modId);',
  '    await __V.wait(900);',
  '    r.imported={ ok:res&&res.ok!==false, items:res&&res.mod?res.mod.items:null, atlases:res&&res.mod?res.mod.atlases:null,',
  '      warnings:res&&res.mod?res.mod.warnings:null, total:B.items.length, delta:B.items.length-before };',
  '    const mine=B.items.filter(function(i){return i.source===B.maker.state.modId});',
  "    r.newItem=mine.length?{ id:mine[0].id, name:mine[0].i18n&&mine[0].i18n.zh_CN, cat:mine[0].cat, atlas:mine[0].atlas, pos:mine[0].pos, text:((mine[0].text&&mine[0].text.zh_CN)||[]).join(' ') }:null;",
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);

const CDP = path.join(__dirname, 'verify', 'cdp.js');
let cdp = fs.readFileSync(CDP, 'utf8').replace(/\r\n/g, '\n');
cdp = rep(cdp, '  /* 逐步播放（动画已删）：只检查步骤推进、数字变化与各机型的空间 */', SCEN + '\n  /* 逐步播放（动画已删）：只检查步骤推进、数字变化与各机型的空间 */', '新增 modMaker 场景');
cdp = rep(cdp,
  "  if (SCENARIOS.playStep && !SCENARIOS.playStepMobile) { SCENARIOS.playStepMobile = SCENARIOS.playStep; SCENARIOS.playStepTablet = SCENARIOS.playStep }",
  "  if (SCENARIOS.playStep && !SCENARIOS.playStepMobile) { SCENARIOS.playStepMobile = SCENARIOS.playStep; SCENARIOS.playStepTablet = SCENARIOS.playStep }\n" +
  "  if (SCENARIOS.modMaker && !SCENARIOS.modMakerMobile) { SCENARIOS.modMakerMobile = SCENARIOS.modMaker; SCENARIOS.modMakerTablet = SCENARIOS.modMaker }",
  'modMaker 克隆');
cdp = rep(cdp, "|| name === 'playStepMobile') {", "|| name === 'playStepMobile' || name === 'modMakerMobile') {", '手机名单');
cdp = rep(cdp, "|| name === 'playStepTablet') {", "|| name === 'playStepTablet' || name === 'modMakerTablet') {", '平板名单');
fs.writeFileSync(CDP, cdp);
console.log('共 ' + n + ' 处改动');
