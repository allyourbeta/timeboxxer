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
    <header className="p-4 border-b border-gray-700 flex items-center justify-between">
      <h1 className="text-xl font-bold">Timeboxxer</h1>
      
      <div className="flex gap-4 items-center">
        {/* Panel Mode Controls - only show on main view */}
        {currentView === 'main' && (
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => onPanelModeChange('lists-only')}
              className={`px-3 py-1 rounded text-sm ${
                panelMode === 'lists-only' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => onPanelModeChange('both')}
              className={`px-3 py-1 rounded text-sm ${
                panelMode === 'both' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => onPanelModeChange('calendar-only')}
              className={`px-3 py-1 rounded text-sm ${
                panelMode === 'calendar-only' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
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
          className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
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
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onViewChange('completed')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              currentView === 'completed'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Completed
          </button>
        </div>
        
        {/* Theme Toggle */}
        <button
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded hover:bg-gray-700"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}