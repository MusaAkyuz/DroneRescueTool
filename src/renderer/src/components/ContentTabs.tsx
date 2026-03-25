import { useState } from 'react'
import AIDetectionsTab from './AIDetectionsTab'
import ColorAnalysisTab from './ColorAnalysisTab'
import type {
  AIDetection,
  FileColorAnalysis,
  FileEntry,
} from '../../../shared/types'

type TabKey = 'ai' | 'color'

interface ContentTabsProps {
  detections: AIDetection[]
  colorData: FileColorAnalysis[]
  files: FileEntry[]
  onViewFrames?: (fileName: string, groupIndex: number) => void
}

export default function ContentTabs({
  detections,
  colorData,
  files,
  onViewFrames,
}: ContentTabsProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('ai')

  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: 'ai', label: 'AI Tespitleri', icon: '🤖', count: detections.length },
    {
      key: 'color',
      label: 'Renk Analizi',
      icon: '🎨',
      count: colorData.length,
    },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-700 bg-gray-900/60">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'border-b-2 border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ai' && (
          <AIDetectionsTab detections={detections} files={files} />
        )}
        {activeTab === 'color' && (
          <ColorAnalysisTab colorData={colorData} onViewFrames={onViewFrames} />
        )}
      </div>
    </div>
  )
}
