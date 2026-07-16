import { tool } from "ai";
import { z } from "zod";

import { getPatient, getPatientDocument } from "@/lib/db";

export const readDocument = tool({
  description:
    "Read the full extracted text of a patient medical document. Always requires clinician approval before returning PHI content.",
  inputSchema: z.object({
    documentId: z.string().describe("Document ID"),
  }),
  needsApproval: true,
  execute: async ({ documentId }) => {
    const document = await getPatientDocument(documentId);
    if (!document) {
      return { error: "Document not found", documentId };
    }

    const patient = await getPatient(document.patient_id);

    return {
      document_id: document.document_id,
      patient_id: document.patient_id,
      patient_name: patient?.name ?? null,
      title: document.title,
      doc_type: document.doc_type,
      mime_type: document.mime_type,
      summary: document.summary ?? null,
      uploaded_at: document.uploaded_at,
      extracted_text: document.extracted_text ?? null,
    };
  },
});
