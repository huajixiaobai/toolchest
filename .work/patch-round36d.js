/* 探针：readImage 到底返回了什么（顺带把 GIF 拆帧的断言写稳） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'verify', 'cdp.js');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const from = "      const info=await B.maker.readImage(file);";
const to = [
  "      r.readImageType=typeof B.maker.readImage;",
  "      const info=await B.maker.readImage(file);",
  "      r.infoShape=info?Object.keys(info).join(',')+' frames='+(info.frames?info.frames.length:'无'):'null';",
].join('\n');
if (s.split(from).length - 1 !== 1) { console.error('❌ 锚点不唯一'); process.exit(1) }
fs.writeFileSync(F, s.replace(from, () => to));
console.log('  ✓ 加了 readImage 探针');
