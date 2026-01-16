-- Rename Purgatory to Limbo
UPDATE lists 
SET name = 'Limbo' 
WHERE system_type = 'purgatory' AND name = 'Purgatory';