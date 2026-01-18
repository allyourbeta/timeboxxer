import { createClient } from '@/utils/supabase/client'

export async function getNextPositionInList(listId: string): Promise<number> {
  const supabase = createClient()
  
  const { data } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
  
  return (data?.[0]?.position ?? -1) + 1
}