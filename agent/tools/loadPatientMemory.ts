import { z } from "zod";
import {
  getLatestPatientMemory,
  getSession,
  getSymptomRecurrence,
  updateSession,
} from "@/lib/db";
import { toPatientMemorySnapshot } from "@/lib/memory";

export async function loadPatientMemoryExecute(input: {
  sessionId: string;
}): Promise<{
  has_memory: boolean;
  version: number | null;
  recurrence_count: number;
}> {
  "use step";

  const session = await getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const [latestMemory, symptomRecurrence] = await Promise.all([
    getLatestPatientMemory(session.patient_id, input.sessionId),
    getSymptomRecurrence(session.patient_id, input.sessionId),
  ]);

  const patientMemory = latestMemory
    ? toPatientMemorySnapshot(latestMemory)
    : null;

  await updateSession(input.sessionId, {
    agent_metadata: {
      ...session.agent_metadata,
      edit_log: session.agent_metadata?.edit_log ?? [],
      patient_memory: patientMemory,
      symptom_recurrence: symptomRecurrence,
      patient_documents: session.agent_metadata?.patient_documents,
    },
  });

  return {
    has_memory: patientMemory !== null,
    version: patientMemory?.version ?? null,
    recurrence_count: symptomRecurrence.length,
  };
}

export const loadPatientMemoryTool = {
  description:
    "Load the latest versioned patient memory and symptom recurrence patterns from Supabase.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: loadPatientMemoryExecute,
};
