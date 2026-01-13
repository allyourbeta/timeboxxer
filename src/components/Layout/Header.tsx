'use client'

import { Theme } from '@/lib/backgroundThemes'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  theme: Theme
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  onThemeChange: (theme: Theme) => void
}

export function Header({ 
  currentView, 
  panelMode, 
  theme, 
  onViewChange, 
  onPanelModeChange, 
  onThemeChange 
}: HeaderProps) {
  return (
    <header className="h-14 px-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Timeboxxer</h1>
      
      <div className="flex items-center gap-3">
        {/* Panel Mode Controls - only show on main view */}
        {currentView === 'main' && (
          <div className="flex h-9 items-center bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              onClick={() => onPanelModeChange('lists-only')}
              className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
                panelMode === 'lists-only' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => onPanelModeChange('both')}
              className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
                panelMode === 'both' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => onPanelModeChange('calendar-only')}
              className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
                panelMode === 'calendar-only' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Calendar
            </button>
          </div>
        )}
        
        {/* Theme Toggle - same height as other controls */}
        <button
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        
        {/* View Controls - same height */}
        <div className="flex h-9 items-center bg-[var(--bg-secondary)] rounded-lg p-1">
          <button
            onClick={() => onViewChange('main')}
            className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
              currentView === 'main'
                ? 'bg-blue-500 text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onViewChange('completed')}
            className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
              currentView === 'completed'
                ? 'bg-blue-500 text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Completed
          </button>
        </div>
      </div>
    </header>
  )
}