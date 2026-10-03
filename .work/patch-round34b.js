/* 第三十四轮 B：Mod 制作器的样式 + 端到端场景（做一张牌 → 导出 zip → 再导入 → 图鉴里真的出现） */
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

/* ---------- CSS ---------- */
const CF = path.join(__dirname, 'app.css');
let css = fs.readFileSync(CF, 'utf8').replace(/\r\n/g, '\n');
const MKCSS = L(
  '/* ================================================================ Mod 制作器 */',
  '.maker{display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px;align-items:start}',
  '@media(max-width:900px){.maker{grid-template-columns:minmax(0,1fr)}}',
  '.mkleft{display:flex;flex-direction:column;gap:10px;position:sticky;top:0}',
  '@media(max-width:900px){.mkleft{position:static;order:-1}}',
  '.mkright{display:flex;flex-direction:column;gap:10px}',
  '.mkpv{background:#131c24;border:1px solid var(--line);border-radius:10px;padding:10px;text-align:center}',
  '.mkpvbox{display:flex;align-items:center;justify-content:center;min-height:150px}',
  '.mkpvbox canvas{image-rendering:pixelated;filter:drop-shadow(0 10px 20px #000b)}',
  '.mkpvline{text-align:left;margin-top:8px;line-height:1.6}',
  '.mkpvline b{color:#fff;font-size:13.5px}',
  '.mkrow{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-end;margin-bottom:8px}',
  '.mkrow label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--fg3)}',
  '.mkrow label.mkwide{flex:1 1 100%}',
  '.mkrow .tbtn{min-width:120px}',
  '.mkrow input[type=text],.mkrow input:not([type]){min-width:120px}',
  '.mkn{width:76px!important;min-width:76px!important}',
  '.mkck{flex-direction:row!important;align-items:center;gap:6px;color:var(--fg2)!important;font-size:12px!important}',
  '.mkbtnrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
  '.mkfxlist{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}',
  '.mkfx{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#18232d;border:1px solid var(--line2);',
  '  border-radius:8px;padding:7px 9px}',
  '.mkfx .tbtn{font-size:12px;padding:4px 6px;min-height:30px}',
  '.mkfx .mkx{padding:4px 8px;min-height:30px}',
  '.mkartgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:4px;max-height:236px;overflow:auto;',
  '  background:#131c24;border:1px solid var(--line);border-radius:8px;padding:6px;margin-top:6px}',
  '.mkcell{width:100%;aspect-ratio:1/1;border:1px solid var(--line2);border-radius:5px;background:#1b2530;cursor:pointer;padding:0}',
  '.mkcell:hover{border-color:var(--accent)}',
  '.mkcell.on{border-color:var(--accent);background:#12352b;box-shadow:0 0 0 2px #4bc29255}',
  '.mklua{width:100%;min-height:190px;background:#101820;color:#cfe3ef;border:1px solid var(--line2);border-radius:8px;',
  '  padding:9px 10px;font-family:var(--mono);font-size:11.5px;line-height:1.55;white-space:pre;overflow:auto}',
  '.mkfile{display:flex;flex-direction:column;gap:3px}',
  '.hint.ok{color:#7ee0a8}',
  '@media (hover:none){',
  '  .mkcell{min-height:40px}',
  '  .mkfx .tbtn,.mkfx .mkx{min-height:38px}',
  '}'
);
css = rep(css, '.scrowhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}', MKCSS + '\n.scrowhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}', 'maker 样式');
fs.writeFileSync(CF, css);

/* ---------- 场景 ---------- */
const SCEN = L(
  '  /* Mod 制作器：做一张小丑牌 → 导出 zip → 用图鉴自己的解析器再导入一遍（端到端） */',
  '  modMaker: `(async()=>{',
  '    const B=window.__BALATRO__; const S=B.state; const r={}; await __V.wait(1400);',
  '    const q=(s)=>document.querySelector(s); const qa=(s)=>[].slice.call(document.querySelectorAll(s));',
  "    S.tab='maker'; B.render(); await __V.wait(900);",
  "    r.view={ hasView:!!q('.maker'), sections:qa('.mkright .opt').length, cells:qa('#mkArtGrid .mkcell').length, hasLua:!!q('#mkLua'), buttons:qa('.mkbtnrow .btn').map(function(b){return b.textContent.trim()}) };",
  '    /* 用脚本按预设做一张：每张红桃 +50 筹码 */',
  "    B.maker.state.effects=[{when:'card',cond:'suit',condVal:'Hearts',eff:'chips',val:50}];",
  "    B.maker.state.nameZh='阿尔法'; B.maker.state.nameEn='Alpha'; B.maker.state.key='alpha';",
  "    B.maker.state.textZh=''; B.maker.state.textEn='';",
  '    const lua=B.maker.lua();',
  '    r.lua={ isJoker:lua.indexOf(\'SMODS.Joker\')>=0, hasCalc:lua.indexOf(\'calculate_joker\')>=0,',
  '      hasAtlas:lua.indexOf("SMODS.Atlas")>=0, hasSuit:lua.indexOf("is_suit(\\'Hearts\\')")>=0,',
  '      hasChips:lua.indexOf(\'chips = 50\')>=0, hasLoc:lua.indexOf(\'阿尔法\')>=0, bytes:lua.length };',
  '    const man=JSON.parse(B.maker.manifest());',
  '    r.manifest={ id:man.id, main:man.main_file, deps:(man.dependencies||[]).length };',
  '    /* 打包 → 自检导入 */',
  '    const files=await B.maker.files();',
  '    r.files=files.map(function(f){return f.name+\'(\'+f.data.length+\'B)\'});',
  '    const before=B.items.length;',
  '    const res=await B.importZipBuffer(__MKZIP__(files), B.maker.state.modId);',
  '    await __V.wait(900);',
  '    r.imported={ ok:res&&res.ok!==false, items:res&&res.mod?res.mod.items:null, atlases:res&&res.mod?res.mod.atlases:null,',
  '      warnings:res&&res.mod?res.mod.warnings:null, total:B.items.length, delta:B.items.length-before };',
  '    const mine=B.items.filter(function(i){return i.source===B.maker.state.modId});',
  "    r.newItem=mine.length?{ id:mine[0].id, name:mine[0].i18n&&mine[0].i18n.zh_CN, cat:mine[0].cat, atlas:mine[0].atlas, pos:mine[0].pos, text:(mine[0].text&&mine[0].text.zh_CN||[]).join(\' \') }:null;",
  '    /* 界面上也要能看到它（来源筛选里出现这个 mod） */',
  "    r.sourceListed=!!q('#sidebar')&&document.body.textContent.indexOf(B.maker.state.modId)>=0;",
  '    r.errors=window.__V.errors.length;',
  '    return r })()`,'
);
const ZF = L(
  '/* 场景里打包用的小工具：把文件表打成 zip（复用页面里的 zipStore） */',
  'window.__MKZIP__ = function (files) { return window.__BALATRO__.zipStore(files) };',
  ''
);

const CDP = path.join(__dirname, 'verify', 'cdp.js');
let cdp = fs.readFileSync(CDP, 'utf8').replace(/\r\n/g, '\n');
cdp = rep(cdp, '  /* 逐步播放（动画已删）：只检查步骤推进、数字变化与各机型的空间 */', ZF + SCEN + '\n  /* 逐步播放（动画已删）：只检查步骤推进、数字变化与各机型的空间 */', '新增 modMaker 场景');
cdp = rep(cdp,
  "  if (SCENARIOS.playStep && !SCENARIOS.playStepMobile) { SCENARIOS.playStepMobile = SCENARIOS.playStep; SCENARIOS.playStepTablet = SCENARIOS.playStep }",
  "  if (SCENARIOS.playStep && !SCENARIOS.playStepMobile) { SCENARIOS.playStepMobile = SCENARIOS.playStep; SCENARIOS.playStepTablet = SCENARIOS.playStep }\n" +
  "  if (SCENARIOS.modMaker && !SCENARIOS.modMakerMobile) { SCENARIOS.modMakerMobile = SCENARIOS.modMaker; SCENARIOS.modMakerTablet = SCENARIOS.modMaker }",
  'modMaker 克隆');
cdp = rep(cdp, "|| name === 'playStepMobile') {", "|| name === 'playStepMobile' || name === 'modMakerMobile') {", '手机名单');
cdp = rep(cdp, "|| name === 'playStepTablet') {", "|| name === 'playStepTablet' || name === 'modMakerTablet') {", '平板名单');
fs.writeFileSync(CDP, cdp);

console.log('共 ' + n + ' 处改动');
