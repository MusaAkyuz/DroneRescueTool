import type { FileEntry } from '../../../shared/types'

interface SidebarProps {
  files: FileEntry[]
  currentFile?: string
}

const FILE_TYPE_ICONS: Record<string, string> = {
  video: '🎬',
  image: '🖼️',
}

const FILE_TYPE_COLORS: Record<string, string> = {
  video: 'text-blue-400',
  image: 'text-green-400',
}

export default function Sidebar({
  files,
  currentFile,
}: SidebarProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col border-r border-gray-700 bg-gray-900/80">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
          Dosyalar ({files.length})
        </h3>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 italic">
            Henüz dosya yüklenmedi
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {files.map((file, index) => {
              const isActive = currentFile === file.path
              return (
                <li
                  key={`${file.path}-${index}`}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    isActive
                      ? 'border-l-2 border-blue-500 bg-blue-500/10'
                      : 'border-l-2 border-transparent hover:bg-gray-800/60'
                  }`}
                >
                  <span className="text-lg">{FILE_TYPE_ICONS[file.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-gray-200"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className={`text-xs ${FILE_TYPE_COLORS[file.type]}`}>
                      {file.type === 'video' ? 'Video' : 'Resim'} •{' '}
                      {file.extension}
                    </p>
                  </div>
                  {isActive && (
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-blue-500" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
