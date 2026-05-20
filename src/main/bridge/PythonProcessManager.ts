/**
 * Python Process Manager - Python backend sürecini yönetir.
 * Single Responsibility: Sadece Python süreç yaşam döngüsü.
 */

import { ChildProcess, spawn } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, WriteStream } from 'fs'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { EventEmitter } from 'events'
import { logger } from '../logger'

export class PythonProcessManager extends EventEmitter {
  private process: ChildProcess | null = null
  private exePath: string
  private exeArgs: string[]
  private cwd: string
  private logStream: WriteStream | null = null
  private lastError: string | null = null

  constructor() {
    super()
    if (is.dev) {
      // Development: venv içindeki Python ile script çalıştır
      const srcPython = join(app.getAppPath(), 'src_python')
      const scriptPath = join(srcPython, 'main.py')
      this.exePath =
        process.platform === 'win32'
          ? join(srcPython, 'venv', 'Scripts', 'python.exe')
          : join(srcPython, 'venv', 'bin', 'python')
      this.exeArgs = ['-u', scriptPath]
      this.cwd = srcPython
    } else {
      // Production: PyInstaller ile derlenmiş exe
      const pythonBackendDir = join(process.resourcesPath, 'python_backend')
      this.exePath =
        process.platform === 'win32'
          ? join(pythonBackendDir, 'python_backend.exe')
          : join(pythonBackendDir, 'python_backend')
      this.exeArgs = []
      this.cwd = pythonBackendDir
    }
  }

  /**
   * Üretim modunda log dosyasını aç (userData/python-backend.log).
   */
  private openLogFile(): void {
    try {
      const userData = app.getPath('userData')
      if (!existsSync(userData)) mkdirSync(userData, { recursive: true })
      const logPath = join(userData, 'python-backend.log')
      this.logStream = createWriteStream(logPath, { flags: 'a' })
      this.logStream.write(
        `\n===== ${new Date().toISOString()} Python backend starting =====\n` +
          `exe: ${this.exePath}\ncwd: ${this.cwd}\n` +
          `exeExists: ${existsSync(this.exePath)}\n\n`,
      )
    } catch (err) {
      logger.error('PythonProcess', 'Log dosyası açılamadı:', (err as Error).message)
    }
  }

  getLastError(): string | null {
    return this.lastError
  }

  getLogPath(): string {
    return join(app.getPath('userData'), 'python-backend.log')
  }

  /**
   * Python backend sürecini başlat.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.process) {
        logger.info('PythonProcess', 'Süreç zaten çalışıyor.')
        resolve()
        return
      }

      if (!is.dev) {
        this.openLogFile()
      }

      logger.info('PythonProcess', 'Python backend başlatılıyor...')
      logger.info('PythonProcess', `Exe: ${this.exePath}`)
      logger.info('PythonProcess', `CWD: ${this.cwd}`)
      logger.info('PythonProcess', `Exe var mı: ${existsSync(this.exePath)}`)
      this.logStream?.write(`[start] spawn ${this.exePath}\n`)

      if (!existsSync(this.exePath)) {
        const msg = `Python backend exe bulunamadı: ${this.exePath}`
        logger.error('PythonProcess', msg)
        this.lastError = msg
        this.logStream?.write(`[error] ${msg}\n`)
        this.emit('exit', -1, msg)
        reject(new Error(msg))
        return
      }

      try {
        this.process = spawn(this.exePath, this.exeArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: this.cwd,
          windowsHide: true,
          env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1',
            MOCK_DATA_ENABLED: process.env.MOCK_DATA_ENABLED || '0',
          },
        })
      } catch (err) {
        const msg = (err as Error).message
        logger.error('PythonProcess', 'spawn hatası:', msg)
        this.lastError = msg
        this.logStream?.write(`[spawn-error] ${msg}\n`)
        this.emit('exit', -1, msg)
        reject(err as Error)
        return
      }

      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString('utf-8')
        const trimmed = output.trim()
        if (trimmed) logger.info('Python', trimmed)
        this.logStream?.write(`[stdout] ${output}`)
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString('utf-8')
        const trimmed = output.trim()
        if (trimmed) logger.error('Python:ERR', trimmed)
        this.logStream?.write(`[stderr] ${output}`)
        // Sadece bilgi: error olabilir ama Python ölmediyse fatal değil
        this.lastError = trimmed.slice(-500) || this.lastError
      })

      this.process.on('error', (err) => {
        logger.error('PythonProcess', 'Sürec hatası:', err.message)
        this.lastError = err.message
        this.logStream?.write(`[error] ${err.message}\n`)
        this.process = null
        this.emit('exit', -1, err.message)
        reject(err)
      })

      this.process.on('close', (code) => {
        logger.info('PythonProcess', `Sürec kapandı, exit code: ${code}`)
        this.logStream?.write(`[close] exit=${code}\n`)
        this.process = null
        this.emit('exit', code ?? -1, this.lastError ?? undefined)
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
      logger.info('PythonProcess', 'Python backend durduruluyor...')
      this.process.kill('SIGTERM')

      // 5 saniye içinde kapanmazsa zorla kapat
      setTimeout(() => {
        if (this.process) {
          logger.warn('PythonProcess', 'Zorla kapatılıyor...')
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
