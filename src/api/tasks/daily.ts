import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION, getRandomColorIndex } from '@/lib/constants'

export async function spawnDailyTasks(todayListId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('spawn_daily_tasks', {
    p_today_list_id: todayListId
  })
  if (error) throw error
  return data as number
}

export async function createParkedThought(title: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Fetch the parked list ID dynamically (system_type = 'parked')
  const { data: parkedList, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('system_type', 'parked')
    .eq('user_id', userId)
    .single()
  
  if (listError || !parkedList) {
    console.error('Could not find TBD Grab Bag list:', listError)
    throw new Error('TBD Grab Bag list not found')
  }
  
  // Get max position in the parked list
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', parkedList.id)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (maxPosData?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      list_id: parkedList.id,
      title,
      duration_minutes: DEFAULT_TASK_DURATION,
      color_index: getRandomColorIndex(),
      position: nextPosition,
      is_completed: false,
      is_daily: false,
      is_daily_highlight: false,
      energy_level: 'medium',
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}