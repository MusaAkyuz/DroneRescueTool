import type { DetectionProgress, ColorProgress } from '../../../shared/types'

interface AnalysisFooterProps {
  detectionProgress: DetectionProgress
  colorProgress: ColorProgress
}

export default function AnalysisFooter({
  detectionProgress,
  colorProgress,
}: AnalysisFooterProps): React.JSX.Element {
  const bothIdle =
    detectionProgress.status === 'idle' && colorProgress.status === 'idle'
  const bothCompleted =
    detectionProgress.status === 'completed' &&
    colorProgress.status === 'completed'
  const anyError =
    detectionProgress.status === 'error' || colorProgress.status === 'error'

  // Overall = average of both
  const overallPercent =
    (detectionProgress.overallPercent + colorProgress.overallPercent) / 2

  if (bothIdle) {
    return (
      <footer className="flex h-10 items-center border-t border-gray-700 bg-gray-900/90 px-4">
        <span className="text-xs text-gray-500">Analiz bekliyor...</span>
      </footer>
    )
  }

  if (bothCompleted) {
    return (
      <footer className="flex h-14 items-center border-t border-green-800 bg-green-900/30 px-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span className="text-sm font-medium text-green-400">
              Analiz Tamamlandı!
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {detectionProgress.totalFiles} dosya işlendi
          </span>
        </div>
      </footer>
    )
  }

  if (anyError) {
    const errorMsg =
      detectionProgress.message || colorProgress.message || 'Bilinmeyen hata'
    return (
      <footer className="flex h-14 items-center border-t border-red-800 bg-red-900/30 px-4">
        <div className="flex w-full items-center gap-2">
          <span className="text-lg">❌</span>
          <span className="text-sm text-red-400">Hata: {errorMsg}</span>
        </div>
      </footer>
    )
  }

  // Analyzing state
  return (
    <footer className="border-t border-gray-700 bg-gray-900/90 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Current file info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-300">
              <span className="text-gray-500">Dosya:</span>{' '}
              {detectionProgress.currentFile}
            </p>
            <p className="text-xs text-gray-500">
              Frame {detectionProgress.currentFrame}/
              {detectionProgress.totalFrames}
            </p>
          </div>
        </div>

        {/* Center: YOLO progress */}
        <div className="mx-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">🎯 YOLO:</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-300"
              style={{ width: `${detectionProgress.filePercent}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-xs text-purple-400">
            %{detectionProgress.filePercent.toFixed(0)}
          </span>
        </div>

        {/* Center-right: Color progress */}
        <div className="mx-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">🎨 Renk:</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${colorProgress.overallPercent}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-xs text-cyan-400">
            %{colorProgress.overallPercent.toFixed(0)}
          </span>
        </div>

        {/* Right: Overall progress */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Genel:</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-xs text-blue-400">
            %{overallPercent.toFixed(0)}
          </span>
        </div>
      </div>
    </footer>
  )
}
