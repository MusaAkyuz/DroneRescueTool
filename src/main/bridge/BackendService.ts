/**
 * Backend Service - Python Bridge ve Process Manager'ı birleştirir.
 * Facade pattern: Tek bir arayüz üzerinden backend erişimi sağlar.
 */

import { PythonBridge, WSMessage } from './PythonBridge'
import { PythonProcessManager } from './PythonProcessManager'

export class BackendService {
  private bridge: PythonBridge
  private processManager: PythonProcessManager

  constructor() {
    this.bridge = new PythonBridge()
    this.processManager = new PythonProcessManager()
  }

  /**
   * Python backend'i başlat ve WebSocket bağlantısını kur.
   */
  async initialize(): Promise<void> {
    console.log('[BackendService] Başlatılıyor...')

    // 1. Python sürecini başlat
    await this.processManager.start()

    // 2. WebSocket bağlantısını kur
    this.bridge.connect()

    // 3. Bağlantı olaylarını dinle
    this.bridge.on('connected', async () => {
      console.log('[BackendService] Python backend bağlantısı kuruldu.')
      try {
        const health = await this.bridge.request('health:check')
        console.log(
          '[BackendService] Sağlık kontrolü:',
          JSON.stringify(health.payload),
        )
      } catch (err) {
        console.error('[BackendService] Sağlık kontrolü başarısız:', err)
      }
    })

    this.bridge.on('disconnected', () => {
      console.log('[BackendService] Python backend bağlantısı kesildi.')
    })

    this.bridge.on('error', (err: Error) => {
      console.error('[BackendService] Bridge hatası:', err.message)
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
   * Bağlantı durumu.
   */
  get isConnected(): boolean {
    return this.bridge.isConnected
  }

  /**
   * Backend servisini kapat.
   */
  shutdown(): void {
    console.log('[BackendService] Kapatılıyor...')
    this.bridge.disconnect()
    this.processManager.stop()
  }
}
