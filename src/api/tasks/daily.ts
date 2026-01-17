import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION, getRandomColorIndex } from '@/lib/constants'

export async function spawnDailyTasks(todayListId: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Get all daily tasks that haven't been spawned today
  const { data: dailyTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_daily', true)
    .is('daily_source_id', null) // Original daily tasks, not spawned instances
  
  if (!dailyTasks || dailyTasks.length === 0) return []
  
  // Check which ones already have today's instance
  const { data: existingToday } = await supabase
    .from('tasks')
    .select('daily_source_id')
    .eq('list_id', todayListId)
    .not('daily_source_id', 'is', null)
  
  const alreadySpawnedIds = new Set(existingToday?.map((t: any) => t.daily_source_id) || [])
  
  // Spawn new instances for tasks not yet spawned today
  const toSpawn = dailyTasks.filter((t: any) => !alreadySpawnedIds.has(t.id))
  
  if (toSpawn.length === 0) return []
  
  const newTasks = toSpawn.map((task: any) => ({
    user_id: userId,
    list_id: todayListId,
    title: task.title,
    duration_minutes: task.duration_minutes,
    color_index: task.color_index,
    is_daily: false, // Spawned instance is not itself daily
    daily_source_id: task.id, // Reference to original daily task
    position: task.position,
  }))
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(newTasks)
    .select()
  
  if (error) throw error
  return data
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