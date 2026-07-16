import { z } from "zod";
import {
  getSession,
  listPatientDocuments,
  PATIENT_DOCS_PROMPT_LIMIT,
  PATIENT_DOCS_TEXT_TRUNCATE,
  updateSession,
} from "@/lib/db";
import type { PatientDocumentContext } from "@/lib/schema";

export async function loadPatientDocumentsExecute(input: {
  sessionId: string;
}): Promise<{
  document_count: number;
  document_ids: string[];
}> {
  "use step";

  const session = await getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const documents = await listPatientDocuments(session.patient_id, {
    limit: PATIENT_DOCS_PROMPT_LIMIT,
  });

  // Keep prompt budget bounded: store ids + summaries only (truncate text fallback).
  const patientDocuments: PatientDocumentContext[] = documents.map((doc) => ({
    document_id: doc.document_id,
    title: doc.title,
    doc_type: doc.doc_type,
    summary:
      doc.summary?.trim() ||
      (doc.extracted_text
        ? doc.extracted_text.trim().slice(0, PATIENT_DOCS_TEXT_TRUNCATE)
        : null),
  }));

  await updateSession(input.sessionId, {
    agent_metadata: {
      ...session.agent_metadata,
      edit_log: session.agent_metadata?.edit_log ?? [],
      patient_memory: session.agent_metadata?.patient_memory,
      symptom_recurrence: session.agent_metadata?.symptom_recurrence,
      patient_documents: patientDocuments,
    },
  });

  return {
    document_count: patientDocuments.length,
    document_ids: patientDocuments.map((doc) => doc.document_id),
  };
}

export const loadPatientDocumentsTool = {
  description:
    "Load recent patient medical document summaries for longitudinal clinical context.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: loadPatientDocumentsExecute,
};
