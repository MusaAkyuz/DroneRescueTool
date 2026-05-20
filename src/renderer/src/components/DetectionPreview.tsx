import { useState, useCallback } from 'react'
import type {
  DetectionGroup,
  DetectionFrameResult,
} from '../../../shared/types'

interface DetectionPreviewProps {
  group: DetectionGroup
  onClose: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export default function DetectionPreview({
  group,
  onClose,
}: DetectionPreviewProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentFrame: DetectionFrameResult | undefined =
    group.frames[currentIndex]

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) =>
      prev < group.frames.length - 1 ? prev + 1 : prev,
    )
  }, [group.frames.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'Escape') onClose()
    },
    [handlePrev, handleNext, onClose],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-200">
              🎯 Tespit Önizleme
            </h3>
            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
              {group.frameCount} frame
            </span>
            <span className="text-xs text-gray-400">
              {formatTime(group.startTime)} → {formatTime(group.endTime)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Image Preview with Bbox Overlay */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-4">
          {currentFrame?.thumbnail ? (
            <img
              src={`data:image/jpeg;base64,${currentFrame.thumbnail}`}
              alt={`Frame ${currentFrame.frameIndex}`}
              className="max-h-[60vh] w-auto rounded-lg border border-gray-700 object-contain"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Önizleme yok
            </div>
          )}

          {/* Detection labels for current frame */}
          {currentFrame && currentFrame.detections.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {currentFrame.detections.map((det, i) => (
                <span
                  key={i}
                  className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400"
                >
                  {det.label} — %{(det.confidence * 100).toFixed(1)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between border-t border-gray-700 px-5 py-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800"
          >
            ← Önceki
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Frame{' '}
              <span className="font-bold text-gray-200">
                {currentIndex + 1}
              </span>{' '}
              / {group.frames.length}
            </span>
            {currentFrame && (
              <span className="text-xs text-gray-500">
                #{currentFrame.frameIndex} — {formatTime(currentFrame.time)}
              </span>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === group.frames.length - 1}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800"
          >
            Sonraki →
          </button>
        </div>

        {/* Frame Thumbnails Strip */}
        {group.frames.length > 1 && (
          <div className="border-t border-gray-700 p-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {group.frames.map((frame, idx) => (
                <button
                  key={frame.frameIndex}
                  onClick={() => setCurrentIndex(idx)}
                  className={`shrink-0 overflow-hidden rounded border-2 transition-all ${
                    idx === currentIndex
                      ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {frame.thumbnail ? (
                    <img
                      src={`data:image/jpeg;base64,${frame.thumbnail}`}
                      alt={`Frame ${frame.frameIndex}`}
                      className="h-12 w-20 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-20 items-center justify-center bg-gray-800 text-xs text-gray-500">
                      #{frame.frameIndex}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File Info */}
        <div className="border-t border-gray-700 px-5 py-2">
          <p className="truncate text-xs text-gray-500">📄 {group.fileName}</p>
        </div>
      </div>
    </div>
  )
}
