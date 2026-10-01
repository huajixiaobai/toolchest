/* The driver used a fixed debug port. A headless Chrome left over from a crashed run keeps
   listening on it, so later runs connect to that stale browser instead of the one they spawn
   (symptoms: every scenario after a point reports "no handle"). Free the port first, and always
   kill our own Chrome, even when a scenario fails. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`const { spawn } = require('child_process')`,
  `const { spawn, execSync } = require('child_process')`,
  'import execSync')

rep(`async function getJSON (url) {`,
  `/** Kill anything still listening on the CDP port (a Chrome leaked by an earlier crashed run). */
function freePort (port) {
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'latin1', maxBuffer: 8 << 20 })
    const pids = new Set()
    for (const line of out.split(/\\r?\\n/)) {
      if (!line.includes(':' + port)) continue
      if (!/LISTENING/i.test(line)) continue
      const m = /\\s(\\d+)\\s*$/.exec(line.trim())
      if (m) pids.add(m[1])
    }
    for (const pid of pids) {
      try { execSync('taskkill /F /PID ' + pid, { stdio: 'ignore' }); console.log('freed port ' + port + ' (killed stale pid ' + pid + ')') } catch { /* ignore */ }
    }
    if (pids.size) return true
  } catch { /* netstat unavailable — not fatal */ }
  return false
}

async function getJSON (url) {`,
  'freePort helper')

rep(`  const profile = path.join(__dirname, '..', 'chromeprofile-cdp')
  fs.mkdirSync(profile, { recursive: true })`,
  `  const profile = path.join(__dirname, '..', 'chromeprofile-cdp')
  fs.mkdirSync(profile, { recursive: true })
  freePort(PORT)`,
  'free the port before spawning')

/* always kill our browser */
rep(`  fs.writeFileSync(path.join(__dirname, 'cdp-report.json'), JSON.stringify(results, null, 1))
  try { c.ws.close() } catch { /* ignore */ }
  chrome.kill()
  await sleep(400)
  console.log('\\nshots ->', SHOTS)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })`,
  `  fs.writeFileSync(path.join(__dirname, 'cdp-report.json'), JSON.stringify(results, null, 1))
  try { c.ws.close() } catch { /* ignore */ }
  try { chrome.kill() } catch { /* ignore */ }
  await sleep(400)
  console.log('\\nshots ->', SHOTS)
}

main().catch((e) => {
  console.error('FATAL', e)
  // never leave a headless Chrome holding the debug port
  try { freePort(PORT) } catch { /* ignore */ }
  process.exit(1)
})`,
  'always clean up')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
