import type { FileColorAnalysis } from '../../../shared/types'

interface ColorAnalysisTabProps {
  colorData: FileColorAnalysis[]
}

export default function ColorAnalysisTab({
  colorData,
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
        <div key={`${fileAnalysis.fileName}-${fileIndex}`} className="mb-6">
          {/* File Header */}
          <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-800/80 px-4 py-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-200">
                {fileAnalysis.fileName}
              </h4>
              <p className="text-xs text-gray-500">
                {fileAnalysis.processedFrames} / {fileAnalysis.totalFrames} kare
                işlendi
              </p>
            </div>
            <div className="text-right text-xs text-gray-400">
              {fileAnalysis.colors.length} renk tespit edildi
            </div>
          </div>

          {/* Color Bars */}
          <div className="mb-3 flex h-6 overflow-hidden rounded-lg">
            {fileAnalysis.colors.map((color, colorIndex) => (
              <div
                key={`${color.hex}-${colorIndex}`}
                className="transition-all duration-300"
                style={{
                  backgroundColor: color.hex,
                  width: `${color.percentage}%`,
                  minWidth: color.percentage > 0 ? '2px' : '0px',
                }}
                title={`${color.name}: %${color.percentage.toFixed(1)}`}
              />
            ))}
          </div>

          {/* Color Table */}
          <div className="overflow-hidden rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-left text-xs text-gray-400">
                  <th className="px-3 py-2">Renk</th>
                  <th className="px-3 py-2">Adı</th>
                  <th className="px-3 py-2 text-right">Adet</th>
                  <th className="px-3 py-2 text-right">Yüzde</th>
                  <th className="px-3 py-2 text-right">Yoğunluk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {fileAnalysis.colors.map((color, colorIndex) => (
                  <tr
                    key={`${color.hex}-${colorIndex}`}
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
                    <td className="px-3 py-1.5 text-gray-300">{color.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-400">
                      {color.count.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${color.percentage}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-xs text-gray-400">
                          %{color.percentage.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-400">
                      {color.intensity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
