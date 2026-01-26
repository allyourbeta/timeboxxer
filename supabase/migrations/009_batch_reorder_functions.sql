-- ============================================================================
-- BATCH REORDER FUNCTIONS
-- Migration: 009_batch_reorder_functions.sql
-- 
-- Provides atomic batch position updates for tasks and lists.
-- Reduces N network round-trips to 1 for drag-and-drop reordering.
-- ============================================================================

-- =============================================================================
-- BATCH UPDATE TASK POSITIONS
-- =============================================================================
-- Updates positions for multiple tasks in a single transaction.
-- Used when reordering tasks within a list or moving a task between lists.
--
-- @param p_task_ids UUID[] - Array of task IDs in desired order
-- @param p_positions INT[] - Array of corresponding positions (parallel to task_ids)
-- @returns void
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_update_task_positions(
  p_task_ids UUID[],
  p_positions INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_now := NOW();
  
  -- Validate arrays have same length
  IF array_length(p_task_ids, 1) != array_length(p_positions, 1) THEN
    RAISE EXCEPTION 'task_ids and positions arrays must have same length';
  END IF;
  
  -- Update all tasks in a single statement
  -- Uses unnest to join arrays with their indices
  UPDATE tasks t
  SET 
    position = u.new_position,
    updated_at = v_now
  FROM (
    SELECT 
      unnest(p_task_ids) AS task_id,
      unnest(p_positions) AS new_position
  ) u
  WHERE t.id = u.task_id
    AND t.user_id = v_user_id;
    
  -- Verify all tasks were updated (owned by user)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tasks updated - verify ownership';
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_task_positions(UUID[], INT[]) TO authenticated;


-- =============================================================================
-- BATCH UPDATE LIST POSITIONS
-- =============================================================================
-- Updates positions and optionally column for multiple lists in a single transaction.
-- Used when reordering lists within a column or moving between columns.
--
-- @param p_moved_list_id UUID - The list being moved (will have its column updated)
-- @param p_target_column INT - Column to move the list to (0 = left, 1 = right)
-- @param p_list_ids UUID[] - Array of list IDs in the target column in desired order
-- @param p_positions INT[] - Array of corresponding positions
-- @returns void
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_update_list_positions(
  p_moved_list_id UUID,
  p_target_column INT,
  p_list_ids UUID[],
  p_positions INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_now := NOW();
  
  -- Validate column value
  IF p_target_column NOT IN (0, 1) THEN
    RAISE EXCEPTION 'target_column must be 0 or 1';
  END IF;
  
  -- Validate arrays have same length
  IF array_length(p_list_ids, 1) != array_length(p_positions, 1) THEN
    RAISE EXCEPTION 'list_ids and positions arrays must have same length';
  END IF;
  
  -- First, update the moved list's column
  UPDATE lists
  SET 
    panel_column = p_target_column,
    updated_at = v_now
  WHERE id = p_moved_list_id
    AND user_id = v_user_id;
  
  -- Then update all list positions in target column
  UPDATE lists l
  SET 
    position = u.new_position,
    updated_at = v_now
  FROM (
    SELECT 
      unnest(p_list_ids) AS list_id,
      unnest(p_positions) AS new_position
  ) u
  WHERE l.id = u.list_id
    AND l.user_id = v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_list_positions(UUID, INT, UUID[], INT[]) TO authenticated;


-- =============================================================================
-- MOVE TASK WITH POSITION (ATOMIC)
-- =============================================================================
-- Moves a task to a new list AND updates positions in one transaction.
-- Replaces the two-step move + reorder pattern.
--
-- @param p_task_id UUID - The task being moved
-- @param p_new_list_id UUID - Destination list
-- @param p_task_ids UUID[] - All tasks in destination list in new order
-- @param p_positions INT[] - Corresponding positions
-- @returns void
-- =============================================================================
CREATE OR REPLACE FUNCTION move_task_with_positions(
  p_task_id UUID,
  p_new_list_id UUID,
  p_task_ids UUID[],
  p_positions INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_now := NOW();
  
  -- Validate arrays have same length
  IF array_length(p_task_ids, 1) != array_length(p_positions, 1) THEN
    RAISE EXCEPTION 'task_ids and positions arrays must have same length';
  END IF;
  
  -- Verify destination list belongs to user
  IF NOT EXISTS (SELECT 1 FROM lists WHERE id = p_new_list_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Destination list not found or not owned by user';
  END IF;
  
  -- Move the task to new list (clears soft-link and schedule)
  UPDATE tasks
  SET 
    list_id = p_new_list_id,
    planned_list_date = NULL,
    calendar_slot_time = NULL,
    updated_at = v_now
  WHERE id = p_task_id
    AND user_id = v_user_id;
  
  -- Update positions for all tasks in destination list
  UPDATE tasks t
  SET 
    position = u.new_position,
    updated_at = v_now
  FROM (
    SELECT 
      unnest(p_task_ids) AS task_id,
      unnest(p_positions) AS new_position
  ) u
  WHERE t.id = u.task_id
    AND t.user_id = v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION move_task_with_positions(UUID, UUID, UUID[], INT[]) TO authenticated;