import { ElectronAPI } from '@electron-toolkit/preload'
import type { DroneAPI } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: DroneAPI
  }
}
