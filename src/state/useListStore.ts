import { create } from 'zustand'
import { getLists, createList as apiCreateList, updateList as apiUpdateList, deleteList as apiDeleteList, ensureTodayList, ensureTomorrowList } from '@/api'
import { duplicateList as apiDuplicateList } from '@/api/tasks/operations'
import { sortListsForDisplay } from '@/lib/listSort'
import { List } from '@/types/app'

interface ListStore {
  lists: List[]
  loading: boolean
  
  loadLists: () => Promise<void>
  createList: (name: string) => Promise<List>
  updateList: (listId: string, name: string) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  duplicateList: (listId: string, newName: string) => Promise<void>
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  loading: true,
  
  loadLists: async () => {
    console.log('📚 [useListStore] loadLists called')
    try {
      set({ loading: true })
      
      console.log('📅 [useListStore] Ensuring today and tomorrow lists exist...')
      await ensureTodayList()
      await ensureTomorrowList()
      
      console.log('📋 [useListStore] Fetching all lists...')
      const data = await getLists()
      
      console.log('🔄 [useListStore] Sorting lists for display...')
      const sortedLists = sortListsForDisplay(data || [])
      
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
  
  duplicateList: async (listId, newName) => {
    const newListId = await apiDuplicateList(listId, newName)
    // Reload lists to get the new one with tasks
    await get().loadLists()
  },
}))