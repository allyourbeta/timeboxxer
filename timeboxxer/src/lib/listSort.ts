interface List {
  id: string
  name: string
  position: number
  is_collapsed: boolean
  is_system: boolean
  system_type: 'purgatory' | 'parked' | 'date' | null
}

/**
 * Sort order for system lists
 * Lower number = appears first
 */
const SYSTEM_LIST_ORDER: Record<string, number> = {
  date: 1,      // Today's date list first (main workspace)
  parked: 2,    // Quick capture
  purgatory: 3, // Limbo - Scheduled tasks holding area
}

/**
 * Sort lists for display:
 * 1. System lists first (date lists by date, then parked, then limbo)
 * 2. User lists by position
 */
export function sortListsForDisplay<T extends List>(lists: T[]): T[] {
  return [...lists].sort((a, b) => {
    // System lists come first
    if (a.is_system && !b.is_system) return -1
    if (!a.is_system && b.is_system) return 1
    
    // Both system lists
    if (a.is_system && b.is_system) {
      // Date lists come first, sorted by name (which is the date)
      if (a.system_type === 'date' && b.system_type !== 'date') return -1
      if (a.system_type !== 'date' && b.system_type === 'date') return 1
      
      // Both date lists - sort by date (today before tomorrow)
      if (a.system_type === 'date' && b.system_type === 'date') {
        // Parse the date from the name and compare
        const dateA = new Date(a.name)
        const dateB = new Date(b.name)
        return dateA.getTime() - dateB.getTime()
      }
      
      // Other system lists: parked before limbo
      const order: Record<string, number> = { parked: 1, purgatory: 2 } // purgatory = limbo in UI
      const orderA = order[a.system_type || ''] ?? 99
      const orderB = order[b.system_type || ''] ?? 99
      return orderA - orderB
    }
    
    // Both user lists: sort by position
    return a.position - b.position
  })
}