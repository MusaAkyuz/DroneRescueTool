import { useRef, useEffect, useState, useCallback } from 'react'
import type { AIDetection } from '../../../shared/types'

interface VideoPreviewModalProps {
  detection: AIDetection
  filePath: string
  fileType: 'video' | 'image'
  onClose: () => void
}

export default function VideoPreviewModal({
  detection,
  filePath,
  fileType,
  onClose,
}: VideoPreviewModalProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })

  const mediaUrl = `local-media://serve?path=${encodeURIComponent(filePath)}`

  // Update display dimensions from the media element
  const updateDisplaySize = useCallback(() => {
    const el = fileType === 'video' ? videoRef.current : imgRef.current
    if (el && el.clientWidth > 0) {
      setDisplaySize({ width: el.clientWidth, height: el.clientHeight })
    }
  }, [fileType])

  // Video: set natural size, seek to start, play
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setVideoSize({ width: video.videoWidth, height: video.videoHeight })
    video.currentTime = detection.startTime
    video.play()
    // Measure display size after first layout
    requestAnimationFrame(updateDisplaySize)
  }, [detection.startTime, updateDisplaySize])

  // Video: loop between startTime and endTime
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.currentTime >= detection.endTime) {
      video.currentTime = detection.startTime
    }
  }, [detection.startTime, detection.endTime])

  // Image: get natural size on load
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget
      setVideoSize({ width: img.naturalWidth, height: img.naturalHeight })
      requestAnimationFrame(() => {
        setDisplaySize({ width: img.clientWidth, height: img.clientHeight })
      })
    },
    [],
  )

  // Observe resize of media element for accurate overlay positioning
  useEffect(() => {
    const el = fileType === 'video' ? videoRef.current : imgRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setDisplaySize({ width: el.clientWidth, height: el.clientHeight })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fileType])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Calculate bbox scale factors
  const bbox = detection.bbox
  const scaleX = videoSize.width > 0 ? displaySize.width / videoSize.width : 1
  const scaleY =
    videoSize.height > 0 ? displaySize.height / videoSize.height : 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] rounded-xl bg-gray-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded bg-red-500/20 px-2 py-1 text-sm font-medium text-red-400">
              {detection.label}
            </span>
            <span className="text-sm text-gray-400">
              %{(detection.confidence * 100).toFixed(1)} güven
            </span>
            {fileType === 'video' && (
              <span className="text-xs text-gray-500">
                🔁 {detection.startTime.toFixed(1)}s –{' '}
                {detection.endTime.toFixed(1)}s loop
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Media Container */}
        <div className="relative inline-block">
          {fileType === 'video' ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="max-h-[75vh] max-w-[85vw] rounded-lg"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              muted
              playsInline
            />
          ) : (
            <img
              ref={imgRef}
              src={mediaUrl}
              className="max-h-[75vh] max-w-[85vw] rounded-lg"
              onLoad={handleImageLoad}
              alt={detection.label}
            />
          )}

          {/* Bounding Box Overlay */}
          {bbox && displaySize.width > 0 && (
            <div
              className="pointer-events-none absolute border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{
                left: bbox.x * scaleX,
                top: bbox.y * scaleY,
                width: bbox.w * scaleX,
                height: bbox.h * scaleY,
              }}
            >
              <span className="absolute -top-6 left-0 rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold whitespace-nowrap text-white shadow-lg">
                {detection.label} {(detection.confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span className="truncate" title={filePath}>
            📄 {detection.fileName}
          </span>
          {bbox && (
            <span>
              Konum: ({bbox.x}, {bbox.y}) — Boyut: {bbox.w}×{bbox.h}px
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
