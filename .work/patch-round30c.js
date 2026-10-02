/* 第三十轮补丁 3：合成台每次渲染都在同步算"动画帧数 / 接缝比"，实测占掉 170~250ms
   （CDP CPU profile：getImageData 688ms / 4 次渲染）。改成按规格缓存 + 下一帧再算。 */
const fs = require('fs');
const path = require('path');
let n = 0;
const patch = (file, pairs) => {
  const F = path.join(__dirname, file);
  let s = fs.readFileSync(F, 'utf8');
  for (const [from, to, label] of pairs) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) { console.error('❌ ' + file + ' :: ' + label + ' 命中 ' + hits + ' 次，放弃'); process.exit(1); }
    s = s.replace(from, to);
    console.log('  ✓ ' + file + ' :: ' + label);
    n++;
  }
  fs.writeFileSync(F, s);
};

patch('app.js', [
  /* ① 公共的"异步 + 缓存"动画信息 */
  [
    "function viewForge (root) {",
    "/* 动画信息（帧数 / 接缝比）算一次要跑一整段动画、再逐帧读像素 —— 合成台里最贵的一步，\n" +
    " *  CDP profile 实测每次渲染 170~250ms（getImageData 占绝大头）。\n" +
    " *  所以：① 按「规格 + 动画设置」缓存，同样的选择重渲染直接命中；\n" +
    " *  ② 没命中就先放一句「计算中…」，等浏览器空闲了再算，不把这一帧卡住。\n" +
    " *  apply(undefined) = 占位中 / apply(null) = 算不出来 / apply(obj) = 结果 */\n" +
    "const ANIM_INFO_CACHE = new Map();\n" +
    "function animInfoAsync (spec, apply) {\n" +
    "  let sig = '';\n" +
    "  try { sig = JSON.stringify(spec) + '|' + S.anim.fps + '|' + S.anim.seconds + '|' + (S.anim.loop || 'auto') + '|' + S.anim.speed } catch (e) { sig = '' }\n" +
    "  if (ANIM_INFO_CACHE.has(sig)) { apply(ANIM_INFO_CACHE.get(sig)); return }\n" +
    "  apply(undefined);\n" +
    "  const run = () => {\n" +
    "    let out = null;\n" +
    "    try {\n" +
    "      const f = buildAnimFrames(spec, 1, animOpts(spec));\n" +
    "      const o = animOpts(spec);\n" +
    "      out = { frames: f.frames.length, delay: f.delay, seam: loopSeamRatio(f.frames), autoPeriod: o.autoPeriod || null, loopMode: (S.anim.loop || 'auto') };\n" +
    "    } catch (e) { out = null }\n" +
    "    if (ANIM_INFO_CACHE.size > 40) ANIM_INFO_CACHE.clear();\n" +
    "    ANIM_INFO_CACHE.set(sig, out);\n" +
    "    try { apply(out) } catch (e) { /* 元素可能已经不在页面上了 */ }\n" +
    "  };\n" +
    "  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 500 }); else setTimeout(run, 16);\n" +
    "}\n\n" +
    "function viewForge (root) {",
    '动画信息异步+缓存'
  ],
  /* ② 动图那一节的读数 */
  [
    "    function refreshAnimInfo () {\n" +
    "      const spec = forgeSpec();\n" +
    "      const f = buildAnimFrames(spec, 1, animOpts(spec));\n" +
    "      const m = loopSeamRatio(f.frames);\n" +
    "      const secs = (f.frames.length * f.delay / 1000).toFixed(1);\n" +
    "      const o = animOpts(spec);\n" +
    "      const loopNote = o.autoPeriod\n" +
    "        ? ` · 检测到循环点 ${o.autoPeriod.toFixed(2)}s`\n" +
    "        : ((S.anim.loop || 'auto') === 'auto' ? ' · 未找到短循环，已按来回循环' : '');\n" +
    "      seam.textContent = m\n" +
    "        ? `${f.frames.length} 帧 · ${f.delay}ms（≈${Math.round(1000 / f.delay)}fps）· 全长 ${secs}s · 接缝比 ${m.ratio.toFixed(2)}（1 = 最顺）${loopNote}`\n" +
    "        : '';\n" +
    "    }",
    "    function refreshAnimInfo () {\n" +
    "      animInfoAsync(forgeSpec(), (info) => {\n" +
    "        if (info === undefined) { seam.textContent = '计算动图信息…'; return }\n" +
    "        if (!info) { seam.textContent = ''; return }\n" +
    "        const secs = (info.frames * info.delay / 1000).toFixed(1);\n" +
    "        const loopNote = info.autoPeriod\n" +
    "          ? ` · 检测到循环点 ${info.autoPeriod.toFixed(2)}s`\n" +
    "          : (info.loopMode === 'auto' ? ' · 未找到短循环，已按来回循环' : '');\n" +
    "        seam.textContent = info.seam\n" +
    "          ? `${info.frames} 帧 · ${info.delay}ms（≈${Math.round(1000 / info.delay)}fps）· 全长 ${secs}s · 接缝比 ${info.seam.ratio.toFixed(2)}（1 = 最顺）${loopNote}`\n" +
    "          : '';\n" +
    "      });\n" +
    "    }",
    '动图读数改成异步缓存'
  ],
  /* ③ 导出那一节的接缝读数（同一笔开销，另一个调用点） */
  [
    "    if (!(spec.standalone)) {\n" +
    "      const m = loopSeamRatio(buildAnimFrames(specForItem(it), 1, animOpts(specForItem(it))).frames);\n" +
    "      const o = animOpts(specForItem(it));\n" +
    "    if (m) {\n" +
    "      seamInfo.textContent = `循环接缝 ${(m.seam * 100).toFixed(2)}% ／ 平均帧差 ${(m.avg * 100).toFixed(2)}% → 接缝比 ${m.ratio.toFixed(2)}（越接近 1 越顺）`\n" +
    "        + (o.autoPeriod ? ` · 已按检测到的循环点 ${o.autoPeriod.toFixed(2)}s 导出` : '');\n" +
    "    }\n" +
    "    }",
    "    if (!(spec.standalone)) {\n" +
    "      animInfoAsync(specForItem(it), (info) => {\n" +
    "        if (info === undefined) { seamInfo.textContent = '循环接缝计算中…'; return }\n" +
    "        if (!info || !info.seam) { seamInfo.textContent = ''; return }\n" +
    "        const m = info.seam;\n" +
    "        seamInfo.textContent = `循环接缝 ${(m.seam * 100).toFixed(2)}% ／ 平均帧差 ${(m.avg * 100).toFixed(2)}% → 接缝比 ${m.ratio.toFixed(2)}（越接近 1 越顺）`\n" +
    "          + (info.autoPeriod ? ` · 已按检测到的循环点 ${info.autoPeriod.toFixed(2)}s 导出` : '');\n" +
    "      });\n" +
    "    }",
    '导出节读数改成异步缓存'
  ],
]);

console.log('共 ' + n + ' 处改动');
