'use client'

import { useRef, useEffect, useState } from 'react'
import { MoreVertical, Trash2, Copy, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ListCardMenuProps {
  isSystemList: boolean
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function ListCardMenu({
  isSystemList,
  onEdit,
  onDuplicate,
  onDelete,
}: ListCardMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
        setMenuPosition(null)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showMenu) {
      setShowMenu(false)
      setMenuPosition(null)
    } else {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 176,
        })
      }
      setShowMenu(true)
    }
  }

  return (
    <div ref={menuRef}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={handleMenuToggle}
        className="h-8 w-8 text-muted-foreground"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {showMenu && menuPosition && (
        <div
          className="fixed w-44 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 py-1"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {!isSystemList ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onEdit()
                }}
                className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDuplicate()
                }}
                className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDelete()
                }}
                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete List
              </button>
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground italic">
              System list
            </div>
          )}
        </div>
      )}
    </div>
  )
}