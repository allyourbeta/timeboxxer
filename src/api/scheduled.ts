import { getSupabase } from '@/lib/supabase'

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function getScheduledTasks(date?: string) {
  const supabase = getSupabase()
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('scheduled_date', targetDate)
  
  if (error) throw error
  return data
}

export async function scheduleTask(taskId: string, date: string, startTime: string) {
  const supabase = getSupabase()
  const userId = await getCurrentUserId()
  
  // Remove existing schedule for this task if any
  await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('task_id', taskId)
  
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .insert({
      user_id: userId,
      task_id: taskId,
      scheduled_date: date,
      start_time: startTime,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function unscheduleTask(taskId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('task_id', taskId)
  if (error) throw error
}

export async function updateScheduleTime(scheduleId: string, startTime: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .update({ start_time: startTime })
    .eq('id', scheduleId)
    .select()
    .single()
  if (error) throw error
  return data
}