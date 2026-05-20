import { useState } from 'react'
import type { FileColorAnalysis, PaletteColor } from '../../../shared/types'

interface ColorAnalysisTabProps {
  colorData: FileColorAnalysis[]
  onViewFrames?: (fileName: string, groupIndex: number) => void
}

export default function ColorAnalysisTab({
  colorData,
  onViewFrames,
}: ColorAnalysisTabProps): React.JSX.Element {
  if (colorData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-4xl">🎨</div>
          <p className="text-gray-400">Henüz renk analizi yok</p>
          <p className="mt-1 text-sm text-gray-500">
            Analiz başlatıldığında renk verileri burada görünecek
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {colorData.map((fileAnalysis, fileIndex) => (
        <FilePaletteSection
          key={`${fileAnalysis.fileName}-${fileIndex}`}
          fileAnalysis={fileAnalysis}
          onViewFrames={onViewFrames}
        />
      ))}
    </div>
  )
}

function FilePaletteSection({
  fileAnalysis,
  onViewFrames,
}: {
  fileAnalysis: FileColorAnalysis
  onViewFrames?: (fileName: string, groupIndex: number) => void
}): React.JSX.Element {
  const [hoveredColor, setHoveredColor] = useState<PaletteColor | null>(null)

  const foundCount = fileAnalysis.palette.filter((c) => c.found).length

  return (
    <div className="mb-6">
      {/* File Header */}
      <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-800/80 px-4 py-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-200">
            {fileAnalysis.fileName}
          </h4>
          <p className="text-xs text-gray-500">
            {fileAnalysis.processedFrames} / {fileAnalysis.totalFrames} kare
            işlendi · {foundCount}/256 renk bulundu
          </p>
        </div>
        {hoveredColor && (
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded border border-gray-600"
              style={{
                backgroundColor: hoveredColor.found ? hoveredColor.hex : '#111',
              }}
            />
            <span className="font-mono text-xs text-gray-300">
              {hoveredColor.hex} · Grup #{hoveredColor.groupIndex} ·{' '}
              {hoveredColor.found ? '✓ Bulundu' : '✗ Yok'}
            </span>
          </div>
        )}
      </div>

      {/* Palette Grid 16×16 */}
      <div className="grid grid-cols-16 gap-0.5 rounded-lg bg-gray-900 p-2">
        {fileAnalysis.palette.map((color) => (
          <div
            key={color.groupIndex}
            className={`aspect-square cursor-pointer rounded-sm transition-all duration-150 ${
              hoveredColor?.groupIndex === color.groupIndex
                ? 'z-10 scale-125 ring-2 ring-white'
                : ''
            }`}
            style={{
              backgroundColor: color.found ? color.hex : '#111111',
              opacity: color.found ? 1 : 0.3,
            }}
            onMouseEnter={() => setHoveredColor(color)}
            onMouseLeave={() => setHoveredColor(null)}
            onClick={() => {
              if (color.found && onViewFrames) {
                onViewFrames(fileAnalysis.fileName, color.groupIndex)
              }
            }}
            title={
              color.found
                ? `${color.hex} | Grup #${color.groupIndex} | ✓ Bulundu`
                : `${color.hex} | Grup #${color.groupIndex} | ✗ Yok`
            }
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-green-500" /> Bulunan renk
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-gray-800 opacity-30" />{' '}
          Bulunamayan renk
        </span>
        <span className="ml-auto">
          {foundCount} / 256 ({((foundCount / 256) * 100).toFixed(1)}%)
        </span>
      </div>
    </div>
  )
}
