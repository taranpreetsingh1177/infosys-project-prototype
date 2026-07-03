-- Extend patients with profile fields for Harvey-style patient list

alter table patients
  add column if not exists mrn text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists gender text check (gender in ('male', 'female', 'other', 'unknown')),
  add column if not exists status text not null default 'active' check (status in ('active', 'inactive', 'new', 'archived'));

create unique index if not exists idx_patients_mrn on patients(mrn) where mrn is not null;

-- Enrich existing demo patients
update patients set
  mrn = 'MRN-10042',
  phone = '+91 98765 43210',
  email = 'rajesh.sharma@email.com',
  gender = 'male',
  status = 'active',
  updated_at = now()
where patient_id = 'demo-patient';

update patients set
  mrn = 'MRN-10087',
  phone = '+91 98234 56789',
  email = 'priya.nair@email.com',
  gender = 'female',
  status = 'active',
  updated_at = now()
where patient_id = 'patient-priya';

update patients set
  mrn = 'MRN-10103',
  phone = '+91 97654 32109',
  email = 'amit.patel@email.com',
  gender = 'male',
  status = 'new',
  updated_at = now()
where patient_id = 'patient-amit';

-- Additional demo patients
insert into patients (patient_id, name, date_of_birth, mrn, phone, email, gender, status)
values
  ('patient-kavita', 'Kavita Deshmukh', '1972-08-19', 'MRN-10015', '+91 98123 45678', 'kavita.deshmukh@email.com', 'female', 'active'),
  ('patient-suresh', 'Suresh Menon', '1965-01-30', 'MRN-10028', '+91 98987 65432', 'suresh.menon@email.com', 'male', 'active'),
  ('patient-ananya', 'Ananya Iyer', '1993-12-05', 'MRN-10119', '+91 99001 22334', 'ananya.iyer@email.com', 'female', 'inactive')
on conflict (patient_id) do update set
  mrn = excluded.mrn,
  phone = excluded.phone,
  email = excluded.email,
  gender = excluded.gender,
  status = excluded.status,
  updated_at = now();

-- Demo sessions for patient list (idempotent)
insert into sessions (session_id, patient_id, visit_type, input_type, status, created_at, updated_at)
values
  ('session-rajesh-1', 'demo-patient', 'follow_up', 'transcript', 'completed', '2026-01-15T10:00:00Z', '2026-01-15T10:30:00Z'),
  ('session-rajesh-2', 'demo-patient', 'general_adult_outpatient', 'transcript', 'completed', '2026-04-02T14:00:00Z', '2026-04-02T14:45:00Z'),
  ('session-rajesh-3', 'demo-patient', 'follow_up', 'transcript', 'completed', '2026-06-30T09:00:00Z', '2026-06-30T09:40:00Z'),
  ('session-priya-1', 'patient-priya', 'general_adult_outpatient', 'transcript', 'completed', '2026-05-12T11:00:00Z', '2026-05-12T11:35:00Z'),
  ('session-kavita-1', 'patient-kavita', 'chronic_care', 'transcript', 'completed', '2026-06-18T08:30:00Z', '2026-06-18T09:15:00Z'),
  ('session-kavita-2', 'patient-kavita', 'follow_up', 'transcript', 'processing', '2026-07-01T10:00:00Z', '2026-07-01T10:05:00Z'),
  ('session-suresh-1', 'patient-suresh', 'general_adult_outpatient', 'doctor_notes', 'completed', '2026-03-22T15:00:00Z', '2026-03-22T15:20:00Z'),
  ('session-ananya-1', 'patient-ananya', 'general_adult_outpatient', 'transcript', 'completed', '2025-11-08T13:00:00Z', '2025-11-08T13:30:00Z')
on conflict (session_id) do nothing;
