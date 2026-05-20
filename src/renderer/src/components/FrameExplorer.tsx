import type { FileColorAnalysis, PaletteColor } from '../../../shared/types'

interface FrameExplorerProps {
  colorData: FileColorAnalysis[]
  fileName: string
  groupIndex: number
  onBack: () => void
}

export default function FrameExplorer({
  colorData,
  fileName,
  groupIndex,
  onBack,
}: FrameExplorerProps): React.JSX.Element {
  // Find the matching file analysis
  const fileAnalysis = colorData.find((f) => f.fileName === fileName)
  const paletteColor = fileAnalysis?.palette.find(
    (c) => c.groupIndex === groupIndex,
  )

  if (!fileAnalysis || !paletteColor) {
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
        hex={paletteColor.hex}
        groupIndex={groupIndex}
        fileName={fileName}
        paletteColor={paletteColor}
        onBack={onBack}
      />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-24 w-24 rounded-xl border-2 border-gray-600 shadow-xl"
            style={{ backgroundColor: paletteColor.hex }}
          />
          <h3 className="text-lg font-bold text-gray-200">
            {paletteColor.hex}
          </h3>
          <p className="mt-1 text-sm text-gray-400">Grup #{groupIndex}</p>
          <p className="mt-2 text-sm">
            {paletteColor.found ? (
              <span className="text-green-400">✓ Bu renk videoda bulundu</span>
            ) : (
              <span className="text-gray-500">
                ✗ Bu renk videoda bulunamadı
              </span>
            )}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {fileAnalysis.processedFrames} / {fileAnalysis.totalFrames} kare
            analiz edildi
          </p>
        </div>
      </div>
    </div>
  )
}

function Header({
  hex,
  groupIndex,
  fileName,
  paletteColor,
  onBack,
}: {
  hex: string
  groupIndex: number
  fileName: string
  paletteColor?: PaletteColor
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
          {paletteColor && (
            <p className="text-xs text-gray-500">
              {paletteColor.found ? '✓ Bulundu' : '✗ Bulunamadı'} · {fileName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
