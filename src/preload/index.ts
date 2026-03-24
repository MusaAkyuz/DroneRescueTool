import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer - DroneRescueTool specific
const api = {
  selectFiles: () => ipcRenderer.invoke('drone:select-files'),
  startAnalysis: (
    files: { path: string; name: string; extension: string; type: string }[],
  ) => ipcRenderer.invoke('drone:start-analysis', files),
  onAnalysisProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown): void =>
      callback(progress)
    ipcRenderer.on('drone:analysis-progress', handler)
    return (): void => {
      ipcRenderer.removeListener('drone:analysis-progress', handler)
    }
  },
  onAIDetection: (callback: (detection: unknown) => void) => {
    const handler = (_event: unknown, detection: unknown): void =>
      callback(detection)
    ipcRenderer.on('drone:ai-detection', handler)
    return (): void => {
      ipcRenderer.removeListener('drone:ai-detection', handler)
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
