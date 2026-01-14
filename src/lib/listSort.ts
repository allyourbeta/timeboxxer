interface List {
  id: string
  name: string
  position: number
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
  purgatory: 3, // Scheduled tasks holding area
}

/**
 * Sort lists for display:
 * 1. System lists first (date → parked → purgatory)
 * 2. User lists by position
 */
export function sortListsForDisplay<T extends List>(lists: T[]): T[] {
  return [...lists].sort((a, b) => {
    // System lists come first
    if (a.is_system && !b.is_system) return -1
    if (!a.is_system && b.is_system) return 1
    
    // Both system lists: sort by system_type order
    if (a.is_system && b.is_system) {
      const orderA = SYSTEM_LIST_ORDER[a.system_type || ''] ?? 99
      const orderB = SYSTEM_LIST_ORDER[b.system_type || ''] ?? 99
      return orderA - orderB
    }
    
    // Both user lists: sort by position
    return a.position - b.position
  })
}