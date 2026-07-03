-- AI Clinical Scribe — initial schema (sessions)

create extension if not exists "pgcrypto";

create table if not exists patients (
  patient_id text primary key,
  name text not null,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  session_id text primary key,
  patient_id text not null references patients(patient_id) on delete cascade,
  visit_type text not null default 'general_adult_outpatient',
  input_type text not null check (input_type in ('transcript', 'doctor_notes', 'pdf')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  workflow_run_id text,
  soap jsonb,
  flags jsonb,
  agent_metadata jsonb default '{"edit_log": []}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists source_lines (
  line_id text primary key,
  session_id text not null references sessions(session_id) on delete cascade,
  speaker text not null,
  text text not null,
  sequence integer not null,
  unique (session_id, sequence)
);

create table if not exists findings (
  finding_id text primary key,
  session_id text not null references sessions(session_id) on delete cascade,
  type text not null,
  value text not null,
  polarity text not null check (polarity in ('present', 'absent', 'denied', 'uncertain')),
  temporality text not null check (temporality in ('current', 'historical', 'resolved', 'unknown')),
  confidence real not null check (confidence >= 0 and confidence <= 1),
  source_lines text[] not null default '{}',
  asserted_by text not null default 'unknown',
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'contradicted'))
);

create table if not exists insights (
  insight_id text primary key,
  session_id text not null references sessions(session_id) on delete cascade,
  type text not null check (type in ('omission_risk', 'longitudinal_pattern', 'safety_triage', 'completeness', 'general')),
  summary text not null,
  confidence real not null check (confidence >= 0 and confidence <= 1),
  source_lines text[] not null default '{}',
  graph_context_used boolean not null default false,
  clinician_action text
);

create index if not exists idx_sessions_patient on sessions(patient_id);
create index if not exists idx_sessions_status on sessions(status);
create index if not exists idx_source_lines_session on source_lines(session_id);
create index if not exists idx_findings_session on findings(session_id);
create index if not exists idx_findings_type on findings(type);
create index if not exists idx_insights_session on insights(session_id);

insert into patients (patient_id, name, date_of_birth)
values
  ('demo-patient', 'Rajesh Sharma', '1978-03-15'),
  ('patient-priya', 'Priya Nair', '1985-11-02'),
  ('patient-amit', 'Amit Patel', '1990-07-22')
on conflict (patient_id) do nothing;
