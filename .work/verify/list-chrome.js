const { execSync } = require('child_process')
const out = execSync('wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine /format:list', { encoding: 'latin1', maxBuffer: 8 << 20 })
const blocks = out.split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean)
let cdp = 0
const lines = []
for (const b of blocks) {
  const m = /CommandLine=(.*)/.exec(b)
  const p = /ProcessId=(\d+)/.exec(b)
  if (!m) continue
  const cl = m[1]
  if (!/headless/.test(cl)) continue
  cdp++
  const port = /--remote-debugging-port=(\d+)/.exec(cl)
  const prof = /--user-data-dir=([^ ]+)/.exec(cl)
  lines.push('pid ' + (p && p[1]) + ' port ' + (port ? port[1] : '-') + ' profile ' + (prof ? prof[1].slice(-30) : '-'))
}
console.log('headless chrome processes:', cdp)
for (const l of lines) console.log(' ', l)
