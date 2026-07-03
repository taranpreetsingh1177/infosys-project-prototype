-- Versioned patient memory (replaces Neo4j graph RAG for longitudinal context)

create table if not exists patient_memory_versions (
  memory_id text primary key,
  patient_id text not null references patients(patient_id) on delete cascade,
  source_session_id text not null references sessions(session_id) on delete cascade,
  version int not null,
  summary text not null,
  structured jsonb not null default '{}',
  derived_from_session_ids text[] not null default '{}',
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (patient_id, version)
);

create index if not exists idx_memory_patient_latest
  on patient_memory_versions (patient_id, created_at desc)
  where superseded_at is null;

create index if not exists idx_memory_patient_id
  on patient_memory_versions (patient_id);
