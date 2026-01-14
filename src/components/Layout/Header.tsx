'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, List, Calendar, LayoutGrid, Plus, X, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  onParkThought: (title: string) => void
  onJustStart: () => void
}

export function Header({ 
  currentView, 
  panelMode, 
  onViewChange, 
  onPanelModeChange,
  onParkThought,
  onJustStart,
}: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [showParkInput, setShowParkInput] = useState(false)
  const [parkText, setParkText] = useState('')
  
  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleParkSubmit = () => {
    if (parkText.trim()) {
      onParkThought(parkText.trim())
      setParkText('')
      setShowParkInput(false)
    }
  }

  const handleParkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleParkSubmit()
    } else if (e.key === 'Escape') {
      setShowParkInput(false)
      setParkText('')
    }
  }

  return (
    <header className="h-14 px-4 border-b flex items-center justify-between bg-background">
      <h1 className="text-xl font-bold text-foreground">Timeboxxer</h1>
      
      <div className="flex items-center gap-3">
        {/* Park a Thought quick capture */}
        <div className="flex items-center gap-2">
          {showParkInput ? (
            <div className="flex items-center gap-2">
              <Input
                value={parkText}
                onChange={(e) => setParkText(e.target.value)}
                onKeyDown={handleParkKeyDown}
                placeholder="Park a thought..."
                className="w-48 h-9"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowParkInput(false); setParkText(''); }}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowParkInput(true)}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Park
            </Button>
          )}
        </div>
        
        {/* Panel Mode Controls - only show on main view */}
        {currentView === 'main' && (
          <div className="flex h-9 items-center bg-muted rounded-lg p-1 gap-1">
            <Toggle
              pressed={panelMode === 'lists-only'}
              onPressedChange={() => onPanelModeChange('lists-only')}
              size="sm"
              variant="outline"
              className="h-7 px-2"
            >
              <List className="h-4 w-4 mr-1" />
              Lists
            </Toggle>
            <Toggle
              pressed={panelMode === 'both'}
              onPressedChange={() => onPanelModeChange('both')}
              size="sm"
              variant="outline"
              className="h-7 px-2"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Both
            </Toggle>
            <Toggle
              pressed={panelMode === 'calendar-only'}
              onPressedChange={() => onPanelModeChange('calendar-only')}
              size="sm"
              variant="outline"
              className="h-7 px-2"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Calendar
            </Toggle>
          </div>
        )}
        
        {/* Just Start button - only show on main view */}
        {currentView === 'main' && (
          <Button
            variant="default"
            size="sm"
            onClick={onJustStart}
            className="h-9 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            <Shuffle className="h-4 w-4 mr-1" />
            Just Start
          </Button>
        )}
        
        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleThemeToggle}
          className="h-9 w-9"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        
        {/* View Controls */}
        <div className="flex h-9 items-center bg-muted rounded-lg p-1 gap-1">
          <Button
            variant={currentView === 'main' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('main')}
            className="h-7 px-3"
          >
            Today
          </Button>
          <Button
            variant={currentView === 'completed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('completed')}
            className="h-7 px-3"
          >
            Completed
          </Button>
        </div>
      </div>
    </header>
  )
}