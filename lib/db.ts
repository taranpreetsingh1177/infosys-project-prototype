import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Finding,
  Insight,
  Patient,
  PatientDocument,
  PatientDocumentType,
  PatientMemoryStructured,
  PatientMemoryVersion,
  PatientWithSessionCount,
  Session,
  SourceLine,
  SymptomRecurrenceItem,
} from "@/lib/schema";

export const PATIENT_DOCS_BUCKET = "patient-docs";
export const PATIENT_DOCS_PROMPT_LIMIT = 10;
export const PATIENT_DOCS_TEXT_TRUNCATE = 2000;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return { url, key };
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const { url, key } = getSupabaseConfig();
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

export async function listPatients(): Promise<PatientWithSessionCount[]> {
  const supabase = getSupabase();
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("session_id, patient_id, visit_type, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (sessionsError) throw new Error(sessionsError.message);

  const statsByPatient = new Map<
    string,
    {
      count: number;
      last: string | null;
      recent: Array<{
        session_id: string;
        visit_type: string;
        status: Session["status"];
        created_at: string;
      }>;
    }
  >();

  for (const row of sessions ?? []) {
    const entry = statsByPatient.get(row.patient_id) ?? {
      count: 0,
      last: null,
      recent: [],
    };
    entry.count += 1;
    if (!entry.last || row.created_at > entry.last) {
      entry.last = row.created_at;
    }
    if (entry.recent.length < 3) {
      entry.recent.push({
        session_id: row.session_id,
        visit_type: row.visit_type,
        status: row.status as Session["status"],
        created_at: row.created_at,
      });
    }
    statsByPatient.set(row.patient_id, entry);
  }

  return (patients ?? []).map((patient) => {
    const stats = statsByPatient.get(patient.patient_id) ?? {
      count: 0,
      last: null,
      recent: [],
    };
    return {
      ...(patient as Patient),
      session_count: stats.count,
      last_session_at: stats.last,
      recent_sessions: stats.recent,
    };
  });
}

export async function getPatient(patientId: string): Promise<Patient | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("patients")
    .select()
    .eq("patient_id", patientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Patient | null;
}

export async function createPatient(
  patient: Omit<Patient, "created_at" | "updated_at">,
): Promise<Patient> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const row = { ...patient, created_at: now, updated_at: now };
  const { data, error } = await supabase
    .from("patients")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Patient;
}

export async function createSession(
  session: Omit<Session, "created_at" | "updated_at">,
): Promise<Session> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const row = { ...session, created_at: now, updated_at: now };

  const { data, error } = await supabase
    .from("sessions")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Session;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Session>,
): Promise<Session> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Session | null;
}

export async function listSessionsByPatient(
  patientId: string,
): Promise<Session[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

export async function listSessions(limit = 20): Promise<Session[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

export async function insertSourceLines(lines: SourceLine[]): Promise<void> {
  if (lines.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("source_lines")
    .upsert(lines, { onConflict: "line_id" });
  if (error) throw new Error(error.message);
}

export async function getSourceLines(sessionId: string): Promise<SourceLine[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("source_lines")
    .select()
    .eq("session_id", sessionId)
    .order("sequence", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as SourceLine[];
}

export async function upsertFindings(findings: Finding[]): Promise<void> {
  if (findings.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("findings")
    .upsert(findings, { onConflict: "finding_id" });
  if (error) throw new Error(error.message);
}

export async function getFindings(sessionId: string): Promise<Finding[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("findings")
    .select()
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
  return (data ?? []) as Finding[];
}

export async function upsertInsights(insights: Insight[]): Promise<void> {
  if (insights.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("insights")
    .upsert(insights, { onConflict: "insight_id" });
  if (error) throw new Error(error.message);
}

export async function getInsights(sessionId: string): Promise<Insight[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("insights")
    .select()
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
  return (data ?? []) as Insight[];
}

export async function getSessionDetail(sessionId: string) {
  const [session, source_lines, findings, insights, patient] = await Promise.all([
    getSession(sessionId),
    getSourceLines(sessionId),
    getFindings(sessionId),
    getInsights(sessionId),
    getSession(sessionId).then((s) =>
      s ? getPatient(s.patient_id) : Promise.resolve(null),
    ),
  ]);

  if (!session) return null;

  return { session, source_lines, findings, insights, patient };
}

export async function getLatestPatientMemory(
  patientId: string,
  excludeSessionId?: string,
): Promise<PatientMemoryVersion | null> {
  const supabase = getSupabase();
  let query = supabase
    .from("patient_memory_versions")
    .select()
    .eq("patient_id", patientId)
    .is("superseded_at", null)
    .order("version", { ascending: false })
    .limit(1);

  if (excludeSessionId) {
    query = query.neq("source_session_id", excludeSessionId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PatientMemoryVersion | null) ?? null;
}

export async function getPatientMemoryBySourceSession(
  sessionId: string,
): Promise<PatientMemoryVersion | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("patient_memory_versions")
    .select()
    .eq("source_session_id", sessionId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PatientMemoryVersion | null) ?? null;
}

export async function getSymptomRecurrence(
  patientId: string,
  currentSessionId: string,
): Promise<SymptomRecurrenceItem[]> {
  const supabase = getSupabase();
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("session_id")
    .eq("patient_id", patientId)
    .neq("session_id", currentSessionId);

  if (sessionsError) throw new Error(sessionsError.message);

  const sessionIds = (sessions ?? []).map((row) => row.session_id);
  if (sessionIds.length === 0) return [];

  const { data: findings, error: findingsError } = await supabase
    .from("findings")
    .select("type, session_id")
    .in("session_id", sessionIds)
    .like("type", "symptom.%")
    .eq("polarity", "present");

  if (findingsError) throw new Error(findingsError.message);

  const byType = new Map<string, Set<string>>();
  for (const finding of findings ?? []) {
    const sessionsForType = byType.get(finding.type) ?? new Set<string>();
    sessionsForType.add(finding.session_id);
    byType.set(finding.type, sessionsForType);
  }

  const recurrence: SymptomRecurrenceItem[] = [];
  for (const [finding_type, sessionIdSet] of byType) {
    if (sessionIdSet.size < 2) continue;
    recurrence.push({
      finding_type,
      session_count: sessionIdSet.size,
      session_ids: [...sessionIdSet],
    });
  }

  return recurrence;
}

export async function createPatientMemoryVersion(params: {
  patientId: string;
  sourceSessionId: string;
  summary: string;
  structured: PatientMemoryStructured;
  derivedFromSessionIds: string[];
}): Promise<PatientMemoryVersion> {
  const supabase = getSupabase();

  const { data: latest, error: latestError } = await supabase
    .from("patient_memory_versions")
    .select("version")
    .eq("patient_id", params.patientId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(latestError.message);

  const newVersion = (latest?.version ?? 0) + 1;
  const memoryId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: supersedeError } = await supabase
    .from("patient_memory_versions")
    .update({ superseded_at: now })
    .eq("patient_id", params.patientId)
    .is("superseded_at", null);

  if (supersedeError) throw new Error(supersedeError.message);

  const row = {
    memory_id: memoryId,
    patient_id: params.patientId,
    source_session_id: params.sourceSessionId,
    version: newVersion,
    summary: params.summary,
    structured: params.structured,
    derived_from_session_ids: params.derivedFromSessionIds,
    created_at: now,
  };

  const { data, error } = await supabase
    .from("patient_memory_versions")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PatientMemoryVersion;
}

export async function listPatientDocuments(
  patientId: string,
  options?: { limit?: number },
): Promise<PatientDocument[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("patient_documents")
    .select()
    .eq("patient_id", patientId)
    .order("uploaded_at", { ascending: false });

  if (options?.limit != null) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as PatientDocument[];
}

export async function getPatientDocument(
  documentId: string,
): Promise<PatientDocument | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("patient_documents")
    .select()
    .eq("document_id", documentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PatientDocument | null) ?? null;
}

export async function createPatientDocument(params: {
  documentId: string;
  patientId: string;
  title: string;
  docType: PatientDocumentType;
  mimeType: string;
  storagePath: string;
  byteSize: number;
  extractedText?: string | null;
  summary?: string | null;
}): Promise<PatientDocument> {
  const supabase = getSupabase();
  const row = {
    document_id: params.documentId,
    patient_id: params.patientId,
    title: params.title,
    doc_type: params.docType,
    mime_type: params.mimeType,
    storage_path: params.storagePath,
    byte_size: params.byteSize,
    extracted_text: params.extractedText ?? null,
    summary: params.summary ?? null,
  };

  const { data, error } = await supabase
    .from("patient_documents")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PatientDocument;
}

export async function deletePatientDocument(
  documentId: string,
): Promise<PatientDocument | null> {
  const supabase = getSupabase();
  const existing = await getPatientDocument(documentId);
  if (!existing) return null;

  const { error: storageError } = await supabase.storage
    .from(PATIENT_DOCS_BUCKET)
    .remove([existing.storage_path]);

  if (storageError) {
    // Continue with DB delete if the object is already gone.
    const missing =
      storageError.message.toLowerCase().includes("not found") ||
      storageError.message.toLowerCase().includes("does not exist");
    if (!missing) throw new Error(storageError.message);
  }

  const { error } = await supabase
    .from("patient_documents")
    .delete()
    .eq("document_id", documentId);

  if (error) throw new Error(error.message);
  return existing;
}

export async function uploadPatientDocumentFile(params: {
  storagePath: string;
  body: Buffer | ArrayBuffer | Blob | File;
  contentType: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(PATIENT_DOCS_BUCKET)
    .upload(params.storagePath, params.body, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) throw new Error(error.message);
}

export async function downloadPatientDocumentFile(
  storagePath: string,
): Promise<Blob> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(PATIENT_DOCS_BUCKET)
    .download(storagePath);

  if (error) throw new Error(error.message);
  return data;
}
