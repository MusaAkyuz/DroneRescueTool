/**
 * Python Backend Build Script
 * PyInstaller ile Python backend'i derler.
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const SRC_PYTHON = path.join(ROOT, 'src_python')
const DIST_PYTHON = path.join(ROOT, 'dist_python')

console.log('========================================')
console.log('  Python Backend Derleniyor (PyInstaller)')
console.log('========================================')

// PyInstaller yolunu belirle
const pyinstaller =
  process.platform === 'win32'
    ? path.join(SRC_PYTHON, 'venv', 'Scripts', 'pyinstaller.exe')
    : path.join(SRC_PYTHON, 'venv', 'bin', 'pyinstaller')

if (!fs.existsSync(pyinstaller)) {
  console.error('HATA: PyInstaller bulunamadi!')
  console.error('Lutfen venv icine kurun:')
  console.error('  cd src_python && venv\\Scripts\\pip install pyinstaller')
  process.exit(1)
}

// Önceki build'i temizle
if (fs.existsSync(DIST_PYTHON)) {
  console.log('Onceki build temizleniyor...')
  fs.rmSync(DIST_PYTHON, { recursive: true })
}

// PyInstaller spec/build temp dosyalarını temizle
const buildTemp = path.join(SRC_PYTHON, 'build')
const specFile = path.join(SRC_PYTHON, 'python_backend.spec')
if (fs.existsSync(buildTemp)) {
  fs.rmSync(buildTemp, { recursive: true })
}
if (fs.existsSync(specFile)) {
  fs.unlinkSync(specFile)
}

// PyInstaller komutunu çalıştır
const cmd = [
  `"${pyinstaller}"`,
  '--noconfirm',
  '--clean',
  '--onedir',
  `--distpath "${DIST_PYTHON}"`,
  '--name python_backend',
  '--hidden-import=websockets',
  '--hidden-import=websockets.legacy',
  '--hidden-import=websockets.legacy.server',
  '--hidden-import=cv2',
  '--hidden-import=numpy',
  '--hidden-import=ultralytics',
  '--collect-all=ultralytics',
  'main.py',
].join(' ')

console.log(`\nCalistiriliyor:\n  ${cmd}\n`)

try {
  execSync(cmd, {
    cwd: SRC_PYTHON,
    stdio: 'inherit',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  })
} catch (err) {
  console.error('HATA: PyInstaller basarisiz oldu!')
  process.exit(1)
}

// Sonucu doğrula
const exeName =
  process.platform === 'win32' ? 'python_backend.exe' : 'python_backend'
const exePath = path.join(DIST_PYTHON, 'python_backend', exeName)

if (!fs.existsSync(exePath)) {
  console.error(`HATA: Derlenmis exe bulunamadi: ${exePath}`)
  process.exit(1)
}

console.log('\n========================================')
console.log('  Python Backend Derleme BASARILI')
console.log(`  Cikti: ${path.join(DIST_PYTHON, 'python_backend')}`)
console.log('========================================')
