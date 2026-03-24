import { useState, useCallback, useMemo } from 'react'
import type { FileEntry } from '../../../shared/types'

const ALLOWED_VIDEO = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv']
const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']

interface FileUploadProps {
  onFilesSelected: (files: FileEntry[]) => void
}

export default function FileUpload({
  onFilesSelected,
}: FileUploadProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false)

  const allowedExtensions = useMemo(
    () => [...ALLOWED_VIDEO, ...ALLOWED_IMAGE],
    [],
  )

  const handleSelectFiles = useCallback(async () => {
    try {
      const files = await window.api.selectFiles()
      if (files && files.length > 0) {
        onFilesSelected(files)
      }
    } catch (err) {
      console.error('Dosya seçme hatası:', err)
    }
  }, [onFilesSelected])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isDragging) setIsDragging(true)
    },
    [isDragging],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files) as (File & {
        path: string
      })[]
      const validFiles: FileEntry[] = droppedFiles
        .filter((f) => {
          const ext = '.' + f.name.split('.').pop()?.toLowerCase()
          return allowedExtensions.includes(ext)
        })
        .map((f) => {
          const ext = '.' + f.name.split('.').pop()!.toLowerCase()
          return {
            path: f.path,
            name: f.name,
            extension: ext,
            type: ALLOWED_VIDEO.includes(ext)
              ? ('video' as const)
              : ('image' as const),
          }
        })

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [onFilesSelected, allowedExtensions],
  )

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div
        className={`flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition-all duration-200 ${
          isDragging
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-gray-600 bg-gray-800/50 hover:border-gray-400 hover:bg-gray-800/80'
        }`}
        onClick={handleSelectFiles}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Upload Icon */}
        <div className="mb-6 text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-200">
          Dosyaları Sürükleyin veya Tıklayın
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          Video ve resim dosyalarını seçin (birden fazla dosya seçebilirsiniz)
        </p>

        <div className="flex gap-4">
          <div className="rounded-lg bg-gray-700/60 px-3 py-1.5 text-xs text-gray-300">
            <span className="font-medium text-blue-400">Video:</span>{' '}
            {ALLOWED_VIDEO.join(', ')}
          </div>
          <div className="rounded-lg bg-gray-700/60 px-3 py-1.5 text-xs text-gray-300">
            <span className="font-medium text-green-400">Resim:</span>{' '}
            {ALLOWED_IMAGE.join(', ')}
          </div>
        </div>
      </div>
    </div>
  )
}
