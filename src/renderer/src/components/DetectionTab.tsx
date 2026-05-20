import { useState, useCallback } from 'react'
import type { DetectionGroup, DetectionProgress } from '../../../shared/types'
import DetectionPreview from './DetectionPreview'

interface DetectionTabProps {
  groups: DetectionGroup[]
  progress: DetectionProgress
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export default function DetectionTab({
  groups,
  progress,
}: DetectionTabProps): React.JSX.Element {
  const [selectedGroup, setSelectedGroup] = useState<DetectionGroup | null>(
    null,
  )

  const handleGroupClick = useCallback((group: DetectionGroup) => {
    setSelectedGroup(group)
  }, [])

  // Tespit henüz başlamadı
  if (progress.status === 'idle' && groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <p className="text-gray-400">AI Nesne Tespiti</p>
          <p className="mt-1 text-sm text-gray-500">
            Analiz başlatıldığında YOLO tespitleri burada görünecek
          </p>
        </div>
      </div>
    )
  }

  // Analiz sürüyor
  const isDetecting = progress.status === 'analyzing'

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Progress Bar */}
      {isDetecting && (
        <div className="border-b border-gray-700 bg-gray-900/80 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {progress.currentFile && (
                <>
                  📄 {progress.currentFile} — Frame {progress.currentFrame}/
                  {progress.totalFrames}
                </>
              )}
            </span>
            <span className="font-mono text-blue-400">
              %{progress.overallPercent.toFixed(1)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-linear-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progress.overallPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {progress.status === 'error' && (
        <div className="border-b border-red-800/50 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">
            ❌ {progress.message || 'Tespit sırasında hata oluştu'}
          </p>
        </div>
      )}

      {/* Groups Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <h4 className="text-sm font-semibold text-gray-300">
          Tespit Grupları: {groups.length}
        </h4>
        {progress.status === 'completed' && (
          <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
            ✓ Tamamlandı
          </span>
        )}
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto p-4">
        {groups.length === 0 && isDetecting && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-gray-500">
              Tespitler analiz ediliyor...
            </p>
          </div>
        )}

        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => handleGroupClick(group)}
              className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800/60 p-3 transition-all hover:border-purple-500/50 hover:bg-gray-800 hover:shadow-[0_0_12px_rgba(147,51,234,0.15)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                      {group.frameCount} frame
                    </span>
                    {/* Unique labels */}
                    {_getUniqueLabels(group).map((label) => (
                      <span
                        key={label}
                        className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
                      >
                        {label}
                      </span>
                    ))}
                    <span className="text-xs text-blue-400">▶ Önizle</span>
                  </div>
                  <p
                    className="mt-1 truncate text-xs text-gray-400"
                    title={group.fileName}
                  >
                    📄 {group.fileName}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="text-green-400">
                      {formatTime(group.startTime)}
                    </span>
                    <span>→</span>
                    <span className="text-orange-400">
                      {formatTime(group.endTime)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Süre: {(group.endTime - group.startTime).toFixed(1)}s
                  </p>
                </div>
              </div>

              {/* Mini thumbnail strip */}
              {group.frames.length > 0 && (
                <div className="mt-2 flex gap-1 overflow-hidden">
                  {group.frames.slice(0, 6).map((frame) => (
                    <div
                      key={frame.frameIndex}
                      className="h-10 w-16 shrink-0 overflow-hidden rounded border border-gray-700"
                    >
                      {frame.thumbnail ? (
                        <img
                          src={`data:image/jpeg;base64,${frame.thumbnail}`}
                          alt={`Frame ${frame.frameIndex}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-[10px] text-gray-600">
                          #{frame.frameIndex}
                        </div>
                      )}
                    </div>
                  ))}
                  {group.frames.length > 6 && (
                    <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-gray-700 bg-gray-800 text-xs text-gray-500">
                      +{group.frames.length - 6}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detection Preview Modal */}
      {selectedGroup && (
        <DetectionPreview
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  )
}

function _getUniqueLabels(group: DetectionGroup): string[] {
  const labels = new Set<string>()
  for (const frame of group.frames) {
    for (const det of frame.detections) {
      labels.add(det.label)
    }
  }
  return Array.from(labels).slice(0, 4) // max 4 labels shown
}
