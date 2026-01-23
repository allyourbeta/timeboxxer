'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, List, Calendar, LayoutGrid, Plus, X, Shuffle, ChevronsDownUp, Rows3, Columns2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { WeekStreak } from './WeekStreak'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  listColumnCount: 1 | 2
  onListColumnCountChange: (count: 1 | 2) => void
  onParkThought: (title: string) => void
  onCollapseAll: () => void
  onJustStart: () => void
  completedToday: number
  weekData: number[]
}

export function Header({ 
  currentView, 
  panelMode, 
  onViewChange, 
  onPanelModeChange,
  listColumnCount,
  onListColumnCountChange,
  onParkThought,
  onCollapseAll,
  onJustStart,
  completedToday,
  weekData,
}: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [showParkInput, setShowParkInput] = useState(false)
  const [parkText, setParkText] = useState('')

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  
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
    <header className="h-16 px-6 border-theme bg-theme-secondary shadow-theme-sm flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold text-theme-primary tracking-tight">Timeboxxer</h1>
        
        {/* Streak section */}
        <div className="flex items-center gap-4">
          <WeekStreak weekData={weekData} />
          {completedToday > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-theme-tertiary">
              <span className="text-sm text-green-600">✓</span>
              <span className="text-sm font-medium text-theme-primary">{completedToday}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Park a Thought quick capture */}
        <div className="flex items-center gap-2">
          {showParkInput ? (
            <div className="flex items-center gap-2">
              <Input
                value={parkText}
                onChange={(e) => setParkText(e.target.value)}
                onKeyDown={handleParkKeyDown}
                placeholder="Quick save a thought..."
                className="w-48 h-8 text-sm border-theme bg-theme-secondary"
                autoFocus
              />
              <button
                onClick={() => { setShowParkInput(false); setParkText(''); }}
                className="btn-icon h-8 w-8"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowParkInput(true)}
              className="btn-secondary h-8 text-sm"
              title="Quickly save a thought to TBD Grab Bag"
            >
              <Plus className="h-4 w-4 mr-1" />
              Quick Save
            </button>
          )}
        </div>
        
        {/* Collapse All button - only show on main view */}
        {currentView === 'main' && (
          <button
            onClick={onCollapseAll}
            className="btn-icon h-8 w-8"
            title="Collapse all lists"
          >
            <ChevronsDownUp className="h-4 w-4" />
          </button>
        )}

        {/* Column toggle - only show on main view when lists are visible */}
        {currentView === 'main' && (panelMode === 'both' || panelMode === 'lists-only') && (
          <div className="flex h-8 items-center bg-theme-tertiary rounded-lg p-1">
            <button
              onClick={() => onListColumnCountChange(1)}
              className={`h-6 px-2 rounded text-xs transition-all ${
                listColumnCount === 1
                  ? 'bg-theme-secondary text-theme-primary shadow-theme-xs'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
              title="Single column"
            >
              <Rows3 className="h-3 w-3" />
            </button>
            <button
              onClick={() => onListColumnCountChange(2)}
              className={`h-6 px-2 rounded text-xs transition-all ${
                listColumnCount === 2
                  ? 'bg-theme-secondary text-theme-primary shadow-theme-xs'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
              title="Two columns"
            >
              <Columns2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Panel Mode Controls - only show on main view */}
        {currentView === 'main' && (
          <div className="flex h-8 items-center bg-theme-tertiary rounded-lg p-1">
            <button
              onClick={() => onPanelModeChange('lists-only')}
              className={`h-6 px-3 rounded text-xs transition-all ${
                panelMode === 'lists-only'
                  ? 'bg-theme-secondary text-theme-primary shadow-theme-xs'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
              title="Lists only"
            >
              <List className="h-3 w-3 mr-1" />
              Lists
            </button>
            <button
              onClick={() => onPanelModeChange('both')}
              className={`h-6 px-3 rounded text-xs transition-all ${
                panelMode === 'both'
                  ? 'bg-theme-secondary text-theme-primary shadow-theme-xs'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
              title="Both panels"
            >
              <LayoutGrid className="h-3 w-3 mr-1" />
              Both
            </button>
            <button
              onClick={() => onPanelModeChange('calendar-only')}
              className={`h-6 px-3 rounded text-xs transition-all ${
                panelMode === 'calendar-only'
                  ? 'bg-theme-secondary text-theme-primary shadow-theme-xs'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
              title="Calendar only"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Calendar
            </button>
          </div>
        )}
        
        {/* Just Start button - only show on main view */}
        {currentView === 'main' && (
          <button
            onClick={onJustStart}
            className="btn-primary h-8 text-sm"
            title="Just Start"
          >
            <Shuffle className="h-4 w-4 mr-1" />
            Just Start
          </button>
        )}
        
        {/* Theme Toggle */}
        <button
          onClick={handleThemeToggle}
          className="btn-icon h-8 w-8"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="btn-icon h-8 w-8"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
        
        {/* View Controls */}
        <div className="flex h-8 items-center bg-theme-tertiary rounded-lg p-1">
          <button
            onClick={() => onViewChange('main')}
            className={`h-6 px-3 rounded text-xs font-medium transition-all ${
              currentView === 'main'
                ? 'bg-theme-secondary text-theme-primary shadow-theme-xs'
                : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onViewChange('completed')}
            className={`h-6 px-3 rounded text-xs font-medium transition-all ${
              currentView === 'completed'
                ? 'bg-theme-secondary text-theme-primary shadow-theme-xs'
                : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Completed
          </button>
        </div>
      </div>
    </header>
  )
}