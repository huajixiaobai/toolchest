/* 第四十八轮：逐帧时长（sprite_args.frame_durations）
   对着本机 Steamodded 源码核过（.work/third-party/smods/smods-26.829.0/src/overrides.lua）：
     local frame_duration = (self.sprite_args.frame_durations or {})[self.current_animation.current+1]
                            or self.sprite_args.frame_duration or 1
     local fps = self.sprite_args.fps or self.atlas.fps or G.ANIMATION_FPS
     self.current_animation.frame_duration = frame_duration / fps
   也就是说：每帧实际停留 = **倍数 / fps** 秒。所以「各帧快慢不一样」在游戏里就是
   「把最小延时当成基准 → fps = 1000/基准 → 其余帧写整数倍数」，而不是直接写毫秒。
   这一轮：① 把解码器本来就有的逐帧延时接进状态；② 导出时非均匀才写 frame_durations；
           ③ 界面给一排倍数输入框（能看出哪几帧更慢，也能自己调）；④ 预览改成按每帧自己的时长走。 */
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

/* ---------- ① 解码结果带上「每帧延时」 ---------- */
rep(
  L('    const g = gifDecodeFrames(bytes, max || 24);',
    '    if (!g || !g.length) return null;',
    '    return { frames: mkFramesToCanvases(g), delay: g[0].delay, total: g.length };'),
  L('    const g = gifDecodeFrames(bytes, max || 24);',
    '    if (!g || !g.length) return null;',
    '    return { frames: mkFramesToCanvases(g), delay: g[0].delay, delays: g.map((f) => f.delay), total: g.length };'),
  'GIF 每帧延时'
);
rep(
  L('    const g = await apngDecodeFrames(bytes, max || 24, mkInflateZlib);',
    '    if (!g || !g.length) return null;',
    '    return { frames: mkFramesToCanvases(g), delay: g[0].delay, total: g.length };'),
  L('    const g = await apngDecodeFrames(bytes, max || 24, mkInflateZlib);',
    '    if (!g || !g.length) return null;',
    '    return { frames: mkFramesToCanvases(g), delay: g[0].delay, delays: g.map((f) => f.delay), total: g.length };'),
  'APNG 每帧延时'
);
rep(
  "      if (g && g.frames.length > 1) { URL.revokeObjectURL(url); return { frames: g.frames, cover: g.frames[0], delay: g.delay, gif: true } }",
  "      if (g && g.frames.length > 1) { URL.revokeObjectURL(url); return { frames: g.frames, cover: g.frames[0], delay: g.delay, delays: g.delays, gif: true } }",
  'mkReadImage 返回 GIF 逐帧延时'
);
rep(
  "      if (a && a.frames.length > 1) { URL.revokeObjectURL(url); return { frames: a.frames, cover: a.frames[0], delay: a.delay, apng: true } }",
  "      if (a && a.frames.length > 1) { URL.revokeObjectURL(url); return { frames: a.frames, cover: a.frames[0], delay: a.delay, delays: a.delays, apng: true } }",
  'mkReadImage 返回 APNG 逐帧延时'
);

/* ---------- ② 时长换算：倍数 / fps；导出用的三件套 ---------- */
rep(
  L('function mkFrameDelay (src, fps) {',
    '  if (src && src.frames && src.frames.length && src.delay) return src.delay;',
    '  return Math.round(1000 / (fps || 10));',
    '}'),
  L('function mkFrameDelay (src, fps) {',
    '  if (src && src.frames && src.frames.length && src.delay) return src.delay;',
    '  return Math.round(1000 / (fps || 10));',
    '}',
    '/** 每一帧各停多久（毫秒）：导入的按文件自己的逐帧延时，生成的按 fps 基准，再乘上逐帧倍数 */',
    'function mkFrameDelays (src) {',
    '  const list = mkSourceFrames(src);',
    '  const n = list ? list.length : 1;',
    '  if (n < 2) return [160];',
    '  const own = (src && src.delays && src.delays.length === n) ? src.delays : null;',
    '  const w = (src && src.weights && src.weights.length === n) ? src.weights : null;',
    '  const baseMs = own ? 0 : Math.round(1000 / ((src && src.gen && src.gen.fps) || 10));',
    '  const out = [];',
    '  for (let i = 0; i < n; i++) {',
    '    const d = own ? Math.max(10, own[i] || own[0]) : baseMs;',
    '    out.push(Math.max(10, Math.round(d * ((w && w[i]) || 1))));',
    '  }',
    '  return out;',
    '}',
    '/** 预览用：第 frameIndex 帧该停多久 */',
    'function mkFrameDelayAt (src, frameIndex, fallback) {',
    '  const list = mkSourceFrames(src);',
    '  const n = list ? list.length : 1;',
    '  if (n < 2) return fallback || 160;',
    '  const d = mkFrameDelays(src);',
    '  return d[frameIndex % n] || fallback || 160;',
    '}',
    '/** 导出 Lua 用的动图三件套：最小延时当基准 → fps；其余帧换算成整数倍数（只有非均匀时才写） */',
    'function mkAnimArgs (src) {',
    '  const list = mkSourceFrames(src);',
    '  const n = list ? list.length : 1;',
    '  if (n < 2) return null;',
    '  const d = mkFrameDelays(src);',
    '  const min = Math.min.apply(null, d);',
    '  const mult = d.map((x) => Math.max(1, Math.min(99, Math.round(x / min))));',
    '  const uniform = mult.every((x) => x === mult[0]);',
    '  return { n: n, fps: Math.max(1, Math.min(60, Math.round(1000 / min))), frame_durations: uniform ? null : mult, baseMs: min };',
    '}',
    '/** 逐帧时长那一行的说明：现在各帧是不是一样长、哪些更慢 */',
    'function mkWeightHintText () {',
    '  const d = mkFrameDelays(MK.art);',
    '  if (d.length < 2) return "";',
    '  const min = Math.min.apply(null, d);',
    '  const kinds = new Set(d).size;',
    '  if (kinds < 2) return "现在每帧一样长（" + d[0] + "ms）。想让某几帧慢一点，就把它的倍数调大。";',
    '  const slow = d.map((x, i) => [i + 1, x]).filter((p) => p[1] > min).map((p) => "第 " + p[0] + " 帧 " + (p[1] / min).toFixed(1) + "×");',
    '  return "现在有 " + kinds + " 种时长（基准 " + min + "ms）：" + slow.slice(0, 8).join("、") + (slow.length > 8 ? " …" : "") + "。导出会写进 sprite_args.frame_durations。";',
    '}'),
  '时长换算与导出三件套'
);

/* ---------- ③ 预览：按每帧自己的时长走（改成 setTimeout 链） ---------- */
rep(
  L('  mkAnimTimer = setInterval(tick, mkAnimDelay);',
    '  tick();',
    '}'),
  L('  mkAnimTimer = setTimeout(tick, mkAnimDelay);',
    '}'),
  '预览计时器改成链式'
);
rep(
  L('    mkFrame = (mkFrame + 1) % (total * 60);      /* 前 60 步给立绘浮动留相位，同时保证帧序走满一圈 */',
    '    if (total < 2 && !soulAlive) return;',
    '    const old = box.querySelector("canvas");',
    '    const cv = mkPreviewCanvas();',
    '    cv.style.width = \'142px\'; cv.style.height = \'190px\';',
    '    if (old) box.replaceChild(cv, old); else box.appendChild(cv);',
    '  };'),
  L('    mkFrame = (mkFrame + 1) % (total * 60);      /* 前 60 步给立绘浮动留相位，同时保证帧序走满一圈 */',
    '    if (total >= 2 || soulAlive) {',
    '      const old = box.querySelector("canvas");',
    '      const cv = mkPreviewCanvas();',
    '      cv.style.width = \'142px\'; cv.style.height = \'190px\';',
    '      if (old) box.replaceChild(cv, old); else box.appendChild(cv);',
    '    }',
    '    /* 每一帧停多久：主体有帧就用主体的逐帧时长，否则看立绘，都没有就用传入的兜底延时 */',
    '    const tickSrc = aN > 1 ? MK.art : (sN > 1 ? MK.soul : null);',
    '    const wait = tickSrc ? mkFrameDelayAt(tickSrc, mkFrame, mkAnimDelay) : mkAnimDelay;',
    '    mkAnimTimer = setTimeout(tick, Math.max(30, Math.min(2000, wait)));',
    '  };'),
  '预览按逐帧时长排下一帧'
);

/* ---------- ④ Lua：atlasLines 收 anim 三件套，非均匀时写 sprite_args ---------- */
rep(
  L('  const atlasLines = (key, file, frames, delay) => {',
    '    const rows = [[\'key\', "\'" + key + "\'"], [\'path\', "\'" + file + "\'"], [\'px\', String(CARD_W)], [\'py\', String(CARD_H)]];',
    '    if (frames > 1) {',
    '      const fps = delay ? Math.max(1, Math.min(60, Math.round(1000 / delay))) : 10;',
    '      rows.push([\'atlas_table\', "\'ANIMATION_ATLAS\'", \'动图必须写这一行：不写就算静态图集，帧数会被忽略\']);',
    '      rows.push([\'frames\', String(frames), \'动图：横向帧序列\']);',
    '      rows.push([\'fps\', String(fps), delay ? \'每帧 \' + delay + \'ms\' : \'\']);',
    '    }'),
  L('  const atlasLines = (key, file, anim) => {',
    '    const rows = [[\'key\', "\'" + key + "\'"], [\'path\', "\'" + file + "\'"], [\'px\', String(CARD_W)], [\'py\', String(CARD_H)]];',
    '    if (anim && anim.n > 1) {',
    '      rows.push([\'atlas_table\', "\'ANIMATION_ATLAS\'", \'动图必须写这一行：不写就算静态图集，帧数会被忽略\']);',
    '      rows.push([\'frames\', String(anim.n), \'动图：横向帧序列\']);',
    '      rows.push([\'fps\', String(anim.fps), \'基准 \' + anim.baseMs + \'ms/帧\']);',
    '      /* 各帧快慢不一样时：帧停留 = 倍数 / fps（见 overrides.lua 的 frame_duration / fps） */',
    '      if (anim.frame_durations) rows.push([\'sprite_args\', \'{ frame_durations = { \' + anim.frame_durations.join(\', \') + \' } }\', \'逐帧时长倍数（1 = 基准），缩放要这样写才和 fps 对得上\']);',
    '    }'),
  'atlasLines 支持逐帧时长'
);
rep(
  L('  const aListLua = mkSourceFrames(MK.art);',
    '  const aNLua = aListLua ? aListLua.length : 1;',
    '  const aDelayLua = aListLua ? mkFrameDelay(MK.art, MK.art.gen && MK.art.gen.fps) : 0;',
    "  L.push('SMODS.Atlas {');",
    "  for (const line of atlasLines('sheet', 'sheet.png', aNLua, aDelayLua)) L.push(line);"),
  L('  const aAnim = mkAnimArgs(MK.art);',
    "  L.push('SMODS.Atlas {');",
    "  for (const line of atlasLines('sheet', 'sheet.png', aAnim)) L.push(line);"),
  'Lua 主体图集三件套'
);
rep(
  L('    const sListLua = mkSourceFrames(MK.soul);',
    '    const sNLua = sListLua ? sListLua.length : 1;',
    '    const sDelayLua = sListLua ? mkFrameDelay(MK.soul, MK.soul.gen && MK.soul.gen.fps) : 0;',
    "    for (const line of atlasLines('soul', 'soul.png', sNLua, sDelayLua)) L.push(line);"),
  L('    const sAnim = mkAnimArgs(MK.soul);',
    "    for (const line of atlasLines('soul', 'soul.png', sAnim)) L.push(line);"),
  'Lua 立绘图集三件套'
);

/* ---------- ⑤ 上传时把逐帧延时与倍数一起存下 ---------- */
rep(
  "    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, delay: info.delay || 0, uploadName: f.name }) });",
  "    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, delay: info.delay || 0, delays: (multi && info.delays) ? info.delays : null, weights: null, uploadName: f.name }) });",
  '主体上传存逐帧延时'
);
rep(
  "    mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, delay: info.delay || 0, uploadName: f.name }) });",
  "    mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, delay: info.delay || 0, delays: (multi && info.delays) ? info.delays : null, weights: null, uploadName: f.name }) });",
  '立绘上传存逐帧延时'
);

/* ---------- ⑥ 界面：一排倍数输入框 + 说明 ---------- */
rep(
  "    src.insertAdjacentHTML('beforeend', '<div class=\"hint\">' + MK_IMG_TIP + '</div><div class=\"hint\" id=\"mkMotionHint\">' + mkMotionHintText() + '</div><div class=\"hint\" id=\"mkArtHint\"></div>');",
  L("    /* 逐帧时长：导入的动图如果各帧快慢不一样，这里能一眼看出哪几帧更慢，也能自己调 */",
    "    const frNow = mkSourceFrames(MK.art);",
    "    if (frNow && frNow.length > 1 && frNow.length <= 24) {",
    "      const wRow = document.createElement('div'); wRow.className = 'mkweights';",
    "      const wNow = MK.art.weights || [];",
    "      wRow.innerHTML = '<span class=\"mklabel\">每帧时长（倍数，1 = 一个基准时长）</span>' + frNow.map((_x, i) =>",
    "        '<label class=\"mkweight\"><span>' + (i + 1) + '</span><input type=\"number\" min=\"1\" max=\"99\" data-frame=\"' + i + '\" value=\"' + (wNow[i] || 1) + '\"></label>').join('') +",
    "        '<div class=\"hint\" id=\"mkWeightHint\">' + mkWeightHintText() + '</div>';",
    "      src.appendChild(wRow);",
    "    }",
    "    src.insertAdjacentHTML('beforeend', '<div class=\"hint\">' + MK_IMG_TIP + '</div><div class=\"hint\" id=\"mkMotionHint\">' + mkMotionHintText() + '</div><div class=\"hint\" id=\"mkArtHint\"></div>');"),
  '逐帧时长控件'
);
rep(
  "  const mo = q('#mkMotion'); if (mo) mo.onchange = () => mkSetGen('art', { kind: mo.value });",
  L("  /* 逐帧时长：改任意一格的倍数 → 存下来 → 预览按新时长重排 */",
    "  qa('[data-frame]').forEach((el) => el.addEventListener('change', () => {",
    "    const listNow = mkSourceFrames(MK.art);",
    "    const cnt = listNow ? listNow.length : 0;",
    "    if (cnt < 2) return;",
    "    const w = new Array(cnt).fill(1);",
    "    qa('[data-frame]').forEach((x) => { w[Number(x.dataset.frame)] = Math.max(1, Math.min(99, Number(x.value) || 1)) });",
    "    mkSet({ art: Object.assign({}, MK.art, { weights: w }) });",
    "    mkStartAnim(0);",
    "    status('每帧时长已更新：' + w.join(' / ') + '（倍数）—— 导出会写成 sprite_args.frame_durations。');",
    "  }));",
    "  const mo = q('#mkMotion'); if (mo) mo.onchange = () => mkSetGen('art', { kind: mo.value });"),
  '逐帧时长事件'
);

fs.writeFileSync(F, s);
const back = fs.readFileSync(F, 'utf8');
const must = ['delays: g.map((f) => f.delay)', 'function mkFrameDelays (src)', 'function mkFrameDelayAt (src, frameIndex, fallback)',
  'function mkAnimArgs (src)', 'function mkWeightHintText ()', 'const atlasLines = (key, file, anim)', 'sprite_args', 'const aAnim = mkAnimArgs(MK.art)', 'const sAnim = mkAnimArgs(MK.soul)',
  "id=\\\"mkWeightHint\\\"", 'data-frame'];
const missing = must.filter((m) => back.indexOf(m.replace(/\\"/g, '"')) < 0);
console.log('共 ' + n + ' 处改动');
console.log(missing.length ? '❌ 写回后找不到：' + missing.join(' | ') : '✅ 写回校验：' + must.length + ' 个关键标识全部在文件里');
