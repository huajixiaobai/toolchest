/* Better mobile-forge metric: measure the pinned bar, then check every option group can actually
   be reached and tapped at its own scroll position. */
'use strict'
const fs = require('fs')
const path = require('path')
const F = path.join(__dirname, 'cdp.js')
let s = fs.readFileSync(F, 'utf8')
const start = s.indexOf('\n  forgePhone: `')
const end = s.indexOf('\n}\n\nasync function main () {', start)
if (start < 0 || end < 0) { console.log('FAIL locate'); process.exit(1) }
const SCENARIO = `
  forgePhone: \`(async()=>{
    const B = window.__BALATRO__;
    const r = {};
    await __V.wait(1600);
    B.state.tab='forge'; B.state.forge.open=null; B.render();
    await __V.wait(2600);
    const content = document.getElementById('content');
    const rect = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), h: Math.round(b.height) } };
    r.viewport = { w: innerWidth, h: innerHeight };
    r.display = getComputedStyle(document.querySelector('.forge')).display;
    r.bar = Object.assign(rect(document.querySelector('.pvtop')), { pos: getComputedStyle(document.querySelector('.pvtop')).position });
    r.barShare = +(r.bar.h / innerHeight).toFixed(2);
    r.canvas = rect(document.querySelector('.preview canvas'));
    r.opts = rect(document.querySelector('.forge .opts'));
    r.scrollHeight = content.scrollHeight;

    /* order in the DOM flow: the three heavy sections must come after the options on a phone */
    const order = [].slice.call(document.querySelectorAll('.forge .pvtop, .forge .opts, .forge .preview > .opt'))
      .map((e) => (e.dataset.gkey || e.className.split(' ')[0]) + '#' + getComputedStyle(e).order);
    r.visualOrder = order;

    /* every option group must be reachable: scroll its header under the bar and tap-test it */
    const groups = [].slice.call(document.querySelectorAll('#content .opts .opt'));
    const reach = [];
    for (const g of groups) {
      const barH = document.querySelector('.pvtop').getBoundingClientRect().height;
      const top = g.getBoundingClientRect().top + content.scrollTop - barH - 8;
      content.scrollTop = Math.max(0, top);
      await __V.wait(140);
      const h = g.querySelector('h4');
      const b = h.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(b.left + 24), Math.round(b.top + b.height / 2));
      reach.push({ g: g.dataset.gkey, y: Math.round(b.top), ok: !!(hit && h.contains(hit)) });
    }
    r.reachable = reach;
    r.unreachable = reach.filter((x) => !x.ok).map((x) => x.g);
    r.maxScroll = Math.round(content.scrollTop);

    /* the last option group must still be usable near the bottom */
    content.scrollTop = content.scrollHeight;
    await __V.wait(300);
    const last = groups[groups.length - 1].querySelector('h4');
    const lb = last.getBoundingClientRect();
    const lhit = document.elementFromPoint(Math.round(lb.left + 24), Math.round(lb.top + lb.height / 2));
    r.lastGroup = { key: groups[groups.length - 1].dataset.gkey, y: Math.round(lb.top), clickable: !!(lhit && last.contains(lhit)) };

    /* the three heavy sections must be below the options */
    const sec = ['summary', 'export', 'anim'].map((k) => ({ k, ...rect(document.querySelector('#content .opt[data-gkey="' + k + '"]')) }));
    r.heavySections = sec;
    r.heavyBelowOpts = sec.every((x) => x.t >= r.opts.t - 2);

    /* tapping the bar zooms the preview instead of breaking anything */
    const bar = document.querySelector('.pvtop');
    const before = Math.round(document.querySelector('.preview canvas').getBoundingClientRect().width);
    bar.click(); await __V.wait(500);
    r.zoom = { before, after: Math.round(document.querySelector('.preview canvas').getBoundingClientRect().width) };
    bar.click(); await __V.wait(400);

    content.scrollTop = 0;
    await __V.wait(300);
    r.blank = __V.blank();
    return r })()\`,
`
s = s.slice(0, start) + SCENARIO + s.slice(end + 1)
fs.writeFileSync(F, s)
new Function(s)
console.log('replaced, syntax OK')
