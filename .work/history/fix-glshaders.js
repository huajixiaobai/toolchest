/* Fix the translator: the integer-literal pass was rewriting the `#if 0` I used to disable
   LÖVE's vertex block (floats are illegal in preprocessor conditions). Use an undefined macro
   name instead, and skip vertex-only shaders that have no effect(). */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'glshaders.js')
let s = fs.readFileSync(F, 'utf8')
let fails = 0
function rep (from, to, label) {
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL ' + label + ' (' + n + ')'); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

rep(`    // our own vertex stage replaces LÖVE's
    s = s.replace(/#ifdef\\s+VERTEX\\b/g, '#if 0')
    s = s.replace(/defined\\s*\\(\\s*VERTEX\\s*\\)/g, '0')`,
  `    // Our own vertex stage replaces LÖVE's. The guard must not contain a numeric literal:
    // the int→float pass below would turn \`#if 0\` into the illegal \`#if 0.\`.
    s = s.replace(/#ifdef\\s+VERTEX\\b/g, '#if defined(DSH_NO_VERTEX)')
    s = s.replace(/defined\\s*\\(\\s*VERTEX\\s*\\)/g, 'defined(DSH_NO_VERTEX)')`,
  'vertex guard')

rep(`  function buildFragment (src, isGL2) {
    let body = repair(src)`,
  `  /** Two of the game's shaders are vertex-only (the tilt effect) and cannot be used as a
   *  fragment stage — they have no effect(). */
  const hasEffect = (src) => /\\bvec4\\s+effect\\s*\\(/.test(src)

  function buildFragment (src, isGL2) {
    let body = repair(src)`,
  'hasEffect helper')

rep(`  function compile (gl, isGL2, src, vertexSource) {
    const fs = gl.createShader(gl.FRAGMENT_SHADER)`,
  `  function compile (gl, isGL2, src, vertexSource) {
    if (!hasEffect(src)) return { program: null, log: 'not a fragment shader (no effect())', vertexOnly: true }
    const fs = gl.createShader(gl.FRAGMENT_SHADER)`,
  'compile guard')

rep(`  window.__GLSHADERS__ = { repair, buildFragment, buildVertex, uniformNames, flavourUniform, compile, selftest, COMMON_UNIFORMS }`,
  `  window.__GLSHADERS__ = { repair, buildFragment, buildVertex, uniformNames, flavourUniform, hasEffect, compile, selftest, COMMON_UNIFORMS }`,
  'export hasEffect')

fs.writeFileSync(F, s)
console.log(fails ? 'FAILURES' : 'done')
