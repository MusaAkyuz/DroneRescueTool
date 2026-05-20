import { useState, useRef, useEffect } from 'react'
import type { AnalysisSettings } from '../../../shared/types'
import { DEFAULT_ANALYSIS_SETTINGS } from '../../../shared/types'

interface AnalysisSettingsPopoverProps {
  settings: AnalysisSettings
  onSettingsChange: (settings: AnalysisSettings) => void
}

export default function AnalysisSettingsPopover({
  settings,
  onSettingsChange,
}: AnalysisSettingsPopoverProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleReset = (): void => {
    onSettingsChange({ ...DEFAULT_ANALYSIS_SETTINGS })
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Gear icon button */}
      <button
        onClick={() => setOpen(!open)}
        className={`rounded-lg px-2 py-1.5 text-sm transition-colors ${
          open
            ? 'bg-gray-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
        }`}
        title="Analiz Ayarları"
      >
        ⚙️
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200">
              ⚙️ Analiz Ayarları
            </h3>
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 transition-colors hover:text-gray-300"
            >
              Varsayılana dön
            </button>
          </div>

          {/* YOLO Interval */}
          <div className="mb-3">
            <label className="mb-1 flex items-center justify-between text-xs text-gray-400">
              <span>🎯 YOLO Aralığı</span>
              <span className="font-mono text-gray-300">
                Her {settings.yoloInterval} frame
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={settings.yoloInterval}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  yoloInterval: Number(e.target.value),
                })
              }
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>1 (her kare)</span>
              <span>30</span>
            </div>
          </div>

          {/* Color Interval */}
          <div className="mb-3">
            <label className="mb-1 flex items-center justify-between text-xs text-gray-400">
              <span>🎨 Renk Aralığı</span>
              <span className="font-mono text-gray-300">
                Her {settings.colorInterval} frame
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={settings.colorInterval}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  colorInterval: Number(e.target.value),
                })
              }
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>1 (her kare)</span>
              <span>60</span>
            </div>
          </div>

          {/* Confidence */}
          <div className="mb-2">
            <label className="mb-1 flex items-center justify-between text-xs text-gray-400">
              <span>📊 Güven Eşiği</span>
              <span className="font-mono text-gray-300">
                {(settings.confidence * 100).toFixed(0)}%
              </span>
            </label>
            <input
              type="range"
              min={5}
              max={95}
              step={5}
              value={settings.confidence * 100}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  confidence: Number(e.target.value) / 100,
                })
              }
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>5%</span>
              <span>95%</span>
            </div>
          </div>

          {/* Info */}
          <p className="mt-2 text-[10px] leading-tight text-gray-600">
            Düşük aralık = daha detaylı ama yavaş. Yüksek aralık = hızlı ama
            atlama riski.
          </p>
        </div>
      )}
    </div>
  )
}
