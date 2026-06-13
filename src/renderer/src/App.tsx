import { useState, useEffect, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import Sidebar from './components/Sidebar'
import ContentTabs from './components/ContentTabs'
import AnalysisFooter from './components/AnalysisFooter'
import FrameExplorer from './components/FrameExplorer'
import AnalysisSettingsPopover from './components/AnalysisSettingsPopover'
import type {
  FileEntry,
  FileColorAnalysis,
  DetectionGroup,
  DetectionProgress,
  ColorProgress,
  AnalysisSettings,
  BackendStatus,
} from '../../shared/types'
import { DEFAULT_ANALYSIS_SETTINGS } from '../../shared/types'

type AppView = 'upload' | 'analysis' | 'frameExplorer'

function PythonStatusBadge({
  status,
}: {
  status: BackendStatus
}): React.JSX.Element {
  const config: Record<
    BackendStatus['state'],
    { color: string; dot: string; label: string }
  > = {
    starting: {
      color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      dot: 'bg-yellow-400 animate-pulse',
      label: 'Python başlatılıyor',
    },
    connected: {
      color: 'bg-green-500/10 text-green-300 border-green-500/30',
      dot: 'bg-green-400',
      label: 'Python bağlı',
    },
    disconnected: {
      color: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      dot: 'bg-orange-400 animate-pulse',
      label: 'Yeniden bağlanılıyor',
    },
    error: {
      color: 'bg-red-500/10 text-red-300 border-red-500/30',
      dot: 'bg-red-400',
      label: 'Python hatası',
    },
  }
  const c = config[status.state]
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${c.color}`}
      title={status.message || c.label}
    >
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      <span>{c.label}</span>
    </div>
  )
}

const initialDetectionProgress: DetectionProgress = {
  status: 'idle',
  currentFile: '',
  currentFileIndex: 0,
  totalFiles: 0,
  overallPercent: 0,
  filePercent: 0,
  currentFrame: 0,
  totalFrames: 0,
}

const initialColorProgress: ColorProgress = {
  status: 'idle',
  overallPercent: 0,
}

function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>('upload')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [colorData, setColorData] = useState<FileColorAnalysis[]>([])
  const [detectionGroups, setDetectionGroups] = useState<DetectionGroup[]>([])
  const [detectionProgress, setDetectionProgress] = useState<DetectionProgress>(
    initialDetectionProgress,
  )
  const [colorProgress, setColorProgress] =
    useState<ColorProgress>(initialColorProgress)
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(
    DEFAULT_ANALYSIS_SETTINGS,
  )
  const [frameExplorerTarget, setFrameExplorerTarget] = useState<{
    fileName: string
    groupIndex: number
  } | null>(null)
  const [pythonStatus, setPythonStatus] = useState<BackendStatus>({
    state: 'starting',
    connected: false,
    message: 'Python backend başlatılıyor...',
  })

  // Listen to events from main process
  useEffect(() => {
    // Initial status fetch
    window.api
      .getPythonStatus()
      .then((s) => setPythonStatus(s))
      .catch(() => {})

    const unsubStatus = window.api.onPythonStatus((s) => {
      setPythonStatus(s as BackendStatus)
    })

    const unsubColor = window.api.onColorAnalysis((c) => {
      const analysis = c as FileColorAnalysis
      setColorData((prev) => {
        const idx = prev.findIndex((x) => x.fileName === analysis.fileName)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = analysis
          return updated
        }
        return [...prev, analysis]
      })
    })

    const unsubDetProgress = window.api.onDetectionProgress((p) => {
      setDetectionProgress(p as DetectionProgress)
    })

    const unsubDetGroup = window.api.onDetectionGroup((g) => {
      setDetectionGroups((prev) => [...prev, g as DetectionGroup])
    })

    const unsubColorProgress = window.api.onColorProgress((p) => {
      setColorProgress(p as ColorProgress)
    })

    return () => {
      unsubColor()
      unsubDetProgress()
      unsubDetGroup()
      unsubColorProgress()
      unsubStatus()
    }
  }, [])

  const handleFilesSelected = useCallback(
    (newFiles: FileEntry[]) => {
      // Merge, avoid duplicates by path
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.path))
        const unique = newFiles.filter((f) => !existing.has(f.path))
        return [...prev, ...unique]
      })
    },
    [view, files.length],
  )

  const handleStartAnalysis = useCallback(async () => {
    if (files.length === 0) return
    if (!pythonStatus.connected) {
      // Bağlı değilse başlatma
      return
    }

    // Reset previous results
    setColorData([])
    setDetectionGroups([])
    setDetectionProgress({
      ...initialDetectionProgress,
      totalFiles: files.length,
      status: 'analyzing',
    })
    setColorProgress({
      status: 'analyzing',
      overallPercent: 0,
    })
    setView('analysis')

    // Start unified detection (YOLO + color in single pass)
    try {
      const result = await window.api.startDetection(files, analysisSettings)
      if (!result.success) {
        setDetectionProgress((prev) => ({
          ...prev,
          status: 'error',
          message: result.error || 'Tespit başlatılamadı',
        }))
      }
    } catch (err) {
      setDetectionProgress((prev) => ({
        ...prev,
        status: 'error',
        message: (err as Error).message,
      }))
    }
  }, [files, analysisSettings, pythonStatus.connected])

  const handleReset = useCallback(() => {
    setView('upload')
    setFiles([])
    setColorData([])
    setDetectionGroups([])
    setDetectionProgress(initialDetectionProgress)
    setColorProgress(initialColorProgress)
  }, [])

  const handleViewFrames = useCallback(
    (fileName: string, groupIndex: number) => {
      setFrameExplorerTarget({ fileName, groupIndex })
      setView('frameExplorer')
    },
    [],
  )

  const handleBackFromFrameExplorer = useCallback(() => {
    setView('analysis')
    setFrameExplorerTarget(null)
  }, [])

  // Upload View
  if (view === 'upload') {
    return (
      <div className="flex h-screen w-screen flex-col bg-gray-950">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-200">🚁 KARAKURT</h1>
            <PythonStatusBadge status={pythonStatus} />
          </div>
          {files.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {files.length} dosya seçildi
              </span>
              <AnalysisSettingsPopover
                settings={analysisSettings}
                onSettingsChange={setAnalysisSettings}
              />
              <button
                onClick={handleStartAnalysis}
                disabled={!pythonStatus.connected}
                title={
                  pythonStatus.connected
                    ? 'Analizi başlat'
                    : pythonStatus.message ||
                      'Python backend bağlı değil, lütfen bekleyin...'
                }
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                {pythonStatus.connected
                  ? '🔬 Analiz İşlemine Başla'
                  : '⏳ Python başlatılıyor...'}
              </button>
            </div>
          )}
        </header>

        {/* File Upload */}
        <div className="flex-1">
          <FileUpload onFilesSelected={handleFilesSelected} />
        </div>

        {/* Selected files preview */}
        {files.length > 0 && (
          <div className="border-t border-gray-800 bg-gray-900/60 px-6 py-3">
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div
                  key={`${file.path}-${i}`}
                  className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300"
                >
                  <span>{file.type === 'video' ? '🎬' : '🖼️'}</span>
                  <span className="max-w-32 truncate">{file.name}</span>
                  <button
                    className="ml-1 text-gray-500 transition-colors hover:text-red-400"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Frame Explorer View
  if (view === 'frameExplorer' && frameExplorerTarget) {
    return (
      <div className="flex h-screen w-screen flex-col bg-gray-950">
        <FrameExplorer
          colorData={colorData}
          fileName={frameExplorerTarget.fileName}
          groupIndex={frameExplorerTarget.groupIndex}
          onBack={handleBackFromFrameExplorer}
        />
      </div>
    )
  }

  // Analysis View
  return (
    <div className="flex h-screen w-screen flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-200">🚁 KARAKURT</h1>
          <PythonStatusBadge status={pythonStatus} />
        </div>
        <div className="flex items-center gap-3">
          {detectionProgress.status === 'completed' && (
            <button
              onClick={handleReset}
              className="rounded-lg bg-gray-700 px-4 py-1.5 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600"
            >
              ↩ Yeni Analiz
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - 25% */}
        <div className="w-1/4 min-w-48">
          <Sidebar files={files} currentFile={detectionProgress.currentFile} />
        </div>

        {/* Content Area - 75% */}
        <div className="w-3/4">
          <ContentTabs
            colorData={colorData}
            detectionGroups={detectionGroups}
            detectionProgress={detectionProgress}
            onViewFrames={handleViewFrames}
          />
        </div>
      </div>

      {/* Footer - Progress */}
      <AnalysisFooter
        detectionProgress={detectionProgress}
        colorProgress={colorProgress}
      />
    </div>
  )
}

export default App
