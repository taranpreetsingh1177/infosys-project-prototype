import { tool } from "ai";
import { z } from "zod";

import {
  getPatient,
  listSessions,
  listSessionsByPatient,
} from "@/lib/db";

export const searchSessions = tool({
  description:
    "Search clinical sessions by patient, visit type, or status. Returns session metadata only (no SOAP/PHI narratives).",
  inputSchema: z.object({
    patientId: z
      .string()
      .optional()
      .describe("Limit results to this patient ID"),
    query: z
      .string()
      .optional()
      .describe("Optional filter on visit type or status"),
    limit: z.number().int().positive().max(50).optional().default(20),
  }),
  execute: async ({ patientId, query, limit = 20 }) => {
    const sessions = patientId
      ? await listSessionsByPatient(patientId)
      : await listSessions(Math.max(limit, 50));

    const q = query?.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(
          (s) =>
            s.visit_type.toLowerCase().includes(q) ||
            s.status.toLowerCase().includes(q) ||
            s.session_id.toLowerCase().includes(q),
        )
      : sessions;

    const sliced = filtered.slice(0, limit);
    const patientNames = new Map<string, string>();

    await Promise.all(
      [...new Set(sliced.map((s) => s.patient_id))].map(async (id) => {
        const patient = await getPatient(id);
        if (patient) patientNames.set(id, patient.name);
      }),
    );

    return {
      sessions: sliced.map((s) => ({
        session_id: s.session_id,
        patient_id: s.patient_id,
        patient_name: patientNames.get(s.patient_id) ?? null,
        visit_type: s.visit_type,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
    };
  },
});
