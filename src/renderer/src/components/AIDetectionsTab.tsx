import { useState, useCallback } from 'react'
import type { AIDetection, FileEntry } from '../../../shared/types'
import VideoPreviewModal from './VideoPreviewModal'

interface AIDetectionsTabProps {
  detections: AIDetection[]
  files: FileEntry[]
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export default function AIDetectionsTab({
  detections,
  files,
}: AIDetectionsTabProps): React.JSX.Element {
  const [selectedDetection, setSelectedDetection] =
    useState<AIDetection | null>(null)

  const handleDetectionClick = useCallback(
    (detection: AIDetection) => {
      // Find the file path: prefer filePath from detection, fallback to files lookup
      const filePath =
        detection.filePath ||
        files.find((f) => f.name === detection.fileName)?.path
      if (filePath) {
        setSelectedDetection(detection)
      }
    },
    [files],
  )

  const getFilePath = useCallback(
    (detection: AIDetection): string => {
      return (
        detection.filePath ||
        files.find((f) => f.name === detection.fileName)?.path ||
        ''
      )
    },
    [files],
  )

  const getFileType = useCallback(
    (detection: AIDetection): 'video' | 'image' => {
      const file = files.find((f) => f.name === detection.fileName)
      return file?.type || 'video'
    },
    [files],
  )

  if (detections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-4xl">🔍</div>
          <p className="text-gray-400">Henüz tespit yok</p>
          <p className="mt-1 text-sm text-gray-500">
            Analiz başlatıldığında AI tespitleri burada görünecek
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-300">
          Toplam Tespit: {detections.length}
        </h4>
      </div>

      <div className="space-y-2">
        {detections.map((detection) => (
          <div
            key={detection.id}
            onClick={() => handleDetectionClick(detection)}
            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800/60 p-3 transition-all hover:border-blue-500/50 hover:bg-gray-800 hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                    {detection.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    %{(detection.confidence * 100).toFixed(1)}
                  </span>
                  {detection.bbox && (
                    <span
                      className="text-xs text-blue-400"
                      title="Tıkla ve önizle"
                    >
                      ▶ Önizle
                    </span>
                  )}
                </div>
                <p
                  className="mt-1 truncate text-xs text-gray-400"
                  title={detection.fileName}
                >
                  📄 {detection.fileName}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="text-green-400">
                    {formatTime(detection.startTime)}
                  </span>
                  <span>→</span>
                  <span className="text-orange-400">
                    {formatTime(detection.endTime)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Süre: {(detection.endTime - detection.startTime).toFixed(1)}s
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video/Image Preview Modal */}
      {selectedDetection && (
        <VideoPreviewModal
          detection={selectedDetection}
          filePath={getFilePath(selectedDetection)}
          fileType={getFileType(selectedDetection)}
          onClose={() => setSelectedDetection(null)}
        />
      )}
    </div>
  )
}
