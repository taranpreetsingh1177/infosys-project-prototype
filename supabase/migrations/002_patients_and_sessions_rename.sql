-- Patients table + rename encounters -> sessions

create table if not exists patients (
  patient_id text primary key,
  name text not null,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rename existing encounter tables/columns (idempotent guards)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'encounters'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'sessions'
  ) then
    alter table encounters rename to sessions;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sessions' and column_name = 'encounter_id'
  ) then
    alter table sessions rename column encounter_id to session_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'source_lines' and column_name = 'encounter_id'
  ) then
    alter table source_lines rename column encounter_id to session_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'findings' and column_name = 'encounter_id'
  ) then
    alter table findings rename column encounter_id to session_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'insights' and column_name = 'encounter_id'
  ) then
    alter table insights rename column encounter_id to session_id;
  end if;
end $$;

-- Rename indexes when present
alter index if exists idx_encounters_patient rename to idx_sessions_patient;
alter index if exists idx_encounters_status rename to idx_sessions_status;
alter index if exists idx_source_lines_encounter rename to idx_source_lines_session;
alter index if exists idx_findings_encounter rename to idx_findings_session;
alter index if exists idx_insights_encounter rename to idx_insights_session;

-- Seed demo patients
insert into patients (patient_id, name, date_of_birth)
values
  ('demo-patient', 'Rajesh Sharma', '1978-03-15'),
  ('patient-priya', 'Priya Nair', '1985-11-02'),
  ('patient-amit', 'Amit Patel', '1990-07-22')
on conflict (patient_id) do nothing;
