/* boot.js: the status helpers lived inside build() but tryLocalPack() (module scope) needs them. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'boot.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

/* 1) hoist the helpers above build() */
rep(`  const STATUS = {`,
  `  /** The status box lives in the start screen; these work before/after it exists. */
  function statusBox () {
    const root = document.getElementById('boot')
    if (!root) return null
    let box = root.querySelector('.bootstatus')
    if (!box) {
      const card = root.querySelector('.bootcard')
      if (!card) return null
      box = el('div', 'bootstatus')
      box.style.display = 'none'
      card.appendChild(box)
    }
    return box
  }
  function setStatus (kind, text) {
    const box = statusBox()
    if (!box) return
    box.style.display = 'block'
    box.className = 'bootstatus ' + kind
    box.textContent = text
  }
  function progress (pct, text) {
    const box = statusBox()
    if (!box) return
    box.style.display = 'block'
    box.className = 'bootstatus busy'
    box.innerHTML = ''
    const t = el('div', null, text)
    const bar = el('div', 'bootbar')
    const fill = el('div', 'bootfill')
    fill.style.width = Math.max(2, Math.min(100, pct)) + '%'
    bar.appendChild(fill)
    box.appendChild(t); box.appendChild(bar)
  }

  const STATUS = {`,
  'hoist status helpers')

rep(`    const setStatus = (kind, text) => {
      status.style.display = 'block'
      status.className = 'bootstatus ' + kind
      status.textContent = text
    }
    const progress = (pct, text) => {
      status.style.display = 'block'
      status.className = 'bootstatus busy'
      status.innerHTML = ''
      const t = el('div', null, text)
      const bar = el('div', 'bootbar')
      const fill = el('div', 'bootfill')
      fill.style.width = Math.max(2, Math.min(100, pct)) + '%'
      bar.appendChild(fill)
      status.appendChild(t); status.appendChild(bar)
    }

    let busy = false`,
  `    let busy = false`,
  'drop the inner copies')

rep(`    const status = el('div', 'bootstatus')
    status.style.display = 'none'
    card.appendChild(status)

    root.appendChild(card)`,
  `    card.appendChild(el('div', 'bootstatus')).style.display = 'none'

    root.appendChild(card)`,
  'create the box via statusBox')

rep(`  function setStatusSafe (kind, text) {
    const s = document.getElementById('boot')
    if (!s) return
    let box = s.querySelector('.bootstatus')
    if (!box) { box = el('div', 'bootstatus'); s.querySelector('.bootcard').appendChild(box) }
    box.style.display = 'block'; box.className = 'bootstatus ' + kind; box.textContent = text
  }
`, '', 'use setStatus everywhere')

rep(`    if (window.__PACK__) tryLocalPack().catch((e) => { console.warn(e); setStatusSafe('bad', String(e.message || e)) })`,
  `    if (window.__PACK__) tryLocalPack().catch((e) => { console.warn(e); setStatus('bad', String(e.message || e)) })`,
  'status call')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
