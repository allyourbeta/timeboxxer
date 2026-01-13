import { getSupabase } from '@/lib/supabase'

const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'

export async function getLists() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('position')
  if (error) throw error
  return data
}

export async function createList(name: string) {
  const supabase = getSupabase()
  
  const { data: existing } = await supabase
    .from('lists')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: DEV_USER_ID,
      name,
      position: nextPosition,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateList(listId: string, name: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('lists')
    .update({ name })
    .eq('id', listId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteList(listId: string) {
  const supabase = getSupabase()
  // Tasks will have list_id set to NULL due to ON DELETE SET NULL
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)
  if (error) throw error
}

export async function duplicateList(listId: string, newName: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .rpc('duplicate_list', { p_list_id: listId, p_new_name: newName })
  if (error) throw error
  return data
}