import { create } from "zustand";
import {
  getLists,
  createList as apiCreateList,
  updateList as apiUpdateList,
  deleteList as apiDeleteList,
  ensureDateList,
  getInboxList,
  getCompletedList,
  reorderList as apiReorderList,
} from "@/api";
// import { sortListsForDisplay } from '@/lib/listSort'
import { List } from "@/types/app";

interface ListStore {
  lists: List[];
  loading: boolean;

  loadLists: () => Promise<void>;
  createList: (name: string) => Promise<List>;
  updateList: (listId: string, name: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  ensureDateList: (date: string) => Promise<List>;
  getCompletedList: () => List | null;
  getInboxList: () => List | null;
  reorderList: (listId: string, targetColumn: 0 | 1, orderedListIds: string[]) => Promise<void>;
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  loading: true,

  loadLists: async () => {
    try {
      set({ loading: true });

      await getInboxList();
      await getCompletedList();

      const data = await getLists();

      // const sortedLists = sortListsForDisplay(data || [])
      const sortedLists = data || [];

      set({ lists: sortedLists, loading: false });
    } catch (err) {
      console.error("💥 [useListStore] loadLists failed:", err);
      set({ loading: false });
      throw err;
    }
  },

  createList: async (name) => {
    const newList = await apiCreateList(name);
    set({ lists: [...get().lists, newList] });
    return newList;
  },

  updateList: async (listId, name) => {
    await apiUpdateList(listId, name);
    set({
      lists: get().lists.map((l) => (l.id === listId ? { ...l, name } : l)),
    });
  },

  deleteList: async (listId) => {
    await apiDeleteList(listId);
    set({ lists: get().lists.filter((l) => l.id !== listId) });
  },

  ensureDateList: async (date) => {
    const list = await ensureDateList(date);
    const currentLists = get().lists;
    if (!currentLists.find((l) => l.id === list.id)) {
      set({ lists: [...currentLists, list] });
    }
    return list;
  },

  getCompletedList: () => {
    return get().lists.find((l) => l.list_type === "completed") || null;
  },

  getInboxList: () => {
    return get().lists.find((l) => l.list_type === "inbox") || null;
  },

  reorderList: async (listId, targetColumn, orderedListIds) => {
    const POSITION_GAP = 1000;
    
    // Optimistic update
    set((state) => ({
      lists: state.lists.map((list) => {
        // Update the moved list's column
        if (list.id === listId) {
          const newIndex = orderedListIds.indexOf(listId);
          return { 
            ...list, 
            panel_column: targetColumn, 
            position: (newIndex + 1) * POSITION_GAP 
          };
        }
        // Update positions for other lists in target column
        const index = orderedListIds.indexOf(list.id);
        if (index !== -1) {
          return { ...list, position: (index + 1) * POSITION_GAP };
        }
        return list;
      }),
    }));

    try {
      await apiReorderList(listId, targetColumn, orderedListIds);
    } catch (error) {
      console.error("reorderList failed:", error);
      await get().loadLists();
      throw error;
    }
  },
}));
