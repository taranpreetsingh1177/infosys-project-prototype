-- Align insights memory columns with patient memory (replaces graph_context_used)

alter table insights
  rename column graph_context_used to memory_context_used;

alter table insights
  add column if not exists memory_reason text,
  add column if not exists memory_fields_used text[] not null default '{}';
