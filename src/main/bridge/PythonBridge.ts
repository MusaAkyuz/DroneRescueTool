/**
 * WebSocket İstemci - Python backend ile haberleşme.
 * Single Responsibility: Sadece WebSocket bağlantı yönetimi.
 */

import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { logger } from '../logger'

export interface WSMessage {
  type: string
  payload?: Record<string, unknown>
  id?: string
}

export interface PythonBridgeEvents {
  connected: () => void
  disconnected: () => void
  error: (error: Error) => void
  message: (message: WSMessage) => void
}

export class PythonBridge extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: WSMessage) => void
      reject: (reason: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()

  private requestCounter = 0

  constructor(host = 'localhost', port = 8765, reconnectInterval = 3000) {
    super()
    this.url = `ws://${host}:${port}`
    this.reconnectInterval = reconnectInterval
  }

  /**
   * Python backend'e bağlan.
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    this.shouldReconnect = true

    try {
      this.ws = new WebSocket(this.url)

      this.ws.on('open', () => {
        logger.info('PythonBridge', 'Bağlantı kuruldu:', this.url)
        this.emit('connected')
      })

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString())

          // Pending request varsa resolve et
          if (message.id && this.pendingRequests.has(message.id)) {
            const pending = this.pendingRequests.get(message.id)!
            clearTimeout(pending.timer)
            this.pendingRequests.delete(message.id)
            pending.resolve(message)
          }

          this.emit('message', message)
        } catch (err) {
          logger.error('PythonBridge', 'Mesaj parse hatası:', (err as Error).message)
        }
      })

      this.ws.on('close', () => {
        logger.info('PythonBridge', 'Bağlantı kapandı.')
        this.ws = null
        this.emit('disconnected')
        this.scheduleReconnect()
      })

      this.ws.on('error', (err: Error) => {
        logger.error('PythonBridge', 'WebSocket hatası:', err.message)
        this.emit('error', err)
      })
    } catch (err) {
      logger.error('PythonBridge', 'Bağlantı oluşturma hatası:', (err as Error).message)
      this.scheduleReconnect()
    }
  }

  /**
   * Python backend'e mesaj gönder (fire-and-forget).
   */
  send(type: string, payload: Record<string, unknown> = {}): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('PythonBridge', 'Bağlantı yok, mesaj gönderilemedi.')
      return false
    }

    const message: WSMessage = { type, payload }
    this.ws.send(JSON.stringify(message))
    return true
  }

  /**
   * Python backend'e mesaj gönder ve yanıt bekle (request-response).
   */
  request(
    type: string,
    payload: Record<string, unknown> = {},
    timeout = 30000,
  ): Promise<WSMessage> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Python backend bağlantısı yok.'))
        return
      }

      const id = `req_${++this.requestCounter}_${Date.now()}`

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`İstek zaman aşımına uğradı: ${type} (${timeout}ms)`))
      }, timeout)

      this.pendingRequests.set(id, { resolve, reject, timer })

      const message: WSMessage = { type, payload, id }
      this.ws.send(JSON.stringify(message))
    })
  }

  /**
   * Bağlantıyı kapat.
   */
  disconnect(): void {
    this.shouldReconnect = false

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Pending requestleri temizle
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Bağlantı kapatıldı.'))
    }
    this.pendingRequests.clear()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    logger.info('PythonBridge', 'Bağlantı kapatıldı.')
  }

  /**
   * Bağlantı durumu.
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      logger.info('PythonBridge', 'Yeniden bağlanılıyor...')
      this.connect()
    }, this.reconnectInterval)
  }
}
