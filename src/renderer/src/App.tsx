import { useState, useEffect, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import Sidebar from './components/Sidebar'
import ContentTabs from './components/ContentTabs'
import AnalysisFooter from './components/AnalysisFooter'
import FrameExplorer from './components/FrameExplorer'
import type {
  FileEntry,
  AnalysisProgress,
  AIDetection,
  FileColorAnalysis,
} from '../../shared/types'

type AppView = 'upload' | 'analysis' | 'frameExplorer'

const initialProgress: AnalysisProgress = {
  status: 'idle',
  currentFile: '',
  currentFileIndex: 0,
  totalFiles: 0,
  overallPercent: 0,
  filePercent: 0,
}

function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>('upload')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [progress, setProgress] = useState<AnalysisProgress>(initialProgress)
  const [detections, setDetections] = useState<AIDetection[]>([])
  const [colorData, setColorData] = useState<FileColorAnalysis[]>([])
  const [frameExplorerTarget, setFrameExplorerTarget] = useState<{
    fileName: string
    groupIndex: number
  } | null>(null)

  // Listen to events from main process
  useEffect(() => {
    const unsubProgress = window.api.onAnalysisProgress((p) => {
      setProgress(p as AnalysisProgress)
    })

    const unsubDetection = window.api.onAIDetection((d) => {
      setDetections((prev) => [...prev, d as AIDetection])
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

    return () => {
      unsubProgress()
      unsubDetection()
      unsubColor()
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
      if (view === 'upload' && (files.length > 0 || newFiles.length > 0)) {
        // Stay on upload until they click start
      }
    },
    [view, files.length],
  )

  const handleStartAnalysis = useCallback(async () => {
    if (files.length === 0) return

    // Reset previous results
    setDetections([])
    setColorData([])
    setProgress({
      ...initialProgress,
      totalFiles: files.length,
      status: 'analyzing',
    })
    setView('analysis')

    try {
      const result = await window.api.startAnalysis(files)
      if (!result.success) {
        setProgress((prev) => ({
          ...prev,
          status: 'error',
          message: result.error || 'Analiz başlatılamadı',
        }))
      }
    } catch (err) {
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        message: (err as Error).message,
      }))
    }
  }, [files])

  const handleReset = useCallback(() => {
    setView('upload')
    setFiles([])
    setProgress(initialProgress)
    setDetections([])
    setColorData([])
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
          <h1 className="text-lg font-bold text-gray-200">
            🚁 DroneRescueTool
          </h1>
          {files.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {files.length} dosya seçildi
              </span>
              <button
                onClick={handleStartAnalysis}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                🔬 Analiz İşlemine Başla
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
          files={files}
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
        <h1 className="text-lg font-bold text-gray-200">🚁 DroneRescueTool</h1>
        <div className="flex items-center gap-3">
          {progress.status === 'completed' && (
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
          <Sidebar files={files} currentFile={progress.currentFile} />
        </div>

        {/* Content Area - 75% */}
        <div className="w-3/4">
          <ContentTabs
            detections={detections}
            colorData={colorData}
            files={files}
            onViewFrames={handleViewFrames}
          />
        </div>
      </div>

      {/* Footer - Progress */}
      <AnalysisFooter progress={progress} />
    </div>
  )
}

export default App
