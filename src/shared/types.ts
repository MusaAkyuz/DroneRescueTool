/**
 * Shared types for the DroneRescueTool application.
 */

// ─── File Types ───

export const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mov',
  '.mkv',
  '.webm',
  '.flv',
]
export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.bmp',
  '.tiff',
  '.webp',
]
export const ALLOWED_EXTENSIONS = [
  ...ALLOWED_VIDEO_EXTENSIONS,
  ...ALLOWED_IMAGE_EXTENSIONS,
]

export type FileType = 'video' | 'image'

export interface FileEntry {
  path: string
  name: string
  extension: string
  type: FileType
}

// ─── Analysis Progress ───

export type AnalysisStatus = 'idle' | 'analyzing' | 'completed' | 'error'

export interface AnalysisProgress {
  status: AnalysisStatus
  currentFile: string
  currentFileIndex: number
  totalFiles: number
  overallPercent: number
  filePercent: number
  message?: string
}

// ─── AI Detection ───

export interface AIDetection {
  id: string
  fileName: string
  filePath?: string
  label: string
  confidence: number
  startTime: number // seconds (for video)
  endTime: number // seconds (for video)
  bbox?: { x: number; y: number; w: number; h: number }
}

// ─── Color Analysis ───

export interface ColorInfo {
  hex: string
  groupIndex: number // 0-255 renk grubu indexi
  count: number
  percentage: number
  frames?: number[] // Bu rengin görüldüğü frame indeksleri
}

export interface FileColorAnalysis {
  fileName: string
  filePath?: string
  totalFrames: number
  processedFrames: number
  fps: number
  colors: ColorInfo[]
}

// ─── IPC API ───

export interface DroneAPI {
  selectFiles: () => Promise<FileEntry[]>
  startAnalysis: (
    files: FileEntry[],
  ) => Promise<{ success: boolean; error?: string }>
  onAnalysisProgress: (
    callback: (progress: AnalysisProgress) => void,
  ) => () => void
  onAIDetection: (callback: (detection: AIDetection) => void) => () => void
  onColorAnalysis: (
    callback: (analysis: FileColorAnalysis) => void,
  ) => () => void
  getPythonStatus: () => Promise<{ connected: boolean }>
}
