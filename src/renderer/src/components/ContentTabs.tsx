import { useState } from 'react'
import ColorAnalysisTab from './ColorAnalysisTab'
import DetectionTab from './DetectionTab'
import type {
  FileColorAnalysis,
  DetectionGroup,
  DetectionProgress,
} from '../../../shared/types'

type TabKey = 'detection' | 'color'

interface ContentTabsProps {
  colorData: FileColorAnalysis[]
  detectionGroups: DetectionGroup[]
  detectionProgress: DetectionProgress
  onViewFrames?: (fileName: string, groupIndex: number) => void
}

export default function ContentTabs({
  colorData,
  detectionGroups,
  detectionProgress,
  onViewFrames,
}: ContentTabsProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('detection')

  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    {
      key: 'detection',
      label: 'AI Tespit (YOLO)',
      icon: '🎯',
      count: detectionGroups.length,
    },
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
        {activeTab === 'detection' && (
          <DetectionTab groups={detectionGroups} progress={detectionProgress} />
        )}
        {activeTab === 'color' && (
          <ColorAnalysisTab colorData={colorData} onViewFrames={onViewFrames} />
        )}
      </div>
    </div>
  )
}
