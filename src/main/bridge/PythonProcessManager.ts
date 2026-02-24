/**
 * Python Process Manager - Python backend sürecini yönetir.
 * Single Responsibility: Sadece Python süreç yaşam döngüsü.
 */

import { ChildProcess, spawn } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

export class PythonProcessManager {
  private process: ChildProcess | null = null
  private pythonPath: string
  private scriptPath: string

  constructor() {
    // Development modunda src_python klasörü kullan
    // Production'da resources altından çalışacak şekilde ayarlanabilir
    if (is.dev) {
      const srcPython = join(app.getAppPath(), 'src_python')
      this.scriptPath = join(srcPython, 'main.py')
      // venv içindeki Python executable'ı kullan
      this.pythonPath =
        process.platform === 'win32'
          ? join(srcPython, 'venv', 'Scripts', 'python.exe')
          : join(srcPython, 'venv', 'bin', 'python')
    } else {
      const srcPython = join(process.resourcesPath, 'src_python')
      this.scriptPath = join(srcPython, 'main.py')
      this.pythonPath =
        process.platform === 'win32'
          ? join(srcPython, 'venv', 'Scripts', 'python.exe')
          : join(srcPython, 'venv', 'bin', 'python')
    }
  }

  /**
   * Python backend sürecini başlat.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.process) {
        console.log('[PythonProcess] Süreç zaten çalışıyor.')
        resolve()
        return
      }

      console.log('[PythonProcess] Python backend başlatılıyor...')
      console.log(`[PythonProcess] Script: ${this.scriptPath}`)

      this.process = spawn(this.pythonPath, ['-u', this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(this.scriptPath, '..'),
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1',
        },
      })

      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString('utf-8').trim()
        if (output) console.log(`[Python] ${output}`)
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString('utf-8').trim()
        if (output) console.error(`[Python:ERR] ${output}`)
      })

      this.process.on('error', (err) => {
        console.error('[PythonProcess] Süreç hatası:', err.message)
        this.process = null
        reject(err)
      })

      this.process.on('close', (code) => {
        console.log(`[PythonProcess] Süreç kapandı, exit code: ${code}`)
        this.process = null
      })

      // Python'un başlaması için kısa bir süre bekle
      setTimeout(() => resolve(), 1500)
    })
  }

  /**
   * Python backend sürecini durdur.
   */
  stop(): void {
    if (this.process) {
      console.log('[PythonProcess] Python backend durduruluyor...')
      this.process.kill('SIGTERM')

      // 5 saniye içinde kapanmazsa zorla kapat
      setTimeout(() => {
        if (this.process) {
          console.log('[PythonProcess] Zorla kapatılıyor...')
          this.process.kill('SIGKILL')
          this.process = null
        }
      }, 5000)
    }
  }

  get isRunning(): boolean {
    return this.process !== null
  }
}
