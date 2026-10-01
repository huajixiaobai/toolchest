const fs = require('fs')
const a = fs.readFileSync(require('path').join(__dirname, 'app.js'), 'utf8').split(/\r?\n/)
for (const n of ['tileReady', 'lazyCanvas', 'FORGE_FRONTS', 'medianCutPalette', 'refinePalette']) {
  console.log('--- ' + n)
  const re = new RegExp('\\b' + n + '\\b')
  a.forEach((l, i) => { if (re.test(l)) console.log('   ' + (i + 1) + ': ' + l.trim().slice(0, 110)) })
}
