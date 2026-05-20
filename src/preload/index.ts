import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer - DroneRescueTool specific
const api = {
  selectFiles: () => ipcRenderer.invoke('drone:select-files'),
  startDetection: (
    files: { path: string; name: string; extension: string; type: string }[],
    settings?: {
      yoloInterval?: number
      colorInterval?: number
      confidence?: number
    },
  ) => ipcRenderer.invoke('drone:start-detection', files, settings),
  onDetectionProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown): void =>
      callback(progress)
    ipcRenderer.on('drone:detection-progress', handler)
    return (): void => {
      ipcRenderer.removeListener('drone:detection-progress', handler)
    }
  },
  onDetectionGroup: (callback: (group: unknown) => void) => {
    const handler = (_event: unknown, group: unknown): void => callback(group)
    ipcRenderer.on('drone:detection-group', handler)
    return (): void => {
      ipcRenderer.removeListener('drone:detection-group', handler)
    }
  },
  onColorProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown): void =>
      callback(progress)
    ipcRenderer.on('drone:color-progress', handler)
    return (): void => {
      ipcRenderer.removeListener('drone:color-progress', handler)
    }
  },
  onColorAnalysis: (callback: (analysis: unknown) => void) => {
    const handler = (_event: unknown, analysis: unknown): void =>
      callback(analysis)
    ipcRenderer.on('drone:color-analysis', handler)
    return (): void => {
      ipcRenderer.removeListener('drone:color-analysis', handler)
    }
  },
  getPythonStatus: () => ipcRenderer.invoke('python:status'),
  onPythonStatus: (callback: (status: unknown) => void) => {
    const handler = (_event: unknown, status: unknown): void => callback(status)
    ipcRenderer.on('drone:python-status', handler)
    return (): void => {
      ipcRenderer.removeListener('drone:python-status', handler)
    }
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
