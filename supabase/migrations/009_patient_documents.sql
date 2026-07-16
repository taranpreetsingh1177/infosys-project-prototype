-- Patient-scoped medical documents (labs, imaging, referrals, etc.)

create table if not exists patient_documents (
  document_id text primary key,
  patient_id text not null references patients(patient_id) on delete cascade,
  title text not null,
  doc_type text not null check (doc_type in ('lab', 'imaging', 'referral', 'discharge', 'other')),
  mime_type text not null,
  storage_path text not null,
  byte_size int not null check (byte_size >= 0),
  extracted_text text,
  summary text,
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_patient_documents_patient_uploaded
  on patient_documents (patient_id, uploaded_at desc);

-- Private storage bucket for document binaries (service role uploads/downloads)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-docs',
  'patient-docs',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do nothing;
