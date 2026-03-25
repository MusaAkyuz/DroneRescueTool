import { useState, useMemo } from 'react'
import type { FileColorAnalysis, ColorInfo } from '../../../shared/types'

interface ColorAnalysisTabProps {
  colorData: FileColorAnalysis[]
  onViewFrames?: (fileName: string, groupIndex: number) => void
}

// 256 renk grubunun temsili hex renklerini oluştur (Python ile aynı mantık)
const R_LEVELS = 8
const G_LEVELS = 8
const B_LEVELS = 4

function buildAllGroupHexes(): string[] {
  const hexes: string[] = []
  const rStep = 256 / R_LEVELS
  const gStep = 256 / G_LEVELS
  const bStep = 256 / B_LEVELS
  for (let ri = 0; ri < R_LEVELS; ri++) {
    for (let gi = 0; gi < G_LEVELS; gi++) {
      for (let bi = 0; bi < B_LEVELS; bi++) {
        const r = Math.min(Math.floor(ri * rStep + rStep / 2), 255)
        const g = Math.min(Math.floor(gi * gStep + gStep / 2), 255)
        const b = Math.min(Math.floor(bi * bStep + bStep / 2), 255)
        hexes.push(
          `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`,
        )
      }
    }
  }
  return hexes
}

const ALL_GROUP_HEXES = buildAllGroupHexes()

type ViewMode = 'grid' | 'table'

export default function ColorAnalysisTab({
  colorData,
  onViewFrames,
}: ColorAnalysisTabProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null)

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
        <FileColorSection
          key={`${fileAnalysis.fileName}-${fileIndex}`}
          fileAnalysis={fileAnalysis}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hoveredGroup={hoveredGroup}
          onHoverGroup={setHoveredGroup}
          onViewFrames={onViewFrames}
        />
      ))}
    </div>
  )
}

function FileColorSection({
  fileAnalysis,
  viewMode,
  onViewModeChange,
  hoveredGroup,
  onHoverGroup,
  onViewFrames,
}: {
  fileAnalysis: FileColorAnalysis
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  hoveredGroup: number | null
  onHoverGroup: (idx: number | null) => void
  onViewFrames?: (fileName: string, groupIndex: number) => void
}): React.JSX.Element {
  // Index map for fast lookup
  const colorMap = useMemo(() => {
    const map = new Map<number, ColorInfo>()
    for (const c of fileAnalysis.colors) {
      map.set(c.groupIndex, c)
    }
    return map
  }, [fileAnalysis.colors])

  const maxPercentage = useMemo(() => {
    return fileAnalysis.colors.length > 0
      ? Math.max(...fileAnalysis.colors.map((c) => c.percentage))
      : 1
  }, [fileAnalysis.colors])

  const totalPixels = useMemo(() => {
    return fileAnalysis.colors.reduce((sum, c) => sum + c.count, 0)
  }, [fileAnalysis.colors])

  const top10 = useMemo(() => {
    return [...fileAnalysis.colors]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10)
  }, [fileAnalysis.colors])

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
            işlendi · {fileAnalysis.colors.length}/256 aktif grup ·{' '}
            {totalPixels.toLocaleString()} piksel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`rounded px-2 py-1 text-xs transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
          >
            ▦ Grid
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`rounded px-2 py-1 text-xs transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
          >
            ≡ Tablo
          </button>
        </div>
      </div>

      {/* Top Colors Bar */}
      <div className="mb-3">
        <p className="mb-1 text-xs text-gray-500">En baskın 10 renk</p>
        <div className="flex h-8 overflow-hidden rounded-lg">
          {top10.map((color, i) => (
            <div
              key={`top-${color.groupIndex}-${i}`}
              className="relative transition-all duration-200 hover:brightness-125"
              style={{
                backgroundColor: color.hex,
                width: `${(color.percentage / top10.reduce((s, c) => s + c.percentage, 0)) * 100}%`,
                minWidth: '4px',
              }}
              title={`${color.hex} | Grup #${color.groupIndex} | ${color.count.toLocaleString()} px | %${color.percentage.toFixed(2)}${color.frames && color.frames.length > 0 ? ` | ${color.frames.length} karede` : ''}`}
            />
          ))}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <ColorGrid
          colorMap={colorMap}
          maxPercentage={maxPercentage}
          hoveredGroup={hoveredGroup}
          onHoverGroup={onHoverGroup}
        />
      ) : (
        <ColorTable
          colors={fileAnalysis.colors}
          onViewFrames={
            onViewFrames
              ? (groupIndex) => onViewFrames(fileAnalysis.fileName, groupIndex)
              : undefined
          }
        />
      )}
    </div>
  )
}

function ColorGrid({
  colorMap,
  maxPercentage,
  hoveredGroup,
  onHoverGroup,
}: {
  colorMap: Map<number, ColorInfo>
  maxPercentage: number
  hoveredGroup: number | null
  onHoverGroup: (idx: number | null) => void
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-16 gap-0.5 rounded-lg bg-gray-900 p-2">
      {ALL_GROUP_HEXES.map((hex, idx) => {
        const color = colorMap.get(idx)
        const hasData = !!color
        const pct = color?.percentage ?? 0
        // opacity: aktif renklerin yoğunluğuna göre 0.15–1 arası
        const opacity = hasData
          ? Math.max(0.15, Math.min(1, pct / maxPercentage))
          : 0.04
        const isHovered = hoveredGroup === idx

        return (
          <div
            key={idx}
            className={`aspect-square rounded-sm transition-all duration-150 ${
              isHovered ? 'z-10 scale-125 ring-2 ring-white' : ''
            }`}
            style={{
              backgroundColor: hex,
              opacity,
            }}
            onMouseEnter={() => onHoverGroup(idx)}
            onMouseLeave={() => onHoverGroup(null)}
            title={
              hasData
                ? `${hex} | Grup #${idx} | ${color.count.toLocaleString()} px | %${pct.toFixed(2)}${color.frames && color.frames.length > 0 ? ` | ${color.frames.length} karede` : ''}`
                : `${hex} — boş`
            }
          />
        )
      })}
    </div>
  )
}

function ColorTable({
  colors,
  onViewFrames,
}: {
  colors: ColorInfo[]
  onViewFrames?: (groupIndex: number) => void
}): React.JSX.Element {
  const sorted = useMemo(
    () => [...colors].sort((a, b) => a.groupIndex - b.groupIndex),
    [colors],
  )

  return (
    <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm">
        <thead className="sticky top-0">
          <tr className="bg-gray-800 text-left text-xs text-gray-400">
            <th className="px-3 py-2">Renk</th>
            <th className="px-3 py-2">Grup #</th>
            <th className="px-3 py-2 text-right">Piksel</th>
            <th className="px-3 py-2 text-right">Yüzde</th>
            <th className="px-3 py-2 text-right">Kare</th>
            <th className="px-3 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sorted.map((color, i) => (
            <tr
              key={`${color.groupIndex}-${i}`}
              className="transition-colors hover:bg-gray-800/50"
            >
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded border border-gray-600"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="font-mono text-xs text-gray-400">
                    {color.hex}
                  </span>
                </div>
              </td>
              <td className="px-3 py-1.5 font-mono text-xs text-gray-500">
                {color.groupIndex}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-gray-400">
                {color.count.toLocaleString()}
              </td>
              <td className="px-3 py-1.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${Math.min(color.percentage * 2, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-gray-400">
                    %{color.percentage.toFixed(2)}
                  </span>
                </div>
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-400">
                {color.frames ? color.frames.length : '—'}
              </td>
              <td className="px-3 py-1.5 text-right">
                {color.frames && color.frames.length > 0 && onViewFrames && (
                  <button
                    onClick={() => onViewFrames(color.groupIndex)}
                    className="rounded bg-blue-600/80 px-2 py-0.5 text-xs text-white transition-colors hover:bg-blue-500"
                  >
                    Kareleri Gör
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
