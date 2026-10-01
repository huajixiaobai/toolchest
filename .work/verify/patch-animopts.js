// Route every animation export through animOpts() so the fps setting applies everywhere.
'use strict'
const fs = require('fs')
const path = require('path')
const f = path.join(__dirname, '..', 'app.js')
let s = fs.readFileSync(f, 'utf8')
const before = s
s = s.split('buildAnimFrames(spec, 2, { speed: S.anim.speed, seconds: S.anim.seconds, pingpong: S.anim.pingpong })').join('buildAnimFrames(spec, 2, animOpts())')
s = s.split('buildAnimFrames(specForItem(it), 1, { speed: S.anim.speed, seconds: S.anim.seconds, pingpong: S.anim.pingpong })').join('buildAnimFrames(specForItem(it), 1, animOpts())')
s = s.replace('const ANIM_FPS = 15;', 'const ANIM_FPS = 20;')
fs.writeFileSync(f, s)
console.log('replacements applied:', before !== s)
const left = (s.match(/S\.anim\.speed, seconds: S\.anim\.seconds/g) || []).length
console.log('remaining inline anim option objects:', left)
try { new Function(s); console.log('syntax OK') } catch (e) { console.log('syntax ERROR:', e.message) }
