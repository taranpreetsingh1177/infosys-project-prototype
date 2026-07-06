-- Allow cancelled as a terminal session status (manual workflow cancellation).
alter table sessions drop constraint if exists sessions_status_check;

alter table sessions
  add constraint sessions_status_check
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled'));
