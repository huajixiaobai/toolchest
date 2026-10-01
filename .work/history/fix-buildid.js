/* buildId is used by the sw.js template, so it has to be computed before that write. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'build-lite.js')
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n'
let src = fs.readFileSync(F, 'utf8')

const block = `/* ---- build id ------------------------------------------------------------------- */
/* A short fingerprint of what went into this build, so the service worker cache rolls over. */
const buildId = (() => {
  const h = require('crypto').createHash('sha256')
  h.update(bootBundle); h.update(appBundle); h.update(html)
  return h.digest('hex').slice(0, 10)
})()

`
const b = block.split('\n').join(NL)
if (src.split(b).length - 1 !== 1) { console.log('FAIL locate buildId block'); process.exit(1) }
src = src.replace(b, '')

const anchor = `/* ---- PWA ------------------------------------------------------------------------ */`
const a = anchor.split('\n').join(NL)
if (src.split(a).length - 1 !== 1) { console.log('FAIL locate PWA anchor'); process.exit(1) }
src = src.replace(a, `${block}${anchor}`)
fs.writeFileSync(F, src)
new Function(src)
console.log('moved, syntax OK')
