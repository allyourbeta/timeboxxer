'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, List, Calendar, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
}

export function Header({ 
  currentView, 
  panelMode, 
  onViewChange, 
  onPanelModeChange 
}: HeaderProps) {
  const { theme, setTheme } = useTheme()
  
  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-14 px-4 border-b border-border flex items-center justify-between bg-background">
      <h1 className="text-xl font-bold text-foreground">Timeboxxer</h1>
      
      <div className="flex items-center gap-3">
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