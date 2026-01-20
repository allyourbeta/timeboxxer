interface List {
  id: string
  name: string
  position: number
  is_collapsed: boolean
  is_system: boolean
  system_type: 'parked' | 'date' | null
  list_date: string | null
}

/**
 * Sort order for system lists
 * Lower number = appears first
 */
const SYSTEM_LIST_ORDER: Record<string, number> = {
  date: 1,      // Today's date list first (main workspace)
  parked: 2,    // Quick capture
}

/**
 * Sort lists for display:
 * 1. System lists first (date lists by date, then parked)
 * 2. User lists by position
 */
export function sortListsForDisplay<T extends List>(lists: T[]): T[] {
  return [...lists].sort((a, b) => {
    // System lists come first
    if (a.is_system && !b.is_system) return -1
    if (!a.is_system && b.is_system) return 1
    
    // Both system lists
    if (a.is_system && b.is_system) {
      // Date lists come first, sorted by list_date
      if (a.system_type === 'date' && b.system_type !== 'date') return -1
      if (a.system_type !== 'date' && b.system_type === 'date') return 1
      
      // Both date lists - sort by list_date (today before tomorrow)
      if (a.system_type === 'date' && b.system_type === 'date') {
        if (!a.list_date && !b.list_date) return 0
        if (!a.list_date) return 1
        if (!b.list_date) return -1
        
        // Compare dates directly (YYYY-MM-DD format)
        return a.list_date.localeCompare(b.list_date)
      }
      
      // Other system lists: only parked now
      const order: Record<string, number> = { parked: 1 }
      const orderA = order[a.system_type || ''] ?? 99
      const orderB = order[b.system_type || ''] ?? 99
      return orderA - orderB
    }
    
    // Both user lists: sort by position
    return a.position - b.position
  })
}