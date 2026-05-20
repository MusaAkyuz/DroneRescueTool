/**
 * Backend Service - Python Bridge ve Process Manager'ı birleştirir.
 * Facade pattern: Tek bir arayüz üzerinden backend erişimi sağlar.
 */

import { EventEmitter } from 'events'
import { PythonBridge, WSMessage } from './PythonBridge'
import { PythonProcessManager } from './PythonProcessManager'
import { logger } from '../logger'

export type BackendStatusState =
  | 'starting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface BackendStatus {
  state: BackendStatusState
  connected: boolean
  message?: string
  logPath?: string
}

export class BackendService extends EventEmitter {
  private bridge: PythonBridge
  private processManager: PythonProcessManager
  private currentStatus: BackendStatus = {
    state: 'starting',
    connected: false,
    message: 'Python backend başlatılıyor...',
  }

  constructor() {
    super()
    this.bridge = new PythonBridge()
    this.processManager = new PythonProcessManager()
  }

  private setStatus(next: Partial<BackendStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...next }
    this.emit('status', this.currentStatus)
  }

  getStatus(): BackendStatus {
    return this.currentStatus
  }

  onStatus(callback: (status: BackendStatus) => void): void {
    this.on('status', callback)
  }

  /**
   * Python backend'i başlat ve WebSocket bağlantısını kur.
   */
  async initialize(): Promise<void> {
    logger.info('BackendService', 'Başlatılıyor...')
    this.setStatus({
      state: 'starting',
      connected: false,
      message: 'Python backend başlatılıyor...',
      logPath: this.processManager.getLogPath(),
    })

    // Python süreç olaylarını dinle
    this.processManager.on('exit', (code: number, message?: string) => {
      this.setStatus({
        state: 'error',
        connected: false,
        message:
          message ||
          `Python backend beklenmedik şekilde kapandı (exit ${code}).`,
      })
    })

    // 1. Python sürecini başlat
    try {
      await this.processManager.start()
    } catch (err) {
      this.setStatus({
        state: 'error',
        connected: false,
        message: `Python backend başlatılamadı: ${(err as Error).message}`,
      })
      throw err
    }

    // 2. WebSocket bağlantısını kur
    this.bridge.connect()

    // 3. Bağlantı olaylarını dinle
    this.bridge.on('connected', async () => {
      logger.info('BackendService', 'Python backend bağlantısı kuruldu.')
      this.setStatus({
        state: 'connected',
        connected: true,
        message: 'Python backend bağlı.',
      })
      try {
        const health = await this.bridge.request('health:check')
        logger.info('BackendService', 'Sağlık kontrolü:', JSON.stringify(health.payload))
      } catch (err) {
        logger.error('BackendService', 'Sağlık kontrolü başarısız:', (err as Error).message)
      }
    })

    this.bridge.on('disconnected', () => {
      logger.warn('BackendService', 'Python backend bağlantısı kesildi.')
      // Eğer süreç hala çalışıyorsa "starting" durumunda kalır (yeniden bağlanma deneniyor)
      if (this.currentStatus.state !== 'error') {
        this.setStatus({
          state: 'disconnected',
          connected: false,
          message: 'Python backend ile bağlantı kesildi, yeniden deneniyor...',
        })
      }
    })

    this.bridge.on('error', (err: Error) => {
      logger.error('BackendService', 'Bridge hatası:', err.message)
    })
  }

  /**
   * Python backend'e mesaj gönder ve yanıt al.
   */
  async request(
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<WSMessage> {
    return this.bridge.request(type, payload)
  }

  /**
   * Python backend'e mesaj gönder (fire-and-forget).
   */
  send(type: string, payload: Record<string, unknown> = {}): boolean {
    return this.bridge.send(type, payload)
  }

  /**
   * Python backend'den gelen push mesajlarını dinle.
   * Analiz sırasında Python'dan gelen progress, detection, color eventleri için.
   */
  onMessage(callback: (message: WSMessage) => void): void {
    this.bridge.on('message', callback)
  }

  /**
   * Bağlantı durumu.
   */
  get isConnected(): boolean {
    return this.bridge.isConnected
  }

  /**
   * Backend servisini kapat.
   */
  shutdown(): void {
    logger.info('BackendService', 'Kapatılıyor...')
    this.bridge.disconnect()
    this.processManager.stop()
  }
}
