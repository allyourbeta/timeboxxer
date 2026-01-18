import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'

export async function getScheduledTasks(date?: string) {
  const supabase = createClient()
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('scheduled_date', targetDate)
  
  if (error) throw error
  return data
}

export async function scheduleTask(taskId: string, date: string, startTime: string): Promise<{ id: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('schedule_task', {
    p_task_id: taskId,
    p_date: date,
    p_start_time: startTime
  })
  if (error) throw error
  return { id: data as string }
}

export async function unscheduleTask(taskId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('task_id', taskId)
  if (error) throw error
}

export async function updateScheduleTime(scheduleId: string, startTime: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .update({ start_time: startTime })
    .eq('id', scheduleId)
    .select()
    .single()
  if (error) throw error
  return data
}