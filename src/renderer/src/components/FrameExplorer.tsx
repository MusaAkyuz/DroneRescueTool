import { useState, useRef, useCallback, useEffect } from 'react'
import type {
  FileColorAnalysis,
  ColorInfo,
  FileEntry,
} from '../../../shared/types'

interface FrameExplorerProps {
  colorData: FileColorAnalysis[]
  files: FileEntry[]
  fileName: string
  groupIndex: number
  onBack: () => void
}

export default function FrameExplorer({
  colorData,
  files,
  fileName,
  groupIndex,
  onBack,
}: FrameExplorerProps): React.JSX.Element {
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(null)

  // Find the matching file analysis
  const fileAnalysis = colorData.find((f) => f.fileName === fileName)
  const colorInfo = fileAnalysis?.colors.find(
    (c) => c.groupIndex === groupIndex,
  )
  const fileEntry = files.find((f) => f.name === fileName)

  const fps = fileAnalysis?.fps || 30
  const frames = colorInfo?.frames ?? []

  // Convert frame index to time string
  const frameToTime = useCallback(
    (frameIndex: number): string => {
      const seconds = frameIndex / fps
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      const ms = Math.floor((seconds % 1) * 100)
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    },
    [fps],
  )

  if (!fileAnalysis || !colorInfo) {
    return (
      <div className="flex h-full flex-col">
        <Header
          hex={`Grup #${groupIndex}`}
          groupIndex={groupIndex}
          fileName={fileName}
          onBack={onBack}
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-400">Bu renk grubuna ait veri bulunamadı.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-950">
      {/* Header */}
      <Header
        hex={colorInfo.hex}
        groupIndex={groupIndex}
        fileName={fileName}
        colorInfo={colorInfo}
        onBack={onBack}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Frame List - Left */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900/40">
          <div className="sticky top-0 border-b border-gray-800 bg-gray-900 px-4 py-2">
            <p className="text-xs font-medium text-gray-400">
              {frames.length} karede tespit edildi
            </p>
          </div>
          <div className="divide-y divide-gray-800/50">
            {frames.map((frameIndex, i) => (
              <button
                key={frameIndex}
                onClick={() => setSelectedFrameIdx(frameIndex)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  selectedFrameIdx === frameIndex
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gray-800 font-mono text-xs text-gray-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Kare #{frameIndex}</p>
                  <p className="text-xs text-gray-500">
                    {frameToTime(frameIndex)}
                  </p>
                </div>
                <span className="text-xs text-gray-600">▶</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview - Right */}
        <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
          {selectedFrameIdx !== null && fileEntry ? (
            <FramePreview
              filePath={fileEntry.path}
              fileType={fileEntry.type}
              frameIndex={selectedFrameIdx}
              fps={fps}
              colorHex={colorInfo.hex}
              frameToTime={frameToTime}
            />
          ) : (
            <div className="text-center">
              <div className="mb-3 text-5xl opacity-30">🎬</div>
              <p className="text-gray-500">
                Görüntülemek için soldaki listeden bir kare seçin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Header({
  hex,
  groupIndex,
  fileName,
  colorInfo,
  onBack,
}: {
  hex: string
  groupIndex: number
  fileName: string
  colorInfo?: ColorInfo
  onBack: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 border-b border-gray-800 bg-gray-900/80 px-5 py-3">
      <button
        onClick={onBack}
        className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
      >
        ← Geri
      </button>

      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 rounded-lg border border-gray-600 shadow-lg"
          style={{ backgroundColor: hex }}
        />
        <div>
          <h2 className="text-sm font-bold text-gray-200">
            {hex} · Grup #{groupIndex}
          </h2>
          {colorInfo && (
            <p className="text-xs text-gray-500">
              {colorInfo.count.toLocaleString()} piksel · %
              {colorInfo.percentage.toFixed(2)} · {fileName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function FramePreview({
  filePath,
  fileType,
  frameIndex,
  fps,
  colorHex,
  frameToTime,
}: {
  filePath: string
  fileType: 'video' | 'image'
  frameIndex: number
  fps: number
  colorHex: string
  frameToTime: (f: number) => string
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [seeking, setSeeking] = useState(false)

  const mediaUrl = `local-media://serve?path=${encodeURIComponent(filePath)}`
  const targetTime = frameIndex / fps

  // Seek video when frameIndex changes
  useEffect(() => {
    setCaptured(null)
    if (fileType === 'image') return

    const video = videoRef.current
    if (!video) return

    setSeeking(true)
    video.currentTime = targetTime
  }, [frameIndex, targetTime, fileType])

  // Capture frame when seek completes
  const handleSeeked = useCallback(() => {
    setSeeking(false)
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      setCaptured(canvas.toDataURL('image/jpeg', 0.92))
    }
  }, [])

  if (fileType === 'image') {
    return (
      <div className="flex flex-col items-center gap-4">
        <img
          src={mediaUrl}
          alt={`Frame ${frameIndex}`}
          className="max-h-[70vh] max-w-full rounded-lg shadow-2xl"
        />
        <FrameLabel
          frameIndex={frameIndex}
          time={frameToTime(frameIndex)}
          colorHex={colorHex}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden video for seeking + capturing */}
      <video
        ref={videoRef}
        src={mediaUrl}
        className="hidden"
        muted
        preload="auto"
        onSeeked={handleSeeked}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Captured frame display */}
      {captured ? (
        <img
          src={captured}
          alt={`Frame ${frameIndex}`}
          className="max-h-[70vh] max-w-full rounded-lg shadow-2xl"
        />
      ) : (
        <div className="flex h-64 w-96 items-center justify-center rounded-lg bg-gray-800">
          {seeking ? (
            <div className="text-center">
              <div className="mb-2 animate-pulse text-2xl">⏳</div>
              <p className="text-sm text-gray-400">Kare yakalanıyor...</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Yükleniyor...</p>
          )}
        </div>
      )}

      <FrameLabel
        frameIndex={frameIndex}
        time={frameToTime(frameIndex)}
        colorHex={colorHex}
      />
    </div>
  )
}

function FrameLabel({
  frameIndex,
  time,
  colorHex,
}: {
  frameIndex: number
  time: string
  colorHex: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-gray-800/80 px-5 py-2.5">
      <div className="text-center">
        <p className="text-xs text-gray-500">Kare</p>
        <p className="font-mono text-sm font-bold text-gray-200">
          #{frameIndex}
        </p>
      </div>
      <div className="h-6 w-px bg-gray-700" />
      <div className="text-center">
        <p className="text-xs text-gray-500">Zaman</p>
        <p className="font-mono text-sm font-bold text-gray-200">{time}</p>
      </div>
      <div className="h-6 w-px bg-gray-700" />
      <div className="text-center">
        <p className="text-xs text-gray-500">Renk</p>
        <div className="flex items-center gap-1.5">
          <div
            className="h-3.5 w-3.5 rounded border border-gray-600"
            style={{ backgroundColor: colorHex }}
          />
          <p className="font-mono text-sm font-bold text-gray-200">
            {colorHex}
          </p>
        </div>
      </div>
    </div>
  )
}
