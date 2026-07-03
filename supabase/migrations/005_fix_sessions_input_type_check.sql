-- Fix stale encounters_input_type_check constraint after encounters -> sessions rename.
-- The old constraint only allowed ('transcript', 'doctor_notes'); app now uses 'pdf' too.

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS encounters_input_type_check;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_input_type_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_input_type_check
  CHECK (input_type IN ('transcript', 'doctor_notes', 'pdf'));
