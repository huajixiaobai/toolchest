// Extract the outer 7z (and then the fused LOVE exe / .love zip) using 7z-wasm + NODEFS.
const SevenZip = require('7z-wasm')

const DESKTOP = 'C:/Users/18878/Desktop'
const ROOT = DESKTOP + '/BalatroAssetViewer'
const MOUNT = '/nodefs'

async function main () {
  const args = process.argv.slice(2)
  const target = args[0]
  const outDir = args[1]

  const sz = await SevenZip({
    stdout: process.stdout,
    stderr: process.stderr,
  })

  sz.FS.mkdir(MOUNT)
  sz.FS.mount(sz.NODEFS, { root: DESKTOP }, MOUNT)
  sz.FS.chdir(MOUNT)

  const emTarget = MOUNT + '/' + target
  const emOut = MOUNT + '/' + outDir

  const code = sz.callMain(['x', emTarget, '-o' + emOut, '-y', '-bso0', '-bsp0'])
  console.log('### 7z exit code:', code)
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
