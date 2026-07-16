import { tool } from "ai";
import { z } from "zod";

import { getPatient, listPatientDocuments } from "@/lib/db";

export const listDocuments = tool({
  description:
    "List medical documents on file for a patient (metadata and short summaries only — not full extracted text).",
  inputSchema: z.object({
    patientId: z.string().describe("Patient ID"),
    limit: z.number().int().positive().max(50).optional().default(20),
  }),
  execute: async ({ patientId, limit = 20 }) => {
    const patient = await getPatient(patientId);
    if (!patient) {
      return { error: "Patient not found", patientId };
    }

    const documents = await listPatientDocuments(patientId, { limit });

    return {
      patient_id: patientId,
      patient_name: patient.name,
      documents: documents.map((d) => ({
        document_id: d.document_id,
        title: d.title,
        doc_type: d.doc_type,
        mime_type: d.mime_type,
        byte_size: d.byte_size,
        summary: d.summary ?? null,
        uploaded_at: d.uploaded_at,
        has_extracted_text: Boolean(d.extracted_text?.trim()),
      })),
    };
  },
});
