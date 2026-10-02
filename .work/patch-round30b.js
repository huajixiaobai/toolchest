/* 第三十轮补丁 2：行距、长按吞掉误触的点击、合成台主体格子改成"滚到才画"、手机克隆注册。 */
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

patch('app.css', [
  ["min-height:70px;padding-top:30px}", "min-height:70px;padding-top:42px}", '行距 30→42'],
  ["  .sctile::after{height:36px}\n  .scrail{padding-top:40px}", "  .sctile::after{height:36px}\n  .scrail{padding-top:48px}", '触屏行距 40→48'],
]);

patch('app.js', [
  /* 长按之后，浏览器还会补一次 click；触屏上弹窗是底部整幅的，那一击会落在遮罩上把面板关掉。
     所以长按一触发就装一个"吞掉下一次点击"的全局捕获监听。 */
  [
    "      if (navigator.vibrate) { try { navigator.vibrate(12) } catch (err) { /* ignore */ } }\n      handler({ clientX: t.clientX, clientY: t.clientY });",
    "      if (navigator.vibrate) { try { navigator.vibrate(12) } catch (err) { /* ignore */ } }\n" +
    "      swallowNextClick();\n" +
    "      handler({ clientX: t.clientX, clientY: t.clientY });",
    '长按吞掉下一次点击'
  ],
  [
    "function bindContext (el, handler) {",
    "/** 长按之后浏览器会补一次 click（触屏上弹窗是底部整幅的，那一击往往落在遮罩上，\n" +
    " *  刚打开的面板会被立刻关掉）。这里在捕获阶段吃掉紧接着的那一次点击。 */\n" +
    "function swallowNextClick () {\n" +
    "  const kill = (e) => { e.stopPropagation(); e.preventDefault(); cleanup() };\n" +
    "  const cleanup = () => { document.removeEventListener('click', kill, true); clearTimeout(timer) };\n" +
    "  const timer = setTimeout(cleanup, 800);\n" +
    "  document.addEventListener('click', kill, true);\n" +
    "}\n" +
    "function bindContext (el, handler) {",
    '吞点击的实现'
  ],
  /* 合成台的主体格子：150 项一次性 compose 要 370ms。改成和选牌器一样"滚到才画"。 */
  [
    "        const sm = miniThumb(it);\n        if (sm) b.appendChild(sm);",
    "        /* 滚到视野里才画（rootMargin 300px 提前量）：150 项一次性 compose 要 370ms，\n" +
    "           现在只有真正看得到的那几十项会画，剩下的滚动时补上，缓存命中后就是一次 drawImage。 */\n" +
    "        const art = document.createElement('span');\n" +
    "        art.className = 'pickart';\n" +
    "        b.appendChild(art);\n" +
    "        b.__paintThumb = () => { if (b.__painted) return; b.__painted = true;\n" +
    "          const sm = miniThumb(it); if (sm) { art.innerHTML = ''; art.appendChild(sm) } };\n" +
    "        if (IO) { b._paint = b.__paintThumb; IO.observe(b) } else b.__paintThumb();",
    '主体格子滚到才画'
  ],
]);

patch('verify/cdp.js', [
  ["|| name === 'bootMobile' || name === 'uiFixMobile') {", "|| name === 'bootMobile' || name === 'uiFixMobile' || name === 'uxAuditMobile') {", '手机克隆走 390×844'],
]);

console.log('共 ' + n + ' 处改动');
