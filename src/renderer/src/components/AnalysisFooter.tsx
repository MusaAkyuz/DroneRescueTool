import type { AnalysisProgress } from '../../../shared/types'

interface AnalysisFooterProps {
  progress: AnalysisProgress
}

export default function AnalysisFooter({
  progress,
}: AnalysisFooterProps): React.JSX.Element {
  if (progress.status === 'idle') {
    return (
      <footer className="flex h-10 items-center border-t border-gray-700 bg-gray-900/90 px-4">
        <span className="text-xs text-gray-500">Analiz bekliyor...</span>
      </footer>
    )
  }

  if (progress.status === 'completed') {
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
            {progress.totalFiles} dosya işlendi
          </span>
        </div>
      </footer>
    )
  }

  if (progress.status === 'error') {
    return (
      <footer className="flex h-14 items-center border-t border-red-800 bg-red-900/30 px-4">
        <div className="flex w-full items-center gap-2">
          <span className="text-lg">❌</span>
          <span className="text-sm text-red-400">
            Hata: {progress.message || 'Bilinmeyen hata'}
          </span>
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
              {progress.currentFile}
            </p>
            <p className="text-xs text-gray-500">
              {progress.currentFileIndex + 1} / {progress.totalFiles}
            </p>
          </div>
        </div>

        {/* Center: File progress */}
        <div className="mx-4 flex items-center gap-3">
          <span className="text-xs text-gray-500">Dosya:</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progress.filePercent}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-xs text-cyan-400">
            %{progress.filePercent.toFixed(0)}
          </span>
        </div>

        {/* Right: Overall progress */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Genel:</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.overallPercent}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-xs text-blue-400">
            %{progress.overallPercent.toFixed(0)}
          </span>
        </div>
      </div>
    </footer>
  )
}
