/**
 * File-based Logger - Uygulama başlatma ve çalışma zamanı loglarını dosyaya yazar.
 * Paketlenmiş uygulamada console.log görünmediği için tüm loglar dosyaya yazılır.
 * Log dosyası: %APPDATA%/drone-rescue-tool/app.log
 */

import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, WriteStream } from 'fs'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

class Logger {
  private stream: WriteStream | null = null
  private logPath: string = ''
  private initialized = false

  /**
   * Logger'ı başlat. app.getPath kullanılabilir olduktan sonra çağrılmalı.
   */
  init(): void {
    if (this.initialized) return

    try {
      const userData = app.getPath('userData')
      if (!existsSync(userData)) mkdirSync(userData, { recursive: true })

      this.logPath = join(userData, 'app.log')
      this.stream = createWriteStream(this.logPath, { flags: 'a' })

      this.initialized = true

      this.stream.write(
        `\n${'='.repeat(60)}\n` +
          `  App Starting - ${new Date().toISOString()}\n` +
          `  Version: ${app.getVersion()}\n` +
          `  Electron: ${process.versions.electron}\n` +
          `  Chrome: ${process.versions.chrome}\n` +
          `  Node: ${process.versions.node}\n` +
          `  Platform: ${process.platform} ${process.arch}\n` +
          `  AppPath: ${app.getAppPath()}\n` +
          `  UserData: ${userData}\n` +
          `  ResourcesPath: ${process.resourcesPath}\n` +
          `  ExecPath: ${process.execPath}\n` +
          `  CWD: ${process.cwd()}\n` +
          `  Args: ${process.argv.join(' ')}\n` +
          `${'='.repeat(60)}\n`,
      )

      // Yakalanmamış hataları logla
      process.on('uncaughtException', (err) => {
        this.error('UncaughtException', err.stack || err.message)
      })

      process.on('unhandledRejection', (reason) => {
        this.error('UnhandledRejection', String(reason))
      })
    } catch (err) {
      // Logger init bile başarısız olursa, en azından stderr'e yaz
      console.error('[Logger] Init failed:', err)
    }
  }

  private write(level: LogLevel, tag: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString()
    const message = args
      .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join(' ')
    const line = `[${timestamp}] [${level}] [${tag}] ${message}\n`

    // Her zaman console'a da yaz (dev modda görünür)
    if (level === 'ERROR') {
      console.error(line.trimEnd())
    } else if (level === 'WARN') {
      console.warn(line.trimEnd())
    } else {
      console.log(line.trimEnd())
    }

    // Dosyaya yaz
    if (this.stream) {
      this.stream.write(line)
    }
  }

  info(tag: string, ...args: unknown[]): void {
    this.write('INFO', tag, ...args)
  }

  warn(tag: string, ...args: unknown[]): void {
    this.write('WARN', tag, ...args)
  }

  error(tag: string, ...args: unknown[]): void {
    this.write('ERROR', tag, ...args)
  }

  debug(tag: string, ...args: unknown[]): void {
    this.write('DEBUG', tag, ...args)
  }

  getLogPath(): string {
    return this.logPath
  }
}

export const logger = new Logger()
