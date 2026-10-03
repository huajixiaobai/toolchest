/* 快速核对：patch 脚本里那个"文件结尾"锚点到底为什么匹配不到 */
const fs = require('fs');
const app = fs.readFileSync('.work/app.js', 'utf8');
const tail = "if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();\n})();";
console.log('tail 出现次数:', app.split(tail).length - 1);
console.log('文件结尾 60 字节:', JSON.stringify(app.slice(-60)));
console.log('锚点末 60 字节:', JSON.stringify(tail.slice(-60)));
const idx = app.indexOf("if (document.readyState === 'loading')");
console.log('indexOf readyState:', idx, '| 片段:', JSON.stringify(app.slice(idx, idx + 120)));
