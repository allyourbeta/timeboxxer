# Spec: Update delete_list_safe RPC to Allow Past Date Lists

## Problem

The frontend now allows deleting past date lists, but the database RPC function `delete_list_safe` rejects them with error: `'Cannot delete system lists'`.

The RPC has its own protection logic that doesn't account for past date lists being deletable.

## Solution

Update the `delete_list_safe` function to allow deleting date lists where the date is in the past.

## Current Logic (assumed)

```sql
-- Probably something like:
IF (SELECT is_system FROM lists WHERE id = p_list_id) THEN
  RAISE EXCEPTION 'Cannot delete system lists';
END IF;
```

## New Logic

```sql
-- Get the list details
SELECT is_system, system_type, list_date 
INTO v_is_system, v_system_type, v_list_date
FROM lists WHERE id = p_list_id;

-- Block Parked Items (always protected)
IF v_system_type = 'parked' THEN
  RAISE EXCEPTION 'Cannot delete system lists';
END IF;

-- Block today and future date lists
IF v_system_type = 'date' AND v_list_date >= CURRENT_DATE THEN
  RAISE EXCEPTION 'Cannot delete current or future date lists';
END IF;

-- Allow: past date lists and user-created lists
-- Continue with deletion...
```

## Steps for Claude Code

1. Find the function:
```bash
grep -rn "delete_list_safe" supabase/
```

2. Look at the current implementation

3. Update the logic to:
   - Block if `system_type = 'parked'`
   - Block if `system_type = 'date'` AND `list_date >= CURRENT_DATE`
   - Allow all other cases (past date lists, user lists)

4. Create a new migration file if needed, or update existing

5. Apply the migration locally:
```bash
supabase db push
```
Or if using migrations:
```bash
supabase migration up
```

## Testing

1. Try to delete a past date list → Should succeed
2. Try to delete today's date list → Should fail with error
3. Try to delete Parked Items → Should fail with error
4. Try to delete a user-created empty list → Should succeed

## Git Commit

```bash
git add -A && git commit -m "fix: allow delete_list_safe RPC to delete past date lists

- Block deletion of Parked Items (system_type = 'parked')
- Block deletion of today/future date lists
- Allow deletion of past date lists
- Allow deletion of user-created lists"
```
