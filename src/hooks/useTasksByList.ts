"use client";

import { useMemo } from "react";
import { getLocalTodayISO } from "@/lib/dateList";
import { List, Task } from "@/types/app";

/**
 * Optimized hook that builds a task-to-list mapping once per render.
 * 
 * Complexity: O(n + m) where n = tasks, m = lists
 * vs. naive approach: O(n * m) for filtering tasks per list
 * 
 * Returns a function to get tasks for any list in O(1) time.
 */
export function useTasksByList(tasks: Task[], lists: List[]) {
  const tasksByListId = useMemo(() => {
    const map = new Map<string, Task[]>();
    const today = getLocalTodayISO();
    
    // Build a lookup for date lists by their list_date
    const dateListByDate = new Map<string, List>();
    for (const list of lists) {
      if (list.list_type === "date" && list.list_date) {
        dateListByDate.set(list.list_date, list);
      }
    }
    
    // Single pass through tasks
    for (const task of tasks) {
      if (task.completed_at) continue;
      
      // Determine which list(s) this task should display in
      if (task.planned_list_date) {
        // Task is soft-linked to a date - show in that date's list
        const dateList = dateListByDate.get(task.planned_list_date);
        if (dateList) {
          const existing = map.get(dateList.id) || [];
          existing.push(task);
          map.set(dateList.id, existing);
        }
      } else {
        // Task has no soft-link - show in its home list
        const existing = map.get(task.list_id) || [];
        existing.push(task);
        map.set(task.list_id, existing);
      }
      
      // For non-date lists: also show if planned_list_date is in the past
      if (task.planned_list_date && task.planned_list_date < today) {
        const existing = map.get(task.list_id) || [];
        // Avoid duplicates - only add if not already there
        if (!existing.includes(task)) {
          existing.push(task);
          map.set(task.list_id, existing);
        }
      }
    }
    
    return map;
  }, [tasks, lists]);

  // O(1) lookup instead of O(n) filter
  const getTasksForList = (list: List): Task[] => {
    return tasksByListId.get(list.id) || [];
  };

  return { getTasksForList, tasksByListId };
}
