/* 把游戏本地化文件里"我们自己漏掉的名字"补回 data.json。
 *
 * 为什么需要：databuild 只从 G.P_CENTER_POOLS / 贴图清单里取 name，
 * 于是下面几类素材的名字一直是英文（甚至是我们自己编的 id）：
 *   - 补充包 p_arcana_normal_1 …（真实名字在 misc 表的 p_arcana_normal 等键上）
 *   - 蜡封 seal_Gold …（真实键是 gold_seal / red_seal / blue_seal / purple_seal）
 *   - 贴纸 sticker_eternal / perishable / rental（键同名）
 *   - 联动牌 collab_TW_Jack …（真实名字在 misc.collabs[花色][序号]，键只是缩写）
 * 这些都是"游戏自己翻译过的"，不补白不补。
 *
 * 规则（保守，绝不覆盖游戏的真实翻译）：
 *   只有在 当前值缺失 或 当前值 == 英文名 时，才用本地化表里的名字覆盖；
 *   且新名字必须和英文名不同。
 *   联动牌例外：现在的值是我们拼的 "collab_TW — Jack of Spades"，一定替换。
 *
 * 用法：node .work/gen-names.js            # 直接改写 .work/out/data.json
 *       node .work/gen-names.js --check    # 只报告，不写
 */
const fs = require('fs');
const path = require('path');

const CHECK = process.argv.includes('--check');
const WORK = __dirname;
const ROOT = path.resolve(WORK, '..');
const DATA = path.join(WORK, 'out', 'data.json');
const LOCDIR = path.join(WORK, 'love', 'localization');
const LANGS = ['en-us', 'zh_CN', 'zh_TW', 'ja', 'ko'];
const RANKS = { Jack: 'J', Queen: 'Q', King: 'K', Ace: 'A', 10: '10', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9' };

function readLocale(lang) {
  var p = path.join(LOCDIR, lang + '.lua');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

/* key = { name = "…" } —— 名字基本都在表的第一行，最多往下看 3 行 */
function extractItemNames(txt) {
  var out = {};
  if (!txt) return out;
  var lines = txt.split(/\r?\n/);
  var re = /^\s*(?:\[["']?([A-Za-z_][A-Za-z0-9_]*)["']?\]|([A-Za-z_][A-Za-z0-9_]*))\s*=\s*\{\s*$/;
  var reName = /^\s*name\s*=\s*"((?:[^"\\]|\\.)*)"/;
  for (var i = 0; i < lines.length; i++) {
    var m = re.exec(lines[i]);
    if (!m) continue;
    var key = m[1] || m[2];
    for (var k = i + 1; k <= i + 3 && k < lines.length; k++) {
      var n = reName.exec(lines[k]);
      if (n) { out[key] = n[1].replace(/\\"/g, '"'); break; }
      if (/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*/.test(lines[k]) && !/^\s*name\s*=/.test(lines[k])) break;
    }
  }
  return out;
}

/* misc.collabs = { Spades = { ["1"]="默认", ["2"]="巫师", … }, … } */
function extractCollabs(txt) {
  var out = {};
  if (!txt) return out;
  /* collabs 表可能出现多次（注释 / ml_ 前缀的键），逐个窗口尝试直到凑齐花色 */
  var head = /(?:^|[^A-Za-z_])collabs\s*=\s*\{/g, h;
  while ((h = head.exec(txt))) {
    var seg = txt.slice(h.index + h[0].length, h.index + h[0].length + 4000);
    var suitRe = /\[?["']?([A-Za-z]+)["']?\]?\s*=\s*\{/g, m;
    var order = [];
    while ((m = suitRe.exec(seg))) order.push({ suit: m[1], at: m.index + m[0].length });
    for (var i = 0; i < order.length; i++) {
      var end = i + 1 < order.length ? order[i + 1].at : seg.length;
      var body = seg.slice(order[i].at, end);
      var map = {}, re = /\[["']?(\d+)["']?\]\s*=\s*"((?:[^"\\]|\\.)*)"/g, x;
      while ((x = re.exec(body))) map[x[1]] = x[2].replace(/\\"/g, '"');
      if (Object.keys(map).length && !out[order[i].suit]) out[order[i].suit] = map;
    }
    if (Object.keys(out).length >= 4) break;
  }
  return out;
}

/* suits_plural = { Clubs="梅花", … } */
function extractSuits(txt) {
  var out = {};
  if (!txt) return out;
  var at = txt.indexOf('suits_plural');
  if (at < 0) return out;
  var seg = txt.slice(at, at + 400);
  var re = /(Clubs|Diamonds|Hearts|Spades)\s*=\s*"((?:[^"\\]|\\.)*)"/g, m;
  while ((m = re.exec(seg))) out[m[1]] = m[2];
  return out;
}

function hasCJK(s) { return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uF900-\uFAFF]/.test(String(s || '')); }

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const loc = {};
LANGS.forEach(function (l) {
  var txt = readLocale(l);
  loc[l] = { names: extractItemNames(txt), collabs: extractCollabs(txt), suits: extractSuits(txt), file: !!txt };
});

/* 联动牌键 -> 花色内序号（本地化表里 2..7 对应我们数据里该花色出现的顺序） */
const collabKeys = {};
data.items.forEach(function (it) {
  if (!it.raw || !it.raw.collab) return;
  var s = it.raw.suit;
  (collabKeys[s] = collabKeys[s] || []);
  if (collabKeys[s].indexOf(it.raw.collab) < 0) collabKeys[s].push(it.raw.collab);
});
const collabName = {};   /* lang -> { collabKey: name } */
LANGS.forEach(function (l) {
  var tbl = loc[l].collabs, out = {};
  Object.keys(collabKeys).forEach(function (suit) {
    /* 序号 1 永远是"默认"占位（各语言写法不同：默认/默認/Default/デフォルト/기본），按序号剔除最稳妥 */
    var entries = tbl[suit] ? Object.keys(tbl[suit]).map(Number).sort(function (a, b) { return a - b; }).filter(function (n) { return n > 1; }) : [];
    var keys = collabKeys[suit];
    if (!entries.length || entries.length !== keys.length) return;
    entries.forEach(function (n, i) { out[keys[i]] = tbl[suit][String(n)]; });
  });
  collabName[l] = out;
});

/* 补充包 / 蜡封 / 贴纸 的 id -> 本地化键 */
function locKeyFor(id) {
  if (/^p_/.test(id)) return id.replace(/_\d+$/, '');
  var m = /^seal_([A-Za-z]+)$/.exec(id);
  if (m) return m[1].toLowerCase() + '_seal';
  var s = /^sticker_([A-Za-z]+)$/.exec(id);
  if (s) {
    var w = s[1];
    if (w === w.toLowerCase()) return w;                                  /* sticker_eternal -> eternal */
    if (/^(White|Red|Green|Black|Blue|Purple|Orange|Gold)$/.test(w)) return 'stake_' + w.toLowerCase();   /* 注数贴纸 */
    return null;
  }
  if (id === 'soul') return 'c_soul';
  return null;
}

const report = { byCat: {}, changed: [], skipped: [] };
data.items.forEach(function (it) {
  var en = (it.i18n && it.i18n['en-us']) || it.name || '';
  var isCollab = !!(it.raw && it.raw.collab);
  LANGS.forEach(function (lang) {
    var L = loc[lang];
    if (!L.file) return;
    var cur = it.i18n ? it.i18n[lang] : undefined;
    var next = null;

    if (isCollab) {
      var base = collabName[lang][it.raw.collab];
      if (base) {
        var suit = L.suits[it.raw.suit] || it.raw.suit;
        var rank = RANKS[it.raw.rank] || it.raw.rank;
        next = base + ' · ' + suit + rank;
      }
    } else {
      var key = locKeyFor(it.id) || it.key || it.id;
      var cand = L.names[key];
      /* 键名直接命中的普通素材（j_ / c_ / v_ / b_ / tag_…） */
      if (!cand && it.key && L.names[it.key]) cand = L.names[it.key];
      if (cand && cand !== en && (!cur || cur === en || !hasCJK(cur) === false)) {
        if (!cur || cur === en) next = cand;
      }
    }

    if (next && next !== cur) {
      it.i18n = it.i18n || {};
      it.i18n[lang] = next;
      if (!CHECK) it.name = it.i18n['en-us'] || it.name;
      report.changed.push({ id: it.id, lang: lang, from: cur, to: next });
    }
  });
});

/* 手工补两类游戏本身没有名字的条目 */
const MANUAL = {
  c_base: { 'en-us': 'Default Base', zh_CN: '默认牌面底框', zh_TW: '預設牌面底框', ja: '既定のカード本体', ko: '기본 카드 본체' },
};
const RANK_NUM = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
var manualChanged = 0;
data.items.forEach(function (it) {
  if (MANUAL[it.id]) {
    it.i18n = it.i18n || {};
    LANGS.forEach(function (l) { if (MANUAL[it.id][l] && it.i18n[l] !== MANUAL[it.id][l]) { it.i18n[l] = MANUAL[it.id][l]; manualChanged++; } });
    return;
  }
  /* 扑克牌在游戏里"牌面就是名字"，这里合成 红桃2 / スペードJ 这类可搜索的名字 */
  if (it.cat !== 'PlayingCard') return;
  var m = /_([A-Za-z0-9]+)$/.exec(it.id);
  if (!m || !it.raw || !it.raw.suit) return;
  var rk = RANK_NUM[m[1]] || m[1];
  it.i18n = it.i18n || {};
  LANGS.forEach(function (l) {
    var suit = loc[l].suits[it.raw.suit];
    if (suit && !it.i18n[l]) { it.i18n[l] = suit + rk; manualChanged++; }
  });
});

/* 统计：每种语言里仍等于英文名的条目 */
const remain = {};
LANGS.forEach(function (lang) {
  remain[lang] = data.items.filter(function (it) {
    var v = it.i18n && it.i18n[lang];
    return !v || v === it.i18n['en-us'];
  }).length;
});

console.log('localization: ' + LANGS.map(function (l) { return l + (loc[l].file ? '(' + Object.keys(loc[l].names).length + '名)' : '(缺)'); }).join(' '));
console.log('collabs 映射: ' + LANGS.map(function (l) { return l + '=' + Object.keys(collabName[l]).length; }).join(' ') + '  (花色键: ' + JSON.stringify(collabKeys) + ')');
console.log('改动 ' + report.changed.length + ' 条，样本:');
report.changed.slice(0, 14).forEach(function (c) { console.log('  [' + c.lang + '] ' + c.id + ': ' + JSON.stringify(c.from) + ' -> ' + JSON.stringify(c.to)); });
console.log('仍等于英文名的条目数: ' + JSON.stringify(remain));
if (!CHECK) {
  fs.writeFileSync(DATA, JSON.stringify(data));
  console.log('已写入 ' + DATA);
} else {
  console.log('(--check 模式，未写入)');
}
