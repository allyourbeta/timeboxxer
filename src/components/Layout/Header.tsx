'use client'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
}

export function Header({ currentView, panelMode, onViewChange, onPanelModeChange }: HeaderProps) {
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
      </div>
    </header>
  )
}