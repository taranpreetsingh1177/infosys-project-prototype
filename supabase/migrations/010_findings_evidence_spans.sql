-- Add verbatim evidence spans for finding verification grounding.
alter table findings
  add column if not exists evidence_spans text[] not null default '{}';
