import { tool } from "ai";
import { z } from "zod";

import { listPatients as listPatientsFromDb } from "@/lib/db";

export const listPatients = tool({
  description:
    "List patients with name, MRN, status, and recent session counts. Use to find a patient before diving into sessions or documents.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe("Optional name or MRN filter (case-insensitive substring)"),
    limit: z.number().int().positive().max(50).optional().default(20),
  }),
  execute: async ({ query, limit = 20 }) => {
    const patients = await listPatientsFromDb();
    const q = query?.trim().toLowerCase();
    const filtered = q
      ? patients.filter((p) => {
          const name = p.name.toLowerCase();
          const mrn = p.mrn?.toLowerCase() ?? "";
          return name.includes(q) || mrn.includes(q);
        })
      : patients;

    return {
      patients: filtered.slice(0, limit).map((p) => ({
        patient_id: p.patient_id,
        name: p.name,
        mrn: p.mrn ?? null,
        status: p.status,
        session_count: p.session_count,
        last_session_at: p.last_session_at,
      })),
    };
  },
});
