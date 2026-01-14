'use client'

interface WeekStreakProps {
  // Array of completion counts for last 7 days, oldest first
  // e.g., [2, 5, 0, 3, 8, 4, 6]
  weekData: number[]
}

export function WeekStreak({ weekData }: WeekStreakProps) {
  const maxCount = Math.max(...weekData, 1) // Avoid divide by zero
  
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay()
  // Reorder days to end with today
  const dayLabels = [...days.slice(today), ...days.slice(0, today)]
  
  return (
    <div className="flex items-end gap-1 h-6">
      {weekData.map((count, i) => {
        const height = count === 0 ? 4 : Math.max(8, (count / maxCount) * 24)
        const isToday = i === 6
        
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-2 rounded-sm transition-all ${
                isToday 
                  ? 'bg-emerald-500' 
                  : count > 0 
                    ? 'bg-emerald-500/50' 
                    : 'bg-muted'
              }`}
              style={{ height: `${height}px` }}
              title={`${count} tasks`}
            />
          </div>
        )
      })}
    </div>
  )
}