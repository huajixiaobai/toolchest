/* 1) the live preview must honour the speed multiplier, like the exported animation does.
   2) find the animation's real loop point: seed candidates from the frequencies the shader
      source contains, then verify each one numerically. */
'use strict'
const fs = require('fs')
const F = require('path').join(__dirname, 'app.js')
let s = fs.readFileSync(F, 'utf8')
const NL = s.includes('\r\n') ? '\r\n' : '\n'
let fails = 0
function rep (from, to, label) {
  from = from.split('\n').join(NL); to = to.split('\n').join(NL)
  const n = s.split(from).length - 1
  if (n !== 1) { console.log('FAIL [' + label + '] ' + n); fails++; return }
  s = s.replace(from, to); console.log('ok   ' + label)
}

/* --- speed in the live preview --- */
rep(`    const dt = Math.min(0.06, (ts - animLast) / 1000);
    animLast = ts;
    S.anim.t += dt;`,
  `    const dt = Math.min(0.06, (ts - animLast) / 1000);
    animLast = ts;
    // the preview runs at the same multiplier the export uses, so the speed selector is visible
    S.anim.t += dt * (S.anim.speed || 1);`,
  'preview speed')

rep(`  anim: { on: false, t: 0, speed: 4, seconds: 2.5, pingpong: true, fps: 20 },`,
  `  anim: { on: false, t: 0, speed: 4, seconds: 2.5, pingpong: true, fps: 20, loop: 'auto' },`,
  'loop mode state')

/* --- loop detection --- */
rep(`/** Current animation settings, shared by the forge and the detail panel. */
const animOpts = () => ({ fps: S.anim.fps, speed: S.anim.speed, seconds: S.anim.seconds, pingpong: S.anim.pingpong });`,
  `/* ------------------------------------------------------------ loop finding
 * Game effects are sums of sines driven by G.TIMERS.REAL, so a card really does repeat —
 * but only after the least common multiple of every term's period, which the source gives us:
 * a term like cos(t/53.1532) has period 2π·53.1532. Those are astronomically long on their own,
 * so the candidates are used as *hints* and each one is verified by rendering.
 * ------------------------------------------------------------------------- */
const TWO_PI = Math.PI * 2;

/** Candidate periods (seconds) suggested by the shader sources a spec uses. */
function sourcePeriodHints (src) {
  const out = [];
  // cos(t/53.1532) / sin(-t / 143.634) — a divisor under a trig term is a period in radians
  for (const m of src.matchAll(/(?:sin|cos)\\s*\\(\\s*[-+]?\\s*[A-Za-z_][\\w.]*\\s*\\/\\s*([\\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.01) out.push(TWO_PI * v);
  }
  // uPhase.x*2.612 style: uPhase.x is REAL/28, so the angular rate is k/28
  for (const m of src.matchAll(/u?Phase\\.x\\s*\\*\\s*([\\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.0001) out.push(TWO_PI * 28 / v);
  }
  for (const m of src.matchAll(/(?:uPhase|time|hologram\\.g|foil\\.y|holo\\.y)\\.y\\s*\\*\\s*([\\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.0001) out.push(TWO_PI / v);
  }
  return out;
}
/** Periods the floating-art animation itself uses (Card:draw soul_pos branch). */
const SOUL_PERIODS = [TWO_PI / 1.8, TWO_PI / 1.219];

/** Which shader programs this spec actually runs. */
function specShaderKeys (spec) {
  const keys = new Set();
  if (!spec) return keys;
  if (spec.setShader) keys.add(spec.setShader);
  if (spec.edition && spec.edition !== 'e_negative') keys.add(EDITION_SHADER[spec.edition] || spec.edition);
  if (spec.edition === 'e_negative') { keys.add('negative'); keys.add('negative_shine'); }
  if (spec.soul) keys.add(spec.soulHologram ? 'hologram' : 'dissolve');
  for (const st of (spec.stickers || (spec.sticker ? [spec.sticker] : []))) keys.add('voucher');
  if (spec.seal === 'Gold') keys.add('voucher');
  return keys;
}
function shaderSourceOf (key) {
  if (MOD_SHADERS[key]) return MOD_SHADERS[key];
  const sh = D.shaders.find((x) => x.name === key);
  return sh ? sh.source : '';
}
/** Mean disagreement between the animation at t and at t + period. */
function loopError (spec, period, samples) {
  let sum = 0;
  for (const t of samples) sum += frameDiff(compose(spec, 1, t), compose(spec, 1, t + period));
  return sum / samples.length;
}
const periodCache = new Map();
const specKey = (spec) => JSON.stringify([spec.center, spec.front, spec.edition, spec.setShader, spec.soul, spec.soulHologram, spec.stickers, spec.sticker, spec.seal]);

/**
 * Smallest period at which the card visibly repeats, or null when none is found within
 * \`maxSeconds\`. Candidates come from the shader source; each is verified by rendering.
 */
function detectPeriod (spec, maxSeconds) {
  maxSeconds = maxSeconds || 40;
  const ck = specKey(spec);
  if (periodCache.has(ck)) return periodCache.get(ck);
  let best = null;
  try {
    const hints = new Set();
    for (const k of specShaderKeys(spec)) {
      if (k === 'dissolve') continue;
      for (const p of sourcePeriodHints(shaderSourceOf(k))) hints.add(p);
    }
    if (spec.soul) for (const p of SOUL_PERIODS) hints.add(p);
    if (!hints.size) { periodCache.set(ck, null); return null }
    // a period may be any multiple of the base frequencies
    const cands = new Set();
    for (const p of hints) {
      if (!(p > 0.05)) continue;
      for (let n = 1; n <= 12; n++) {
        const v = p * n;
        if (v <= maxSeconds) cands.add(Math.round(v * 1000) / 1000);
      }
    }
    const list = [...cands].sort((a, b) => a - b).slice(0, 60);
    const samples = [0, 0.37, 1.11];
    for (const p of list) {
      if (loopError(spec, p, samples) < 0.0016) { best = p; break }
    }
  } catch (e) { best = null }
  periodCache.set(ck, best);
  return best;
}

/** Current animation settings, shared by the forge and the detail panel. */
function animOpts (spec) {
  const base = { fps: S.anim.fps, speed: S.anim.speed, seconds: S.anim.seconds, pingpong: S.anim.pingpong };
  const mode = S.anim.loop || 'auto';
  if (mode === 'forward') { base.pingpong = false; return base }
  if (mode === 'pingpong') { base.pingpong = true; return base }
  // auto: use the detected loop when there is one, so the export repeats exactly
  if (!spec) return base;
  const p = detectPeriod(spec);
  if (p) {
    base.pingpong = false;
    base.period = p;
    base.seconds = Math.max(0.4, Math.min(30, p / (base.speed || 1)));
    base.autoPeriod = p;
  }
  return base;
}`,
  'loop detection')

rep(`function loopSeamRatio (frames) {
  if (frames.length < 3) return null;`,
  `function loopSeamRatio (frames) {
  if (!frames || frames.length < 3) return null;`,
  'seam guard')

/* call sites that have a spec */
rep(`      const f = buildAnimFrames(spec, 1, animOpts());`,
  `      const f = buildAnimFrames(spec, 1, animOpts(spec));`,
  'forge anim info')
rep(`const r = buildAnimFrames(spec, 2, Object.assign(animOpts(), { fps: fps || S.anim.fps, seconds: seconds || S.anim.seconds }));`,
  `const r = buildAnimFrames(spec, 2, Object.assign(animOpts(spec), { fps: fps || S.anim.fps, seconds: seconds || S.anim.seconds }));`,
  'renderAnim')
rep(`  const m = loopSeamRatio(buildAnimFrames(specForItem(it), 1, animOpts()).frames);`,
  `  const m = loopSeamRatio(buildAnimFrames(specForItem(it), 1, animOpts(specForItem(it))).frames);`,
  'hasAnim seam')
rep(`      const r = buildAnimFrames(forgeSpec(), 2, { speed: S.anim.speed, seconds: S.anim.seconds, pingpong: S.anim.pingpong });`,
  `      const r = buildAnimFrames(forgeSpec(), 2, animOpts(forgeSpec()));`,
  'forge export')

fs.writeFileSync(F, s)
new Function(s)
console.log(fails ? 'FAILURES ' + fails : 'done, syntax OK')
