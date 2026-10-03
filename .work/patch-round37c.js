/* 第三十七轮 C：动图没拆出多帧时要说清楚（不装作成功），并把诊断摆到界面上 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'app.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const L = (...a) => a.join('\n');
const from = L(
  "    const info = await mkReadImage(f);",
  "    if (!info) { status(\"这张图读不了（浏览器不支持这个格式）\"); return }",
  "    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: info.frames.length > 1 ? info.frames : null, animated: info.frames.length > 1, uploadName: f.name }) });",
  "    status('已使用「' + f.name + '」' + (info.frames.length > 1 ? '（动图，拆出 ' + info.frames.length + ' 帧，导出会铺成横向帧序列）' : '（静态图）'));",
  "    if (info.frames.length > 1) mkStartAnim();"
);
const to = L(
  "    const info = await mkReadImage(f);",
  "    if (!info) { status('这张图读不了（浏览器不支持这个格式）'); return }",
  "    const multi = info.frames.length > 1;",
  "    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, uploadName: f.name }) });",
  "    if (multi) {",
  "      status('已使用「' + f.name + '」：动图，拆出 ' + info.frames.length + ' 帧，预览会逐帧播放，导出会铺成横向帧序列。', 'ok');",
  "      mkStartAnim();",
  "    } else {",
  "      /* 拆不出多帧时如实说明：可能是这个浏览器/内核没有 ImageDecoder（无头环境常见），也可能是文件本身只有一帧 */",
  "      const why = (typeof ImageDecoder === 'undefined')",
  "        ? '这个浏览器没有 ImageDecoder（动图拆帧需要它，Chrome / Edge 新版本都有）'",
  "        : '这个内核没能从文件里读出多帧';",
  "      status('已使用「' + f.name + '」，但它只有一帧：' + why + '。先用静态图也能做，换最新版 Chrome / Edge 再上传就会动。');",
  "    }"
);
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点不唯一'); process.exit(1) }
/* 用函数式替换：里面含 $ 之类也不会被当成替换模式 */
s = s.replace(from, () => to);
fs.writeFileSync(F, s);
console.log('  ✓ 动图拆帧失败时会明说原因');
