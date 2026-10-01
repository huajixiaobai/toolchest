/* One failing driver-side hook should not abort the whole suite: wrap the per-scenario driver
   work in try/catch and record the failure on that scenario only. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0

/* the reload + helper injection at the top of each iteration */
const from = `    if (name === 'modCryptid') {`
const to = `    try {
    if (name === 'modCryptid') {`
const n1 = s.split(from).length - 1
if (n1 !== 1) { console.log('FAIL open (' + n1 + ')'); fails++ } else { s = s.replace(from, to); console.log('ok   open try') }

const from2 = `    if (name.indexOf('mod') === 0 || name === 'modImport') {
      const payload = fs.readFileSync(path.join(__dirname, 'testmod.json'), 'utf8')
      await c.eval('window.__TESTMOD__ = ' + payload + ';')
    }
    if (name === 'editions') {`
const to2 = `    if (name.indexOf('mod') === 0 || name === 'modImport') {
      const payload = fs.readFileSync(path.join(__dirname, 'testmod.json'), 'utf8')
      await c.eval('window.__TESTMOD__ = ' + payload + ';')
    }
    } catch (e) {
      console.log('             driver hook failed:', String(e.message).slice(0, 200))
    }
    if (name === 'editions') {`
const n2 = s.split(from2).length - 1
if (n2 !== 1) { console.log('FAIL close (' + n2 + ')'); fails++ } else { s = s.replace(from2, to2); console.log('ok   close try') }

/* screenshots may fail (e.g. a scenario navigated); never abort for that */
const from3 = `      try { await c.shot(name) } catch (e) { /* ignore */ }`
if (s.split(from3).length - 1 === 1) { console.log('ok   shots already guarded') } else { console.log('FAIL shots'); fails++ }

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES' : 'done, syntax OK')
