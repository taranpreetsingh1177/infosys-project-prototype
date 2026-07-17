import { tool } from "ai";
import { z } from "zod";

import { getSessionDetail } from "@/lib/db";

export const getSessionSummary = tool({
  description:
    "Load a session summary: patient demographics, visit metadata, SOAP narratives, and key findings. Requires clinician approval before returning PHI.",
  inputSchema: z.object({
    sessionId: z.string().describe("Session ID to summarize"),
  }),
  needsApproval: true,
  execute: async ({ sessionId }) => {
    const detail = await getSessionDetail(sessionId);
    if (!detail) {
      return { error: "Session not found", sessionId };
    }

    const { session, findings, insights, patient } = detail;
    const soap = session.soap;

    return {
      session_id: session.session_id,
      patient: patient
        ? {
            patient_id: patient.patient_id,
            name: patient.name,
            mrn: patient.mrn ?? null,
            date_of_birth: patient.date_of_birth ?? null,
          }
        : null,
      visit_type: session.visit_type,
      status: session.status,
      created_at: session.created_at,
      soap: soap
        ? {
            subjective: soap.subjective?.narrative ?? null,
            objective: soap.objective?.narrative ?? null,
            assessment: soap.assessment?.narrative ?? null,
            plan: soap.plan?.narrative ?? null,
          }
        : null,
      findings: findings.map((f) => ({
        type: f.type,
        value: f.value,
        polarity: f.polarity,
        verification_status: f.verification_status,
      })),
      insights: insights.map((i) => ({
        type: i.type,
        summary: i.summary,
      })),
    };
  },
});
