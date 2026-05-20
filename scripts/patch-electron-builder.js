/**
 * Patches electron-builder to tolerate 7-Zip exit code 2 (sub-items errors)
 * during archive extraction. This fixes the winCodeSign extraction failure
 * on Windows when symbolic links cannot be created (requires Developer Mode
 * or admin privileges).
 *
 * Exit code 2 from 7-Zip means some items had non-critical errors (like
 * failing to create macOS symlinks on Windows), but all needed files
 * were extracted successfully.
 */

const fs = require('fs')
const path = require('path')

const utilPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'builder-util',
  'out',
  'util.js',
)

if (!fs.existsSync(utilPath)) {
  console.log('builder-util not found, skipping patch')
  process.exit(0)
}

const content = fs.readFileSync(utilPath, 'utf8')

const oldCode = `handleProcess("close", childProcess, command, resolve, error => {
                if (error instanceof ExecError && error.exitCode === 2) {
                    error.alreadyLogged = true;
                }
                reject(error);
            });`

const newCode = `handleProcess("close", childProcess, command, resolve, error => {
                if (error instanceof ExecError && error.exitCode === 2) {
                    error.alreadyLogged = true;
                    resolve("");
                    return;
                }
                reject(error);
            });`

if (content.includes(newCode)) {
  console.log('electron-builder 7z patch already applied')
  process.exit(0)
}

if (!content.includes(oldCode)) {
  console.log(
    'electron-builder 7z patch target not found (version mismatch?), skipping',
  )
  process.exit(0)
}

fs.writeFileSync(utilPath, content.replace(oldCode, newCode), 'utf8')
console.log('electron-builder 7z symlink patch applied successfully')
