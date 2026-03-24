import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
} from 'electron'
import { join, extname, basename } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { BackendService } from './bridge'

// Python backend servisi
const backendService = new BackendService()

// Allowed file extensions
const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mov',
  '.mkv',
  '.webm',
  '.flv',
]
const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.bmp',
  '.tiff',
  '.webp',
]
const ALLOWED_EXTENSIONS = [
  ...ALLOWED_VIDEO_EXTENSIONS,
  ...ALLOWED_IMAGE_EXTENSIONS,
]

// Register custom protocol for serving local media files to renderer
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-media',
    privileges: {
      stream: true,
      supportFetchAPI: true,
      bypassCSP: true,
    },
  },
])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Local media protocol handler - serves local files for video/image preview
  protocol.handle('local-media', (request) => {
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')
    if (!filePath) {
      return new Response('Missing path parameter', { status: 400 })
    }
    return net.fetch(pathToFileURL(filePath).toString(), {
      headers: request.headers,
    })
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // ─── File Selection ───
  ipcMain.handle('drone:select-files', async () => {
    if (!mainWindow) return []
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Dosya Seçin',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Medya Dosyaları',
          extensions: ALLOWED_EXTENSIONS.map((e) => e.slice(1)), // remove leading dot
        },
        {
          name: 'Video',
          extensions: ALLOWED_VIDEO_EXTENSIONS.map((e) => e.slice(1)),
        },
        {
          name: 'Resim',
          extensions: ALLOWED_IMAGE_EXTENSIONS.map((e) => e.slice(1)),
        },
      ],
    })

    if (result.canceled) return []

    return result.filePaths.map((filePath) => {
      const ext = extname(filePath).toLowerCase()
      return {
        path: filePath,
        name: basename(filePath),
        extension: ext,
        type: ALLOWED_VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image',
      }
    })
  })

  // ─── Start Analysis ───
  ipcMain.handle(
    'drone:start-analysis',
    async (
      _event,
      files: { path: string; name: string; extension: string; type: string }[],
    ) => {
      try {
        const filePaths = files.map((f) => ({
          path: f.path,
          name: f.name,
          extension: f.extension,
          type: f.type,
        }))
        const response = await backendService.request('analysis:start', {
          files: filePaths,
        })
        return { success: true, data: response }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  )

  // ─── Forward Python events to renderer ───
  backendService.onMessage((message) => {
    if (!mainWindow) return

    if (message.type === 'analysis:progress') {
      mainWindow.webContents.send('drone:analysis-progress', message.payload)
    } else if (message.type === 'analysis:detection') {
      mainWindow.webContents.send('drone:ai-detection', message.payload)
    } else if (message.type === 'analysis:color') {
      mainWindow.webContents.send('drone:color-analysis', message.payload)
    }
  })

  // IPC: Renderer'dan Python backend'e mesaj gönderme
  ipcMain.handle(
    'python:request',
    async (_event, type: string, payload: Record<string, unknown> = {}) => {
      try {
        const response = await backendService.request(type, payload)
        return { success: true, data: response }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  )

  ipcMain.handle('python:status', () => {
    return { connected: backendService.isConnected }
  })

  // Python backend'i başlat
  backendService.initialize().catch((err) => {
    console.error('Python backend başlatılamadı:', err)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Uygulama kapanırken Python backend'i kapat
app.on('before-quit', () => {
  backendService.shutdown()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
