-- Migration: Add panel_column to lists for two-column layout
-- This allows users to explicitly place lists in left (0) or right (1) column

-- Add panel_column field (0 = left, 1 = right)
ALTER TABLE lists ADD COLUMN IF NOT EXISTS panel_column INTEGER DEFAULT 0;

-- Add constraint to ensure valid values
ALTER TABLE lists ADD CONSTRAINT lists_panel_column_check 
  CHECK (panel_column IN (0, 1));

-- Backfill existing lists: alternate columns based on current position
-- This gives a reasonable starting layout
UPDATE lists
SET panel_column = CASE 
  WHEN position IS NULL THEN 0
  WHEN position % 2 = 0 THEN 0 
  ELSE 1 
END
WHERE panel_column IS NULL OR panel_column = 0;

-- Create index for efficient queries by user + column + position
CREATE INDEX IF NOT EXISTS idx_lists_user_column_position 
  ON lists(user_id, panel_column, position);
