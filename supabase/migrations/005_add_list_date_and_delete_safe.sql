-- Add list_date column for date lists
ALTER TABLE lists ADD COLUMN IF NOT EXISTS list_date DATE;

-- Create safe delete list function that respects system list rules
CREATE OR REPLACE FUNCTION delete_list_safe(p_list_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_system_type TEXT;
  v_list_date DATE;
  v_grab_bag_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify ownership and get list info
  SELECT system_type, list_date INTO v_system_type, v_list_date
  FROM lists 
  WHERE id = p_list_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found or not owned by user';
  END IF;
  
  -- Block Parked Items (always protected)
  IF v_system_type = 'parked' THEN
    RAISE EXCEPTION 'Cannot delete system lists';
  END IF;
  
  -- Block today and future date lists
  IF v_system_type = 'date' AND v_list_date >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot delete current or future date lists';
  END IF;
  
  -- Past date lists and user lists: allow deletion
  -- First, find or create grab bag to reassign orphaned tasks
  SELECT id INTO v_grab_bag_id 
  FROM lists 
  WHERE user_id = v_user_id 
    AND system_type = 'parked'
  LIMIT 1;
  
  IF v_grab_bag_id IS NULL THEN
    RAISE EXCEPTION 'Parked list not found - cannot reassign tasks';
  END IF;
  
  -- Move any tasks from this list to the grab bag
  UPDATE tasks 
  SET home_list_id = v_grab_bag_id,
      updated_at = NOW()
  WHERE home_list_id = p_list_id 
    AND user_id = v_user_id;
  
  -- Delete the list
  DELETE FROM lists 
  WHERE id = p_list_id 
    AND user_id = v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION delete_list_safe(UUID) TO authenticated;