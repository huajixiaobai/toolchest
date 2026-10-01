/* Wire the shader compiler test in properly: extract Cryptid's .fs files to JSON in Node,
   inject them, and compile both sets in the page. */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

/* ---- 1) extract the mod shaders once ---- */
const zip = path.join(process.env.USERPROFILE, 'Desktop', 'Cryptid.zip')
const buf = fs.readFileSync(zip)
let eocd = -1
for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
const cdSize = buf.readUInt32LE(eocd + 12); const cdOffset = buf.readUInt32LE(eocd + 16)
const base = eocd - cdSize - cdOffset
const out = []
let p = eocd - cdSize
while (p < eocd - 4 && buf.readUInt32LE(p) === 0x02014b50) {
  const method = buf.readUInt16LE(p + 10); const csize = buf.readUInt32LE(p + 20)
  const nlen = buf.readUInt16LE(p + 28); const elen = buf.readUInt16LE(p + 30); const clen = buf.readUInt16LE(p + 32)
  const lho = buf.readUInt32LE(p + 42)
  const name = buf.toString('utf8', p + 46, p + 46 + nlen)
  p += 46 + nlen + elen + clen
  if (!name.endsWith('.fs')) continue
  const lnlen = buf.readUInt16LE(base + lho + 26); const lelen = buf.readUInt16LE(base + lho + 28)
  const start = base + lho + 30 + lnlen + lelen
  const raw = buf.subarray(start, start + csize)
  out.push({ name: name.split('/').pop(), source: (method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw)).toString('utf8') })
}
fs.writeFileSync(path.join(__dirname, 'mod-shaders.json'), JSON.stringify(out))
console.log('extracted', out.length, 'mod shaders ->', 'verify/mod-shaders.json')

/* ---- 2) the scenario ---- */
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
if (s.includes('shaderCompile: `')) { console.log('scenario already present'); process.exit(0) }
const SCENARIO = `
  shaderCompile: \`(async()=>{
    const B = window.__BALATRO__;
    const G = window.__GLSHADERS__;
    if (!G) return { fatal: 'window.__GLSHADERS__ missing' };
    const r = {};
    const gl2 = document.createElement('canvas').getContext('webgl2');
    const gl = gl2 || document.createElement('canvas').getContext('webgl');
    r.webgl2 = !!gl2;
    r.vanilla = G.selftest(gl, !!gl2, B.data.shaders.map((x) => ({ name: x.name, source: x.source })));
    r.vanillaFail = r.vanilla.results.filter((x) => !x.ok).map((x) => x.name + ' :: ' + x.log.replace(/\\s+/g, ' ').slice(0, 150));
    const mod = window.__MODSHADERS__ || [];
    r.modCount = mod.length;
    r.mod = G.selftest(gl, !!gl2, mod);
    r.modFail = r.mod.results.filter((x) => !x.ok).map((x) => x.name + ' :: ' + x.log.replace(/\\s+/g, ' ').slice(0, 200));
    r.flavour = mod.map((m) => m.name + '→' + String(G.flavourUniform(m.source)));
    return r })()\`,
`
const anchor = /\n\}\n\nasync function main \(\) \{/
if (!anchor.test(s)) { console.log('FAIL anchor'); process.exit(1) }
s = s.replace(anchor, SCENARIO + '}\n\nasync function main () {')
/* the hook: modCryptid already resolves srcZip; add a generic injection for shaderCompile */
s = s.replace(`    try {
    if (name === 'modPicker') {`,
  `    try {
    if (name === 'shaderCompile') {
      const payload = fs.readFileSync(path.join(__dirname, 'mod-shaders.json'), 'utf8')
      await c.eval('window.__MODSHADERS__ = ' + payload + ';')
    }
    if (name === 'modPicker') {`)
fs.writeFileSync(F, s)
new Function(s)
console.log('ok, syntax OK')
