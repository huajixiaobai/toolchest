/* 仓库边界自检：只放代码，绝不把游戏素材和第三方源码带进来。
   为什么要有这个：第四十六轮我改 .gitignore 时不小心把它写成了非 UTF-8，
   git 读不出里面的规则（不会报错，只是规则失效），紧接着的 git add -A 就把
   带素材的 local/ 构建（含 2.1MB 图集）和整份 Steamodded 源码扫进了仓库。
   所以这里除了查「该忽略的有没有被跟踪」，还要查「.gitignore 本身是不是合法 UTF-8、关键规则还在不在」。
   用法：node .work/verify/check-repo-boundary.js */
'use strict'
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
let fail = 0
const ok = (name, cond, info) => { console.log((cond ? '  ✓ ' : '  ❌ ') + name + (info ? '  ' + info : '')); if (!cond) fail++ }
const git = (cmd) => execSync('git ' + cmd, { cwd: ROOT, encoding: 'buffer', maxBuffer: 64 << 20 }).toString('utf8')

console.log('仓库边界自检')
console.log('  ' + git('rev-parse --short HEAD').trim() + '  分支 ' + git('rev-parse --abbrev-ref HEAD').trim())

/* ① .gitignore 必须是合法 UTF-8，且关键规则都在（写坏过一次，规则会静默失效） */
const giPath = path.join(ROOT, '.gitignore')
let giOk = true
let giText = ''
try {
  const buf = fs.readFileSync(giPath)
  giText = new TextDecoder('utf-8', { fatal: true }).decode(buf)
} catch (e) { giOk = false }
ok('.gitignore 是合法 UTF-8', giOk, giOk ? '' : '非法编码会让 git 读不出规则（不会报错，只是规则失效）')
if (giOk) {
  const need = ['local/', '.work/third-party/', 'node_modules/', 'Balatro素材图鉴.html']
  const missing = need.filter((r) => giText.indexOf(r) < 0)
  ok('关键忽略规则都在', missing.length === 0, missing.length ? '缺: ' + missing.join(' ') : need.join(' '))
}

/* ② 被跟踪的文件里，不该有任何一个匹配忽略规则 */
const ignoredButTracked = git('ls-files -i -c --exclude-standard').split('\n').map((s) => s.trim()).filter(Boolean)
ok('没有被跟踪的「本该忽略」文件', ignoredButTracked.length === 0, ignoredButTracked.length ? ignoredButTracked.slice(0, 5).join(' / ') + (ignoredButTracked.length > 5 ? ' …共 ' + ignoredButTracked.length : '') : '')

/* ③ 带素材的构建目录与第三方源码目录，一个文件都不许在库里 */
const tracked = git('ls-files').split('\n').map((s) => s.trim()).filter(Boolean)
const forbidden = tracked.filter((f) => /^local\//.test(f) || /^\.work\/third-party\//.test(f))
ok('local/ 与 .work/third-party/ 不在版本库里', forbidden.length === 0, forbidden.length ? forbidden.slice(0, 5).join(' / ') + ' …共 ' + forbidden.length : '')

/* ④ 体积与类型兜底：可疑的素材文件（图形/字体/可执行/压缩包）不该出现，固定测试夹具除外 */
const ASSET = /\.(bin|exe|zip|7z|ttf|otf|ogg|wav|jpg|jpeg|webp|gif)$/i
const ALLOW = [/^\.work\/verify\/astral\//, /^\.work\/verify\/testmod\//, /^\.work\/verify\/testmod\.zip$/, /^\.work\/node_modules\//]
const suspects = tracked.filter((f) => ASSET.test(f) && !ALLOW.some((r) => r.test(f)))
ok('没有可疑的素材/二进制文件', suspects.length === 0, suspects.length ? suspects.slice(0, 5).join(' / ') : '')

/* ⑤ 大文件兜底（>1MB 的非夹具文件都值得看一眼） */
const big = []
for (const f of tracked) {
  if (ALLOW.some((r) => r.test(f))) continue
  try { const st = fs.statSync(path.join(ROOT, f)); if (st.size > 1 << 20) big.push(f + ' (' + (st.size / 1048576).toFixed(1) + ' MB)') } catch (e) { /* 文件不在工作区就跳过 */ }
}
ok('没有被跟踪的大文件（>1MB）', big.length === 0, big.join(' / '))

/* 反证：这套判断必须能对坏样本报错，否则等于没做 */
let selfTest = true
try { new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from([0x23, 0x20, 0xb2, 0xe2, 0xca, 0xd4])) ; selfTest = false } catch (e) { /* 应当抛错 */ }
ok('反证：非法 UTF-8 的样本会被这套判断抓住', selfTest)

console.log(fail ? '\n❌ ' + fail + ' 项没过' : '\n✅ 全部通过（仓库边界干净）')
process.exit(fail ? 1 : 0)
