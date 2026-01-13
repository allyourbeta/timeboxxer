'use client'

interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void
}

export function ResizeHandle({ onResizeStart }: ResizeHandleProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-white/20 hover:bg-white/40 rounded-b transition-colors"
      onMouseDown={onResizeStart}
    />
  )
}