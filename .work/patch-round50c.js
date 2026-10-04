/* 第五十轮（C）：工程界面 —— ⓪ 这一段：工程字段 + 按类型分组的条目列表 + 概览 + JSON 导出导入 */
const fs = require('fs');
const path = require('path');
let n = 0;
const L = (...a) => a.join('\n');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const rep = (from, to, label) => {
  const hits = s.split(from).length - 1;
  if (hits !== 1) { console.error('❌ ' + label + ' 命中 ' + hits + ' 次'); process.exit(1); }
  s = s.replace(from, () => to); console.log('  ✓ ' + label); n++;
};

const UI = L(
  '  /* ---------- ⓪ 这个 mod 里有什么（工程：多条目、分组、自动保存、JSON 备份） ---------- */',
  '  {',
  "    const body = section('⓪ 这个 mod 里有什么（一个工程，多个条目，最后打成一个 mod）');",
  "    const pbtn = (label, fn, id) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; if (id) b.id = id; b.textContent = label; b.onclick = fn; return b };",
  '    /* 工程级字段：装到 Mods/ 里的 id、游戏里显示的名字、作者、版本、条目 key 前缀 */',
  "    const prow = document.createElement('div'); prow.className = 'mkrow';",
  "    prow.appendChild(field('Mod id（Mods/ 下的文件夹名）', '<input class=\"tbtn\" data-mkp=\"modId\" value=\"' + esc(MKR.modId) + '\">'));",
  "    prow.appendChild(field('Mod 名称', '<input class=\"tbtn mkwide\" data-mkp=\"modName\" value=\"' + esc(MKR.modName) + '\">'));",
  "    prow.appendChild(field('作者', '<input class=\"tbtn mkn\" data-mkp=\"author\" value=\"' + esc(MKR.author) + '\">'));",
  "    prow.appendChild(field('版本', '<input class=\"tbtn mkn\" data-mkp=\"version\" value=\"' + esc(MKR.version) + '\">'));",
  "    prow.appendChild(field('条目 key 前缀', '<input class=\"tbtn mkn\" data-mkp=\"prefix\" value=\"' + esc(MKR.prefix) + '\">'));",
  '    body.appendChild(prow);',
  "    body.appendChild(field('Mod 说明', '<input class=\"tbtn mkwide\" data-mkp=\"desc\" value=\"' + esc(MKR.desc) + '\">'));",
  '    /* 条目列表：按类型分组，点谁就编辑谁 */',
  "    const list = document.createElement('div'); list.className = 'mkitems'; list.id = 'mkItems';",
  '    mkGrouped().forEach((g) => {',
  "      const head = document.createElement('div'); head.className = 'mkigrp';",
  "      head.textContent = g.name + '（' + g.rows.length + '）';",
  '      list.appendChild(head);',
  '      g.rows.forEach((row) => {',
  "        const el = document.createElement('div');",
  "        el.className = 'mki' + (row.i === MKR.cur ? ' on' : '');",
  "        el.title = '点它就开始编辑这一条';",
  "        el.innerHTML = '<span class=\"mkin\">' + (row.i + 1) + '</span><span class=\"mkiname\">' + esc(row.it.nameZh || row.it.key) + '</span><code>' + esc(row.it.key) + '</code>';",
  '        el.onclick = () => { mkSelect(row.i); status(\'现在在编辑第 \' + (row.i + 1) + \' 条：\' + (row.it.nameZh || row.it.key)); redraw() };',
  '        list.appendChild(el);',
  '      });',
  '    });',
  '    body.appendChild(list);',
  "    const brow = document.createElement('div'); brow.className = 'mkrow';",
  "    brow.appendChild(pbtn('＋ 再加一个条目（' + mkType()[1] + '）', () => { mkAddItem(MK.type); status('已加一个新条目，现在编辑的就是它。'); redraw() }, 'mkAddItem'));",
  "    brow.appendChild(pbtn('⧉ 复制这一个', () => { mkDupItem(); status('已复制成新条目：贴图 / 帧序列 / 立绘都带过来了，key 自动换了不重名的。'); redraw() }, 'mkDupItem'));",
  "    brow.appendChild(pbtn('🗑 删除这一个', () => { if (mkDelItem()) { status('已删除这一条。'); redraw() } else status('只剩一个条目了，不能删。') }, 'mkDelItem'));",
  "    brow.appendChild(pbtn('↑ 上移', () => { if (mkMoveItem(-1)) redraw() }, 'mkUp'));",
  "    brow.appendChild(pbtn('↓ 下移', () => { if (mkMoveItem(1)) redraw() }, 'mkDown'));",
  '    body.appendChild(brow);',
  '    /* 概览 */',
  "    const ov = document.createElement('div'); ov.className = 'hint'; ov.id = 'mkProjOverview';",
  "    ov.textContent = '工程概览：' + MKR.items.length + ' 个条目 —— ' + mkGrouped().map((g) => g.name + ' ' + g.rows.length).join('、') +",
  "      '；导出时打成一个 mod：一个 manifest.json + 一个 ' + MKR.modId + '.lua（注册全部条目）+ 每个条目自己的图集 sheet_<key>.png。改动会自动存在这台浏览器里。';",
  '    body.appendChild(ov);',
  '    /* JSON 备份 / 恢复 */',
  "    const jrow = document.createElement('div'); jrow.className = 'mkrow';",
  "    jrow.appendChild(pbtn('💾 导出工程 JSON（连图片，可备份 / 换机器）', () => {",
  '      try {',
  '        const o = mkProjectJSON(true);',
  "        save(TE.encode(JSON.stringify(o)), MKR.modId + '.project.json', 'application/json');",
  "        status('已导出工程 JSON（' + MKR.items.length + ' 个条目，连图片一起）。下次用「导入工程 JSON」就能接着改。', 'ok');",
  "      } catch (e) { status('导出工程失败：' + e.message) }",
  "    }, 'mkExpJson'));",
  "    jrow.appendChild(pbtn('📂 导入工程 JSON', () => {",
  "      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';",
  '      inp.onchange = async () => {',
  '        const f = inp.files && inp.files[0]; if (!f) return;',
  '        try {',
  '          const o = JSON.parse(await f.text());',
  "          if (!mkApplyProject(o)) { status('这个 JSON 里没有条目，导不进来。'); return }",
  '          await mkRestoreImages(o);',
  '          mkSaveProject(); redraw();',
  "          status('已导入工程：' + MKR.items.length + ' 个条目（图片也一起恢复了）。', 'ok');",
  "        } catch (e) { status('导入失败：' + e.message) }",
  '      };',
  '      inp.click();',
  "    }, 'mkImpJson'));",
  "    body.appendChild(jrow);",
  '  }',
  ''
);
rep('  /* ---------- ① 做什么（含：来源与贴图，全在这一段里） ---------- */', UI + '  /* ---------- ① 做什么（含：来源与贴图，全在这一段里） ---------- */', '工程界面');

/* 工程字段输入框的接线 + 把工程操作暴露给测试脚本 */
rep(
  "  /* 基本输入 */\n  qa('[data-mk]').forEach((el) => {",
  L("  /* 工程字段（Mod id / 名称 / 作者 / 版本 / 前缀 / 说明）：改了就存，并刷新 Lua */",
    "  qa('[data-mkp]').forEach((el) => el.addEventListener('input', () => {",
    "    MKR[el.dataset.mkp] = el.value;",
    '    mkSaveProject();',
    '    refresh();',
    '  }));',
    '  /* 基本输入 */',
    "  qa('[data-mk]').forEach((el) => {"),
  '工程字段接线'
);
rep(
  'types: MK_TYPES, when: MK_WHEN, eff: MK_EFF, motion: MK_MOTION, delays: () => mkFrameDelays(MK.art), animArgs: () => mkAnimArgs(MK.art),',
  'types: MK_TYPES, when: MK_WHEN, eff: MK_EFF, motion: MK_MOTION, delays: () => mkFrameDelays(MK.art), animArgs: () => mkAnimArgs(MK.art),\n      project: MKR, addItem: mkAddItem, dupItem: mkDupItem, delItem: mkDelItem, moveItem: mkMoveItem, select: mkSelect, grouped: mkGrouped,\n      projectJSON: mkProjectJSON, applyProject: mkApplyProject, restoreImages: mkRestoreImages, saveProject: mkSaveProject, loadProject: mkLoadProject,',
  '暴露工程操作'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ["id = 'mkItems'", "id = 'mkAddItem'", "id = 'mkExpJson'", "data-mkp", 'project: MKR, addItem: mkAddItem'];
const missing = must.filter((m) => back.indexOf(m) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
