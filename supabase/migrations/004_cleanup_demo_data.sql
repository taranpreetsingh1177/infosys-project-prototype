-- Cleanup demo/seed data: remove all sessions and extra patients.
-- Keeps only the original 3 demo patients from 001_initial.sql.
-- Idempotent: safe to re-run (deletes only what exists).

-- Sessions cascade to source_lines, findings, insights (ON DELETE CASCADE).
delete from sessions;

-- Remove patients added in 003_patient_profile_fields.sql and any others.
delete from patients
where patient_id not in ('demo-patient', 'patient-priya', 'patient-amit');
