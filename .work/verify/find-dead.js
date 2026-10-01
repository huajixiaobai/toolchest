const fs = require('fs')
const a = fs.readFileSync('app.js', 'utf8').split(/\r?\n/)
for (const n of ['tileReady', 'lazyCanvas', 'FORGE_FRONTS', 'medianCutPalette']) {
  console.log('--- ' + n)
  a.forEach((l, i) => { if (new RegExp('\\b' + n + '\\b').test(l)) console.log('  ' + (i + 1) + ': ' + l.trim().slice(0, 120)) })
}
