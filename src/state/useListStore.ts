import { create } from 'zustand'
import { 
  getLists, 
  createList as apiCreateList, 
  updateList as apiUpdateList, 
  deleteList as apiDeleteList, 
  ensureDateList,
  getParkedList,
  getCompletedList 
} from '@/api'
// import { sortListsForDisplay } from '@/lib/listSort'
import { List } from '@/types/app'

interface ListStore {
  lists: List[]
  loading: boolean
  
  loadLists: () => Promise<void>
  createList: (name: string) => Promise<List>
  updateList: (listId: string, name: string) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  ensureDateList: (date: string) => Promise<List>
  getCompletedList: () => List | null
  getParkedList: () => List | null
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  loading: true,
  
  loadLists: async () => {
    console.log('📚 [useListStore] loadLists called')
    try {
      set({ loading: true })
      
      console.log('📅 [useListStore] Ensuring system lists exist...')
      await getParkedList()
      await getCompletedList()
      
      console.log('📋 [useListStore] Fetching all lists...')
      const data = await getLists()
      
      console.log('🔄 [useListStore] Sorting lists for display...')
      // const sortedLists = sortListsForDisplay(data || [])
      const sortedLists = data || []
      
      console.log('✅ [useListStore] Lists loaded and sorted:', { count: sortedLists.length })
      set({ lists: sortedLists, loading: false })
    } catch (err) {
      console.error('💥 [useListStore] loadLists failed:', err)
      set({ loading: false })
      throw err
    }
  },
  
  createList: async (name) => {
    const newList = await apiCreateList(name)
    set({ lists: [...get().lists, newList] })
    return newList
  },
  
  updateList: async (listId, name) => {
    await apiUpdateList(listId, name)
    set({
      lists: get().lists.map(l => 
        l.id === listId ? { ...l, name } : l
      )
    })
  },
  
  deleteList: async (listId) => {
    await apiDeleteList(listId)
    set({ lists: get().lists.filter(l => l.id !== listId) })
  },
  
  ensureDateList: async (date) => {
    const list = await ensureDateList(date)
    const currentLists = get().lists
    if (!currentLists.find(l => l.id === list.id)) {
      set({ lists: [...currentLists, list] })
    }
    return list
  },
  
  getCompletedList: () => {
    return get().lists.find(l => l.list_type === 'completed') || null
  },
  
  getParkedList: () => {
    return get().lists.find(l => l.list_type === 'parked') || null
  },
}))