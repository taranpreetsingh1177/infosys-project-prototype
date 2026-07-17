import { tool } from "ai";
import { z } from "zod";

import { getLatestPatientMemory, getPatient } from "@/lib/db";

export const getPatientMemory = tool({
  description:
    "Load the latest longitudinal patient memory (problems, meds, allergies, recent visits). Requires clinician approval before returning PHI.",
  inputSchema: z.object({
    patientId: z.string().describe("Patient ID"),
  }),
  needsApproval: true,
  execute: async ({ patientId }) => {
    const [patient, memory] = await Promise.all([
      getPatient(patientId),
      getLatestPatientMemory(patientId),
    ]);

    if (!patient) {
      return { error: "Patient not found", patientId };
    }

    if (!memory) {
      return {
        patient_id: patientId,
        patient_name: patient.name,
        memory: null,
        message: "No patient memory version on file yet.",
      };
    }

    return {
      patient_id: patientId,
      patient_name: patient.name,
      memory: {
        memory_id: memory.memory_id,
        version: memory.version,
        summary: memory.summary,
        structured: memory.structured,
        source_session_id: memory.source_session_id,
        created_at: memory.created_at,
      },
    };
  },
});
