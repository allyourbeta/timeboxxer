'use client'

interface HeaderProps {
  currentView: 'main' | 'completed'
  onViewChange: (view: 'main' | 'completed') => void
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  return (
    <header className="p-4 border-b border-gray-700 flex items-center justify-between">
      <h1 className="text-xl font-bold">Timeboxxer</h1>
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
    </header>
  )
}