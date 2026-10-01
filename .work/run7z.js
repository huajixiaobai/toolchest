// Generic 7z-wasm runner: node run7z.js -- <raw 7z args...>
const SevenZip = require('7z-wasm')

const DESKTOP = 'C:/Users/18878/Desktop'
const MOUNT = '/nodefs'

async function main () {
  const argv = process.argv.slice(2)
  const raw = argv[0] === '--' ? argv.slice(1) : argv

  const sz = await SevenZip({ stdout: process.stdout, stderr: process.stderr })
  sz.FS.mkdir(MOUNT)
  sz.FS.mount(sz.NODEFS, { root: DESKTOP }, MOUNT)
  sz.FS.chdir(MOUNT)

  const code = sz.callMain(raw)
  console.log('### 7z exit code:', code)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
