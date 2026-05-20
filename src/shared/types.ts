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

// ─── Detection Frame & Group (YOLO) ───

export interface DetectionFrameResult {
  frameIndex: number
  time: number
  detections: {
    label: string
    confidence: number
    bbox: { x: number; y: number; w: number; h: number }
  }[]
  thumbnail: string // base64 JPEG
}

export interface DetectionGroup {
  id: string
  fileName: string
  filePath: string
  startFrame: number
  endFrame: number
  startTime: number
  endTime: number
  frameCount: number
  frames: DetectionFrameResult[]
}

export interface DetectionProgress {
  status: 'idle' | 'analyzing' | 'completed' | 'error'
  currentFile: string
  currentFileIndex: number
  totalFiles: number
  overallPercent: number
  filePercent: number
  currentFrame: number
  totalFrames: number
  message?: string
}

// ─── Color Analysis (Palette) ───

export interface PaletteColor {
  groupIndex: number // 0-255
  hex: string
  found: boolean
}

export interface FileColorAnalysis {
  fileName: string
  filePath?: string
  totalFrames: number
  processedFrames: number
  fps: number
  palette: PaletteColor[] // 256 slot — found=true bulunan renkler
}

export interface ColorProgress {
  status: 'idle' | 'analyzing' | 'completed' | 'error'
  overallPercent: number
  framesProcessed?: number
  message?: string
}

// ─── AI Detection (flattened group for UI) ───

export interface AIDetection {
  id: string
  label: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number }
  fileName: string
  filePath?: string
  startTime: number
  endTime: number
  thumbnail?: string
}

// ─── Analysis Settings ───

export interface AnalysisSettings {
  yoloInterval: number // Her N frame'de bir YOLO (varsayılan 10)
  colorInterval: number // Her N frame'de bir renk (varsayılan 30)
  confidence: number // YOLO güven eşiği (varsayılan 0.25)
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  yoloInterval: 10,
  colorInterval: 30,
  confidence: 0.25,
}

// ─── Python Backend Status ───

export type BackendStatusState =
  | 'starting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface BackendStatus {
  state: BackendStatusState
  connected: boolean
  message?: string
  logPath?: string
}

// ─── IPC API ───

export interface DroneAPI {
  selectFiles: () => Promise<FileEntry[]>
  startDetection: (
    files: FileEntry[],
    settings?: AnalysisSettings,
  ) => Promise<{ success: boolean; error?: string }>
  onDetectionProgress: (
    callback: (progress: DetectionProgress) => void,
  ) => () => void
  onDetectionGroup: (callback: (group: DetectionGroup) => void) => () => void
  onColorProgress: (callback: (progress: ColorProgress) => void) => () => void
  onColorAnalysis: (
    callback: (analysis: FileColorAnalysis) => void,
  ) => () => void
  getPythonStatus: () => Promise<BackendStatus>
  onPythonStatus: (callback: (status: BackendStatus) => void) => () => void
}
