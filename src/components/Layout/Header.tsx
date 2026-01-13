'use client'

import { backgroundThemes, BackgroundTheme } from '@/lib/backgroundThemes'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  theme: 'light' | 'dark'
  backgroundTheme: BackgroundTheme
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  onThemeChange: (theme: 'light' | 'dark') => void
  onBackgroundThemeChange: (theme: BackgroundTheme) => void
}

export function Header({ currentView, panelMode, theme, backgroundTheme, onViewChange, onPanelModeChange, onThemeChange, onBackgroundThemeChange }: HeaderProps) {
  return (
    <header className="p-4 border-b border-theme flex items-center justify-between">
      <h1 className="text-xl font-bold text-theme-primary">Timeboxxer</h1>
      
      <div className="flex gap-4 items-center">
        {/* Panel Mode Controls - only show on main view */}
        {currentView === 'main' && (
          <div className="flex gap-1 bg-theme-secondary rounded-lg p-1">
            <button
              onClick={() => onPanelModeChange('lists-only')}
              className={`px-3 py-1 rounded text-sm ${
                panelMode === 'lists-only' ? 'bg-theme-tertiary text-theme-primary' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => onPanelModeChange('both')}
              className={`px-3 py-1 rounded text-sm ${
                panelMode === 'both' ? 'bg-theme-tertiary text-theme-primary' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => onPanelModeChange('calendar-only')}
              className={`px-3 py-1 rounded text-sm ${
                panelMode === 'calendar-only' ? 'bg-theme-tertiary text-theme-primary' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Calendar
            </button>
          </div>
        )}
        
        {/* Background Theme Dropdown */}
        <select
          value={backgroundTheme}
          onChange={(e) => onBackgroundThemeChange(e.target.value as BackgroundTheme)}
          className="bg-theme-tertiary text-theme-primary rounded px-2 py-1 text-sm"
        >
          {Object.entries(backgroundThemes).map(([key, { name }]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
        
        {/* View Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewChange('main')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              currentView === 'main'
                ? 'bg-blue-500 text-white'
                : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onViewChange('completed')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              currentView === 'completed'
                ? 'bg-blue-500 text-white'
                : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Completed
          </button>
        </div>
        
        {/* Theme Toggle */}
        <button
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded hover:bg-theme-tertiary"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}